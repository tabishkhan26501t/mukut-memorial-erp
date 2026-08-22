# Mukut Memorial School ERP — Future Feature Roadmap

> Do NOT implement during demo deployment. Documented for planning only.

## P0 — WhatsApp/SMS Fee Reminders
- Trigger on `Fee.status = overdue/pending` (cron daily 9 AM).
- Templates: English + Hindi (use `settings` for school name, UPI link).
- Provider: MSG91 / Twilio / WhatsApp Cloud API (store `WHATSAPP_TOKEN` server-side).
- Consent: opt-in per student `phone` / `fatherPhone`.
- Audit: log each send in `AuditLog` + `Notification`.

## P1 — Lightweight Parent/Teacher Portal (PWA)
- New role `PARENT` (linked to `Student` via phone/OTP, not full `User`).
- PWA: offline shell, installable, push notifications.
- Parent views: attendance, fees, marks, notices, transport location.
- Teacher views: my classes, attendance entry, marks entry (existing perms `ATTENDANCE_CREATE`, `MARKS_CREATE`).
- Reuse existing auth + `VITE_API_URL`.

## P2 — Staff Payroll
- New models: `Payroll`, `Payslip`, `Deduction`.
- Link `Teacher.salary` → monthly generation, PDF payslip via `pdfmake` (reuse `utils/pdf.js`).
- Permissions: `PAYROLL_VIEW/CREATE/APPROVE`.
- Reports: monthly payroll summary, TDS.

## P3 — Timetable + Teacher Substitution
- Models: `Period`, `Timetable`, `Substitution`.
- Constraints: no teacher double-booked, room capacity, subject eligibility.
- UI: drag-drop weekly grid (reuse `DataTable` + `framer-motion`).
- Substitution: auto-suggest available teachers when `TeacherAttendance.status = absent`.

## P4 — Offline Attendance + Synchronization
- PWA service worker + IndexedDB queue for `POST /api/attendance` when offline.
- Sync on reconnect, conflict: last-write-wins with `updatedAt` + audit.
- CSV import already exists (`StudentImportModal`) — extend to attendance.

## P5 — English/Hindi/Regional Language Support
- `i18n` (react-i18next) with `en`, `hi` bundles.
- Persist choice in `localStorage` + `Setting` key `default_language`.
- PDF generation (`utils/pdf.js`) needs Hindi font (Noto Sans Devanagari) for report cards.

## P6 — Basic Library Management
- Models: `Book`, `BookCopy`, `Issue`, `Fine`.
- Flow: issue → due date → return → fine calc → `Fee` type `library` auto-create.
- Permissions: `LIBRARY_VIEW/ISSUE/RETURN`.

---

**Implementation order is P0 → P6. Each P is a separate migration + UI milestone. No breaking changes to existing `prisma` MySQL provider.**
