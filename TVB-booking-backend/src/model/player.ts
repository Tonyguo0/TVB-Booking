export type IPlayer = {
    first_name: string;
    last_name: string;
    email: string;
    phone_no: string;
};

export type ICreatePay = {
    sourceId: string;
};

export const emptyPlayer: IPlayer = {
    first_name: "",
    last_name: "",
    email: "",
    phone_no: ""
};
