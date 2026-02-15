# Quick Start Guide

Get the scouting system running for your team in 30 minutes.

---

## What You'll Need

- **GitHub account** (for hosting the website)
- **Google account** (for storing data)
- **The Blue Alliance account** (for loading team lists)

---

## Step 1: Set Up Google Sheets Backend

This handles data submissions from the website.

1. Create a new **Google Sheet**
2. Go to **Extensions → Apps Script**
3. Delete the default `Code.gs` code
4. Copy everything from `appScript/combined-scouting-script.js` in this repo
5. Paste it into the Apps Script editor
6. Click **Save** (disk icon)
7. Click **Deploy → New deployment**
8. Select type: **Web app**
9. Configure:
   - Execute as: **Me**
   - Who has access: **Anyone**
10. Click **Deploy**
11. Authorize the app (Google will ask for permissions)
12. **Copy the Web App URL** (ends with `/exec`) — you'll need this

---

## Step 2: Get a Blue Alliance API Key

This lets the app load team lists from events.

1. Go to [thebluealliance.com/account](https://thebluealliance.com/account)
2. Scroll to **Read API Keys**
3. Click **Add New Key**
4. Give it a description (e.g., "FRC 1792 Scouting")
5. **Copy the key** — you'll need this

---

## Step 3: Configure Your Settings

**First, create your config file:**

```bash
# Copy the template to create your config file
cp js/config.template.js js/config.js
```

Or on Windows Command Prompt:
```cmd
copy js\config.template.js js\config.js
```

**Then edit `js/config.js`** with your settings:

```javascript
const SCOUTING_CONFIG = {
    // Paste your Apps Script URL here (from Step 1)
    WEBHOOK_URL: "https://script.google.com/macros/s/.../exec",

    // Paste your TBA API key here (from Step 2)
    TBA_API_KEY: "your-key-here",

    // Find your event code at thebluealliance.com
    // It's the last part of the event URL (e.g., "2026wiapp")
    EVENT_KEY: "2026wiapp",

    // Leave this as true to load teams automatically
    ENABLE_TEAM_LOADING: true,

    // Change this to your team's secret code
    // Scouts will need this code to access scouting
    SECRET_CODE: "your-team-code-here"
};
```

**Finding your event code:**
- Go to thebluealliance.com
- Search for your event
- Look at the URL: `thebluealliance.com/event/2026wiapp`
- The event code is `2026wiapp`

**Important Notes:**

**🔒 Security:**
- ✅ `js/config.js` is in `.gitignore` and won't be committed to git
- ✅ This protects your API keys, webhook URL, and team code
- ✅ Only the template file (`js/config.template.js`) is in the repo

**📅 Before Each Event:**
- ⚠️ **Update `EVENT_KEY`** — The event code is hardcoded in `config.js`
- ⚠️ You must change it to match your current competition
- Example: Change from `"2026wiapp"` to `"2026wimi"` for a different event

---

## Step 4: Set Up Server-Side Security

Edit **`appScript/combined-scouting-script.js`** to allow your team codes:

```javascript
const ALLOWED_CODES = ["atlas"]; // Must match SECRET_CODE in config.js
```

**For multi-team alliances:**
```javascript
const ALLOWED_CODES = ["atlas", "ally1259"];
```

After editing, **redeploy** the Apps Script:
1. Go back to Apps Script editor
2. Click **Deploy → New deployment**
3. Click **Deploy**

This prevents unauthorized submissions even if someone tries to bypass the website.

---

## Step 5: Deploy to GitHub Pages

1. Commit and push your changes to GitHub
2. Go to your repo on GitHub
3. Click **Settings** (top right)
4. Click **Pages** (left sidebar)
5. Under "Source", select:
   - Branch: **main**
   - Folder: **/ (root)**
6. Click **Save**
7. Wait 2-3 minutes
8. Visit your site at `yourusername.github.io/reponame`

For detailed help, see [GitHub Pages docs](https://docs.github.com/en/pages/getting-started-with-github-pages/creating-a-github-pages-site).

---

## Step 6: Test Everything

**Test on your phone or computer:**

1. Open your GitHub Pages site
2. Enter your secret code
3. Choose **Match Scouting**
4. Fill out a test form and submit
5. Check your Google Sheet — the data should appear
6. Go back and choose **Pit Scouting**
7. Fill out the form and take a photo
8. Submit and check the sheet again

**Test offline mode:**
1. Turn on airplane mode
2. Submit a form
3. Check that it shows "queued"
4. Turn off airplane mode
5. Click "Resend All"
6. Check that data appears in the sheet

---

## Using the Scouting App

### For Scouts

**First time:**
1. Open the website
2. Enter your team code (ask your team lead)
3. Choose Match Scouting or Pit Scouting

**Match Scouting:**
- 5 screens: Start → Auto → Teleop → Endgame → Misc/Submit
- Fill out each screen and click "Next"
- Submit sends data to Google Sheets

**Pit Scouting:**
- 2 screens: Team Info → Robot Design
- Take a photo of the robot
- Submit sends data and photo to Google Sheets

**If offline:**
- Forms save automatically
- Click "Resend All" when back online

### For Demo Mode (Other Teams)

1. Click "Demo Mode" on home screen
2. Explore all features
3. Input validation is disabled
4. Submissions are blocked
5. Perfect for sharing with allied teams

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| Teams don't load | Check `TBA_API_KEY` and `EVENT_KEY` in `js/config.js` |
| Submit fails | Make sure `WEBHOOK_URL` ends with `/exec` and Apps Script is deployed to "Anyone" |
| "Invalid team code" error | Add the code to `ALLOWED_CODES` in Apps Script, then redeploy |
| Wrong secret code | Check `SECRET_CODE` in `js/config.js` matches what scouts are entering |
| Redirects to home page | Session expired (tab closed) or secret code not entered |
| Camera won't open | Site must use HTTPS. Allow browser permission. Use file picker as backup |
| GitHub Pages 404 | Wait 5 minutes, clear browser cache, check Pages is enabled in repo settings |

**Debug tips:**
- Press **F12** to open browser console and see errors
- Check **Apps Script → Executions** tab to see backend errors

---

## Quick Reference

**Files to edit before each event:**
- `js/config.js` — **Update `EVENT_KEY`** for the new competition (this is hardcoded!)
- `js/config.js` — Update secret code if needed
- `appScript/combined-scouting-script.js` — Update allowed team codes (then redeploy!)
- `match-scouting.html` — Update default scout team numbers if needed

**Default team codes in match scouting:**
- Edit `match-scouting.html` and search for `<option value=`
- Update team numbers for your alliance

---

## Need Help?

Check the [Technical Whitepaper](TECHNICAL_WHITEPAPER.md) for detailed explanations of how everything works.
