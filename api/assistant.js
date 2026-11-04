import { sendAssistant } from "../server/http.js";
import { createProviders } from "../server/providers.js";
import { runRoute } from "../server/routes.js";

// POST /api/assistant: a typed or spoken question from the family.
export default (req, res) => sendAssistant(req, res, (body) => runRoute("ask", body, createProviders), "ask");
