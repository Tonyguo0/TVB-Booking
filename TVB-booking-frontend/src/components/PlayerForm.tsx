import { TextInput, Stack, Select } from "@mantine/core";
import { type ChangeEvent } from "react";
import { IPlayer, type NotificationPreference } from "@/model/player";

interface PlayerFormProps {
    player: IPlayer;
    onPlayerChange: (event: ChangeEvent<HTMLInputElement>) => void;
    notificationPreference: NotificationPreference | undefined;
    onNotificationPreferenceChange: (value: NotificationPreference | undefined) => void;
}

const PlayerForm = ({ player, onPlayerChange, notificationPreference, onNotificationPreferenceChange }: PlayerFormProps) => {
    return (
        <Stack>
            <TextInput
                id="first_name"
                label="First Name"
                required
                value={player.first_name}
                onChange={onPlayerChange}
                placeholder="Enter your first name"
            />
            <TextInput
                id="last_name"
                label="Last Name"
                required
                value={player.last_name}
                onChange={onPlayerChange}
                placeholder="Enter your last name"
            />
            <TextInput
                id="email"
                label="Email"
                type="email"
                required
                value={player.email}
                onChange={onPlayerChange}
                placeholder="your@email.com"
            />
            <TextInput
                id="phone_no"
                label="Phone Number"
                type="tel"
                required
                value={player.phone_no}
                onChange={onPlayerChange}
                placeholder="04XX XXX XXX"
            />
            <Select
                label="Waiting list notification preference"
                description="How should we notify you if a spot opens up?"
                placeholder="Select preference"
                data={[
                    { value: `email`, label: `Email` },
                    { value: `sms`, label: `SMS` },
                    { value: `both`, label: `Both Email & SMS` }
                ]}
                value={notificationPreference ?? null}
                onChange={(value) => onNotificationPreferenceChange(value as NotificationPreference | undefined)}
                clearable
            />
        </Stack>
    );
};

export default PlayerForm;
