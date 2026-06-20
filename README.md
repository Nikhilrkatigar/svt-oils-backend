# 🫙 SVT Oils — Ordering Platform

A mobile-first B2B/B2C oil ordering web app built in MERN stack.
Designed to be so simple that a 90-year-old can use it.

---

## 📁 Project Structure

```
svt-oils/
├── svt-oils-frontend/    ← React + Vite (Customer & Admin UI)
└── svt-oils-backend/     ← Node.js + Express + MongoDB (REST API)
```

---

## ⚡ Quick Start (Local)

### Prerequisites
- Node.js 18+
- MongoDB (local) OR a free MongoDB Atlas cluster

---

### 1. Backend Setup

```bash
cd svt-oils-backend
npm install

# Copy and fill in your env file
cp .env.example .env
```

Edit `.env`:
```
MONGO_URI=mongodb://localhost:27017/svt-oils
JWT_SECRET=any_long_random_string_here
ADMIN_PHONE=9999999999        ← your phone number (gets admin access)
ADMIN_PASSWORD=admin1234%     ← admin login password
```

```bash
npm run dev
# API running at http://localhost:5000
```

---

### 2. Seed Products (one time)

After backend starts, hit this endpoint to seed all 44 products from your price lists:

```
POST http://localhost:5000/api/products/admin/seed
Authorization: Bearer <your-admin-token>
```

Or use curl after logging in as admin:
```bash
curl -X POST http://localhost:5000/api/products/admin/seed \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

### 3. Frontend Setup

```bash
cd svt-oils-frontend
npm install
npm run dev
# App running at http://localhost:3000
```

---

## 🔑 How Login Works

1. Customer enters their 10-digit mobile number
2. Customer enters their password
3. Backend verifies the password and returns a JWT session token

**First-time users** must register with name, phone number, delivery address, and password.

---

## 👑 Admin Access

Set `ADMIN_PHONE` and `ADMIN_PASSWORD` in `.env`.
On backend startup, that admin account is created or updated automatically.

Default local admin:
- Phone: `9999999999`
- Password: `admin1234%`

Admin can:
- View all orders + update status (Pending → Confirmed → Out for Delivery → Delivered)
- Add / Edit / Delete products
- Add product images by uploading a file or pasting an image URL
- Uploaded product images are stored in MongoDB with the product record, so redeploys do not remove them
- Set discount prices (triggers scratch animation on frontend)
- Leave product price blank to make it Negotiable automatically
- View all users
- Create customer, staff, and admin users
- Edit user password, address, role, and blocked status

---

## 💸 Negotiable Price Feature

In Admin → Products → Add/Edit Product:
- Leave **Price** empty to make the product Negotiable automatically
- Product shows **"Negotiable 🤝"** on the customer side
- Customer can add to cart and place order
- Cart shows a note: *"Our team will contact you to confirm the final price"*

---

## 🎯 Discount Scratch Animation

In Admin → Products → Edit Product:
- Set **Price** = original price (e.g. ₹1,695)
- Set **Discount Price** = new price (e.g. ₹1,620)
- Frontend shows the original price with a **strikethrough** and the new price in green
- Discount % badge appears automatically

---

## 🌐 Deploying to Production

### Backend → Railway / Render
```bash
# Set environment variables in dashboard:
MONGO_URI=mongodb+srv://...    # Atlas URI
JWT_SECRET=...
NODE_ENV=production
ADMIN_PHONE=...
```

### Frontend → Vercel / Netlify
```bash
# Set in dashboard:
VITE_API_URL=https://your-backend.railway.app

# Update src/utils/api.js baseURL:
baseURL: import.meta.env.VITE_API_URL || '/api'
```

Also update `vite.config.js` proxy target to your production backend URL.

---

## 📱 Pages (Customer)

| Route | Page |
|-------|------|
| `/auth` | Login / Register with phone number and password |
| `/` | Home — products grid with categories & search |
| `/cart` | Cart → Delivery address → Place order |
| `/orders` | My Orders list |
| `/orders/:id` | Order detail with live status tracker |
| `/account` | Profile, edit name/address, logout |

## 🔧 Pages (Admin)

| Route | Page |
|-------|------|
| `/admin` | Dashboard — Stats, Orders (with status update), Products CRUD, Users |

---

## 🛠 API Endpoints

### Auth
```
POST /api/auth/login           { phone, password }
POST /api/auth/register        { name, phone, address, password }
GET  /api/auth/me              (protected)
PUT  /api/auth/profile         (protected) { name, address }
```

### Products (public read, admin write)
```
GET    /api/products           ?category=sunflower&search=gold
GET    /api/products/:id
POST   /api/products           (admin)
POST   /api/products/upload-image (admin) form-data: image, returns MongoDB-storable data URL
PUT    /api/products/:id       (admin)
DELETE /api/products/:id       (admin)
POST   /api/products/admin/seed (admin) ← seeds all 44 products
```

### Orders
```
POST   /api/orders             Place order (auth)
GET    /api/orders/my          My orders (auth)
GET    /api/orders/:id         Order detail (auth)
PATCH  /api/orders/:id/cancel  Cancel order (auth)
GET    /api/orders/admin/all   All orders (admin)
PATCH  /api/orders/:id/status  Update status (admin) { status }
```

### Admin
```
GET   /api/admin/dashboard
GET   /api/admin/users
GET   /api/admin/users/:id
PATCH /api/admin/users/:id/block
```

---

## 📦 Tech Stack

| Layer | Tech |
|-------|------|
| Frontend | React 18, Vite, React Router v6 |
| Styling | Pure CSS (custom, no Tailwind) |
| Animations | CSS keyframes (price scratch, fade-up) |
| Backend | Node.js, Express 4 |
| Database | MongoDB + Mongoose |
| Auth | Phone/password, bcrypt, JWT |
| Security | Helmet, CORS, Rate limiting |

---

Built by Katigar Softwares 🫙
