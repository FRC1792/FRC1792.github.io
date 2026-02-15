# JavaScript Files

## Configuration Setup

**Before running the app, you need to create your config file:**

### First Time Setup

```bash
# Copy the template to create your config file
cp config.template.js config.js
```

On Windows Command Prompt:
```cmd
copy config.template.js config.js
```

### Edit Your Config

Open `config.js` and fill in:
- Your Google Apps Script webhook URL
- Your Blue Alliance API key
- **Your event code** — ⚠️ **This is hardcoded! Update before each competition**
- Your team's secret code

**Important:** The `EVENT_KEY` must be updated before every event. Find your event on thebluealliance.com and use the code from the URL (e.g., `2026wiapp`).

### Security

✅ **`config.js` is gitignored** — Your credentials stay private
✅ **`config.template.js`** is the template with placeholder values
❌ **Never commit `config.js`** to git

## File Overview

- **`config.template.js`** — Template file (safe to commit)
- **`config.js`** — Your actual config (never committed, gitignored)
- **`home.js`** — Home page authentication logic
- **`match-scouting.js`** — Match scouting form logic
- **`pit-scouting.js`** — Pit scouting form logic

---

Need help? Check the [Quick Start Guide](../docs/QUICK_START_GUIDE.md) or [Technical Whitepaper](../docs/TECHNICAL_WHITEPAPER.md).
