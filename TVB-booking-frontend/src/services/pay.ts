import axios, { AxiosResponse } from "axios";
import { IPlayer } from "../model/player";
const baseUrl = "http://localhost:3000/api";

const createPay = async (newPlayer: IPlayer, token: string) => {
    try {
        const body = {
            sourceId: token,
            player: newPlayer
        };
        console.log(JSON.stringify(body, null, 6));
        const response = await axios.post(`${baseUrl}/createPay`, body);
        // console.log(JSON.stringify(response.data, null, 6));
        console.log(response.data);
        return response.data;
    } catch (err) {
        console.log(err);
    }
};

const createPayLink = async (newPlayer: IPlayer) => {
    try {
        const body: { player: IPlayer } = {
            player: newPlayer
        };
        const response = await axios.post(`${baseUrl}/createPayLink`, body);
        return response.data;
    } catch (err) {
        console.log(err);
    }
};

// TODO: WIP
const refundPayment = async (playerToRefund: IPlayer) => {
    try {
        const body: { player: IPlayer } = { player: playerToRefund };
        console.log(body);
        const response: AxiosResponse = await axios.post(`${baseUrl}/refundPayment`, body);
        
        return response.data;
    } catch (err) {
        console.log(err);
    }
};

export default { createPay, createPayLink, refundPayment };
