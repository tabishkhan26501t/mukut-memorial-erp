# Mukut Memorial School ERP — 5-Minute Sales Demo Guide

> **Demo URL:** *(pending — see DEPLOYMENT.md; will be `https://mukut-memorial-demo.onrender.com` in single-service mode or your Vercel URL)*
> **Username:** `demo@mukutmemorial.demo`
> **Password:** `Demo@12345`
> All data is fictional. `DEMO MODE` badge is visible in header and on login.

---

### 0) Login (30 sec)
1. Open the Demo URL → you see **DEMO MODE — use fictional credentials** hint.
2. Enter `demo@mukutmemorial.demo` / `Demo@12345` → Sign in.
3. Point out: JWT + refresh tokens, role-based permissions (this account is SUPER_ADMIN so you can show everything).

### 1) Dashboard (30 sec)
- Show real stats from seeded data: ~450 students, 35 teachers, 14 classes, attendance ~94%, fees collected/pending, 6 buses.
- Charts are live queries, not mock images.
- Notices carousel shows 8 recent notices.

*Say:* "Every number on this dashboard is a live database query — not a screenshot."

### 2) Student Management (45 sec)
- **Students** → search `ADM-DEMO-10` or filter by Class `1-A`.
- Open a student → show profile, photo placeholder, documents, fees, attendance history.
- Click **Import** to show CSV import (don't actually upload in demo).
- Search is global (header search bar) — type a name.

### 3) Fees (45 sec)
- **Fees** → show 1,350 records (3 per student: tuition/transport/library).
- Filter by status: `paid / partial / pending / overdue` — all four exist by design.
- Open a fee → edit paid amount → show status auto-updates.
- Mention: Reports → fee receipt PDF (uses `pdfmake` server-side).

### 4) Attendance (30 sec)
- **Attendance** → pick Class `2-A` and today's date → 94% present is visible.
- Toggle a student present/absent/leave → Save → dashboard updates.
- Show last 30 days historical data is pre-seeded.

### 5) Exams / Marks / Report Cards (60 sec)
- **Exams** → each class has Mid Term + Final, each with 3–5 subjects.
- **Marks** → select Class `5-A` + Mid Term → marks table appears with grades (A+ to F) and pass/fail auto-calculated via 33 passing marks.
- Pick a student → **Print Marksheet / Report Card** → PDF opens in new tab (verify `school_logo` + grading table via `utils/pdf.js`).

### 6) Teachers & Classes (30 sec)
- **Teachers** → 35 fictional teachers, qualifications, experience, salary. Open one → subjects, class-teacher assignment.
- **Classes** → 14 classes with sections, class teacher linked, subject count per class.

### 7) Transportation (30 sec) — NEW
- **Transportation** → 6 vehicles, 4 drivers, 4 routes with stops — show capacity and remaining seats.
- Demonstrates the ERP can extend beyond academics.

### 8) Notifications, Audit Log, Settings (30 sec)
- **Notifications** → 8 notices (exams, holidays, sports day). Create one → show targetRole.
- **Activity Log** → every login / fee change / backup is audited with IP.
- **Settings** → school name `Mukut Memorial School`, grading system — editable live.

### 9) Closing — Security & Theme (15 sec)
- Toggle **Light/Dark** (header moon/sun) — fully themed.
- Logout → login again instantly (refresh token flow).

---

**If asked about data:** "This is a separate demo database — `school_erp_demo` — with only fictional Indian names. No real children's data."

**If asked about uploads:** "On this free demo, uploads are ephemeral — they work but reset on redeploy. Production would use persistent disk or Cloudinary/S3."

**If asked about backup:** "Backup/restore is SUPER_ADMIN-only and uses `mysqldump` on Linux. It's protected on the demo and not needed for sales calls."
