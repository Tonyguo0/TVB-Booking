import React, { useState } from "react";
import "./App.scss";

interface IPlayer {
    first_name: string;
    last_name: string;
    email: string;
    phone_no: string;
}

const Player: IPlayer = {
    first_name: "",
    last_name: "",
    email: "",
    phone_no: ""
};

const App = () => {
    const [player, setPlayer] = useState(Player);

    const addPlayer = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        console.log("Pay submitted", event.target);
        setPlayer(Player)
    };

    const handlePlayerChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        console.log("Player changed", event.target.value);
        const { id, value } = event.target;
        setPlayer((previousPlayer) => ({
            ...previousPlayer,
            [id]: value
        }));
    };

    return (
        <>
            <div className="Container text-center">
                <form action="submit" onSubmit={addPlayer}>
                    <div className="row justify-content-center">
                        <div className="col-sm-4">
                            <label htmlFor="first_name">First Name:</label>
                            <input
                                id="first_name"
                                type="text"
                                value={player.first_name}
                                onChange={handlePlayerChange}
                            />
                        </div>
                    </div>

                    <div className="row justify-content-center">
                        <div className="col-sm-4">
                            <label htmlFor="last_name">Last Name:</label>
                            <input
                                id="last_name"
                                type="text"
                                value={player.last_name}
                                onChange={handlePlayerChange}
                            />
                        </div>
                    </div>
                    <div className="row justify-content-center">
                        <div className="col-sm-4">
                            <label htmlFor="email">Email:</label>
                            <input
                                id="email"
                                type="text"
                                value={player.email}
                                onChange={handlePlayerChange}
                            />
                        </div>
                    </div>
                    <div className="row justify-content-center">
                        <div className="col-sm-4">
                            <label htmlFor="phone_no">Phone Number:</label>
                            <input
                                id="phone_no"
                                type="text"
                                value={player.phone_no}
                                onChange={handlePlayerChange}
                            />
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
        </>
    );
};

export default App;
