import { google } from "googleapis";
import path from "path";
import { IPlayer } from "./model/player";
import _ from "lodash";

const auth = new google.auth.GoogleAuth({
    keyFile: path.join(import.meta.dir, `../`, `google-cred.json`),
    scopes: ["https://www.googleapis.com/auth/spreadsheets"]
});
const sheet = google.sheets("v4");

export const addSheet = async (response: Array<string>) => {
    await sheet.spreadsheets.values.append({
        spreadsheetId: process.env.spread_sheet_id,
        auth: auth,
        range: "Sheet1",
        valueInputOption: "RAW",
        requestBody: {
            values: [[...response]]
        }
    });
};

export const sheetContainsPlayer = async (player: IPlayer): Promise<boolean> => {
    try {
        const response = await sheet.spreadsheets.values.get({
            spreadsheetId: process.env.spread_sheet_id,
            auth: auth,
            range: "Sheet1!A:C"
        });
        console.log(`\nResponse = ${response?.data.values} \n`);
        const rows: Array<Array<string>> = response.data.values!;
        if (!rows) throw new Error(`Response rows is empty`);
        const playerArray: Array<string> = [player.first_name, player.last_name, player.email];
        for (const row of rows) {
            console.log(`row:`);
            console.log(row);
            console.log(`playerArray:`);
            console.log(playerArray);
            if (_.isEqual(row, playerArray)) {
                return true;
            }
        }
        return false;
    } catch (err: Error | any) {
        console.error(`The API returned an error: ${err.message}`);
        return false;
    }
};
