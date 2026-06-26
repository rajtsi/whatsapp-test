# 📡 WhatsApp API Server

A local REST API that keeps a WhatsApp session alive and lets you send
messages or images to any channel, group, or chat via simple HTTP calls.

---

## Setup

```bash
npm install
npm start
```

On first run → scan the QR code in terminal with your WhatsApp.
Session is saved — you won't need to scan again.

---

## Step 1 — Get your Channel JID

Your channel invite link: `https://whatsapp.com/channel/0029Vb87cGVEVccGEl9vwH2g`
The code at the end is: `0029Vb87cGVEVccGEl9vwH2g`

```bash
curl "http://localhost:3000/resolve-channel?invite=0029Vb87cGVEVccGEl9vwH2g"
```

Response:
```json
{ "ok": true, "name": "My Channel", "jid": "120363XXXX@newsletter" }
```

Copy that JID → set it as `DEFAULT_TARGET_JID` in `.env` so you don't
have to pass `to` every time.

---

## API Endpoints

### GET /status
Check if WhatsApp is connected.
```bash
curl http://localhost:3000/status
```

---

### POST /send/text
Send a text message with WhatsApp formatting.

**Formatting:**
- `*bold*`
- `_italic_`
- `~strikethrough~`
- ` ```monospace``` `
- `\n` for new lines

```bash
curl -X POST http://localhost:3000/send/text \
  -H "Content-Type: application/json" \
  -d '{
    "to": "120363XXXX@newsletter",
    "text": "🌅 *Good Morning!*\n\nToday'\''s update:\n• Point one\n• Point two _italic_\n\n*Stay awesome!* 🚀"
  }'
```

---

### POST /send/image
Send an image with an optional caption.

**From URL:**
```bash
curl -X POST http://localhost:3000/send/image \
  -H "Content-Type: application/json" \
  -d '{
    "to": "120363XXXX@newsletter",
    "url": "https://picsum.photos/800/400",
    "caption": "Caption with *bold* text"
  }'
```

**From base64:**
```bash
curl -X POST http://localhost:3000/send/image \
  -H "Content-Type: application/json" \
  -d '{
    "to": "120363XXXX@newsletter",
    "base64": "data:image/jpeg;base64,/9j/4AAQ...",
    "caption": "My image"
  }'
```

---

### POST /send/message
Send text + image in one call (most useful for daily posts).

```bash
curl -X POST http://localhost:3000/send/message \
  -H "Content-Type: application/json" \
  -d '{
    "to": "120363XXXX@newsletter",
    "text": "🌅 *Good Morning!*\n\n_Monday, June 26_\n\n• Update one\n• Update two\n\n🚀 Have a great day!",
    "image": {
      "url": "https://picsum.photos/800/400",
      "caption": "Morning banner 🌄"
    }
  }'
```

---

## WhatsApp Formatting Cheatsheet

| Style          | Syntax        | Example                  |
|----------------|---------------|--------------------------|
| Bold           | `*text*`      | **Today's Update**       |
| Italic         | `_text_`      | _subtitle_               |
| Strikethrough  | `~text~`      | ~~old info~~             |
| Monospace      | ` ```text``` ` | `code`                  |
| New line       | `\n`          | line 1↵line 2            |

---

## Later: Cron Job Example

Once tested, your cron just hits the API:

```bash
# crontab -e
0 8 * * * curl -s -X POST http://localhost:3000/send/message \
  -H "Content-Type: application/json" \
  -d '{"text":"Good morning! 🌅","image":{"url":"https://..."}}'
```

Or from any language, n8n, Make.com, etc. — it's just an HTTP call.
