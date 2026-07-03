
require("dotenv").config();
const { Client, LocalAuth } = require("whatsapp-web.js");
const qrcode = require("qrcode-terminal");

let isReady = false;

// Use env var if set
const executablePath = process.env.PUPPETEER_EXECUTABLE_PATH;

if (executablePath) {
  console.log("🔍 Using Chrome at:", executablePath);
} else {
  console.log("🔍 Using default Puppeteer Chrome");
}

const puppeteerOptions = {
  headless: true,
  protocolTimeout: 600000, // 10 minutes timeout to prevent ProtocolError
  args: [
    "--no-sandbox",
    "--disable-setuid-sandbox",
    "--disable-dev-shm-usage",
    "--disable-gpu",
    "--single-process",
  ],
};

if (executablePath) {
  puppeteerOptions.executablePath = executablePath;
}

const client = new Client({
  authStrategy: new LocalAuth({ dataPath: "./.wwebjs_auth" }),
  puppeteer: puppeteerOptions,
});


client.on("qr", (qr) => {
  console.log("\n📱 Scan this QR code with WhatsApp:\n");
  qrcode.generate(qr, { small: true });
  console.log("\nWaiting for scan...\n");
});

client.on("authenticated", () => console.log("🔐 Authenticated — session saved."));
client.on("ready", () => { isReady = true; console.log("✅ WhatsApp client ready!\n"); });
client.on("disconnected", async (reason) => {
  isReady = false;
  console.warn("⚠️  Disconnected:", reason);
  if (reason === "LOGOUT") {
    console.warn("Session was logged out. Cleaning up session data...");
    const fs = require("fs");
    try {
      fs.rmSync("./.wwebjs_auth", { recursive: true, force: true });
      console.log("Session data cleared. Please restart the app to generate a new QR code.");
    } catch (e) {
      console.error("Could not clear session data:", e);
    }
  }
  process.exit(1);
});
client.on("auth_failure", () => { console.error("❌ Auth failed."); process.exit(1); });

client.isClientReady = () => isReady;

module.exports = client;
