import { randomUUID } from "crypto";
import Elysia, { t } from "elysia";
import { ApiResponse, Client, CreatePaymentLinkResponse, CreatePaymentResponse, Environment } from "square";
import { addSheet, sheetContainsPlayer } from "./sheet";
import bigint from "./bigint";

const { paymentsApi, checkoutApi, ordersApi } = new Client({
    accessToken: process.env.SQUARE_ACCESS_TOKEN,
    environment: Environment.Sandbox
});

export const payController = new Elysia();

payController.post(
    `/createPay`,
    async ({ body, set }) => {
        try {
            console.log(`Create body payment = `);
            console.log(JSON.stringify(body));
            const PlayerIsIn = await sheetContainsPlayer(body.player);
            console.log(`is player in: ${PlayerIsIn}`);
            if (PlayerIsIn) {
                return false;
            }
            const result: ApiResponse<CreatePaymentResponse> = await paymentsApi.createPayment({
                idempotencyKey: randomUUID(),
                sourceId: body.sourceId,
                amountMoney: {
                    currency: `AUD`,
                    amount: BigInt(100)
                }
            });
            if (result.result.payment?.status == `COMPLETED`) {
                await addSheet([body.player.first_name, body.player.last_name, body.player.email, body.player.phone_no, `yes`]);
            }
            // TODO: need to add in error handling for other payment response statuses here
            // console.log(`result = `);
            // console.log(result);
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
