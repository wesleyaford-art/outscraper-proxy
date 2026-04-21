import express from "express";

const app = express();

app.get("/", (req, res) => {
  res.status(200).send("ok");
});

app.get("/health", (req, res) => {
  res.status(200).send("ok");
});

const PORT = 3000;

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Listening on ${PORT}`);
});
