import React, { useState } from "react";
import "./App.scss";
import { emptyPlayer } from "./model/player";
import create from "./services/player";
import { CreditCard, PaymentForm, Divider, GiftCard, GooglePay, Afterpay} from "react-square-web-payments-sdk";
import useScript from "./services/useScript";
import cardPayment from "./card";
import { payments } from "@square/web-sdk";

const App = () => {
    const SQUARE_APPLICATION_ID: string = import.meta.env.VITE_SB_SQ_APPLICATION_ID;
    const SQUARE_LOCATION_ID: string = import.meta.env.VITE_SB_SQ_LOCATION_ID;
    const [player, setPlayer] = useState(emptyPlayer);
    useScript("https://sandbox.web.squarecdn.com/v1/square.js");

    const addPlayer = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        console.log("Pay submitted", event.target);
        create(player);
        setPlayer(emptyPlayer);
    };

    const handlePlayerChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const { id, value } = event.target;
        setPlayer((previousPlayer) => ({
            ...previousPlayer,
            [id]: value
        }));
    };
    // console.log("application ID", process.env.SQ_APPLICATION_ID)
    return (
        <>
            <div className="Container text-center">
                <form action="submit" onSubmit={addPlayer}>
                    <div className="row justify-content-center">
                        <div className="col-sm-4">
                            <label htmlFor="first_name">First Name:</label>
                            <input id="first_name" type="text" value={player.first_name} onChange={handlePlayerChange} />
                        </div>
                    </div>

                    <div className="row justify-content-center">
                        <div className="col-sm-4">
                            <label htmlFor="last_name">Last Name:</label>
                            <input id="last_name" type="text" value={player.last_name} onChange={handlePlayerChange} />
                        </div>
                    </div>
                    <div className="row justify-content-center">
                        <div className="col-sm-4">
                            <label htmlFor="email">Email:</label>
                            <input id="email" type="text" value={player.email} onChange={handlePlayerChange} />
                        </div>
                    </div>
                    <div className="row justify-content-center">
                        <div className="col-sm-4">
                            <label htmlFor="phone_no">Phone Number:</label>
                            <input id="phone_no" type="text" value={player.phone_no} onChange={handlePlayerChange} />
                        </div>
                    </div>
                    <div className="row justify-content-center">
                        <div className="col-sm-4">
                            <button className="btn btn-primary" type="submit">
                                Pay
                            </button>
                        </div>
                    </div>
                    <div className="row justify-content-center">
                        <div className="col-sm-4"></div>
                    </div>
                </form>
            </div>

            <PaymentForm
                /**
                 * Identifies the calling form with a verified application ID generated from
                 * the Square Application Dashboard.
                 */
                applicationId={SQUARE_APPLICATION_ID}
                /**
                 * Invoked when payment form receives the result of a tokenize generation
                 * request. The result will be a valid credit card or wallet token, or an error.
                 */
                cardTokenizeResponseReceived={(token, buyer) => {
                    console.info({ token, buyer });
                }}
                createPaymentRequest={()=>{
                    return {
                        countryCode: 'AU',
                        currencyCode: 'AUD',
                        total: {
                          amount: '1.00',
                          label: 'Total',
                        },
                      };
                }}
                /**
                 * This function enable the Strong Customer Authentication (SCA) flow
                 *
                 * We strongly recommend use this function to verify the buyer and reduce
                 * the chance of fraudulent transactions.
                 */
                // createVerificationDetails={() => ({
                //     amount: "1.00",
                //     /* collected from the buyer */
                //     billingContact: {
                //         addressLines: ["123 Main Street", "Apartment 1"],
                //         familyName: "Doe",
                //         givenName: "John",
                //         countryCode: "GB",
                //         city: "London"
                //     },
                //     currencyCode: "GBP",
                //     intent: "CHARGE"
                // })}
                /**
                 * Identifies the location of the merchant that is taking the payment.
                 * Obtained from the Square Application Dashboard - Locations tab.
                 */
                locationId={SQUARE_LOCATION_ID}
            >
                <label htmlFor="voucher">Voucher:</label>
                <input id="voucher" type="text" />
                <CreditCard
                    includeInputLabels
                    postalCode="12345"
                />
                
                <Divider/>
                <GooglePay/>
                <Divider/>
                <Afterpay/>
               

            </PaymentForm>
        </>
    );
};

export default App;
