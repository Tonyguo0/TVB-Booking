import { randomUUID } from "crypto";
import Elysia, { t } from "elysia";
import { ApiResponse, Client, CreatePaymentResponse, Environment } from "square";
import { appendRowToSheet, checkAndAppendIfSundayExists, sheetContainsPlayer } from "./sheet";
import { IPlayer } from "./model/player";

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

const { paymentsApi, customersApi } = new Client({
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

payController.post(
    `/createPay`,
    async ({ body, set }) => {
        try {
            console.log(`Create body payment = `);
            console.log(JSON.stringify(body));
            const sheetName = await checkAndAppendIfSundayExists();
            console.log(`sheetName = ${sheetName}`);
            const PlayerIsIn = await sheetContainsPlayer(body.player, sheetName);
            console.log(`is player in: ${PlayerIsIn}`);
            if (PlayerIsIn) {
                console.log(`player is already in`);
                return false;
            }
            const CustomerId = await addNonDuplicateCustomer(body.player);
            if (CustomerId === ``) {
                throw new Error(`Customer not created or something went wrong with getting customerID: ${CustomerId}`);
            }
            const response: ApiResponse<CreatePaymentResponse> = await paymentsApi.createPayment({
                idempotencyKey: randomUUID(),
                sourceId: body.sourceId,
                amountMoney: {
                    currency: `AUD`,
                    amount: BigInt(100)
                },
                customerId: CustomerId
            });
            if (response.result.payment?.status == `COMPLETED`) {
                await appendRowToSheet([body.player.first_name, body.player.last_name, body.player.email, body.player.phone_no, response.result.payment?.id!, `yes`], sheetName);
            }
            // TODO: need to add in error handling for other payment response statuses here
            // console.log(`result = `);
            // console.log(result);
            set.status = 201;
            set.headers["Content-Type"] = "application/json";
            return JSON.stringify(response);
        } catch (err) {
            console.log(err);
        }
    },
    {
        body: t.Object({
            sourceId: t.String(),
            player: t.Object({ first_name: t.String(), last_name: t.String(), email: t.String(), phone_no: t.String() })
        })
    }
);
