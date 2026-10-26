import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { extname, join, normalize, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(fileURLToPath(new URL(".", import.meta.url)));
const port = Number(process.env.PORT || 3000);
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

const server = createServer(async (req, res) => {
  try {
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
    res.end("CodeForge could not serve this request.");
  }
});

server.listen(port, "0.0.0.0", () => {
  console.log(`CodeForge Editor listening on http://0.0.0.0:${port}`);
});
