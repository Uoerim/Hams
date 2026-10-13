# Hams (همس) 💬

<div align="center">

![Hams Banner](https://img.shields.io/badge/HAMS-همس-6366f1?style=for-the-badge&logoColor=white)
<br/>

**A stealthy, private, real-time web messaging platform built with Next.js 16, React 19, Tailwind CSS v4, and Supabase.**

[![Next.js](https://img.shields.io/badge/Next.js-16.4.0-black?style=flat-square&logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19.3.0-61dafb?style=flat-square&logo=react)](https://react.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-v4-38bdf8?style=flat-square&logo=tailwind-css)](https://tailwindcss.com/)
[![Supabase](https://img.shields.io/badge/Supabase-Realtime-3ecf8e?style=flat-square&logo=supabase)](https://supabase.com/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?style=flat-square&logo=typescript)](https://www.typescriptlang.org/)
[![License](https://img.shields.io/badge/License-Non--Commercial_Share--Alike-orange?style=flat-square)](./LICENSE)

[Features](#-key-features) • [Tech Stack](#-technology-stack) • [Database Architecture](#-database-architecture) • [Getting Started](#-getting-started) • [Migrations](#-database-migrations) • [License](#-license--terms-of-use)

</div>

---

## 📖 Overview

**Hams** (Arabic: **همس**, meaning *"Whisper"*) is a private, multi-user real-time messaging application crafted for discreet, reliable group communication across mobile and desktop environments.

Equipped with WhatsApp-style contextual actions, an instant emergency exit trigger, live presence indicators, message version history, and administrative controls, Hams delivers a native-app-like experience in a progressive web environment.

---

## ✨ Key Features

### ⚡ Real-Time Instant Messaging
- **Zero-Latency Updates:** Built on Supabase Realtime with PostgreSQL replication (`supabase_realtime` publication). Messages appear instantaneously without polling.
- **Active Presence & Live Status:** View active participants online with a dynamic glowing status indicator.
- **Typing Indicators:** Animated multi-user typing feedback with automatic timeout throttling.
- **Live Read Receipts:** Automatically calculates message read status per user based on participant activity timestamps (`Read by [user]`).

### 📱 WhatsApp-Style Rich Interactions
- **Multi-Platform Context Menu:**
  - **Desktop / Laptop:** Accessible via right-click on any message bubble.
  - **Mobile / Touch Devices:** Triggered via long-press (450ms) accompanied by haptic vibration feedback (`navigator.vibrate`).
- **Quoted Replies:** Reply to specific messages with a quoted preview header. Clicking the quoted preview smoothly scrolls and temporarily flashes the original message.
- **Message Editing with History:** Senders and administrators can edit sent messages. All revisions are preserved in an audit history (`JSONB`) viewable by the administrator.
- **Soft Deletion:** Safely mark messages as deleted while maintaining conversation chronology.
- **One-Tap Clipboard Copy:** Copy message contents with interactive toast confirmation.

### 👥 Profile Selection & Multi-User Architecture
- **Shared Device Profile Selector:** Quick profile picker supporting multi-user shared devices (phones, tablets, shared PCs).
- **Device & Activity Fingerprinting:** Tracks the last active device (`Windows`, `Mac`, `iPhone`, `Android`) and last seen timestamps for every profile.

### 🔐 Multi-Tier Security & Control
- **Two-Tier Password Protection:**
  - **Group Password:** Shared secret for regular members to enter the chat.
  - **Admin Master Password:** Dedicated passkey for accessing the administrative console.
- **Initial Setup Wizard:** Automatically prompts for initial password configuration on first deployment.

### 🛠️ Dedicated Admin Console
- **Member Management:** Create and delete user profiles with ease (admin user is permanently protected from deletion).
- **Security Updates:** Change both group password and master admin password directly from the UI.
- **Nuclear Chat Clear:** One-click option to purge all message records across the database.
- **Audit Trails:** View edit histories and device logs across all profiles.

### 🚨 Emergency Panic Button
- **Instant Diversion Trigger:** Floating action button available at all times.
- **Customizable Redirect:** Immediately activates a full-screen frosted glass blur animation before redirecting the browser to an innocent external URL (configured by the admin, e.g. educational video, documentation, search engine).

### 🎨 Visual Customization & PWA Polish
- **Color Accent Themes:** Seamlessly switch between 4 curated themes:
  - 🟣 **Indigo** (`bg-indigo-600`)
  - 🌹 **Rose** (`bg-rose-600`)
  - 🌿 **Emerald** (`bg-emerald-600`)
  - 🌊 **Blue** (`bg-blue-600`)
- **System Dark & Light Modes:** Synchronized with the root HTML element and mobile meta viewport theme color (`#111827` / `#ffffff`).
- **Typography:** Blends Vercel's [Geist](https://vercel.com/font) with the geometric Arabic font [Changa](https://fonts.google.com/specimen/Changa).
- **Mobile Safari Optimizations:** Safe-area insets (`screen-safe`, `header-safe`, `footer-safe`) with auto-zoom prevention on input focus.

---

## 🛠️ Technology Stack

| Layer | Technology | Description |
| :--- | :--- | :--- |
| **Framework** | [Next.js 16](https://nextjs.org/) | App Router, Server Actions, Turbopack |
| **UI Library** | [React 19](https://react.dev/) | Modern concurrent UI architecture |
| **Styling** | [Tailwind CSS v4](https://tailwindcss.com/) | Modern utility-first CSS engine |
| **Database** | [PostgreSQL](https://www.postgresql.org/) / [Supabase](https://supabase.com/) | Relational database with real-time replication |
| **Icons** | [Lucide React](https://lucide.dev/) | Clean, consistent SVG iconography |
| **Database Client** | `pg` (Node-Postgres) & `@supabase/supabase-js` | Direct migration client and client-side realtime SDK |
| **Language** | [TypeScript](https://www.typescriptlang.org/) | End-to-end typed safety |

---

## 🗄️ Database Architecture

Hams utilizes a normalized relational PostgreSQL schema within Supabase:

### 1. `users` Table
Stores participant profiles and activity metadata.
```sql
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username VARCHAR(255) UNIQUE NOT NULL,
  role VARCHAR(50) DEFAULT 'user',               -- 'admin' or 'user'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_login TIMESTAMP WITH TIME ZONE,
  last_seen_at TIMESTAMP WITH TIME ZONE,
  last_device VARCHAR(255)                       -- e.g. 'iPhone', 'Windows'
);
```

### 2. `messages` Table
Stores chat messages, replies, edit history, and deletion flags.
```sql
CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_deleted BOOLEAN DEFAULT false,
  is_edited BOOLEAN DEFAULT false,
  edit_history JSONB DEFAULT '[]'::jsonb,        -- Array of { text, edited_at }
  reply_to JSONB DEFAULT NULL                    -- { id, username, text }
);
```

### 3. `app_settings` Table
Holds global configuration, passwords, and visual settings.
```sql
CREATE TABLE IF NOT EXISTS app_settings (
  id INT PRIMARY KEY DEFAULT 1,
  admin_password VARCHAR(255),
  group_password VARCHAR(255),
  initialized BOOLEAN DEFAULT false,
  emergency_link VARCHAR(500) DEFAULT 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
  primary_color VARCHAR(50) DEFAULT 'indigo',
  is_dark_mode BOOLEAN DEFAULT true
);
```

### Realtime Publications
Realtime events for `messages` and `users` are published via Supabase:
```sql
ALTER PUBLICATION supabase_realtime ADD TABLE messages;
ALTER PUBLICATION supabase_realtime ADD TABLE users;
```

---

## 🚀 Getting Started

Follow these instructions to set up Hams on your local machine.

### Prerequisites
- **Node.js** v20.x or later installed
- **npm**, **pnpm**, or **yarn**
- A **[Supabase](https://supabase.com/)** project (free tier works great)

---

### Step 1: Clone the Repository

```bash
git clone https://github.com/Uoerim/Hams.git
cd Hams
```

---

### Step 2: Install Dependencies

```bash
npm install
```

---

### Step 3: Configure Environment Variables

Create a `.env.local` file in the root directory by copying the sample template:

```bash
cp .env.example .env.local
```

Fill in your project credentials from your **Supabase Dashboard** (`Project Settings -> API` and `Database`):

```env
# Supabase Client Credentials
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-public-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-secret-key

# Direct PostgreSQL Connection (used by setup & upgrade scripts)
POSTGRES_URL_NON_POOLING=postgresql://postgres:your-db-password@db.your-project-id.supabase.co:5432/postgres
```

> [!IMPORTANT]
> The `POSTGRES_URL_NON_POOLING` connection string is required for running the database migration scripts. Make sure to use the **direct (non-pooling, port 5432)** connection string rather than the transaction pooler.

---

### Step 4: Run Database Migrations

Initialize your Supabase database schema by running the setup and incremental upgrade scripts in sequence:

```bash
# 1. Initialize core tables (users, messages, app_settings) & admin seed
node setup-db.js

# 2. Add emergency redirect and theme columns
node upgrade-db.js

# 3. Add read receipts, last seen, and soft delete/edit flags
node upgrade-db-2.js

# 4. Add edit history JSONB, device detection, and dark mode
node upgrade-db-3.js

# 5. Add quoted reply_to support
node upgrade-db-4.js
```

---

### Step 5: Start the Development Server

```bash
npm run dev
```

Open your browser and navigate to:
```
http://localhost:3000
```

---

### Step 6: Initial Setup Walkthrough

1. When opening the app for the first time, you will see the **Admin** user profile.
2. Click on **Admin**.
3. You will be greeted by the **Setup Wizard**.
4. Define your **Master Admin Password** and **Group Chat Password**.
5. Once completed, you will be redirected to the **Admin Console** where you can create user profiles (e.g., Alice, Bob) and customize settings.
6. Regular users can now select their profile from the home screen and unlock chat access using the Group Chat Password.

---

## 📜 Database Migrations Reference

The repository includes standalone migration scripts to maintain schema parity:

| Script | Purpose |
| :--- | :--- |
| [`setup-db.js`](file:///c:/Users/yosuf/Documents/New_Chapter/Change_of_Heart/proj/hams/setup-db.js) | Creates initial `users`, `messages`, and `app_settings` tables, inserts the default `admin` account, and enables realtime replication. |
| [`upgrade-db.js`](file:///c:/Users/yosuf/Documents/New_Chapter/Change_of_Heart/proj/hams/upgrade-db.js) | Adds `emergency_link` and `primary_color` columns to `app_settings`. |
| [`upgrade-db-2.js`](file:///c:/Users/yosuf/Documents/New_Chapter/Change_of_Heart/proj/hams/upgrade-db-2.js) | Adds `last_login`, `last_seen_at` to `users`, and `is_deleted`, `is_edited` to `messages`. |
| [`upgrade-db-3.js`](file:///c:/Users/yosuf/Documents/New_Chapter/Change_of_Heart/proj/hams/upgrade-db-3.js) | Adds `edit_history` (JSONB) to `messages`, `last_device` to `users`, and `is_dark_mode` to `app_settings`. |
| [`upgrade-db-4.js`](file:///c:/Users/yosuf/Documents/New_Chapter/Change_of_Heart/proj/hams/upgrade-db-4.js) | Adds `reply_to` (JSONB) support for WhatsApp-style threaded quotations. |

---

## 📂 Project Structure

```
hams/
├── .env.example             # Template for required environment variables
├── .env.local               # Local environment credentials (git-ignored)
├── LICENSE                  # Custom Non-Commercial Share-Alike License
├── README.md                # Comprehensive project documentation
├── package.json             # Project dependencies and npm scripts
├── next.config.ts           # Next.js configuration
├── tsconfig.json            # TypeScript configuration
├── setup-db.js              # Database initialization script
├── upgrade-db.js            # DB upgrade: Emergency redirect & colors
├── upgrade-db-2.js          # DB upgrade: Read receipts & edit/delete
├── upgrade-db-3.js          # DB upgrade: Edit history & device tracking
├── upgrade-db-4.js          # DB upgrade: Quoted replies
├── src/
│   ├── app/
│   │   ├── actions.ts       # Server Actions (DB operations, auth, settings)
│   │   ├── globals.css      # Tailwind CSS styles and custom animations
│   │   ├── layout.tsx       # Root layout, fonts (Geist, Changa), viewport settings
│   │   └── page.tsx         # Main client component (Chat, Admin, Profile views)
│   └── utils/
│       └── supabase.ts      # Browser Supabase client instantiation
└── public/                  # Static assets and icons
```

---

## 🔒 Security Best Practices

- **Service Role Key:** The `SUPABASE_SERVICE_ROLE_KEY` is exclusively utilized within Server Actions (`actions.ts`) on the server. Never expose this key in client-side bundles or `NEXT_PUBLIC_` variables.
- **Passkey Protection:** Group and Admin passwords are maintained in `app_settings`. For high-security environments, store hashed passwords with cryptographic salts (e.g. bcrypt/argon2).
- **Network Boundaries:** Configure Supabase Row-Level Security (RLS) policies if opening the database to anonymous public queries.

---

## ⚖️ License & Terms of Use

This project is released under the **Hams Non-Commercial, Share-Alike, and Restricted Contribution License (v1.0)**.

A full copy of the license is available in the [`LICENSE`](./LICENSE) file.

### Summary of Terms:

- **✅ Personal & Non-Commercial Use:** You are free to view, download, run, study, and privately modify this software for personal, academic, educational, and internal evaluation purposes.
- **❌ No Commercial Use:** You are strictly prohibited from selling, sublicensing, commercializing, bundling, offering as a paid service or SaaS, or utilizing this software in any revenue-generating venture without prior express written permission from the author.
- **🔄 Share-Alike (Open Source Modifications):** If you modify this software and distribute, deploy, host, or make it accessible to third parties, you **must** release and publish your modified source code under the exact same license terms at no cost.
- **🚫 Restricted Contributions:** Direct contributions, pull requests, and patch submissions to this official project repository are **not accepted without prior express written permission**. Please contact the project maintainer before submitting code.

### Inquiries & Commercial Licensing:
To request permission for commercial use or authorized project contributions, please contact:
- **Author:** Uoerim (Yosuf)
- **Email:** `yosufmaib@gmail.com`
- **GitHub:** [@Uoerim](https://github.com/Uoerim)
