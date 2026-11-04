import { sendAssistant } from "../../server/http.js";
import { createProviders } from "../../server/providers.js";
import { runRoute } from "../../server/routes.js";

// POST /api/assistant/speak: read screen text aloud in the family's language.
export default (req, res) => sendAssistant(req, res, (body) => runRoute("speak", body, createProviders));
