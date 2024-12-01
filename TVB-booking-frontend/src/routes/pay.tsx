import { useLocation, useNavigate } from "react-router-dom";
// https://www.npmjs.com/package/react-square-web-payments-sdk-fixed
import { Afterpay, CreditCard, Divider, GooglePay, PaymentForm } from "react-square-web-payments-sdk-fixed";
// import { Afterpay, BuyerType, CreditCard, Divider, GooglePay, PaymentForm } from "react-square-web-payments-sdk";

import { TokenResult, VerifyBuyerResponseDetails } from "@square/web-sdk";
import { useEffect, useState } from "react";
import { IPlayer, emptyPlayer } from "../model/player";
import payService from "../services/pay";



const Pay = () => {
    const { state } = useLocation();
    let player: IPlayer = emptyPlayer;
    const [voucher, setVoucher] = useState("");
    const [amount, setAmount] = useState("15.00");
    useEffect(() => {
        if (voucher == `FIRSTTIMETVB`) {
            setAmount("0.00");
        } else{
            setAmount("15.00");
        }
    }, [voucher]);

    const handleChangeVoucher = async (event: React.FormEvent<HTMLInputElement>) => {
        event.preventDefault();
        console.log("voucher change", event.currentTarget.value);
        const value = event.currentTarget.value;
        console.log(value);
        setVoucher(value);
       
        console.log(amount)
    };

    const handleCreatePaymentRequest= () => {
        console.log(`amount in ${amount}`);
        return {
            countryCode: "AU",
            currencyCode: "AUD",
            total: {
                // TODO: figure out how to dynamically set this amount
                amount: amount,
                label: "Total"
            },
            discounts: [
                {
                    amount:  "0.00",
                    label: "First Time TVB"
                }
            ]
        };
    }

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

                cardTokenizeResponseReceived={async (token: TokenResult, buyer: VerifyBuyerResponseDetails | null | undefined) => {
                    console.info({ token, buyer });
                    try {
                        const response = await payService.createPay(player, token.token!, voucher);
                        console.log(response);
                        switch (response) {
                            case 0:
                                alert(`payment wasn't required with the discount you're not on the list!`);
                                navigate(`/`);
                                break;
                            case true:
                                alert(`player is on the waiting list!`);
                                navigate(`/`);
                                break;
                            case false:
                                alert(`player has already registered in TVB!`);
                                navigate(`/`);
                                break;
                            case undefined:
                                alert(`payment unsuccessful`);
                                navigate(`/`);
                                break;
                            default:
                                if (response.result.payment.status === `COMPLETED`) {
                                    alert(`payment successful`);
                                    navigate(`/`);
                                    break;
                                }
                        }
                    } catch (err) {
                        console.error(err);
                        alert(`payment unsuccessful`);
                    }
                }}
                createPaymentRequest={handleCreatePaymentRequest}
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
                {/* figure out how to show the payment amount */}
                <CreditCard includeInputLabels postalCode="12345" />

                <Divider />
                <GooglePay />
                <Divider />
                <Afterpay />
                <label htmlFor="voucher">Voucher:</label>
                <input id="voucher" type="text" value={voucher} onChange={handleChangeVoucher} />
            </PaymentForm>
        </>
    );
};

export default Pay;
