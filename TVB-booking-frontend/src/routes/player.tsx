import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { notifications } from "@mantine/notifications";
import { Alert, Button, Card, Progress, TextInput, Title, Text, Divider, Stack } from "@mantine/core";
import DatePicker from "@/components/DatePicker";
import PlayerForm from "@/components/PlayerForm";
import PageLayout from "@/components/layout/PageLayout";
import { emptyPlayer } from "@/model/player";
import payService, { type SpotsData } from "@/services/pay";
import { formatDateForBackend } from "@/utils/dates";

const Player = () => {
    const [player, setPlayer] = useState(emptyPlayer);
    const [voucher, setVoucher] = useState("");
    const [selectedDate, setSelectedDate] = useState<Date | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isRefundLoading, setIsRefundLoading] = useState(false);
    const [isRefundConfirming, setIsRefundConfirming] = useState(false);
    const refundTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const [spots, setSpots] = useState<SpotsData | null>(null);
    const [isSpotsLoading, setIsSpotsLoading] = useState(false);
    const navigate = useNavigate();

    useEffect(() => {
        if (!selectedDate) {
            setSpots(null);
            return;
        }
        const fetchSpots = async () => {
            setIsSpotsLoading(true);
            try {
                const dateStr = formatDateForBackend(selectedDate);
                const data = await payService.getSpots(dateStr);
                setSpots(data);
            } catch (err) {
                console.error("Failed to fetch spots:", err);
                setSpots(null);
            } finally {
                setIsSpotsLoading(false);
            }
        };
        fetchSpots();
    }, [selectedDate]);

    useEffect(() => {
        return () => {
            if (refundTimeoutRef.current) clearTimeout(refundTimeoutRef.current);
        };
    }, []);

    const handlePlayerChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        event.preventDefault();
        const { id, value } = event.target;
        setPlayer((prev) => ({ ...prev, [id]: value }));
    };

    const isFormComplete =
        !!selectedDate &&
        player.first_name.trim() !== "" &&
        player.last_name.trim() !== "" &&
        player.email.trim() !== "" &&
        player.phone_no.trim() !== "";

    const getMissingFields = (): string[] => {
        const missing: string[] = [];
        if (!selectedDate) missing.push("date");
        if (!player.first_name.trim()) missing.push("first name");
        if (!player.last_name.trim()) missing.push("last name");
        if (!player.email.trim()) missing.push("email");
        if (!player.phone_no.trim()) missing.push("phone number");
        return missing;
    };

    const isFull = spots !== null && spots.remaining === 0;

    const addPlayer = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (!selectedDate) {
            notifications.show({ color: "red", title: "Error", message: "Please select a date first" });
            return;
        }
        setIsLoading(true);
        const dateStr = formatDateForBackend(selectedDate);

        try {
            if (voucher.trim() !== "") {
                console.log("Voucher entered:", voucher);
                const validation = await payService.validateVoucher(
                    player,
                    voucher,
                    dateStr
                );
                console.log("Voucher validation result:", validation);

                if (validation.valid && validation.amount === "0.00") {
                    navigate(`/payment`, {
                        state: {
                            player,
                            voucher,
                            amount: "0.00",
                            selectedDate: selectedDate.toISOString()
                        }
                    });
                } else {
                    notifications.show({
                        color: "red",
                        title: "Invalid voucher",
                        message: validation.message ?? "Voucher is not valid. Proceeding to payment."
                    });
                    navigate(`/payment`, {
                        state: {
                            player,
                            voucher: "",
                            amount: "15.00",
                            selectedDate: selectedDate.toISOString()
                        }
                    });
                }
            } else {
                navigate(`/payment`, {
                    state: {
                        player,
                        voucher: "",
                        amount: "15.00",
                        selectedDate: selectedDate.toISOString()
                    }
                });
            }
        } catch (err) {
            console.error(err);
            notifications.show({ color: "red", title: "Error", message: "An error occurred. Please try again." });
        } finally {
            setIsLoading(false);
        }
    };

    const refund = async () => {
        if (!selectedDate) {
            notifications.show({ color: "red", title: "Error", message: "Please select the date you registered for" });
            return;
        }

        if (!isRefundConfirming) {
            setIsRefundConfirming(true);
            if (refundTimeoutRef.current) clearTimeout(refundTimeoutRef.current);
            refundTimeoutRef.current = setTimeout(() => {
                setIsRefundConfirming(false);
            }, 5000);
            return;
        }

        setIsRefundConfirming(false);
        if (refundTimeoutRef.current) clearTimeout(refundTimeoutRef.current);

        const dateStr = formatDateForBackend(selectedDate);
        setIsRefundLoading(true);
        try {
            const response = await payService.refundPayment(
                player,
                dateStr
            );
            if (!response || response.status === "failed") {
                notifications.show({
                    color: "red",
                    title: "Refund failed",
                    message: response?.message ?? "Refund unsuccessful"
                });
            } else if (response.status === "deleted_no_payment") {
                notifications.show({
                    color: "green",
                    title: "Success",
                    message: "No payment was received, player removed from the list."
                });
            } else if (response.status === "refunded") {
                notifications.show({
                    color: "green",
                    title: "Refund successful",
                    message: "Your refund has been processed."
                });
            }
        } catch (err) {
            console.error(err);
            notifications.show({ color: "red", title: "Error", message: "Refund unsuccessful" });
        } finally {
            setIsRefundLoading(false);
        }
    };

    const missingFields = getMissingFields();

    return (
        <PageLayout>
            <form onSubmit={addPlayer}>
                <Stack gap="lg">
                    <Card withBorder shadow="sm" radius="md" padding="lg">
                        <Title order={4} mb="md">Select a Date</Title>
                        <div style={{ display: "flex", justifyContent: "center" }}>
                            <DatePicker
                                selectedDate={selectedDate}
                                onDateSelect={setSelectedDate}
                            />
                        </div>
                        {isSpotsLoading && (
                            <Text size="sm" c="dimmed" ta="center" mt="md">
                                Checking availability...
                            </Text>
                        )}
                        {spots && !isSpotsLoading && (
                            <Stack gap="xs" mt="md">
                                <Progress
                                    value={(spots.taken / spots.total) * 100}
                                    color={spots.remaining === 0 ? "red" : spots.remaining <= 3 ? "yellow" : "green"}
                                    size="lg"
                                    radius="xl"
                                />
                                <Text size="sm" ta="center" fw={500}>
                                    {spots.taken}/{spots.total} spots filled
                                    {spots.remaining > 0
                                        ? ` — ${spots.remaining} remaining`
                                        : ""}
                                </Text>
                                {isFull && (
                                    <Alert color="orange" variant="light" title="Session Full">
                                        This session is full. You can still register and you will be
                                        added to the waiting list.
                                    </Alert>
                                )}
                            </Stack>
                        )}
                    </Card>

                    <Card withBorder shadow="sm" radius="md" padding="lg">
                        <Title order={4} mb="md">Player Details</Title>
                        <PlayerForm
                            player={player}
                            onPlayerChange={handlePlayerChange}
                        />
                    </Card>

                    <Card withBorder shadow="sm" radius="md" padding="lg">
                        <Title order={4} mb="md">Voucher Code</Title>
                        <Stack>
                            <TextInput
                                label="Enter voucher code (optional)"
                                value={voucher}
                                onChange={(e) => setVoucher(e.currentTarget.value)}
                                placeholder="e.g. FIRSTTIME"
                            />
                            <Button
                                type="submit"
                                fullWidth
                                loading={isLoading}
                                disabled={!isFormComplete}
                                color={isFull ? "orange" : undefined}
                            >
                                {isFull ? "Join Waiting List" : "Continue to Payment"}
                            </Button>
                            {!isFormComplete && missingFields.length > 0 && (
                                <Text size="sm" c="dimmed" ta="center">
                                    Please fill in: {missingFields.join(", ")}
                                </Text>
                            )}
                        </Stack>
                    </Card>
                </Stack>
            </form>

            <Divider my="xl" />

            <Stack align="center" gap="xs">
                <Text size="sm" c="dimmed">
                    Need to cancel your registration?
                </Text>
                <Button
                    variant="outline"
                    onClick={refund}
                    type="button"
                    loading={isRefundLoading}
                    color={isRefundConfirming ? "red" : undefined}
                >
                    {isRefundConfirming ? "Click again to confirm refund" : "Request Refund"}
                </Button>
            </Stack>
        </PageLayout>
    );
};

export default Player;
