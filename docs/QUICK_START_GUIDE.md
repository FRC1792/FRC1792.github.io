# Quick Start Guide

Get running in 30 minutes.

## Prerequisites

- GitHub account
- Google account
- Blue Alliance account (thebluealliance.com)

## Step 1: Set Up Google Backend

1. Create a new Google Sheet
2. Go to **Extensions → Apps Script**
3. Delete default code and paste everything from `appScript/combined-scouting-script.js`
4. **Deploy → New deployment**
   - Type: **Web app**
   - Execute as: **Me**
   - Access: **Anyone**
5. Authorize and **copy the URL** (ends with `/exec`)

## Step 2: Get The Blue Alliance API Key

1. Visit thebluealliance.com/account
2. Under "Read API Keys", create new key
3. **Copy the key**

## Step 3: Configure Settings

**Edit `js/config.js`:**

```javascript
const SCOUTING_CONFIG = {
    WEBHOOK_URL: "paste-apps-script-url-here",
    TBA_API_KEY: "paste-tba-key-here",
    EVENT_KEY: "2026wiapp",  // your event code from TBA
    ENABLE_TEAM_LOADING: true,
    SECRET_CODE: "rtr1792"  // change this
};
```

**Edit `appScript/combined-scouting-script.js`:**

```javascript
const ALLOWED_CODES = ["rtr1792"];  // add allied team codes if needed
```

After editing Apps Script, make a new version of the depoloyment 
1. Head over to the appscript extensions
2. Click manage deployements 
3. Click on the edit icon on the top right 
4. Click on the version button and the new version option

## Step 4: Deploy to GitHub Pages

Refer to the github pages official documentation on how to set this up

## Step 5: Test

1. Open site on your phone
2. Submit test match and pit forms
3. Verify data in Google Sheet
4. Test offline mode: airplane mode → submit → go online → "Resend All"

## For Scouts

**Setup:**
Enter team code on first visit (saved in session, re-enter if tab closes)

**Match Scouting:**
Pick mode → enter name → select team → fill 5 screens → submit

**Pit Scouting:**
Pick mode → enter name → select team → take photo → submit

**Offline:**
Data saves automatically. Click "Resend All" when online.

**Demo Mode:**
Click "Demo Mode" to explore without submitting.

## Troubleshooting

| Problem | Fix |
|---------|-----|
| Teams don't load | Check `TBA_API_KEY` and `EVENT_KEY` in `js/config.js` |
| Submit fails | Verify webhook URL ends `/exec`, Apps Script deployed to "Anyone" |
| "Invalid team code" | Update `ALLOWED_CODES` in Apps Script, redeploy |
| Secret code rejected | Check `SECRET_CODE` in `js/config.js` |
| Redirect to home | Session expired or no code entered |
| Camera won't open | Needs HTTPS and permission |
| 404 on Pages | Wait 5 min, check Settings → Pages enabled |

Press F12 for browser console errors.
