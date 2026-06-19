🚀 AI Faceless Instagram Mastery
Full‑Stack Course Sales Platform
🔗 Deployed Link
Live Project: https://your-deployed-domain.com

✨ Overview
A complete platform to sell, manage, and deliver the AI Faceless Instagram Mastery course with authentication, payments, admin dashboard, testimonials, and more.

👨‍🎓 User Features
Register & Login

JWT Authentication

Secure Password Hashing

Razorpay Payments

Auto Course Enrollment

Mobile‑Responsive UI

Contact Form

View Testimonials

🛠 Admin Features
Admin Dashboard

User Management

Enrollment Tracking

Revenue Analytics

Payment Records

Contact Message Management

Read/Unread Tracking

Testimonial CRUD

🏗 Tech Stack
Layer	Technology
Frontend	HTML, CSS, JavaScript
Backend	Node.js, Express.js
Auth	JWT, bcryptjs
Payments	Razorpay
Database	JSON File Storage
Security	Helmet, CORS


📂 Project Structure
Code
AI-Faceless-Instagram-Mastery/
├── data/db.json
├── public/
│   ├── index.html
│   ├── admin.html
│   ├── style.css
│   ├── script.js
│   └── testimonial_*.png
├── database.js
├── server.js
├── package.json
└── README.md
⚙️ Installation
1. Clone
bash
git clone https://github.com/ronit-a11y/AI-Faceless-Instagram-Mastery.git
cd AI-Faceless-Instagram-Mastery
2. Install
bash
npm install
3. Environment Variables
Create .env:

Code
PORT=3000
JWT_SECRET=your_jwt_secret

ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=your_admin_password

RAZORPAY_KEY_ID=your_key
RAZORPAY_KEY_SECRET=your_secret

COURSE_NAME=AI Faceless Instagram Mastery
COURSE_PRICE=499
COURSE_ORIGINAL_PRICE=1999
4. Run
bash
npm start
Dev mode:

bash
npm run dev
🔐 Admin Access
Visit:
http://localhost:3000/admin.html  
Login using credentials from .env.

💳 Payment Integration
Uses Razorpay.
If keys are missing, mock orders are used for development.

📡 API Endpoints
Auth
Code
POST /api/auth/register
POST /api/auth/login
GET  /api/auth/me
Payments
Code
POST /api/payments/create-order
POST /api/payments/verify
Contact
Code
POST /api/contact
Testimonials
Code
GET /api/testimonials
Admin
Code
GET    /api/admin/dashboard
GET    /api/admin/users
GET    /api/admin/payments
GET    /api/admin/contacts
PATCH  /api/admin/contacts/:id/read

GET    /api/admin/testimonials
POST   /api/admin/testimonials
PATCH  /api/admin/testimonials/:id
DELETE /api/admin/testimonials/:id
🔒 Security
JWT Auth

bcrypt Password Hashing

Helmet Headers

CORS Protection

Admin Route Guard

Razorpay Signature Verification

🚀 Deployment Notes
Use strong JWT secret

Add production Razorpay keys

Enable HTTPS

Restrict CORS

Secure environment variables

Replace JSON storage with a real DB

📜 License
Educational & commercial use allowed.
Add a license before accepting contributions.
