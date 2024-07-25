import { google, sheets_v4 } from "googleapis";
import _ from "lodash";
import path from "path";
import { IcreatePaybody } from "./model/createPayBody";
import { IPlayer } from "./model/player";
import { createPayment } from "./pay";
import { getThisWeekSunday } from "./utils/utils";

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
                values: [response]
            }
        });
    } catch (err: Error | any) {
        console.error(`The API returned an error: ${err.message}`);
    }
}

async function replaceValueInSheet(range: string, replacementValue: string) {
    try {
        const sheets = google.sheets({ version: "v4", auth: auth });

        const request = {
            spreadsheetId: process.env.spread_sheet_id,
            resource: {
                valueInputOption: "RAW",
                data: [
                    {
                        range: range,
                        values: [[replacementValue]]
                    }
                ]
            }
        };

        await sheets.spreadsheets.values.batchUpdate(request);
        console.log(`Value in ${range} updated to "${""}"`);
    } catch (err: Error | any) {
        console.error(`Failed to update value in sheet: ${err.message}`);
    }
}

async function insertRow(sheetId: number, insertAtIndex: number) {
    const sheets: sheets_v4.Sheets = google.sheets({ version: "v4", auth: auth });

    const request = {
        spreadsheetId: process.env.spread_sheet_id,
        resource: {
            requests: [
                {
                    insertDimension: {
                        range: {
                            sheetId: sheetId,
                            dimension: "ROWS", // Use 'COLUMNS' to insert columns
                            startIndex: insertAtIndex, // Index where the new row will be inserted
                            endIndex: insertAtIndex + 1 // Insert one row
                        },
                        inheritFromBefore: false // Set to true if you want the new row to inherit formatting from the row before the insertion point
                    }
                }
            ]
        }
    };

    try {
        await sheets.spreadsheets.batchUpdate(request);
        console.log(`Row inserted at index ${insertAtIndex}`);
    } catch (err: Error | any) {
        console.error(`Failed to insert row: ${err.message}`);
    }
}

/**
 * Appends a row to the specified sheet in a Google Spreadsheet.
 *
 * @param response - The array of strings representing the row data to be appended.
 * @param sheetName - The name of the sheet where the row should be appended.
 * @returns A Promise that resolves when the row is successfully appended.
 */
// TODO: add functionality in refund so that it deletes the row of the player and add another player from the waiting list to replace the old player
export async function checkAndAddRowToSheet(body: IcreatePaybody, customerId: string, sheetName: string) {
    // TODO: add to the correct coloumns of excel sheet payid: response.result.payment?.id!, paid or not: `yes`
    const playerDetailsArray: Array<string> = [body.player.first_name, body.player.last_name, body.player.email, body.player.phone_no];
    try {
        const rows: Array<Array<string>> = await getRow(sheetName, `A`, `D`);
        if (!rows) throw new Error(`Response rows is empty`);
        // player.firstname, player.lastname, player.email

        // TODO: figure out what this is for?
        const playerArray: Array<string> = [playerDetailsArray[0], playerDetailsArray[1], playerDetailsArray[2], playerDetailsArray[3]];
        const paymentResponse = await createPayment(body.sourceId, customerId);
        // TODO: change this to a enviroment variable
        if (rows.length == Number(process.env.MAX_PLAYERS)) {
            // TODO: add a empty row then append the waiting list title after wards then append the players to waiting list after that
            // number of columns
            await appendRowToSheet(["replacementValue"], sheetName);
            await appendRowToSheet(["waiting list:"], sheetName);
            await replaceValueInSheet(`${sheetName}!A57`, ` `);
            await appendRowToSheet([...playerDetailsArray, paymentResponse.result.payment?.id!, `yes`], sheetName);
        } else if (rows.length < Number(process.env.MAX_PLAYERS)) {
            await appendRowToSheet([...playerDetailsArray, paymentResponse.result.payment?.id!, `yes`], sheetName);
            // return paymentResponse here
            return paymentResponse;
        } else {
            // console.log(`paymentResponse = ${JSON.stringify(paymentResponse, null, 2)}`);
            await appendRowToSheet([...playerDetailsArray, paymentResponse.result.payment?.id!, `yes`], sheetName);
            // return paymentResponse here
        }
        // for (const row of rows) {
        //     console.log(`row:`);
        //     console.log(row);
        //     console.log(`playerArray:`);
        //     console.log(playerArray);
        //     if (_.isEqual(row, playerArray)) {
        //         return true;
        //     }
        // }
        // TODO: true represents player on waiitng list
        return true;
    } catch (err: Error | any) {
        throw new Error(`The API returned an error: ${err.message}`);
    }
}
async function getRow(sheetName: string, rowLetterFrom: string, rowLetterTo: string): Promise<string[][]> {
    try {
        const response = await sheets.spreadsheets.values.get({
            spreadsheetId: process.env.spread_sheet_id,
            auth: auth,
            range: `${sheetName}!${rowLetterFrom}:${rowLetterTo}`
        });
        console.log(`\nResponse = ${response?.data.values} \n`);
        const row: Array<Array<string>> = response.data.values!;
        return row;
    } catch (err: Error | any) {
        console.error(`The API returned an error: ${err.message}`);
        return err;
    }
}

export async function sheetContainsPlayer(player: IPlayer, sheetName: string): Promise<boolean> {
    try {
        const rows: Array<Array<string>> = await getRow(sheetName, `A`, `D`);
        if (!rows) throw new Error(`Response rows is empty`);
        const playerArray: Array<string> = [player.first_name, player.last_name, player.email, player.phone_no];
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
        const rows: Array<Array<string>> = await getRow(sheetName, `A`, `E`);
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
        // TODO: implement throwing errors
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
        const rows: Array<Array<string>> = await getRow(sheetName, `A`, `D`);
        if (rows) {
            // Find the row with the correct info

            const playerArray: Array<string> = [player.first_name, player.last_name, player.email, player.phone_no];
            const rowIndex = rows.findIndex((row: Array<string>) => {
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
