import ReactDOM from "react-dom/client";
import {
  createBrowserRouter,
  RouterProvider
} from "react-router";
import AuthPage from "./pages/auth";
import ProfilePage from "./pages/profile";
import Root from "./pages/root";
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
