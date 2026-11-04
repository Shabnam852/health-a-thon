import { sendAssistant } from "../../server/http.js";
import { createProviders } from "../../server/providers.js";
import { runRoute } from "../../server/routes.js";

// POST /api/ai/handoff: a handoff summary of one referral for the receiving hospital.
export default (req, res) => sendAssistant(req, res, (body) => runRoute("handoff", body, createProviders), "handoff");
