import boundaries from "eslint-plugin-boundaries";

export const eslintBoundariesConfig = {
  plugins: {
    boundaries,
  },
  settings: {
    "import/resolver": {
      typescript: {
        alwaysTryTypes: true,
      },
    },

    "boundaries/elements": [
      {
        type: "app",
        pattern: "./src/app",
      },
      {
        type: "features",
        pattern: "./src/features/*",
      },
      {
        type: "shared",
        pattern: "./src/shared",
      },
    ],
  },
  rules: {
    "boundaries/dependencies": [
      2,
      {
        default: "disallow",
        policies: [
          {
            from: { element: { type: "shared" } },
            allow: {
              to: { element: { type: "shared" } },
            },
          },
          {
            from: { element: { type: "features" } },
            allow: {
              to: { element: { type: "shared" } },
            },
          },
          {
            from: { element: { type: "features" } },
            allow: {
              to: {
                element: {
                  type: "features",
                  fileInternalPath: ["index.(ts|tsx)", "*.page.tsx"],
                },
              },
            },
          },
          {
            from: { element: { type: "app" } },
            allow: {
              to: { element: { type: "shared" } },
            },
          },
          {
            from: { element: { type: "app" } },
            allow: {
              to: {
                element: {
                  type: "features",
                  fileInternalPath: ["index.(ts|tsx)", "*.page.tsx"],
                },
              },
            },
          },
        ],
      },
    ],
  },
};
