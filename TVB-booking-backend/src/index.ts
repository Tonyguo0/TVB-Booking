import { cors } from "@elysiajs/cors";
import { Elysia } from "elysia";
import { payController } from "./pay";
import { PORT, CORS_ORIGIN } from "./utils/utils";
const app = new Elysia({ prefix: `/api` });

app.use(
    cors({
        allowedHeaders: [`authorization`, `Content-Type`],
        exposeHeaders: [`authorization`],
        origin: CORS_ORIGIN,
        methods: [`GET`, `PUT`, `POST`, `DELETE`],
        preflight: true
    })
).use(payController);

app.listen(PORT, () => {
    console.log(`🦊 Elysia is running at ${app.server?.hostname}:${app.server?.port}`);
});
