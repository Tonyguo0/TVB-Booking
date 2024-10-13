import { cors } from "@elysiajs/cors";
import { Elysia } from "elysia";
import { createOrder, payController } from "./pay";
const app = new Elysia({ prefix: `/api` });

app.use(
    cors({
        allowedHeaders: ["authorization", "Content-Type"], // you can change the headers
        exposedHeaders: ["authorization"], // you can change the headers
        // TODO: have to change this when ready for production
        origin: /^.*?localhost:5173$/,
        methods: [`GET`, `PUT`, `POST`, `DELETE`],
        preflight: true
    })
).use(payController);

app.get("/", () => "Hello Elysia!!!");

app.get("/hello", () => "Hello World!");

app.get("/test", async () => {
    console.log(`test`);
    // await addNonDuplicateCustomer({
    //     first_name: "testfn",
    //     last_name: "testln",
    //     email: "testemail@gmail.com",
    //     phone_no: "0438982888"
    // });
});

app.listen(3000, () => {
    console.log(`🦊 Elysia is running at ${app.server?.hostname}:${app.server?.port}`);
});
