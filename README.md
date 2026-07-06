# WMS-MKB Frontend

A complete Warehouse Management System frontend built with React 19 + TypeScript, fully integrated with the [WMS-MKB Backend](../wms-mkb-backend).

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | React 19 + TypeScript + Vite 8 |
| Routing | React Router v7 |
| Data Fetching | TanStack Query v5 |
| State Management | Zustand v5 (persisted auth) |
| Forms | React Hook Form v7 + Zod v4 |
| Styling | Tailwind CSS v4 |
| HTTP Client | Axios with auto token-refresh interceptor |
| Icons | Lucide React |

## Project Structure

```
src/
├── api/                    # Axios API functions per module
│   ├── auth.ts
│   ├── brands.ts
│   ├── categories.ts
│   ├── uom.ts
│   ├── attributeTypes.ts
│   ├── attributes.ts
│   ├── commonProductNames.ts
│   ├── items.ts
│   └── tasks.ts
├── components/
│   ├── layout/             # AppLayout, Sidebar, Header
│   └── ui/                 # Button, Input, Modal, Table, Badge, etc.
├── contexts/
│   └── ToastContext.tsx     # Toast notification system
├── lib/
│   ├── axios.ts            # Axios instance + token refresh interceptor
│   └── utils.ts            # cn(), getErrorMessage(), formatDate()
├── pages/
│   ├── auth/               # Login, ForgotPassword, ResetPassword
│   ├── dashboard/          # Dashboard with stats
│   ├── brands/
│   ├── categories/
│   ├── uom/
│   ├── attributeTypes/
│   ├── attributes/
│   ├── commonProductNames/
│   ├── items/
│   └── admin/              # Companies, Users, Roles
├── router/
│   ├── index.tsx           # createBrowserRouter config
│   └── ProtectedRoute.tsx  # Auth + role guards
├── store/
│   └── authStore.ts        # Zustand auth store (persisted)
└── types/
    └── index.ts            # All TypeScript interfaces
```

## Pages (14 total)

### Auth
| Page | Path | Description |
|---|---|---|
| Login | `/login` | Username or email + password |
| Forgot Password | `/forgot-password` | Request security key via email |
| Reset Password | `/reset-password` | Reset using security key |

### Application
| Page | Path | Access |
|---|---|---|
| Dashboard | `/` | All users |
| Brands | `/brands` | All users |
| Categories | `/categories` | All users |
| Units of Measure | `/uom` | All users |
| Attribute Types | `/attribute-types` | All users |
| Attributes | `/attributes` | All users |
| Common Product Names | `/common-product-names` | All users |
| Items | `/items` | All users |
| Companies | `/admin/companies` | Superuser only |
| Users | `/admin/users` | Company Admin + Superuser |
| Roles | `/admin/roles` | Company Admin + Superuser |

## Key Features

- **JWT Auth** — Access + refresh tokens, auto token refresh on 401 responses, tokens persisted in `localStorage` via Zustand
- **Role-based navigation** — Sidebar and routes auto-hide based on `is_superuser` / `is_company_admin` flags
- **CRUD modals** — Every module has create/edit modals with react-hook-form + Zod validation
- **Approval workflow** — Attributes and Common Product Names have pending → approved/rejected states with admin controls
- **Async task processing** — Items can be dispatched to Celery; task status polling via `/tasks/{task_id}`
- **Toast notifications** — In-app success/error/info/warning toasts
- **Responsive sidebar** — Collapsible nav groups, active route highlight

## Configuration

Copy `.env.example` to `.env` and set the backend URL:

```bash
cp .env.example .env
```

```env
VITE_API_BASE_URL=http://localhost:8000/api/v1
```

## Running the Project

> **Requires Node.js v20+ (v22 recommended)**

```bash
# If using nvm
nvm use 22

# Install dependencies
npm install

# Start development server
npm run dev
# → http://localhost:5173

# Type check + production build
npm run build

# Preview production build
npm run preview
```

## Running Both Backend + Frontend

```bash
# Terminal 1 — Backend (FastAPI)
cd wms-mkb-backend
uvicorn app.main:app --reload
# → http://localhost:8000
# → Swagger docs: http://localhost:8000/api/v1/docs

# Terminal 2 — Frontend (React)
cd wms-mkb-frontend
nvm use 22
npm run dev
# → http://localhost:5173
```

> CORS is configured in the backend to allow requests from `http://localhost:5173`.

## Backend API Reference

The frontend integrates all 60 endpoints from the backend:

| Module | Endpoints |
|---|---|
| Auth | Login, Logout, Refresh, Forgot/Reset Password, Me |
| Companies | Create, List (Superuser) |
| Users | Create, List, Get, Update (Company Admin) |
| Roles | Create, List, Update Permissions (Company Admin) |
| Modules | List |
| Brands | CRUD |
| Categories | CRUD + Children |
| UOM | CRUD |
| Attribute Types | CRUD |
| Attributes | CRUD + Approve / Reject + Pending list |
| Common Product Names | CRUD + Approve / Reject + Pending list |
| Items | CRUD + Async Process |
| Tasks | Get Status |

Full interactive API docs are available at `http://localhost:8000/api/v1/docs` when the backend is running.
