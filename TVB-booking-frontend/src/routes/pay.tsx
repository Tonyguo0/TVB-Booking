import { useLocation, useNavigate } from "react-router-dom";
// TODO: do something about this erro
import { Afterpay, CreditCard, Divider, GooglePay, PaymentForm, BuyerType } from "react-square-web-payments-sdk";

import { IPlayer, emptyPlayer } from "../model/player";
import payService from "../services/pay";

const Pay = () => {
    const { state } = useLocation();
    let player: IPlayer = emptyPlayer;

    const SQUARE_APPLICATION_ID: string = import.meta.env.VITE_SB_SQ_APPLICATION_ID;
    const SQUARE_LOCATION_ID: string = import.meta.env.VITE_SB_SQ_LOCATION_ID;
    const navigate = useNavigate();
    if (state.player != null) {
        player = state.player;
        console.log(player);
    }
    return (
        <>
            <PaymentForm
                /**
                 * Identifies the calling form with a verified application ID generated from
                 * the Square Application Dashboard.
                 */
                applicationId={SQUARE_APPLICATION_ID}
                locationId={SQUARE_LOCATION_ID}
                /**
                 * Invoked when payment form receives the result of a tokenize generation
                 * request. The result will be a valid credit card or wallet token, or an error.
                 */

                cardTokenizeResponseReceived={async (token: {token: string}, buyer: BuyerType) => {
                    console.info({ token, buyer });
                    try {
                        const response = await payService.createPay(player, token.token);
                        console.log(response);
                        if (response === false) {
                            alert(`player has already registered in TVB!`);
                            navigate(`/`);
                        }
                        if (response?.result?.payment.status === `COMPLETED`) {
                            alert(`payment successful`);
                            navigate(`/`);
                        }
                    } catch (err) {
                        console.error(err);
                        alert(`payment unsuccessful`);
                    }
                }}
                createPaymentRequest={() => {
                    return {
                        countryCode: "AU",
                        currencyCode: "AUD",
                        total: {
                            amount: "1.00",
                            label: "Total"
                        }
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
            >
                <CreditCard includeInputLabels postalCode="12345" callbacks />

                <Divider />
                <GooglePay />
                <Divider />
                <Afterpay />
                <label htmlFor="voucher">Voucher:</label>
                <input id="voucher" type="text" />
            </PaymentForm>
        </>
    );
};

export default Pay;
