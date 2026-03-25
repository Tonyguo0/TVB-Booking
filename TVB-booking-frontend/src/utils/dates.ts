const SESSION_DAYS: number[] = [0, 4, 5]; // Sunday, Thursday, Friday

/**
 * Returns the next `count` upcoming session dates (Thursday, Friday, Sunday).
 * If today is a session day, it is included as the first option.
 */
export function getUpcomingSessionDates(
    count: number = 12,
    sessionDays: number[] = SESSION_DAYS
): Date[] {
    const dates: Date[] = [];
    const today: Date = new Date();
    today.setHours(0, 0, 0, 0);
    const cursor: Date = new Date(today);

    for (let i: number = 0; dates.length < count && i < 60; i++) {
        if (sessionDays.includes(cursor.getDay())) {
            dates.push(new Date(cursor));
        }
        cursor.setDate(cursor.getDate() + 1);
    }

    return dates;
}

/**
 * Formats a Date to match the backend's sheet name format: "d-M-yyyy"
 * e.g., new Date("2025-03-30") -> "30-3-2025"
 */
export function formatDateForBackend(date: Date): string {
    const day: number = date.getDate();
    const month: number = date.getMonth() + 1;
    const year: number = date.getFullYear();
    return `${day}-${month}-${year}`;
}

/**
 * Formats a Date for display: "Sunday, 30 March 2025"
 */
export function formatDateForDisplay(date: Date): string {
    return date.toLocaleDateString(`en-AU`, {
        weekday: `long`,
        year: `numeric`,
        month: `long`,
        day: `numeric`
    });
}
