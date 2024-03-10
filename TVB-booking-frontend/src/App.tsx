import { RouterProvider, createBrowserRouter } from "react-router-dom";
import "./App.scss";
import Pay from "./routes/pay";
import Player from "./routes/player";

const App = () => {
    const router = createBrowserRouter([
        { path: "/", element: <Player /> },
        {
            path: "/payment",
            element: <Pay />
        }
    ]);
    // console.log("application ID", process.env.SQ_APPLICATION_ID)
    return <RouterProvider router={router} />;
};

export default App;
