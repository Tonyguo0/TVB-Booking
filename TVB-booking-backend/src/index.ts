import { cors } from "@elysiajs/cors";
import { Elysia } from "elysia";
import { payController } from "./pay";
import { getSheetTitle } from "./sheet";
import { getThisWeekSunday } from "./utils/utils";
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

app.get("/test", async () => {
    const latestsheet = await getSheetTitle();
    const thisSunday = getThisWeekSunday();
    if (latestsheet === thisSunday) {
        console.log("cool!");
    } else {
        // TODO: this
        console.log(`add a new sheet called ${thisSunday}`);
    }
    // checkIfSundayExists(latestsheet);
});

app.listen(3000, () => {
    console.log(`🦊 Elysia is running at ${app.server?.hostname}:${app.server?.port}`);
});
