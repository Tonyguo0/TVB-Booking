import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import Pay from "./routes/pay.tsx";

const router = createBrowserRouter([
    {
        path: "/",
        element: <App />
    },
    {
        path: "/payment",
        element: <Pay />
    }
]);

ReactDOM.createRoot(document.getElementById("root")!).render(
    <React.StrictMode>
        <RouterProvider router={router} />
    </React.StrictMode>
);
