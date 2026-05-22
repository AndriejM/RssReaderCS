import "react-router-dom";

export const ROUTES = {
  HOME: "/",
  BOARDS: "/boards",
  BOARD: "/boards/:boardId",
  RSS_LIST: "/rss-list",
  SETTINGS: "/settings",
} as const;

export type PathParams = {
  [ROUTES.BOARD]: {
    boardId: string;
  };
};

declare module "react-router-dom" {
  interface Register {
    params: PathParams;
  }
}
