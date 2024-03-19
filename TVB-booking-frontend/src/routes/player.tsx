import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { emptyPlayer } from "../model/player";

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
        const { id, value } = event.target;
        setPlayer((previousPlayer) => ({
            ...previousPlayer,
            [id]: value
        }));
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
        </div>
    );
};

export default Player;
