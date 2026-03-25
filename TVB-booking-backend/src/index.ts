import { cors } from "@elysiajs/cors";
import { Elysia } from "elysia";
import { payController } from "./pay";
import { PORT } from "./utils/utils";
const app = new Elysia({ prefix: `/api` });

app.use(
    cors({
        allowedHeaders: [`authorization`, `Content-Type`],
        exposeHeaders: [`authorization`],
        // TODO: have to change this when ready for production
        origin: /^.*?localhost:5173$/,
        methods: [`GET`, `PUT`, `POST`, `DELETE`],
        preflight: true
    })
).use(payController);

app.get(`/`, () => `Hello Elysia!!!`);

app.get(`/hello`, () => `Hello World!`);

app.get(`/test`, async () => {
    console.log(`test`);
});

app.listen(PORT, () => {
    console.log(`🦊 Elysia is running at ${app.server?.hostname}:${app.server?.port}`);
});
