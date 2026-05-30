require('dotenv').config();
const express = require('express');
const nodemailer = require('nodemailer');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// ── SECURITY MIDDLEWARE ──────────────────────────────────────────────
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "cdnjs.cloudflare.com", "fonts.googleapis.com"],
      styleSrc:  ["'self'", "'unsafe-inline'", "fonts.googleapis.com"],
      fontSrc:   ["'self'", "fonts.gstatic.com", "fonts.googleapis.com"],
      imgSrc:    ["'self'", "data:"],
      connectSrc: ["'self'"],
    },
  },
}));
app.use(cors({ origin: process.env.ALLOWED_ORIGIN || '*' }));
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// ── RATE LIMITING ────────────────────────────────────────────────────
const contactLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5,                    // max 5 requests per window per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'Too many messages sent. Please wait 15 minutes before trying again.',
  },
});

// ── STATIC FILES ─────────────────────────────────────────────────────
app.use(express.static(path.join(__dirname, '../public')));

// ── EMAIL TRANSPORTER ────────────────────────────────────────────────
function createTransporter() {
  // Supports Gmail (default), or any SMTP via env vars
  if (process.env.EMAIL_SERVICE === 'gmail') {
    return nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS, // Use Gmail App Password (not account password)
      },
    });
  }
  // Generic SMTP fallback
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });
}

// ── INPUT VALIDATION ─────────────────────────────────────────────────
function validateContactInput({ name, email, subject, message }) {
  const errors = [];

  if (!name || typeof name !== 'string' || name.trim().length < 2) {
    errors.push('Name must be at least 2 characters.');
  }
  if (name && name.trim().length > 100) {
    errors.push('Name must be under 100 characters.');
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!email || !emailRegex.test(email.trim())) {
    errors.push('A valid email address is required.');
  }

  if (subject && subject.trim().length > 200) {
    errors.push('Subject must be under 200 characters.');
  }

  if (!message || typeof message !== 'string' || message.trim().length < 10) {
    errors.push('Message must be at least 10 characters.');
  }
  if (message && message.trim().length > 5000) {
    errors.push('Message must be under 5000 characters.');
  }

  return errors;
}

// ── CONTACT ENDPOINT ─────────────────────────────────────────────────
app.post('/api/contact', contactLimiter, async (req, res) => {
  const { name, email, subject, message } = req.body;

  // Validate
  const errors = validateContactInput({ name, email, subject, message });
  if (errors.length > 0) {
    return res.status(400).json({ success: false, error: errors[0] });
  }

  const cleanName    = name.trim();
  const cleanEmail   = email.trim().toLowerCase();
  const cleanSubject = (subject || 'Portfolio Contact').trim();
  const cleanMessage = message.trim();

  // Check env config
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.error('EMAIL_USER or EMAIL_PASS not set in .env');
    return res.status(500).json({
      success: false,
      error: 'Server email is not configured yet. Please reach out directly at debashissahoo2004@gmail.com',
    });
  }

  try {
    const transporter = createTransporter();

    // Email TO Debasish (notification)
    const toOwner = {
      from: `"Portfolio Contact" <${process.env.EMAIL_USER}>`,
      to: process.env.OWNER_EMAIL || process.env.EMAIL_USER,
      replyTo: cleanEmail,
      subject: `[Portfolio] ${cleanSubject}`,
      html: `
        <div style="font-family:sans-serif;max-width:600px;margin:0 auto;background:#03050d;color:#dde6f5;padding:32px;border:1px solid rgba(94,161,255,0.15)">
          <h2 style="color:#5ea1ff;margin-top:0;font-size:1.4rem">New Portfolio Message</h2>
          <table style="width:100%;border-collapse:collapse">
            <tr><td style="padding:8px 0;color:#8899bb;width:90px">From</td><td style="padding:8px 0"><strong style="color:#dde6f5">${escapeHtml(cleanName)}</strong></td></tr>
            <tr><td style="padding:8px 0;color:#8899bb">Email</td><td style="padding:8px 0"><a href="mailto:${escapeHtml(cleanEmail)}" style="color:#5ea1ff">${escapeHtml(cleanEmail)}</a></td></tr>
            <tr><td style="padding:8px 0;color:#8899bb">Subject</td><td style="padding:8px 0;color:#dde6f5">${escapeHtml(cleanSubject)}</td></tr>
          </table>
          <hr style="border:none;border-top:1px solid rgba(94,161,255,0.15);margin:20px 0"/>
          <p style="color:#8899bb;margin-bottom:8px;font-size:.85rem">Message:</p>
          <div style="background:#0d1526;border-left:3px solid #5ea1ff;padding:16px;white-space:pre-wrap;line-height:1.7;color:#dde6f5">${escapeHtml(cleanMessage)}</div>
          <p style="color:#4a5e80;font-size:.75rem;margin-top:24px">Sent via debasishsahoo.dev portfolio contact form</p>
        </div>
      `,
    };

    // Auto-reply TO sender
    const autoReply = {
      from: `"Debasish Sahoo" <${process.env.EMAIL_USER}>`,
      to: cleanEmail,
      subject: `Got your message — Debasish Sahoo`,
      html: `
        <div style="font-family:sans-serif;max-width:600px;margin:0 auto;background:#03050d;color:#dde6f5;padding:32px;border:1px solid rgba(94,161,255,0.15)">
          <h2 style="color:#5ea1ff;margin-top:0">Hey ${escapeHtml(cleanName.split(' ')[0])} 👋</h2>
          <p style="color:#8899bb;line-height:1.8">Thanks for reaching out! I've received your message and will get back to you within <strong style="color:#dde6f5">24 hours</strong>.</p>
          <div style="background:#0d1526;border-left:3px solid rgba(94,161,255,0.4);padding:16px;margin:24px 0;color:#8899bb;font-size:.9rem">
            <em style="color:#4a5e80">Your message:</em><br/><br/>
            <span style="color:#dde6f5">${escapeHtml(cleanMessage)}</span>
          </div>
          <p style="color:#8899bb;line-height:1.8">In the meantime, feel free to explore my work or connect with me on LinkedIn.</p>
          <p style="color:#dde6f5;margin-top:32px">— Debasish Sahoo<br/>
            <span style="color:#5ea1ff;font-size:.85rem">Frontend Developer · debasishsahoo.dev</span>
          </p>
        </div>
      `,
    };

    await transporter.sendMail(toOwner);
    await transporter.sendMail(autoReply);

    console.log(`✓ Contact email from ${cleanEmail} sent successfully`);
    res.json({ success: true, message: "Message sent! I'll get back to you within 24 hours." });

  } catch (err) {
    console.error('Email send error:', err.message);
    res.status(500).json({
      success: false,
      error: 'Failed to send message. Please try emailing me directly at debashissahoo2004@gmail.com',
    });
  }
});

// ── HEALTH CHECK ─────────────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ── SPA FALLBACK ─────────────────────────────────────────────────────
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

// ── START ────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n🚀 Portfolio server running on http://localhost:${PORT}`);
  console.log(`   Email configured: ${process.env.EMAIL_USER ? '✓' : '✗ (set EMAIL_USER in .env)'}\n`);
});

// ── HELPERS ──────────────────────────────────────────────────────────
function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
