import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { notifications } from "@mantine/notifications";
import { Button, Card, LoadingOverlay, Title, Text, Stack } from "@mantine/core";
import { ArrowLeft } from "lucide-react";
import { TokenResult } from "@square/web-sdk";
import {
    Afterpay,
    CreditCard,
    GooglePay,
    PaymentForm
} from "react-square-web-payments-sdk";
import OrderSummary from "@/components/OrderSummary";
import PaymentMethodSelector, {
    type PaymentMethod
} from "@/components/PaymentMethodSelector";
import PageLayout from "@/components/layout/PageLayout";
import { IPlayer } from "@/model/player";
import payService, { type PayResponse } from "@/services/pay";
import { formatDateForBackend } from "@/utils/dates";

const Pay = () => {
    const { state } = useLocation();
    const navigate = useNavigate();
    const [paymentMethod, setPaymentMethod] =
        useState<PaymentMethod>(`credit-card`);
    const [mountedMethods, setMountedMethods] = useState<Set<PaymentMethod>>(
        () => new Set([`credit-card`])
    );
    const [isConfirming, setIsConfirming] = useState<boolean>(false);
    const [isProcessing, setIsProcessing] = useState<boolean>(false);

    const handlePaymentMethodChange = (method: PaymentMethod): void => {
        setPaymentMethod(method);
        setMountedMethods((prev) => {
            if (prev.has(method)) return prev;
            return new Set([...prev, method]);
        });
    };

    if (!state || !state.player || !state.selectedDate) {
        notifications.show({
            color: `red`,
            title: `Missing booking details`,
            message: `Please fill in your details and select a date before proceeding to payment.`
        });
        navigate(`/`);
        return null;
    }

    const player: IPlayer = state.player;
    const amount: string = state.amount ?? import.meta.env.VITE_PRICE_AMOUNT;
    const voucher: string = state.voucher ?? ``;
    const selectedDate: Date = new Date(state.selectedDate);
    const dateStr: string = formatDateForBackend(selectedDate);
    const isVoucherBooking: boolean = amount === `0.00`;
    const SQUARE_APPLICATION_ID: string =
        import.meta.env.VITE_SB_SQ_APPLICATION_ID;
    const SQUARE_LOCATION_ID: string =
        import.meta.env.VITE_SB_SQ_LOCATION_ID;

    console.log(`Payment page - amount:`, amount, `date:`, dateStr, `voucher:`, voucher);

    const handleCreatePaymentRequest = () => ({
        countryCode: import.meta.env.VITE_COUNTRY_CODE,
        currencyCode: import.meta.env.VITE_CURRENCY_CODE,
        total: {
            amount: amount,
            label: `Total`
        }
    });

    const handleTokenResult = async (token: TokenResult): Promise<void> => {
        if (token.status !== `OK`) {
            notifications.show({ color: `red`, title: `Error`, message: `Card tokenization failed. Please try again.` });
            return;
        }
        setIsProcessing(true);
        try {
            const response: PayResponse | undefined = await payService.createPay(
                player,
                token.token,
                voucher,
                dateStr
            );
            if (!response || response.status === `failed`) {
                notifications.show({ color: `red`, title: `Payment failed`, message: response?.message ?? `Payment unsuccessful` });
            } else if (response.status === `already_registered`) {
                notifications.show({ color: `red`, title: `Already registered`, message: `Player has already registered for TVB this week!` });
            } else if (response.status === `waiting_list`) {
                notifications.show({ color: `blue`, title: `Waiting list`, message: `Player added to the waiting list!` });
            } else if (response.status === `voucher_applied`) {
                notifications.show({ color: `green`, title: `Success`, message: `Voucher applied! No payment required.` });
            } else if (response.status === `paid`) {
                notifications.show({ color: `green`, title: `Payment successful`, message: `Your payment has been processed.` });
            }
            navigate(`/`);
        } catch (err) {
            console.error(err);
            notifications.show({ color: `red`, title: `Error`, message: `Payment unsuccessful` });
            navigate(`/`);
        } finally {
            setIsProcessing(false);
        }
    };

    const handleConfirmVoucherBooking = async (): Promise<void> => {
        setIsConfirming(true);
        try {
            const response: PayResponse | undefined = await payService.registerWithVoucher(
                player,
                voucher,
                dateStr
            );
            console.log(`Register with voucher response:`, response);

            if (!response || response.status === `failed`) {
                notifications.show({ color: `red`, title: `Error`, message: response?.message ?? `Registration failed` });
            } else if (response.status === `already_registered`) {
                notifications.show({ color: `red`, title: `Already registered`, message: `Player has already registered for this week!` });
            } else if (response.status === `voucher_applied`) {
                notifications.show({ color: `green`, title: `Success`, message: `Voucher applied! You are registered — no payment required.` });
            } else if (response.status === `waiting_list`) {
                notifications.show({ color: `blue`, title: `Waiting list`, message: `Player added to the waiting list!` });
            }
            navigate(`/`);
        } catch (err) {
            console.error(err);
            notifications.show({ color: `red`, title: `Error`, message: `An error occurred. Please try again.` });
        } finally {
            setIsConfirming(false);
        }
    };

    return (
        <PageLayout>
            <Stack gap="lg">
                <Button
                    variant="subtle"
                    onClick={() => navigate(`/`)}
                    leftSection={<ArrowLeft size={16} />}
                    style={{ alignSelf: `flex-start` }}
                    disabled={isProcessing || isConfirming}
                >
                    Back
                </Button>

                <OrderSummary
                    player={player}
                    selectedDate={selectedDate}
                    amount={amount}
                />

                {isVoucherBooking ? (
                    <Card withBorder shadow="sm" radius="md" padding="lg">
                        <Title order={4} mb="md">Confirm Booking</Title>
                        <Stack>
                            <Text size="sm" c="dimmed">
                                Your voucher covers the full amount. No payment
                                is required — just confirm your booking below.
                            </Text>
                            <Button
                                fullWidth
                                onClick={handleConfirmVoucherBooking}
                                loading={isConfirming}
                            >
                                Confirm Booking
                            </Button>
                        </Stack>
                    </Card>
                ) : (
                    <>
                        <Card withBorder shadow="sm" radius="md" padding="lg">
                            <Title order={4} mb="md">Payment Method</Title>
                            <PaymentMethodSelector
                                selected={paymentMethod}
                                onSelect={handlePaymentMethodChange}
                            />
                        </Card>

                        <Card withBorder shadow="sm" radius="md" padding="lg" pos="relative">
                            <LoadingOverlay visible={isProcessing} zIndex={1000} overlayProps={{ radius: `sm`, blur: 2 }} />
                            <PaymentForm
                                applicationId={SQUARE_APPLICATION_ID}
                                locationId={SQUARE_LOCATION_ID}
                                cardTokenizeResponseReceived={
                                    handleTokenResult
                                }
                                createPaymentRequest={
                                    handleCreatePaymentRequest
                                }
                            >
                                <div style={{ display: paymentMethod === `credit-card` ? `block` : `none` }}>
                                    <CreditCard includeInputLabels />
                                </div>
                                {mountedMethods.has(`google-pay`) && (
                                    <div style={{ display: paymentMethod === `google-pay` ? `block` : `none` }}>
                                        <GooglePay />
                                    </div>
                                )}
                                {mountedMethods.has(`afterpay`) && (
                                    <div style={{ display: paymentMethod === `afterpay` ? `block` : `none` }}>
                                        <Afterpay />
                                    </div>
                                )}
                            </PaymentForm>
                        </Card>
                    </>
                )}
            </Stack>
        </PageLayout>
    );
};

export default Pay;
