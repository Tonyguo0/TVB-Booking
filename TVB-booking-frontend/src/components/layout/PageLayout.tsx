import { ReactNode } from "react";
import { Container, Group, Title, Text } from "@mantine/core";
import ThemeToggle from "@/components/ThemeToggle";

interface PageLayoutProps {
    children: ReactNode;
}

const PageLayout = ({ children }: PageLayoutProps) => {
    return (
        <div style={{ minHeight: "100vh" }}>
            <header style={{ borderBottom: "1px solid var(--mantine-color-default-border)", padding: "1rem 0" }}>
                <Container size="sm">
                    <Group justify="space-between" align="center">
                        <div>
                            <Title order={2}>TVB Volleyball</Title>
                            <Text size="sm" c="dimmed">
                                Session Booking
                            </Text>
                        </div>
                        <ThemeToggle />
                    </Group>
                </Container>
            </header>
            <Container size="sm" py="xl">
                {children}
            </Container>
        </div>
    );
};

export default PageLayout;
