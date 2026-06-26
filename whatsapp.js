require("dotenv").config();
const { Client, LocalAuth } = require("whatsapp-web.js");
const qrcode = require("qrcode-terminal");

let isReady = false;

// Render installs Chrome here via postinstall
// Fall back to env var if set, otherwise use Render's path
const executablePath =
  process.env.PUPPETEER_EXECUTABLE_PATH ||
  "/opt/render/.cache/puppeteer/chrome/linux-146.0.7680.31/chrome-linux64/chrome";

const client = new Client({
  authStrategy: new LocalAuth({ dataPath: "./.wwebjs_auth" }),
  puppeteer: {
    executablePath,
    headless: true,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-gpu",
      "--single-process",
    ],
  },
});

client.on("qr", (qr) => {
  console.log("\n📱 Scan this QR code with WhatsApp:\n");
  qrcode.generate(qr, { small: true });
  console.log("\nWaiting for scan...\n");
});

client.on("authenticated", () => console.log("🔐 Authenticated — session saved."));
client.on("ready", () => { isReady = true; console.log("✅ WhatsApp client ready!\n"); });
client.on("disconnected", (reason) => {
  isReady = false;
  console.warn("⚠️  Disconnected:", reason, "— reconnecting...");
  client.initialize();
});
client.on("auth_failure", () => { console.error("❌ Auth failed."); process.exit(1); });

client.isClientReady = () => isReady;

module.exports = client;

