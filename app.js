// TenderKart - Frontend Application Logic (Two-Role Simplified Architecture)

const API_BASE =
  window.location.protocol === "file:" ||
  ((window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1") &&
    ["5500", "5501", "5502", "5503"].includes(window.location.port))
    ? "http://localhost:5000/api"
    : "/api";

const PERMITTED_CATEGORIES = [
  "Roads",
  "Bridges",
  "Water Supply",
  "Buildings",
  "Metro Projects",
  "Smart City"
];

const FALLBACK_INDIAN_STATES = [
  "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh", "Goa",
  "Gujarat", "Haryana", "Himachal Pradesh", "Jharkhand", "Karnataka", "Kerala",
  "Madhya Pradesh", "Maharashtra", "Manipur", "Meghalaya", "Mizoram", "Nagaland",
  "Odisha", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana", "Tripura",
  "Uttar Pradesh", "Uttarakhand", "West Bengal", "Chandigarh", "Delhi", "Jammu and Kashmir",
  "Ladakh", "Puducherry"
];

// Page-specific initialization when the DOM is ready
document.addEventListener("DOMContentLoaded", () => {
  loadTheme();
  if (!setupAuthUI()) return;
  renderNavbar();
  renderFooter();
  window.addEventListener("hashchange", renderNavbar);

  const page = currentPage();
  if (page === "index.html" || page === "") {
    initHomepage();
  } else if (page === "login.html") {
    initLoginPage();
  } else if (page === "register.html") {
    initRegisterPage();
  } else if (page === "tenders.html") {
    initTendersPage();
  } else if (page === "tenderDetails.html") {
    initTenderDetailsPage();
  } else if (page === "saved.html") {
    initSavedPage();
  } else if (page === "dashboard.html") {
    initDashboardPage();
  } else if (page === "admin.html") {
    initAdminPage();
  }
});

// Helper to bypass browser/proxy HTTP cache for live SQLite-backed API reads
function fetchNoCache(url, options = {}) {
  return fetch(url, { ...options, cache: "no-store" });
}

// Helper to escape HTML safely
function escapeHtml(str) {
  if (str === null || str === undefined) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function currentPage() {
  return window.location.pathname.split("/").pop() || "index.html";
}

function getAuthHeaders() {
  const token = localStorage.getItem("token");
  return {
    "Content-Type": "application/json",
    Authorization: token ? `Bearer ${token}` : ""
  };
}

function getLocalTodayStr() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function addDaysToLocalDate(days) {
  const dt = new Date();
  dt.setDate(dt.getDate() + days);
  const y = dt.getFullYear();
  const m = String(dt.getMonth() + 1).padStart(2, "0");
  const d = String(dt.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/* ---------------- THEME TOGGLER ---------------- */
function toggleTheme() {
  const body = document.body;
  body.classList.toggle("dark-theme");
  const isDark = body.classList.contains("dark-theme");
  localStorage.setItem("theme", isDark ? "dark" : "light");

  const themeIcons = document.querySelectorAll(".theme-icon");
  themeIcons.forEach((icon) => {
    icon.innerHTML = isDark
      ? '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/></svg>'
      : '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/></svg>';
  });

  if (typeof updateAdminChartTheme === "function") {
    updateAdminChartTheme();
  }
}

function loadTheme() {
  const savedTheme = localStorage.getItem("theme") || "light";
  if (savedTheme === "dark") {
    document.body.classList.add("dark-theme");
  } else {
    document.body.classList.remove("dark-theme");
  }
}

function getTenderStatus(deadlineStr, dbStatus) {
  const explicit = (dbStatus || "").trim();
  if (explicit === "Closed") {
    return { label: "Closed", class: "badge-red", countdown: "Closed" };
  }

  const todayStr = getLocalTodayStr();
  if (!deadlineStr || !/^\d{4}-\d{2}-\d{2}$/.test(deadlineStr)) {
    return { label: "Open", class: "badge-green", countdown: deadlineStr || "Active" };
  }

  if (deadlineStr < todayStr) {
    return { label: "Closed", class: "badge-red", countdown: "Deadline passed" };
  }

  const [dy, dm, dd] = deadlineStr.split("-").map(Number);
  const [ty, tm, td] = todayStr.split("-").map(Number);
  const diffDays = Math.round((Date.UTC(dy, dm - 1, dd) - Date.UTC(ty, tm - 1, td)) / (1000 * 60 * 60 * 24));

  if (diffDays <= 7) {
    const dayText = diffDays === 0 ? "today" : diffDays === 1 ? "in 1 day" : `in ${diffDays} days`;
    return { label: "Closing Soon", class: "badge-orange", countdown: `Closes ${dayText}` };
  }

  return { label: "Open", class: "badge-green", countdown: `Closes in ${diffDays} days` };
}

/* ---------------- TOAST POPUPS ---------------- */
function showToast(message, type = "info") {
  const container = document.getElementById("toast-container");
  if (!container) return;

  const toast = document.createElement("div");
  toast.className = "toast-item";

  let borderColor = "#2563EB";
  let icon = '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#2563EB" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>';

  if (type === "success") {
    borderColor = "#10B981";
    icon = '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#10B981" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><path d="m9 11 3 3L22 4"/></svg>';
  } else if (type === "warning") {
    borderColor = "#F59E0B";
    icon = '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#F59E0B" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>';
  } else if (type === "error") {
    borderColor = "#EF4444";
    icon = '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#EF4444" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>';
  }

  toast.style.borderLeft = `4px solid ${borderColor}`;
  toast.innerHTML = `
    <div style="display: flex; align-items: center; gap: 12px;">
      ${icon}
      <span style="font-size: 0.9rem; font-weight: 500; color: var(--text-primary);">${escapeHtml(message)}</span>
    </div>
    <button onclick="this.parentElement.remove()" style="background: none; border: none; color: var(--text-muted); cursor: pointer; padding: 4px; display: flex; align-items: center; justify-content: center; border-radius: 4px;">
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
    </button>
  `;

  container.appendChild(toast);
  setTimeout(() => {
    toast.remove();
  }, 4000);
}

/* ---------------- NAVBAR, FOOTER & ROLE-BASED AUTH GUARD ---------------- */
function getDashboardUrlForRole(role) {
  const r = (role || "").toLowerCase();
  if (r === "admin") return "admin.html";
  return "dashboard.html";
}

function getSafeStoredUser() {
  const userJson = localStorage.getItem("user");
  if (!userJson) return null;
  try {
    const parsed = JSON.parse(userJson);
    const role = (parsed?.role || "").toLowerCase();
    if (role !== "admin" && role !== "contractor") {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      return null;
    }
    return { ...parsed, role };
  } catch {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    return null;
  }
}

function setupAuthUI() {
  const user = getSafeStoredUser();
  const path = currentPage();
  const roleLower = user ? user.role : "";

  if (path === "dashboard.html" || path === "saved.html") {
    if (!user) {
      window.location.href = "login.html";
      return false;
    }
    if (roleLower !== "contractor") {
      window.location.href = getDashboardUrlForRole(roleLower);
      return false;
    }
  }

  if (path === "admin.html") {
    if (!user) {
      window.location.href = "login.html";
      return false;
    }
    if (roleLower !== "admin") {
      window.location.href = getDashboardUrlForRole(roleLower);
      return false;
    }
  }

  if ((path === "login.html" || path === "register.html") && user) {
    window.location.href = getDashboardUrlForRole(roleLower);
    return false;
  }

  return true;
}

function renderNavbar() {
  const placeholder = document.getElementById("navbar-placeholder");
  if (!placeholder) return;

  const isDark = document.body.classList.contains("dark-theme");
  const user = getSafeStoredUser();
  const role = user ? user.role : "";
  const activePath = currentPage();
  const activeHash = window.location.hash || "";

  const themeButtonIcon = isDark
    ? '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/></svg>'
    : '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/></svg>';

  let navItems = [];
  if (role === "admin") {
    navItems = [
      { label: "Admin Dashboard", href: "admin.html", active: activePath === "admin.html" && !activeHash },
      { label: "Manage Tenders", href: "admin.html#manage-tenders", active: activePath === "admin.html" && activeHash === "#manage-tenders" },
      { label: "Tender Distribution", href: "admin.html#tender-distribution", active: activePath === "admin.html" && activeHash === "#tender-distribution" },
      { label: "How It Works", href: "about.html", active: activePath === "about.html" }
    ];
  } else if (role === "contractor") {
    navItems = [
      { label: "Dashboard", href: "dashboard.html", active: activePath === "dashboard.html" },
      { label: "Browse Tenders", href: "tenders.html", active: activePath === "tenders.html" || activePath === "tenderDetails.html" },
      { label: "Saved Tenders", href: "saved.html", active: activePath === "saved.html" },
      { label: "How It Works", href: "about.html", active: activePath === "about.html" }
    ];
  } else {
    navItems = [
      { label: "Home", href: "index.html", active: activePath === "index.html" || activePath === "" },
      { label: "About", href: "about-tenderkart.html", active: activePath === "about-tenderkart.html" },
      { label: "Browse Tenders", href: "tenders.html", active: activePath === "tenders.html" || activePath === "tenderDetails.html" },
      { label: "How It Works", href: "about.html", active: activePath === "about.html" }
    ];
  }

  const desktopLinksHtml = navItems
    .map(
      (item) =>
        `<a href="${item.href}" class="nav-link${item.active ? " active" : ""}" style="white-space: nowrap; font-size: 0.92rem;${item.active ? " color: var(--color-primary); font-weight: 700;" : ""}">${item.label}</a>`
    )
    .join("");

  const mobileLinksHtml = navItems
    .map(
      (item) =>
        `<a href="${item.href}" style="font-size: 1rem; font-weight: 600; color: ${item.active ? "var(--color-primary)" : "var(--text-primary)"}; padding: 8px 0; border-bottom: 1px solid var(--border-color);">${item.label}</a>`
    )
    .join("");

  let authSectionHtml = "";
  if (user) {
    const badgeLabel = role === "admin" ? "Central Admin" : escapeHtml(user.user_code || user.username || "Contractor");
    const homeHref = role === "admin" ? "admin.html" : "dashboard.html";
    authSectionHtml = `
      <div style="display: flex; align-items: center; gap: 10px;">
        <a href="${homeHref}" style="display: inline-flex; align-items: center; gap: 6px; padding: 0.45rem 0.9rem; border-radius: 10px; font-size: 0.85rem; font-weight: 700; background-color: rgba(var(--primary-rgb), 0.08); color: var(--color-primary); border: 1px solid rgba(var(--primary-rgb), 0.25); white-space: nowrap;">
          <span>${badgeLabel}</span>
        </a>
        <button onclick="handleLogout()" class="btn" style="padding: 0.45rem 0.9rem; border-radius: 10px; font-size: 0.85rem; font-weight: 600; color: var(--color-danger); background-color: rgba(239, 68, 68, 0.08); border: 1px solid rgba(239, 68, 68, 0.2); display: inline-flex; align-items: center; gap: 6px; white-space: nowrap;">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
          <span>Logout</span>
        </button>
      </div>
    `;
  } else {
    authSectionHtml = `
      <div style="display: flex; align-items: center; gap: 10px;">
        <a href="login.html" style="font-size: 0.92rem; font-weight: 600; padding: 0.45rem 0.85rem; color: var(--text-primary); white-space: nowrap;">Login</a>
        <a href="register.html" style="font-size: 0.92rem; font-weight: 600; padding: 0.55rem 1.1rem; border-radius: 10px; background-color: var(--color-primary); color: #FFFFFF; box-shadow: 0 4px 10px rgba(var(--primary-rgb), 0.15); white-space: nowrap;">Register</a>
      </div>
    `;
  }

  placeholder.innerHTML = `
    <nav class="glass" style="position: sticky; top: 0; z-index: 1000; width: 100%;">
      <div class="container" style="display: flex; align-items: center; justify-content: space-between; height: 76px; gap: 16px;">
        <a href="index.html" style="display: flex; align-items: center; gap: 10px; flex-shrink: 0;">
          <img src="images/logo.jpg" alt="TenderKart Logo" style="height: 44px; width: 44px; border-radius: 8px; object-fit: cover;" />
          <div style="display: flex; flex-direction: column;">
            <span style="font-size: 1.2rem; font-weight: 800; color: var(--color-primary); letter-spacing: -0.5px;">TenderKart</span>
            <span style="font-size: 0.63rem; color: var(--text-muted); font-weight: 600; margin-top: -2px;">Urban Infrastructure Opportunities Tracker</span>
          </div>
        </a>

        <div style="display: flex; align-items: center; gap: 20px;" id="desktop-nav-links">
          ${desktopLinksHtml}
        </div>

        <div style="display: flex; align-items: center; gap: 12px; flex-shrink: 0;" id="desktop-nav-actions">
          <button onclick="toggleTheme()" class="theme-icon" aria-label="Toggle theme" style="background: none; border: none; cursor: pointer; padding: 8px; border-radius: 8px; display: flex; align-items: center; justify-content: center; transition: var(--transition-smooth); background-color: var(--bg-toggle); border: 1px solid var(--border-toggle); color: var(--color-primary);">
            ${themeButtonIcon}
          </button>
          ${authSectionHtml}
        </div>

        <button id="mobile-menu-btn" onclick="toggleMobileMenu()" aria-label="Toggle menu" style="background: none; border: none; cursor: pointer; display: none; padding: 8px; border-radius: 8px; align-items: center; justify-content: center; color: var(--text-primary);">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="4" x2="20" y1="12" y2="12"/><line x1="4" x2="20" y1="6" y2="6"/><line x1="4" x2="20" y1="18" y2="18"/></svg>
        </button>
      </div>

      <div id="mobile-menu-drawer" style="display: none; flex-direction: column; width: 100%; border-top: 1px solid var(--border-color); background-color: var(--bg-secondary); padding: 1.5rem; gap: 12px; box-shadow: 0 4px 10px rgba(0,0,0,0.05);">
        ${mobileLinksHtml}
        <div style="display: flex; align-items: center; justify-content: space-between; padding-top: 12px; margin-top: 4px;">
          <button onclick="toggleTheme()" class="theme-icon" aria-label="Toggle theme" style="background: none; border: none; cursor: pointer; padding: 8px; border-radius: 8px; display: flex; align-items: center; justify-content: center; background-color: var(--bg-toggle); border: 1px solid var(--border-toggle); color: var(--color-primary);">
            ${themeButtonIcon}
          </button>
          ${authSectionHtml}
        </div>
      </div>
    </nav>
  `;
}

window.toggleMobileMenu = () => {
  const drawer = document.getElementById("mobile-menu-drawer");
  if (!drawer) return;
  drawer.style.display = drawer.style.display === "none" ? "flex" : "none";
};

function renderFooter() {
  const placeholder = document.getElementById("footer-placeholder");
  if (!placeholder) return;

  const user = getSafeStoredUser();
  const dashboardHref = user ? getDashboardUrlForRole(user.role) : "login.html";

  placeholder.innerHTML = `
    <footer class="site-footer-dark">
      <div class="container" style="display: grid; grid-template-columns: 2fr 1fr 1fr 1fr; gap: 4rem; padding-bottom: 3rem;" id="footer-grid">
        <div style="display: flex; flex-direction: column; gap: 1.25rem;">
          <div style="display: flex; align-items: center; gap: 12px;">
            <img src="images/logo.jpg" alt="TenderKart Logo" style="height: 42px; width: 42px; border-radius: 8px; object-fit: cover;" />
            <div>
              <h3 style="font-size: 1.2rem; font-weight: 800; color: #38BDF8; letter-spacing: -0.5px;">TenderKart</h3>
              <p style="font-size: 0.65rem; color: #64748B; font-weight: 600; margin-top: -2px;">Urban Infrastructure Opportunities Tracker</p>
            </div>
          </div>
          <p style="font-size: 0.9rem; line-height: 1.6; color: #94A3B8; max-width: 340px;">
            Simplifying infrastructure tender discovery, AI-assisted understanding, and personal bid application tracking across India.
          </p>
        </div>

        <div style="display: flex; flex-direction: column; gap: 1.25rem;">
          <h4 style="font-size: 0.8rem; font-weight: 800; color: #F1F5F9; text-transform: uppercase; letter-spacing: 1px;">Platform</h4>
          <ul style="list-style: none; display: flex; flex-direction: column; gap: 12px;">
            <li><a href="about-tenderkart.html" class="footer-link">About TenderKart</a></li>
            <li><a href="tenders.html" class="footer-link">Browse Tenders</a></li>
            <li><a href="about.html" class="footer-link">How It Works</a></li>
            <li><a href="${dashboardHref}" class="footer-link">Dashboard</a></li>
          </ul>
        </div>

        <div style="display: flex; flex-direction: column; gap: 1.25rem;">
          <h4 style="font-size: 0.8rem; font-weight: 800; color: #F1F5F9; text-transform: uppercase; letter-spacing: 1px;">Account</h4>
          <ul style="list-style: none; display: flex; flex-direction: column; gap: 12px;">
            <li><a href="login.html" class="footer-link">Login</a></li>
            <li><a href="register.html" class="footer-link">Contractor Register</a></li>
          </ul>
        </div>

        <div style="display: flex; flex-direction: column; gap: 1.25rem;">
          <h4 style="font-size: 0.8rem; font-weight: 800; color: #F1F5F9; text-transform: uppercase; letter-spacing: 1px;">Navigate</h4>
          <ul style="list-style: none; display: flex; flex-direction: column; gap: 12px;">
            <li><a href="index.html" class="footer-link">Home</a></li>
            <li><a href="tenders.html" class="footer-link">Search &amp; Filter</a></li>
            <li><a href="about.html" class="footer-link">Disclaimer &amp; Guide</a></li>
          </ul>
        </div>
      </div>

      <div class="footer-bottom-bar">
        <div class="container" style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px; font-size: 0.85rem;">
          <span class="footer-copyright">© 2026 TenderKart · Created by Shreyansh Sinha</span>
          <a href="#" class="footer-top-btn" style="display: inline-flex; align-items: center; gap: 4px;">← Back to Top</a>
        </div>
      </div>
    </footer>
  `;
}

function handleLogout() {
  localStorage.removeItem("token");
  localStorage.removeItem("user");
  showToast("Logged out successfully", "success");
  setTimeout(() => {
    window.location.href = "index.html";
  }, 600);
}

/* ---------------- HOMEPAGE LOGIC ---------------- */
function handleHeroSearch(e) {
  if (e) e.preventDefault();
  const input = document.getElementById("hero-search-query");
  const query = input ? input.value.trim() : "";
  window.location.href = query ? `tenders.html?search=${encodeURIComponent(query)}` : "tenders.html";
}

function initHomepage() {
  initHeroShowcase();

  const categories = [
    { name: "Roads", icon: "🛣️", count: 0, desc: "Highway expansions, paving & arterial links", color: "#16A085" },
    { name: "Bridges", icon: "🌉", count: 0, desc: "Creek crossings, flyovers & underpasses", color: "#20B2A6" },
    { name: "Water Supply", icon: "🚰", count: 0, desc: "Treatment plants & local supply grids", color: "#20B2A6" },
    { name: "Buildings", icon: "🏢", count: 0, desc: "Public complexes, hospitals & campuses", color: "#F4B942" },
    { name: "Metro Projects", icon: "🚇", count: 0, desc: "Elevated viaducts, tunnels & stations", color: "#0B6B57" },
    { name: "Smart City", icon: "🏙️", count: 0, desc: "ICCC command systems & smart infrastructure", color: "#D99A2B" }
  ];

  setupStatsScrollTrigger();

  fetchNoCache(`${API_BASE}/tenders`)
    .then((res) => (res.ok ? res.json() : Promise.reject(new Error("API error"))))
    .then((tenders) => {
      categories.forEach((cat) => {
        cat.count = tenders.filter((t) => t.category === cat.name).length;
      });
      renderCategoryGrid(categories);
    })
    .catch(() => {
      renderCategoryGrid(categories);
    });

  setupScrollFade();
}

const HERO_SHOWCASE_TENDERS = [
  {
    category: "ROADS & HIGHWAYS",
    badgeClass: "badge-blue",
    title: "Delhi-Amritsar-Katra Expressway (Package 8)",
    department: "National Highways Authority of India (NHAI) • Punjab Corridor",
    value: "₹1,425 Cr",
    matchScore: "⚡ 99.2% Match",
    pipeline: "₹14,500+ Cr",
    categoryFilter: "Roads",
    image: "images/hero-roads.jpg"
  },
  {
    category: "METRO & TRANSIT",
    badgeClass: "badge-purple",
    title: "DMRC Phase-IV Aerocity to Tughlakabad Underground Corridor",
    department: "Delhi Metro Rail Corporation (DMRC) • New Delhi",
    value: "₹1,650 Cr",
    matchScore: "⚡ 98.4% Match",
    pipeline: "₹18,200+ Cr",
    categoryFilter: "Metro Projects",
    image: "images/hero-metro.jpg"
  },
  {
    category: "GOVT BUILDINGS",
    badgeClass: "badge-orange",
    title: "12-Storey International Diamond & Trade Center at GIFT City",
    department: "Gujarat International Finance Tec-City • Ahmedabad, Gujarat",
    value: "₹750 Cr",
    matchScore: "⚡ 97.6% Match",
    pipeline: "₹9,400+ Cr",
    categoryFilter: "Buildings",
    image: "images/hero-buildings.jpg"
  },
  {
    category: "BRIDGES & FLYOVERS",
    badgeClass: "badge-green",
    title: "Thane-Navi Mumbai 6-Lane Creek Bridge across Thane Creek",
    department: "Mumbai Metropolitan Region Dev Authority • Mumbai",
    value: "₹1,250 Cr",
    matchScore: "⚡ 96.8% Match",
    pipeline: "₹11,600+ Cr",
    categoryFilter: "Bridges",
    image: "images/hero-bridges.jpg"
  },
  {
    category: "WATER INFRASTRUCTURE",
    badgeClass: "badge-cyan",
    title: "100 MLD Automated Water Treatment Plant at Chandrawal",
    department: "Delhi Jal Board (DJB) • Delhi",
    value: "₹580 Cr",
    matchScore: "⚡ 95.9% Match",
    pipeline: "₹7,800+ Cr",
    categoryFilter: "Water Supply",
    image: "images/hero-water.jpg"
  },
  {
    category: "SMART CITY & ICCC",
    badgeClass: "badge-purple",
    title: "Bhopal Smart City ICCC Expansion & City AI Video Analytics",
    department: "Bhopal Smart City Development Corp • Bhopal",
    value: "₹385 Cr",
    matchScore: "⚡ 99.1% Match",
    pipeline: "₹15,100+ Cr",
    categoryFilter: "Smart City",
    image: "images/hero-smartcity.jpg"
  }
];

let currentHeroTenderIndex = 0;
let heroAutoRotateTimer = null;

function startHeroAutoRotate() {
  stopHeroAutoRotate();
  heroAutoRotateTimer = setInterval(() => {
    changeHeroTender(1);
  }, 5000);
}

function stopHeroAutoRotate() {
  if (heroAutoRotateTimer) {
    clearInterval(heroAutoRotateTimer);
    heroAutoRotateTimer = null;
  }
}

function initHeroShowcase() {
  let savedIndex = parseInt(localStorage.getItem("tenderkart_hero_tender_index"), 10);
  if (isNaN(savedIndex) || savedIndex < 0) savedIndex = 0;
  currentHeroTenderIndex = savedIndex % HERO_SHOWCASE_TENDERS.length;

  renderHeroTenderCard(HERO_SHOWCASE_TENDERS[currentHeroTenderIndex]);
  localStorage.setItem("tenderkart_hero_tender_index", ((currentHeroTenderIndex + 1) % HERO_SHOWCASE_TENDERS.length).toString());

  const prevBtn = document.getElementById("hero-prev-btn");
  const nextBtn = document.getElementById("hero-next-btn");
  if (prevBtn) {
    prevBtn.onclick = (e) => {
      e.stopPropagation();
      changeHeroTender(-1);
      startHeroAutoRotate();
    };
  }
  if (nextBtn) {
    nextBtn.onclick = (e) => {
      e.stopPropagation();
      changeHeroTender(1);
      startHeroAutoRotate();
    };
  }

  startHeroAutoRotate();
}

function changeHeroTender(direction) {
  const total = HERO_SHOWCASE_TENDERS.length;
  currentHeroTenderIndex = (currentHeroTenderIndex + direction + total) % total;
  renderHeroTenderCard(HERO_SHOWCASE_TENDERS[currentHeroTenderIndex]);
}

function renderHeroTenderCard(item) {
  const catEl = document.getElementById("hero-tender-category");
  const titleEl = document.getElementById("hero-tender-title");
  const deptEl = document.getElementById("hero-tender-dept");
  const valEl = document.getElementById("hero-tender-value");
  const matchEl = document.getElementById("hero-tender-match");
  const pipeEl = document.getElementById("hero-pipeline-value");
  const cardEl = document.getElementById("hero-tender-card");
  const bgImgEl = document.getElementById("hero-bg-image");
  if (!catEl || !titleEl || !deptEl || !valEl || !matchEl) return;

  if (bgImgEl && item.image) {
    bgImgEl.src = item.image;
    bgImgEl.alt = `${item.category} Visual`;
  }
  catEl.textContent = item.category;
  catEl.className = `badge ${item.badgeClass || "badge-blue"}`;
  titleEl.textContent = item.title;
  deptEl.textContent = item.department;
  valEl.textContent = item.value;
  matchEl.textContent = item.matchScore;
  if (pipeEl && item.pipeline) pipeEl.textContent = item.pipeline;

  if (cardEl) {
    cardEl.style.cursor = "pointer";
    cardEl.onclick = () => {
      window.location.href = `tenders.html?category=${encodeURIComponent(item.categoryFilter)}`;
    };
  }
}

function setupStatsScrollTrigger() {
  const statsSection = document.getElementById("stats-section");
  if (!statsSection) return;
  const cards = statsSection.querySelectorAll(".stat-box");
  const counters = [
    { id: "stat-opportunities", target: 500 },
    { id: "stat-departments", target: 50 },
    { id: "stat-locations", target: 25 },
    { id: "stat-categories", target: 6 },
    { id: "stat-satisfaction", target: 98 }
  ];
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          cards.forEach((card, idx) => setTimeout(() => card.classList.add("visible"), idx * 120));
          counters.forEach((c) => {
            const el = document.getElementById(c.id);
            if (el) el.textContent = c.target;
          });
          observer.unobserve(statsSection);
        }
      });
    },
    { threshold: 0.2 }
  );
  observer.observe(statsSection);
}

function setupScrollFade() {
  const targets = document.querySelectorAll(".section-scroll-fade");
  if (targets.length === 0) return;
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.querySelectorAll(".why-card, .how-card").forEach((c, idx) => {
            setTimeout(() => c.classList.add("visible"), 80 + idx * 100);
          });
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.1 }
  );
  targets.forEach((t) => observer.observe(t));
}

function renderCategoryGrid(categories) {
  const container = document.getElementById("categories-container");
  if (!container) return;

  container.innerHTML = categories
    .map(
      (cat) => `
    <a href="tenders.html?category=${encodeURIComponent(cat.name)}" class="card" style="border-top: 4px solid ${cat.color}; display: flex; flex-direction: column; gap: 12px; height: 100%;">
      <div style="display: flex; justify-content: space-between; align-items: center;">
        <span style="font-size: 1.75rem;">${cat.icon}</span>
        <span class="badge badge-blue" style="background: ${cat.color}15; color: ${cat.color};">${cat.count} Tenders</span>
      </div>
      <h3 style="font-size: 1.2rem; font-weight: 700; color: var(--text-primary);">${escapeHtml(cat.name)}</h3>
      <p style="font-size: 0.85rem; color: var(--text-secondary); line-height: 1.5;">${escapeHtml(cat.desc)}</p>
      <div style="display: flex; align-items: center; margin-top: auto; padding-top: 12px; color: var(--color-primary); font-weight: 600; font-size: 0.85rem;">
        <span>Explore category</span>
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-left: 4px;"><path d="m9 18 6-6-6-6"/></svg>
      </div>
    </a>
  `
    )
    .join("");
}

/* ---------------- LOGIN & CONTRACTOR REGISTRATION ---------------- */
function initLoginPage() {
  const loginForm = document.getElementById("login-form");
  const alertBox = document.getElementById("login-status-alert");
  if (!loginForm) return;

  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (alertBox) alertBox.style.display = "none";

    const usernameOrEmail = document.getElementById("usernameOrEmail").value.trim();
    const password = document.getElementById("password").value;

    if (!usernameOrEmail || !password) {
      showToast("Please enter email/username and password", "warning");
      return;
    }

    const submitBtn = document.getElementById("login-submit-btn");
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = "Signing in...";
    }

    try {
      const res = await fetch(`${API_BASE}/users/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ usernameOrEmail, password })
      });

      const data = await res.json();
      if (res.ok && data.token && data.user) {
        localStorage.setItem("token", data.token);
        localStorage.setItem("user", JSON.stringify(data.user));
        showToast(`Welcome, ${data.user.name || data.user.username}!`, "success");
        setTimeout(() => {
          window.location.href = getDashboardUrlForRole(data.user.role);
        }, 500);
      } else {
        const msg = data.message || "Invalid credentials";
        if (alertBox) {
          alertBox.textContent = msg;
          alertBox.style.background = "rgba(239, 68, 68, 0.08)";
          alertBox.style.border = "1px solid rgba(239, 68, 68, 0.3)";
          alertBox.style.color = "var(--color-danger)";
          alertBox.style.display = "block";
        }
        showToast(msg, "error");
      }
    } catch {
      showToast("Could not reach backend server", "error");
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = "Sign In";
      }
    }
  });
}

function initRegisterPage() {
  const contractorForm = document.getElementById("register-contractor-form");
  if (!contractorForm) return;

  contractorForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const company = document.getElementById("reg-con-company").value.trim();
    const name = document.getElementById("reg-con-name").value.trim();
    const email = document.getElementById("reg-con-email").value.trim();
    const username = document.getElementById("reg-con-username").value.trim();
    const password = document.getElementById("reg-con-password").value;
    const confirmPassword = document.getElementById("reg-con-confirm").value;

    if (!company || !name || !email || !username || !password || !confirmPassword) {
      showToast("Please fill in all required fields", "warning");
      return;
    }
    if (password !== confirmPassword) {
      showToast("Passwords do not match", "error");
      return;
    }
    if (password.length < 6) {
      showToast("Password must be at least 6 characters", "warning");
      return;
    }

    const btn = document.getElementById("btn-reg-contractor");
    if (btn) {
      btn.disabled = true;
      btn.textContent = "Creating account...";
    }

    try {
      const res = await fetch(`${API_BASE}/users/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accountType: "contractor",
          company,
          name,
          email,
          username,
          password,
          confirmPassword
        })
      });

      const data = await res.json();
      if (res.ok) {
        localStorage.setItem("token", data.token);
        localStorage.setItem("user", JSON.stringify(data.user));
        showToast("Contractor account created!", "success");
        setTimeout(() => {
          window.location.href = "dashboard.html";
        }, 600);
      } else {
        showToast(data.message || "Registration failed", "error");
      }
    } catch {
      showToast("Backend connection failed", "error");
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.textContent = "Create Contractor Account";
      }
    }
  });
}

/* ---------------- BROWSE TENDERS ---------------- */
let savedTendersGlobalList = [];
let activeSearchReqId = 0;

function syncQuickStateChips() {
  const currentState = (document.getElementById("filter-state")?.value || "").trim().toLowerCase();
  document.querySelectorAll("#quick-state-chips .location-chip").forEach((chip) => {
    const chipState = (chip.getAttribute("data-state") || "").trim().toLowerCase();
    chip.classList.toggle("active", chipState === currentState);
  });
}

function populateBrowseFilterOptions(allTenders) {
  if (!Array.isArray(allTenders) || allTenders.length === 0) return;

  const states = [...new Set(allTenders.map((t) => t.state).filter(Boolean))].sort();
  const locations = [...new Set(allTenders.map((t) => t.location).filter(Boolean))].sort();

  const stateSelect = document.getElementById("filter-state");
  if (stateSelect && states.length > 0) {
    const prevState = stateSelect.value;
    stateSelect.innerHTML =
      '<option value="">All States</option>' +
      states.map((s) => `<option value="${escapeHtml(s)}">${escapeHtml(s)}</option>`).join("");
    if (prevState && states.includes(prevState)) {
      stateSelect.value = prevState;
    }
  }

  const locList = document.getElementById("location-datalist");
  if (locList && locations.length > 0) {
    locList.innerHTML = locations
      .map((loc) => `<option value="${escapeHtml(loc)}">`)
      .join("");
  }

  const chipsWrap = document.getElementById("quick-state-chips");
  if (chipsWrap && states.length > 0) {
    chipsWrap.innerHTML =
      '<span style="color: var(--text-muted); font-weight: 600;">Filter by State:</span>' +
      '<button type="button" class="location-chip" data-state="" onclick="applyQuickState(\'\')">All States</button>' +
      states
        .map(
          (s) =>
            `<button type="button" class="location-chip" data-state="${escapeHtml(s)}" onclick="applyQuickState('${escapeHtml(s).replace(/'/g, "\\'")}')">📍 ${escapeHtml(s)}</button>`
        )
        .join("");
  }
  syncQuickStateChips();
}

async function initTendersPage() {
  const urlParams = new URLSearchParams(window.location.search);

  const hasAdvParam = Boolean(urlParams.get("category") || urlParams.get("status"));
  if (hasAdvParam) {
    const advPanel = document.getElementById("advanced-filters-panel");
    const chevron = document.getElementById("adv-chevron");
    if (advPanel) advPanel.style.display = "block";
    if (chevron) chevron.classList.add("open");
  }

  if (urlParams.get("category") && document.getElementById("filter-category")) {
    document.getElementById("filter-category").value = urlParams.get("category");
  }
  if (urlParams.get("status") && document.getElementById("filter-status")) {
    document.getElementById("filter-status").value = urlParams.get("status");
  }
  if (urlParams.get("search") && document.getElementById("search-input")) {
    document.getElementById("search-input").value = urlParams.get("search");
  }
  if (urlParams.get("location") && document.getElementById("filter-location")) {
    document.getElementById("filter-location").value = urlParams.get("location");
  }

  // Populate states, quick chips, and location suggestions dynamically from actual tenders in database
  try {
    const allRes = await fetchNoCache(`${API_BASE}/tenders`);
    if (allRes.ok) {
      const allTenders = await allRes.json();
      populateBrowseFilterOptions(allTenders);
    }
  } catch {
    // Keep default options if network lookup fails
  }

  if (urlParams.get("state") && document.getElementById("filter-state")) {
    document.getElementById("filter-state").value = urlParams.get("state");
  }
  syncQuickStateChips();

  const activeUser = getSafeStoredUser();
  if (activeUser && activeUser.role === "contractor") {
    try {
      const res = await fetchNoCache(`${API_BASE}/saved`, { headers: getAuthHeaders() });
      if (res.ok) {
        const savedData = await res.json();
        savedTendersGlobalList = savedData.map((t) => t.id);
      }
    } catch {
      savedTendersGlobalList = [];
    }
  }

  const form = document.getElementById("search-form");
  if (form) {
    form.onsubmit = (e) => {
      e.preventDefault();
      searchAndFilterTenders();
    };
  }

  const stateSel = document.getElementById("filter-state");
  if (stateSel) {
    stateSel.onchange = () => {
      syncQuickStateChips();
      searchAndFilterTenders();
    };
  }

  ["filter-location", "filter-category", "filter-status", "filter-deadline"].forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.onchange = () => searchAndFilterTenders();
  });

  const toggleAdv = document.getElementById("toggle-advanced-filters");
  if (toggleAdv) {
    toggleAdv.onclick = () => {
      const panel = document.getElementById("advanced-filters-panel");
      const chevron = document.getElementById("adv-chevron");
      if (panel) {
        const isOpen = panel.style.display === "block";
        panel.style.display = isOpen ? "none" : "block";
        if (chevron) chevron.classList.toggle("open", !isOpen);
      }
    };
  }

  const resetBtn = document.getElementById("reset-filters");
  if (resetBtn) {
    resetBtn.onclick = () => window.viewAllTenders();
  }

  window.addEventListener("pageshow", (ev) => {
    if (ev.persisted) {
      searchAndFilterTenders();
    }
  });

  await searchAndFilterTenders();
}

window.applyQuickState = (st) => {
  const stateSel = document.getElementById("filter-state");
  if (stateSel) stateSel.value = st;
  syncQuickStateChips();
  searchAndFilterTenders();
};

window.viewAllTenders = () => {
  [
    "filter-state",
    "filter-category",
    "filter-status",
    "filter-location",
    "search-input",
    "filter-department",
    "filter-minBudget",
    "filter-maxBudget",
    "filter-deadline"
  ].forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.value = "";
  });
  syncQuickStateChips();
  searchAndFilterTenders();
};

async function searchAndFilterTenders() {
  const container = document.getElementById("tenders-container");
  if (!container) return;

  const reqId = ++activeSearchReqId;
  const state = document.getElementById("filter-state")?.value.trim() || "";
  const category = document.getElementById("filter-category")?.value.trim() || "";
  const statusFilter = document.getElementById("filter-status")?.value.trim() || "";
  const search = document.getElementById("search-input")?.value.trim() || "";
  const location = document.getElementById("filter-location")?.value.trim() || "";
  const department = document.getElementById("filter-department")?.value.trim() || "";
  const minBudget = document.getElementById("filter-minBudget")?.value.trim() || "";
  const maxBudget = document.getElementById("filter-maxBudget")?.value.trim() || "";
  const deadline = document.getElementById("filter-deadline")?.value.trim() || "";

  syncQuickStateChips();

  const q = new URLSearchParams();
  if (state) q.append("state", state);
  if (category) q.append("category", category);
  if (statusFilter) q.append("status", statusFilter);
  if (search) q.append("search", search);
  if (location) q.append("location", location);
  if (department) q.append("department", department);
  if (minBudget) q.append("minBudget", minBudget);
  if (maxBudget) q.append("maxBudget", maxBudget);
  if (deadline) q.append("deadline", deadline);

  try {
    const qs = q.toString();
    const res = await fetchNoCache(qs ? `${API_BASE}/tenders?${qs}` : `${API_BASE}/tenders`);
    const data = await res.json();
    if (reqId !== activeSearchReqId) return;

    if (!res.ok) {
      showToast("Error loading tenders", "error");
      return;
    }

    if (!qs) {
      populateBrowseFilterOptions(data);
    }

    const countBox = document.getElementById("results-count");
    const headingBox = document.getElementById("results-heading");
    if (location && state) {
      if (headingBox) headingBox.textContent = `Tenders in ${location} (${state})`;
      if (countBox) countBox.innerHTML = `Found <strong>${data.length}</strong> matching tender(s)`;
    } else if (location) {
      if (headingBox) headingBox.textContent = `Tenders matching "${location}"`;
      if (countBox) countBox.innerHTML = `Found <strong>${data.length}</strong> matching tender(s)`;
    } else if (state) {
      if (headingBox) headingBox.textContent = `Tenders in ${state}`;
      if (countBox) countBox.innerHTML = `Found <strong>${data.length}</strong> tender(s) in ${escapeHtml(state)}`;
    } else {
      if (headingBox) headingBox.textContent = "Infrastructure Opportunities";
      if (countBox) countBox.innerHTML = `Showing <strong>${data.length}</strong> tender(s)`;
    }

    if (data.length === 0) {
      const emptyMsg = location
        ? "No current tenders available in this location. Try another location or reset your filters."
        : "No matching tenders found. Try adjusting your search criteria or reset all filters.";
      container.innerHTML = `
        <div class="card" id="no-tenders-found-card" style="grid-column: 1 / -1; display: flex; flex-direction: column; align-items: center; text-align: center; gap: 16px; padding: 4rem 2rem; border: 2px dashed var(--border-color); border-radius: 16px; background-color: var(--bg-card);">
          <div style="height: 60px; width: 60px; border-radius: 50%; background-color: rgba(var(--primary-rgb), 0.08); color: var(--color-primary); display: flex; align-items: center; justify-content: center; font-size: 1.6rem;">📍</div>
          <div style="display: flex; flex-direction: column; gap: 6px; max-width: 540px;">
            <h3 style="font-size: 1.35rem; font-weight: 850; color: var(--text-primary);">No Matching Tenders Found</h3>
            <p style="font-size: 0.94rem; color: var(--text-secondary); line-height: 1.55;">${escapeHtml(emptyMsg)}</p>
          </div>
          <button type="button" onclick="viewAllTenders()" class="btn btn-primary" style="border: none;">Reset All Filters</button>
        </div>
      `;
      return;
    }

    const activeUser = getSafeStoredUser();
    const canSave = !activeUser || activeUser.role === "contractor";

    container.innerHTML = data
      .map((t) => {
        const isSaved = savedTendersGlobalList.includes(t.id);
        const status = getTenderStatus(t.deadline, t.raw_status || t.status);
        const tenderCode = escapeHtml(t.tender_code || `TK-${String(t.id).padStart(4, "0")}`);

        return `
        <div class="card" style="display: flex; flex-direction: column; gap: 14px; height: 100%;">
          <div style="display: flex; justify-content: space-between; align-items: center; gap: 8px;">
            <div style="display: flex; gap: 6px; flex-wrap: wrap;">
              <span class="badge badge-muted">${tenderCode}</span>
              <span class="badge badge-blue">${escapeHtml(t.category)}</span>
              <span class="badge ${status.class}">${escapeHtml(status.label)}</span>
              ${t.state ? `<span class="badge badge-purple">${escapeHtml(t.state)}</span>` : ""}
            </div>
            ${
              canSave
                ? `<button onclick="toggleSaveTender(${t.id})" aria-label="${isSaved ? "Remove Saved Tender" : "Save Tender"}" style="background: none; border: 1px solid ${isSaved ? "rgba(var(--primary-rgb), 0.25)" : "transparent"}; cursor: pointer; padding: 6px; border-radius: 6px; display: flex; align-items: center; justify-content: center; color: ${isSaved ? "var(--color-primary)" : "var(--text-muted)"}; background-color: ${isSaved ? "rgba(var(--primary-rgb), 0.08)" : "transparent"};" title="${isSaved ? "Saved" : "Save Tender"}">
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="${isSaved ? "currentColor" : "none"}" stroke="currentColor" stroke-width="2"><path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z"/></svg>
                  </button>`
                : ""
            }
          </div>

          <div style="display: flex; flex-direction: column; gap: 4px;">
            <h3 style="font-size: 1.12rem; font-weight: 750; color: var(--text-primary); line-height: 1.4;">${escapeHtml(t.name)}</h3>
            <span style="font-size: 0.78rem; color: var(--text-muted); font-weight: 600;">${escapeHtml(t.department)}</span>
          </div>

          <p style="font-size: 0.85rem; color: var(--text-secondary); line-height: 1.5;">${escapeHtml((t.description || "").substring(0, 130))}...</p>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; border-top: 1px solid var(--border-color); border-bottom: 1px solid var(--border-color); padding: 12px 0; margin-top: auto;">
            <div>
              <span style="display: block; font-size: 0.65rem; color: var(--text-muted); font-weight: 700;">ESTIMATED BUDGET</span>
              <span style="display: block; font-size: 0.88rem; color: var(--text-primary); font-weight: 700;">${formatBudget(t.budget)}</span>
            </div>
            <div>
              <span style="display: block; font-size: 0.65rem; color: var(--text-muted); font-weight: 700;">LOCATION</span>
              <span style="display: block; font-size: 0.86rem; color: var(--text-primary); font-weight: 700;">${escapeHtml(t.location)}</span>
            </div>
          </div>

          <div style="display: flex; justify-content: space-between; align-items: center; gap: 10px; flex-wrap: wrap;">
            <span style="font-size: 0.78rem; font-weight: 600; color: var(--text-secondary);">
              Deadline: ${escapeHtml(t.deadline)} (${escapeHtml(status.countdown)})
            </span>
            <div style="display: flex; gap: 8px; align-items: center;">
              ${t.source_url ? `<a href="${escapeHtml(t.source_url)}" target="_blank" rel="noopener noreferrer" style="font-size: 0.78rem; font-weight: 700; color: var(--color-primary);">Portal &nearr;</a>` : ""}
              <a href="tenderDetails.html?id=${t.id}" class="btn btn-outline" style="padding: 7px 14px; font-size: 0.84rem;">
                View Details &rarr;
              </a>
            </div>
          </div>
        </div>
      `;
      })
      .join("");
  } catch {
    showToast("Server connection error", "error");
  }
}

async function toggleSaveTender(tenderId) {
  const user = getSafeStoredUser();
  if (!user) {
    showToast("Please login as a contractor to bookmark tenders", "warning");
    return;
  }

  try {
    const res = await fetch(`${API_BASE}/saved/${tenderId}/save`, {
      method: "POST",
      headers: getAuthHeaders()
    });
    if (res.ok) {
      const data = await res.json();
      if (data.saved) {
        if (!savedTendersGlobalList.includes(tenderId)) savedTendersGlobalList.push(tenderId);
        showToast("Tender bookmarked successfully", "success");
      } else {
        savedTendersGlobalList = savedTendersGlobalList.filter((id) => id !== tenderId);
        showToast("Bookmark removed", "info");
      }
      searchAndFilterTenders();
    } else {
      const err = await res.json();
      showToast(err.message || "Could not update bookmark", "error");
    }
  } catch {
    showToast("Error updating bookmarks", "error");
  }
}

function formatBudget(value) {
  const num = parseFloat(value) || 0;
  if (num >= 10000000) {
    return `₹ ${(num / 10000000).toFixed(2)} Cr`;
  }
  return `₹ ${(num / 100000).toFixed(2)} Lakh`;
}

/* ---------------- TENDER DETAILS PAGE ---------------- */
let currentTenderDetails = null;

async function initTenderDetailsPage() {
  const urlParams = new URLSearchParams(window.location.search);
  const tenderId = urlParams.get("id");

  if (!tenderId) {
    window.location.href = "tenders.html";
    return;
  }

  try {
    const res = await fetchNoCache(`${API_BASE}/tenders/${tenderId}`);
    if (!res.ok) {
      showToast("Tender details not found", "error");
      setTimeout(() => {
        window.location.href = "tenders.html";
      }, 1200);
      return;
    }

    const t = await res.json();
    currentTenderDetails = t;

    document.getElementById("tender-name").textContent = t.name;
    document.getElementById("tender-dept").textContent = t.department;

    const pubEl = document.getElementById("tender-published-meta");
    if (pubEl) {
      const code = t.tender_code || `TK-${String(t.id).padStart(4, "0")}`;
      pubEl.textContent = `Tender ID: ${code}${t.published_date ? ` • Published: ${t.published_date}` : ""}`;
    }

    const status = getTenderStatus(t.deadline, t.raw_status || t.status);
    const catBox = document.getElementById("tender-category");
    if (catBox) {
      catBox.outerHTML = `
        <div style="display: flex; gap: 8px; flex-wrap: wrap;" id="tender-category-container">
          <span class="badge badge-muted">${escapeHtml(t.tender_code || `TK-${String(t.id).padStart(4, "0")}`)}</span>
          <span class="badge badge-blue">${escapeHtml(t.category)}</span>
          ${t.state ? `<span class="badge badge-purple">${escapeHtml(t.state)}</span>` : ""}
          <span class="badge ${status.class}">${escapeHtml(status.label)} (${escapeHtml(status.countdown)})</span>
        </div>
      `;
    }

    document.getElementById("tender-budget").textContent = formatBudget(t.budget);
    document.getElementById("tender-location").textContent = t.state ? `${t.location} (${t.state})` : t.location;
    document.getElementById("tender-deadline").textContent = `${t.deadline} (${status.countdown})`;
    document.getElementById("tender-description").textContent = t.description;
    document.getElementById("tender-eligibility").textContent = t.eligibility || "Refer to official tender portal notice.";

    const sourceBtn = document.getElementById("tender-source-btn");
    if (sourceBtn && t.source_url) {
      sourceBtn.href = t.source_url;
      sourceBtn.title = `Open Official Portal: ${t.source_url}`;
    }

    const docGrid = document.getElementById("tender-docs-grid");
    if (docGrid) {
      const docs = Array.isArray(t.required_documents) ? t.required_documents : [];
      if (docs.length === 0) {
        docGrid.innerHTML = '<p style="font-size: 0.85rem; color: var(--text-muted); margin: 0;">Refer to official tender notice for document requirements.</p>';
      } else {
        docGrid.innerHTML = docs
          .map(
            (doc) => `
          <div style="display: flex; align-items: start; gap: 10px; padding: 12px; background-color: var(--bg-secondary); border-radius: 8px; border: 1px solid var(--border-color);">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#10B981" stroke-width="2" style="flex-shrink: 0; margin-top: 3px;"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><path d="m9 11 3 3L22 4"/></svg>
            <span style="font-size: 0.85rem; font-weight: 500; color: var(--text-primary);">${escapeHtml(doc)}</span>
          </div>
        `
          )
          .join("");
      }
    }

    checkSaveButtonState(tenderId);
    checkTrackButtonState(tenderId);
  } catch {
    showToast("Error connecting to server", "error");
  }
}

async function checkTrackButtonState(tenderId) {
  const btn = document.getElementById("details-track-btn");
  const saveBtn = document.getElementById("details-save-btn");
  if (!btn) return;
  const user = getSafeStoredUser();
  if (!user) return;

  if (user.role === "admin") {
    btn.style.display = "none";
    if (saveBtn) saveBtn.style.display = "none";
    return;
  }

  try {
    const res = await fetchNoCache(`${API_BASE}/applications/my`, { headers: getAuthHeaders() });
    if (res.ok) {
      const data = await res.json();
      const existing = (data.applications || []).find((a) => a.tender_id === parseInt(tenderId, 10));
      if (existing) {
        btn.innerHTML = `
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><path d="m9 11 3 3L22 4"/></svg>
          <span>Recorded (${escapeHtml(existing.application_status)})</span>
        `;
        btn.className = "btn btn-outline";
        btn.onclick = () => {
          window.location.href = "dashboard.html";
        };
      }
    }
  } catch {
    // Non-critical check
  }
}

function suggestPortalNameFromUrl(url) {
  if (!url) return "";
  const low = url.toLowerCase();
  if (low.includes("eprocure.gov.in")) return "CPPP eProcurement Portal (eprocure.gov.in)";
  if (low.includes("gem.gov.in")) return "GeM (Government e Marketplace)";
  if (low.includes("mahatenders")) return "MahaTenders (mahatenders.gov.in)";
  if (low.includes("nprocure")) return "Gujarat (n)Procure (nprocure.com)";
  if (low.includes("mptenders")) return "MP Tenders (mptenders.gov.in)";
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}

window.openTrackAppModal = () => {
  const user = getSafeStoredUser();
  if (!user) {
    showToast("Please login as a contractor to record applications", "warning");
    setTimeout(() => {
      window.location.href = "login.html";
    }, 1000);
    return;
  }
  if (user.role !== "contractor") {
    showToast("Only contractor accounts can record bid applications", "warning");
    return;
  }

  const modal = document.getElementById("track-app-modal");
  if (!modal || !currentTenderDetails) return;

  document.getElementById("modal-tender-title").textContent = currentTenderDetails.name;
  document.getElementById("modal-tender-budget-ref").textContent =
    `${currentTenderDetails.tender_code || `#${currentTenderDetails.id}`} • ${currentTenderDetails.state || "India"} • Estimated Budget: ${formatBudget(currentTenderDetails.budget)}`;
  document.getElementById("track-applied-date").value = getLocalTodayStr();
  const portalInp = document.getElementById("track-portal-name");
  if (portalInp) portalInp.value = suggestPortalNameFromUrl(currentTenderDetails.source_url);
  document.getElementById("track-ref-number").value = "";
  document.getElementById("track-status").value = "Submitted";
  document.getElementById("track-bid-amount").value = "";
  document.getElementById("track-proposal-notes").value = "";

  modal.style.display = "block";
};

window.closeTrackAppModal = () => {
  const modal = document.getElementById("track-app-modal");
  if (modal) modal.style.display = "none";
};

window.handleTrackAppSubmit = async (e) => {
  e.preventDefault();
  if (!currentTenderDetails) return;

  const appliedOn = document.getElementById("track-applied-date")?.value;
  const portalName = document.getElementById("track-portal-name")?.value.trim();
  const referenceNumber = document.getElementById("track-ref-number")?.value.trim();
  const applicationStatus = document.getElementById("track-status")?.value;
  const bidAmount = document.getElementById("track-bid-amount")?.value;
  const proposalNotes = document.getElementById("track-proposal-notes")?.value.trim();

  if (!appliedOn || !portalName || !referenceNumber || !applicationStatus) {
    showToast("Please complete all required fields", "warning");
    return;
  }

  const submitBtn = document.getElementById("btn-submit-track-app");
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.textContent = "Recording...";
  }

  try {
    const res = await fetch(`${API_BASE}/applications`, {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify({
        tender_id: currentTenderDetails.id,
        applied_on: appliedOn,
        portal_name: portalName,
        reference_number: referenceNumber,
        application_status: applicationStatus,
        bid_amount: bidAmount || null,
        proposal_notes: proposalNotes || null
      })
    });
    const data = await res.json();
    if (res.ok) {
      showToast("Application recorded successfully!", "success");
      closeTrackAppModal();
      setTimeout(() => {
        window.location.href = "dashboard.html";
      }, 700);
    } else {
      showToast(data.message || "Could not record application", "error");
    }
  } catch {
    showToast("Server error recording application", "error");
  } finally {
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.textContent = "Record Application";
    }
  }
};

async function checkSaveButtonState(tenderId) {
  const btn = document.getElementById("details-save-btn");
  if (!btn) return;

  const user = getSafeStoredUser();
  if (!user) {
    btn.onclick = () => showToast("Please login as a contractor to save tenders", "warning");
    return;
  }
  if (user.role !== "contractor") {
    btn.style.display = "none";
    return;
  }

  try {
    const res = await fetchNoCache(`${API_BASE}/saved`, { headers: getAuthHeaders() });
    if (res.ok) {
      const data = await res.json();
      const isSaved = data.some((t) => t.id === parseInt(tenderId, 10));

      btn.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="${isSaved ? "currentColor" : "none"}" stroke="currentColor" stroke-width="2"><path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z"/></svg>
        <span>${isSaved ? "Saved" : "Save Tender"}</span>
      `;
      btn.style.color = isSaved ? "var(--color-primary)" : "var(--text-secondary)";
      btn.style.backgroundColor = isSaved ? "rgba(var(--primary-rgb), 0.1)" : "var(--bg-secondary)";
      btn.style.borderColor = isSaved ? "var(--color-primary)" : "var(--border-color)";

      btn.onclick = async () => {
        const toggleRes = await fetch(`${API_BASE}/saved/${tenderId}/save`, {
          method: "POST",
          headers: getAuthHeaders()
        });
        if (toggleRes.ok) {
          const toggleData = await toggleRes.json();
          showToast(toggleData.message, "success");
          checkSaveButtonState(tenderId);
        }
      };
    }
  } catch {
    // Keep default state
  }
}

async function generateAISummary() {
  const urlParams = new URLSearchParams(window.location.search);
  const tenderId = urlParams.get("id");
  const panel = document.getElementById("summary-panel");
  if (!panel || !tenderId) return;

  panel.style.display = "block";
  panel.innerHTML = `
    <div style="display: flex; flex-direction: column; align-items: center; gap: 12px; padding: 28px 16px; text-align: center; color: var(--text-secondary); font-size: 0.9rem;">
      <p style="margin: 0;">Generating AI tender summary...</p>
    </div>
  `;

  try {
    const res = await fetch(`${API_BASE}/tenders/${tenderId}/summarize`, { method: "POST" });
    const data = await res.json().catch(() => ({}));

    if (!res.ok || !data || !Array.isArray(data.summaryPoints)) {
      const fallbackMsg = data.message || "AI summarization is temporarily unavailable. Please review the tender details above.";
      panel.innerHTML = `
        <div style="padding: 12px; color: var(--color-danger); font-size: 0.88rem; line-height: 1.5;">
          ${escapeHtml(fallbackMsg)}
        </div>
      `;
      showToast("AI summary temporarily unavailable", "warning");
      return;
    }

    const docs = Array.isArray(data.requiredDocuments) ? data.requiredDocuments : [];
    panel.innerHTML = `
      <div style="display: flex; flex-direction: column; gap: 14px;">
        <h3 style="font-size: 1.05rem; font-weight: 800; color: var(--text-primary); margin: 0;">AI Tender Summary</h3>
        <hr style="border: none; border-top: 1px solid var(--border-color); margin: 0;" />

        <div>
          <span style="font-size: 0.72rem; font-weight: 700; color: var(--text-muted); text-transform: uppercase; display: block;">Estimated Budget</span>
          <span style="font-size: 0.9rem; color: var(--text-primary); font-weight: 600;">${escapeHtml(data.budget)}</span>
        </div>

        <div>
          <span style="font-size: 0.72rem; font-weight: 700; color: var(--text-muted); text-transform: uppercase; display: block;">Submission Deadline</span>
          <span style="font-size: 0.9rem; color: var(--text-primary); font-weight: 600;">${escapeHtml(data.deadline)}</span>
        </div>

        <div>
          <span style="font-size: 0.72rem; font-weight: 700; color: var(--text-muted); text-transform: uppercase; display: block;">Eligibility Summary</span>
          <span style="font-size: 0.88rem; color: var(--text-primary); font-weight: 500;">${escapeHtml(data.eligibility)}</span>
        </div>

        ${
          docs.length > 0
            ? `<div>
                <span style="font-size: 0.72rem; font-weight: 700; color: var(--text-muted); text-transform: uppercase; display: block;">Required Documents</span>
                <ul style="padding-left: 18px; margin: 6px 0 0 0; display: flex; flex-direction: column; gap: 4px;">
                  ${docs.map((doc) => `<li style="font-size: 0.84rem; color: var(--text-secondary);">${escapeHtml(doc)}</li>`).join("")}
                </ul>
              </div>`
            : ""
        }

        <div>
          <span style="font-size: 0.72rem; font-weight: 700; color: var(--text-muted); text-transform: uppercase; display: block;">Key Scope Points</span>
          <ul style="padding-left: 18px; margin: 6px 0 0 0; display: flex; flex-direction: column; gap: 6px;">
            ${data.summaryPoints.map((pt) => `<li style="font-size: 0.84rem; color: var(--text-secondary); line-height: 1.45;">${escapeHtml(pt)}</li>`).join("")}
          </ul>
        </div>

        <span style="font-size: 0.7rem; color: var(--text-muted); text-align: right; font-style: italic;">Generated using: ${escapeHtml(data.method || "Summarizer")}</span>
      </div>
    `;
    showToast("AI summary generated!", "success");
  } catch {
    panel.innerHTML = `
      <div style="padding: 12px; color: var(--color-danger); font-size: 0.88rem; line-height: 1.5;">
        AI summarization is temporarily unavailable. Please review the tender details and official portal link above.
      </div>
    `;
    showToast("AI summary temporarily unavailable", "warning");
  }
}

/* ---------------- DEDICATED SAVED TENDERS PAGE (saved.html) ---------------- */
async function initSavedPage() {
  const listEl = document.getElementById("saved-page-list");
  const countBadge = document.getElementById("saved-page-count");
  if (!listEl) return;

  try {
    const res = await fetchNoCache(`${API_BASE}/saved`, { headers: getAuthHeaders() });
    if (!res.ok) {
      listEl.innerHTML = '<p style="color: var(--color-danger);">Could not load saved tenders.</p>';
      return;
    }

    const saved = await res.json();
    if (countBadge) countBadge.textContent = `${saved.length} Saved`;

    if (saved.length === 0) {
      listEl.innerHTML = `
        <div style="display: flex; flex-direction: column; align-items: center; text-align: center; padding: 4rem 1.5rem; gap: 14px; background-color: var(--bg-secondary); border-radius: 14px; border: 2px dashed var(--border-color);">
          <div style="font-size: 2rem;">🔖</div>
          <h3 style="font-size: 1.2rem; font-weight: 800; color: var(--text-primary); margin: 0;">No Saved Tenders Yet</h3>
          <p style="font-size: 0.9rem; color: var(--text-secondary); max-width: 440px; margin: 0;">
            Browse available infrastructure tenders and click the bookmark button to save opportunities here.
          </p>
          <a href="tenders.html" class="btn btn-primary" style="border: none; padding: 9px 20px;">Browse Tenders</a>
        </div>
      `;
      return;
    }

    listEl.innerHTML = saved
      .map((t) => {
        const status = getTenderStatus(t.deadline, t.raw_status || t.status);
        const code = escapeHtml(t.tender_code || `TK-${String(t.id).padStart(4, "0")}`);
        return `
          <div style="display: flex; justify-content: space-between; align-items: center; padding: 18px 20px; background-color: var(--bg-secondary); border-radius: 14px; border: 1px solid var(--border-color); gap: 16px; flex-wrap: wrap;">
            <div style="display: flex; flex-direction: column; gap: 6px; flex: 1; min-width: 240px;">
              <div style="display: flex; gap: 8px; flex-wrap: wrap;">
                <span class="badge badge-muted">${code}</span>
                <span class="badge badge-blue">${escapeHtml(t.category)}</span>
                <span class="badge ${status.class}">${escapeHtml(status.label)}</span>
                ${t.state ? `<span class="badge badge-purple">${escapeHtml(t.state)}</span>` : ""}
              </div>
              <h3 style="font-size: 1.08rem; font-weight: 750; color: var(--text-primary); margin: 2px 0;">${escapeHtml(t.name)}</h3>
              <div style="font-size: 0.8rem; color: var(--text-muted);">${escapeHtml(t.department)} • ${escapeHtml(t.location)}</div>
              <div style="display: flex; gap: 16px; flex-wrap: wrap; font-size: 0.82rem; font-weight: 600; color: var(--text-secondary); margin-top: 2px;">
                <span>Budget: ${formatBudget(t.budget)}</span>
                <span>Deadline: ${escapeHtml(t.deadline)}</span>
              </div>
            </div>
            <div style="display: flex; align-items: center; gap: 10px; flex-wrap: wrap;">
              <a href="tenderDetails.html?id=${t.id}" class="btn btn-outline" style="font-size: 0.84rem; padding: 8px 14px;">View Details &rarr;</a>
              <button type="button" onclick="handleSavedPageRemove(${t.id})" class="btn btn-secondary" style="font-size: 0.84rem; padding: 8px 14px; color: var(--color-danger); border-color: rgba(239, 68, 68, 0.3);">
                Remove
              </button>
            </div>
          </div>
        `;
      })
      .join("");
  } catch {
    showToast("Error loading saved tenders", "error");
  }
}

window.handleSavedPageRemove = async (tenderId) => {
  try {
    const res = await fetch(`${API_BASE}/saved/${tenderId}/save`, {
      method: "POST",
      headers: getAuthHeaders()
    });
    if (res.ok) {
      showToast("Saved tender removed", "info");
      await initSavedPage();
    } else {
      showToast("Could not remove saved tender", "error");
    }
  } catch {
    showToast("Network error removing saved tender", "error");
  }
};

/* ---------------- CONTRACTOR DASHBOARD & MY APPLICATIONS ---------------- */
let currentAnalysisAppId = null;
let contractorApplicationsList = [];
let contractorAvailableTenders = [];

async function loadContractorTendersForModal() {
  try {
    const res = await fetchNoCache(`${API_BASE}/tenders`);
    if (res.ok) {
      contractorAvailableTenders = await res.json();
    }
  } catch {
    // Keep prior cache if request fails
  }
  return contractorAvailableTenders;
}

function populateApplicationTenderDropdown(selectedId) {
  const selectEl = document.getElementById("app-form-tender");
  if (!selectEl) return;
  const currentVal = selectedId !== undefined && selectedId !== null ? String(selectedId) : selectEl.value;
  selectEl.innerHTML =
    '<option value="">-- Select a tender --</option>' +
    contractorAvailableTenders
      .map(
        (t) =>
          `<option value="${t.id}">${escapeHtml(t.tender_code || `TK-${t.id}`)} — ${escapeHtml(t.name)} (${escapeHtml(t.state || "India")} • ${escapeHtml(t.category)})</option>`
      )
      .join("");
  if (currentVal) selectEl.value = currentVal;
}

window.handleApplicationTenderChange = () => {
  const tenderId = parseInt(document.getElementById("app-form-tender")?.value, 10);
  const preview = document.getElementById("app-form-tender-preview");
  const portalInp = document.getElementById("app-form-portal");
  if (!preview) return;

  const tender = contractorAvailableTenders.find((t) => t.id === tenderId);
  if (!tender) {
    preview.style.display = "none";
    return;
  }

  document.getElementById("app-preview-id").textContent = tender.tender_code || `TK-${String(tender.id).padStart(4, "0")}`;
  document.getElementById("app-preview-state").textContent = tender.state || "India";
  document.getElementById("app-preview-dept").textContent = tender.department || "";

  const linkEl = document.getElementById("app-preview-portal-link");
  if (linkEl) {
    if (tender.source_url) {
      linkEl.href = tender.source_url;
      linkEl.style.display = "inline-block";
    } else {
      linkEl.style.display = "none";
    }
  }
  preview.style.display = "flex";

  const isEditing = !!document.getElementById("app-form-id")?.value;
  if (!isEditing && portalInp && !portalInp.value.trim() && tender.source_url) {
    portalInp.value = suggestPortalNameFromUrl(tender.source_url);
  }
};

window.openApplicationFormModal = async (preselectedTenderId = null) => {
  const modal = document.getElementById("application-form-modal");
  if (!modal) return;

  await loadContractorTendersForModal();
  populateApplicationTenderDropdown(preselectedTenderId);

  const errBox = document.getElementById("app-form-error");
  if (errBox) errBox.style.display = "none";

  document.getElementById("app-form-id").value = "";
  document.getElementById("app-modal-title").textContent = "Add Application";
  document.getElementById("app-modal-subtitle").textContent = "Record an application submitted through an external government tender portal.";
  document.getElementById("app-form-submit-btn").textContent = "Save Application";

  const tenderSel = document.getElementById("app-form-tender");
  if (tenderSel) {
    tenderSel.disabled = false;
    tenderSel.value = preselectedTenderId ? String(preselectedTenderId) : "";
  }
  document.getElementById("app-form-date").value = getLocalTodayStr();
  document.getElementById("app-form-portal").value = "";
  document.getElementById("app-form-ref").value = "";
  document.getElementById("app-form-status").value = "Submitted";
  document.getElementById("app-form-bid").value = "";
  document.getElementById("app-form-notes").value = "";

  handleApplicationTenderChange();
  modal.style.display = "block";
};

window.openEditApplicationModal = async (appId) => {
  const app = contractorApplicationsList.find((a) => a.id === appId);
  const modal = document.getElementById("application-form-modal");
  if (!app || !modal) return;

  await loadContractorTendersForModal();
  populateApplicationTenderDropdown(app.tender_id);

  const errBox = document.getElementById("app-form-error");
  if (errBox) errBox.style.display = "none";

  document.getElementById("app-form-id").value = app.id;
  document.getElementById("app-modal-title").textContent = `Edit Application (${app.application_code || `APP-${app.id}`})`;
  document.getElementById("app-modal-subtitle").textContent = "Update submission details, reference number, or outcome status.";
  document.getElementById("app-form-submit-btn").textContent = "Update Application";

  const tenderSel = document.getElementById("app-form-tender");
  if (tenderSel) tenderSel.value = String(app.tender_id);

  document.getElementById("app-form-date").value = app.applied_on || getLocalTodayStr();
  document.getElementById("app-form-portal").value =
    app.portal_name || suggestPortalNameFromUrl(app.tender_source_url) || "";
  document.getElementById("app-form-ref").value = app.reference_number || app.application_code || "";

  const normalizedStatus = ["Submitted", "Under Review", "Won", "Lost"].includes(app.application_status)
    ? app.application_status
    : ["Not Awarded", "Rejected"].includes(app.application_status)
    ? "Lost"
    : "Submitted";
  document.getElementById("app-form-status").value = normalizedStatus;
  document.getElementById("app-form-bid").value = app.bid_amount || "";
  document.getElementById("app-form-notes").value = app.proposal_notes || "";

  handleApplicationTenderChange();
  modal.style.display = "block";
};

window.closeApplicationFormModal = () => {
  const modal = document.getElementById("application-form-modal");
  if (modal) modal.style.display = "none";
};

window.handleApplicationFormSubmit = async (e) => {
  e.preventDefault();
  const errBox = document.getElementById("app-form-error");
  const showFormError = (msg) => {
    if (errBox) {
      errBox.textContent = msg;
      errBox.style.display = "block";
    }
    showToast(msg, "error");
  };
  if (errBox) errBox.style.display = "none";

  const appId = document.getElementById("app-form-id")?.value.trim();
  const tender_id = document.getElementById("app-form-tender")?.value;
  const applied_on = document.getElementById("app-form-date")?.value;
  const portal_name = document.getElementById("app-form-portal")?.value.trim();
  const reference_number = document.getElementById("app-form-ref")?.value.trim();
  const application_status = document.getElementById("app-form-status")?.value;
  const bid_amount = document.getElementById("app-form-bid")?.value;
  const proposal_notes = document.getElementById("app-form-notes")?.value.trim();

  if (!tender_id || !applied_on || !portal_name || !reference_number || !application_status) {
    showFormError("Please complete all required application fields.");
    return;
  }

  const submitBtn = document.getElementById("app-form-submit-btn");
  const origLabel = submitBtn ? submitBtn.textContent : "Save Application";
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.textContent = appId ? "Updating..." : "Saving...";
  }

  try {
    const endpoint = appId ? `${API_BASE}/applications/${appId}` : `${API_BASE}/applications`;
    const method = appId ? "PUT" : "POST";
    const res = await fetch(endpoint, {
      method,
      headers: getAuthHeaders(),
      body: JSON.stringify({
        tender_id: parseInt(tender_id, 10),
        applied_on,
        portal_name,
        reference_number,
        application_status,
        bid_amount: bid_amount && String(bid_amount).trim() !== "" ? bid_amount : null,
        proposal_notes: proposal_notes || null
      })
    });
    const data = await res.json();

    if (res.ok) {
      showToast(data.message || (appId ? "Application updated successfully!" : "Application recorded successfully!"), "success");
      closeApplicationFormModal();
      await fetchDashboardData();
    } else {
      showFormError(data.message || "Could not save application.");
    }
  } catch {
    showFormError("Server error while saving application.");
  } finally {
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.textContent = origLabel;
    }
  }
};

async function initDashboardPage() {
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get("tab") === "saved") {
    window.location.href = "saved.html";
    return;
  }

  const user = getSafeStoredUser();
  if (!user) return;

  const displayName = user.name || user.username;
  const subText = user.company ? `${user.company} • ${user.email}` : user.email;

  const nameEl = document.getElementById("profile-name");
  if (nameEl) nameEl.textContent = displayName;
  const emailEl = document.getElementById("profile-email");
  if (emailEl) emailEl.textContent = subText;
  const codeEl = document.getElementById("profile-code");
  if (codeEl) codeEl.textContent = user.user_code || "CONTRACTOR";

  window.addEventListener("pageshow", (ev) => {
    if (ev.persisted) {
      fetchDashboardData();
      loadContractorTendersForModal();
    }
  });

  await Promise.all([fetchDashboardData(), loadContractorTendersForModal()]);
  const addAppParam = urlParams.get("addApp");
  if (addAppParam) {
    openApplicationFormModal(parseInt(addAppParam, 10));
  }
}

async function fetchDashboardData() {
  const headers = getAuthHeaders();
  try {
    const [appsRes, savedRes] = await Promise.all([
      fetchNoCache(`${API_BASE}/applications/my`, { headers }),
      fetchNoCache(`${API_BASE}/saved`, { headers })
    ]);

    if (appsRes.ok) {
      const appsData = await appsRes.json();
      renderContractorApplications(appsData);
    } else {
      showToast("Could not load application history", "error");
    }

    if (savedRes.ok) {
      const savedList = await savedRes.json();
      const savedCountEl = document.getElementById("saved-count");
      if (savedCountEl) savedCountEl.textContent = savedList.length;
    }
  } catch {
    showToast("Error loading contractor workspace", "error");
  }
}

function renderContractorApplications(data) {
  contractorApplicationsList = data.applications || [];

  const totalEl = document.getElementById("stat-total-apps");
  if (totalEl) totalEl.textContent = data.totalApplications || 0;
  const totalSubEl = document.getElementById("stat-total-sublabel");
  if (totalSubEl) {
    totalSubEl.textContent = data.withdrawn ? `Includes ${data.withdrawn} withdrawn` : "Recorded Bids";
  }

  const submittedEl = document.getElementById("stat-submitted-apps");
  if (submittedEl) submittedEl.textContent = data.submitted || 0;

  const underReviewEl = document.getElementById("stat-underreview-apps");
  if (underReviewEl) underReviewEl.textContent = data.underReview || 0;

  const wonEl = document.getElementById("stat-won-apps");
  if (wonEl) wonEl.textContent = data.won || 0;

  const lostEl = document.getElementById("stat-lost-apps");
  if (lostEl) lostEl.textContent = data.lost !== undefined ? data.lost : data.notAwarded || 0;

  const tableWrapper = document.getElementById("apps-table-wrapper");
  const emptyState = document.getElementById("applications-empty-state");
  const tbody = document.getElementById("applications-table-body");

  if (!contractorApplicationsList.length) {
    if (tableWrapper) tableWrapper.style.display = "none";
    if (emptyState) emptyState.style.display = "flex";
    return;
  }

  if (tableWrapper) tableWrapper.style.display = "block";
  if (emptyState) emptyState.style.display = "none";

  if (!tbody) return;
  tbody.innerHTML = contractorApplicationsList
    .map((app) => {
      const statusUpper = (app.application_status || "").toUpperCase();
      let statusBadge = `<span class="badge badge-blue">Submitted</span>`;
      if (statusUpper === "WON") {
        statusBadge = `<span class="badge badge-green">Won</span>`;
      } else if (["LOST", "NOT AWARDED", "REJECTED"].includes(statusUpper)) {
        statusBadge = `<span class="badge badge-red">${escapeHtml(app.application_status === "Not Awarded" ? "Lost" : app.application_status)}</span>`;
      } else if (statusUpper === "UNDER REVIEW") {
        statusBadge = `<span class="badge badge-orange">Under Review</span>`;
      } else if (statusUpper === "WITHDRAWN") {
        statusBadge = `<span class="badge badge-muted">Withdrawn</span>`;
      }

      const refDisplay = escapeHtml(app.reference_number || app.application_code || `APP-${app.id}`);
      const tenderCode = escapeHtml(app.tender_code || `TK-${String(app.tender_id).padStart(4, "0")}`);
      const portalLine = app.portal_name
        ? `<div style="font-size: 0.73rem; color: var(--text-muted); margin-top: 2px;">${escapeHtml(app.portal_name)}</div>`
        : "";
      const bidLine = app.bid_amount ? ` • Bid: ${formatBudget(app.bid_amount)}` : "";

      return `
        <tr>
          <td>
            <a href="tenderDetails.html?id=${app.tender_id}" style="color: var(--text-primary); font-weight: 700; text-decoration: none;">
              ${escapeHtml(app.tender_name)}
            </a>
            <div style="font-size: 0.75rem; color: var(--text-muted); margin-top: 2px;">
              ${escapeHtml(app.tender_category)}${app.tender_state ? ` • ${escapeHtml(app.tender_state)}` : ""}${bidLine}
            </div>
          </td>
          <td style="font-family: monospace; font-weight: 700; white-space: nowrap;">
            ${tenderCode}
          </td>
          <td style="font-size: 0.84rem; color: var(--text-secondary); white-space: nowrap;">
            ${escapeHtml(app.applied_on)}
          </td>
          <td style="font-family: monospace; font-weight: 700; font-size: 0.82rem;">
            ${refDisplay}
            ${portalLine}
          </td>
          <td style="white-space: nowrap;">${statusBadge}</td>
          <td style="white-space: nowrap;">
            <div style="display: flex; gap: 6px; align-items: center;">
              <button type="button" onclick="openAnalysisModal(${app.id})" class="btn btn-primary" style="font-size: 0.75rem; padding: 5px 11px;">View</button>
              <button type="button" onclick="openEditApplicationModal(${app.id})" class="btn btn-outline" style="font-size: 0.75rem; padding: 5px 10px;">Edit</button>
            </div>
          </td>
        </tr>
      `;
    })
    .join("");
}

window.openAnalysisModal = async (appId) => {
  currentAnalysisAppId = appId;
  const modal = document.getElementById("analysis-modal");
  if (!modal) return;

  const summarySection = document.getElementById("analysis-summary-section");
  const findingsList = document.getElementById("analysis-findings-list");
  const subtitleEl = document.getElementById("analysis-modal-subtitle");

  if (subtitleEl) subtitleEl.textContent = `Loading Application #${appId}...`;
  if (summarySection) summarySection.innerHTML = '<div style="padding: 16px; text-align: center; color: var(--text-muted);">Loading record...</div>';
  if (findingsList) findingsList.innerHTML = "";
  modal.style.display = "block";

  try {
    const res = await fetch(`${API_BASE}/applications/${appId}`, { headers: getAuthHeaders() });
    if (!res.ok) {
      showToast("Could not load application details", "error");
      modal.style.display = "none";
      return;
    }

    const data = await res.json();
    const app = data.application;
    const analysis = data.analysis || {};

    if (subtitleEl) subtitleEl.textContent = `${app.application_code || `APP-${app.id}`} • Submitted ${app.applied_on}`;

    const stUpper = (app.application_status || "").toUpperCase();
    const statusBadge =
      stUpper === "WON"
        ? '<span class="badge badge-green">Won</span>'
        : ["LOST", "NOT AWARDED", "REJECTED"].includes(stUpper)
        ? '<span class="badge badge-red">Lost</span>'
        : stUpper === "UNDER REVIEW"
        ? '<span class="badge badge-orange">Under Review</span>'
        : `<span class="badge badge-blue">${escapeHtml(app.application_status || "Submitted")}</span>`;

    if (summarySection) {
      summarySection.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 8px;">
          <div>
            <div style="display: flex; gap: 6px; flex-wrap: wrap; margin-bottom: 4px;">
              <span class="badge badge-muted">${escapeHtml(app.tender_code || `TK-${app.tender_id}`)}</span>
              <span class="badge badge-blue">${escapeHtml(app.tender_category)}</span>
              ${app.tender_state ? `<span class="badge badge-purple">${escapeHtml(app.tender_state)}</span>` : ""}
            </div>
            <h4 style="font-size: 1.12rem; font-weight: 850; color: var(--text-primary); margin: 4px 0;">${escapeHtml(app.tender_name)}</h4>
            <span style="font-size: 0.8rem; color: var(--text-muted);">${escapeHtml(app.tender_department)} • ${escapeHtml(app.tender_location)}</span>
          </div>
          <div>${statusBadge}</div>
        </div>

        <div class="grid-3" style="gap: 12px; margin-top: 8px; background-color: var(--bg-card); padding: 12px 14px; border-radius: 10px; border: 1px solid var(--border-color);">
          <div>
            <span style="font-size: 0.7rem; font-weight: 700; color: var(--text-muted); text-transform: uppercase; display: block;">Portal &amp; Ref Number</span>
            <strong style="font-size: 0.86rem; color: var(--text-primary); display: block;">${escapeHtml(app.reference_number || app.application_code)}</strong>
            <span style="font-size: 0.74rem; color: var(--text-muted);">${escapeHtml(app.portal_name || "External Government Portal")}</span>
          </div>
          <div>
            <span style="font-size: 0.7rem; font-weight: 700; color: var(--text-muted); text-transform: uppercase; display: block;">Quoted Bid / Est. Budget</span>
            <strong style="font-size: 0.9rem; color: var(--text-primary);">${app.bid_amount ? formatBudget(app.bid_amount) : "Not recorded"}</strong>
            <span style="font-size: 0.74rem; color: var(--text-muted); display: block;">Est: ${formatBudget(app.tender_budget)}</span>
          </div>
          <div>
            <span style="font-size: 0.7rem; font-weight: 700; color: var(--text-muted); text-transform: uppercase; display: block;">Submission Date</span>
            <strong style="font-size: 0.9rem; color: var(--color-primary);">${escapeHtml(app.applied_on)}</strong>
            <span style="font-size: 0.74rem; color: var(--text-muted); display: block;">Deadline: ${escapeHtml(app.tender_deadline)}</span>
          </div>
        </div>

        ${
          app.proposal_notes
            ? `<div style="margin-top: 4px;">
                 <span style="font-size: 0.72rem; font-weight: 700; color: var(--text-muted); text-transform: uppercase; display: block;">Additional Notes</span>
                 <div style="font-size: 0.85rem; color: var(--text-secondary); background: var(--bg-card); padding: 8px 12px; border-radius: 8px; border: 1px solid var(--border-color); margin-top: 4px;">${escapeHtml(app.proposal_notes)}</div>
               </div>`
            : ""
        }
      `;
    }

    if (findingsList) {
      const findings = analysis.findings || [];
      if (!findings.length) {
        findingsList.innerHTML = '<div style="padding: 1rem; text-align: center; color: var(--text-muted); font-size: 0.86rem;">No additional submission notes recorded.</div>';
      } else {
        findingsList.innerHTML = findings
          .map(
            (f) => `
            <div style="border-radius: 12px; border: 1px solid var(--border-color); background: var(--bg-card); padding: 12px 14px; display: flex; flex-direction: column; gap: 6px;">
              <strong style="font-size: 0.84rem; color: var(--color-primary);">${escapeHtml(f.factor)}</strong>
              <div style="font-size: 0.86rem; color: var(--text-primary); line-height: 1.45;">${escapeHtml(f.observation)}</div>
              <div style="font-size: 0.8rem; color: var(--text-secondary); line-height: 1.4;">${escapeHtml(f.recommended_action || f.recommendedAction || "")}</div>
            </div>
          `
          )
          .join("");
      }
    }
  } catch {
    showToast("Error loading application details", "error");
    modal.style.display = "none";
  }
};

window.closeAnalysisModal = () => {
  const modal = document.getElementById("analysis-modal");
  if (modal) modal.style.display = "none";
  currentAnalysisAppId = null;
};

/* ---------------- CENTRAL ADMIN WORKSPACE (admin.html) ---------------- */
let adminTendersList = [];
let adminPieChartInstance = null;
let isAdminTenderSubmitting = false;

async function initAdminPage() {
  await populateAdminStateFormDropdown();

  const searchInp = document.getElementById("admin-filter-search");
  const catSel = document.getElementById("admin-filter-category");
  const stateSel = document.getElementById("admin-filter-state");
  const statusSel = document.getElementById("admin-filter-status");

  let debounceTimer;
  if (searchInp) {
    searchInp.oninput = () => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => renderAdminTendersTable(), 200);
    };
  }
  [catSel, stateSel, statusSel].forEach((sel) => {
    if (sel) sel.onchange = () => renderAdminTendersTable();
  });

  window.addEventListener("pageshow", (ev) => {
    if (ev.persisted) {
      fetchAdminWorkspace();
    }
  });

  await fetchAdminWorkspace();
}

async function populateAdminStateFormDropdown() {
  const stateSel = document.getElementById("tender-form-state");
  if (!stateSel) return;
  let states = FALLBACK_INDIAN_STATES;
  try {
    const res = await fetch(`${API_BASE}/users/states`);
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data.states) && data.states.length > 0) states = data.states;
    }
  } catch {
    // Use fallback states
  }
  stateSel.innerHTML =
    '<option value="">Select State</option>' +
    states.map((s) => `<option value="${escapeHtml(s)}">${escapeHtml(s)}</option>`).join("");
}

function computeCategoryDistributionFromTenders(tenders) {
  const countsMap = new Map();
  for (const t of tenders || []) {
    countsMap.set(t.category, (countsMap.get(t.category) || 0) + 1);
  }
  return PERMITTED_CATEGORIES.map((category) => ({
    category,
    count: countsMap.get(category) || 0
  }));
}

function applyAdminWorkspaceData(tenders) {
  adminTendersList = Array.isArray(tenders) ? tenders : [];

  const total = adminTendersList.length;
  const dist = computeCategoryDistributionFromTenders(adminTendersList);

  const totalEl = document.getElementById("admin-total-tenders");
  if (totalEl) totalEl.textContent = total;
  const badgeEl = document.getElementById("admin-pie-total-badge");
  if (badgeEl) badgeEl.textContent = `Total: ${total} Tender${total === 1 ? "" : "s"}`;

  renderAdminCategoryPieChart(dist, total);

  const stateSel = document.getElementById("admin-filter-state");
  if (stateSel) {
    const prev = stateSel.value;
    const states = [...new Set(adminTendersList.map((t) => t.state).filter(Boolean))].sort();
    stateSel.innerHTML =
      '<option value="">All States</option>' +
      states.map((s) => `<option value="${escapeHtml(s)}">${escapeHtml(s)}</option>`).join("");
    if (prev && states.includes(prev)) stateSel.value = prev;
  }

  renderAdminTendersTable();
}

async function syncAdminAfterMutation(data) {
  if (data && Array.isArray(data.tenders)) {
    applyAdminWorkspaceData(data.tenders);
    return;
  }
  await fetchAdminWorkspace();
}

async function fetchAdminWorkspace() {
  try {
    const res = await fetchNoCache(`${API_BASE}/admin/tenders`, { headers: getAuthHeaders() });
    if (!res.ok) {
      showToast("Error loading Central Admin workspace", "error");
      return;
    }
    const tenders = await res.json();
    applyAdminWorkspaceData(tenders);
  } catch {
    showToast("Error loading Central Admin workspace", "error");
  }
}

function renderAdminCategoryPieChart(distribution, totalCount) {
  const colors = ["#2563EB", "#10B981", "#06B6D4", "#F59E0B", "#8B5CF6", "#EC4899"];
  const labels = distribution.map((d) => d.category);
  const values = distribution.map((d) => d.count);

  const listEl = document.getElementById("admin-category-breakdown-list");
  if (listEl) {
    listEl.innerHTML = distribution
      .map((d, idx) => {
        const pct = totalCount > 0 ? ((d.count / totalCount) * 100).toFixed(1) : "0.0";
        return `
          <div style="display: flex; align-items: center; justify-content: space-between; padding: 10px 14px; border-radius: 10px; background: var(--bg-secondary); border: 1px solid var(--border-color);">
            <div style="display: flex; align-items: center; gap: 10px;">
              <span style="width: 12px; height: 12px; border-radius: 3px; background-color: ${colors[idx % colors.length]}; flex-shrink: 0;"></span>
              <strong style="font-size: 0.9rem; color: var(--text-primary);">${escapeHtml(d.category)}</strong>
            </div>
            <div style="display: flex; align-items: center; gap: 10px;">
              <span class="badge badge-blue">${d.count} tender${d.count === 1 ? "" : "s"}</span>
              <span style="font-size: 0.8rem; color: var(--text-muted); min-width: 44px; text-align: right;">${pct}%</span>
            </div>
          </div>
        `;
      })
      .join("");
  }

  const canvas = document.getElementById("admin-category-pie-chart");
  const fallbackEl = document.getElementById("admin-pie-fallback");
  if (!canvas) return;

  if (typeof window.Chart !== "function") {
    canvas.style.display = "none";
    if (fallbackEl) {
      fallbackEl.style.display = "block";
      fallbackEl.textContent = "Category counts displayed in the summary panel (Chart library unavailable offline).";
    }
    return;
  }

  canvas.style.display = "block";
  if (fallbackEl) fallbackEl.style.display = "none";

  const isDark = document.body.classList.contains("dark-theme");
  const textColor = isDark ? "#CBD5E1" : "#334155";
  const borderColor = isDark ? "#111827" : "#FFFFFF";

  if (adminPieChartInstance) {
    adminPieChartInstance.data.labels = labels;
    adminPieChartInstance.data.datasets[0].data = values;
    adminPieChartInstance.data.datasets[0].backgroundColor = colors;
    adminPieChartInstance.data.datasets[0].borderColor = borderColor;
    adminPieChartInstance.options.plugins.legend.labels.color = textColor;
    adminPieChartInstance.update();
    return;
  }

  adminPieChartInstance = new window.Chart(canvas.getContext("2d"), {
    type: "pie",
    data: {
      labels,
      datasets: [
        {
          data: values,
          backgroundColor: colors,
          borderColor,
          borderWidth: 2
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: "bottom",
          labels: {
            color: textColor,
            padding: 14,
            boxWidth: 12,
            font: { family: "Inter, system-ui, sans-serif", size: 12, weight: "600" }
          }
        },
        tooltip: {
          callbacks: {
            label: (ctx) => {
              const count = ctx.parsed || 0;
              const datasetTotal = (ctx.dataset?.data || []).reduce((sum, val) => sum + (Number(val) || 0), 0);
              const pct = datasetTotal > 0 ? ((count / datasetTotal) * 100).toFixed(1) : "0.0";
              return ` ${ctx.label}: ${count} (${pct}%)`;
            }
          }
        }
      }
    }
  });
}

function updateAdminChartTheme() {
  if (!adminPieChartInstance) return;
  const isDark = document.body.classList.contains("dark-theme");
  adminPieChartInstance.data.datasets[0].borderColor = isDark ? "#111827" : "#FFFFFF";
  adminPieChartInstance.options.plugins.legend.labels.color = isDark ? "#CBD5E1" : "#334155";
  adminPieChartInstance.update();
}

window.resetAdminTenderFilters = () => {
  ["admin-filter-search", "admin-filter-category", "admin-filter-state", "admin-filter-status"].forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.value = "";
  });
  renderAdminTendersTable();
};

window.renderAdminTendersTable = () => {
  const tbody = document.getElementById("admin-tenders-table");
  const emptyEl = document.getElementById("admin-tenders-empty");
  const showingEl = document.getElementById("admin-tenders-showing");
  if (!tbody) return;

  const search = (document.getElementById("admin-filter-search")?.value || "").trim().toLowerCase();
  const catFilter = document.getElementById("admin-filter-category")?.value || "";
  const stateFilter = document.getElementById("admin-filter-state")?.value || "";
  const statusFilter = document.getElementById("admin-filter-status")?.value || "";

  const filtered = adminTendersList.filter((t) => {
    const st = getTenderStatus(t.deadline, t.raw_status || t.status).label;
    if (catFilter && t.category !== catFilter) return false;
    if (stateFilter && (t.state || "").toLowerCase() !== stateFilter.toLowerCase()) return false;
    if (statusFilter && st.toLowerCase() !== statusFilter.toLowerCase()) return false;
    if (search) {
      const hay = `${t.tender_code || ""} ${t.name || ""} ${t.department || ""} ${t.location || ""} ${t.state || ""}`.toLowerCase();
      if (!hay.includes(search)) return false;
    }
    return true;
  });

  if (showingEl) {
    showingEl.textContent = `Showing ${filtered.length} of ${adminTendersList.length} tender(s)`;
  }

  if (filtered.length === 0) {
    tbody.innerHTML = "";
    if (emptyEl) emptyEl.style.display = "block";
    return;
  }
  if (emptyEl) emptyEl.style.display = "none";

  tbody.innerHTML = filtered
    .map((t) => {
      const st = getTenderStatus(t.deadline, t.raw_status || t.status);
      const code = escapeHtml(t.tender_code || `TK-${String(t.id).padStart(4, "0")}`);
      const isClosed = st.label === "Closed";

      const closeOrReopenBtn = isClosed
        ? `<button type="button" onclick="handleAdminReopenTender(${t.id})" class="btn btn-outline" style="font-size: 0.75rem; padding: 4px 10px;">Reopen</button>`
        : `<button type="button" onclick="handleAdminCloseTender(${t.id})" class="btn btn-secondary" style="font-size: 0.75rem; padding: 4px 10px;">Close</button>`;

      return `
        <tr>
          <td style="font-family: monospace; font-weight: 700; white-space: nowrap;">${code}</td>
          <td style="min-width: 240px;">
            <a href="tenderDetails.html?id=${t.id}" style="font-weight: 700; color: var(--text-primary);">${escapeHtml(t.name)}</a>
            <div style="font-size: 0.74rem; color: var(--text-muted); margin-top: 2px;">${escapeHtml(t.department)}</div>
            ${t.source_url ? `<a href="${escapeHtml(t.source_url)}" target="_blank" rel="noopener noreferrer" style="font-size: 0.72rem; color: var(--color-primary); font-weight: 600;">Portal &nearr;</a>` : ""}
          </td>
          <td style="white-space: nowrap;"><span class="badge badge-blue">${escapeHtml(t.category)}</span></td>
          <td>
            <span class="badge badge-purple">${escapeHtml(t.state || "--")}</span>
            <div style="font-size: 0.74rem; color: var(--text-muted); margin-top: 3px;">${escapeHtml(t.location)}</div>
          </td>
          <td style="font-weight: 700; white-space: nowrap;">${formatBudget(t.budget)}</td>
          <td style="font-size: 0.78rem; white-space: nowrap;">
            <div>Pub: ${escapeHtml(t.published_date || "--")}</div>
            <div style="font-weight: 700;">Due: ${escapeHtml(t.deadline)}</div>
          </td>
          <td style="white-space: nowrap;">
            <span class="badge ${st.class}">${escapeHtml(st.label)}</span>
          </td>
          <td style="text-align: right; white-space: nowrap;">
            <div style="display: inline-flex; gap: 6px;">
              <button type="button" onclick="openAdminEditTenderModal(${t.id})" class="btn btn-outline" style="font-size: 0.75rem; padding: 4px 10px;">Edit</button>
              ${closeOrReopenBtn}
              <button type="button" onclick="openAdminDeleteModal(${t.id})" class="btn" style="font-size: 0.75rem; padding: 4px 10px; background: rgba(239,68,68,0.08); color: var(--color-danger); border: 1px solid rgba(239,68,68,0.25);">Remove</button>
            </div>
          </td>
        </tr>
      `;
    })
    .join("");
};

function generateNextSuggestedTenderCode() {
  let maxNum = 68;
  for (const t of adminTendersList) {
    if (t.id > maxNum) maxNum = t.id;
    const match = (t.tender_code || "").match(/(\d+)$/);
    if (match) {
      const n = parseInt(match[1], 10);
      if (n > maxNum) maxNum = n;
    }
  }
  return `TK-${String(maxNum + 1).padStart(4, "0")}`;
}

window.openAdminAddTenderModal = async () => {
  const modal = document.getElementById("admin-tender-modal");
  if (!modal) return;
  const stateSel = document.getElementById("tender-form-state");
  if (stateSel && stateSel.options.length <= 1) {
    await populateAdminStateFormDropdown();
  }

  document.getElementById("admin-tender-form-error").style.display = "none";
  document.getElementById("tender-form-id").value = "";
  document.getElementById("admin-tender-modal-title").textContent = "Add New Tender";
  document.getElementById("admin-tender-modal-subtitle").textContent = "Publish a new infrastructure tender to the live catalog.";
  document.getElementById("tender-form-submit-btn").textContent = "Publish Tender";

  document.getElementById("tender-form-name").value = "";
  document.getElementById("tender-form-code").value = generateNextSuggestedTenderCode();
  document.getElementById("tender-form-category").value = "Roads";
  if (stateSel) stateSel.value = "";
  document.getElementById("tender-form-location").value = "";
  document.getElementById("tender-form-department").value = "";
  document.getElementById("tender-form-budget").value = "";
  document.getElementById("tender-form-published").value = getLocalTodayStr();
  document.getElementById("tender-form-deadline").value = addDaysToLocalDate(30);
  document.getElementById("tender-form-status").value = "Open";
  document.getElementById("tender-form-source-url").value = "https://eprocure.gov.in/eprocure/app";
  document.getElementById("tender-form-description").value = "";
  document.getElementById("tender-form-eligibility").value = "";
  document.getElementById("tender-form-docs").value = "";

  modal.style.display = "block";
};

window.openAdminEditTenderModal = async (tenderId) => {
  const t = adminTendersList.find((x) => x.id === tenderId);
  const modal = document.getElementById("admin-tender-modal");
  if (!t || !modal) return;
  const stateSel = document.getElementById("tender-form-state");
  if (stateSel && stateSel.options.length <= 1) {
    await populateAdminStateFormDropdown();
  }

  document.getElementById("admin-tender-form-error").style.display = "none";
  document.getElementById("tender-form-id").value = t.id;
  document.getElementById("admin-tender-modal-title").textContent = `Edit Tender (${t.tender_code || `TK-${t.id}`})`;
  document.getElementById("admin-tender-modal-subtitle").textContent = "Update tender parameters, status, budget, dates, or official link.";
  document.getElementById("tender-form-submit-btn").textContent = "Save Changes";

  document.getElementById("tender-form-name").value = t.name || "";
  document.getElementById("tender-form-code").value = t.tender_code || `TK-${String(t.id).padStart(4, "0")}`;
  document.getElementById("tender-form-category").value = t.category || "Roads";
  if (stateSel) stateSel.value = t.state || "";
  document.getElementById("tender-form-location").value = t.location || "";
  document.getElementById("tender-form-department").value = t.department || "";
  document.getElementById("tender-form-budget").value = t.budget || "";
  document.getElementById("tender-form-published").value = t.published_date || getLocalTodayStr();
  document.getElementById("tender-form-deadline").value = t.deadline || "";
  const st = getTenderStatus(t.deadline, t.raw_status || t.status).label;
  document.getElementById("tender-form-status").value = ["Open", "Closing Soon", "Closed"].includes(st) ? st : "Open";
  document.getElementById("tender-form-source-url").value = t.source_url || "https://eprocure.gov.in/eprocure/app";
  document.getElementById("tender-form-description").value = t.description || "";
  document.getElementById("tender-form-eligibility").value = t.eligibility || "";
  document.getElementById("tender-form-docs").value = Array.isArray(t.required_documents)
    ? t.required_documents.join(", ")
    : "";

  modal.style.display = "block";
};

window.closeAdminTenderModal = () => {
  const modal = document.getElementById("admin-tender-modal");
  if (modal) modal.style.display = "none";
};

window.handleAdminTenderSubmit = async (e) => {
  e.preventDefault();
  if (isAdminTenderSubmitting) return;
  const errBox = document.getElementById("admin-tender-form-error");
  const showFormErr = (msg) => {
    if (errBox) {
      errBox.textContent = msg;
      errBox.style.display = "block";
    }
    showToast(msg, "error");
  };
  if (errBox) errBox.style.display = "none";

  const tenderId = document.getElementById("tender-form-id")?.value.trim();
  const name = document.getElementById("tender-form-name")?.value.trim();
  const tender_code = document.getElementById("tender-form-code")?.value.trim();
  const category = document.getElementById("tender-form-category")?.value;
  const state = document.getElementById("tender-form-state")?.value;
  const location = document.getElementById("tender-form-location")?.value.trim();
  const department = document.getElementById("tender-form-department")?.value.trim();
  const budget = document.getElementById("tender-form-budget")?.value;
  const published_date = document.getElementById("tender-form-published")?.value;
  const deadline = document.getElementById("tender-form-deadline")?.value;
  const status = document.getElementById("tender-form-status")?.value;
  const source_url = document.getElementById("tender-form-source-url")?.value.trim();
  const description = document.getElementById("tender-form-description")?.value.trim();
  const eligibility = document.getElementById("tender-form-eligibility")?.value.trim();
  const docsRaw = document.getElementById("tender-form-docs")?.value.trim();

  if (!name || name.length < 5) {
    showFormErr("Tender title must be at least 5 characters long.");
    return;
  }
  if (!tender_code || !category || !state || !location || !department || !published_date || !deadline || !source_url || !description) {
    showFormErr("Please complete all required tender fields.");
    return;
  }
  if (parseFloat(budget) <= 0 || isNaN(parseFloat(budget))) {
    showFormErr("Estimated budget must be a positive number.");
    return;
  }
  if (deadline < published_date) {
    showFormErr("Submission deadline cannot be earlier than the published date.");
    return;
  }
  if (status !== "Closed" && deadline < getLocalTodayStr()) {
    showFormErr(`Deadline (${deadline}) has already passed. Extend the deadline or set Status to "Closed".`);
    return;
  }
  try {
    const parsedUrl = new URL(source_url);
    if (!["http:", "https:"].includes(parsedUrl.protocol)) {
      throw new Error("Invalid protocol");
    }
  } catch {
    showFormErr("Official government portal link must be a valid http:// or https:// URL.");
    return;
  }

  const payload = {
    name,
    tender_code,
    category,
    state,
    location,
    department,
    budget: parseFloat(budget),
    published_date,
    deadline,
    status,
    source_url,
    description
  };
  if (eligibility) payload.eligibility = eligibility;
  if (docsRaw) {
    payload.required_documents = docsRaw.split(",").map((s) => s.trim()).filter(Boolean);
  }

  const submitBtn = document.getElementById("tender-form-submit-btn");
  const origLabel = submitBtn ? submitBtn.textContent : "Save Tender";
  isAdminTenderSubmitting = true;
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.textContent = tenderId ? "Saving..." : "Publishing...";
  }

  try {
    const url = tenderId ? `${API_BASE}/admin/tenders/${tenderId}` : `${API_BASE}/admin/tenders`;
    const method = tenderId ? "PUT" : "POST";
    const res = await fetch(url, {
      method,
      headers: getAuthHeaders(),
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (res.ok) {
      showToast(data.message || "Tender saved successfully", "success");
      closeAdminTenderModal();
      await syncAdminAfterMutation(data);
    } else {
      showFormErr(data.message || "Could not save tender");
    }
  } catch {
    showFormErr("Network error while saving tender");
  } finally {
    isAdminTenderSubmitting = false;
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.textContent = origLabel;
    }
  }
};

window.handleAdminCloseTender = async (tenderId) => {
  try {
    const res = await fetch(`${API_BASE}/admin/tenders/${tenderId}/status`, {
      method: "PATCH",
      headers: getAuthHeaders(),
      body: JSON.stringify({ action: "close" })
    });
    const data = await res.json();
    if (res.ok) {
      showToast(data.message || "Tender closed", "info");
      await syncAdminAfterMutation(data);
    } else {
      showToast(data.message || "Failed to close tender", "error");
    }
  } catch {
    showToast("Error closing tender", "error");
  }
};

window.handleAdminReopenTender = async (tenderId) => {
  const t = adminTendersList.find((x) => x.id === tenderId);
  if (!t) return;

  if (t.deadline && t.deadline < getLocalTodayStr()) {
    const modal = document.getElementById("admin-reopen-modal");
    if (!modal) return;
    document.getElementById("reopen-tender-id").value = t.id;
    document.getElementById("reopen-modal-text").textContent =
      `The previous submission deadline (${t.deadline}) for "${t.name}" has passed. Set a future submission deadline to reopen this tender.`;
    document.getElementById("reopen-new-deadline").value = addDaysToLocalDate(30);
    modal.style.display = "block";
    return;
  }

  try {
    const res = await fetch(`${API_BASE}/admin/tenders/${tenderId}/status`, {
      method: "PATCH",
      headers: getAuthHeaders(),
      body: JSON.stringify({ action: "reopen" })
    });
    const data = await res.json();
    if (res.ok) {
      showToast(data.message || "Tender reopened", "success");
      await syncAdminAfterMutation(data);
    } else {
      showToast(data.message || "Could not reopen tender", "error");
    }
  } catch {
    showToast("Error reopening tender", "error");
  }
};

window.closeAdminReopenModal = () => {
  const modal = document.getElementById("admin-reopen-modal");
  if (modal) modal.style.display = "none";
};

window.confirmAdminReopenWithDeadline = async (e) => {
  e.preventDefault();
  const tenderId = document.getElementById("reopen-tender-id")?.value;
  const deadline = document.getElementById("reopen-new-deadline")?.value;
  if (!tenderId || !deadline) return;

  try {
    const res = await fetch(`${API_BASE}/admin/tenders/${tenderId}/status`, {
      method: "PATCH",
      headers: getAuthHeaders(),
      body: JSON.stringify({ action: "reopen", deadline })
    });
    const data = await res.json();
    if (res.ok) {
      showToast(data.message || "Tender reopened", "success");
      closeAdminReopenModal();
      await syncAdminAfterMutation(data);
    } else {
      showToast(data.message || "Could not reopen tender", "error");
    }
  } catch {
    showToast("Error reopening tender", "error");
  }
};

window.openAdminDeleteModal = (tenderId) => {
  const t = adminTendersList.find((x) => x.id === tenderId);
  const modal = document.getElementById("admin-delete-modal");
  if (!t || !modal) return;
  document.getElementById("delete-tender-id").value = t.id;
  document.getElementById("delete-modal-text").textContent =
    `Are you sure you want to remove "${t.name}" (${t.tender_code || `TK-${t.id}`})? This action will permanently delete the tender and cannot be undone.`;
  modal.style.display = "block";
};

window.closeAdminDeleteModal = () => {
  const modal = document.getElementById("admin-delete-modal");
  if (modal) modal.style.display = "none";
};

window.confirmAdminDeleteTender = async () => {
  const tenderId = document.getElementById("delete-tender-id")?.value;
  if (!tenderId) return;
  const btn = document.getElementById("confirm-delete-tender-btn");
  if (btn) {
    btn.disabled = true;
    btn.textContent = "Removing...";
  }

  try {
    const res = await fetch(`${API_BASE}/admin/tenders/${tenderId}`, {
      method: "DELETE",
      headers: getAuthHeaders()
    });
    const data = await res.json();
    if (res.ok) {
      showToast(data.message || "Tender removed successfully", "info");
      closeAdminDeleteModal();
      await syncAdminAfterMutation(data);
    } else {
      showToast(data.message || "Could not remove tender", "error");
    }
  } catch {
    showToast("Network error removing tender", "error");
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.textContent = "Remove Tender";
    }
  }
};
