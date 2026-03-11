# Ads Reporting Dashboard

Live dashboard for **AI 网络自由创业** webinar registrations.
Mirrors your WhatsApp reporting format with auto-refresh every 5 minutes.

---

## Setup (3 steps)

### Step 1 — Deploy Google Apps Script

1. Open your Google Spreadsheet
2. Go to **Extensions → Apps Script**
3. Delete all existing code
4. Paste the entire contents of **`Code.gs`** from this repo
5. Click **Save** (Ctrl+S), then click **Deploy → New Deployment**
6. Settings:
   - Type: **Web App**
   - Execute as: **Me**
   - Who has access: **Anyone**
7. Click **Deploy** and authorize permissions
8. Copy the **Web App URL** (looks like `https://script.google.com/macros/s/ABC.../exec`)

> **Note:** Every time you change `Code.gs`, you must create a **New Deployment** (not update an existing one) and copy the new URL.

---

### Step 2 — Deploy to Vercel

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new)

1. Push this repo to GitHub
2. Go to [vercel.com](https://vercel.com) → **New Project** → Import from GitHub
3. Add the environment variable:
   - **Name:** `APPS_SCRIPT_URL`
   - **Value:** (the URL from Step 1)
4. Click **Deploy**

---

### Step 3 — Add GitHub Secret (for daily snapshots)

For the nightly data snapshot workflow:

1. Go to your GitHub repo → **Settings → Secrets and variables → Actions**
2. Add a secret:
   - **Name:** `APPS_SCRIPT_URL`
   - **Value:** (the URL from Step 1)

---

## Features

| Feature | Details |
|---|---|
| Live data | Fetches from Google Sheets via Apps Script |
| Auto-refresh | Every 5 minutes (with countdown timer) |
| Copy WhatsApp | One-click copy of the full WhatsApp report |
| Daily snapshot | GitHub Action saves JSON snapshot at 11:59 PM MYT |
| Auto-deploy | Vercel redeploys when you push to GitHub |

---

## Data Sources

| Sheet Tab | Contents |
|---|---|
| `COUNT1` | Registration counts + daily changes per source |
| `Daily Reporting` | Daily ads spent, views, optins, CPL |

---

## Tax Formula

```
Price with tax = amount × 1.08 + amount × 0.0869537037037037
             = amount × 1.1669537037037037
```

---

## Local Development

```bash
# Copy env file
cp .env.example .env.local
# Edit .env.local and add your APPS_SCRIPT_URL

npm install
npm run dev
# Open http://localhost:3000
```
