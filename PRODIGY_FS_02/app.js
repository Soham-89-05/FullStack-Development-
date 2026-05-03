/* ═══════════════════════════════════════════════════════════════
   EMS — Employee Management System  |  app.js
   Features: Auth, CRUD Employees & Departments, Validation,
             Pagination, Search, Filter, Sort, Bulk Delete
═══════════════════════════════════════════════════════════════ */

'use strict';

/* ─── Storage Helpers ────────────────────────────────────────── */
const store = {
  get: (k, def = null) => {
    try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : def; }
    catch { return def; }
  },
  set: (k, v) => localStorage.setItem(k, JSON.stringify(v)),
  del: (k)    => localStorage.removeItem(k),
};

/* ─── Credentials (demo) ─────────────────────────────────────── */
const ADMIN_CREDENTIALS = { email: 'admin@company.com', password: 'Admin@123' };
const SESSION_KEY       = 'ems_session';
const EMP_KEY           = 'ems_employees';
const DEPT_KEY          = 'ems_departments';

/* ─── Color Palette for Avatars ──────────────────────────────── */
const AV_COLORS = ['av0','av1','av2','av3','av4','av5','av6','av7'];
const DEPT_ICONS = ['fa-laptop-code','fa-chart-line','fa-users','fa-bullhorn','fa-shield-halved','fa-screwdriver-wrench','fa-stethoscope','fa-book-open'];

/* ─── Seed Data ──────────────────────────────────────────────── */
const SEED_DEPTS = [
  { id:'d1', name:'Engineering',    desc:'Software & Infrastructure',      head:'Alice Chen'    },
  { id:'d2', name:'Marketing',      desc:'Brand, Growth & Communications', head:'Bob Sharma'    },
  { id:'d3', name:'Human Resources',desc:'Talent & People Operations',     head:'Carol Patel'   },
  { id:'d4', name:'Finance',        desc:'Accounting & Budgeting',         head:'David Gupta'   },
  { id:'d5', name:'Operations',     desc:'Business & Process Management',  head:'Eva Mishra'    },
];

const SEED_EMPS = [
  { id:'e1', fName:'Alice',   lName:'Chen',     email:'alice@company.com',    phone:'+91 98100 11111', dept:'Engineering',     role:'Lead Engineer',        salary:1800000, joinDate:'2022-03-15', status:'Active',   gender:'Female', address:'MG Road, Pune, MH 411001' },
  { id:'e2', fName:'Bob',     lName:'Sharma',   email:'bob@company.com',      phone:'+91 98100 22222', dept:'Marketing',       role:'Marketing Manager',    salary:1200000, joinDate:'2021-07-01', status:'Active',   gender:'Male',   address:'FC Road, Pune, MH 411004'  },
  { id:'e3', fName:'Carol',   lName:'Patel',    email:'carol@company.com',    phone:'+91 98100 33333', dept:'Human Resources', role:'HR Head',              salary:1400000, joinDate:'2020-01-10', status:'Active',   gender:'Female', address:'Baner, Pune, MH 411045'    },
  { id:'e4', fName:'David',   lName:'Gupta',    email:'david@company.com',    phone:'+91 98100 44444', dept:'Finance',         role:'Finance Analyst',      salary:900000,  joinDate:'2023-02-20', status:'Active',   gender:'Male',   address:'Kothrud, Pune, MH 411038'  },
  { id:'e5', fName:'Eva',     lName:'Mishra',   email:'eva@company.com',      phone:'+91 98100 55555', dept:'Operations',      role:'Operations Lead',      salary:1100000, joinDate:'2021-11-05', status:'Active',   gender:'Female', address:'Wakad, Pune, MH 411057'    },
  { id:'e6', fName:'Frank',   lName:'Desai',    email:'frank@company.com',    phone:'+91 98100 66666', dept:'Engineering',     role:'Backend Developer',    salary:1200000, joinDate:'2023-05-12', status:'Active',   gender:'Male',   address:'Hinjewadi, Pune, MH 411057'},
  { id:'e7', fName:'Grace',   lName:'Nair',     email:'grace@company.com',    phone:'+91 98100 77777', dept:'Engineering',     role:'Frontend Developer',   salary:1100000, joinDate:'2022-08-01', status:'Active',   gender:'Female', address:'Viman Nagar, Pune'         },
  { id:'e8', fName:'Harry',   lName:'Singh',    email:'harry@company.com',    phone:'+91 98100 88888', dept:'Marketing',       role:'SEO Specialist',       salary:750000,  joinDate:'2023-09-18', status:'Inactive', gender:'Male',   address:'Shivajinagar, Pune'        },
  { id:'e9', fName:'Irene',   lName:'Joshi',    email:'irene@company.com',    phone:'+91 98100 99999', dept:'Finance',         role:'Senior Accountant',    salary:950000,  joinDate:'2022-04-25', status:'Active',   gender:'Female', address:'Karve Nagar, Pune'         },
  { id:'e10',fName:'James',   lName:'Kumar',    email:'james@company.com',    phone:'+91 98200 10101', dept:'Operations',      role:'Project Coordinator',  salary:850000,  joinDate:'2024-01-03', status:'Active',   gender:'Male',   address:'Hadapsar, Pune'            },
  { id:'e11',fName:'Kiran',   lName:'Shah',     email:'kiran@company.com',    phone:'+91 98200 11121', dept:'Engineering',     role:'DevOps Engineer',      salary:1350000, joinDate:'2023-11-14', status:'Active',   gender:'Other',  address:'Magarpatta, Pune'          },
  { id:'e12',fName:'Lisa',    lName:'Fernandez',email:'lisa@company.com',     phone:'+91 98200 13141', dept:'Human Resources', role:'Recruiter',            salary:700000,  joinDate:'2024-03-07', status:'Active',   gender:'Female', address:'Camp, Pune'                },
];

/* ─── State ──────────────────────────────────────────────────── */
let employees    = [];
let departments  = [];
let currentPage  = 1;
const PAGE_SIZE  = 8;
let searchQ      = '';
let filterDept   = '';
let filterStatus = '';
let sortKey      = 'name';
let selected     = new Set();
let pendingDeleteId   = null;
let pendingDeleteType = null; // 'employee' | 'dept' | 'bulk'
let viewingEmpId = null;

/* ═══════════════════════════════════════════════════════════
   INIT
══════════════════════════════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', () => {
  // Load or seed data
  departments = store.get(DEPT_KEY) || [];
  employees   = store.get(EMP_KEY)  || [];
  if (!departments.length) { departments = SEED_DEPTS; store.set(DEPT_KEY, departments); }
  if (!employees.length)   { employees   = SEED_EMPS;  store.set(EMP_KEY, employees); }

  // Check session
  const session = store.get(SESSION_KEY);
  if (session && session.loggedIn) {
    showDashboard();
  } else {
    showPage('loginPage');
  }

  bindAll();
});

/* ═══════════════════════════════════════════════════════════
   NAVIGATION
══════════════════════════════════════════════════════════════ */
function showPage(id) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  const pg = document.getElementById(id);
  if (pg) pg.classList.add('active');
}

function showDashboard() {
  showPage('dashboardPage');
  populateDeptDropdowns();
  switchView('overview');
}

function switchView(name) {
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  const view = document.getElementById(name + 'View');
  if (view) view.classList.add('active');
  const navItem = document.querySelector(`.nav-item[data-view="${name}"]`);
  if (navItem) navItem.classList.add('active');

  const titles = { overview:'Overview', employees:'Employees', departments:'Departments' };
  document.getElementById('topbarTitle').textContent = titles[name] || name;

  if (name === 'overview')     renderOverview();
  if (name === 'employees')    { currentPage = 1; renderEmployees(); }
  if (name === 'departments')  renderDepartments();
}

/* ═══════════════════════════════════════════════════════════
   BIND ALL EVENTS
══════════════════════════════════════════════════════════════ */
function bindAll() {
  /* Login */
  document.getElementById('loginForm').addEventListener('submit', handleLogin);
  document.getElementById('togglePw').addEventListener('click', () => {
    const inp = document.getElementById('loginPassword');
    const icon = document.querySelector('#togglePw i');
    if (inp.type === 'password') { inp.type = 'text'; icon.className = 'fa-solid fa-eye-slash'; }
    else                         { inp.type = 'password'; icon.className = 'fa-solid fa-eye'; }
  });

  /* Logout */
  document.getElementById('logoutBtn').addEventListener('click', handleLogout);

  /* Sidebar */
  document.getElementById('hamburger').addEventListener('click', () => document.getElementById('sidebar').classList.add('open'));
  document.getElementById('sidebarClose').addEventListener('click', () => document.getElementById('sidebar').classList.remove('open'));

  /* Nav */
  document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', e => {
      e.preventDefault();
      const view = item.dataset.view;
      document.getElementById('sidebar').classList.remove('open');
      switchView(view);
    });
  });

  /* Overview quick links */
  document.querySelectorAll('[data-view="employees"]').forEach(btn => {
    btn.addEventListener('click', () => switchView('employees'));
  });

  /* Global search */
  document.getElementById('globalSearch').addEventListener('input', e => {
    switchView('employees');
    document.getElementById('empSearch').value = e.target.value;
    searchQ = e.target.value.toLowerCase();
    currentPage = 1;
    renderEmployees();
  });

  /* Employee CRUD */
  document.getElementById('addEmpBtn').addEventListener('click', () => openEmpModal());
  document.getElementById('addFirstEmp').addEventListener('click', () => openEmpModal());
  document.getElementById('empForm').addEventListener('submit', saveEmployee);
  document.getElementById('empModalClose').addEventListener('click', closeEmpModal);
  document.getElementById('empCancelBtn').addEventListener('click', closeEmpModal);
  document.getElementById('empModalOverlay').addEventListener('click', e => { if (e.target === e.currentTarget) closeEmpModal(); });

  /* Employee filters */
  document.getElementById('empSearch').addEventListener('input', e => {
    searchQ = e.target.value.toLowerCase();
    currentPage = 1;
    renderEmployees();
  });
  document.getElementById('deptFilter').addEventListener('change', e => {
    filterDept = e.target.value;
    currentPage = 1;
    renderEmployees();
  });
  document.getElementById('statusFilter').addEventListener('change', e => {
    filterStatus = e.target.value;
    currentPage = 1;
    renderEmployees();
  });
  document.getElementById('sortBy').addEventListener('change', e => {
    sortKey = e.target.value;
    renderEmployees();
  });

  /* Select all */
  document.getElementById('selectAll').addEventListener('change', e => {
    const rows = document.querySelectorAll('.emp-row-check');
    rows.forEach(r => {
      r.checked = e.target.checked;
      if (e.target.checked) selected.add(r.dataset.id);
      else selected.delete(r.dataset.id);
    });
    updateBulkBar();
  });

  /* Bulk actions */
  document.getElementById('bulkDelete').addEventListener('click', () => {
    if (!selected.size) return;
    pendingDeleteType = 'bulk';
    pendingDeleteId   = null;
    openConfirm(`Delete ${selected.size} selected employee(s)? This cannot be undone.`);
  });
  document.getElementById('bulkClear').addEventListener('click', () => {
    selected.clear();
    document.querySelectorAll('.emp-row-check').forEach(r => r.checked = false);
    document.getElementById('selectAll').checked = false;
    updateBulkBar();
  });

  /* View modal */
  document.getElementById('viewModalClose').addEventListener('click', () => closeModal('viewModalOverlay'));
  document.getElementById('viewModalOverlay').addEventListener('click', e => { if (e.target === e.currentTarget) closeModal('viewModalOverlay'); });
  document.getElementById('viewEditBtn').addEventListener('click', () => {
    closeModal('viewModalOverlay');
    openEmpModal(viewingEmpId);
  });
  document.getElementById('viewDeleteBtn').addEventListener('click', () => {
    closeModal('viewModalOverlay');
    pendingDeleteType = 'employee';
    pendingDeleteId   = viewingEmpId;
    openConfirm('Are you sure you want to delete this employee? This cannot be undone.');
  });

  /* Department CRUD */
  document.getElementById('addDeptBtn').addEventListener('click', () => openDeptModal());
  document.getElementById('deptForm').addEventListener('submit', saveDept);
  document.getElementById('deptModalClose').addEventListener('click', () => closeModal('deptModalOverlay'));
  document.getElementById('deptCancelBtn').addEventListener('click', () => closeModal('deptModalOverlay'));
  document.getElementById('deptModalOverlay').addEventListener('click', e => { if (e.target === e.currentTarget) closeModal('deptModalOverlay'); });

  /* Confirm modal */
  document.getElementById('confirmCancel').addEventListener('click', () => closeModal('confirmOverlay'));
  document.getElementById('confirmOk').addEventListener('click', executeDelete);
  document.getElementById('confirmOverlay').addEventListener('click', e => { if (e.target === e.currentTarget) closeModal('confirmOverlay'); });

  /* ESC key */
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      ['empModalOverlay','viewModalOverlay','deptModalOverlay','confirmOverlay'].forEach(id => {
        if (!document.getElementById(id).classList.contains('hidden')) closeModal(id);
      });
    }
  });
}

/* ═══════════════════════════════════════════════════════════
   AUTH
══════════════════════════════════════════════════════════════ */
function handleLogin(e) {
  e.preventDefault();
  clearFieldError('emailError');
  clearFieldError('pwError');
  document.getElementById('loginError').classList.add('hidden');

  const email = document.getElementById('loginEmail').value.trim();
  const pw    = document.getElementById('loginPassword').value;

  let valid = true;
  if (!email) { showFieldError('emailError', 'Email is required'); valid = false; }
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { showFieldError('emailError', 'Enter a valid email'); valid = false; }
  if (!pw)    { showFieldError('pwError', 'Password is required'); valid = false; }
  if (!valid) return;

  if (email !== ADMIN_CREDENTIALS.email || pw !== ADMIN_CREDENTIALS.password) {
    const err = document.getElementById('loginError');
    err.textContent = 'Invalid email or password. Please try again.';
    err.classList.remove('hidden');
    return;
  }

  store.set(SESSION_KEY, { loggedIn: true, email, loginTime: Date.now() });
  showToast('Welcome back, Administrator!', 'success');
  showDashboard();
}

function handleLogout() {
  store.del(SESSION_KEY);
  showPage('loginPage');
  document.getElementById('loginForm').reset();
  document.getElementById('loginError').classList.add('hidden');
  clearFieldError('emailError');
  clearFieldError('pwError');
  showToast('Logged out successfully', 'info');
}

/* ═══════════════════════════════════════════════════════════
   OVERVIEW
══════════════════════════════════════════════════════════════ */
function renderOverview() {
  const total  = employees.length;
  const active = employees.filter(e => e.status === 'Active').length;
  const depts  = departments.length;

  const now   = new Date();
  const month = now.getMonth();
  const year  = now.getFullYear();
  const newM  = employees.filter(e => {
    const d = new Date(e.joinDate);
    return d.getMonth() === month && d.getFullYear() === year;
  }).length;

  animateNum('statTotal', total);
  animateNum('statActive', active);
  animateNum('statDepts', depts);
  animateNum('statNew', newM);

  // Recent employees (last 5)
  const recent = [...employees]
    .sort((a,b) => new Date(b.joinDate) - new Date(a.joinDate))
    .slice(0, 5);
  const recentList = document.getElementById('recentList');
  recentList.innerHTML = recent.map(emp => `
    <div class="recent-item">
      <div class="recent-avatar ${getAv(emp)}">${initials(emp)}</div>
      <div class="recent-info">
        <div class="recent-name">${emp.fName} ${emp.lName}</div>
        <div class="recent-dept">${emp.dept} · ${emp.role}</div>
      </div>
      <div class="recent-date">${fmtDate(emp.joinDate)}</div>
    </div>
  `).join('');

  // Dept bars
  const deptBars = document.getElementById('deptBars');
  const maxCount = Math.max(...departments.map(d => countInDept(d.name)), 1);
  deptBars.innerHTML = departments.map(d => {
    const cnt  = countInDept(d.name);
    const pct  = Math.round((cnt / total) * 100) || 0;
    const barW = Math.round((cnt / maxCount) * 100);
    return `
      <div class="dept-bar-item">
        <div class="dept-bar-label"><span>${d.name}</span><span>${cnt} (${pct}%)</span></div>
        <div class="dept-bar-track"><div class="dept-bar-fill" style="width:${barW}%"></div></div>
      </div>
    `;
  }).join('');
}

function animateNum(id, target) {
  const el    = document.getElementById(id);
  const start = 0;
  const dur   = 600;
  const s     = performance.now();
  const step  = ts => {
    const p = Math.min((ts - s) / dur, 1);
    el.textContent = Math.round(start + (target - start) * p);
    if (p < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

/* ═══════════════════════════════════════════════════════════
   EMPLOYEES — RENDER
══════════════════════════════════════════════════════════════ */
function renderEmployees() {
  const filtered = getFilteredEmployees();
  const total    = filtered.length;
  const pages    = Math.ceil(total / PAGE_SIZE) || 1;

  if (currentPage > pages) currentPage = pages;

  const start = (currentPage - 1) * PAGE_SIZE;
  const slice = filtered.slice(start, start + PAGE_SIZE);

  document.getElementById('empCount').textContent = `${total} record${total !== 1 ? 's' : ''}`;

  const tbody = document.getElementById('empTableBody');
  const empty = document.getElementById('empEmpty');

  if (!total) {
    tbody.innerHTML = '';
    empty.classList.remove('hidden');
    document.getElementById('pagination').innerHTML = '';
    return;
  }
  empty.classList.add('hidden');

  tbody.innerHTML = slice.map(emp => `
    <tr class="emp-row ${selected.has(emp.id) ? 'selected' : ''}">
      <td><input type="checkbox" class="emp-row-check" data-id="${emp.id}" ${selected.has(emp.id) ? 'checked' : ''}/></td>
      <td>
        <div class="emp-cell">
          <div class="emp-avatar-sm ${getAv(emp)}">${initials(emp)}</div>
          <div>
            <div class="emp-cell-name">${emp.fName} ${emp.lName}</div>
            <div class="emp-cell-email">${emp.email}</div>
          </div>
        </div>
      </td>
      <td style="color:var(--text-muted);font-size:0.78rem">${emp.id.toUpperCase()}</td>
      <td>${emp.dept}</td>
      <td style="color:var(--text-muted)">${emp.role}</td>
      <td>₹${formatSalary(emp.salary)}</td>
      <td><span class="badge badge-${emp.status.toLowerCase()}">${emp.status}</span></td>
      <td style="color:var(--text-muted);font-size:0.82rem">${fmtDate(emp.joinDate)}</td>
      <td>
        <div class="actions-cell">
          <button class="btn btn-icon view"  onclick="openViewModal('${emp.id}')" title="View"><i class="fa-solid fa-eye"></i></button>
          <button class="btn btn-icon edit"  onclick="openEmpModal('${emp.id}')"  title="Edit"><i class="fa-solid fa-pen"></i></button>
          <button class="btn btn-icon del"   onclick="deleteEmpConfirm('${emp.id}')" title="Delete"><i class="fa-solid fa-trash"></i></button>
        </div>
      </td>
    </tr>
  `).join('');

  // Row checkbox listeners
  document.querySelectorAll('.emp-row-check').forEach(cb => {
    cb.addEventListener('change', e => {
      const id = e.target.dataset.id;
      if (e.target.checked) selected.add(id);
      else selected.delete(id);
      const row = e.target.closest('tr');
      if (row) row.classList.toggle('selected', e.target.checked);
      updateBulkBar();
    });
  });

  renderPagination(pages);
}

function getFilteredEmployees() {
  let list = [...employees];

  if (searchQ) list = list.filter(e =>
    `${e.fName} ${e.lName} ${e.email} ${e.dept} ${e.role} ${e.id}`.toLowerCase().includes(searchQ)
  );
  if (filterDept)   list = list.filter(e => e.dept   === filterDept);
  if (filterStatus) list = list.filter(e => e.status === filterStatus);

  list.sort((a, b) => {
    if (sortKey === 'name')   return `${a.fName}${a.lName}`.localeCompare(`${b.fName}${b.lName}`);
    if (sortKey === 'dept')   return a.dept.localeCompare(b.dept);
    if (sortKey === 'date')   return new Date(b.joinDate) - new Date(a.joinDate);
    if (sortKey === 'salary') return b.salary - a.salary;
    return 0;
  });
  return list;
}

function renderPagination(pages) {
  const pg = document.getElementById('pagination');
  if (pages <= 1) { pg.innerHTML = ''; return; }

  let html = `<button class="page-btn" onclick="goPage(${currentPage-1})" ${currentPage===1?'disabled':''}><i class="fa-solid fa-chevron-left"></i></button>`;
  for (let i = 1; i <= pages; i++) {
    if (pages > 7 && Math.abs(i - currentPage) > 2 && i !== 1 && i !== pages) {
      if (i === 2 || i === pages - 1) html += `<button class="page-btn" disabled>…</button>`;
      continue;
    }
    html += `<button class="page-btn ${i===currentPage?'active':''}" onclick="goPage(${i})">${i}</button>`;
  }
  html += `<button class="page-btn" onclick="goPage(${currentPage+1})" ${currentPage===pages?'disabled':''}><i class="fa-solid fa-chevron-right"></i></button>`;
  pg.innerHTML = html;
}

window.goPage = (p) => {
  currentPage = p;
  renderEmployees();
  window.scrollTo({ top: 0, behavior: 'smooth' });
};

function updateBulkBar() {
  const bar = document.getElementById('bulkBar');
  if (selected.size > 0) {
    bar.classList.remove('hidden');
    document.getElementById('bulkCount').textContent = `${selected.size} selected`;
  } else {
    bar.classList.add('hidden');
  }
}

/* ═══════════════════════════════════════════════════════════
   EMPLOYEE MODAL — ADD / EDIT
══════════════════════════════════════════════════════════════ */
function openEmpModal(id = null) {
  clearEmpForm();
  const isEdit = !!id;
  document.getElementById('empModalTitle').textContent = isEdit ? 'Edit Employee' : 'Add Employee';
  document.getElementById('empSaveBtn').innerHTML = `<i class="fa-solid fa-floppy-disk"></i> ${isEdit ? 'Update' : 'Save'} Employee`;

  if (isEdit) {
    const emp = employees.find(e => e.id === id);
    if (!emp) return;
    document.getElementById('empId').value       = emp.id;
    document.getElementById('fName').value        = emp.fName;
    document.getElementById('lName').value        = emp.lName;
    document.getElementById('empEmail').value     = emp.email;
    document.getElementById('empPhone').value     = emp.phone;
    document.getElementById('empDept').value      = emp.dept;
    document.getElementById('empRole').value      = emp.role;
    document.getElementById('empSalary').value    = emp.salary;
    document.getElementById('empJoinDate').value  = emp.joinDate;
    document.getElementById('empStatus').value    = emp.status;
    document.getElementById('empGender').value    = emp.gender;
    document.getElementById('empAddress').value   = emp.address || '';
  }

  openModal('empModalOverlay');
}

function closeEmpModal() { closeModal('empModalOverlay'); }

function clearEmpForm() {
  document.getElementById('empForm').reset();
  document.getElementById('empId').value = '';
  ['fNameErr','lNameErr','empEmailErr','empPhoneErr','empDeptErr','empRoleErr','empSalaryErr','empJoinErr']
    .forEach(id => clearFieldError(id));
}

function saveEmployee(e) {
  e.preventDefault();
  if (!validateEmpForm()) return;

  const id      = document.getElementById('empId').value;
  const isEdit  = !!id;
  const empData = {
    id:       isEdit ? id : genId('e'),
    fName:    document.getElementById('fName').value.trim(),
    lName:    document.getElementById('lName').value.trim(),
    email:    document.getElementById('empEmail').value.trim().toLowerCase(),
    phone:    document.getElementById('empPhone').value.trim(),
    dept:     document.getElementById('empDept').value,
    role:     document.getElementById('empRole').value.trim(),
    salary:   parseInt(document.getElementById('empSalary').value),
    joinDate: document.getElementById('empJoinDate').value,
    status:   document.getElementById('empStatus').value,
    gender:   document.getElementById('empGender').value,
    address:  document.getElementById('empAddress').value.trim(),
  };

  if (isEdit) {
    const idx = employees.findIndex(e => e.id === id);
    if (idx !== -1) employees[idx] = empData;
    showToast('Employee updated successfully', 'success');
  } else {
    employees.unshift(empData);
    showToast('Employee added successfully', 'success');
  }

  store.set(EMP_KEY, employees);
  closeEmpModal();
  renderEmployees();
  renderOverview();
}

function validateEmpForm() {
  let valid = true;
  const id = document.getElementById('empId').value;

  const fName = document.getElementById('fName').value.trim();
  const lName = document.getElementById('lName').value.trim();
  const email = document.getElementById('empEmail').value.trim();
  const phone = document.getElementById('empPhone').value.trim();
  const dept  = document.getElementById('empDept').value;
  const role  = document.getElementById('empRole').value.trim();
  const sal   = document.getElementById('empSalary').value;
  const join  = document.getElementById('empJoinDate').value;

  if (!fName) { showFieldError('fNameErr', 'First name is required'); valid = false; }
  else if (fName.length < 2) { showFieldError('fNameErr', 'Min 2 characters'); valid = false; }
  else clearFieldError('fNameErr');

  if (!lName) { showFieldError('lNameErr', 'Last name is required'); valid = false; }
  else clearFieldError('lNameErr');

  if (!email) { showFieldError('empEmailErr', 'Email is required'); valid = false; }
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { showFieldError('empEmailErr', 'Invalid email format'); valid = false; }
  else {
    const dup = employees.find(e => e.email.toLowerCase() === email.toLowerCase() && e.id !== id);
    if (dup) { showFieldError('empEmailErr', 'Email already exists'); valid = false; }
    else clearFieldError('empEmailErr');
  }

  if (!phone) { showFieldError('empPhoneErr', 'Phone is required'); valid = false; }
  else if (phone.replace(/\D/g,'').length < 10) { showFieldError('empPhoneErr', 'Enter a valid phone'); valid = false; }
  else clearFieldError('empPhoneErr');

  if (!dept) { showFieldError('empDeptErr', 'Department is required'); valid = false; }
  else clearFieldError('empDeptErr');

  if (!role) { showFieldError('empRoleErr', 'Job title is required'); valid = false; }
  else clearFieldError('empRoleErr');

  if (!sal || isNaN(sal) || parseInt(sal) < 0) { showFieldError('empSalaryErr', 'Enter a valid salary'); valid = false; }
  else clearFieldError('empSalaryErr');

  if (!join) { showFieldError('empJoinErr', 'Join date is required'); valid = false; }
  else if (new Date(join) > new Date()) { showFieldError('empJoinErr', 'Date cannot be in the future'); valid = false; }
  else clearFieldError('empJoinErr');

  return valid;
}

/* ═══════════════════════════════════════════════════════════
   VIEW MODAL
══════════════════════════════════════════════════════════════ */
window.openViewModal = (id) => {
  const emp = employees.find(e => e.id === id);
  if (!emp) return;
  viewingEmpId = id;

  document.getElementById('viewAvatar').className = `profile-avatar ${getAv(emp)}`;
  document.getElementById('viewAvatar').textContent = initials(emp);
  document.getElementById('viewName').textContent   = `${emp.fName} ${emp.lName}`;
  document.getElementById('viewRole').textContent   = emp.role;
  document.getElementById('viewDept').textContent   = emp.dept;
  document.getElementById('viewStatus').innerHTML   = `<span class="badge badge-${emp.status.toLowerCase()}">${emp.status}</span>`;

  const fields = [
    ['Employee ID',  emp.id.toUpperCase()],
    ['Email',        emp.email],
    ['Phone',        emp.phone],
    ['Department',   emp.dept],
    ['Salary',       `₹${formatSalary(emp.salary)} / yr`],
    ['Join Date',    fmtDate(emp.joinDate)],
    ['Gender',       emp.gender],
    ['Address',      emp.address || '—'],
  ];

  document.getElementById('profileGrid').innerHTML = fields.map(([l, v]) => `
    <div class="profile-field">
      <div class="profile-field-label">${l}</div>
      <div class="profile-field-value">${v}</div>
    </div>
  `).join('');

  openModal('viewModalOverlay');
};

/* ═══════════════════════════════════════════════════════════
   DELETE
══════════════════════════════════════════════════════════════ */
window.deleteEmpConfirm = (id) => {
  pendingDeleteType = 'employee';
  pendingDeleteId   = id;
  openConfirm('Are you sure you want to delete this employee? This cannot be undone.');
};

function openConfirm(msg) {
  document.getElementById('confirmMsg').textContent = msg;
  openModal('confirmOverlay');
}

function executeDelete() {
  closeModal('confirmOverlay');

  if (pendingDeleteType === 'employee') {
    employees = employees.filter(e => e.id !== pendingDeleteId);
    store.set(EMP_KEY, employees);
    selected.delete(pendingDeleteId);
    showToast('Employee deleted', 'success');
    renderEmployees();
    renderOverview();
  }
  else if (pendingDeleteType === 'bulk') {
    employees = employees.filter(e => !selected.has(e.id));
    store.set(EMP_KEY, employees);
    const count = selected.size;
    selected.clear();
    showToast(`${count} employees deleted`, 'success');
    document.getElementById('bulkBar').classList.add('hidden');
    renderEmployees();
    renderOverview();
  }
  else if (pendingDeleteType === 'dept') {
    departments = departments.filter(d => d.id !== pendingDeleteId);
    store.set(DEPT_KEY, departments);
    populateDeptDropdowns();
    showToast('Department deleted', 'success');
    renderDepartments();
    renderOverview();
  }

  pendingDeleteId = null; pendingDeleteType = null;
}

/* ═══════════════════════════════════════════════════════════
   DEPARTMENTS
══════════════════════════════════════════════════════════════ */
function renderDepartments() {
  const grid = document.getElementById('deptGrid');
  if (!departments.length) {
    grid.innerHTML = '<div class="empty-state"><i class="fa-solid fa-sitemap"></i><p>No departments yet</p></div>';
    return;
  }

  grid.innerHTML = departments.map((d, i) => {
    const cnt  = countInDept(d.name);
    const icon = DEPT_ICONS[i % DEPT_ICONS.length];
    const av   = AV_COLORS[i % AV_COLORS.length];
    return `
      <div class="dept-tile">
        <div class="dept-tile-icon ${av}"><i class="fa-solid ${icon}"></i></div>
        <div class="dept-tile-name">${d.name}</div>
        <div class="dept-tile-desc">${d.desc || 'No description'}</div>
        <div class="dept-tile-meta">
          <div class="dept-tile-count"><i class="fa-solid fa-users" style="margin-right:4px;opacity:0.5"></i>${cnt} employee${cnt !== 1 ? 's' : ''}</div>
          <div class="dept-tile-actions">
            <button class="btn btn-icon edit" onclick="openDeptModal('${d.id}')" title="Edit"><i class="fa-solid fa-pen"></i></button>
            <button class="btn btn-icon del"  onclick="deleteDeptConfirm('${d.id}')" title="Delete"><i class="fa-solid fa-trash"></i></button>
          </div>
        </div>
        ${d.head ? `<div style="margin-top:0.7rem;font-size:0.75rem;color:var(--text-dim)"><i class="fa-solid fa-user-tie" style="margin-right:4px"></i>HOD: ${d.head}</div>` : ''}
      </div>
    `;
  }).join('');
}

function openDeptModal(id = null) {
  document.getElementById('deptForm').reset();
  clearFieldError('deptNameErr');
  const isEdit = !!id;
  document.getElementById('deptModalTitle').textContent = isEdit ? 'Edit Department' : 'Add Department';
  document.getElementById('deptId').value = '';

  if (isEdit) {
    const dept = departments.find(d => d.id === id);
    if (!dept) return;
    document.getElementById('deptId').value   = dept.id;
    document.getElementById('deptName').value = dept.name;
    document.getElementById('deptDesc').value = dept.desc;
    document.getElementById('deptHead').value = dept.head;
  }
  openModal('deptModalOverlay');
}

function saveDept(e) {
  e.preventDefault();
  clearFieldError('deptNameErr');
  const id   = document.getElementById('deptId').value;
  const name = document.getElementById('deptName').value.trim();
  const desc = document.getElementById('deptDesc').value.trim();
  const head = document.getElementById('deptHead').value.trim();

  if (!name) { showFieldError('deptNameErr', 'Department name is required'); return; }
  const dup = departments.find(d => d.name.toLowerCase() === name.toLowerCase() && d.id !== id);
  if (dup) { showFieldError('deptNameErr', 'Department already exists'); return; }

  if (id) {
    const idx = departments.findIndex(d => d.id === id);
    if (idx !== -1) departments[idx] = { id, name, desc, head };
    showToast('Department updated', 'success');
  } else {
    departments.push({ id: genId('d'), name, desc, head });
    showToast('Department added', 'success');
  }

  store.set(DEPT_KEY, departments);
  populateDeptDropdowns();
  closeModal('deptModalOverlay');
  renderDepartments();
  renderOverview();
}

window.openDeptModal = openDeptModal;

window.deleteDeptConfirm = (id) => {
  const cnt = countInDept(departments.find(d=>d.id===id)?.name || '');
  const msg = cnt > 0
    ? `This department has ${cnt} employee(s). Deleting it won't remove the employees. Continue?`
    : 'Delete this department? This cannot be undone.';
  pendingDeleteType = 'dept';
  pendingDeleteId   = id;
  openConfirm(msg);
};

function populateDeptDropdowns() {
  const selects = [
    document.getElementById('empDept'),
    document.getElementById('deptFilter'),
  ];
  selects.forEach(sel => {
    if (!sel) return;
    const placeholder = sel.options[0].text;
    const placeholder_val = sel.options[0].value;
    sel.innerHTML = `<option value="${placeholder_val}">${placeholder}</option>`;
    departments.forEach(d => {
      const opt = document.createElement('option');
      opt.value = d.name;
      opt.textContent = d.name;
      sel.appendChild(opt);
    });
  });
}

/* ═══════════════════════════════════════════════════════════
   MODAL HELPERS
══════════════════════════════════════════════════════════════ */
function openModal(id)  { document.getElementById(id).classList.remove('hidden'); document.body.style.overflow = 'hidden'; }
function closeModal(id) { document.getElementById(id).classList.add('hidden');    document.body.style.overflow = '';       }

/* ═══════════════════════════════════════════════════════════
   TOAST
══════════════════════════════════════════════════════════════ */
function showToast(msg, type = 'success') {
  const icons = { success: 'fa-circle-check', error: 'fa-circle-xmark', info: 'fa-circle-info' };
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `<i class="fa-solid ${icons[type] || icons.info}"></i><span class="toast-msg">${msg}</span>`;

  const container = document.getElementById('toastContainer');
  container.appendChild(toast);

  setTimeout(() => {
    toast.classList.add('toast-out');
    setTimeout(() => toast.remove(), 280);
  }, 3000);
}

/* ═══════════════════════════════════════════════════════════
   FIELD ERROR HELPERS
══════════════════════════════════════════════════════════════ */
function showFieldError(id, msg) {
  const el = document.getElementById(id);
  if (el) el.textContent = msg;
}
function clearFieldError(id) {
  const el = document.getElementById(id);
  if (el) el.textContent = '';
}

/* ═══════════════════════════════════════════════════════════
   UTILITY FUNCTIONS
══════════════════════════════════════════════════════════════ */
function initials(emp) {
  return ((emp.fName[0] || '') + (emp.lName[0] || '')).toUpperCase();
}

function getAv(emp) {
  const idx = Math.abs(hashStr(emp.fName + emp.lName)) % AV_COLORS.length;
  return AV_COLORS[idx];
}

function hashStr(s) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return h;
}

function fmtDate(d) {
  if (!d) return '—';
  const dt = new Date(d);
  return dt.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatSalary(n) {
  if (!n) return '0';
  if (n >= 100000) return (n / 100000).toFixed(1).replace(/\.0$/, '') + 'L';
  return n.toLocaleString('en-IN');
}

function countInDept(name) {
  return employees.filter(e => e.dept === name).length;
}

function genId(prefix) {
  return prefix + Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
}
