import { TextInput, Stack } from "@mantine/core";
import { IPlayer } from "@/model/player";

interface PlayerFormProps {
    player: IPlayer;
    onPlayerChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
}

const PlayerForm = ({ player, onPlayerChange }: PlayerFormProps) => {
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
        </Stack>
    );
};

export default PlayerForm;
