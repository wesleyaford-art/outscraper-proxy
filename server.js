import express from "express";

console.log("BOOT: file loaded");

const app = express();

app.get("/", (req, res) => {
  res.status(200).send("ok");
});

app.get("/health", (req, res) => {
  res.status(200).send("ok");
});

const PORT = 3000;
console.log("BOOT: about to listen on", PORT);

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Listening on ${PORT}`);
});
