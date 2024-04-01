export async function getThisWeekSunday(): Promise<string> {
    const today = new Date();
    const currentDay = today.getDay(); // 0 (Sunday) to 6 (Saturday)

    // Calculate the number of days until Sunday (assuming Sunday is the last day of the week)
    const daysUntilSunday = (7 - currentDay) % 7;

    // Create a new date object for this week's Sunday
    const sundayDate = new Date(today);
    sundayDate.setDate(today.getDate() + daysUntilSunday);

    // Extract day, month, and year
    const day = sundayDate.getDate();
    const month = sundayDate.getMonth() + 1; // Months are 0-indexed
    const year = sundayDate.getFullYear();
    console.log(`${day}-${month}-${year}`)
    // Format the result as a string
    return `${day}-${month}-${year}`;
}

