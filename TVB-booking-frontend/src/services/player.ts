import axios from "axios";
const baseUrl = "http://localhost:3000/player";
import { IPlayer } from "../model/player";

const create = (newPlayer: IPlayer) => {
    return axios.post(baseUrl, newPlayer);
};

export default create;
