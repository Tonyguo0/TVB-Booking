import { Elysia } from "elysia";
import { cors } from "@elysiajs/cors";
import { testAddSheet } from "./sheet";

const app = new Elysia()
    .use(
        cors({
            allowedHeaders: ["authorization", "Content-Type"], // you can change the headers
            exposedHeaders: ["authorization"], // you can change the headers
            origin: /^.*?localhost:5173$/,
            methods: [`GET`, `PUT`, `POST`, `DELETE`],
            preflight: true
        })
    )
    .get("/", () => "Hello Elysia!!!")
    .get("/hello", () => "Hello World!")
    .post("/player", ({ headers, body }) => {
        testAddSheet();
        console.log(headers, body);
    })
    .listen(3000);

console.log(`🦊 Elysia is running at ${app.server?.hostname}:${app.server?.port}`);
