const express = require("express");
const { MessageMedia } = require("whatsapp-web.js");
const client = require("../../whatsapp/client");

const router = express.Router();

function requireReady(req, res, next) {
  if (!client.isClientReady()) {
    return res.status(503).json({ ok: false, error: "WhatsApp not ready yet" });
  }
  next();
}

// GET /status
router.get("/status", (req, res) => {
  res.json({ ok: true, ready: client.isClientReady() });
});

// GET /resolve-channel?invite=<code>
router.get("/resolve-channel", requireReady, async (req, res) => {
  const { invite } = req.query;
  const errors = {};
  if (invite) {
    try {
      const result = await client.getChannelByInviteCode(invite);
      if (result) return res.json({ ok: true, name: result.name, jid: result.id._serialized });
    } catch (e) { errors.getChannelByInviteCode = e.message; }
  }
  try {
    const channels = await client.getChannels();
    return res.json({ ok: true, channels: channels.map(c => ({ name: c.name, jid: c.id._serialized })), errors });
  } catch (e) { errors.getChannels = e.message; }
  res.status(500).json({ ok: false, errors });
});

// POST /send/text
router.post("/send/text", requireReady, async (req, res) => {
  const { to, text } = req.body;
  if (!to) return res.status(400).json({ ok: false, error: "Missing `to`" });
  if (!text) return res.status(400).json({ ok: false, error: "Missing `text`" });
  try {
    const msg = await client.sendMessage(to, text);
    res.json({ ok: true, messageId: msg.id._serialized });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// POST /send/image
router.post("/send/image", requireReady, async (req, res) => {
  const { to, url, base64, caption } = req.body;
  if (!to) return res.status(400).json({ ok: false, error: "Missing `to`" });
  if (!url && !base64) return res.status(400).json({ ok: false, error: "Provide `url` or `base64`" });
  try {
    let media;
    if (url) {
      media = await MessageMedia.fromUrl(url, { unsafeMime: true });
    } else {
      const [meta, data] = base64.split(",");
      const mimeType = meta.match(/:(.*?);/)[1];
      media = new MessageMedia(mimeType, data);
    }
    const msg = await client.sendMessage(to, media, { caption: caption || "" });
    res.json({ ok: true, messageId: msg.id._serialized });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// POST /send/message
router.post("/send/message", requireReady, async (req, res) => {
  const { to, text, image } = req.body;
  if (!to) return res.status(400).json({ ok: false, error: "Missing `to`" });
  if (!text && !image) return res.status(400).json({ ok: false, error: "Provide `text` or `image`" });
  const results = [];
  try {
    if (text) {
      const msg = await client.sendMessage(to, text);
      results.push({ type: "text", messageId: msg.id._serialized });
    }
    if (image) {
      let media;
      if (image.url) {
        media = await MessageMedia.fromUrl(image.url, { unsafeMime: true });
      } else if (image.base64) {
        const [meta, data] = image.base64.split(",");
        const mimeType = meta.match(/:(.*?);/)[1];
        media = new MessageMedia(mimeType, data);
      }
      const msg = await client.sendMessage(to, media, { caption: image.caption || "" });
      results.push({ type: "image", messageId: msg.id._serialized });
    }
    res.json({ ok: true, sent: results });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

module.exports = router;
