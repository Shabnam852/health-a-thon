import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router";
import App from "./App.jsx";
import { AbdmProvider } from "./context/AbdmContext.jsx";
import { AuthProvider } from "./context/AuthContext.jsx";
import { ReferralProvider } from "./context/ReferralContext.jsx";
import "@fontsource/inter/400.css";
import "@fontsource/inter/500.css";
import "@fontsource/inter/600.css";
import "@fontsource/inter/700.css";
import "./styles/icons.css";
import "./styles/tokens.css";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <ReferralProvider>
        <AuthProvider>
          <AbdmProvider>
            <App />
          </AbdmProvider>
        </AuthProvider>
      </ReferralProvider>
    </BrowserRouter>
  </React.StrictMode>,
);
