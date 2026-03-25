import axios from "axios";
import { IPlayer } from "../model/player";

const baseUrl = import.meta.env.VITE_API_BASE_URL || "http://localhost:3000/api";

const createPay = async (newPlayer: IPlayer, token: string, voucher: string, date?: string) => {
    try {
        const body = {
            sourceId: token,
            player: newPlayer,
            voucher: voucher,
            date: date
        };
        const response = await axios.post(`${baseUrl}/createPay`, body);
        return response.data;
    } catch (err) {
        console.error(err);
    }
};

const refundPayment = async (playerToRefund: IPlayer, date?: string) => {
    try {
        const body = { player: playerToRefund, date: date };
        const response = await axios.post(`${baseUrl}/refundPayment`, body);
        return response.data;
    } catch (err) {
        console.error(err);
    }
};

const validateVoucher = async (player: IPlayer, voucher: string, date?: string) => {
    try {
        const body = { player, voucher, date };
        const response = await axios.post(`${baseUrl}/validateVoucher`, body);
        return response.data;
    } catch (err) {
        console.error(err);
        return { valid: false, amount: "15.00" };
    }
};

const registerWithVoucher = async (player: IPlayer, voucher: string, date?: string) => {
    try {
        const body = { player, voucher, date };
        const response = await axios.post(`${baseUrl}/registerWithVoucher`, body);
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
        const response = await axios.get(`${baseUrl}/spots`, {
            params: { date }
        });
        return response.data;
    } catch (err) {
        console.error(err);
        return { total: 0, taken: 0, remaining: 0 };
    }
};

export default { createPay, refundPayment, validateVoucher, registerWithVoucher, getSpots };
