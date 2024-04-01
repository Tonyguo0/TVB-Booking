import { google } from "googleapis";
import _ from "lodash";
import path from "path";
import { IPlayer } from "./model/player";

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

export const getSheetTitle = async (): Promise<string> => {
    try {
        const spreadSheetResponse = await sheet.spreadsheets.get({
            spreadsheetId: process.env.spread_sheet_id,
            auth: auth
        });
        const sheets = spreadSheetResponse.data.sheets;
        if (sheets == null) {
            console.error(`could not get sheet data from google API spreadsheets`);
            throw new Error(`could not get sheet data from google API spreadsheets`);
        }
        const latestSheet: string = sheets?.[sheets?.length - 1].properties?.title!;
        console.log(sheets);
        console.log(`latest sheet is: ${latestSheet}`);
        return latestSheet;
    } catch (error: Error | any) {
        console.error(error);
        throw error;
    }
};

export const checkIfSundayExists = async (latestSheet: string) => {

};

