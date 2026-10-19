const path = require("node:path");

const base = require("../../ui-spec/impl/react/tailwind.config.cjs");
const root = __dirname;

module.exports = {
  ...base,
  content: [
    path.join(root, "index.html"),
    path.join(root, "src/**/*.{js,jsx,ts,tsx}"),
    path.join(root, "../../client/**/*.{js,jsx,ts,tsx}"),
    path.join(root, "../../ui-spec/impl/react/**/*.{ts,tsx}"),
  ],
};
