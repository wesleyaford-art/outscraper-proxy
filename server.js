const express = require("express");

const app = express();
app.use(express.json());

app.get("/", (req, res) => {
  res.status(200).send("ok");
});

app.get("/health", (req, res) => {
  res.status(200).send("ok");
});

app.post("/api/businesses", (req, res) => {
  res.json({ success: true, received: req.body });
});

app.post("/api/reviews", (req, res) => {
  res.json({ success: true, received: req.body });
});

app.listen(3000, "0.0.0.0", () => {
  console.log("Express listening on 3000");
});
