/**
 * database.js
 * -----------
 * Pure JavaScript JSON-file database for the AI Faceless Instagram Mastery platform.
 * No native modules required — works on any system with Node.js.
 * Data is persisted to data/db.json and auto-saved on every write.
 */

const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

// ---------------------------------------------------------------------------
// File-based storage
// ---------------------------------------------------------------------------

const DATA_DIR = path.join(__dirname, 'data');
const DB_PATH = path.join(DATA_DIR, 'db.json');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Default database structure
const DEFAULT_DB = {
  users: [],
  payments: [],
  contacts: [],
  testimonials: [],
  analytics: []
};

// Load or initialize database
let db;
try {
  if (fs.existsSync(DB_PATH)) {
    const raw = fs.readFileSync(DB_PATH, 'utf-8');
    db = JSON.parse(raw);
    // Ensure all collections exist
    for (const key of Object.keys(DEFAULT_DB)) {
      if (!Array.isArray(db[key])) db[key] = [];
    }
  } else {
    db = JSON.parse(JSON.stringify(DEFAULT_DB));
  }
} catch (err) {
  console.warn('[DB] Failed to load database, starting fresh:', err.message);
  db = JSON.parse(JSON.stringify(DEFAULT_DB));
}

// Debounced save to prevent excessive writes
let saveTimeout = null;
function save() {
  if (saveTimeout) clearTimeout(saveTimeout);
  saveTimeout = setTimeout(() => {
    try {
      fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2), 'utf-8');
    } catch (err) {
      console.error('[DB] Failed to save database:', err.message);
    }
  }, 100);
}

// Force save (for shutdown)
function saveSync() {
  try {
    fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2), 'utf-8');
  } catch (err) {
    console.error('[DB] Failed to save database:', err.message);
  }
}

function getDb() {
  return db;
}

// =========================================================================
// USERS
// =========================================================================

function createUser({ name, email, phone, password }) {
  const id = uuidv4();
  const user = {
    id,
    name,
    email: email.toLowerCase().trim(),
    phone: phone || null,
    password,
    is_enrolled: 0,
    enrolled_at: null,
    created_at: new Date().toISOString()
  };
  db.users.push(user);
  save();
  return { ...user };
}

function getUserById(id) {
  return db.users.find(u => u.id === id) || null;
}

function getUserByEmail(email) {
  return db.users.find(u => u.email === email.toLowerCase().trim()) || null;
}

function getAllUsers({ page = 1, limit = 20 } = {}) {
  const sorted = [...db.users].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  const total = sorted.length;
  const totalPages = Math.ceil(total / limit);
  const offset = (page - 1) * limit;
  const users = sorted.slice(offset, offset + limit).map(u => {
    const { password, ...safe } = u;
    return safe;
  });
  return { users, total, page, limit, totalPages };
}

function updateUser(id, fields) {
  const idx = db.users.findIndex(u => u.id === id);
  if (idx === -1) return null;
  const allowed = ['name', 'email', 'phone', 'password', 'is_enrolled', 'enrolled_at'];
  for (const [key, val] of Object.entries(fields)) {
    if (allowed.includes(key)) db.users[idx][key] = val;
  }
  save();
  return { ...db.users[idx] };
}

function deleteUser(id) {
  const idx = db.users.findIndex(u => u.id === id);
  if (idx === -1) return false;
  db.users.splice(idx, 1);
  save();
  return true;
}

function enrollUser(userId) {
  const idx = db.users.findIndex(u => u.id === userId);
  if (idx === -1) return null;
  db.users[idx].is_enrolled = 1;
  db.users[idx].enrolled_at = new Date().toISOString();
  save();
  return { ...db.users[idx] };
}

// =========================================================================
// PAYMENTS
// =========================================================================

function createPayment({ userId, razorpayOrderId, amount, currency }) {
  const id = uuidv4();
  const payment = {
    id,
    user_id: userId,
    razorpay_order_id: razorpayOrderId,
    razorpay_payment_id: null,
    razorpay_signature: null,
    amount,
    currency: currency || 'INR',
    status: 'created',
    created_at: new Date().toISOString()
  };
  db.payments.push(payment);
  save();
  return { ...payment };
}

function getPaymentById(id) {
  return db.payments.find(p => p.id === id) || null;
}

function getPaymentByOrderId(orderId) {
  return db.payments.find(p => p.razorpay_order_id === orderId) || null;
}

function getAllPayments({ page = 1, limit = 20 } = {}) {
  const sorted = [...db.payments].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  const total = sorted.length;
  const totalPages = Math.ceil(total / limit);
  const offset = (page - 1) * limit;
  const payments = sorted.slice(offset, offset + limit).map(p => {
    const user = db.users.find(u => u.id === p.user_id);
    return { ...p, user_name: user?.name || null, user_email: user?.email || null };
  });
  return { payments, total, page, limit, totalPages };
}

function updatePaymentStatus(id, { status, razorpayPaymentId, razorpaySignature }) {
  const idx = db.payments.findIndex(p => p.id === id);
  if (idx === -1) return null;
  db.payments[idx].status = status;
  if (razorpayPaymentId) db.payments[idx].razorpay_payment_id = razorpayPaymentId;
  if (razorpaySignature) db.payments[idx].razorpay_signature = razorpaySignature;
  save();
  return { ...db.payments[idx] };
}

// =========================================================================
// CONTACTS
// =========================================================================

function createContact({ name, email, subject, message }) {
  const id = uuidv4();
  const contact = {
    id, name, email,
    subject: subject || null,
    message,
    is_read: 0,
    created_at: new Date().toISOString()
  };
  db.contacts.push(contact);
  save();
  return { ...contact };
}

function getContactById(id) {
  return db.contacts.find(c => c.id === id) || null;
}

function getAllContacts({ page = 1, limit = 20 } = {}) {
  const sorted = [...db.contacts].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  const total = sorted.length;
  const totalPages = Math.ceil(total / limit);
  const offset = (page - 1) * limit;
  const contacts = sorted.slice(offset, offset + limit);
  return { contacts, total, page, limit, totalPages };
}

function markContactRead(id) {
  const idx = db.contacts.findIndex(c => c.id === id);
  if (idx === -1) return null;
  db.contacts[idx].is_read = 1;
  save();
  return { ...db.contacts[idx] };
}

function deleteContact(id) {
  const idx = db.contacts.findIndex(c => c.id === id);
  if (idx === -1) return false;
  db.contacts.splice(idx, 1);
  save();
  return true;
}

// =========================================================================
// TESTIMONIALS
// =========================================================================

function createTestimonial({ name, role, avatarUrl, rating, text }) {
  const id = uuidv4();
  const testimonial = {
    id, name,
    role: role || null,
    avatar_url: avatarUrl || null,
    rating: rating ?? 5,
    text,
    is_visible: 1,
    created_at: new Date().toISOString()
  };
  db.testimonials.push(testimonial);
  save();
  return { ...testimonial };
}

function getTestimonialById(id) {
  return db.testimonials.find(t => t.id === id) || null;
}

function getVisibleTestimonials() {
  return db.testimonials
    .filter(t => t.is_visible === 1)
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
}

function getAllTestimonials() {
  return [...db.testimonials].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
}

function updateTestimonial(id, fields) {
  const idx = db.testimonials.findIndex(t => t.id === id);
  if (idx === -1) return null;
  const allowed = ['name', 'role', 'avatar_url', 'rating', 'text', 'is_visible'];
  for (const [key, val] of Object.entries(fields)) {
    if (allowed.includes(key)) db.testimonials[idx][key] = val;
  }
  save();
  return { ...db.testimonials[idx] };
}

function deleteTestimonial(id) {
  const idx = db.testimonials.findIndex(t => t.id === id);
  if (idx === -1) return false;
  db.testimonials.splice(idx, 1);
  save();
  return true;
}

// =========================================================================
// ANALYTICS
// =========================================================================

function trackEvent({ event, data, ip, userAgent }) {
  db.analytics.push({
    id: db.analytics.length + 1,
    event,
    data: data || null,
    ip: ip || null,
    user_agent: userAgent || null,
    created_at: new Date().toISOString()
  });
  save();
}

function getAnalyticsEvents({ event, limit = 100 } = {}) {
  let results = [...db.analytics].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  if (event) results = results.filter(e => e.event === event);
  return results.slice(0, limit);
}

// =========================================================================
// STATS
// =========================================================================

function getTotalUsers() {
  return db.users.length;
}

function getTotalEnrollments() {
  return db.users.filter(u => u.is_enrolled === 1).length;
}

function getTotalRevenue() {
  return db.payments
    .filter(p => p.status === 'paid')
    .reduce((sum, p) => sum + p.amount, 0);
}

function getRecentPayments(limit = 5) {
  return [...db.payments]
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    .slice(0, limit)
    .map(p => {
      const user = db.users.find(u => u.id === p.user_id);
      return { ...p, user_name: user?.name || null, user_email: user?.email || null };
    });
}

function getRecentContacts(limit = 5) {
  return [...db.contacts]
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    .slice(0, limit);
}

// =========================================================================
// SEED
// =========================================================================

function seed() {
  let changed = false;

  // Seed testimonials
  if (db.testimonials.length === 0) {
    const defaults = [
      {
        name: 'Arjun Mehta', role: 'College Student', rating: 5,
        text: 'I had zero experience with Instagram. Within 3 weeks of following the system, I had my first 1K followers. The AI tools section alone is worth the entire course price!'
      },
      {
        name: 'Priya Sharma', role: 'Freelance Designer', rating: 5,
        text: 'The content machine setup module changed everything for me. I now create a week\'s worth of content in just 2 hours using the workflow taught in this course.'
      },
      {
        name: 'Rohit Verma', role: 'Aspiring Creator', rating: 5,
        text: 'Best investment I\'ve made. The viral hooks library and the brand deal templates are incredibly practical. I\'ve already started getting collaboration inquiries!'
      },
      {
        name: 'Sneha Gupta', role: 'Marketing Student', rating: 5,
        text: 'I was skeptical about running a faceless page, but this course showed me it\'s absolutely possible. The step-by-step approach makes it so easy to follow along.'
      }
    ];
    const avatars = ['testimonial_1.png', 'testimonial_2.png', 'testimonial_3.png', 'testimonial_4.png'];
    defaults.forEach((t, i) => {
      db.testimonials.push({
        id: uuidv4(), ...t,
        avatar_url: avatars[i],
        is_visible: 1,
        created_at: new Date().toISOString()
      });
    });
    console.log('[DB] Seeded 4 default testimonials.');
    changed = true;
  }

  // Seed admin user
  const adminEmail = (process.env.ADMIN_EMAIL || 'admin@aifacelessig.com').toLowerCase();
  const adminPassword = process.env.ADMIN_PASSWORD || 'Admin@123456';
  if (!db.users.find(u => u.email === adminEmail)) {
    const hashedPassword = bcrypt.hashSync(adminPassword, 10);
    db.users.push({
      id: uuidv4(),
      name: 'Admin',
      email: adminEmail,
      phone: null,
      password: hashedPassword,
      is_enrolled: 1,
      enrolled_at: new Date().toISOString(),
      created_at: new Date().toISOString()
    });
    console.log(`[DB] Seeded admin user (${adminEmail}).`);
    changed = true;
  }

  if (changed) saveSync();
}

// Save on process exit
process.on('exit', saveSync);
process.on('SIGINT', () => { saveSync(); process.exit(0); });
process.on('SIGTERM', () => { saveSync(); process.exit(0); });

// =========================================================================
// Exports
// =========================================================================

module.exports = {
  getDb,

  // Users
  createUser, getUserById, getUserByEmail, getAllUsers,
  updateUser, deleteUser, enrollUser,

  // Payments
  createPayment, getPaymentById, getPaymentByOrderId,
  getAllPayments, updatePaymentStatus,

  // Contacts
  createContact, getContactById, getAllContacts,
  markContactRead, deleteContact,

  // Testimonials
  createTestimonial, getTestimonialById, getVisibleTestimonials,
  getAllTestimonials, updateTestimonial, deleteTestimonial,

  // Analytics
  trackEvent, getAnalyticsEvents,

  // Stats
  getTotalUsers, getTotalEnrollments, getTotalRevenue,
  getRecentPayments, getRecentContacts,

  // Seed
  seed
};
