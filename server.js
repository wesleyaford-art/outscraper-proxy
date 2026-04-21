const http = require("http");

console.log("BOOT: loaded");

const server = http.createServer((req, res) => {
  if (req.url === "/" || req.url === "/health") {
    res.writeHead(200, { "Content-Type": "text/plain" });
    res.end("ok");
    return;
  }

  res.writeHead(404, { "Content-Type": "text/plain" });
  res.end("not found");
});

server.listen(3000, "0.0.0.0", () => {
  console.log("BOOT: listening on 3000");
});
