import { useMantineColorScheme } from "@mantine/core";
import { ActionIcon } from "@mantine/core";
import { Sun, Moon } from "lucide-react";

const ThemeToggle = () => {
    const { colorScheme, toggleColorScheme } = useMantineColorScheme();
    const isDark = colorScheme === "dark";

    return (
        <ActionIcon
            variant="subtle"
            size="lg"
            onClick={toggleColorScheme}
            aria-label="Toggle dark mode"
        >
            {isDark ? <Sun size={18} /> : <Moon size={18} />}
        </ActionIcon>
    );
};

export default ThemeToggle;
