import axios from "axios";
const baseUrl = "http://localhost:3000/api";
import { IPlayer } from "../model/player";

const create = (newPlayer: IPlayer) => {
    return axios.post(`${baseUrl}/player`, newPlayer);
};

export default create;
