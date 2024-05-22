import { google } from "googleapis";
import _ from "lodash";
import path from "path";
import { IPlayer } from "./model/player";
import { getThisWeekSunday } from "./utils/utils";

const auth = new google.auth.GoogleAuth({
    keyFile: path.join(import.meta.dir, `../`, `google-cred.json`),
    scopes: ["https://www.googleapis.com/auth/spreadsheets"]
});
const sheet = google.sheets("v4");

/**
 * Appends a row to the specified sheet in a Google Spreadsheet.
 *
 * @param response - The array of strings representing the row data to be appended.
 * @param sheetName - The name of the sheet where the row should be appended.
 * @returns A Promise that resolves when the row is successfully appended.
 */
export async function appendRowToSheet(response: Array<string>, sheetName: string) {
    await sheet.spreadsheets.values.append({
        spreadsheetId: process.env.spread_sheet_id,
        auth: auth,
        range: `${sheetName}`,
        valueInputOption: "RAW",

        requestBody: {
            values: [[...response]]
        }
    });
}

export async function sheetContainsPlayer(player: IPlayer, sheetName: string): Promise<boolean> {
    try {
        const response = await sheet.spreadsheets.values.get({
            spreadsheetId: process.env.spread_sheet_id,
            auth: auth,
            range: `${sheetName}!A:C`
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
}

export async function getPaymentId(player: IPlayer, sheetName: string): Promise<string> {
    try {
        // REMEMBER: whenever you want to get more values in excel you have to increase the range e.g. A:E
        const response = await sheet.spreadsheets.values.get({
            spreadsheetId: process.env.spread_sheet_id,
            auth: auth,
            range: `${sheetName}!A:E`
        });
        console.log(`\nResponse = ${response?.data.values} \n`);
        const rows: Array<Array<string>> = response.data.values!;
        if (!rows) throw new Error(`Response rows is empty`);
        const playerArray: Array<string> = [player.first_name, player.last_name, player.email, player.phone_no];
        for (const row of rows) {
            console.log(`row:`);
            console.log(row);
            console.log(`playerArray:`);
            console.log(playerArray);
            const rowsToCompare = row.slice(0,4);
            console.log(`rowsToCompare: ${rowsToCompare}`);
            if (_.isEqual(rowsToCompare, playerArray)) {
                return row[4];
            }
        } 
        throw new Error(`Player not found in the sheet`);
    } catch (err: Error | any) {
        console.error(`The API returned an error: ${err.message}`);
        throw new Error(`The API returned an error: ${err.message}`);
    }
}


export async function sheetHasTooManyPlayer(player: IPlayer, sheetName: string): Promise<boolean> {
    try {
        const response = await sheet.spreadsheets.values.get({
            spreadsheetId: process.env.spread_sheet_id,
            auth: auth,
            range: `${sheetName}!A:C`
        });
        console.log(`\nResponse = ${response?.data.values} \n`);
        const rows: Array<Array<string>> = response.data.values!;
        if (!rows) throw new Error(`Response rows is empty`);
        const playerArray: Array<string> = [player.first_name, player.last_name, player.email];
        if (rows.length == 57) {
            const title = await getSheetTitle();
            appendRowToSheet(["waiting list:"], title);
            appendRowToSheet([" "], title);

        } else if(rows.length > 57) {
            // TODO: add players to waiting list when there are more than 57 players
            // TODO: might have to change it to append row to sheets

        }
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
}

export async function getSheetTitle(): Promise<string> {
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
}

export async function checkAndAppendIfSundayExists(): Promise<string> {
    const latestsheet: string = await getSheetTitle();
    const thisSunday: string = await getThisWeekSunday();
    if (latestsheet === thisSunday) {
        console.log("cool!");
        return latestsheet;
    } else {
        console.log(`adding a new sheet called ${thisSunday}`);
        await addSheets(thisSunday);
        //TODO: need to make the responses bold
        await appendRowToSheet(["First Name", "Last Name", "Email", "Phone Number", "Pay ID", "Paid?"], thisSunday);
        return thisSunday;
    }
}

export async function addSheets(sheetTitle: string): Promise<void> {
    try {
        const request = {
            spreadsheetId: process.env.spread_sheet_id,
            auth: auth,
            resource: {
                requests: [
                    {
                        addSheet: {
                            properties: {
                                title: sheetTitle,
                                gridProperties: {
                                    rowCount: 100,
                                    columnCount: 26
                                }
                            }
                        }
                    }
                ]
            }
        };
        const response = await sheet.spreadsheets.batchUpdate(request);
        console.log(JSON.stringify(response, null, 2));
    } catch (error: Error | any) {
        console.error(error);
    }
}

function deleteRow() {
    
    const request = {
        spreadsheetId: process.env.spread_sheet_id,
        resource: {
          requests: [
            {
              deleteDimension: {
                range: {
                  sheetId: process.env.spread_sheet_id,
                  dimension: 'ROWS',
                  startIndex: 1, // 0-based index, 1 refers to the second row
                  endIndex: 3 // exclusive, 3 refers to the fourth row, which will not be deleted
                }
              }
            }
          ]
        }
      };
      
      sheets.spreadsheets.batchUpdate(request, (err, response) => {
        if (err) {
          console.error(err);
          return;
        }
      
        console.log(`Deleted rows: ${JSON.stringify(response.data, null, 2)}`);
      });
} 