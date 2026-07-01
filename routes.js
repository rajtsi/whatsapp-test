const express = require("express");
const { MessageMedia } = require("whatsapp-web.js");
const client = require("./whatsapp");

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
// { "to": "120363xx@newsletter", "text": "*bold* _italic_" }
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
// { "to": "...", "url": "https://...", "caption": "optional" }
// { "to": "...", "base64": "data:image/jpeg;base64,...", "caption": "optional" }
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

// POST /send/message  — text + image together
// { "to": "...", "text": "...", "image": { "url": "...", "caption": "..." } }
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

// POST /automate-post
// Generic endpoint for cron-job.org
router.post("/automate-post", requireReady, async (req, res) => {
  const { replacePlaceholders } = require("./utils/date");
  const { generateContent } = require("./utils/gemini");
  
  try {
    const payload = req.body;
    let basePrompt = replacePlaceholders(payload.prompt);
    
    // Optional Image Logic for the future
    let imageMedia = null;
    if (payload.imageLogic) {
      // Future placeholder: generate image or search based on imageLogic
      // e.g. const imageUrl = await fetchImage(replacePlaceholders(payload.imageLogic.prompt));
      // imageMedia = await MessageMedia.fromUrl(imageUrl);
    }

    let englishResponseText = null;
    let hindiResponseText = null;
    const results = [];
    const isMultiPart = Array.isArray(payload.multiPartKeys) && payload.multiPartKeys.length > 0;

    // 1. Process English
    if (payload.english && payload.english.channelId) {
      const enHeader = replacePlaceholders(payload.english.header || "");
      const enFooter = replacePlaceholders(payload.english.footer || "");
      
      const content = await generateContent(basePrompt, { 
        useGoogleSearch: payload.useGoogleSearch || false,
        isJson: isMultiPart
      });

      if (isMultiPart) {
        englishResponseText = content; // content is a JSON object
        for (const key of payload.multiPartKeys) {
          const partText = content[key];
          if (partText) {
            const finalMsg = [enHeader, partText, enFooter].filter(Boolean).join("\n\n");
            const msg = await client.sendMessage(payload.english.channelId, finalMsg);
            results.push({ lang: "en", part: key, messageId: msg.id._serialized });
            // Sleep slightly to ensure message ordering
            await new Promise(r => setTimeout(r, 2000));
          }
        }
      } else {
        englishResponseText = content; // content is a string
        const finalMsg = [enHeader, englishResponseText, enFooter].filter(Boolean).join("\n\n");
        const msg = await client.sendMessage(
          payload.english.channelId, 
          imageMedia ? imageMedia : finalMsg,
          imageMedia ? { caption: finalMsg } : {}
        );
        results.push({ lang: "en", messageId: msg.id._serialized });
      }
    }

    // 2. Process Hindi Translation
    if (payload.hindi && payload.hindi.channelId) {
      const hiHeader = replacePlaceholders(payload.hindi.header || "");
      const hiFooter = replacePlaceholders(payload.hindi.footer || "");

      let hindiPrompt;
      if (englishResponseText) {
        // If we generated english, translate it
        const rawTextToTranslate = isMultiPart ? JSON.stringify(englishResponseText) : englishResponseText;
        const translationPrompt = replacePlaceholders(payload.hindi.translationPrompt || "Translate to pure professional Hindi:");
        hindiPrompt = `${translationPrompt}\n\n${rawTextToTranslate}`;
      } else {
        // Direct Hindi generation (e.g. Rashifal)
        hindiPrompt = basePrompt; 
      }

      const content = await generateContent(hindiPrompt, {
        useGoogleSearch: !englishResponseText && payload.useGoogleSearch,
        isJson: isMultiPart
      });

      if (isMultiPart) {
        hindiResponseText = content; // JSON
        for (const key of payload.multiPartKeys) {
          const partText = content[key];
          if (partText) {
            const finalMsg = [hiHeader, partText, hiFooter].filter(Boolean).join("\n\n");
            const msg = await client.sendMessage(payload.hindi.channelId, finalMsg);
            results.push({ lang: "hi", part: key, messageId: msg.id._serialized });
            await new Promise(r => setTimeout(r, 2000));
          }
        }
      } else {
        hindiResponseText = content;
        const finalMsg = [hiHeader, hindiResponseText, hiFooter].filter(Boolean).join("\n\n");
        const msg = await client.sendMessage(
          payload.hindi.channelId,
          imageMedia ? imageMedia : finalMsg,
          imageMedia ? { caption: finalMsg } : {}
        );
        results.push({ lang: "hi", messageId: msg.id._serialized });
      }
    }

    res.json({ ok: true, results });

  } catch (err) {
    console.error("Automate post error:", err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

module.exports = router;
