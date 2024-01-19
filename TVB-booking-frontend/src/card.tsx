import Square, { CardFieldNames } from "@square/web-sdk";

const getCardPayment = async () => {
    const SQUARE_APPLICATION_ID: string = import.meta.env.VITE_SB_SQ_APPLICATION_ID;
    const SQUARE_LOCATION_ID: string = import.meta.env.VITE_SB_SQ_LOCATION_ID;
    const payments: Square.Payments | null = await Square.payments(SQUARE_APPLICATION_ID, SQUARE_LOCATION_ID, { scriptSrc: "https://sandbox.web.squarecdn.com/v1/square.js" });
    const card: Square.Card | undefined = await payments?.card();
    console.log(card);
    return card;
};
const cardPayment = () => {
    getCardPayment().then(card =>{
        
    })
    return (
        <>
            <body>
                <div id="payment-form">
                    <div id="payment-status-container"></div>
                    <div id="card-container"></div>
                    <button id="card-button" type="button">
                        Pay
                    </button>
                </div>
            </body>
        </>
    );
};

export default cardPayment;
