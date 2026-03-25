import { Card, Text, Group, Divider, Stack, Title } from "@mantine/core";
import { IPlayer } from "@/model/player";
import { formatDateForDisplay } from "@/utils/dates";

interface OrderSummaryProps {
    player: IPlayer;
    selectedDate: Date;
    amount: string;
}

const OrderSummary = ({ player, selectedDate, amount }: OrderSummaryProps) => {
    return (
        <Card withBorder shadow="sm" radius="md" padding="lg">
            <Title order={4} mb="md">
                Order Summary
            </Title>
            <Stack gap="xs">
                <Group justify="space-between">
                    <Text size="sm" c="dimmed">Player</Text>
                    <Text size="sm" fw={500}>
                        {player.first_name} {player.last_name}
                    </Text>
                </Group>
                <Group justify="space-between">
                    <Text size="sm" c="dimmed">Date</Text>
                    <Text size="sm" fw={500}>
                        {formatDateForDisplay(selectedDate)}
                    </Text>
                </Group>
                <Group justify="space-between">
                    <Text size="sm" c="dimmed">Email</Text>
                    <Text size="sm" fw={500}>{player.email}</Text>
                </Group>
                <Divider my="sm" />
                <Group justify="space-between">
                    <Text size="lg" fw={600}>Amount Due</Text>
                    <Text size="lg" fw={600}>${amount} AUD</Text>
                </Group>
            </Stack>
        </Card>
    );
};

export default OrderSummary;
