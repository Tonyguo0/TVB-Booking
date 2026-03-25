import { DatePicker as MantineDatePicker } from "@mantine/dates";
import { Text } from "@mantine/core";
import { getUpcomingSessionDates, formatDateForDisplay } from "@/utils/dates";

interface DatePickerProps {
    selectedDate: Date | null;
    onDateSelect: (date: Date | null) => void;
}

const DatePicker = ({ selectedDate, onDateSelect }: DatePickerProps) => {
    const sessionDates = getUpcomingSessionDates(12);
    const firstDate = sessionDates[0];
    const lastDate = sessionDates[sessionDates.length - 1];

    const sessionDateStrings = sessionDates.map((d) => d.toDateString());

    const isSessionDate = (dateStr: string): boolean => {
        const date = new Date(dateStr);
        return sessionDateStrings.includes(date.toDateString());
    };

    const toDateString = (date: Date): string => {
        const y = date.getFullYear();
        const m = String(date.getMonth() + 1).padStart(2, "0");
        const d = String(date.getDate()).padStart(2, "0");
        return `${y}-${m}-${d}`;
    };

    const handleChange = (value: string | null) => {
        if (value) {
            onDateSelect(new Date(value));
        } else {
            onDateSelect(null);
        }
    };

    return (
        <div>
            <MantineDatePicker
                value={selectedDate ? toDateString(selectedDate) : null}
                onChange={handleChange}
                excludeDate={(dateStr) => !isSessionDate(dateStr)}
                minDate={firstDate}
                maxDate={lastDate}
                size="md"
            />
            {selectedDate && (
                <Text size="sm" c="dimmed" ta="center" mt="xs">
                    Selected: {formatDateForDisplay(selectedDate)}
                </Text>
            )}
        </div>
    );
};

export default DatePicker;
