import { ROUTES } from "../shared/model/routes.ts";
import { createBrowserRouter, redirect } from "react-router-dom";
import { App } from "./app";

export const router = createBrowserRouter([
  {
    element: <App />,
    children: [
      {
        path: ROUTES.RSS_LIST,
        lazy: () => import("@/features/rss-list/rss-list.page"),
      },
      {
        path: ROUTES.SETTINGS,
        lazy: () => import("@/features/settings/settings.page"),
      },
      {
        path: ROUTES.HOME,
        loader: () => redirect(ROUTES.RSS_LIST),
      },
    ],
  },
]);
