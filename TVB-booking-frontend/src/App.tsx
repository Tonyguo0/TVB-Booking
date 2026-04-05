import { RouterProvider, createHashRouter } from "react-router-dom";
import Pay from "./routes/pay";
import Player from "./routes/player";

const router = createHashRouter([
    { path: "/", element: <Player /> },
    { path: "/payment", element: <Pay /> }
]);

const App = () => {
    return <RouterProvider router={router} />;
};

export default App;
