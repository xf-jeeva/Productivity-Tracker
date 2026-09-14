# 📜 The Daily Bureau — Vintage Team Work & Dispatch Ledger

A bespoke, full-featured productivity ledger application crafted with a warm, authentic 19th-century vintage bureau aesthetic (brass accents, aged parchment, typewriter typography, and rubber stamp motifs).

Built specifically for team task management, scheduled routines, reminder notifications, token-based reward disbursements, and comprehensive administrative oversight.

---

## 🌟 Key Features

### 1. 🗂️ Work Desk (User Workstation)
- **Dual Workstreams**: Dedicated, editable sections for **Daily Tasks** and **Daily Routines**.
- **Work Assignment & Reminders**: Configurable reminder timestamps with in-browser audio and alert notifications.
- **Audio-Visual Stamping**: Interactive typewriter keystrokes and visceral rubber-stamping sound effects upon task completion.
- **Token Reward Economy**: Members earn tokens for completed duties (1 token = ₹2; minimum redeem threshold ₹500 / 250 tokens).

### 2. 👥 Team Personnel Roster
- Comprehensive roster of all bureau clerks and officers.
- Real-time department badges, access permissions, and administrative decommission actions.

### 3. 📖 Master Dispatch Ledger
- Chronological historical audit log of all completed dispatches and duty completions across all personnel.

### 4. 🛡️ Administrative Oversight Ledger
- **User Management & Passkey Registry**: Bureau administrators can register new personnel, assign roles (`admin` or `member`), view access credentials, and securely decommission accounts via custom in-app confirmation modals.
- **Master Admin Protection**: Hardened safeguards prevent deletion of the master Bureau Chief (`@admin`).
- **Compact 1-Page Task Monitor**: Instant per-user dossiers showing Active Tasks, Routines, Completed Archives, and Deleted Archives with fast *Show More (+N more)* toggles.
- **Treasury Disbursements**: Review, approve, and disburse token reward claims with live balance deduction.

---

## 🛠️ Technology Stack

- **Framework**: [Next.js 16](https://nextjs.org/) (App Router & Turbopack)
- **Language**: TypeScript & React 19
- **Styling**: Vanilla CSS design tokens (warm parchment, sepia, polished brass, crimson ink)
- **Icons**: [Lucide React](https://lucide.dev/)
- **Audio Engine**: Web Audio API synthesizer for vintage typewriter and rubber-stamp acoustics
- **State Management**: Reactive LocalStorage ledger with cross-tab synchronizing broadcasts

---

## 🚀 Getting Started

### 1. Install Dependencies
```bash
npm install
```

### 2. Run the Development Server
```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000) in your browser.

### 3. Build Static Export (for Cloudflare Pages)
```bash
npm run build
```
This generates the standalone `./out` static directory.

---

## ☁️ Cloudflare Pages Deployment

Deploy directly from GitHub in 1 minute:
1. In Cloudflare Dashboard, navigate to **Compute (Workers & Pages)** > **Create application** > **Pages** > **Connect to Git**.
2. Select your repository: `xf-jeeva/Productivity-Tracker`.
3. Set build configuration:
   - **Framework preset**: `None` (or `Next.js (Static HTML Export)`)
   - **Build command**: `npm run build`
   - **Build output directory**: `out`
4. Click **Save and Deploy**.

---

## 🔐 Default Bureau Credentials

| Role | Username | Password | Access Level |
|:---|:---|:---|:---|
| **Bureau Administrator** | `admin` | `password` | Master Administrative, User Creation & Treasury Oversight |

*Note: New team members can be created directly by the Administrator via **Admin Oversight**.*

---

## 📜 License
Private Bureau License — Developed for internal team productivity.
