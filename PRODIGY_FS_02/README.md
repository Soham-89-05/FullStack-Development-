# EMS — Employee Management System

A fully client-side Employee Management System built with vanilla HTML, CSS and JavaScript.

---

## 📁 File Structure

```
employee-management/
├── index.html   — Main application markup (Login + Dashboard + Modals)
├── style.css    — Complete stylesheet (variables, layout, components, responsive)
├── app.js       — All application logic (auth, CRUD, validation, routing)
└── README.md    — This file
```

---

## 🚀 Getting Started

1. Download all three files into the same folder.
2. Open `index.html` in any modern browser — **no server needed**.

### Demo Credentials
| Field    | Value                   |
|----------|-------------------------|
| Email    | `admin@company.com`     |
| Password | `Admin@123`             |

---

## ✨ Features

### Authentication
- Session-based login stored in `localStorage`
- Real-time field validation (email format, required fields)
- Password show/hide toggle
- Auto-redirect if already logged in
- Secure logout

### Dashboard Overview
- Animated stat counters (Total, Active, Departments, New This Month)
- Recent employees list
- Department breakdown bar chart

### Employee Management (Full CRUD)
| Action  | Details |
|---------|---------|
| Create  | Add new employee with 10+ fields |
| Read    | View profile in dedicated modal |
| Update  | Pre-filled edit form |
| Delete  | Single or bulk with confirmation |

**Validation Rules:**
- Required fields enforced
- Email format + duplicate check
- Phone minimum digit check
- Join date cannot be in the future
- Salary must be a valid positive number

**Filters & Search:**
- Live search across name, email, department, role
- Filter by Department
- Filter by Status (Active / Inactive)
- Sort by Name / Department / Join Date / Salary
- Pagination (8 records per page)
- Bulk select + bulk delete

### Department Management
- Add / Edit / Delete departments
- Employee count per department
- Head of Department field
- Prevents duplicate department names

---

## 🎨 Design System

| Token         | Value                    |
|---------------|--------------------------|
| Background    | `#0b0f1a` (deep navy)    |
| Surface       | `#1e2a3a`                |
| Accent        | `#f59e0b` (amber)        |
| Success       | `#10b981` (emerald)      |
| Danger        | `#ef4444` (red)          |
| Font Display  | Syne (Google Fonts)      |
| Font Body     | DM Sans (Google Fonts)   |

---

## 💾 Data Storage

All data is persisted in the browser's `localStorage`:

| Key              | Contents           |
|------------------|--------------------|
| `ems_session`    | Auth session       |
| `ems_employees`  | Employee records   |
| `ems_departments`| Department records |

12 seed employees and 5 seed departments are loaded on first run.

---

## 🌐 Browser Support

Works in all modern browsers: Chrome, Firefox, Safari, Edge.
No build tools or npm required.
