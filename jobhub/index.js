require("dotenv").config();
const express = require("express");
const client = require("./src/whatsapp/client");
const messagingRoutes = require("./src/api/whatsapp/messaging");
const automatePostRoutes = require("./src/api/whatsapp/automatePost");
const { collectJobsHandler } = require('./src/api/collectJobs');
const { postJobsHandler } = require('./src/api/postJobs');
const { importWhatsappHandler } = require('./src/api/importWhatsapp');

const PORT = process.env.PORT || 3000;

const app = express();
app.use(express.json({ limit: "20mb" }));

// Security: Enforce API Key
app.use((req, res, next) => {
  if (!process.env.API_KEY) {
    return res.status(500).json({ ok: false, error: "API_KEY not set on server" });
  }
  if (req.headers["x-api-key"] !== process.env.API_KEY) {
    return res.status(401).json({ ok: false, error: "Unauthorized" });
  }
  next();
});

// Health check
app.get("/health", (req, res) => {
  res.json({ ok: true, uptime: Math.floor(process.uptime()) + "s", whatsapp: client.isClientReady() });
});

// Original whatsapp-api routes (refactored)
app.use("/", messagingRoutes);
app.use("/", automatePostRoutes);

// JobHub backend routes
app.post('/api/jobs/collect', collectJobsHandler);
app.post('/api/jobs/post', postJobsHandler);
app.post('/api/jobs/import-whatsapp', importWhatsappHandler);
app.get('/api/jobs/stats', async (req, res) => {
    const prisma = require('./src/database/prisma');
    try {
        const total = await prisma.job.count();
        const pending = await prisma.job.count({ where: { posted: false } });
        res.json({ success: true, stats: { total, pending } });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// Start WhatsApp Client
client.initialize();

app.listen(PORT, () => {
  console.log(`🌐 API (with JobHub) running on port ${PORT}`);
});
