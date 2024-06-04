import { randomUUID } from "crypto";
import Elysia, { t } from "elysia";
import { ApiResponse, Client, CreatePaymentResponse, Environment, RefundPaymentResponse } from "square";
import { IPlayer } from "./model/player";
import { checkAndAddRowToSheet, checkAndAppendIfSundayExists, deleteRow, getPaymentId, getSheetId, sheetContainsPlayer } from "./sheet";

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

const { paymentsApi, customersApi, refundsApi } = new Client({
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
        const response: ApiResponse<CreatePaymentResponse> = await paymentsApi.createPayment({
            idempotencyKey: randomUUID(),
            sourceId: sourceId,
            amountMoney: {
                currency: `AUD`,
                amount: BigInt(100)
            },
            customerId: CustomerId
        });
        // TODO: need to add this somewhere
        //
        if (response == null || response.result == null || response.result.payment?.status != `COMPLETED`) throw new Error(`Payment not completed: ${JSON.stringify(response, null, 2)}`);
        console.log(`payment successful!!`);
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
            console.log(JSON.stringify(body));
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

            // TODO: need to change logic here so if >57 players, add to waiting list

            // TODO:
            // TODO: choice 1: if I just get everyone to pay, then at the end I have to refund everyone who is on the waiting list
            // TODO:
            // TODO: choice 2: If I only get them to pay when they need to pay, then I don't have to refund anyone who's on the waiting list
            // TODO: but I do have to change the code to cater for when someone's in the waiting list or not and when they get above the waiting lis then they need to pay
            // TODO: choice 2 is probably better

            const response = await checkAndAddRowToSheet(body, CustomerId, sheetName);

            // TODO: need to add in error handling for other payment response statuses here
            // console.log(`result = `);
            // console.log(result);
            set.status = 201;
            set.headers["Content-Type"] = "application/json";

            return response === true? response: JSON.stringify(response);
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
            console.log(`hello from refund payment`);
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
            console.log(response.result.refund);

            if (response != null && response.body != null && response.result?.refund?.status == `PENDING`) {
                await deleteRow(player, sheetName, sheetId);
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
