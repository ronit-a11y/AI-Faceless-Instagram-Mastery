/**
 * server.js
 * ---------
 * Main Express server for the AI Faceless Instagram Mastery platform.
 * Provides REST API routes for auth, payments (Razorpay), contacts,
 * admin dashboard, and public course info / testimonials.
 */

require('dotenv').config();

const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const path = require('path');

const db = require('./database');

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-change-me';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@aifacelessig.com';
const RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID || '';
const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET || '';

const COURSE_PRICE = parseInt(process.env.COURSE_PRICE, 10) || 499;          // ₹
const COURSE_ORIGINAL_PRICE = parseInt(process.env.COURSE_ORIGINAL_PRICE, 10) || 1999;
const COURSE_NAME = process.env.COURSE_NAME || 'AI Faceless Instagram Mastery';

// Warn (but don't crash) if Razorpay keys are still placeholders / missing.
let razorpayInstance = null;

try {
  if (
    RAZORPAY_KEY_ID &&
    RAZORPAY_KEY_SECRET &&
    !RAZORPAY_KEY_ID.includes('XXXX') &&
    !RAZORPAY_KEY_SECRET.includes('XXXX')
  ) {
    const Razorpay = require('razorpay');
    razorpayInstance = new Razorpay({
      key_id: RAZORPAY_KEY_ID,
      key_secret: RAZORPAY_KEY_SECRET
    });
    console.log('[Server] Razorpay initialised with provided keys.');
  } else {
    console.warn(
      '[Server] ⚠  Razorpay keys are missing or contain placeholder values. ' +
      'Payment creation will return mock order IDs. Replace the keys in .env for production use.'
    );
  }
} catch (err) {
  console.warn('[Server] ⚠  Failed to initialise Razorpay:', err.message);
}

// ---------------------------------------------------------------------------
// App setup
// ---------------------------------------------------------------------------

const app = express();

app.use(helmet({ contentSecurityPolicy: false })); // relaxed CSP for SPA serving
app.use(cors());
app.use(express.json());

// Serve static files from the public directory
app.use(express.static(path.join(__dirname, 'public')));

// ---------------------------------------------------------------------------
// Middleware helpers
// ---------------------------------------------------------------------------

/**
 * JWT authentication middleware.
 * Expects header: Authorization: Bearer <token>
 * On success attaches the decoded user payload to `req.user`.
 */
function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: 'Authentication required. Please provide a valid token.' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    // Hydrate with fresh DB data so enrollment status etc. are up-to-date.
    const user = db.getUserById(decoded.id);
    if (!user) {
      return res.status(401).json({ success: false, message: 'User no longer exists.' });
    }
    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ success: false, message: 'Invalid or expired token.' });
  }
}

/**
 * Admin-only middleware. Must be used AFTER authMiddleware.
 */
function adminMiddleware(req, res, next) {
  if (!req.user || req.user.email !== ADMIN_EMAIL) {
    return res.status(403).json({ success: false, message: 'Access denied. Admin privileges required.' });
  }
  next();
}

/**
 * Generate a JWT token for a given user row.
 */
function generateToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}

/**
 * Strip password from a user object before sending to the client.
 */
function sanitiseUser(user) {
  if (!user) return null;
  const { password, ...safe } = user;
  return safe;
}

// =========================================================================
// AUTH ROUTES  —  /api/auth
// =========================================================================

/**
 * POST /api/auth/register
 * Body: { name, email, phone?, password }
 */
app.post('/api/auth/register', (req, res, next) => {
  try {
    const { name, email, phone, password } = req.body;

    // --- Validation ---
    if (!name || !email || !password) {
      return res.status(400).json({ success: false, message: 'Name, email and password are required.' });
    }
    if (password.length < 6) {
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters.' });
    }

    // Check for duplicate email
    const existing = db.getUserByEmail(email);
    if (existing) {
      return res.status(409).json({ success: false, message: 'An account with this email already exists.' });
    }

    const hashedPassword = bcrypt.hashSync(password, 10);
    const user = db.createUser({ name, email, phone, password: hashedPassword });
    const token = generateToken(user);

    res.status(201).json({
      success: true,
      message: 'Registration successful.',
      token,
      user: sanitiseUser(user)
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/auth/login
 * Body: { email, password }
 */
app.post('/api/auth/login', (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password are required.' });
    }

    const user = db.getUserByEmail(email);
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    }

    const isMatch = bcrypt.compareSync(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    }

    const token = generateToken(user);

    res.json({
      success: true,
      message: 'Login successful.',
      token,
      user: sanitiseUser(user)
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/auth/me
 * Returns the currently authenticated user's profile.
 */
app.get('/api/auth/me', authMiddleware, (req, res) => {
  res.json({ success: true, user: sanitiseUser(req.user) });
});

// =========================================================================
// PAYMENT ROUTES  —  /api/payments
// =========================================================================

/**
 * POST /api/payments/create-order
 * Creates a Razorpay order for ₹499 (49900 paise). Requires auth.
 */
app.post('/api/payments/create-order', authMiddleware, async (req, res, next) => {
  try {
    const amountInPaise = COURSE_PRICE * 100; // e.g. 49900

    let razorpayOrderId;

    if (razorpayInstance) {
      // Real Razorpay order
      const order = await razorpayInstance.orders.create({
        amount: amountInPaise,
        currency: 'INR',
        receipt: `receipt_${uuidv4().slice(0, 8)}`,
        notes: { user_id: req.user.id, course: COURSE_NAME }
      });
      razorpayOrderId = order.id;
    } else {
      // Mock order ID for development / placeholder keys
      razorpayOrderId = `order_mock_${uuidv4().slice(0, 12)}`;
      console.warn('[Payments] Razorpay not configured — returning mock order ID:', razorpayOrderId);
    }

    // Persist payment record in our database
    const payment = db.createPayment({
      userId: req.user.id,
      razorpayOrderId,
      amount: amountInPaise,
      currency: 'INR'
    });

    res.json({
      success: true,
      order_id: razorpayOrderId,
      amount: amountInPaise,
      currency: 'INR',
      key_id: RAZORPAY_KEY_ID,
      payment_id: payment.id
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/payments/verify
 * Body: { razorpay_order_id, razorpay_payment_id, razorpay_signature }
 * Verifies the Razorpay payment signature, marks payment as 'paid',
 * and enrols the user.
 */
app.post('/api/payments/verify', authMiddleware, (req, res, next) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({ success: false, message: 'Missing payment verification fields.' });
    }

    // Find the corresponding payment record
    const payment = db.getPaymentByOrderId(razorpay_order_id);
    if (!payment) {
      return res.status(404).json({ success: false, message: 'Payment record not found for this order.' });
    }

    // Verify the signature using HMAC SHA256
    const expectedSignature = crypto
      .createHmac('sha256', RAZORPAY_KEY_SECRET)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest('hex');

    if (expectedSignature !== razorpay_signature) {
      // Update status to 'failed' so we have a record
      db.updatePaymentStatus(payment.id, {
        status: 'failed',
        razorpayPaymentId: razorpay_payment_id,
        razorpaySignature: razorpay_signature
      });
      return res.status(400).json({ success: false, message: 'Payment verification failed. Invalid signature.' });
    }

    // Signature valid – mark as paid
    db.updatePaymentStatus(payment.id, {
      status: 'paid',
      razorpayPaymentId: razorpay_payment_id,
      razorpaySignature: razorpay_signature
    });

    // Enrol the user
    const user = db.enrollUser(req.user.id);

    res.json({
      success: true,
      message: 'Payment verified successfully. You are now enrolled!',
      user: sanitiseUser(user)
    });
  } catch (err) {
    next(err);
  }
});

// =========================================================================
// CONTACT ROUTES  —  /api/contact
// =========================================================================

/**
 * POST /api/contact
 * Body: { name, email, subject?, message }
 * No auth required.
 */
app.post('/api/contact', (req, res, next) => {
  try {
    const { name, email, subject, message } = req.body;

    if (!name || !email || !message) {
      return res.status(400).json({ success: false, message: 'Name, email and message are required.' });
    }

    const contact = db.createContact({ name, email, subject, message });

    res.status(201).json({
      success: true,
      message: 'Your message has been received. We will get back to you shortly!',
      contact
    });
  } catch (err) {
    next(err);
  }
});

// =========================================================================
// ADMIN ROUTES  —  /api/admin
// =========================================================================

// All admin routes require both auth + admin privileges.
app.use('/api/admin', authMiddleware, adminMiddleware);

/**
 * GET /api/admin/dashboard
 * Aggregate stats for the admin dashboard.
 */
app.get('/api/admin/dashboard', (req, res, next) => {
  try {
    const totalUsers = db.getTotalUsers();
    const totalEnrollments = db.getTotalEnrollments();
    const totalRevenue = db.getTotalRevenue();
    const recentPayments = db.getRecentPayments(5);
    const recentContacts = db.getRecentContacts(5);

    res.json({
      success: true,
      stats: {
        totalUsers,
        totalEnrollments,
        totalRevenue,         // in paise
        totalRevenueFormatted: `₹${(totalRevenue / 100).toLocaleString('en-IN')}`,
        recentPayments,
        recentContacts
      }
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/admin/users?page=1&limit=20
 */
app.get('/api/admin/users', (req, res, next) => {
  try {
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 20, 1), 100);
    const result = db.getAllUsers({ page, limit });
    res.json({ success: true, ...result });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/admin/payments?page=1&limit=20
 */
app.get('/api/admin/payments', (req, res, next) => {
  try {
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 20, 1), 100);
    const result = db.getAllPayments({ page, limit });
    res.json({ success: true, ...result });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/admin/contacts
 */
app.get('/api/admin/contacts', (req, res, next) => {
  try {
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 20, 1), 100);
    const result = db.getAllContacts({ page, limit });
    res.json({ success: true, ...result });
  } catch (err) {
    next(err);
  }
});

/**
 * PATCH /api/admin/contacts/:id/read
 */
app.patch('/api/admin/contacts/:id/read', (req, res, next) => {
  try {
    const contact = db.getContactById(req.params.id);
    if (!contact) {
      return res.status(404).json({ success: false, message: 'Contact not found.' });
    }
    const updated = db.markContactRead(req.params.id);
    res.json({ success: true, contact: updated });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/admin/testimonials
 */
app.get('/api/admin/testimonials', (req, res, next) => {
  try {
    const testimonials = db.getAllTestimonials();
    res.json({ success: true, testimonials });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/admin/testimonials
 * Body: { name, role?, avatarUrl?, rating?, text }
 */
app.post('/api/admin/testimonials', (req, res, next) => {
  try {
    const { name, role, avatarUrl, rating, text } = req.body;
    if (!name || !text) {
      return res.status(400).json({ success: false, message: 'Name and text are required.' });
    }
    const testimonial = db.createTestimonial({ name, role, avatarUrl, rating, text });
    res.status(201).json({ success: true, testimonial });
  } catch (err) {
    next(err);
  }
});

/**
 * PATCH /api/admin/testimonials/:id
 * Body: any of { name, role, avatar_url, rating, text, is_visible }
 */
app.patch('/api/admin/testimonials/:id', (req, res, next) => {
  try {
    const existing = db.getTestimonialById(req.params.id);
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Testimonial not found.' });
    }
    const updated = db.updateTestimonial(req.params.id, req.body);
    res.json({ success: true, testimonial: updated });
  } catch (err) {
    next(err);
  }
});

/**
 * DELETE /api/admin/testimonials/:id
 */
app.delete('/api/admin/testimonials/:id', (req, res, next) => {
  try {
    const existing = db.getTestimonialById(req.params.id);
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Testimonial not found.' });
    }
    db.deleteTestimonial(req.params.id);
    res.json({ success: true, message: 'Testimonial deleted.' });
  } catch (err) {
    next(err);
  }
});

// =========================================================================
// PUBLIC ROUTES
// =========================================================================

/**
 * GET /api/testimonials
 * Returns only visible testimonials for the public-facing site.
 */
app.get('/api/testimonials', (req, res, next) => {
  try {
    const testimonials = db.getVisibleTestimonials();
    res.json({ success: true, testimonials });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/course-info
 * Returns basic course metadata for the landing page.
 */
app.get('/api/course-info', (req, res) => {
  res.json({
    success: true,
    course: {
      name: COURSE_NAME,
      price: COURSE_PRICE,
      originalPrice: COURSE_ORIGINAL_PRICE,
      currency: 'INR',
      discount: Math.round(((COURSE_ORIGINAL_PRICE - COURSE_PRICE) / COURSE_ORIGINAL_PRICE) * 100),
      features: [
        'Complete AI Content Creation Toolkit',
        'Instagram Growth Strategies',
        'Faceless Reels Automation',
        'Hashtag & Caption Generator',
        'Monetisation Blueprint',
        'Private Community Access',
        'Lifetime Updates'
      ],
      featuresCount: 7
    }
  });
});

// =========================================================================
// SPA fallback — serve index.html for any non-API route
// =========================================================================

app.get('*', (req, res, next) => {
  // Only intercept non-API routes
  if (req.path.startsWith('/api')) {
    return next();
  }
  const indexPath = path.join(__dirname, 'public', 'index.html');
  res.sendFile(indexPath, (err) => {
    if (err) {
      // If no index.html exists yet, just send a simple response
      res.status(200).send('AI Faceless Instagram Mastery — Backend is running.');
    }
  });
});

// =========================================================================
// Global error handler
// =========================================================================

// 404 handler for unknown API routes
app.use('/api', (req, res) => {
  res.status(404).json({ success: false, message: `Route ${req.method} ${req.originalUrl} not found.` });
});

// Central error-handling middleware
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, _next) => {
  console.error('[Error]', err.stack || err.message || err);

  // Handle specific error types
  if (err.code === 'SQLITE_CONSTRAINT_UNIQUE') {
    return res.status(409).json({ success: false, message: 'A record with that value already exists.' });
  }

  const statusCode = err.statusCode || 500;
  res.status(statusCode).json({
    success: false,
    message: process.env.NODE_ENV === 'production'
      ? 'An internal server error occurred.'
      : err.message || 'Internal Server Error'
  });
});

// ---------------------------------------------------------------------------
// Bootstrap
// ---------------------------------------------------------------------------

// Seed default data (admin user + testimonials) on startup.
db.seed();

app.listen(PORT, () => {
  console.log('');
  console.log('='.repeat(58));
  console.log('  AI Faceless Instagram Mastery — Server');
  console.log('='.repeat(58));
  console.log(`  URL        : http://localhost:${PORT}`);
  console.log(`  Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`  Admin      : ${ADMIN_EMAIL}`);
  console.log(`  Razorpay   : ${razorpayInstance ? 'Configured ✓' : 'Not configured (mock mode)'}`);
  console.log('='.repeat(58));
  console.log('');
});
