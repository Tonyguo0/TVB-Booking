import { cors } from "@elysiajs/cors";
import { Elysia } from "elysia";
import { payController } from "./pay";
const app = new Elysia({ prefix: `/api` });

app.use(
    cors({
        allowedHeaders: ["authorization", "Content-Type"], // you can change the headers
        exposedHeaders: ["authorization"], // you can change the headers
        origin: /^.*?localhost:5173$/,
        methods: [`GET`, `PUT`, `POST`, `DELETE`],
        preflight: true
    })
).use(payController);

app.get("/", () => "Hello Elysia!!!");

app.get("/hello", () => "Hello World!");

app.listen(3000, () => {
    console.log(`🦊 Elysia is running at ${app.server?.hostname}:${app.server?.port}`);
});
