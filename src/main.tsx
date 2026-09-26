import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "@fontsource/jersey-10/400.css";
import "./styles.css";
import "./explore.css";
import "./theme.css";
import "./player-header.css";
import "./home-shortcuts.css";
import "./bottom-navigation.css";
import "./typography.css";
import { initializeTheme } from "./theme";

void initializeTheme().then(() =>
  ReactDOM.createRoot(document.getElementById("root")!).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  ),
);
