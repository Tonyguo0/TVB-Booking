import { Currency } from "square";

export const MAX_PLAYERS: number = Number(getEnv(process.env.MAX_PLAYERS!));
export const WAITING_LIST_PLAYER_AMOUNT: number = Number(getEnv(process.env.WAITING_LIST_PLAYER_AMOUNT!));
export const LOCATION_ID: string = getEnv(process.env.SQUARE_LOCATION_ID!);
export const ITEM_VARIATION_ID: string = getEnv(process.env.ITEM_VARIATION_ID!);
export const VOUCHER_CODE: string = getEnv(process.env.VOUCHER_CODE!);
export const PRICE_AMOUNT_CENTS: bigint = BigInt(getEnv(process.env.PRICE_AMOUNT_CENTS!));
export const PRICE_AMOUNT_DISPLAY: string = (Number(getEnv(process.env.PRICE_AMOUNT_CENTS!)) / 100).toFixed(2);
export const CURRENCY_CODE: Currency = getEnv(process.env.CURRENCY_CODE!) as Currency;
export const PORT: number = Number(getEnv(process.env.PORT!));
export const CRON_SCHEDULE: string = getEnv(process.env.CRON_SCHEDULE!);
export const TIMEZONE: string = getEnv(process.env.TIMEZONE!);

export async function getThisWeekSunday(): Promise<string> {
    const today: Date = new Date();
    const currentDay: number = today.getDay(); // 0 (Sunday) to 6 (Saturday)

    // Calculate the number of days until Sunday (assuming Sunday is the last day of the week)
    const daysUntilSunday: number = (7 - currentDay) % 7;

    // Create a new date object for this week's Sunday
    const sundayDate: Date = new Date(today);
    sundayDate.setDate(today.getDate() + daysUntilSunday);

    // Extract day, month, and year
    const day: number = sundayDate.getDate();
    const month: number = sundayDate.getMonth() + 1; // Months are 0-indexed
    const year: number = sundayDate.getFullYear();
    console.log(`${day}-${month}-${year}`);
    // Format the result as a string
    return `${day}-${month}-${year}`;
}

export function getEnv(envVariable: string): string {
    try {
        if (envVariable == null || envVariable === ``) {
            throw new Error(`envVariable is empty`);
        }
        return envVariable;
    } catch (err) {
        throw err;
    }
}
