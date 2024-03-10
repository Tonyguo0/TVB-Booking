import { google } from "googleapis";
import path from "path";

export const AddSheet = async (response: Array<string>) => {
    const auth = new google.auth.GoogleAuth({
        keyFile: path.join(import.meta.dir, `../`, `google-cred.json`),
        scopes: ["https://www.googleapis.com/auth/spreadsheets"]
    });
    const sheet = google.sheets("v4");
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
