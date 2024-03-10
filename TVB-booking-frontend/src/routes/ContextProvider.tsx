import { createContext, useState } from "react";
import { Route, Routes } from "react-router-dom";
import { emptyPlayer } from "../model/player";
import Pay from "./pay";
import Player from "./player";

// eslint-disable-next-line react-refresh/only-export-components
export const playerContext = createContext({});

// const Headers = () => {};

const Outlet = () => {
    return (
        <Routes>
            <Route path="/*" element={<Player />} />
            <Route path="payment" element={<Pay />} />
        </Routes>
    );
};

export const ContextProvider = () => {
    const [player, setPlayer] = useState(emptyPlayer);

    return (
        <playerContext.Provider value={{ player, setPlayer }}>
            <Outlet />
        </playerContext.Provider>
    );
};
