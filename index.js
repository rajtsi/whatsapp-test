require("dotenv").config();
const express = require("express");
const client = require("./whatsapp");
const routes = require("./routes");

const PORT = process.env.PORT || 3000;

const app = express();
app.use(express.json({ limit: "20mb" }));

// API key auth on everything
app.use((req, res, next) => {
  if (!process.env.API_KEY) {
    return res.status(500).json({ ok: false, error: "API_KEY not set on server" });
  }
  if (req.headers["x-api-key"] !== process.env.API_KEY) {
    return res.status(401).json({ ok: false, error: "Unauthorized" });
  }
  next();
});

app.get("/health", (req, res) => {
  res.json({ ok: true, uptime: Math.floor(process.uptime()) + "s", whatsapp: client.isClientReady() });
});

app.use("/", routes);

client.initialize();

app.listen(PORT, () => {
  console.log(`🌐 API running on port ${PORT}`);
});
