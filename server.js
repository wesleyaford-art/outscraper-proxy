import express from "express";

const app = express();
app.use(express.json());

app.get("/", (req, res) => {
  res.json({ ok: true });
});

app.get("/health", (req, res) => {
  res.send("ok");
});

app.post("/api/businesses", (req, res) => {
  res.json({
    success: true,
    received: req.body
  });
});

const PORT = Number(process.env.PORT) || 3000;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`Listening on ${PORT}`);
});
