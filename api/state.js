import { sendState } from "../server/http.js";
import { createNeonStore, databaseUrl, handleState } from "../server/state.js";

// One store per warm instance. Made lazily, so a missing DATABASE_URL gives a 503, not a crash.
let store = null;

// GET/PUT /api/state: the shared demo data, saved in Neon.
export default (req, res) =>
  sendState(req, res, (input) => {
    const url = databaseUrl();
    if (!url) return { status: 503, body: { error: "Saved data isn't set up yet." } };
    store ??= createNeonStore(url);
    return handleState(input, store);
  });
