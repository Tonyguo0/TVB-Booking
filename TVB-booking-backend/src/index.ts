import { Elysia } from "elysia";
import { cors } from "@elysiajs/cors";
import { testAddSheet } from "./sheet";
import { IPlayer } from "./model/player";
const app = new Elysia();

app.use(
    cors({
        allowedHeaders: ["authorization", "Content-Type"], // you can change the headers
        exposedHeaders: ["authorization"], // you can change the headers
        origin: /^.*?localhost:5173$/,
        methods: [`GET`, `PUT`, `POST`, `DELETE`],
        preflight: true
    })
);

app.get("/", () => "Hello Elysia!!!");

app.get("/hello", () => "Hello World!");

app.post("/player", ({ body }: { body: IPlayer }) => {
    testAddSheet([body.first_name, body.last_name, body.email, body.phone_no]);
    console.log(body);
});

app.listen(3000, () => {
    console.log(`🦊 Elysia is running at ${app.server?.hostname}:${app.server?.port}`);
});
