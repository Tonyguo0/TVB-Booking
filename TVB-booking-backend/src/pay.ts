import { randomUUID } from "crypto";
import Elysia, { t } from "elysia";
import { ApiResponse, Client, CreatePaymentLinkResponse, CreatePaymentResponse } from "square";
import { AddSheet } from "./sheet";

const { paymentsApi, checkoutApi } = new Client({
    accessToken: process.env.SQUARE_ACCESS_TOKEN,
    environment: `sandbox`
});

export const payController = new Elysia();

payController.post(
    `/createPayLink`,
    async ({ body }) => {
        try {
            console.log(`Create body payment = `);
            console.log(`createpay link body : ${JSON.stringify(body)}`);
            const result: ApiResponse<CreatePaymentLinkResponse> = await checkoutApi.createPaymentLink({
                idempotencyKey: randomUUID(),
                quickPay: {
                    name: "TVB Payment",
                    priceMoney: { amount: BigInt(100), currency: "AUD" },
                    locationId: process.env.SQUARE_LOCATION_ID!
                }
            });
            console.log(result);
            if (result.result.paymentLink?.url != null) {
                return result.result.paymentLink?.url;
            }
            // TODO: need to add in error handling for other payment response statuses here
            // console.log(`result = `);
            // console.log(result);
            // set.status = 201;
            // set.headers["Content-Type"] = "application/json";
            return JSON.stringify(result);
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

payController.post(
    `/createPay`,
    async ({ body, set }) => {
        try {
            console.log(`Create body payment = `);
            console.log(JSON.stringify(body));
            const result: ApiResponse<CreatePaymentResponse> = await paymentsApi.createPayment({
                idempotencyKey: randomUUID(),
                sourceId: body.sourceId,
                amountMoney: {
                    currency: `AUD`,
                    amount: BigInt(100)
                }
            });
            if (result.result.payment?.status == `COMPLETED`) {
                AddSheet([body.player.first_name, body.player.last_name, body.player.email, body.player.phone_no, `yes`]);
            }
            // TODO: need to add in error handling for other payment response statuses here
            console.log(`result = `);
            console.log(result);
            set.status = 201;
            set.headers["Content-Type"] = "application/json";
            return JSON.stringify(result);
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
