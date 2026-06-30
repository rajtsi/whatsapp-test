# 📡 WhatsApp API Server

A local REST API that keeps a WhatsApp session alive and lets you send messages or images to any channel, group, or chat via simple HTTP calls.

---

## Setup

1. **Clone the repository and install dependencies:**
   ```bash
   git clone <repository-url>
   cd whatsapp-api
   npm install
   ```

2. **Environment Configuration:**
   Create a `.env` file in the root directory and configure the following variables. See the **Environment Variables** section below for details.
   
3. **Start the server:**
   ```bash
   npm start
   ```

On the first run → scan the QR code in the terminal with your WhatsApp app.
The session is saved locally in `.wwebjs_auth` — you won't need to scan it again on subsequent restarts.

---

## Environment Variables

The server requires a `.env` file for configuration. Here are the required and optional variables:

| Variable | Description | Default / Required |
|----------|-------------|--------------------|
| `PORT` | The port on which the API server will run. | Optional (Default: `3000`) |
| `API_KEY` | A secret key used to authenticate API requests. You must generate a secure string and pass it in the `x-api-key` header of your HTTP requests. | **Required** |
| `PUPPETEER_EXECUTABLE_PATH` | Path to a local Chrome/Chromium executable. If not provided, it falls back to a default system path (e.g., `/usr/bin/chromium`). | Optional |

Example `.env` file:
```env
PORT=3000
API_KEY=my_super_secret_api_key_123
PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium
```

---

## Step 1 — Get your Target JID

To send a message, you need the target JID (WhatsApp ID). For channels, you can resolve it using an invite link.

Your channel invite link might look like: `https://whatsapp.com/channel/0029Vb87cGVEVccGEl9vwH2g`
The code at the end is: `0029Vb87cGVEVccGEl9vwH2g`

```bash
curl "http://localhost:3000/resolve-channel?invite=0029Vb87cGVEVccGEl9vwH2g" \
  -H "x-api-key: your_secret_api_key"
```

Response:
```json
{ "ok": true, "name": "My Channel", "jid": "120363XXXX@newsletter" }
```

Keep this JID handy as you'll need to pass it as the `to` parameter in your API calls.

---

## API Endpoints

*Note: All endpoints (except `/health`) require the `x-api-key` header for authentication.*

### GET /status
Check if WhatsApp is connected.
```bash
curl http://localhost:3000/status \
  -H "x-api-key: your_secret_api_key"
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
  -H "x-api-key: your_secret_api_key" \
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
  -H "x-api-key: your_secret_api_key" \
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
  -H "x-api-key: your_secret_api_key" \
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
  -H "x-api-key: your_secret_api_key" \
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
  -H "x-api-key: your_secret_api_key" \
  -d '{"to": "120363XXXX@newsletter", "text":"Good morning! 🌅","image":{"url":"https://..."}}'
```

Or from any language, n8n, Make.com, etc. — it's just an HTTP call.
