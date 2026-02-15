<div align="center">

<img src="images/logo.svg" alt="FRC 1792 Logo" width="120"/>

# FRC 1792 Scouting ● 2026 REBUILT

A simple web app for scouting robots at FIRST Robotics competitions.

**Live at:** [frc1792.github.io](https://frc1792.github.io)

</div>

---

## What It Does

Track robot performance during FRC competitions:

- **🤖 Match Scouting** – Record what robots do during matches
- **🔧 Pit Scouting** – Document robot specs and take photos

All data goes to Google Sheets for your team to analyze.

---

## Quick Start

**For Scouts:**
1. Open [frc1792.github.io](https://frc1792.github.io)
2. Enter your team code (ask your team lead)
3. Choose Match or Pit Scouting
4. Fill out the form and submit

**For Visitors (Demo Mode):**
1. Open [frc1792.github.io](https://frc1792.github.io)
2. Click "Demo Mode"
3. Explore all features without submitting data

**Works offline** — data saves automatically and uploads when you're back online.

---

## Key Features

- **Secret code authentication** — Only authorized teams can submit data
- **Demo mode** — Let other teams explore your scouting system
- **Offline support** — Queue submissions when internet is unavailable
- **Team search** — Loads teams from The Blue Alliance API
- **Mobile-friendly** — Designed for phones and tablets
- **Photo uploads** — Capture robot photos in pit scouting

---

## Setup for Your Team

Want to use this for your team? See the **[Quick Start Guide](docs/QUICK_START_GUIDE.md)** — get running in 30 minutes.

**What you'll need:**
- Google account (for Sheets and Apps Script)
- GitHub account (for hosting)
- The Blue Alliance API key (free)

**Quick setup:**
1. Fork this repo
2. Set up Google Sheets + Apps Script backend
3. Copy `js/config.template.js` to `js/config.js` and fill in your settings
4. Update `appScript/combined-scouting-script.js` with your team codes
5. Deploy to GitHub Pages

**Important notes:**
- `js/config.js` is gitignored to protect your API keys and webhook URL
- **Update `EVENT_KEY` in `config.js` before each competition** — it's hardcoded and must match your current event

---

## Documentation

- **[Quick Start Guide](docs/QUICK_START_GUIDE.md)** — Setup instructions
- **[Technical Whitepaper](docs/TECHNICAL_WHITEPAPER.md)** — How it all works

---

## Tech Stack

- **Vanilla HTML/CSS/JavaScript** — No frameworks needed
- **Google Apps Script** — Backend for data submission
- **The Blue Alliance API** — Team lists and event data
- **GitHub Pages** — Free, fast hosting

---

## Project Structure

```
├── index.html              # Home page with code entry
├── match-scouting.html     # Match scouting form (5 screens)
├── pit-scouting.html       # Pit scouting form (2 screens)
├── css/styles.css          # All styling
├── js/
│   ├── config.template.js  # Config template (copy to config.js)
│   ├── config.js           # Your settings (gitignored)
│   ├── home.js             # Home page logic
│   ├── match-scouting.js   # Match form logic
│   └── pit-scouting.js     # Pit form logic
├── appScript/
│   └── combined-scouting-script.js  # Google backend
└── docs/                   # Documentation
```

---

**Built for FRC Team 1792 • 2026 Season**
