import { createRequire } from "module";

const require = createRequire(import.meta.url);

const nextConfigs = require("eslint-config-next/core-web-vitals");

/** @type {import("eslint").Linter.Config[]} */
const eslintConfig = [
  ...nextConfigs,
  {
    rules: {
      // Stricter defaults in eslint-plugin-react-hooks v7; allow gradual cleanup.
      "react-hooks/set-state-in-effect": "off",
      "react-hooks/refs": "off",
    },
  },
];

export default eslintConfig;
