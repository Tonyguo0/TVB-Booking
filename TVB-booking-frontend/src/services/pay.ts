import axios from "axios";
const baseUrl = "http://localhost:3000/api";

const createPay = async (token) => {
    try {
        const body = {
            sourceId: token.token
        };
        console.log(JSON.stringify(body));
        const response = await axios.post(`${baseUrl}/createPay`, body);
        console.log(JSON.stringify(response.data, null, 6));
    } catch (err) {
        console.log(err);
    }
};

export default createPay;
