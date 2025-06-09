import {
  createBrowserRouter,
  RouterProvider,
  createHashRouter,
} from "react-router";
import ReactDOM from "react-dom/client";
import Root from "./page/root";
import AuthPage from "./page/auth";
import ProfilePage from "./page/profile";
const router = createBrowserRouter([
  {
    path: "/",
    element: <Root />,
  },
  { path: "hello", element: <h1>Hello</h1> },
  { path: "auth", Component: AuthPage },
  { path: "profile", Component: ProfilePage },
]);

const root = document.getElementById("root");

ReactDOM.createRoot(root!).render(<RouterProvider router={router} />);
