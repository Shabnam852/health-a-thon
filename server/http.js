// Node request/response plumbing shared by the Vercel functions and the Vite dev server.

const MAX_BODY_BYTES = 2_000_000;

const readJson = async (req) => {
  // Vercel has already parsed a JSON body.
  if (req.body !== undefined) return typeof req.body === "string" ? JSON.parse(req.body) : req.body;
  let size = 0;
  const chunks = [];
  for await (const chunk of req) {
    size += chunk.length;
    if (size > MAX_BODY_BYTES) throw Object.assign(new Error("Too large"), { status: 413 });
    chunks.push(chunk);
  }
  return JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}");
};

const send = (res, status, body) => {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.end(JSON.stringify(body));
};

export const sendAssistant = async (req, res, handle) => {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return send(res, 405, { error: "Use POST." });
  }
  let body;
  try {
    body = await readJson(req);
  } catch (error) {
    return send(res, error.status || 400, {
      error: error.status === 413 ? "That request is too large." : "Bad request.",
    });
  }
  try {
    const result = await handle(body);
    return send(res, result.status, result.body);
  } catch (error) {
    console.error("[assistant] unexpected failure", error);
    return send(res, 500, { error: "Something went wrong. Please try again." });
  }
};
