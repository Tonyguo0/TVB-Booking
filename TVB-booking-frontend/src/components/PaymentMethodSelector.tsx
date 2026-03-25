import { Radio, Stack } from "@mantine/core";

export type PaymentMethod = "credit-card" | "google-pay" | "afterpay";

interface PaymentMethodSelectorProps {
    selected: PaymentMethod;
    onSelect: (method: PaymentMethod) => void;
}

const PaymentMethodSelector = ({
    selected,
    onSelect
}: PaymentMethodSelectorProps) => {
    return (
        <Radio.Group
            value={selected}
            onChange={(value) => onSelect(value as PaymentMethod)}
        >
            <Stack gap="sm">
                <Radio value="credit-card" label="Credit / Debit Card" />
                <Radio value="google-pay" label="Google Pay" />
                <Radio value="afterpay" label="Afterpay" />
            </Stack>
        </Radio.Group>
    );
};

export default PaymentMethodSelector;
