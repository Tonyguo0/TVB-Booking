import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { emptyPlayer } from "../model/player";
import payService from "../services/pay";

const Player = () => {
    const [player, setPlayer] = useState(emptyPlayer);

    const navigate = useNavigate();
    // useScript("https://sandbox.web.squarecdn.com/v1/square.js");

    const addPlayer = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        console.log("Pay submitted", event.target);
        console.log(player);
        setPlayer(emptyPlayer);
        navigate(`/payment`, { state: { player } });
    };

    const handlePlayerChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        event.preventDefault();
        const { id, value } = event.target;
        setPlayer((previousPlayer) => ({
            ...previousPlayer,
            [id]: value
        }));
    };

    // TODO: WIP
    const refund = async (event: React.FormEvent<HTMLButtonElement>) => {
        event.preventDefault();
        if (confirm("Are you sure you want to refund? please double check the details before proceeding")) {
            try {
                console.log(player)
                const response = await payService.refundPayment(player);
                console.log(response);
                if(response===true){
                    alert("No payment was received player deleted from the list");

                } else if(!response || response.statusCode !== 200){
                    // TODO click refund and test it!!!!!!!!!
                    throw new Error("Refund unsuccessful");
                } else{
                    alert("Refund successful");
                }
            } catch (err) {
                console.log(err);
                alert("Refund unsuccessful caught error");
            }
        } else {
            alert("you have cancelled the refund request");
        }
    };

    return (
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
            <br></br>
            <button className="btn btn-primary" onClick={refund}>
                Refund{" "}
            </button>
        </div>
    );
};

export default Player;
