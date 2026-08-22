# Mukut Memorial School - ERP System

A production-ready Enterprise Resource Planning system for Mukut Memorial School built with React, Node.js, Express, and MySQL.

## Tech Stack

**Frontend:** React 19, Vite, TypeScript, Tailwind CSS, React Router, Axios, React Hook Form, Framer Motion, Recharts

**Backend:** Node.js, Express.js, MySQL, Prisma ORM, JWT, bcrypt

## Features

- **Authentication:** JWT with refresh tokens and enforced role-based authorization
- **Users, Roles & Permissions:** multi-user staff accounts (SUPER_ADMIN, PRINCIPAL, TEACHER, ACCOUNTANT, RECEPTION, STAFF), configurable role permissions
- **Dashboard:** Real-time statistics, charts, class overview
- **Student Management:** CRUD, search, filter, pagination, photo upload, CSV import
- **Teacher Management:** CRUD, qualifications, salary tracking
- **Class Management:** Sections, class teacher assignment
- **Subject Management:** Per-class subject mapping
- **Exam Management:** Unit Test, Mid Term, Final, Practical
- **Marks Entry:** Automatic grade calculation, percentage, pass/fail
- **Attendance:** Daily tracking with present/absent/leave
- **Document Management:** Upload, preview, download student documents
- **Notifications:** Send and manage system notifications
- **Settings:** School configuration, grading system, logo
- **Audit Log:** Full activity trail including security events
- **Backups:** Manual + scheduled database backups
- **Themes:** Light/Dark mode support

## Project Structure

```
school-erp/
├── client/                 # React frontend
│   ├── src/
│   │   ├── components/     # UI components
│   │   ├── pages/          # Route pages
│   │   ├── layouts/        # Layout components
│   │   ├── hooks/          # Custom hooks
│   │   ├── context/        # React contexts
│   │   ├── services/       # API services
│   │   ├── utils/          # Utility functions
│   │   └── types/          # TypeScript types
│   └── ...
├── server/                 # Express backend
│   ├── controllers/        # Route handlers
│   ├── routes/             # API routes
│   ├── middlewares/         # Auth middleware
│   ├── services/           # Business logic
│   ├── config/             # Database config
│   ├── utils/              # Utilities
│   ├── prisma/             # Schema and migrations
│   └── uploads/            # File storage
├── database/               # SQL schema
├── package.json            # Root package
└── README.md
```

## Prerequisites

- Node.js 18+
- MySQL 8+
- npm or yarn

## Installation

1. **Clone the repository**
   ```bash
   git clone <repo-url>
   cd school-erp
   ```

2. **Install all dependencies**
   ```bash
   npm run install:all
   ```

3. **Configure environment variables**
   ```bash
   cp server/.env.example server/.env
   ```
   Edit `server/.env` with your MySQL credentials and JWT secrets.

4. **Setup database**
   ```bash
   # Option 1: Import SQL schema
   mysql -u root -p < database/school.sql

   # Option 2: Use Prisma migrations
   cd server
   npx prisma migrate dev --name init
   ```

5. **Seed the database**
   ```bash
   npm run db:seed
   ```

6. **Start development**
   ```bash
   npm run dev
   ```

## Roles & Permissions

The system ships with six roles and ~54 granular permissions. Permissions are enforced **server-side** on every API route (401 = unauthenticated, 403 = authenticated but not permitted). The frontend only mirrors these rules for UX.

| Role | Access |
|------|--------|
| SUPER_ADMIN | Everything, including users, role permissions, backup restore |
| PRINCIPAL | All school modules, settings, users (cannot restore backups or disable users) |
| ACCOUNTANT | Student view, full fee management, receipts and reports |
| TEACHER | Assigned classes: attendance, marks, exams, reports |
| RECEPTION | Students (create/update), documents, fee viewing, reports |
| STAFF | Only explicitly granted permissions |

Role permissions can be adjusted at runtime from **Users & Roles → Roles & Permissions** (requires `USER_UPDATE`).

## Initial login

The database seed (`npm run db:seed`) creates a single Super Admin account:

- Username: `SEED_ADMIN_EMAIL` (default `tabish26501`)
- Password: `SEED_ADMIN_PASSWORD` — must be set explicitly in **production** (min 8 chars, letter + number). In development, if unset, a random password is generated and printed by the seed. The seed never resets an existing password unless `SEED_ADMIN_PASSWORD` is provided.

Never hardcode or commit production credentials.

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/auth/login` | POST | Admin login |
| `/api/auth/refresh` | POST | Refresh token |
| `/api/auth/logout` | POST | Admin logout |
| `/api/students` | GET/POST | List/Create students |
| `/api/students/:id` | GET/PUT/DELETE | Single student operations |
| `/api/teachers` | GET/POST | List/Create teachers |
| `/api/teachers/:id` | GET/PUT/DELETE | Single teacher operations |
| `/api/classes` | GET/POST | List/Create classes |
| `/api/subjects` | GET/POST | List/Create subjects |
| `/api/exams` | GET/POST | List/Create exams |
| `/api/marks/exam/:id` | GET | Get marks by exam |
| `/api/marks/exam/:id/class/:classId` | POST | Save marks |
| `/api/attendance` | GET/POST | Get/Save attendance |
| `/api/documents` | GET | List documents |
| `/api/documents/upload` | POST | Upload document |
| `/api/dashboard/stats` | GET | Dashboard statistics |
| `/api/settings` | GET/PUT | School settings |
| `/api/users` | GET/POST/PUT | User management (list, create, update, disable, reset password) |
| `/api/users/roles` | GET/PUT | Role list and permission assignment |

## Scripts

- `npm run dev` - Start both frontend and backend
- `npm run dev:client` - Start frontend only
- `npm run dev:server` - Start backend only
- `npm run build` - Build frontend for production
- `npm run db:migrate` - Run Prisma migrations
- `npm run db:seed` - Seed database

## License

MIT
