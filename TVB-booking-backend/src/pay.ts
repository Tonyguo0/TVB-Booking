import { Client, CreatePaymentLinkResponse } from "square";
import { randomUUID } from "crypto";
import Elysia, { t } from "elysia";
import { ICreatePay } from "./model/player";
import utils from "./utility/utils";


const { paymentsApi } = new Client({
    accessToken: process.env.SQUARE_ACCESS_TOKEN,
    environment: `sandbox`
});

export const payController = new Elysia();

payController.post(
    `/createPay`,
    async ({ body, set }) => {
        try {
            console.log(JSON.stringify(body));
            const { result }: { result: CreatePaymentLinkResponse } = await paymentsApi.createPayment({
                idempotencyKey: randomUUID(),
                sourceId: body.sourceId,
                amountMoney: {
                    currency: `AUD`,
                    amount: BigInt(100)
                }
            });
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
            sourceId: t.String()
        })
    }
);
