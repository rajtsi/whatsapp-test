require("dotenv").config();
const { Client, LocalAuth } = require("whatsapp-web.js");
const qrcode = require("qrcode-terminal");

let isReady = false;

// Only pass executablePath if explicitly set in env
// Otherwise let Puppeteer use its own downloaded Chrome
const puppeteerConfig = {
  headless: true,
  args: [
    "--no-sandbox",
    "--disable-setuid-sandbox",
    "--disable-dev-shm-usage",
    "--disable-gpu",
    "--single-process",        // important for Render/Railway free tier
  ],
};

if (process.env.PUPPETEER_EXECUTABLE_PATH) {
  puppeteerConfig.executablePath = process.env.PUPPETEER_EXECUTABLE_PATH;
}

const client = new Client({
  authStrategy: new LocalAuth({ dataPath: "./.wwebjs_auth" }),
  puppeteer: puppeteerConfig,
});

client.on("qr", (qr) => {
  console.log("\n📱 Scan this QR code with WhatsApp:\n");
  qrcode.generate(qr, { small: true });
  console.log("\nWaiting for scan...\n");
});

client.on("authenticated", () => {
  console.log("🔐 Authenticated — session saved.");
});

client.on("ready", () => {
  isReady = true;
  console.log("✅ WhatsApp client ready!\n");
});

client.on("disconnected", (reason) => {
  isReady = false;
  console.warn("⚠️  Disconnected:", reason, "— reconnecting...");
  client.initialize();
});

client.on("auth_failure", () => {
  console.error("❌ Auth failed. Delete .wwebjs_auth and restart.");
  process.exit(1);
});

client.isClientReady = () => isReady;

module.exports = client;
