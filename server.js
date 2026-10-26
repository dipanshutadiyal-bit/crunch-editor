import { createServer } from "node:http";
import { execFile } from "node:child_process";
import { readFile, stat } from "node:fs/promises";
import { extname, join, normalize, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

const root = resolve(fileURLToPath(new URL(".", import.meta.url)));
const port = Number(process.env.PORT || 3000);
const runPython = promisify(execFile);
const mime = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".ico": "image/x-icon"
};

function safePath(requestUrl) {
  const pathname = decodeURIComponent(new URL(requestUrl, "http://localhost").pathname);
  const requested = pathname === "/" ? "/index.html" : pathname;
  const candidate = resolve(root, `.${normalize(requested)}`);
  return candidate.startsWith(root) ? candidate : null;
}

function safePublicPath(requestUrl) {
  const pathname = decodeURIComponent(new URL(requestUrl, "http://localhost").pathname);
  const requested = pathname === "/" ? "/index.html" : pathname;
  const publicRoot = resolve(root, "public");
  const candidate = resolve(publicRoot, `.${normalize(requested)}`);
  return candidate.startsWith(publicRoot) ? candidate : null;
}

async function sendFile(res, filePath) {
  const body = await readFile(filePath);
  res.writeHead(200, { "Content-Type": mime[extname(filePath)] || "application/octet-stream" });
  res.end(body);
}

function sendJson(res, status, payload) {
  const body = Buffer.from(JSON.stringify(payload));
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Content-Length": body.length
  });
  res.end(body);
}

async function readBody(req) {
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > 100_000) throw new Error("Code is too large for the local runner.");
    chunks.push(chunk);
  }
  return Buffer.concat(chunks).toString("utf8");
}

const server = createServer(async (req, res) => {
  try {
    if (req.method === "POST" && new URL(req.url || "/", "http://localhost").pathname === "/api/run") {
      try {
        const { code } = JSON.parse(await readBody(req));
        if (typeof code !== "string") return sendJson(res, 400, { ok: false, error: "Request must contain Python code." });
        const pythonCommand = process.platform === "win32" ? "python" : "python3";
        const result = await runPython(pythonCommand, ["-I", "-c", code], {
          timeout: 3000,
          maxBuffer: 256 * 1024,
          env: { ...process.env, PYTHONIOENCODING: "utf-8" }
        });
        return sendJson(res, 200, { ok: true, stdout: result.stdout, stderr: result.stderr });
      } catch (error) {
        const timedOut = error?.killed || error?.signal === "SIGTERM";
        return sendJson(res, 200, {
          ok: false,
          timedOut,
          stdout: error?.stdout || "",
          stderr: timedOut ? "Execution stopped after 3 seconds (possible infinite loop)." : (error?.stderr || error?.message || "Python execution failed.")
        });
      }
    }
    const target = safePath(req.url || "/");
    if (!target) {
      res.writeHead(403);
      res.end("Forbidden");
      return;
    }

    try {
      const details = await stat(target);
      if (details.isFile()) {
        await sendFile(res, target);
        return;
      }
    } catch {
      const publicTarget = safePublicPath(req.url || "/");
      try {
        const details = await stat(publicTarget);
        if (details.isFile()) {
          await sendFile(res, publicTarget);
          return;
        }
      } catch {
        // Fall through to SPA fallback for unknown application paths.
      }
    }

    await sendFile(res, join(root, "index.html"));
  } catch (error) {
    console.error(error);
    res.writeHead(500, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("Crunch could not serve this request.");
  }
});

server.listen(port, "0.0.0.0", () => {
  console.log(`Crunch Editor listening on http://0.0.0.0:${port}`);
});
