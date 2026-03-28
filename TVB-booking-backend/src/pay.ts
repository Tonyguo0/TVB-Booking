import { CronJob } from "cron";
import { randomUUID } from "crypto";
import Elysia, { t } from "elysia";
import { SquareClient, SquareEnvironment, CreatePaymentResponse, CreateCustomerResponse, CreateOrderResponse, Order, OrderLineItemDiscount, RefundPaymentResponse, SearchCustomersResponse } from "square";
import { PayResponse, RefundResponse, SpotsResponse } from "./model/apiResponse";
import { IPlayer } from "./model/player";
import { checkAndAddRowToSheet, createSheetForDate, createSheetIfMissing, copyAndReplaceRow, deleteRowBasedOnIndex, deleteRowBasedOnPlayer, findRowIndexBasedOnPlayer, getNumberOfRows, getPaymentId, getRow, getSheetId, sheetContainsPlayer, type PromotedPlayerInfo } from "./sheet";
import { ITEM_VARIATION_ID, LOCATION_ID, MAX_PLAYERS, VOUCHER_CODE, WAITING_LIST_PLAYER_AMOUNT, PRICE_AMOUNT_CENTS, PRICE_AMOUNT_DISPLAY, CURRENCY_CODE, CRON_SCHEDULE, TIMEZONE } from "./utils/utils";
import { notifyPlayerPromotion } from "./services/notification";
// eslint-disable-next-line @typescript-eslint/no-redeclare
declare global {
    interface BigInt {
        /** Convert to BigInt to number form in JSON.stringify */
        toJSON: () => number;
    }
}

BigInt.prototype.toJSON = function () {
    return Number(this);
};

const squareClient: SquareClient = new SquareClient({
    token: process.env.SQUARE_ACCESS_TOKEN,
    environment: process.env.SQUARE_ENVIRONMENT === `production` ? SquareEnvironment.Production : SquareEnvironment.Sandbox
});

export const payController = new Elysia();

const registrationLocks: Set<string> = new Set();

function getPlayerKey(player: IPlayer): string {
    return `${player.first_name.trim().toLowerCase()}|${player.last_name.trim().toLowerCase()}|${player.email.trim().toLowerCase()}|${player.phone_no.trim()}`;
}

async function resolveSheetName(date?: string): Promise<string> {
    return date ? await createSheetForDate(date) : await createSheetIfMissing();
}

/**
 * Adds a non-duplicate customer to the system.
 * If a customer with the same email, first name, and last name already exists, it will not be added.
 * @param player - The player object containing customer details.
 */
export async function addNonDuplicateCustomer(player: IPlayer): Promise<string> {
    console.log(player);
    try {
        const response: SearchCustomersResponse = await squareClient.customers.search({});
        let duplicateCustomer: boolean = false;
        let customerId: string = ``;
        // TODO: some logic error here customer not always pointing to the right customer
        response.customers?.forEach((customer) => {
            if (customer.emailAddress === player.email && customer.givenName === player.first_name && customer.familyName === player.last_name && customer.phoneNumber === player.phone_no) {
                console.log(`customer already exists: ${customer.emailAddress} ${customer.givenName} ${customer.familyName} ${customer.phoneNumber}`);
                duplicateCustomer = true;
                console.log(`customer id = ${customer.id}`);
                customerId = customer.id!;
            }
        });
        if (!duplicateCustomer) {
            console.log(`creating customers`);
            const createReponse: CreateCustomerResponse = await squareClient.customers.create({
                givenName: player.first_name,
                familyName: player.last_name,
                emailAddress: player.email,
                phoneNumber: player.phone_no
            });
            console.log(createReponse);
            return createReponse.customer?.id!;
        }
        return customerId;
    } catch (err: Error | any) {
        console.log(err);
        return ``;
    }
}

export const checkIfCustomerExists = async (player: IPlayer): Promise<boolean> => {
    try {
        const response: SearchCustomersResponse = await squareClient.customers.search({
            query: {
                filter: {
                    emailAddress: {
                        exact: player.email
                    }
                }
            }
        });
        let duplicateCustomer: boolean = false;
        if (response?.customers == null) {
            return duplicateCustomer;
        }
        response.customers?.forEach((customer) => {
            if (customer.emailAddress === player.email && customer.givenName === player.first_name && customer.familyName === player.last_name && customer.phoneNumber === player.phone_no) {
                console.log(`customer already exists: ${customer.emailAddress} ${customer.givenName} ${customer.familyName} ${customer.phoneNumber}`);
                duplicateCustomer = true;
            }
        });
        return duplicateCustomer;
    } catch (err) {
        console.error(err);
        throw err;
    }
};

const deleteOrReplacePlayer = async (player: IPlayer, sheetName: string, sheetId: string) => {
    try {
        const rows: Array<Array<string>> = await getRow(sheetName, `A`, `D`);
        const playerIndex: number = await findRowIndexBasedOnPlayer(player, rows);
        console.log(`playerIndex = ${playerIndex}`);

        const sheetRowNum: number = await getNumberOfRows(sheetName);
        // row of where waiting list title starts
        if (sheetRowNum <= MAX_PLAYERS + 3) {
            // no waiting list — just delete the player
            await deleteRowBasedOnPlayer(player, sheetName, sheetId);
        } else {
            // there is a waiting list
            if (playerIndex > MAX_PLAYERS + 1) {
                // refunded player is in the waiting list — just delete them
                await deleteRowBasedOnPlayer(player, sheetName, sheetId);
            } else {
                // replace the refunded player with the first waiting list player
                const promotedPlayer: PromotedPlayerInfo | null = await copyAndReplaceRow(player, sheetName);
                await deleteRowBasedOnIndex(MAX_PLAYERS + 4, sheetName, sheetId);

                // notify the promoted player
                if (promotedPlayer) {
                    notifyPlayerPromotion(promotedPlayer.email, promotedPlayer.phone_no, promotedPlayer.first_name, promotedPlayer.notification_preference).catch((err) => console.error(`Failed to notify promoted player:`, err));
                }
            }
            if (sheetRowNum === MAX_PLAYERS + 4) {
                // clean up waiting list structure rows
                await deleteRowBasedOnIndex(MAX_PLAYERS + 3, sheetName, sheetId);
                await deleteRowBasedOnIndex(MAX_PLAYERS + 2, sheetName, sheetId);
            }
        }
    } catch (err) {
        console.error(err);
        throw err;
    }
};

export async function createPayment(sourceId: string, CustomerId: string, voucher: string, customerExists: boolean): Promise<CreatePaymentResponse | number> {
    try {
        const createOrderResponse: Order = await createOrder(CustomerId, voucher, customerExists);
        if (createOrderResponse == null || createOrderResponse.id == null || createOrderResponse.totalMoney == null) {
            throw new Error(`Error creating order in createPayment: ${JSON.stringify(createOrderResponse, null, 2)}`);
        }
        if (createOrderResponse.totalMoney.amount === BigInt(0)) {
            console.log(`payment is not required as it's ${createOrderResponse.totalMoney.amount}!!`);
            return Number(createOrderResponse.totalMoney.amount);
        }
        const response: CreatePaymentResponse = await squareClient.payments.create({
            idempotencyKey: randomUUID(),
            sourceId: sourceId,
            orderId: createOrderResponse.id,
            amountMoney: {
                currency: CURRENCY_CODE,
                amount: createOrderResponse.totalMoney.amount
            },
            customerId: CustomerId
        });

        if (response == null || response.payment?.status != `COMPLETED`) {
            throw new Error(`Payment not completed: ${JSON.stringify(response, null, 2)}`);
        }
        console.log(`${JSON.stringify(response, null, 2)}`);
        console.log(`payment successful!!`);

        // Payment.status
        // APPROVED. The payment is authorized and awaiting completion or cancellation.
        // COMPLETED. The payment is captured and funds are credited to the seller.
        // CANCELED. The payment is canceled and the payment card funds are released.
        // FAILED. The payment request is declined by the bank.
        return response;
    } catch (err: any | Error) {
        console.log(`error in createPayment: ${err} ${err.stack}`);
        throw err;
    }
}

async function createOrder(CustomerId: string, voucher: string, customerExists: boolean): Promise<Order> {
    try {
        // TODO: Test this:
        // TODO: can try if customer exists then we don't apply this discount anymore
        const discountsArray: Array<OrderLineItemDiscount> =
            voucher === VOUCHER_CODE && !customerExists
                ? [
                      {
                          uid: `EXPLICIT_DISCOUNT_UID`,
                          name: `Voucher - 100% off`,
                          percentage: `100`,
                          scope: `ORDER`
                      }
                  ]
                : [];

        const response: CreateOrderResponse = await squareClient.orders.create({
            order: {
                customerId: CustomerId,
                locationId: LOCATION_ID,
                lineItems: [
                    {
                        quantity: `1`,
                        catalogObjectId: ITEM_VARIATION_ID,
                        itemType: `ITEM`
                    }
                ],
                // TODO: order discounts what's the uid, need to work on the frontend too
                discounts: discountsArray
            }
        });
        console.log(`order created ${JSON.stringify(response, null, 2)}`);
        console.log(response?.order?.id);
        console.log(response?.order?.totalMoney?.amount);
        if (response != null && response.order != null) {
            return response.order;
        } else {
            throw new Error(`Order not created: ${JSON.stringify(response, null, 2)}`);
        }
    } catch (err) {
        throw err;
    }
}

payController.post(
    `/createPay`,
    async ({ body, set }): Promise<PayResponse> => {
        const playerKey: string = getPlayerKey(body.player);
        if (registrationLocks.has(playerKey)) {
            return { status: `failed`, message: `Registration already in progress for this player` };
        }
        registrationLocks.add(playerKey);
        let customerExists: boolean = false;
        let CustomerId: string = ``;
        try {
            console.log(`Create body payment = `);
            console.log(`Voucher received: ${body.voucher}`);
            const sheetName: string = await resolveSheetName(body.date);
            console.log(`sheetName = ${sheetName}`);

            const PlayerIsIn: boolean = await sheetContainsPlayer(body.player, sheetName);
            console.log(`is player in: ${PlayerIsIn}`);
            if (PlayerIsIn) {
                console.log(`player is already in`);
                return { status: `already_registered`, message: `Player has already registered for this week` };
            }

            // Check if customer exists BEFORE creating them (for voucher eligibility)
            customerExists = await checkIfCustomerExists(body.player);
            console.log(`customerExists (before creation): ${customerExists}`);

            CustomerId = await addNonDuplicateCustomer(body.player);
            if (CustomerId === ``) {
                throw new Error(`Customer not created or something went wrong with getting customerID: ${CustomerId}`);
            }
            const response: PayResponse = await checkAndAddRowToSheet(body, CustomerId, sheetName, customerExists);

            set.status = 201;
            set.headers[`Content-Type`] = `application/json`;
            return response;
        } catch (err) {
            console.log(err);
            // Roll back customer creation so voucher stays usable on retry
            // Only roll back if we created the customer in this request 
            // (i.e. customer did not exist before) to avoid deleting an existing customer
            if (!customerExists && CustomerId) {
                try {
                    await squareClient.customers.delete({ customerId: CustomerId });
                    console.log(`Rolled back customer creation for failed payment: ${CustomerId}`);
                } catch (deleteErr) {
                    console.error(`Failed to roll back customer:`, deleteErr);
                }
            }
            return { status: `failed`, message: `Payment processing failed` };
        } finally {
            registrationLocks.delete(playerKey);
        }
    },
    {
        body: t.Object({
            sourceId: t.String(),
            player: t.Object({
                first_name: t.String(),
                last_name: t.String(),
                email: t.String(),
                phone_no: t.String()
            }),
            voucher: t.String(),
            date: t.Optional(t.String()),
            notification_preference: t.Optional(t.Union([t.Literal(`email`), t.Literal(`sms`), t.Literal(`both`)]))
        })
    }
);

payController.post(
    `/refundPayment`,
    async ({ body, set }): Promise<RefundResponse> => {
        try {
            const player: IPlayer = body.player;
            const sheetName: string = await resolveSheetName(body.date);
            console.log(`sheetName = ${sheetName}`);
            const paymentId: string = await getPaymentId(player, sheetName);
            console.log(`paymentId = ${paymentId}`);

            const sheetId: string = await getSheetId(sheetName);
            if (paymentId == null || paymentId === ``) {
                await deleteOrReplacePlayer(player, sheetName, sheetId);
                return { status: `deleted_no_payment`, message: `No payment was received, player removed from the list` };
            }
            const response: RefundPaymentResponse = await squareClient.refunds.refundPayment({
                idempotencyKey: randomUUID(),
                amountMoney: {
                    amount: PRICE_AMOUNT_CENTS,
                    currency: CURRENCY_CODE
                },
                paymentId: paymentId,
                reason: `requested_by_customer`
            });
            set.status = 201;
            set.headers[`Content-Type`] = `application/json`;
            console.log(`refunded response = ${JSON.stringify(response.refund, null, 2)}`);

            if (response != null && response.refund?.status == `PENDING`) {
                await deleteOrReplacePlayer(player, sheetName, sheetId);
                return { status: `refunded`, message: `Refund processed successfully` };
            }
            return { status: `failed`, message: `Refund was not completed by Square` };
        } catch (err: any) {
            console.log(err);
            const msg: string = err?.message ?? ``;
            if (msg.includes(`Player not found`)) {
                return { status: `failed`, message: `Player not found for the selected date. Please check your details.` };
            }
            if (msg.includes(`Sheet with name`)) {
                return { status: `failed`, message: `No session found for the selected date.` };
            }
            return { status: `failed`, message: `Refund processing failed. Please try again later.` };
        }
    },
    {
        body: t.Object({
            player: t.Object({ first_name: t.String(), last_name: t.String(), email: t.String(), phone_no: t.String() }),
            date: t.Optional(t.String())
        })
    }
);

const playerBodySchema = t.Object({
    player: t.Object({ first_name: t.String(), last_name: t.String(), email: t.String(), phone_no: t.String() }),
    voucher: t.String(),
    date: t.Optional(t.String()),
    notification_preference: t.Optional(t.Union([t.Literal(`email`), t.Literal(`sms`), t.Literal(`both`)]))
});

payController.post(
    `/validateVoucher`,
    async ({ body }): Promise<{ valid: boolean; amount: string; message?: string }> => {
        try {
            console.log(`Validating voucher: "${body.voucher}"`);
            const customerExists: boolean = await checkIfCustomerExists(body.player);
            console.log(`customerExists: ${customerExists}, voucher matches: ${body.voucher === VOUCHER_CODE}`);

            if (body.voucher === VOUCHER_CODE && !customerExists) {
                return { valid: true, amount: `0.00` };
            }

            if (body.voucher !== `` && body.voucher !== VOUCHER_CODE) {
                return { valid: false, amount: PRICE_AMOUNT_DISPLAY, message: `Invalid voucher code` };
            }

            if (customerExists && body.voucher === VOUCHER_CODE) {
                return { valid: false, amount: PRICE_AMOUNT_DISPLAY, message: `Voucher already used or not applicable for this player` };
            }

            return { valid: false, amount: PRICE_AMOUNT_DISPLAY };
        } catch (err) {
            console.error(err);
            return { valid: false, amount: PRICE_AMOUNT_DISPLAY };
        }
    },
    { body: playerBodySchema }
);

payController.post(
    `/registerWithVoucher`,
    async ({ body, set }): Promise<PayResponse> => {
        const playerKey: string = getPlayerKey(body.player);
        if (registrationLocks.has(playerKey)) {
            return { status: `failed`, message: `Registration already in progress for this player` };
        }
        registrationLocks.add(playerKey);
        try {
            console.log(`Registering player with voucher: "${body.voucher}"`);
            const sheetName: string = await resolveSheetName(body.date);

            const PlayerIsIn: boolean = await sheetContainsPlayer(body.player, sheetName);
            if (PlayerIsIn) {
                return { status: `already_registered`, message: `Player has already registered for this week` };
            }

            // Validate voucher server-side (defense in depth)
            const customerExists: boolean = await checkIfCustomerExists(body.player);
            console.log(`customerExists (before creation): ${customerExists}`);
            if (body.voucher !== VOUCHER_CODE || customerExists) {
                return { status: `failed`, message: `Voucher is not valid for this player` };
            }

            const CustomerId: string = await addNonDuplicateCustomer(body.player);
            if (CustomerId === ``) {
                throw new Error(`Customer not created`);
            }

            // Pass customerExistsOverride as false since we validated BEFORE creating the customer
            const response: PayResponse = await checkAndAddRowToSheet({ sourceId: ``, player: body.player, voucher: body.voucher, notification_preference: body.notification_preference }, CustomerId, sheetName, false);

            set.status = 201;
            set.headers[`Content-Type`] = `application/json`;
            return response;
        } catch (err) {
            console.log(err);
            return { status: `failed`, message: `Registration failed` };
        } finally {
            registrationLocks.delete(playerKey);
        }
    },
    { body: playerBodySchema }
);

payController.get(
    `/spots`,
    async ({ query }): Promise<SpotsResponse> => {
        try {
            const date: string | undefined = query.date;
            if (!date) {
                return { total: MAX_PLAYERS, taken: 0, remaining: MAX_PLAYERS };
            }

            try {
                await getSheetId(date);
            } catch {
                return { total: MAX_PLAYERS, taken: 0, remaining: MAX_PLAYERS };
            }

            const rowCount: number = await getNumberOfRows(date);
            const taken: number = Math.min(Math.max(0, rowCount - 1), MAX_PLAYERS);
            const remaining: number = MAX_PLAYERS - taken;

            return { total: MAX_PLAYERS, taken, remaining };
        } catch (err) {
            console.error(`Error fetching spots:`, err);
            return { total: MAX_PLAYERS, taken: 0, remaining: MAX_PLAYERS };
        }
    },
    {
        query: t.Object({
            date: t.Optional(t.String())
        })
    }
);

payController.post(
    `/checkRegistration`,
    async ({ body }): Promise<{ registered: boolean }> => {
        try {
            const sheetName: string = await resolveSheetName(body.date);
            const registered: boolean = await sheetContainsPlayer(body.player, sheetName);
            return { registered };
        } catch {
            return { registered: false };
        }
    },
    {
        body: t.Object({
            player: t.Object({ first_name: t.String(), last_name: t.String(), email: t.String(), phone_no: t.String() }),
            date: t.Optional(t.String())
        })
    }
);

// Schedule a task to run at a specific date and time
// The cron syntax is 'second minute hour day month dayOfWeek'
// This will run at 00:00:00 on December 31
new CronJob(
    // seconds, minutes, hours, day of month, month, day of week
    CRON_SCHEDULE,
    async () => {
        try {
            const sheetName: string = await createSheetIfMissing();
            console.log(`sheetName = ${sheetName}`);

            const sheetId: string = await getSheetId(sheetName);
            console.log(`sheetId = ${sheetId}`);

            const RowsToBeReplaced: Array<Array<string>> | undefined = await getRow(sheetName, `A${MAX_PLAYERS + 4}`, `F${MAX_PLAYERS + 4 + WAITING_LIST_PLAYER_AMOUNT}`);
            if (RowsToBeReplaced == null) {
                console.log(`No players in the waiting list`);
                return;
            }

            for (const row of RowsToBeReplaced) {
                if (!row || !row[0]) break;
                console.log(`row = ${row}`);
                let payId: string = row[4];
                if (payId == null || payId === ``) {
                    await deleteRowBasedOnPlayer({ first_name: row[0], last_name: row[1], email: row[2], phone_no: row[3] }, sheetName, sheetId);
                    continue;
                }
                const response: RefundPaymentResponse = await squareClient.refunds.refundPayment({
                    idempotencyKey: randomUUID(),
                    amountMoney: {
                        amount: PRICE_AMOUNT_CENTS,
                        currency: CURRENCY_CODE
                    },
                    paymentId: payId,
                    reason: `requested_by_customer`
                });
                if (response != null && response.refund?.status == `PENDING`) {
                    // delete the player from the waiting list
                    console.log(`refund response: ${JSON.stringify(response, null, 2)}`);
                    await deleteRowBasedOnPlayer({ first_name: row[0], last_name: row[1], email: row[2], phone_no: row[3] }, sheetName, sheetId);
                } else {
                    console.error(`Refund failed for ${row[0]} ${row[1]} ${row[2]} ${row[3]}`);
                }
            }

            // need to delete the waiting list title aswell
            await deleteRowBasedOnIndex(MAX_PLAYERS + 3, sheetName, sheetId);
            await deleteRowBasedOnIndex(MAX_PLAYERS + 2, sheetName, sheetId);
        } catch (err) {
            console.error(err);
        }
    },
    null,
    true,
    TIMEZONE
);
