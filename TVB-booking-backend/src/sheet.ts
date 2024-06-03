import { google } from "googleapis";
import _ from "lodash";
import path from "path";
import { IPlayer } from "./model/player";
import { getThisWeekSunday } from "./utils/utils";
import { createPayment } from "./pay";

const auth = new google.auth.GoogleAuth({
    keyFile: path.join(import.meta.dir, `../`, `google-cred.json`),
    scopes: ["https://www.googleapis.com/auth/spreadsheets"]
});
const sheets = google.sheets("v4");

async function appendRowToSheet(response: Array<string>, sheetName: string) {
    try {
        await sheets.spreadsheets.values.append({
            spreadsheetId: process.env.spread_sheet_id,
            auth: auth,
            range: `${sheetName}`,
            valueInputOption: "RAW",

            requestBody: {
                values: [[...response]]
            }
        });
    } catch (err: Error | any) {
        console.error(`The API returned an error: ${err.message}`);
    }
}

/**
 * Appends a row to the specified sheet in a Google Spreadsheet.
 *
 * @param response - The array of strings representing the row data to be appended.
 * @param sheetName - The name of the sheet where the row should be appended.
 * @returns A Promise that resolves when the row is successfully appended.
 */
// TODO: create new model for body
export async function checkAndAddRowToSheet(body: { sourceId: string; player: { first_name: string; last_name: string; email: string; phone_no: string } }, customerId: string, sheetName: string) {
    // TODO: use createPayment(sourceId: string, CustomerId: string)
    const response = createPayment(body.sourceId, customerId);
    // TODO: add to the correct coloumns of excel sheet payid: response.result.payment?.id!, paid or not: `yes` 
    const playerDetailsArray: Array<string> = [body.player.first_name, body.player.last_name, body.player.email, body.player.phone_no];
    try {
        // TODO: waiting list logic to be implemented
        const response = await sheets.spreadsheets.values.get({
            spreadsheetId: process.env.spread_sheet_id,
            auth: auth,
            range: `${sheetName}!A:D`
        });
        console.log(`\nResponse = ${response?.data.values} \n`);
        const rows: Array<Array<string>> = response.data.values!;
        if (!rows) throw new Error(`Response rows is empty`);
        // player.firstname, player.lastname, player.email

        const playerArray: Array<string> = [playerDetailsArray[0], playerDetailsArray[1], playerDetailsArray[2], playerDetailsArray[3]];
        if (rows.length < 57) {
            // TODO: append until 56 players to the row
            appendRowToSheet(playerDetailsArray, sheetName);
        } else if (rows.length == 57) {
            // TODO: add a empty row then append the waiting list title after wards then append the players to waiting list after that
            appendRowToSheet([" "], sheetName);
            appendRowToSheet(["waiting list:"], sheetName);
            appendRowToSheet(playerDetailsArray, sheetName);
        } else if (rows.length > 57) {
            appendRowToSheet(playerDetailsArray, sheetName);

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

export async function sheetContainsPlayer(player: IPlayer, sheetName: string): Promise<boolean> {
    try {
        const response = await sheets.spreadsheets.values.get({
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
        const response = await sheets.spreadsheets.values.get({
            spreadsheetId: process.env.spread_sheet_id,
            auth: auth,
            range: `${sheetName}!A:E`
        });
        console.log(`\nResponse = ${response?.data.values} \n`);
        const rows: Array<Array<string>> = response.data.values!;
        if (!rows) throw new Error(`Response rows is empty`);
        const playerArray: Array<string> = [player.first_name, player.last_name, player.email, player.phone_no];
        for (const row of rows) {
            // console.log(`row:`);
            // console.log(row);
            // console.log(`playerArray:`);
            // console.log(playerArray);
            const rowsToCompare = row.slice(0, 4);
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

export async function getSheetTitle(): Promise<string> {
    try {
        const spreadSheetResponse = await sheets.spreadsheets.get({
            spreadsheetId: process.env.spread_sheet_id,
            auth: auth
        });
        const sheet = spreadSheetResponse.data.sheets;
        if (sheets == null) {
            console.error(`could not get sheet data from google API spreadsheets`);
            throw new Error(`could not get sheet data from google API spreadsheets`);
        }
        const latestSheet: string = sheet?.[sheet?.length - 1].properties?.title!;
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
        const response = await sheets.spreadsheets.batchUpdate(request);
        console.log(JSON.stringify(response, null, 2));
    } catch (error: Error | any) {
        console.error(error);
    }
}

export async function getSheetId(sheetName: string) {
    const response = await sheets.spreadsheets.get({
        spreadsheetId: process.env.spread_sheet_id,
        auth: auth
    });

    const sheet = response.data.sheets?.find((sheet) => sheet.properties?.title === sheetName);

    return String(sheet?.properties?.sheetId);
}

export async function deleteRow(player: IPlayer, sheetName: string, sheetId: string) {
    try {
        // Get the data from the sheet
        const response = await sheets.spreadsheets.values.get({
            spreadsheetId: process.env.spread_sheet_id,
            range: `${sheetName}!A:D`,
            auth: auth
        });

        const rows = response.data.values;
        if (rows) {
            // Find the row with the correct info

            const playerArray: Array<string> = [player.first_name, player.last_name, player.email, player.phone_no];
            const rowIndex = rows.findIndex((row: Array<string>) => {
                console.log(row);
                const PlayerExcelRows = row.slice(0, 4);
                console.log(`PlayerExcelRows: ${PlayerExcelRows}`);
                console.log(`playerArray: ${playerArray}`);
                return _.isEqual(PlayerExcelRows, playerArray);
            });

            if (rowIndex !== -1) {
                // Delete the row
                const request = {
                    spreadsheetId: process.env.spread_sheet_id,
                    auth: auth,
                    resource: {
                        requests: [
                            {
                                deleteDimension: {
                                    range: {
                                        sheetId: sheetId,
                                        dimension: "ROWS",
                                        startIndex: rowIndex,
                                        endIndex: rowIndex + 1
                                    }
                                }
                            }
                        ]
                    }
                };

                const deleteResponse = await sheets.spreadsheets.batchUpdate(request);
                console.log(`Deleted row: ${rowIndex + 1}`);
                return deleteResponse;
            } else {
                console.log(`No row found with player information: ${playerArray}`);
            }
        } else {
            console.log(`No data found in sheet: ${sheetName}`);
        }
    } catch (error: Error | any) {
        console.error(error);
    }
}
