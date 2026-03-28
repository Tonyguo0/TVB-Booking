import { google, sheets_v4 } from "googleapis";
import { GaxiosResponseWithHTTP2 } from "googleapis-common";
import _ from "lodash";
import path from "path";
import { PayResponse } from "./model/apiResponse";
import { IcreatePaybody, NotificationPreference } from "./model/createPayBody";
import { IPlayer } from "./model/player";
import { checkIfCustomerExists, createPayment } from "./pay";
import { getThisWeekSunday, MAX_PLAYERS } from "./utils/utils";
import { CreatePaymentResponse } from "square";

type SheetsValueResponse = GaxiosResponseWithHTTP2<sheets_v4.Schema$ValueRange>;
type SheetsBatchResponse = GaxiosResponseWithHTTP2<sheets_v4.Schema$BatchUpdateSpreadsheetResponse>;
type SheetsSpreadsheetResponse = GaxiosResponseWithHTTP2<sheets_v4.Schema$Spreadsheet>;
type SheetsUpdateResponse = GaxiosResponseWithHTTP2<sheets_v4.Schema$UpdateValuesResponse>;

// const sheetId =

const auth = new google.auth.GoogleAuth({
    keyFile: path.join(import.meta.dir, `../`, `google-cred.json`),
    scopes: [`https://www.googleapis.com/auth/spreadsheets`]
});
const sheets: sheets_v4.Sheets = google.sheets(`v4`);

async function appendRowToSheet(response: Array<string>, sheetName: string): Promise<void> {
    try {
        await sheets.spreadsheets.values.append({
            spreadsheetId: process.env.SPREAD_SHEET_ID,
            auth: auth,
            range: `${sheetName}`,
            valueInputOption: `RAW`,

            requestBody: {
                values: [response]
            }
        });
    } catch (err: Error | any) {
        console.error(`The API returned an error: ${err.message}`);
    }
}

async function makeRowBold(sheetId: string, rowIndex: number): Promise<void> {
    const request = {
        spreadsheetId: process.env.SPREAD_SHEET_ID,
        auth: auth,
        resource: {
            requests: [
                {
                    repeatCell: {
                        range: {
                            sheetId: sheetId,
                            startRowIndex: rowIndex,
                            endRowIndex: rowIndex + 1
                        },
                        cell: {
                            userEnteredFormat: {
                                textFormat: {
                                    bold: true
                                }
                            }
                        },
                        fields: `userEnteredFormat.textFormat.bold`
                    }
                }
            ]
        }
    };

    try {
        await sheets.spreadsheets.batchUpdate(request);
        console.log(`Row ${rowIndex} is now bold`);
    } catch (err: Error | any) {
        console.error(`Failed to make row bold: ${err.message}`);
    }
}

async function replaceValueInSheet(range: string, replacementValue: string): Promise<void> {
    try {
        const sheets = google.sheets({ version: `v4`, auth: auth });

        const request = {
            spreadsheetId: process.env.SPREAD_SHEET_ID,
            resource: {
                valueInputOption: `RAW`,
                data: [
                    {
                        range: range,
                        values: [[replacementValue]]
                    }
                ]
            }
        };

        await sheets.spreadsheets.values.batchUpdate(request);
        console.log(`Value in ${range} updated to "${``}"`);
    } catch (err: Error | any) {
        console.error(`Failed to update value in sheet: ${err.message}`);
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
export async function checkAndAddRowToSheet(body: IcreatePaybody, customerId: string, sheetName: string, customerExistsOverride?: boolean): Promise<PayResponse> {
    const playerDetailsArray: Array<string> = [body.player.first_name, body.player.last_name, body.player.email, body.player.phone_no];
    const notifPref: string = body.notification_preference || ``;
    try {
        const rows: Array<Array<string>> = await getRow(sheetName, `A`, `D`);
        if (!rows) throw new Error(`Response rows is empty`);
        const customerExists: boolean = customerExistsOverride ?? await checkIfCustomerExists(body.player);
        console.log(`customerExists in checkAndAddRowToSheet: ${customerExists}`);
        const paymentResponse: CreatePaymentResponse | number = await createPayment(body.sourceId, customerId, body.voucher, customerExists);
        const numOfRows: number = await getNumberOfRows(sheetName);
        console.log(`numOfRows = ${numOfRows}`);

        const paymentId: string = typeof paymentResponse === `number` ? `` : paymentResponse.payment?.id!;
        const isVoucherApplied: boolean = typeof paymentResponse === `number`;

        if (numOfRows === MAX_PLAYERS + 1) {
            // Append waiting list title and add the player to the waiting list
            // number of columns
            await appendRowToSheet([`replacementValue`], sheetName);
            await appendRowToSheet([`waiting list:`], sheetName);
            const sheetId: string = await getSheetId(sheetName);
            await makeRowBold(sheetId, MAX_PLAYERS + 2);
            await replaceValueInSheet(`${sheetName}!A${MAX_PLAYERS + 2}`, ` `);
            // append the player to the waiting list and check if there is paymentResponse or if the 100% discount is used
            await appendRowToSheet([...playerDetailsArray, paymentId, `yes`, notifPref], sheetName);
        } else if (numOfRows < MAX_PLAYERS + 1) {
            // Append the player for the game and check if there is paymentResponse or if the 100% discount is used
            await appendRowToSheet([...playerDetailsArray, paymentId, `yes`, notifPref], sheetName);
            return {
                status: isVoucherApplied ? `voucher_applied` : `paid`,
                paymentId: paymentId || undefined,
                message: isVoucherApplied ? `Voucher applied, no payment required` : `Payment successful`
            };
        } else {
            await appendRowToSheet([...playerDetailsArray, paymentId, `yes`, notifPref], sheetName);
        }
        return {
            status: `waiting_list`,
            paymentId: paymentId || undefined,
            message: `Player added to the waiting list`
        };
    } catch (err: Error | any) {
        throw new Error(`The API returned an error: ${err.message}`);
    }
}
export async function getRow(sheetName: string, rowLetterFrom: string, rowLetterTo: string): Promise<string[][]> {
    try {
        const response: SheetsValueResponse = await sheets.spreadsheets.values.get({
            spreadsheetId: process.env.SPREAD_SHEET_ID,
            auth: auth,
            range: `${sheetName}!${rowLetterFrom}:${rowLetterTo}`
        });
        console.log(`\nResponse = ${response?.data.values} \n`);
        const row: Array<Array<string>> = response.data.values!;
        return row;
    } catch (err: Error | any) {
        console.error(`The API returned an error: ${err.message}`);
        throw err;
    }
}

export async function sheetContainsPlayer(player: IPlayer, sheetName: string): Promise<boolean> {
    const normalize = (s: string): string => s.trim().toLowerCase();
    const rows: Array<Array<string>> = await getRow(sheetName, `A`, `D`);
    if (!rows) throw new Error(`Response rows is empty`);
    const playerArray: Array<string> = [
        normalize(player.first_name),
        normalize(player.last_name),
        normalize(player.email),
        normalize(player.phone_no)
    ];
    for (const row of rows) {
        const normalizedRow: Array<string> = row.map(normalize);
        if (_.isEqual(normalizedRow, playerArray)) {
            return true;
        }
    }
    return false;
}

export async function getPaymentId(player: IPlayer, sheetName: string): Promise<string> {
    try {
        // REMEMBER: whenever you want to get more values in excel you have to increase the range e.g. A:E
        const rows: Array<Array<string>> = await getRow(sheetName, `A`, `E`);
        if (!rows) throw new Error(`Response rows is empty`);
        const playerArray: Array<string> = [player.first_name, player.last_name, player.email, player.phone_no];
        for (const row of rows) {
            const rowsToCompare: Array<string> = row.slice(0, 4);
            console.log(`rowsToCompare: ${rowsToCompare}`);
            if (_.isEqual(rowsToCompare, playerArray)) {
                return row[4];
            }
        }
        throw new Error(`Player not found in the sheet`);
    } catch (err: Error | any) {
        console.error(`Error in getPaymentId: ${err.message}`);
        if (err.message === `Player not found in the sheet`) {
            throw err;
        }
        throw new Error(`Failed to retrieve payment ID: ${err.message}`);
    }
}

export async function getSheetTitle(): Promise<string> {
    try {
        const spreadSheetResponse: SheetsSpreadsheetResponse = await sheets.spreadsheets.get({
            spreadsheetId: process.env.SPREAD_SHEET_ID,
            auth: auth
        });
        const sheet: sheets_v4.Schema$Sheet[] | undefined = spreadSheetResponse.data.sheets;
        if (sheets == null) {
            console.error(`could not get sheet data from google API spreadsheets`);
            throw new Error(`could not get sheet data from google API spreadsheets`);
        }
        const latestSheet: string = sheet?.[sheet?.length - 1].properties?.title!;
        console.log(`latest sheet is: ${latestSheet}`);
        return latestSheet;
    } catch (error: Error | any) {
        console.error(error);
        throw error;
    }
}

export async function createSheetIfMissing(): Promise<string> {
    const latestsheet: string = await getSheetTitle();
    const thisSunday: string = await getThisWeekSunday();
    if (latestsheet === thisSunday) {
        console.log(`cool!`);
        return latestsheet;
    } else {
        console.log(`adding a new sheet called ${thisSunday}`);
        await addSheets(thisSunday);
        await appendRowToSheet([`First Name`, `Last Name`, `Email`, `Phone Number`, `Pay ID`, `Paid?`, `Notif Pref`], thisSunday);
        const sheetId: string = await getSheetId(thisSunday);
        await makeRowBold(sheetId, 0);
        return thisSunday;
    }
}

export async function createSheetForDate(dateString: string): Promise<string> {
    try {
        await getSheetId(dateString);
        console.log(`Sheet "${dateString}" already exists`);
        return dateString;
    } catch {
        console.log(`Creating new sheet for date: ${dateString}`);
        await addSheets(dateString);
        await appendRowToSheet([`First Name`, `Last Name`, `Email`, `Phone Number`, `Pay ID`, `Paid?`, `Notif Pref`], dateString);
        const sheetId: string = await getSheetId(dateString);
        await makeRowBold(sheetId, 0);
        return dateString;
    }
}

export async function addSheets(sheetTitle: string): Promise<void> {
    try {
        const request = {
            spreadsheetId: process.env.SPREAD_SHEET_ID,
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
        await sheets.spreadsheets.batchUpdate(request);
        // TODO: implement throwing errors
    } catch (error: Error | any) {
        console.error(error);
    }
}

export async function getSheetId(sheetName: string): Promise<string> {
    try {
        const response: SheetsSpreadsheetResponse = await sheets.spreadsheets.get({
            spreadsheetId: process.env.SPREAD_SHEET_ID,
            auth: auth
        });

        const sheet: sheets_v4.Schema$Sheet | undefined = response.data!.sheets!.find((sheet) => sheet.properties!.title! === sheetName);
        if (!sheet) {
            throw new Error(`Sheet with name ${sheetName} not found`);
        }

        return String(sheet?.properties?.sheetId);
    } catch (error: Error | any) {
        if (!error.message?.includes(`not found`)) {
            console.error(error);
        }
        throw error;
    }
}

export async function findRowIndexBasedOnPlayer(player: IPlayer, rows: Array<Array<string>>): Promise<number> {
    try {
        const playerArray: Array<string> = [player.first_name, player.last_name, player.email, player.phone_no];
        const rowIndex: number = rows.findIndex((row: Array<string>) => {
            const PlayerExcelRows: Array<string> = row.slice(0, 4);
            console.log(`PlayerExcelRows: ${PlayerExcelRows}`);
            console.log(`playerArray: ${playerArray}`);
            return _.isEqual(PlayerExcelRows, playerArray);
        });
        return rowIndex;
    } catch (err: Error | any) {
        throw new Error(`Error in findRowIndex: ${err.message}`);
    }
}

export async function deleteRows(startIndex: number, endIndex: number, sheetId: string) {
    try {
        // Get the data from the sheet
        // Delete the row
        const request = {
            spreadsheetId: process.env.SPREAD_SHEET_ID,
            auth: auth,
            resource: {
                requests: [
                    {
                        deleteDimension: {
                            range: {
                                sheetId: sheetId,
                                dimension: `ROWS`,
                                startIndex: startIndex,
                                endIndex: endIndex
                            }
                        }
                    }
                ]
            }
        };

        const deleteResponse: SheetsBatchResponse = await sheets.spreadsheets.batchUpdate(request);
        console.log(`Deleted rows: ${startIndex} to ${endIndex}`);
        return deleteResponse;
    } catch (error: Error | any) {
        console.error(error);
    }
}

export async function deleteRowBasedOnPlayer(player: IPlayer, sheetName: string, sheetId: string) {
    try {
        // Get the data from the sheet
        const rows: Array<Array<string>> = await getRow(sheetName, `A`, `D`);
        if (rows) {
            // Find the row with the correct info

            const rowIndex: number = await findRowIndexBasedOnPlayer(player, rows);

            if (rowIndex !== -1) {
                // Delete the row
                // TODO: deal with typing of variables
                const deleteResponse = await deleteRows(rowIndex, rowIndex + 1, sheetId);
                return deleteResponse;
            } else {
                console.log(`No row found with player information: ${JSON.stringify(player, null, 2)}`);
            }
        } else {
            console.log(`No data found in sheet: ${sheetName}`);
        }
    } catch (error: Error | any) {
        console.error(error);
    }
}

export async function clearRowBasedOnPlayer(player: IPlayer, sheetName: string, _sheetId: string) {
    try {
        // Get the data from the sheet
        const rows: Array<Array<string>> = await getRow(sheetName, `A`, `D`);
        if (rows) {
            // Find the row with the correct info

            const rowIndex: number = await findRowIndexBasedOnPlayer(player, rows);

            if (rowIndex !== -1) {
                // Delete the row
                const request = {
                    spreadsheetId: process.env.SPREAD_SHEET_ID,
                    auth: auth,
                    range: `${sheetName}!${rowIndex + 1}:${rowIndex + 1}`,
                    valueInputOption: `RAW`,
                    resource: {
                        values: [[``, ``, ``, ``, ``, ``]]
                    }
                };

                const updateResponse: SheetsUpdateResponse = await sheets.spreadsheets.values.update(request);
                console.log(`Cleared row: ${rowIndex + 1}`);
                return updateResponse;
            } else {
                console.log(`No row found with player information: ${JSON.stringify(player, null, 2)}`);
            }
        } else {
            console.log(`No data found in sheet: ${sheetName}`);
        }
    } catch (error: Error | any) {
        console.error(error);
    }
}

export async function deleteRowBasedOnIndex(rowIndex: number, _sheetName: string, sheetId: string) {
    try {
        const request = {
            spreadsheetId: process.env.SPREAD_SHEET_ID,
            auth: auth,
            resource: {
                requests: [
                    {
                        deleteDimension: {
                            range: {
                                sheetId: sheetId,
                                dimension: `ROWS`,
                                startIndex: rowIndex - 1,
                                endIndex: rowIndex
                            }
                        }
                    }
                ]
            }
        };
        console.log(`Deleting row: ${rowIndex}`);
        const deleteResponse: SheetsBatchResponse = await sheets.spreadsheets.batchUpdate(request);
        console.log(`Deleted row: ${rowIndex}`);
        return deleteResponse;
    } catch (error: Error | any) {
        console.error(error);
    }
}

export interface PromotedPlayerInfo {
    first_name: string;
    last_name: string;
    email: string;
    phone_no: string;
    notification_preference?: NotificationPreference;
}

export async function copyAndReplaceRow(player: IPlayer, sheetName: string): Promise<PromotedPlayerInfo | null> {
    try {
        // Step 1: Read the row to be copied of the first player in the waiting list (A-G includes notif pref)
        const RowToBeReplaced: Array<Array<string>> = await getRow(sheetName, `A${MAX_PLAYERS + 4}`, `G${MAX_PLAYERS + 4}`);
        if (!RowToBeReplaced || !RowToBeReplaced[0]) throw new Error(`Row to be replaced is empty in copyAndReplaceRow()`);
        const promotedRow: Array<string> = RowToBeReplaced[0];
        const promotedPlayer: PromotedPlayerInfo = {
            first_name: promotedRow[0] || ``,
            last_name: promotedRow[1] || ``,
            email: promotedRow[2] || ``,
            phone_no: promotedRow[3] || ``,
            notification_preference: (promotedRow[6] as NotificationPreference) || undefined
        };
        const playerRow: Array<Array<string>> = await getRow(sheetName, `A`, `D`);
        if (!playerRow) throw new Error(`Player row is empty in copyAndReplaceRow()`);
        const rowIndex: number = await findRowIndexBasedOnPlayer(player, playerRow);
        // Step 2: Write the copied values to the target row
        const writeRequest = {
            spreadsheetId: process.env.SPREAD_SHEET_ID,
            auth: auth,
            range: `${sheetName}!A${rowIndex + 1}:G${rowIndex + 1}`,
            valueInputOption: `RAW`,
            resource: {
                values: RowToBeReplaced
            }
        };

        await sheets.spreadsheets.values.update(writeRequest);
        console.log(`Row copied from row of first player in the waiting list row ${MAX_PLAYERS + 4} to ${rowIndex}`);
        return promotedPlayer;
    } catch (err: Error | any) {
        console.error(`Failed to copy and replace row: ${err}`);
        return null;
    }
}

export async function getNumberOfRows(sheetName: string): Promise<number> {
    try {
        const response: SheetsValueResponse = await sheets.spreadsheets.values.get({
            spreadsheetId: process.env.SPREAD_SHEET_ID,
            auth: auth,
            range: `${sheetName}!A:A`
        });
        return response.data.values?.length!;
    } catch (err: Error | any) {
        throw new Error(`getNumberOfRows function returned an error: ${err.message}`);
    }
}
