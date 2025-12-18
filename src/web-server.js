import http from "http";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const publicDir = path.join(__dirname, "..", "web");
const port = process.env.PORT || 3000;

const mimeTypes = {
  ".html": "text/html",
  ".js": "application/javascript",
  ".css": "text/css",
  ".json": "application/json"
};

const state = {
  balance: 8450.23,
  credit: 3200,
  transactions: [
    { date: "2025-01-05", desc: "Payroll Deposit", amount: 4200 },
    { date: "2025-01-03", desc: "Flight Booking", amount: -620.5 },
    { date: "2025-01-01", desc: "Coffee Shop", amount: -12.75 },
    { date: "2024-12-29", desc: "Utility Payment", amount: -180.0 },
    { date: "2024-12-27", desc: "Stock Dividend", amount: 95.34 }
  ]
};

const server = http.createServer((req, res) => {
  const urlPath = req.url.split("?")[0];
  const safePath = urlPath === "/" ? "/index.html" : urlPath;

  if (safePath === "/api/account") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify(state));
    return;
  }

  const filePath = path.join(publicDir, safePath);

  if (!filePath.startsWith(publicDir)) {
    res.writeHead(400);
    res.end("Bad request");
    return;
  }

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404);
      res.end("Not found");
      return;
    }
    const ext = path.extname(filePath);
    const type = mimeTypes[ext] || "text/plain";
    res.writeHead(200, { "Content-Type": type });
    res.end(data);
  });
});

server.listen(port, () => {
  console.log(`Demo web app running at http://localhost:${port}`);
});
