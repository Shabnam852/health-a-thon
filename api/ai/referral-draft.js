import { sendAssistant } from "../../server/http.js";
import { createProviders } from "../../server/providers.js";
import { runRoute } from "../../server/routes.js";

// POST /api/ai/referral-draft: a spoken note, typed note or photo → a draft referral form.
export default (req, res) => sendAssistant(req, res, (body) => runRoute("draft", body, createProviders));
