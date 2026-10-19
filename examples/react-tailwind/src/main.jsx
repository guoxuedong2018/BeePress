import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import App from "./App.jsx";
import { router } from "./router";
import "./styles.css";

const container = document.getElementById("root");
const root = createRoot(container);

function render(app) {
  root.render(<StrictMode>{app}</StrictMode>);
}

if (import.meta.env.DEV) {
  // Dev-only integration: production builds contain no Bee Press code.
  import("builder-kit/react").then(({ BuilderKitRoot }) => {
    render(
      <BuilderKitRoot router={router}>
        <App />
      </BuilderKitRoot>,
    );
  });
} else {
  render(<App />);
}
