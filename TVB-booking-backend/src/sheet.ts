import { google } from "googleapis";

export const testAddSheet = async () => {
    const auth = new google.auth.JWT({
        email: `tonyguo998@studied-airline-234911.iam.gserviceaccount.com`,
        key: Bun.env.google_service_account_key,
        scopes: ["https://www.googleapis.com/auth/spreadsheets"]
    });
    const sheet = google.sheets("v4");
    await sheet.spreadsheets.values.append({
        spreadsheetId: `1rE3_WSbj3jABrXB2JuNndH9XPv4Zi8uzGEE70dCN4eg`,
        auth: auth,
        range: "Sheet1",
        valueInputOption: "RAW",
        requestBody: {
            values: [["hello", "world"]]
        }
    });
};
