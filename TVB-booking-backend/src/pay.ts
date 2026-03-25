import { CronJob } from "cron";
import { randomUUID } from "crypto";
import Elysia, { t } from "elysia";
import { ApiResponse, Client, CreateOrderResponse, CreatePaymentResponse, Environment, Order, OrderLineItemDiscount, RefundPaymentResponse, SearchCustomersResponse } from "square";
import { PayResponse, RefundResponse, SpotsResponse } from "./model/apiResponse";
import { IPlayer } from "./model/player";
import { checkAndAddRowToSheet, createSheetForDate, createSundaySheetIfMissing, copyAndReplaceRow, deleteRowBasedOnIndex, deleteRowBasedOnPlayer, findRowIndexBasedOnPlayer, getNumberOfRows, getPaymentId, getRow, getSheetId, sheetContainsPlayer } from "./sheet";
import { ITEM_VARIATION_ID, LOCATION_ID, MAX_PLAYERS, VOUCHER_CODE, WAITING_LIST_PLAYER_AMOUNT } from "./utils/utils";
// eslint-disable-next-line @typescript-eslint/no-redeclare
declare global {
    interface BigInt {
        /** Convert to BigInt to string form in JSON.stringify */
        toJSON: () => string;
    }
}

BigInt.prototype.toJSON = function () {
    return this.toString();
};

const { paymentsApi, customersApi, refundsApi, ordersApi } = new Client({
    accessToken: process.env.SQUARE_ACCESS_TOKEN,
    environment: process.env.SQUARE_ENVIRONMENT === "production" ? Environment.Production : Environment.Sandbox
});

export const payController = new Elysia();

async function resolveSheetName(date?: string): Promise<string> {
    return date ? await createSheetForDate(date) : await createSundaySheetIfMissing();
}

/**
 * Adds a non-duplicate customer to the system.
 * If a customer with the same email, first name, and last name already exists, it will not be added.
 * @param player - The player object containing customer details.
 */
export async function addNonDuplicateCustomer(player: IPlayer): Promise<string> {
    console.log(player);
    try {
        const response = await customersApi.searchCustomers({});
        let duplicateCustomer = false;
        let customerId = ``;
        // TODO: some logic error here customer not always pointing to the right customer
        response.result.customers?.forEach((customer) => {
            if (customer.emailAddress === player.email && customer.givenName === player.first_name && customer.familyName === player.last_name && customer.phoneNumber === player.phone_no) {
                console.log(`customer already exists: ${customer.emailAddress} ${customer.givenName} ${customer.familyName} ${customer.phoneNumber}`);
                duplicateCustomer = true;
                console.log(`customer id = ${customer.id}`);
                customerId = customer.id!;
            }
        });
        if (!duplicateCustomer) {
            console.log(`creating customers`);
            const createReponse = await customersApi.createCustomer({
                givenName: player.first_name,
                familyName: player.last_name,
                emailAddress: player.email,
                phoneNumber: player.phone_no
            });
            console.log(createReponse.result);
            return createReponse.result.customer?.id!;
        }
        return customerId;
    } catch (err: Error | any) {
        console.log(err);
        return ``;
    }
}

export const checkIfCustomerExists = async (player: IPlayer): Promise<boolean> => {
    try{
        const response: ApiResponse<SearchCustomersResponse> = await customersApi.searchCustomers({
            query: {
                filter: {
                    emailAddress: {
                        exact: player.email
                    }
                }
            }
        });
        let duplicateCustomer = false;
        if(response?.result?.customers == null) {
            return duplicateCustomer;
        }
        response.result.customers?.forEach((customer) => {
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
        // TODO: need to test this
        // TODO: might need to take the outer if, since we want to check if there is a waiting list first or not

        const sheetRowNum: number = await getNumberOfRows(sheetName);
        // row of where waiting list title starts
        if (sheetRowNum <= MAX_PLAYERS + 3) {
            // if number of players doesn't exceed max player limit, delete the player from the sheet
            // aka: no waiting list
            await deleteRowBasedOnPlayer(player, sheetName, sheetId);
        } else {
            // aka: there is a waiting list
            if (playerIndex > MAX_PLAYERS + 1) {
                // if refunded player is in the waiting list, delete the player from the waiting list
                await deleteRowBasedOnPlayer(player, sheetName, sheetId);
            } else {
                // if number of player does exceed max player limit, replace the player with the next player in the waiting list
                // copyAndReplaceRow() : replace the row which the player was refunded from with the next player in the waiting list
                // deleteRow(): delete the row of the player who was refunded

                await copyAndReplaceRow(player, sheetName);
                await deleteRowBasedOnIndex(MAX_PLAYERS + 4, sheetName, sheetId);
            }
            if (sheetRowNum === MAX_PLAYERS + 4) {
                // if the number of players is equal to the max player limit, delete waiting list title and the replacement row
                // has to be deleted in this order as the rows shift up when a row is deleted
                await deleteRowBasedOnIndex(MAX_PLAYERS + 3, sheetName, sheetId);
                await deleteRowBasedOnIndex(MAX_PLAYERS + 2, sheetName, sheetId);
            }
        }
    } catch (err) {
        console.error(err);
        throw err;
    }
};

export async function createPayment(sourceId: string, CustomerId: string, voucher: string, customerExists: boolean): Promise<ApiResponse<CreatePaymentResponse> | number> {
    try {
        const createOrderResponse: Order = await createOrder(CustomerId, voucher, customerExists);
        if (createOrderResponse == null || createOrderResponse.id == null || createOrderResponse.totalMoney == null) {
            throw new Error(`Error creating order in createPayment: ${JSON.stringify(createOrderResponse, null, 2)}`);
        }
        if (createOrderResponse.totalMoney.amount === BigInt(0)) {
            console.log(`payment is not required as it's ${createOrderResponse.totalMoney.amount}!!`);
            return Number(createOrderResponse.totalMoney.amount);
        }
        const response: ApiResponse<CreatePaymentResponse> = await paymentsApi.createPayment({
            idempotencyKey: randomUUID(),
            sourceId: sourceId,
            orderId: createOrderResponse.id,
            amountMoney: {
                currency: `AUD`,
                amount: createOrderResponse.totalMoney.amount
            },
            customerId: CustomerId
        });

        if (response == null || response.result == null || response.result.payment?.status != `COMPLETED`) {
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

        const response: ApiResponse<CreateOrderResponse> = await ordersApi.createOrder({
            order: {
                customerId: CustomerId,
                locationId: LOCATION_ID,
                lineItems: [
                    {
                        quantity: "1",
                        catalogObjectId: ITEM_VARIATION_ID,
                        itemType: "ITEM"
                    }
                ],
                // TODO: order discounts what's the uid, need to work on the frontend too
                discounts: discountsArray
            }
        });
        console.log(`order created ${JSON.stringify(response, null, 2)}`);
        console.log(response?.result?.order?.id);
        console.log(response?.result?.order?.totalMoney?.amount);
        if (response != null && response.result != null && response.result.order != null) {
            return response.result.order;
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
        try {
            console.log(`Create body payment = `);
            console.log(`Voucher received: ${body.voucher}`);
            const sheetName = await resolveSheetName(body.date);
            console.log(`sheetName = ${sheetName}`);

            const PlayerIsIn = await sheetContainsPlayer(body.player, sheetName);
            console.log(`is player in: ${PlayerIsIn}`);
            if (PlayerIsIn) {
                console.log(`player is already in`);
                return { status: "already_registered", message: "Player has already registered for this week" };
            }

            // Check if customer exists BEFORE creating them (for voucher eligibility)
            const customerExists = await checkIfCustomerExists(body.player);
            console.log(`customerExists (before creation): ${customerExists}`);

            const CustomerId = await addNonDuplicateCustomer(body.player);
            if (CustomerId === ``) {
                throw new Error(`Customer not created or something went wrong with getting customerID: ${CustomerId}`);
            }
            const response = await checkAndAddRowToSheet(body, CustomerId, sheetName, customerExists);

            set.status = 201;
            set.headers["Content-Type"] = "application/json";
            return response;
        } catch (err) {
            console.log(err);
            return { status: "failed", message: "Payment processing failed" };
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
            date: t.Optional(t.String())
        })
    }
);

payController.post(
    `/refundPayment`,
    async ({ body, set }): Promise<RefundResponse> => {
        try {
            const player: IPlayer = body.player;
            const sheetName = await resolveSheetName(body.date);
            console.log(`sheetName = ${sheetName}`);
            const paymentId: string = await getPaymentId(player, sheetName);
            console.log(`paymentId = ${paymentId}`);

            const sheetId: string = await getSheetId(sheetName);
            if (paymentId == null || paymentId === ``) {
                await deleteOrReplacePlayer(player, sheetName, sheetId);
                return { status: "deleted_no_payment", message: "No payment was received, player removed from the list" };
            }
            const response: ApiResponse<RefundPaymentResponse> = await refundsApi.refundPayment({
                idempotencyKey: randomUUID(),
                amountMoney: {
                    amount: BigInt(1500),
                    currency: `AUD`
                },
                paymentId: paymentId,
                reason: `requested_by_customer`
            });
            set.status = 201;
            set.headers["Content-Type"] = "application/json";
            console.log(`refunded response = ${JSON.stringify(response.result.refund, null, 2)}`);

            if (response != null && response.body != null && response.result?.refund?.status == `PENDING`) {
                await deleteOrReplacePlayer(player, sheetName, sheetId);
                return { status: "refunded", message: "Refund processed successfully" };
            }
            return { status: "failed", message: "Refund was not completed by Square" };
        } catch (err: any) {
            console.log(err);
            const msg = err?.message ?? "";
            if (msg.includes("Player not found")) {
                return { status: "failed", message: "Player not found for the selected date. Please check your details." };
            }
            if (msg.includes("Sheet with name")) {
                return { status: "failed", message: "No session found for the selected date." };
            }
            return { status: "failed", message: "Refund processing failed. Please try again later." };
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
    date: t.Optional(t.String())
});

payController.post(
    `/validateVoucher`,
    async ({ body }): Promise<{ valid: boolean; amount: string; message?: string }> => {
        try {
            console.log(`Validating voucher: "${body.voucher}"`);
            const customerExists = await checkIfCustomerExists(body.player);
            console.log(`customerExists: ${customerExists}, voucher matches: ${body.voucher === VOUCHER_CODE}`);

            if (body.voucher === VOUCHER_CODE && !customerExists) {
                return { valid: true, amount: "0.00" };
            }

            if (body.voucher !== "" && body.voucher !== VOUCHER_CODE) {
                return { valid: false, amount: "15.00", message: "Invalid voucher code" };
            }

            if (customerExists && body.voucher === VOUCHER_CODE) {
                return { valid: false, amount: "15.00", message: "Voucher already used or not applicable for this player" };
            }

            return { valid: false, amount: "15.00" };
        } catch (err) {
            console.error(err);
            return { valid: false, amount: "15.00" };
        }
    },
    { body: playerBodySchema }
);

payController.post(
    `/registerWithVoucher`,
    async ({ body, set }): Promise<PayResponse> => {
        try {
            console.log(`Registering player with voucher: "${body.voucher}"`);
            const sheetName = await resolveSheetName(body.date);

            const PlayerIsIn = await sheetContainsPlayer(body.player, sheetName);
            if (PlayerIsIn) {
                return { status: "already_registered", message: "Player has already registered for this week" };
            }

            // Validate voucher server-side (defense in depth)
            const customerExists = await checkIfCustomerExists(body.player);
            console.log(`customerExists (before creation): ${customerExists}`);
            if (body.voucher !== VOUCHER_CODE || customerExists) {
                return { status: "failed", message: "Voucher is not valid for this player" };
            }

            const CustomerId = await addNonDuplicateCustomer(body.player);
            if (CustomerId === ``) {
                throw new Error(`Customer not created`);
            }

            // Pass customerExistsOverride as false since we validated BEFORE creating the customer
            const response = await checkAndAddRowToSheet(
                { sourceId: "", player: body.player, voucher: body.voucher },
                CustomerId,
                sheetName,
                false
            );

            set.status = 201;
            set.headers["Content-Type"] = "application/json";
            return response;
        } catch (err) {
            console.log(err);
            return { status: "failed", message: "Registration failed" };
        }
    },
    { body: playerBodySchema }
);

payController.get(
    `/spots`,
    async ({ query }): Promise<SpotsResponse> => {
        try {
            const date = query.date;
            if (!date) {
                return { total: MAX_PLAYERS, taken: 0, remaining: MAX_PLAYERS };
            }

            try {
                await getSheetId(date);
            } catch {
                return { total: MAX_PLAYERS, taken: 0, remaining: MAX_PLAYERS };
            }

            const rowCount = await getNumberOfRows(date);
            const taken = Math.min(Math.max(0, rowCount - 1), MAX_PLAYERS);
            const remaining = MAX_PLAYERS - taken;

            return { total: MAX_PLAYERS, taken, remaining };
        } catch (err) {
            console.error("Error fetching spots:", err);
            return { total: MAX_PLAYERS, taken: 0, remaining: MAX_PLAYERS };
        }
    },
    {
        query: t.Object({
            date: t.Optional(t.String())
        })
    }
);

// Schedule a task to run at a specific date and time
// The cron syntax is 'second minute hour day month dayOfWeek'
// This will run at 00:00:00 on December 31
const job = new CronJob(
    // seconds, minutes, hours, day of month, month, day of week
    "00 00 18 * * 7",
    async () => {
        try {
            const sheetName = await createSundaySheetIfMissing();
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
                let payId = row[4];
                if (payId == null || payId === ``) {
                    await deleteRowBasedOnPlayer({ first_name: row[0], last_name: row[1], email: row[2], phone_no: row[3] }, sheetName, sheetId);
                    continue;
                }
                const response: ApiResponse<RefundPaymentResponse> = await refundsApi.refundPayment({
                    idempotencyKey: randomUUID(),
                    amountMoney: {
                        amount: BigInt(1500),
                        currency: `AUD`
                    },
                    paymentId: payId,
                    reason: `requested_by_customer`
                });
                if (response != null && response.body != null && response.result?.refund?.status == `PENDING`) {
                    // delete the player from the waiting list
                    console.log(`refund response: ${JSON.stringify(response.result, null, 2)}`);
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
    "Australia/Perth"
);
