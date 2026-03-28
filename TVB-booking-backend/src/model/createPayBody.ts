import { IPlayer } from "./player";

export type NotificationPreference = `email` | `sms` | `both`;

export interface IcreatePaybody {
    sourceId: string;
    player: IPlayer;
    voucher: string;
    date?: string;
    notification_preference?: NotificationPreference;
}
