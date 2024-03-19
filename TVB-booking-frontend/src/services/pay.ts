import axios from "axios";
import { IPlayer } from "../model/player";
const baseUrl = "http://localhost:3000/api";

const createPay = async (newPlayer: IPlayer, token: { token: string; }) => {
    try {
        const body = {
            sourceId: token.token,
            player: newPlayer
        };
        console.log(JSON.stringify(body, null, 6));
        const response = await axios.post(`${baseUrl}/createPay`, body);
        // console.log(JSON.stringify(response.data, null, 6));
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

export default { createPay, createPayLink };
