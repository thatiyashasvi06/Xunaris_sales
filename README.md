# Xunaris & HYRA Connect CRM

> **Consolidated Enterprise Specification v1.0 Compliant**  
> Unified Sales CRM & Staffing platform for **Xunaris Technology Services** and **HYRA Connect Staffing**, with official branding, full RBAC, sequential sequential lead identifiers, pipeline management, activities SLA, and background workers.

---

## 1. Executive Architecture Overview

- **Frontend:** React 18 + Vite + Tailwind CSS + Lucide Icons (`http://localhost:3000`).
- **Backend:** Node.js + Express REST API (`http://localhost:5000`).
- **Database:** SQLite 3 in WAL mode with foreign keys (`./data/xunaris_crm.sqlite`).
- **Background Worker:** Background alert & outbox worker processing retry queues and SLA escalations.
- **Documentation & Swagger:** Interactive Swagger UI at `http://localhost:5000/api-docs` and embedded inside the frontend (`/swagger`).

---

## 2. Installation & Quick Startup

### Prerequisites
- Node.js v18.0+ or v20.0+
- npm v9.0+

### Step 1: Install Dependencies
```bash
npm install
```

### Step 2: Environment Configuration
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```

### Step 3: Start the Backend API Server
```bash
node server/index.js
# Listening on http://localhost:5000
# Automatic database migrations and seed execution on startup
```

### Step 4: Start the Frontend Application (in a separate terminal)
```bash
npm run dev
# Running on http://localhost:3000
```

---

## 3. Personas & RBAC Credentials

- **Admin User:** `admin@xunaris.com` (password set via `SEED_ADMIN_PASSWORD`, see Environment)
- **Sales User:** `sales@xunaris.com` (password set via `SEED_ADMIN_PASSWORD`, see Environment)
- **Marketing User:** `marketing@xunaris.com` (password set via `SEED_ADMIN_PASSWORD`, see Environment)
- **Self-Service Registration:** Sign Up option available on the login modal.
