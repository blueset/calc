import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App";
import { APP_NAME } from "./constants";
import { installFaviconSync } from "./lib/favicon";

document.title = APP_NAME;
installFaviconSync();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
