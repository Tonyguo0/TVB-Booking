import axios, { AxiosResponse } from "axios";
import { IPlayer, type NotificationPreference } from "../model/player";

export interface PayResponse {
    status: `paid` | `voucher_applied` | `waiting_list` | `already_registered` | `failed`;
    paymentId?: string;
    message?: string;
}

export interface RefundResponse {
    status: `refunded` | `deleted_no_payment` | `failed`;
    message?: string;
}

export interface VoucherValidationResponse {
    valid: boolean;
    amount: string;
    message?: string;
}

const baseUrl: string = import.meta.env.VITE_API_BASE_URL || `http://localhost:3000/api`;

const createPay = async (newPlayer: IPlayer, token: string, voucher: string, date?: string, notificationPreference?: NotificationPreference): Promise<PayResponse | undefined> => {
    try {
        const body: { sourceId: string; player: IPlayer; voucher: string; date?: string; notification_preference?: NotificationPreference } = {
            sourceId: token,
            player: newPlayer,
            voucher: voucher,
            date: date,
            notification_preference: notificationPreference
        };
        const response: AxiosResponse<PayResponse> = await axios.post(`${baseUrl}/createPay`, body);
        return response.data;
    } catch (err) {
        console.error(err);
    }
};

const refundPayment = async (playerToRefund: IPlayer, date?: string): Promise<RefundResponse | undefined> => {
    try {
        const body: { player: IPlayer; date?: string } = { player: playerToRefund, date: date };
        const response: AxiosResponse<RefundResponse> = await axios.post(`${baseUrl}/refundPayment`, body);
        return response.data;
    } catch (err) {
        console.error(err);
    }
};

const validateVoucher = async (player: IPlayer, voucher: string, date?: string): Promise<VoucherValidationResponse> => {
    try {
        const body: { player: IPlayer; voucher: string; date?: string } = { player, voucher, date };
        const response: AxiosResponse<VoucherValidationResponse> = await axios.post(`${baseUrl}/validateVoucher`, body);
        return response.data;
    } catch (err) {
        console.error(err);
        return { valid: false, amount: import.meta.env.VITE_PRICE_AMOUNT };
    }
};

const registerWithVoucher = async (player: IPlayer, voucher: string, date?: string, notificationPreference?: NotificationPreference): Promise<PayResponse | undefined> => {
    try {
        const body: { player: IPlayer; voucher: string; date?: string; notification_preference?: NotificationPreference } = { player, voucher, date, notification_preference: notificationPreference };
        const response: AxiosResponse<PayResponse> = await axios.post(`${baseUrl}/registerWithVoucher`, body);
        return response.data;
    } catch (err) {
        console.error(err);
    }
};

export interface SpotsData {
    total: number;
    taken: number;
    remaining: number;
}

const getSpots = async (date: string): Promise<SpotsData> => {
    try {
        const response: AxiosResponse<SpotsData> = await axios.get(`${baseUrl}/spots`, {
            params: { date }
        });
        return response.data;
    } catch (err) {
        console.error(err);
        return { total: 0, taken: 0, remaining: 0 };
    }
};

const checkRegistration = async (player: IPlayer, date?: string): Promise<boolean> => {
    try {
        const response: AxiosResponse<{ registered: boolean }> = await axios.post(`${baseUrl}/checkRegistration`, { player, date });
        return response.data.registered;
    } catch (err) {
        console.error(err);
        return false;
    }
};

export default { createPay, refundPayment, validateVoucher, registerWithVoucher, getSpots, checkRegistration };
