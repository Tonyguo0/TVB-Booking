import { CronJob } from "cron";
import { randomUUID } from "crypto";
import Elysia, { t } from "elysia";
import { ApiResponse, Client, CreateOrderResponse, CreatePaymentResponse, Environment, Order, RefundPaymentResponse } from "square";
import { IPlayer } from "./model/player";
import { checkAndAddRowToSheet, checkAndAppendIfSundayExists, copyAndReplaceRow, deleteRowBasedOnIndex, deleteRowBasedOnPlayer, findRowIndexBasedOnPlayer, getNumberOfRows, getPaymentId, getRow, getSheetId, sheetContainsPlayer } from "./sheet";
import { ITEM_VARIATION_ID, LOCATION_ID, MAX_PLAYERS, WAITING_LIST_PLAYER_AMOUNT } from "./utils/utils";
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
    environment: Environment.Sandbox
});

export const payController = new Elysia();

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
        response.result.customers?.forEach((customer) => {
            if (customer.emailAddress === player.email && customer.givenName === player.first_name && customer.familyName === player.last_name) {
                console.log(`customer already exists: ${customer.emailAddress} ${customer.givenName} ${customer.familyName} ${customer.phoneNumber}`);
                duplicateCustomer = true;
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

export async function createPayment(sourceId: string, CustomerId: string) {
    try {
        const createOrderResponse: Order = await createOrder();
        if (createOrderResponse == null || createOrderResponse.id == null || createOrderResponse.totalMoney == null) {
            throw new Error(`Error creating order in createPayment: ${JSON.stringify(createOrderResponse, null, 2)}`);
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
    } catch (err) {
        throw err;
    }
}

export async function createOrder() {
    try {
        // TODO: Test this:
        const response: ApiResponse<CreateOrderResponse> = await ordersApi.createOrder({
            order: {
                locationId: LOCATION_ID,
                lineItems: [
                    {
                        quantity: "1",
                        catalogObjectId: ITEM_VARIATION_ID,
                        itemType: "ITEM"
                    }
                ]
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

export async function payForOrder() {
    try {
        // TODO: Test this:
        const response: ApiResponse<CreateOrderResponse> = await ordersApi.createOrder({
            order: {
                locationId: LOCATION_ID,
                lineItems: [
                    {
                        quantity: "1",
                        // TODO: change this to environment variable ITEM_VARIATION_ID
                        catalogObjectId: "Y3QYAB4OIOW2FEEFKGE35PQP",
                        itemType: "ITEM"
                    }
                ]
            }
        });
        // TODO: ITEMID: CIJMPF2RMDRBURW4XUSHLTTO
        // TODO: ITEM_VARIATION_ID: Y3QYAB4OIOW2FEEFKGE35PQP
        console.log(`order created ${JSON.stringify(response, null, 2)}`);
        console.log(response?.result?.order?.id);
        console.log(response?.result?.order?.totalMoney?.amount);

        return response;
    } catch (err) {
        throw err;
    }
}

payController.post(
    `/createPay`,
    async ({ body, set }) => {
        try {
            console.log(`Create body payment = `);
            // console.log(JSON.stringify(body));
            // add a new sheet if this week's sunday's date isn't a sheet name
            const sheetName = await checkAndAppendIfSundayExists();
            console.log(`sheetName = ${sheetName}`);
            // check if player is already in the sheet
            const PlayerIsIn = await sheetContainsPlayer(body.player, sheetName);
            console.log(`is player in: ${PlayerIsIn}`);
            if (PlayerIsIn) {
                console.log(`player is already in`);
                // TODO: represents player is already in the google sheet
                return false;
            }
            // add player to customer list in square
            const CustomerId = await addNonDuplicateCustomer(body.player);
            if (CustomerId === ``) {
                throw new Error(`Customer not created or something went wrong with getting customerID: ${CustomerId}`);
            }
            const response = await checkAndAddRowToSheet(body, CustomerId, sheetName);

            // TODO: need to add in error handling for other payment response statuses here
            // console.log(`result = `);
            // console.log(result);
            set.status = 201;
            set.headers["Content-Type"] = "application/json";

            return response === true ? response : JSON.stringify(response);
        } catch (err) {
            console.log(err);
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
            })
        })
    }
);

payController.post(
    `/refundPayment`,
    async ({ body, set }) => {
        try {
            const player: IPlayer = body.player;
            // add a new sheet if this week's sunday's date isn't a sheet name
            const sheetName = await checkAndAppendIfSundayExists();
            console.log(`sheetName = ${sheetName}`);
            const paymentId: string = await getPaymentId(player, sheetName);
            console.log(`paymentId = ${paymentId}`);
            // get the sheet id (the gid of the sheet) with the sheetName to delete the row
            const sheetId: string = await getSheetId(sheetName);
            const response: ApiResponse<RefundPaymentResponse> = await refundsApi.refundPayment({
                idempotencyKey: randomUUID(),
                amountMoney: {
                    amount: BigInt(100),
                    currency: `AUD`
                },
                paymentId: paymentId,
                reason: `requested_by_customer`
            });
            set.status = 201;
            set.headers["Content-Type"] = "application/json";
            console.log(`refunded response = ${JSON.stringify(response.result.refund, null, 2)}`);

            if (response != null && response.body != null && response.result?.refund?.status == `PENDING`) {
                const rows: Array<Array<string>> = await getRow(sheetName, `A`, `D`);
                const playerIndex: number = await findRowIndexBasedOnPlayer(player, rows);
                console.log(`playerIndex = ${playerIndex}`);
                // TODO: need to test this
                // TODO: might need to take the outer if since we want to check if there is a waiting list first or not

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
            }
            return response;
        } catch (err) {
            console.log(err);
        }
    },
    {
        body: t.Object({
            player: t.Object({ first_name: t.String(), last_name: t.String(), email: t.String(), phone_no: t.String() })
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
            const sheetName = await checkAndAppendIfSundayExists();
            console.log(`sheetName = ${sheetName}`);

            const sheetId: string = await getSheetId(sheetName);
            console.log(`sheetId = ${sheetId}`);

            const RowsToBeReplaced: Array<Array<string>> | undefined = await getRow(sheetName, `A${MAX_PLAYERS + 4}`, `F${MAX_PLAYERS + 4 + WAITING_LIST_PLAYER_AMOUNT}`);
            if (RowsToBeReplaced == null) {
                console.log(`No players in the waiting list`);
                return;
            }

            for (const row of RowsToBeReplaced) {
                if (!row && !row[0]) break;
                console.log(`row = ${row}`);
                let payId = row[4];
                const response: ApiResponse<RefundPaymentResponse> = await refundsApi.refundPayment({
                    idempotencyKey: randomUUID(),
                    amountMoney: {
                        amount: BigInt(100),
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
