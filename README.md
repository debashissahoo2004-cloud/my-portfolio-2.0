# Debasish Sahoo — Portfolio with Working Contact Form

A beautiful, fully-featured portfolio with a **real backend** and working contact form that sends actual emails.

---

## 🗂 Project Structure

```
portfolio/
├── public/
│   └── index.html          ← Your frontend (unchanged design)
├── server/
│   └── index.js            ← Express backend
├── .env.example            ← Copy this to .env and fill in credentials
├── package.json
└── README.md
```

---

## ⚡ Quick Start

### 1. Install dependencies
```bash
npm install
```

### 2. Configure email
```bash
cp .env.example .env
```
Open `.env` and fill in your Gmail credentials.

**Getting a Gmail App Password:**
1. Go to [myaccount.google.com](https://myaccount.google.com)
2. Security → 2-Step Verification (must be enabled)
3. App Passwords → Generate new → select "Mail" + "Other" → name it "Portfolio"
4. Copy the 16-character password into `EMAIL_PASS` in your `.env`

### 3. Run locally
```bash
npm start
# or for development with auto-restart:
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## 📬 How the Contact Form Works

When someone submits the form:

1. **Server validates** all inputs (name, email, message length, format)
2. **Rate limiting** blocks spam (max 5 messages per IP per 15 minutes)
3. **You receive** a nicely formatted email notification with the visitor's message + a reply-to set to their email
4. **They receive** an auto-reply confirming their message was received
5. **Errors** (misconfigured email, network issues) return clear messages to the user

---

## 🚀 Deploying to Production

### Option A — Render.com (Free)
1. Push to GitHub
2. Create a new **Web Service** on [render.com](https://render.com)
3. Set environment variables in the Render dashboard (from your `.env`)
4. Deploy — Render runs `npm start` automatically

### Option B — Railway
1. Push to GitHub
2. New project → Deploy from GitHub repo
3. Add environment variables in Railway dashboard
4. Done

### Option C — VPS / DigitalOcean
```bash
# Install Node.js, then:
npm install
cp .env.example .env   # fill in your values
npm install -g pm2
pm2 start server/index.js --name portfolio
pm2 save
pm2 startup
```

### Option D — Vercel (Serverless)
Vercel needs a small refactor — ask me and I'll convert `server/index.js` to a Vercel serverless function.

---

## 🛡 Security Features

- **Helmet.js** — sets secure HTTP headers
- **Rate limiting** — 5 contact requests per IP per 15 minutes
- **Input validation** — server-side, not just client-side
- **HTML escaping** — all user input is escaped before going into emails
- **Request size limit** — 10KB max body size

---

## 🔧 Customisation

| What | Where |
|------|-------|
| Change recipient email | `OWNER_EMAIL` in `.env` |
| Change rate limit | `windowMs` / `max` in `server/index.js` |
| Add reCAPTCHA | Install `express-recaptcha`, add secret key to `.env` |
| Use SendGrid instead of Gmail | Replace `nodemailer` transport with `@sendgrid/mail` |
