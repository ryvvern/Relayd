import http from "node:http";

// Port is overridable via the PORT env var, e.g. `PORT=5000 npm run receiver`.
const port = Number(process.env.PORT) || 4000;

const server = http.createServer((req, res) => {
  if (req.method !== "POST") {
    res.writeHead(405, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Method not allowed" }));
    return;
  }

  let rawBody = "";
  req.on("data", (chunk) => {
    rawBody += chunk;
  });

  req.on("end", () => {
    try {
      const body = rawBody ? JSON.parse(rawBody) : {};
      console.log("--- Received delivery ---");
      console.log("Path:", req.url);
      console.log("Idempotency-Key:", req.headers["idempotency-key"] ?? "(none)");
      if (body.event_type !== undefined || body.payload !== undefined) {
        console.log("Event type:", body.event_type);
        console.log("Payload:", JSON.stringify(body.payload, null, 2));
      } else {
        console.log("Body:", JSON.stringify(body, null, 2));
      }
      console.log("--------------------------");
    } catch {
      console.log("--- Received delivery (unparsable JSON) ---");
      console.log("Path:", req.url);
      console.log("Idempotency-Key:", req.headers["idempotency-key"] ?? "(none)");
      console.log("Raw body:", rawBody);
      console.log("--------------------------------------------");
    }

    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ received: true }));
  });
});

server.listen(port, () => {
  console.log(`Dummy receiver listening on http://localhost:${port}`);
});
