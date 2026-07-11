const express = require("express");
const client = require("../../whatsapp/client");
const { replacePlaceholders } = require("../../services/date");
const { generateContent } = require("../../services/gemini");

const router = express.Router();

function requireReady(req, res, next) {
  if (!client.isClientReady()) {
    return res.status(503).json({ ok: false, error: "WhatsApp not ready yet" });
  }
  next();
}

router.post("/automate-post", requireReady, (req, res) => {
  res.status(202).json({ ok: true, status: "Processing in background" });

  (async () => {
    console.log("🚀 Background task started for /automate-post");

    try {
      const payload = req.body;
      console.log("📦 Payload received:", JSON.stringify(payload).substring(0, 100) + "...");
      
      let basePrompt = replacePlaceholders(payload.prompt);
      console.log("✨ Prompt processed (placeholders replaced).");
      
      let imageMedia = null;
      let englishResponseText = null;
      let hindiResponseText = null;
      const isMultiPart = Array.isArray(payload.multiPartKeys) && payload.multiPartKeys.length > 0;

      if (payload.english && payload.english.channelId) {
        console.log(`🇬🇧 Starting English processing for channel: ${payload.english.channelId}`);
        const enHeader = replacePlaceholders(payload.english.header || "");
        const enFooter = replacePlaceholders(payload.english.footer || "");
        
        console.log("🧠 Generating content via Gemini (English)...");
        const content = await generateContent(basePrompt, { 
          useGoogleSearch: payload.useGoogleSearch || false,
          isJson: isMultiPart
        });
        console.log("✅ English content generated.");

        if (isMultiPart) {
          console.log("🧩 Handling multipart English message...");
          englishResponseText = content; 
          for (const key of payload.multiPartKeys) {
            const partText = content[key];
            if (partText) {
              const finalMsg = [enHeader, partText, enFooter].filter(Boolean).join("\n\n");
              console.log(`📤 Sending English part '${key}'...`);
              await client.sendMessage(payload.english.channelId, finalMsg);
              await new Promise(r => setTimeout(r, 2000));
            }
          }
        } else {
          console.log("📤 Sending single English message...");
          englishResponseText = content;
          const finalMsg = [enHeader, englishResponseText, enFooter].filter(Boolean).join("\n\n");
          await client.sendMessage(
            payload.english.channelId, 
            imageMedia ? imageMedia : finalMsg,
            imageMedia ? { caption: finalMsg } : {}
          );
        }
        console.log("🏁 English processing complete.");
      }

      if (payload.hindi && payload.hindi.channelId) {
        console.log(`🇮🇳 Starting Hindi processing for channel: ${payload.hindi.channelId}`);
        const hiHeader = replacePlaceholders(payload.hindi.header || "");
        const hiFooter = replacePlaceholders(payload.hindi.footer || "");

        let hindiPrompt;
        if (englishResponseText) {
          const rawTextToTranslate = isMultiPart ? JSON.stringify(englishResponseText) : englishResponseText;
          const translationPrompt = replacePlaceholders(payload.hindi.translationPrompt || "Translate to pure professional Hindi:");
          hindiPrompt = `${translationPrompt}\n\n${rawTextToTranslate}`;
        } else {
          hindiPrompt = basePrompt; 
        }

        console.log("🧠 Generating content via Gemini (Hindi)...");
        const content = await generateContent(hindiPrompt, {
          useGoogleSearch: !englishResponseText && payload.useGoogleSearch,
          isJson: isMultiPart
        });
        console.log("✅ Hindi content generated.");

        if (isMultiPart) {
          console.log("🧩 Handling multipart Hindi message...");
          hindiResponseText = content;
          for (const key of payload.multiPartKeys) {
            const partText = content[key];
            if (partText) {
              const finalMsg = [hiHeader, partText, hiFooter].filter(Boolean).join("\n\n");
              console.log(`📤 Sending Hindi part '${key}'...`);
              await client.sendMessage(payload.hindi.channelId, finalMsg);
              await new Promise(r => setTimeout(r, 2000));
            }
          }
        } else {
          console.log("📤 Sending single Hindi message...");
          hindiResponseText = content;
          const finalMsg = [hiHeader, hindiResponseText, hiFooter].filter(Boolean).join("\n\n");
          await client.sendMessage(
            payload.hindi.channelId,
            imageMedia ? imageMedia : finalMsg,
            imageMedia ? { caption: finalMsg } : {}
          );
        }
        console.log("🏁 Hindi processing complete.");
      }

      console.log("✅ Automate post finished successfully in background.");

    } catch (err) {
      console.error("❌ Automate post background error:", err);
    }
  })();
});

module.exports = router;
