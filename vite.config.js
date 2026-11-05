import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig, loadEnv } from "vite";

// Serves the /api AI routes in `npm run dev`, as Vercel does once deployed. The keys stay in
// this Node process: they are read here and never handed to the browser bundle.
const assistantApi = (env) => ({
  name: "assistant-api",
  apply: "serve",
  configureServer(server) {
    const handle = async (req, res, route) => {
      const [{ runRoute }, { createProviders }, { sendAssistant }] = await Promise.all([
        server.ssrLoadModule("/server/routes.js"),
        server.ssrLoadModule("/server/providers.js"),
        server.ssrLoadModule("/server/http.js"),
      ]);
      return sendAssistant(req, res, (body) => runRoute(route, body, () => createProviders(env)), route);
    };
    // Keep in step with ROUTE_PATHS in server/routes.js (a test checks it).
    const routes = {
      "/api/assistant": "ask",
      "/api/assistant/speak": "speak",
      "/api/ai/handoff": "handoff",
      "/api/ai/referral-draft": "draft",
    };
    server.middlewares.use((req, res, next) => {
      const route = routes[req.url?.split("?")[0]];
      if (!route) return next();
      handle(req, res, route).catch((error) => {
        server.config.logger.error(`[assistant] ${error.stack || error}`);
        res.statusCode = 500;
        res.end();
      });
    });
  },
});

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  // "" loads every variable in .env, not only VITE_ ones. Only the dev server sees them.
  plugins: [react(), tailwindcss(), assistantApi(loadEnv(mode, process.cwd(), ""))],
}));
