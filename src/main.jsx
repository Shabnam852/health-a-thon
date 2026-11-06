import { Analytics } from "@vercel/analytics/react";
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
import CrashScreen from "./components/CrashScreen.jsx";
import "./index.css";

// Page views only, with the query string cut off so no phone number, account or case search is sent.
const stripQuery = (event) => ({ ...event, url: event.url.split("?")[0] });

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <CrashScreen>
      <BrowserRouter>
        <ReferralProvider>
          <AuthProvider>
            <AbdmProvider>
              <App />
            </AbdmProvider>
          </AuthProvider>
        </ReferralProvider>
      </BrowserRouter>
    </CrashScreen>
    <Analytics beforeSend={stripQuery} />
  </React.StrictMode>,
);
