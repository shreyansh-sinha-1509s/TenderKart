// TenderKart - Frontend Application Logic (app.js)
// Traditional student-friendly coding style

const API_BASE = window.location.protocol === "file:" || ((window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1") && ["5500", "5501", "5502", "5503"].includes(window.location.port))
  ? "http://localhost:5000/api"
  : "/api";

// Page-specific initialization when the DOM is ready
document.addEventListener("DOMContentLoaded", () => {
  loadTheme();
  renderNavbar();
  renderFooter();
  setupAuthUI();
  
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
  } else if (page === "dashboard.html") {
    initDashboardPage();
  } else if (page === "manager.html") {
    initManagerPage();
  } else if (page === "admin.html") {
    initAdminPage();
  } else if (page === "contact.html") {
    initContactPage();
  }
});

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

// Helper to get current file name
function currentPage() {
  return window.location.pathname.split("/").pop() || "index.html";
}

// Helper to get authorization headers
function getAuthHeaders() {
  const token = localStorage.getItem("token");
  return {
    "Content-Type": "application/json",
    "Authorization": token ? `Bearer ${token}` : ""
  };
}

/* ---------------- THEME TOGGLER ---------------- */
function toggleTheme() {
  const body = document.body;
  body.classList.toggle("dark-theme");
  const isDark = body.classList.contains("dark-theme");
  localStorage.setItem("theme", isDark ? "dark" : "light");
  
  // Update button icons if visible
  const themeIcons = document.querySelectorAll(".theme-icon");
  themeIcons.forEach(icon => {
    icon.innerHTML = isDark 
      ? '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-sun"><circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/></svg>'
      : '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-moon"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/></svg>';
  });
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
  if (explicit === "Under Evaluation") {
    return { label: "Under Evaluation", class: "badge-purple", countdown: deadlineStr || "Evaluating" };
  }
  if (explicit === "Awarded") {
    return { label: "Awarded", class: "badge-green", countdown: deadlineStr || "Awarded" };
  }
  if (explicit === "Closed") {
    return { label: "Closed", class: "badge-muted", countdown: "Closed" };
  }

  const deadline = new Date(deadlineStr);
  const now = new Date();
  deadline.setHours(0, 0, 0, 0);
  now.setHours(0, 0, 0, 0);

  if (deadline < now) {
    return { label: "Closed", class: "badge-muted", countdown: "Closed" };
  }

  const diffDays = Math.ceil((deadline - now) / (1000 * 60 * 60 * 24));
  if (diffDays <= 7) {
    const dayText = diffDays === 0 ? "today" : (diffDays === 1 ? "1 day" : `${diffDays} days`);
    return { label: "Closing Soon", class: "badge-orange", countdown: diffDays === 0 ? "Closes today" : `Closes in ${dayText}` };
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
  let icon = "";
  if (type === "success") {
    borderColor = "#10B981";
    icon = '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#10B981" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-check-circle"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><path d="m9 11 3 3L22 4"/></svg>';
  } else if (type === "warning") {
    borderColor = "#F59E0B";
    icon = '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#F59E0B" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-alert-triangle"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>';
  } else if (type === "error") {
    borderColor = "#EF4444";
    icon = '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#EF4444" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-alert-circle"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>';
  } else {
    icon = '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#2563EB" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-info"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>';
  }

  toast.style.borderLeft = `4px solid ${borderColor}`;
  toast.innerHTML = `
    <div style="display: flex; align-items: center; gap: 12px;">
      ${icon}
      <span style="font-size: 0.9rem; font-weight: 500; color: var(--text-primary);">${message}</span>
    </div>
    <button onclick="this.parentElement.remove()" style="background: none; border: none; color: var(--text-muted); cursor: pointer; padding: 4px; display: flex; align-items: center; justify-content: center; border-radius: 4px;">
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-x"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
    </button>
  `;

  container.appendChild(toast);
  setTimeout(() => {
    toast.remove();
  }, 4000);
}

/* ---------------- NAVBAR & FOOTER RENDERING ---------------- */
function renderNavbar() {
  const placeholder = document.getElementById("navbar-placeholder");
  if (!placeholder) return;

  const isDark = document.body.classList.contains("dark-theme");
  const userJson = localStorage.getItem("user");
  const user = userJson ? JSON.parse(userJson) : null;

  const themeButtonIcon = isDark 
    ? '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-sun"><circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/></svg>'
    : '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-moon"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/></svg>';

  let authSectionHtml = "";
  if (user) {
    const roleLower = (user.role || "").toLowerCase();
    const dashboardPage = roleLower === "admin" ? "admin.html" : (roleLower === "manager" ? "manager.html" : "dashboard.html");
    const dashboardLabel = roleLower === "admin"
      ? "Central Admin"
      : (roleLower === "manager" ? `${escapeHtml(user.office_state || "State")} Manager` : "Dashboard");
    const dashboardIcon = (roleLower === "admin" || roleLower === "manager")
      ? '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-shield-alert"><path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.8 17 5 19 5a1 1 0 0 1 1 1Z"/><path d="M12 8v4"/><path d="M12 16h.01"/></svg>'
      : '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-user"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>';

    authSectionHtml = `
      <div style="display: flex; align-items: center; gap: 12px;">
        <a href="${dashboardPage}" style="display: flex; align-items: center; gap: 6px; padding: 0.55rem 1.15rem; border-radius: 12px; font-size: 0.9rem; font-weight: 600; background-color: rgba(var(--primary-rgb), 0.08); color: var(--color-primary); border: 1px solid var(--color-primary); transition: var(--transition-smooth);">
          ${dashboardIcon}
          <span>${dashboardLabel}</span>
        </a>
        <button onclick="handleLogout()" style="background: none; border: none; cursor: pointer; padding: 10px; border-radius: 12px; display: flex; align-items: center; justify-content: center; color: var(--color-danger); background-color: rgba(239, 68, 68, 0.05); border: 1px solid rgba(239, 68, 68, 0.1); transition: var(--transition-smooth);" title="Logout">
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-log-out"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
        </button>
      </div>
    `;
  } else {
    authSectionHtml = `
      <div style="display: flex; align-items: center; gap: 12px;">
        <a href="login.html" style="font-size: 0.95rem; font-weight: 600; padding: 0.5rem 1rem; color: var(--text-primary);">Login</a>
        <a href="register.html" style="font-size: 0.95rem; font-weight: 600; padding: 0.65rem 1.25rem; border-radius: 12px; background-color: var(--color-primary); color: #FFFFFF; box-shadow: 0 4px 10px rgba(var(--primary-rgb), 0.15);">Register</a>
      </div>
    `;
  }

  placeholder.innerHTML = `
    <nav class="glass" style="position: sticky; top: 0; z-index: 1000; width: 100%;">
      <div class="container" style="display: flex; align-items: center; justify-content: space-between; height: 76px;">
        <!-- Brand -->
        <a href="index.html" style="display: flex; align-items: center; gap: 12px;">
          <img src="images/logo.jpg" alt="TenderKart Logo" style="height: 46px; width: 46px; border-radius: 8px; object-fit: cover;" />
          <div style="display: flex; flex-direction: column;">
            <span style="font-size: 1.25rem; font-weight: 800; color: var(--color-primary); letter-spacing: -0.5px;">TenderKart</span>
            <span style="font-size: 0.65rem; color: var(--text-muted); font-weight: 600; margin-top: -2px;">Urban Infrastructure Opportunities Tracker</span>
          </div>
        </a>

        <!-- Links -->
        <div style="display: flex; align-items: center; gap: 28px;" id="desktop-nav-links">
          <a href="index.html" class="nav-link" id="link-home">Home</a>
          <a href="tenders.html" class="nav-link" id="link-tenders">Browse Tenders</a>
          <a href="about.html" class="nav-link" id="link-about">About</a>
          <a href="contact.html" class="nav-link" id="link-contact">Contact</a>
        </div>

        <!-- Actions -->
        <div style="display: flex; align-items: center; gap: 16px;" id="desktop-nav-actions">
          <button onclick="toggleTheme()" class="theme-icon" style="background: none; border: none; cursor: pointer; padding: 8px; border-radius: 8px; display: flex; align-items: center; justify-content: center; transition: var(--transition-smooth); background-color: var(--bg-toggle); border: 1px solid var(--border-toggle); color: var(--color-primary);">
            ${themeButtonIcon}
          </button>
          ${authSectionHtml}
        </div>

        <!-- Hamburger trigger -->
        <button id="mobile-menu-btn" onclick="toggleMobileMenu()" style="background: none; border: none; cursor: pointer; display: none; padding: 8px; border-radius: 8px; align-items: center; justify-content: center; color: var(--text-primary); transition: var(--transition-smooth);">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-menu"><line x1="4" x2="20" y1="12" y2="12"/><line x1="4" x2="20" y1="6" y2="6"/><line x1="4" x2="20" y1="18" y2="18"/></svg>
        </button>
      </div>

      <!-- Mobile responsive dropdown drawer -->
      <div id="mobile-menu-drawer" style="display: none; flex-direction: column; width: 100%; border-top: 1px solid var(--border-color); background-color: var(--bg-secondary); padding: 1.5rem; gap: 16px; box-shadow: 0 4px 10px rgba(0,0,0,0.05); transition: var(--transition-smooth);">
        <a href="index.html" style="font-size: 1rem; font-weight: 600; color: var(--text-primary); padding: 8px 0; border-bottom: 1px solid var(--border-color);">Home</a>
        <a href="tenders.html" style="font-size: 1rem; font-weight: 600; color: var(--text-primary); padding: 8px 0; border-bottom: 1px solid var(--border-color);">Browse Tenders</a>
        <a href="about.html" style="font-size: 1rem; font-weight: 600; color: var(--text-primary); padding: 8px 0; border-bottom: 1px solid var(--border-color);">About</a>
        <a href="contact.html" style="font-size: 1rem; font-weight: 600; color: var(--text-primary); padding: 8px 0; border-bottom: 1px solid var(--border-color);">Contact</a>
        <div style="display: flex; align-items: center; justify-content: space-between; padding-top: 12px; margin-top: 8px; border-top: 1px dashed var(--border-color);">
          <button onclick="toggleTheme()" class="theme-icon" style="background: none; border: none; cursor: pointer; padding: 8px; border-radius: 8px; display: flex; align-items: center; justify-content: center; transition: var(--transition-smooth); background-color: var(--bg-toggle); border: 1px solid var(--border-toggle); color: var(--color-primary);">
            ${themeButtonIcon}
          </button>
          ${authSectionHtml}
        </div>
      </div>
    </nav>
  `;

  // Highlight active tab
  const activePath = currentPage();
  const homeLink = document.getElementById("link-home");
  const tendersLink = document.getElementById("link-tenders");
  const aboutLink = document.getElementById("link-about");
  const contactLink = document.getElementById("link-contact");

  if (activePath === "index.html" || activePath === "") {
    if (homeLink) homeLink.style.cssText = "color: var(--color-primary); font-weight: 700;";
  } else if (activePath === "tenders.html" || activePath === "tenderDetails.html") {
    if (tendersLink) tendersLink.style.cssText = "color: var(--color-primary); font-weight: 700;";
  } else if (activePath === "about.html") {
    if (aboutLink) aboutLink.style.cssText = "color: var(--color-primary); font-weight: 700;";
  } else if (activePath === "contact.html") {
    if (contactLink) contactLink.style.cssText = "color: var(--color-primary); font-weight: 700;";
  }
}

window.toggleMobileMenu = () => {
  const drawer = document.getElementById("mobile-menu-drawer");
  if (!drawer) return;
  const isHidden = drawer.style.display === "none";
  drawer.style.display = isHidden ? "flex" : "none";
};

function renderFooter() {
  const placeholder = document.getElementById("footer-placeholder");
  if (!placeholder) return;

  placeholder.innerHTML = `
    <footer class="site-footer-dark">
      <div class="container" style="display: grid; grid-template-columns: 2fr 1fr 1fr 1fr; gap: 4rem; padding-bottom: 3rem;" id="footer-grid">
        <!-- About / Brand Column -->
        <div style="display: flex; flex-direction: column; gap: 1.25rem;">
          <div style="display: flex; align-items: center; gap: 12px;">
            <img src="images/logo.jpg" alt="TenderKart Logo" style="height: 42px; width: 42px; border-radius: 8px; object-fit: cover;" />
            <div>
              <h3 style="font-size: 1.2rem; font-weight: 800; color: #38BDF8; letter-spacing: -0.5px;">TenderKart</h3>
              <p style="font-size: 0.65rem; color: #64748B; font-weight: 600; margin-top: -2px;">Urban Infrastructure Opportunities Tracker</p>
            </div>
          </div>
          <p style="font-size: 0.9rem; line-height: 1.6; color: #94A3B8; max-width: 320px;">
            Simplifying urban infrastructure discovery for businesses — smart tracking, dynamic categories, and tender intelligence in one place.
          </p>
        </div>

        <!-- Column 2 (PRODUCT) -->
        <div style="display: flex; flex-direction: column; gap: 1.25rem;">
          <h4 style="font-size: 0.8rem; font-weight: 800; color: #F1F5F9; text-transform: uppercase; letter-spacing: 1px;">Product</h4>
          <ul style="list-style: none; display: flex; flex-direction: column; gap: 12px;">
            <li><a href="tenders.html" class="footer-link">Browse Tenders</a></li>
            <li><a href="tenders.html" class="footer-link">Search &amp; Filter</a></li>
            <li><a href="dashboard.html" class="footer-link">Dashboard</a></li>
          </ul>
        </div>

        <!-- Column 3 (ACCOUNT) -->
        <div style="display: flex; flex-direction: column; gap: 1.25rem;">
          <h4 style="font-size: 0.8rem; font-weight: 800; color: #F1F5F9; text-transform: uppercase; letter-spacing: 1px;">Account</h4>
          <ul style="list-style: none; display: flex; flex-direction: column; gap: 12px;">
            <li><a href="login.html" class="footer-link">Login</a></li>
            <li><a href="register.html" class="footer-link">Register</a></li>
          </ul>
        </div>

        <!-- Column 4 (NAVIGATE) -->
        <div style="display: flex; flex-direction: column; gap: 1.25rem;">
          <h4 style="font-size: 0.8rem; font-weight: 800; color: #F1F5F9; text-transform: uppercase; letter-spacing: 1px;">Navigate</h4>
          <ul style="list-style: none; display: flex; flex-direction: column; gap: 12px;">
            <li><a href="index.html" class="footer-link">← Home</a></li>
            <li><a href="tenders.html" class="footer-link">Browse Tenders</a></li>
            <li><a href="about.html" class="footer-link">About Us</a></li>
            <li><a href="contact.html" class="footer-link">Contact Us</a></li>
          </ul>
        </div>
      </div>

      <!-- Bottom bar copyright and Back to Top link -->
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
  }, 1000);
}

function getDashboardUrlForRole(role) {
  const r = (role || "").toLowerCase();
  if (r === "admin") return "admin.html";
  if (r === "manager") return "manager.html";
  return "dashboard.html";
}

function setupAuthUI() {
  // Strict role-based page authorization gates
  const userJson = localStorage.getItem("user");
  const user = userJson ? JSON.parse(userJson) : null;
  const path = currentPage();
  const roleLower = (user && user.role ? user.role : "").toLowerCase();

  if (path === "dashboard.html") {
    if (!user) {
      window.location.href = "login.html";
      return;
    }
    if (roleLower !== "contractor") {
      window.location.href = getDashboardUrlForRole(roleLower);
      return;
    }
  }

  if (path === "manager.html") {
    if (!user) {
      window.location.href = "login.html";
      return;
    }
    if (roleLower !== "manager") {
      window.location.href = getDashboardUrlForRole(roleLower);
      return;
    }
  }

  if (path === "admin.html") {
    if (!user) {
      window.location.href = "login.html";
      return;
    }
    if (roleLower !== "admin") {
      alert("Access denied. Central Admin authorization is required.");
      window.location.href = getDashboardUrlForRole(roleLower);
      return;
    }
  }

  if ((path === "login.html" || path === "register.html") && user) {
    window.location.href = getDashboardUrlForRole(roleLower);
  }
}

/* ---------------- HOMEPAGE LOGIC ---------------- */
function handleHeroSearch(e) {
  if (e) e.preventDefault();
  const input = document.getElementById("hero-search-query");
  const query = input ? input.value.trim() : "";
  if (query) {
    window.location.href = `tenders.html?search=${encodeURIComponent(query)}`;
  } else {
    window.location.href = `tenders.html`;
  }
}

function initHomepage() {
  // Rotate and render active tender on the hero showcase for every fresh reload
  initHeroShowcase();

  // Render categories list with realistic icons and descriptions
  const categories = [
    { name: 'Roads', icon: '🛣️', count: 3, desc: 'Highway expansions, paving & arterial links', color: '#16A085' },
    { name: 'Bridges', icon: '🌉', count: 3, desc: 'Creek crossings, flyovers & underpasses', color: '#20B2A6' },
    { name: 'Water Supply', icon: '🚰', count: 2, desc: 'Treatment plants & local supply grids', color: '#20B2A6' },
    { name: 'Buildings', icon: '🏢', count: 2, desc: 'Smart IGOC hubs, green expansions & offices', color: '#F4B942' },
    { name: 'Metro Projects', icon: '🚇', count: 1, desc: 'Elevated viaducts, track layouts & stations', color: '#0B6B57' },
    { name: 'Smart City', icon: '🏙️', count: 1, desc: 'Bhopal ICCC, waste sensor systems & fleets', color: '#D99A2B' }
  ];

  // Setup animated counters trigger
  setupStatsScrollTrigger();

  // Fetch live counts from backend to keep categories dynamic
  fetch(`${API_BASE}/tenders`)
    .then(res => {
      if (!res.ok) throw new Error("API error");
      return res.json();
    })
    .then(tenders => {
      // Calculate dynamic counts
      categories.forEach(cat => {
        cat.count = tenders.filter(t => t.category === cat.name).length;
      });
      renderCategoryGrid(categories);
    })
    .catch(err => {
      console.warn("Using fallback counts for category illustration:", err.message);
      renderCategoryGrid(categories);
    });

  // Setup lightweight scroll triggers for Why and How sections
  setupScrollFade();
}

/* ---------------- HERO ACTIVE TENDER ROTATION & INTERACTIVE KEYS ---------------- */
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

function resetHeroAutoRotate() {
  startHeroAutoRotate();
}

function initHeroShowcase() {
  // Retrieve current sequential index from localStorage
  let savedIndex = parseInt(localStorage.getItem("tenderkart_hero_tender_index"), 10);
  if (isNaN(savedIndex) || savedIndex < 0) {
    savedIndex = 0;
  }
  currentHeroTenderIndex = savedIndex % HERO_SHOWCASE_TENDERS.length;

  // Render initial tender for this reload
  renderHeroTenderCard(HERO_SHOWCASE_TENDERS[currentHeroTenderIndex]);

  // Increment index for the NEXT page refresh / reload
  const nextIndex = (currentHeroTenderIndex + 1) % HERO_SHOWCASE_TENDERS.length;
  localStorage.setItem("tenderkart_hero_tender_index", nextIndex.toString());

  // Setup previous and next interactive navigation keys
  const prevBtn = document.getElementById("hero-prev-btn");
  const nextBtn = document.getElementById("hero-next-btn");

  if (prevBtn) {
    prevBtn.onclick = (e) => {
      e.stopPropagation();
      changeHeroTender(-1);
      resetHeroAutoRotate();
    };
  }

  if (nextBtn) {
    nextBtn.onclick = (e) => {
      e.stopPropagation();
      changeHeroTender(1);
      resetHeroAutoRotate();
    };
  }

  // Keyboard navigation support (ArrowLeft / ArrowRight)
  window.addEventListener("keydown", (e) => {
    if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA" || e.target.tagName === "SELECT") return;
    if (e.key === "ArrowLeft") {
      changeHeroTender(-1);
      resetHeroAutoRotate();
    } else if (e.key === "ArrowRight") {
      changeHeroTender(1);
      resetHeroAutoRotate();
    }
  });

  // Start 5-second automatic rotation
  startHeroAutoRotate();

  // Pause on hover for readability, resume when mouse leaves
  const showcaseContainer = document.querySelector(".hero-showcase-container");
  if (showcaseContainer) {
    showcaseContainer.addEventListener("mouseenter", stopHeroAutoRotate);
    showcaseContainer.addEventListener("mouseleave", startHeroAutoRotate);
    showcaseContainer.addEventListener("touchstart", stopHeroAutoRotate, { passive: true });
    showcaseContainer.addEventListener("touchend", () => {
      setTimeout(startHeroAutoRotate, 3000);
    }, { passive: true });
  }
}

function changeHeroTender(direction) {
  const total = HERO_SHOWCASE_TENDERS.length;
  currentHeroTenderIndex = (currentHeroTenderIndex + direction + total) % total;

  // Render selected tender
  const selectedTender = HERO_SHOWCASE_TENDERS[currentHeroTenderIndex];
  renderHeroTenderCard(selectedTender);

  // Update localStorage index for next visit/refresh
  const nextIndex = (currentHeroTenderIndex + 1) % total;
  localStorage.setItem("tenderkart_hero_tender_index", nextIndex.toString());
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

  // Dynamically update matching category visual background with smooth cross-fade
  if (bgImgEl && item.image) {
    bgImgEl.style.opacity = "0.6";
    bgImgEl.style.transform = "scale(0.98)";
    setTimeout(() => {
      bgImgEl.src = item.image;
      bgImgEl.alt = `${item.category} Infrastructure Visual Telemetry`;
      bgImgEl.style.opacity = "1";
      bgImgEl.style.transform = "scale(1)";
    }, 120);
  }

  // Add subtle pop animation on card
  if (cardEl) {
    cardEl.style.transition = "transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1), border-color 0.3s ease";
    cardEl.style.transform = "translateY(-3px)";
    setTimeout(() => {
      cardEl.style.transform = "translateY(0)";
    }, 220);
  }

  catEl.textContent = item.category;
  catEl.className = `badge ${item.badgeClass || 'badge-blue'}`;
  catEl.style.fontSize = "0.68rem";
  catEl.style.padding = "2px 8px";

  titleEl.textContent = item.title;
  deptEl.textContent = item.department;
  valEl.textContent = item.value;
  matchEl.textContent = item.matchScore;

  if (pipeEl && item.pipeline) {
    pipeEl.textContent = item.pipeline;
  }

  // Bind click on card to view tender
  if (cardEl) {
    cardEl.style.cursor = "pointer";
    cardEl.title = `Click to view ${item.title}`;
    cardEl.onclick = () => {
      window.location.href = `tenders.html?category=${encodeURIComponent(item.categoryFilter)}`;
    };

    // Try linking directly to exact tender id if API is accessible
    fetch(`${API_BASE}/tenders`)
      .then(res => res.ok ? res.json() : null)
      .then(dbTenders => {
        if (dbTenders && Array.isArray(dbTenders)) {
          const match = dbTenders.find(t => 
            t.category.toLowerCase() === item.categoryFilter.toLowerCase() ||
            t.name.toLowerCase().includes(item.title.toLowerCase().slice(0, 12))
          );
          if (match && match.id) {
            cardEl.onclick = () => {
              window.location.href = `tenderDetails.html?id=${match.id}`;
            };
          }
        }
      })
      .catch(() => {});
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

  // Reset elements to 0
  counters.forEach(c => {
    const el = document.getElementById(c.id);
    if (el) el.textContent = "0";
  });

  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const startAnimation = () => {
    // Stagger fade-in of cards
    cards.forEach((card, idx) => {
      setTimeout(() => {
        card.classList.add("visible");
      }, idx * 150);
    });

    if (prefersReducedMotion) {
      counters.forEach(c => {
        const el = document.getElementById(c.id);
        if (el) el.textContent = c.target;
      });
      return;
    }

    // Trigger counts count up
    counters.forEach(c => {
      const el = document.getElementById(c.id);
      if (el) {
        animateNumber(el, 0, c.target, 1800);
      }
    });
  };

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        startAnimation();
        observer.unobserve(statsSection);
      }
    });
  }, {
    threshold: 0.35
  });

  observer.observe(statsSection);
}

function setupScrollFade() {
  const targets = document.querySelectorAll(".section-scroll-fade");
  if (targets.length === 0) return;

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const section = entry.target;
        
        // Animate section title, badge, and desc first
        const badge = section.querySelector(".section-badge");
        const title = section.querySelector(".section-title");
        const p = section.querySelector("p");
        
        if (badge) {
          badge.style.opacity = "1";
          badge.style.transform = "translateY(0)";
        }
        if (title) {
          title.style.opacity = "1";
          title.style.transform = "translateY(0)";
        }
        if (p) {
          p.style.opacity = "1";
          p.style.transform = "translateY(0)";
        }

        // Animate cards sequentially/staggered
        const cards = section.querySelectorAll(".why-card, .how-card");
        cards.forEach((card, idx) => {
          setTimeout(() => {
            card.classList.add("visible");
          }, 100 + idx * 120);
        });

        observer.unobserve(section);
      }
    });
  }, {
    threshold: 0.15
  });

  targets.forEach(target => {
    // Initialize start states
    const badge = target.querySelector(".section-badge");
    const title = target.querySelector(".section-title");
    const p = target.querySelector("p");
    
    if (badge) {
      badge.style.opacity = "0";
      badge.style.transform = "translateY(15px)";
      badge.style.transition = "opacity 0.6s ease, transform 0.6s ease";
    }
    if (title) {
      title.style.opacity = "0";
      title.style.transform = "translateY(15px)";
      title.style.transition = "opacity 0.6s ease 0.1s, transform 0.6s ease 0.1s";
    }
    if (p) {
      p.style.opacity = "0";
      p.style.transform = "translateY(15px)";
      p.style.transition = "opacity 0.6s ease 0.2s, transform 0.6s ease 0.2s";
    }

    observer.observe(target);
  });
}

function animateNumber(element, start, end, duration) {
  let startTime = null;

  function step(timestamp) {
    if (!startTime) startTime = timestamp;
    const progress = Math.min((timestamp - startTime) / duration, 1);
    
    // Cubic ease out
    const easeProgress = 1 - Math.pow(1 - progress, 3);
    
    const value = Math.floor(easeProgress * (end - start) + start);
    element.textContent = value;
    
    if (progress < 1) {
      requestAnimationFrame(step);
    } else {
      element.textContent = end;
      // Add visual pop keyframe
      element.classList.add("pop-effect");
    }
  }

  requestAnimationFrame(step);
}

function renderCategoryGrid(categories) {
  const container = document.getElementById("categories-container");
  if (!container) return;

  container.innerHTML = categories.map(cat => `
    <a href="tenders.html?category=${encodeURIComponent(cat.name)}" class="card" style="border-top: 4px solid ${cat.color}; display: flex; flex-direction: column; gap: 12px; height: 100%;">
      <div style="display: flex; justify-content: space-between; align-items: center;">
        <span style="font-size: 1.75rem;">${cat.icon}</span>
        <span class="badge badge-blue" style="background: ${cat.color}15; color: ${cat.color};">${cat.count} Tenders</span>
      </div>
      <h3 style="font-size: 1.2rem; font-weight: 700; color: var(--text-primary);">${cat.name}</h3>
      <p style="font-size: 0.85rem; color: var(--text-secondary); line-height: 1.5;">${cat.desc}</p>
      <div style="display: flex; align-items: center; margin-top: auto; padding-top: 12px; color: var(--color-primary); font-weight: 600; font-size: 0.85rem;">
        <span>Explore category</span>
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-left: 4px;"><path d="m9 18 6-6-6-6"/></svg>
      </div>
    </a>
  `).join("");
}

function animateCounter(elementId, targetValue) {
  const element = document.getElementById(elementId);
  if (!element) return;

  let current = 0;
  const steps = 40;
  const stepVal = Math.ceil(targetValue / steps);
  const interval = setInterval(() => {
    current += stepVal;
    if (current >= targetValue) {
      current = targetValue;
      clearInterval(interval);
    }
    element.textContent = current;
  }, 35);
}

/* ---------------- LOGIN & REGISTER PAGES ---------------- */
function initLoginPage() {
  const form = document.getElementById("login-form");
  const alertBox = document.getElementById("login-status-alert");
  if (!form) return;

  const showLoginAlert = (msg, isPending) => {
    if (!alertBox) return;
    alertBox.style.display = "block";
    if (isPending) {
      alertBox.style.background = "rgba(245, 158, 11, 0.1)";
      alertBox.style.border = "1px solid rgba(245, 158, 11, 0.35)";
      alertBox.style.color = "#D97706";
    } else {
      alertBox.style.background = "rgba(239, 68, 68, 0.08)";
      alertBox.style.border = "1px solid rgba(239, 68, 68, 0.3)";
      alertBox.style.color = "var(--color-danger)";
    }
    alertBox.textContent = msg;
  };

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (alertBox) alertBox.style.display = "none";

    const usernameOrEmail = document.getElementById("usernameOrEmail").value.trim();
    const password = document.getElementById("password").value;

    if (!usernameOrEmail || !password) {
      showToast("Please fill out all fields", "warning");
      return;
    }

    const submitBtn = document.getElementById("login-submit-btn");
    if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = "Signing in..."; }

    try {
      const res = await fetch(`${API_BASE}/users/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ usernameOrEmail, password })
      });

      const data = await res.json();
      if (res.ok) {
        localStorage.setItem("token", data.token);
        localStorage.setItem("user", JSON.stringify(data.user));
        showToast("Login successful!", "success");
        setTimeout(() => {
          window.location.href = getDashboardUrlForRole(data.user.role);
        }, 700);
      } else {
        const isPending = data.code === "PENDING_APPROVAL";
        showLoginAlert(data.message || "Invalid credentials", isPending);
        showToast(data.message || "Invalid credentials", isPending ? "warning" : "error");
      }
    } catch (err) {
      showToast("Backend connection failed", "error");
    } finally {
      if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = "Sign In"; }
    }
  });
}

async function initRegisterPage() {
  const contractorForm = document.getElementById("register-contractor-form");
  const managerForm = document.getElementById("register-manager-form");
  const pendingBanner = document.getElementById("register-pending-banner");
  const pendingMsg = document.getElementById("register-pending-msg");
  const stateSelect = document.getElementById("reg-mgr-state");

  if (!contractorForm || !managerForm) return;

  // Populate Indian States dropdown from API (with fallback)
  const fallbackStates = [
    "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh", "Goa",
    "Gujarat", "Haryana", "Himachal Pradesh", "Jharkhand", "Karnataka", "Kerala",
    "Madhya Pradesh", "Maharashtra", "Manipur", "Meghalaya", "Mizoram", "Nagaland",
    "Odisha", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana", "Tripura",
    "Uttar Pradesh", "Uttarakhand", "West Bengal", "Delhi", "Chandigarh", "Jammu and Kashmir"
  ];
  try {
    const statesRes = await fetch(`${API_BASE}/users/states`);
    const statesData = statesRes.ok ? await statesRes.json() : { states: fallbackStates };
    const statesList = Array.isArray(statesData.states) ? statesData.states : fallbackStates;
    if (stateSelect) {
      stateSelect.innerHTML = `<option value="">Select Assigned Indian State</option>` +
        statesList.map(s => `<option value="${escapeHtml(s)}">${escapeHtml(s)}</option>`).join("");
    }
  } catch (e) {
    if (stateSelect) {
      stateSelect.innerHTML = `<option value="">Select Assigned Indian State</option>` +
        fallbackStates.map(s => `<option value="${escapeHtml(s)}">${escapeHtml(s)}</option>`).join("");
    }
  }

  window.switchRegisterType = (type) => {
    const tabCon = document.getElementById("tab-reg-contractor");
    const tabMgr = document.getElementById("tab-reg-manager");
    if (pendingBanner) pendingBanner.style.display = "none";

    if (type === "manager") {
      contractorForm.style.display = "none";
      managerForm.style.display = "flex";
      if (tabCon) tabCon.classList.remove("active");
      if (tabMgr) tabMgr.classList.add("active");
    } else {
      managerForm.style.display = "none";
      contractorForm.style.display = "flex";
      if (tabMgr) tabMgr.classList.remove("active");
      if (tabCon) tabCon.classList.add("active");
    }
  };

  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get("type") === "manager") {
    switchRegisterType("manager");
  }

  // Contractor registration submit
  contractorForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const company = document.getElementById("reg-con-company").value.trim();
    const name = document.getElementById("reg-con-name").value.trim();
    const email = document.getElementById("reg-con-email").value.trim();
    const username = document.getElementById("reg-con-username").value.trim();
    const password = document.getElementById("reg-con-password").value;
    const confirmPassword = document.getElementById("reg-con-confirm").value;

    if (!company || !name || !email || !username || !password || !confirmPassword) {
      showToast("Please fill in all fields", "warning");
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
    if (btn) { btn.disabled = true; btn.textContent = "Creating account..."; }

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
        }, 800);
      } else {
        showToast(data.message || "Registration failed", "error");
      }
    } catch (err) {
      showToast("Backend connection failed", "error");
    } finally {
      if (btn) { btn.disabled = false; btn.textContent = "Create Contractor Account"; }
    }
  });

  // Manager registration submit
  managerForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const name = document.getElementById("reg-mgr-name").value.trim();
    const email = document.getElementById("reg-mgr-email").value.trim();
    const username = document.getElementById("reg-mgr-username").value.trim();
    const office_state = document.getElementById("reg-mgr-state").value;
    const password = document.getElementById("reg-mgr-password").value;
    const confirmPassword = document.getElementById("reg-mgr-confirm").value;

    if (!name || !email || !username || !office_state || !password || !confirmPassword) {
      showToast("Please complete all manager registration fields", "warning");
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

    const btn = document.getElementById("btn-reg-manager");
    if (btn) { btn.disabled = true; btn.textContent = "Submitting registration..."; }

    try {
      const res = await fetch(`${API_BASE}/users/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accountType: "manager",
          name,
          email,
          username,
          office_state,
          password,
          confirmPassword
        })
      });

      const data = await res.json();
      if (res.ok) {
        managerForm.reset();
        managerForm.style.display = "none";
        if (pendingMsg) {
          pendingMsg.textContent = data.message || `Your Manager registration for ${office_state} has been submitted with Pending Approval status.`;
        }
        if (pendingBanner) pendingBanner.style.display = "flex";
        showToast("Manager registration submitted for Central Admin approval", "success");
      } else {
        showToast(data.message || "Registration failed", "error");
      }
    } catch (err) {
      showToast("Backend connection failed", "error");
    } finally {
      if (btn) { btn.disabled = false; btn.textContent = "Submit Manager Registration"; }
    }
  });
}

/* ---------------- BROWSE TENDERS ---------------- */
let savedTendersGlobalList = [];

async function initTendersPage() {
  const urlParams = new URLSearchParams(window.location.search);
  
  // Set filter inputs if pre-filtered in url query
  if (urlParams.get("category")) {
    const catSelect = document.getElementById("filter-category");
    if (catSelect) catSelect.value = urlParams.get("category");
  }
  if (urlParams.get("state")) {
    const stateSelect = document.getElementById("filter-state");
    if (stateSelect) stateSelect.value = urlParams.get("state");
  }
  if (urlParams.get("search")) {
    const searchInp = document.getElementById("search-input");
    if (searchInp) searchInp.value = urlParams.get("search");
  }
  if (urlParams.get("location")) {
    const locInp = document.getElementById("filter-location");
    if (locInp) locInp.value = urlParams.get("location");
  }

  // Load Saved Bids Ids only for contractor accounts
  const userJson = localStorage.getItem("user");
  const activeUser = userJson ? JSON.parse(userJson) : null;
  if (activeUser && (activeUser.role || "").toLowerCase() === "contractor") {
    try {
      const res = await fetch(`${API_BASE}/saved`, { headers: getAuthHeaders() });
      if (res.ok) {
        const savedData = await res.json();
        savedTendersGlobalList = savedData.map(t => t.id);
      }
    } catch (e) {
      console.warn("Could not retrieve saved tender list", e);
    }
  }

  // Attach search form submit & state select change
  const form = document.getElementById("search-form");
  if (form) {
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      searchAndFilterTenders();
    });
  }
  const stateSelect = document.getElementById("filter-state");
  if (stateSelect) {
    stateSelect.addEventListener("change", () => searchAndFilterTenders());
  }

  // Collapsible Advanced Filters toggle
  const toggleAdv = document.getElementById("toggle-advanced-filters");
  if (toggleAdv) {
    toggleAdv.onclick = () => {
      const panel = document.getElementById("advanced-filters-panel");
      const chevron = document.getElementById("adv-chevron");
      if (panel) {
        const isOpen = panel.style.display === "block";
        panel.style.display = isOpen ? "none" : "block";
        if (chevron) {
          chevron.classList.toggle("open", !isOpen);
        }
      }
    };
  }

  // Reset Filters button
  const resetBtn = document.getElementById("reset-filters");
  if (resetBtn) {
    resetBtn.addEventListener("click", () => {
      if (document.getElementById("filter-state")) document.getElementById("filter-state").value = "";
      if (document.getElementById("filter-location")) document.getElementById("filter-location").value = "";
      if (document.getElementById("search-input")) document.getElementById("search-input").value = "";
      if (document.getElementById("filter-category")) document.getElementById("filter-category").value = "";
      if (document.getElementById("filter-department")) document.getElementById("filter-department").value = "";
      if (document.getElementById("filter-minBudget")) document.getElementById("filter-minBudget").value = "";
      if (document.getElementById("filter-maxBudget")) document.getElementById("filter-maxBudget").value = "";
      if (document.getElementById("filter-deadline")) document.getElementById("filter-deadline").value = "";
      searchAndFilterTenders();
    });
  }

  // Initial Fetch of all opportunities
  await searchAndFilterTenders();
}

window.applyQuickState = (st) => {
  const stateSel = document.getElementById("filter-state");
  if (stateSel) stateSel.value = st;
  searchAndFilterTenders();
};

window.applyQuickLocation = (loc) => {
  const locInp = document.getElementById("filter-location");
  if (locInp) {
    locInp.value = loc;
  }
  searchAndFilterTenders();
};

window.focusLocationInput = () => {
  const inp = document.getElementById("filter-location");
  if (inp) {
    inp.value = "";
    inp.focus();
    inp.scrollIntoView({ behavior: "smooth", block: "center" });
  }
};

window.viewAllTenders = () => {
  if (document.getElementById("filter-state")) document.getElementById("filter-state").value = "";
  if (document.getElementById("filter-location")) document.getElementById("filter-location").value = "";
  if (document.getElementById("search-input")) document.getElementById("search-input").value = "";
  if (document.getElementById("filter-category")) document.getElementById("filter-category").value = "";
  if (document.getElementById("filter-department")) document.getElementById("filter-department").value = "";
  if (document.getElementById("filter-minBudget")) document.getElementById("filter-minBudget").value = "";
  if (document.getElementById("filter-maxBudget")) document.getElementById("filter-maxBudget").value = "";
  if (document.getElementById("filter-deadline")) document.getElementById("filter-deadline").value = "";
  searchAndFilterTenders();
};

async function searchAndFilterTenders() {
  const container = document.getElementById("tenders-container");
  if (!container) return;

  // Render Skeleton cards
  container.innerHTML = Array.from({ length: 6 }).map(() => `
    <div class="skeleton-card skeleton-glow">
      <div style="display: flex; justify-content: space-between;">
        <div class="skeleton-line" style="width: 80px;"></div>
        <div class="skeleton-line" style="width: 24px;"></div>
      </div>
      <div class="skeleton-line" style="width: 80%; height: 20px; margin-top: 8px;"></div>
      <div class="skeleton-line" style="width: 50%; height: 12px;"></div>
      <div class="skeleton-line" style="width: 100%; height: 40px; margin-top: 12px;"></div>
      <div style="display: flex; gap: 8px; margin-top: auto;">
        <div class="skeleton-line" style="flex: 1; height: 32px;"></div>
        <div class="skeleton-line" style="flex: 1; height: 32px;"></div>
      </div>
    </div>
  `).join("");

  const state = document.getElementById("filter-state")?.value || "";
  const search = document.getElementById("search-input")?.value.trim() || "";
  const category = document.getElementById("filter-category")?.value || "";
  const location = document.getElementById("filter-location")?.value.trim() || "";
  const department = document.getElementById("filter-department")?.value.trim() || "";
  const minBudget = document.getElementById("filter-minBudget")?.value || "";
  const maxBudget = document.getElementById("filter-maxBudget")?.value || "";
  const deadline = document.getElementById("filter-deadline")?.value || "";

  const q = new URLSearchParams();
  if (state) q.append("state", state);
  if (search) q.append("search", search);
  if (category) q.append("category", category);
  if (location) q.append("location", location);
  if (department) q.append("department", department);
  if (minBudget) q.append("minBudget", minBudget);
  if (maxBudget) q.append("maxBudget", maxBudget);
  if (deadline) q.append("deadline", deadline);

  try {
    const res = await fetch(`${API_BASE}/tenders?${q.toString()}`);
    const data = await res.json();

    if (!res.ok) {
      showToast("Error loading active bids", "error");
      return;
    }

    const countBox = document.getElementById("results-count");
    const headingBox = document.getElementById("results-heading");

    if (state) {
      if (headingBox) headingBox.textContent = `Tenders in ${state}`;
      if (countBox) countBox.innerHTML = `Found <strong>${data.length}</strong> tenders in ${escapeHtml(state)}`;
    } else if (location) {
      if (headingBox) headingBox.textContent = `Tenders in "${location}"`;
      if (countBox) countBox.innerHTML = `Found <strong>${data.length}</strong> opportunities matching your location search`;
    } else {
      if (headingBox) headingBox.textContent = "Active Infrastructure Opportunities";
      if (countBox) countBox.innerHTML = `Showing <strong>${data.length}</strong> urban tenders across India`;
    }

    if (data.length === 0) {
      container.innerHTML = `
        <div class="card" style="grid-column: 1 / -1; display: flex; flex-direction: column; align-items: center; text-align: center; gap: 16px; padding: 4rem 2rem; border: 2px dashed var(--border-color); border-radius: 16px; background-color: var(--bg-card); margin-top: 1rem;">
          <div style="height: 64px; width: 64px; border-radius: 50%; background-color: rgba(var(--primary-rgb), 0.08); color: var(--color-primary); display: flex; align-items: center; justify-content: center; font-size: 1.75rem;">
            📍
          </div>
          <div style="display: flex; flex-direction: column; gap: 6px; max-width: 540px;">
            <h3 style="font-size: 1.4rem; font-weight: 850; color: var(--text-primary);">No Matching Tenders Found</h3>
            <p style="font-size: 0.95rem; color: var(--text-secondary); line-height: 1.5;">Try selecting another state, clearing filters, or viewing all available tenders.</p>
          </div>
          <div style="display: flex; gap: 12px; margin-top: 8px; flex-wrap: wrap; justify-content: center;">
            <button onclick="viewAllTenders()" class="btn btn-primary" style="display: inline-flex; align-items: center; gap: 8px;">
              <span>View All Tenders</span>
            </button>
          </div>
        </div>
      `;
      return;
    }

    const activeUser = JSON.parse(localStorage.getItem("user") || "null");
    const activeRole = (activeUser && activeUser.role ? activeUser.role : "").toLowerCase();
    const canSave = !activeUser || activeRole === "contractor";

    container.innerHTML = data.map(t => {
      const isSaved = savedTendersGlobalList.includes(t.id);
      const bookmarkIconFill = isSaved ? "currentColor" : "none";
      const bookmarkColor = isSaved ? "var(--color-primary)" : "var(--text-muted)";
      const status = getTenderStatus(t.deadline, t.status);

      return `
        <div class="card" style="display: flex; flex-direction: column; gap: 16px; height: 100%;">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <div style="display: flex; gap: 8px; flex-wrap: wrap;">
              <span class="badge badge-blue">${escapeHtml(t.category)}</span>
              <span class="badge ${status.class}">${escapeHtml(status.label)}</span>
              ${t.state ? `<span class="badge badge-purple">${escapeHtml(t.state)}</span>` : ""}
            </div>
            ${canSave ? `
              <button onclick="toggleSaveTender(${t.id})" style="background: none; border: none; cursor: pointer; padding: 6px; border-radius: 6px; display: flex; align-items: center; justify-content: center; color: ${bookmarkColor}; background-color: ${isSaved ? 'rgba(var(--primary-rgb), 0.08)' : 'transparent'}; border: 1px solid ${isSaved ? 'rgba(var(--primary-rgb), 0.1)' : 'transparent'}; transition: var(--transition-smooth);" title="${isSaved ? 'Saved' : 'Save Tender'}">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="${bookmarkIconFill}" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-bookmark"><path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z"/></svg>
              </button>
            ` : ""}
          </div>

          <div style="display: flex; flex-direction: column; gap: 4px;">
            <h3 style="font-size: 1.15rem; font-weight: 750; color: var(--text-primary); line-height: 1.4; letter-spacing: -0.25px;">${escapeHtml(t.name)}</h3>
            <span style="font-size: 0.75rem; color: var(--text-muted); font-weight: 600; line-height: 1.3;">${escapeHtml(t.department)}</span>
          </div>

          <p style="font-size: 0.85rem; color: var(--text-secondary); line-height: 1.5;">${escapeHtml((t.description || "").substring(0, 130))}...</p>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; border-top: 1px solid var(--border-color); border-bottom: 1px solid var(--border-color); padding: 12px 0; margin-top: auto;">
            <div style="display: flex; align-items: center; gap: 8px;">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" stroke-width="2"><path d="M6 3h12"/><path d="M6 8h12"/><path d="m6 13 8.5 8"/><path d="M6 13h3a6 6 0 0 0 6-6V8a6 6 0 0 0-6-6"/></svg>
              <div>
                <span style="display: block; font-size: 0.65rem; color: var(--text-muted); font-weight: 700;">BUDGET</span>
                <span style="display: block; font-size: 0.85rem; color: var(--text-primary); font-weight: 700;">${formatBudget(t.budget)}</span>
              </div>
            </div>
            <div style="display: flex; align-items: center; gap: 8px;">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" stroke-width="2"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
              <div>
                <span style="display: block; font-size: 0.65rem; color: var(--text-muted); font-weight: 700;">LOCATION</span>
                <span style="display: block; font-size: 0.85rem; color: var(--text-primary); font-weight: 700;" title="${escapeHtml(t.location)}">${escapeHtml(t.location)}</span>
              </div>
            </div>
          </div>

          <div style="display: flex; justify-content: space-between; align-items: center; gap: 12px;">
            <span class="badge ${status.class}" style="display: inline-flex; align-items: center; gap: 4px; text-transform: none; font-size: 0.75rem;">
              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
              <span>${escapeHtml(t.deadline)} (${escapeHtml(status.countdown)})</span>
            </span>
            <a href="tenderDetails.html?id=${t.id}" class="btn btn-outline" style="padding: 8px 14px; font-size: 0.85rem; display: inline-flex; align-items: center; gap: 4px;">
              <span>View Details</span>
              <span>&rarr;</span>
            </a>
          </div>
        </div>
      `;
    }).join("");

  } catch (err) {
    showToast("Server connection error", "error");
  }
}

async function toggleSaveTender(tenderId) {
  const user = localStorage.getItem("user");
  if (!user) {
    showToast("Please login first to bookmark tenders", "warning");
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
        savedTendersGlobalList.push(tenderId);
        showToast("Tender bookmarked successfully", "success");
      } else {
        savedTendersGlobalList = savedTendersGlobalList.filter(id => id !== tenderId);
        showToast("Bookmark removed", "info");
      }
      searchAndFilterTenders();
    }
  } catch (e) {
    showToast("Error updating bookmarks", "error");
  }
}

function formatBudget(value) {
  if (value >= 10000000) {
    return `₹ ${(value / 10000000).toFixed(2)} Cr`;
  }
  return `₹ ${(value / 100000).toFixed(2)} Lakh`;
}

/* ---------------- TENDER DETAILS PAGE ---------------- */
async function initTenderDetailsPage() {
  const urlParams = new URLSearchParams(window.location.search);
  const tenderId = urlParams.get("id");

  if (!tenderId) {
    window.location.href = "tenders.html";
    return;
  }

  try {
    const res = await fetch(`${API_BASE}/tenders/${tenderId}`);
    if (!res.ok) {
      showToast("Tender specs not found", "error");
      setTimeout(() => { window.location.href = "tenders.html"; }, 1500);
      return;
    }

    const t = await res.json();

    // Renders data directly to elements
    document.getElementById("tender-name").textContent = t.name;
    document.getElementById("tender-dept").textContent = t.department;
    
    // Render Category, State, and Status badges
    const status = getTenderStatus(t.deadline, t.status);
    const catBox = document.getElementById("tender-category");
    if (catBox) {
      catBox.outerHTML = `
        <div style="display: flex; gap: 8px; flex-wrap: wrap;" id="tender-category-container">
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
    document.getElementById("tender-eligibility").textContent = t.eligibility;

    const inqBtn = document.getElementById("details-inquiry-btn");
    if (inqBtn) {
      inqBtn.href = `contact.html?tenderId=${t.id}`;
    }

    // Set official portal source link
    const sourceBtn = document.getElementById("tender-source-btn");
    if (sourceBtn && t.source_url) {
      sourceBtn.href = t.source_url;
      sourceBtn.title = `Open Official Source: ${t.source_url}`;
    }

    // Renders required documents
    const docGrid = document.getElementById("tender-docs-grid");
    if (docGrid) {
      docGrid.innerHTML = t.required_documents.map(doc => `
        <div style="display: flex; align-items: start; gap: 10px; padding: 12px; background-color: var(--bg-secondary); border-radius: 8px; border: 1px solid var(--border-color);">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#10B981" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink: 0; margin-top: 3px;" class="lucide lucide-check-circle"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><path d="m9 11 3 3L22 4"/></svg>
          <span style="font-size: 0.85rem; font-weight: 500; color: var(--text-primary);">${doc}</span>
        </div>
      `).join("");
    }

    currentTenderDetails = t;

    // Checking saved status to show bookmark button state
    checkSaveButtonState(tenderId);

    // Checking tracking / applied status
    checkTrackButtonState(tenderId);

  } catch (err) {
    showToast("Error connecting to server", "error");
  }
}

let currentTenderDetails = null;

async function checkTrackButtonState(tenderId) {
  const btn = document.getElementById("details-track-btn");
  const saveBtn = document.getElementById("details-save-btn");
  const inqBtn = document.getElementById("details-inquiry-btn");
  if (!btn) return;
  const userJson = localStorage.getItem("user");
  if (!userJson) return;
  const user = JSON.parse(userJson);
  const role = (user.role || "").toLowerCase();
  if (role === "manager" || role === "admin") {
    btn.style.display = "none";
    if (saveBtn) saveBtn.style.display = "none";
    if (inqBtn) inqBtn.style.display = "none";
    return;
  }

  try {
    const res = await fetch(`${API_BASE}/applications/my`, { headers: getAuthHeaders() });
    if (res.ok) {
      const data = await res.json();
      const existing = (data.applications || []).find(a => a.tender_id === parseInt(tenderId));
      if (existing) {
        btn.innerHTML = `
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><path d="m9 11 3 3L22 4"/></svg>
          <span>Tracked (${existing.application_status})</span>
        `;
        btn.className = "btn btn-outline";
        btn.style.borderColor = "var(--color-primary)";
        btn.style.color = "var(--color-primary)";
        btn.title = "View this application in your Contractor Dashboard";
        btn.onclick = () => {
          window.location.href = "dashboard.html";
        };
      }
    }
  } catch (e) {
    console.warn("Could not check application status", e);
  }
}

window.openTrackAppModal = () => {
  const userJson = localStorage.getItem("user");
  if (!userJson) {
    showToast("Please login as a contractor to track tender applications", "warning");
    setTimeout(() => { window.location.href = "login.html"; }, 1500);
    return;
  }

  const modal = document.getElementById("track-app-modal");
  if (!modal || !currentTenderDetails) return;

  const titleEl = document.getElementById("modal-tender-title");
  if (titleEl) titleEl.textContent = currentTenderDetails.name;

  const budgetRefEl = document.getElementById("modal-tender-budget-ref");
  if (budgetRefEl) budgetRefEl.textContent = `Estimated Budget Outlay: ${formatBudget(currentTenderDetails.budget)}`;

  const dateInp = document.getElementById("track-applied-date");
  if (dateInp) dateInp.value = new Date().toISOString().split("T")[0];

  modal.style.display = "block";
};

window.closeTrackAppModal = () => {
  const modal = document.getElementById("track-app-modal");
  if (modal) modal.style.display = "none";
};

window.handleTrackAppSubmit = async (e) => {
  e.preventDefault();
  if (!currentTenderDetails) return;

  const bidAmount = document.getElementById("track-bid-amount")?.value;
  const appliedOn = document.getElementById("track-applied-date")?.value;
  const proposalNotes = document.getElementById("track-proposal-notes")?.value;

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
        bid_amount: bidAmount,
        applied_on: appliedOn,
        proposal_notes: proposalNotes
      })
    });

    const data = await res.json();
    if (res.ok) {
      showToast("Application recorded successfully!", "success");
      closeTrackAppModal();
      setTimeout(() => {
        window.location.href = "dashboard.html";
      }, 1000);
    } else {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = "Record Application";
      }
      showToast(data.message || "Could not record application", "error");
    }
  } catch (err) {
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.textContent = "Record Application";
    }
    showToast("Server error recording application", "error");
  }
};

async function checkSaveButtonState(tenderId) {
  const btn = document.getElementById("details-save-btn");
  if (!btn) return;

  const user = localStorage.getItem("user");
  if (!user) return;

  try {
    const res = await fetch(`${API_BASE}/saved`, { headers: getAuthHeaders() });
    if (res.ok) {
      const data = await res.json();
      const isSaved = data.some(t => t.id === parseInt(tenderId));

      btn.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="${isSaved ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z"/></svg>
        <span>${isSaved ? 'Saved' : 'Save Tender'}</span>
      `;
      btn.style.color = isSaved ? 'var(--color-primary)' : 'var(--text-secondary)';
      btn.style.backgroundColor = isSaved ? 'rgba(var(--primary-rgb), 0.1)' : 'var(--bg-secondary)';
      btn.style.borderColor = isSaved ? 'var(--color-primary)' : 'var(--border-color)';
      
      // On click toggle
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
  } catch (e) {
    console.warn(e);
  }
}

async function generateAISummary() {
  const urlParams = new URLSearchParams(window.location.search);
  const tenderId = urlParams.get("id");
  const panel = document.getElementById("summary-panel");
  
  if (!panel || !tenderId) return;

  panel.style.display = "block";
  panel.innerHTML = `
    <div style="display: flex; flex-direction: column; align-items: center; gap: 16px; padding: 40px 20px; text-align: center; color: var(--text-secondary); font-size: 0.9rem;">
      <svg class="animate-spin text-primary" viewBox="0 0 24 24" fill="none" width="32" height="32" style="animation: spin 1s linear infinite;">
        <circle cx="12" cy="12" r="10" stroke="var(--border-color)" stroke-width="4" />
        <path d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" fill="currentColor" />
      </svg>
      <p>AI is reading and parsing tender details...</p>
    </div>
  `;

  try {
    const res = await fetch(`${API_BASE}/tenders/${tenderId}/summarize`, {
      method: "POST"
    });
    
    if (!res.ok) {
      showToast("Failed to parse summary", "error");
      panel.style.display = "none";
      return;
    }

    const data = await res.json();
    
    panel.innerHTML = `
      <div style="display: flex; flex-direction: column; gap: 16px;">
        <div style="display: flex; align-items: center; gap: 8px;">
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--color-primary)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m12 3-1.912 5.886L4.202 9l5.886 1.912L12 16.798l1.912-5.886L19.798 9l-5.886-1.912Z"/></svg>
          <h3 style="font-size: 1.1rem; font-weight: 800; color: var(--text-primary);">AI Analysis Output</h3>
        </div>
        <hr style="border: none; border-top: 1px solid var(--border-color);" />
        
        <div style="display: flex; flex-direction: column; gap: 4px;">
          <span style="font-size: 0.75rem; font-weight: 700; color: var(--text-muted); text-transform: uppercase;">Financial Scale</span>
          <span style="font-size: 0.9rem; color: var(--text-primary); font-weight: 600;">${data.budget}</span>
        </div>

        <div style="display: flex; flex-direction: column; gap: 4px;">
          <span style="font-size: 0.75rem; font-weight: 700; color: var(--text-muted); text-transform: uppercase;">Bidding Threshold</span>
          <span style="font-size: 0.9rem; color: var(--text-primary); font-weight: 600;">${data.deadline}</span>
        </div>

        <div style="display: flex; flex-direction: column; gap: 4px;">
          <span style="font-size: 0.75rem; font-weight: 700; color: var(--text-muted); text-transform: uppercase;">Core Qualification</span>
          <span style="font-size: 0.9rem; color: var(--text-primary); font-weight: 600;">${data.eligibility}</span>
        </div>

        <div style="display: flex; flex-direction: column; gap: 4px;">
          <span style="font-size: 0.75rem; font-weight: 700; color: var(--text-muted); text-transform: uppercase;">Must-Have Documents</span>
          <ul style="padding-left: 20px; display: flex; flex-direction: column; gap: 6px;">
            ${data.requiredDocuments.map(doc => `<li style="font-size: 0.85rem; color: var(--text-secondary); line-height: 1.4;">${doc}</li>`).join("")}
          </ul>
        </div>

        <div style="display: flex; flex-direction: column; gap: 4px;">
          <span style="font-size: 0.75rem; font-weight: 700; color: var(--text-muted); text-transform: uppercase;">Work Scope Summary</span>
          <ul style="padding-left: 20px; display: flex; flex-direction: column; gap: 6px;">
            ${data.summaryPoints.map(pt => `<li style="font-size: 0.85rem; color: var(--text-secondary); line-height: 1.4;">${pt}</li>`).join("")}
          </ul>
        </div>

        <span style="font-size: 0.7rem; color: var(--text-muted); text-align: right; font-style: italic;">Generated using: ${data.method}</span>
      </div>
    `;

    showToast("Easy summary loaded!", "success");

  } catch (e) {
    showToast("Summary API failed", "error");
    panel.style.display = "none";
  }
}

/* ---------------- CONTRACTOR DASHBOARD ---------------- */
let currentAnalysisAppId = null;

async function initDashboardPage() {
  const userJson = localStorage.getItem("user");
  const user = JSON.parse(userJson);

  const displayName = user.name || user.username;
  const subText = user.company ? `${user.company} • ${user.email}` : `${user.email} • Contractor Workspace`;

  const nameEl = document.getElementById("profile-name");
  if (nameEl) nameEl.textContent = displayName;

  const emailEl = document.getElementById("profile-email");
  if (emailEl) emailEl.textContent = subText;

  const codeEl = document.getElementById("profile-code");
  if (codeEl) codeEl.textContent = user.user_code || "CON1001";

  // Tabs navigation (Applications, Saved, Notifications, Helpdesk)
  window.switchTab = (tabName) => {
    const tabs = ["applications", "saved", "notifications", "helpdesk"];
    tabs.forEach(t => {
      const panel = document.getElementById(`tab-${t}`);
      const btn = document.getElementById(`btn-${t}`);
      if (panel) panel.style.display = "none";
      if (btn) {
        btn.style.backgroundColor = "transparent";
        btn.style.color = "var(--text-secondary)";
        btn.classList.remove("active");
      }
    });

    const activePanel = document.getElementById(`tab-${tabName}`);
    const activeBtn = document.getElementById(`btn-${tabName}`);
    if (activePanel) activePanel.style.display = "block";
    if (activeBtn) {
      activeBtn.style.backgroundColor = "var(--color-primary)";
      activeBtn.style.color = "#FFFFFF";
      activeBtn.classList.add("active");
    }

    if (tabName === "helpdesk") {
      fetchContractorHelpdesk();
    }
  };

  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get("tab") === "helpdesk" || window.location.hash === "#helpdesk") {
    switchTab("helpdesk");
  } else {
    switchTab("applications");
  }
  await fetchDashboardData();
}

async function fetchDashboardData() {
  const headers = getAuthHeaders();

  try {
    // 1. Fetch Contractor Applications Overview
    const appsRes = await fetch(`${API_BASE}/applications/my`, { headers });
    if (appsRes.ok) {
      const appsData = await appsRes.json();
      renderContractorApplications(appsData);
    } else {
      console.warn("Could not fetch contractor applications");
    }

    // 2. Fetch Saved Tenders
    const savedRes = await fetch(`${API_BASE}/saved`, { headers });
    if (savedRes.ok) {
      const savedTenders = await savedRes.json();
      
      const savedCountEl = document.getElementById("saved-count");
      if (savedCountEl) savedCountEl.textContent = savedTenders.length;
      
      const listContainer = document.getElementById("saved-list");
      if (listContainer) {
        if (savedTenders.length === 0) {
          listContainer.innerHTML = `
            <div style="display: flex; flex-direction: column; align-items: center; text-align: center; padding: 4rem 1.5rem; gap: 12px; background-color: var(--bg-secondary); border-radius: 12px; border: 1px dashed var(--border-color);">
              <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z"/></svg>
              <p>You haven't bookmarked any opportunities yet.</p>
            </div>
          `;
        } else {
          listContainer.innerHTML = savedTenders.map(t => {
            const status = getTenderStatus(t.deadline);
            return `
              <div style="display: flex; justify-content: space-between; align-items: center; padding: 16px 20px; background-color: var(--bg-secondary); border-radius: 12px; border: 1px solid var(--border-color); gap: 16px; flex-wrap: wrap;">
                <div style="display: flex; flex-direction: column; gap: 6px; flex: 1;">
                  <div style="display: flex; gap: 8px; flex-wrap: wrap;">
                    <span class="badge badge-blue" style="width: fit-content;">${t.category}</span>
                    <span class="badge ${status.class}" style="width: fit-content;">${status.label}</span>
                  </div>
                  <h4 style="font-size: 1.05rem; font-weight: 700; color: var(--text-primary);">${t.name}</h4>
                  <div style="display: flex; gap: 16px; flex-wrap: wrap;">
                    <span style="display: flex; align-items: center; gap: 4px; font-size: 0.8rem; color: var(--text-muted);"><svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 3h12"/><path d="M6 8h12"/><path d="m6 13 8.5 8"/><path d="M6 13h3a6 6 0 0 0 6-6V8a6 6 0 0 0-6-6"/></svg> ${formatBudget(t.budget)}</span>
                    <span style="display: flex; align-items: center; gap: 4px; font-size: 0.8rem; color: var(--text-muted);"><svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg> Deadline: ${t.deadline}</span>
                  </div>
                </div>
                <div style="display: flex; align-items: center; gap: 12px;">
                  <a href="tenderDetails.html?id=${t.id}" class="btn btn-outline" style="font-size: 0.8rem; padding: 6px 12px; display: inline-flex; align-items: center; gap: 4px;">
                    <span>View Details</span>
                    <span>&rarr;</span>
                  </a>
                  <button onclick="handleDashboardUnsave(${t.id})" style="background: none; border: none; cursor: pointer; padding: 8px; border-radius: 6px; color: var(--color-danger); background-color: rgba(239, 68, 68, 0.05); border: 1px solid rgba(239, 68, 68, 0.1); transition: var(--transition-smooth);" title="Delete"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg></button>
                </div>
              </div>
            `;
          }).join("");
        }
      }
    }

    // 3. Fetch Notifications
    const notifRes = await fetch(`${API_BASE}/users/notifications`, { headers });
    if (notifRes.ok) {
      const notifications = await notifRes.json();
      const unread = notifications.filter(n => !n.read).length;
      const notifCountEl = document.getElementById("notif-count");
      if (notifCountEl) notifCountEl.textContent = unread;
      
      const notifContainer = document.getElementById("notifications-list");
      if (notifContainer) {
        if (notifications.length === 0) {
          notifContainer.innerHTML = `
            <div style="display: flex; flex-direction: column; align-items: center; text-align: center; padding: 4rem 1.5rem; gap: 12px; background-color: var(--bg-secondary); border-radius: 12px; border: 1px dashed var(--border-color);">
              <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" stroke-width="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
              <p>You have no notifications yet.</p>
            </div>
          `;
        } else {
          notifContainer.innerHTML = notifications.map(n => {
            const titleWeight = n.read ? "600" : "850";
            const unreadTag = n.read ? "" : `<span style="font-size: 0.65rem; font-weight: 700; color: #FFFFFF; background-color: var(--color-primary); padding: 2px 6px; border-radius: 4px; text-transform: uppercase;">New</span>`;
            return `
              <div onclick="handleReadNotification(${n.id}, ${n.read})" style="display: flex; justify-content: space-between; align-items: flex-start; padding: 16px 20px; background-color: ${n.read ? 'var(--bg-secondary)' : 'rgba(var(--primary-rgb), 0.02)'}; border-radius: 12px; border: 1px solid ${n.read ? 'var(--border-color)' : 'rgba(var(--primary-rgb), 0.15)'}; transition: var(--transition-smooth); cursor: ${n.read ? 'default' : 'pointer'};">
                <div style="display: flex; gap: 12px; align-items: flex-start;">
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="${n.read ? 'var(--text-muted)' : 'var(--color-primary)'}" stroke-width="2" style="margin-top: 2px; flex-shrink: 0;"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><path d="m9 11 3 3L22 4"/></svg>
                  <div>
                    <h4 style="font-size: 0.95rem; font-weight: ${titleWeight}; color: var(--text-primary);">${n.title}</h4>
                    <p style="font-size: 0.85rem; color: var(--text-secondary); margin-top: 4px; line-height: 1.45;">${n.message}</p>
                    <span style="display: block; font-size: 0.7rem; color: var(--text-muted); margin-top: 8px;">Date: ${n.created_at}</span>
                  </div>
                </div>
                ${unreadTag}
              </div>
            `;
          }).join("");
        }
      }
    }

    // 4. Fetch Helpdesk Tickets Summary for Badge
    const helpdeskRes = await fetch(`${API_BASE}/inquiries/mine`, { headers });
    if (helpdeskRes.ok) {
      const helpdeskData = await helpdeskRes.json();
      const helpdeskBadge = document.getElementById("helpdesk-count");
      if (helpdeskBadge) {
        helpdeskBadge.textContent = helpdeskData.summary.totalTickets;
      }
    }

  } catch (err) {
    showToast("Error updating workspace data", "error");
  }
}

let currentContractorTicketId = null;

async function fetchContractorHelpdesk() {
  const headers = getAuthHeaders();
  try {
    const res = await fetch(`${API_BASE}/inquiries/mine`, { headers });
    if (!res.ok) {
      showToast("Could not load helpdesk tickets", "error");
      return;
    }
    const data = await res.json();
    renderContractorHelpdesk(data);
  } catch (err) {
    showToast("Network error fetching helpdesk tickets", "error");
  }
}

function renderContractorHelpdesk(data) {
  const summary = data.summary || { totalTickets: 0, pending: 0, inProgress: 0, resolved: 0 };
  const tickets = data.tickets || [];

  const totalEl = document.getElementById("stat-helpdesk-total");
  const awaitingEl = document.getElementById("stat-helpdesk-awaiting");
  const repliedEl = document.getElementById("stat-helpdesk-replied");
  const resolvedEl = document.getElementById("stat-helpdesk-resolved");
  const badgeEl = document.getElementById("helpdesk-count");

  if (totalEl) totalEl.textContent = summary.totalTickets || 0;
  if (awaitingEl) awaitingEl.textContent = summary.pending ?? summary.awaitingAdmin ?? 0;
  if (repliedEl) repliedEl.textContent = summary.inProgress ?? summary.adminReplied ?? 0;
  if (resolvedEl) resolvedEl.textContent = summary.resolved || 0;
  if (badgeEl) badgeEl.textContent = summary.totalTickets || 0;

  const tbody = document.getElementById("helpdesk-tickets-tbody");
  const emptyState = document.getElementById("helpdesk-empty-state");

  if (!tbody) return;

  if (tickets.length === 0) {
    tbody.innerHTML = "";
    if (emptyState) emptyState.style.display = "flex";
    return;
  }

  if (emptyState) emptyState.style.display = "none";

  tbody.innerHTML = tickets.map(t => {
    const statusLower = (t.status || "").toLowerCase();
    let statusBadgeClass = "badge-orange";
    let statusLabel = t.status || "Pending";
    if (statusLower === "resolved") {
      statusBadgeClass = "badge-green";
    } else if (statusLower === "in progress" || statusLower === "awaiting user response") {
      statusBadgeClass = "badge-blue";
      statusLabel = statusLower === "awaiting user response" ? "In Progress" : t.status;
    }

    const tenderInfo = t.related_tender_id
      ? `<span style="font-weight: 600; color: var(--color-primary);" title="${escapeHtml(t.tender_name || '')}">${escapeHtml(t.tender_name ? t.tender_name.slice(0, 38) + '...' : ('TND-' + t.related_tender_id))}</span>`
      : `<span style="color: var(--text-muted); font-size: 0.8rem;">General</span>`;

    const stateLabel = t.state || t.tender_state || "--";
    const assigneeLabel = t.assigned_manager_name
      ? `<strong>${escapeHtml(stateLabel)}</strong><div style="font-size:0.74rem; color: var(--text-muted);">${escapeHtml(t.assigned_manager_name)}</div>`
      : `<strong>${escapeHtml(stateLabel)}</strong><div style="font-size:0.74rem; color: #D97706;">${escapeHtml(t.assignment_status || 'Pending Admin Assignment')}</div>`;

    const lastActivity = t.last_activity_at
      ? new Date(t.last_activity_at).toLocaleDateString()
      : (t.created_at ? new Date(t.created_at).toLocaleDateString() : "--");

    const submittedDate = t.created_at ? new Date(t.created_at).toLocaleDateString() : "--";

    return `
      <tr>
        <td style="font-weight: 700; color: var(--color-primary);">${escapeHtml(t.ticket_number)}</td>
        <td>${tenderInfo}</td>
        <td>${assigneeLabel}</td>
        <td><span class="badge badge-secondary" style="font-size: 0.72rem;">${escapeHtml(t.inquiry_category)}</span></td>
        <td style="color: var(--text-secondary); font-size: 0.8rem;">${submittedDate}</td>
        <td><span class="badge ${statusBadgeClass}" style="font-size: 0.75rem;">${escapeHtml(statusLabel)}</span></td>
        <td style="color: var(--text-muted); font-size: 0.8rem;">${lastActivity}</td>
        <td style="text-align: right;">
          <button onclick="openContractorTicketModal(${t.id})" class="btn btn-outline" style="font-size: 0.78rem; padding: 4px 12px;">
            View Thread
          </button>
        </td>
      </tr>
    `;
  }).join("");
}

window.openContractorTicketModal = async (id) => {
  currentContractorTicketId = id;
  const headers = getAuthHeaders();
  try {
    const res = await fetch(`${API_BASE}/inquiries/${id}`, { headers });
    if (!res.ok) {
      showToast("Could not open inquiry details", "error");
      return;
    }
    const data = await res.json();
    const t = data.ticket;
    const messages = data.messages || [];

    document.getElementById("cmodal-ticket-number").textContent = t.ticket_number;
    document.getElementById("cmodal-ticket-subject").textContent = t.subject;
    const routingDesc = t.assigned_manager_name
      ? `Routed to ${t.assigned_manager_name} (${t.state} Manager)`
      : (t.assignment_status || "Pending Admin Assignment");
    document.getElementById("cmodal-ticket-meta").textContent = `Category: ${t.inquiry_category} • ${routingDesc} • Submitted on ${t.created_at}`;

    const statusBadge = document.getElementById("cmodal-ticket-status-badge");
    statusBadge.textContent = t.status;
    const statusLower = (t.status || "").toLowerCase();
    statusBadge.className = "badge " + (statusLower === "resolved" ? "badge-green" : (statusLower === "in progress" || statusLower === "awaiting user response" ? "badge-blue" : "badge-orange"));

    const prioBadge = document.getElementById("cmodal-ticket-priority-badge");
    if (prioBadge) {
      prioBadge.textContent = t.state || "India";
      prioBadge.className = "badge badge-purple";
    }

    const tenderInfoBox = document.getElementById("cmodal-tender-info");
    if (t.related_tender_id && t.tender_name) {
      tenderInfoBox.style.display = "block";
      document.getElementById("cmodal-tender-name").textContent = `${t.tender_name} (${t.tender_category || ''})`;
    } else {
      tenderInfoBox.style.display = "none";
    }

    const adminAlert = document.getElementById("cmodal-admin-alert");
    const hasOfficialReply = messages.some(m => ["manager", "admin"].includes((m.sender_role || "").toLowerCase()));
    if (adminAlert) {
      adminAlert.style.display = hasOfficialReply ? "flex" : "none";
      const alertText = document.getElementById("cmodal-admin-alert-text");
      if (alertText && hasOfficialReply) {
        alertText.innerHTML = t.assigned_manager_name
          ? `<strong>Manager Response Received:</strong> ${escapeHtml(t.assigned_manager_name)} (${escapeHtml(t.state)} Manager) responded to your inquiry.`
          : `<strong>Response Received:</strong> Central Admin posted an update on your inquiry.`;
      }
    }

    const replyBox = document.getElementById("cmodal-reply-box");
    const resolvedBox = document.getElementById("cmodal-resolved-box");
    if (statusLower === "resolved") {
      replyBox.style.display = "none";
      resolvedBox.style.display = "flex";
    } else {
      replyBox.style.display = "flex";
      resolvedBox.style.display = "none";
    }

    const thread = document.getElementById("cmodal-conversation-thread");
    thread.innerHTML = messages.map(m => {
      const roleL = (m.sender_role || "").toLowerCase();
      const isOfficial = roleL === "admin" || roleL === "manager";
      const align = isOfficial ? "flex-start" : "flex-end";
      const bg = isOfficial ? "rgba(37, 99, 235, 0.05)" : "var(--bg-secondary)";
      const border = isOfficial ? "1px solid rgba(37, 99, 235, 0.25)" : "1px solid var(--border-color)";
      const senderLabel = roleL === "admin"
        ? "TenderKart Central Admin"
        : (roleL === "manager" ? `${m.sender_name_cached || "State Manager"} (${m.sender_office_state || t.state || "State"} Manager)` : (m.sender_name_cached || "You"));
      const badgeRole = roleL === "admin"
        ? `<span class="badge badge-orange" style="font-size: 0.65rem;">Central Admin</span>`
        : (roleL === "manager"
          ? `<span class="badge badge-purple" style="font-size: 0.65rem;">State Manager</span>`
          : `<span class="badge badge-blue" style="font-size: 0.65rem;">Contractor</span>`);

      return `
        <div style="display: flex; flex-direction: column; align-items: ${align}; width: 100%;">
          <div style="max-width: 85%; background: ${bg}; border: ${border}; border-radius: 14px; padding: 12px 16px; display: flex; flex-direction: column; gap: 6px;">
            <div style="display: flex; justify-content: space-between; align-items: center; gap: 10px; font-size: 0.76rem; color: var(--text-muted); border-bottom: 1px solid var(--border-color); padding-bottom: 4px;">
              <div style="display: flex; align-items: center; gap: 6px;">
                <strong style="color: var(--text-primary); font-size: 0.82rem;">${escapeHtml(senderLabel)}</strong>
                ${badgeRole}
              </div>
              <span>${escapeHtml(m.created_at || '')}</span>
            </div>
            <p style="font-size: 0.88rem; color: var(--text-primary); margin: 0; line-height: 1.5; white-space: pre-wrap;">${escapeHtml(m.message_body)}</p>
          </div>
        </div>
      `;
    }).join("");

    document.getElementById("contractor-ticket-modal").style.display = "block";
    thread.scrollTop = thread.scrollHeight;
  } catch (err) {
    showToast("Error opening inquiry modal", "error");
  }
};

window.closeContractorTicketModal = () => {
  const modal = document.getElementById("contractor-ticket-modal");
  if (modal) modal.style.display = "none";
  currentContractorTicketId = null;
};

window.submitContractorReply = async () => {
  if (!currentContractorTicketId) return;
  const input = document.getElementById("cmodal-reply-input");
  const body = input ? input.value.trim() : "";
  if (!body) {
    showToast("Please enter a reply message", "warning");
    return;
  }

  const btn = document.getElementById("cmodal-send-btn");
  if (btn) { btn.disabled = true; btn.textContent = "Sending..."; }

  try {
    const res = await fetch(`${API_BASE}/inquiries/${currentContractorTicketId}/messages`, {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify({ message_body: body })
    });

    if (res.ok) {
      if (input) input.value = "";
      showToast("Follow-up reply sent", "success");
      await openContractorTicketModal(currentContractorTicketId);
      await fetchContractorHelpdesk();
    } else {
      const err = await res.json();
      showToast(err.message || "Could not send reply", "error");
    }
  } catch (e) {
    showToast("Network error sending reply", "error");
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = "Send Reply"; }
  }
};

window.reopenCurrentTicket = async () => {
  if (!currentContractorTicketId) return;
  try {
    const res = await fetch(`${API_BASE}/inquiries/${currentContractorTicketId}/reopen`, {
      method: "PATCH",
      headers: getAuthHeaders()
    });

    if (res.ok) {
      showToast("Ticket has been reopened", "success");
      await openContractorTicketModal(currentContractorTicketId);
      await fetchContractorHelpdesk();
    } else {
      showToast("Could not reopen ticket", "error");
    }
  } catch (e) {
    showToast("Network error reopening ticket", "error");
  }
};

function renderContractorApplications(data) {
  // 1. Update 5 Summary Cards
  const totalAppsEl = document.getElementById("stat-total-apps");
  if (totalAppsEl) totalAppsEl.textContent = data.totalApplications;

  const wonAppsEl = document.getElementById("stat-won-apps");
  if (wonAppsEl) wonAppsEl.textContent = data.won;

  const notAwardedAppsEl = document.getElementById("stat-notawarded-apps");
  if (notAwardedAppsEl) notAwardedAppsEl.textContent = data.notAwarded;

  const pendingAppsEl = document.getElementById("stat-pending-apps");
  if (pendingAppsEl) pendingAppsEl.textContent = data.pending;

  const withdrawnAppsEl = document.getElementById("stat-withdrawn-apps");
  if (withdrawnAppsEl) withdrawnAppsEl.textContent = data.withdrawn;

  const appsCountBadge = document.getElementById("apps-count");
  if (appsCountBadge) appsCountBadge.textContent = data.totalApplications;

  // 2. Overall Contractor Performance Summary & Win Rate Bar
  const perfContainer = document.getElementById("performance-summary-container");
  if (perfContainer) {
    const decidedCount = data.decidedApplications || (data.won + data.notAwarded);
    let winRateHtml = "";

    if (data.winRate !== null) {
      winRateHtml = `
        <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px;">
          <div style="display: flex; align-items: center; gap: 12px;">
            <div style="height: 48px; width: 48px; border-radius: 12px; background: rgba(16, 185, 129, 0.12); color: var(--color-success); display: flex; align-items: center; justify-content: center; font-size: 1.35rem; font-weight: 800;">
              🏆
            </div>
            <div>
              <div style="display: flex; align-items: center; gap: 8px;">
                <span style="font-size: 1.35rem; font-weight: 850; color: var(--text-primary);">${data.winRate}%</span>
                <span class="badge badge-green" style="font-size: 0.72rem;">Decided Win Rate</span>
              </div>
              <p style="font-size: 0.78rem; color: var(--text-muted); margin-top: 2px;">
                ${data.won} Won out of ${decidedCount} decided applications (${data.notAwarded} not awarded). Pending &amp; withdrawn excluded.
              </p>
            </div>
          </div>
          <div style="display: flex; align-items: center; gap: 6px; font-size: 0.75rem; color: var(--text-muted); background: var(--bg-card); padding: 6px 12px; border-radius: 8px; border: 1px solid var(--border-color);">
            <span>Formula:</span>
            <code>Wins ÷ (Wins + Not Awarded) × 100</code>
          </div>
        </div>
      `;
    } else {
      winRateHtml = `
        <div style="display: flex; align-items: center; gap: 10px; color: var(--text-secondary); font-size: 0.85rem;">
          <span style="font-size: 1.2rem;">ℹ️</span>
          <span><strong>Not enough completed outcomes to calculate win rate.</strong> Pending and withdrawn applications are excluded from the win-rate calculation.</span>
        </div>
      `;
    }

    // Category breakdown
    let catHtml = "";
    if (data.categories && data.categories.length > 0) {
      catHtml = `
        <div style="border-top: 1px solid var(--border-color); padding-top: 10px; margin-top: 4px; display: flex; flex-direction: column; gap: 6px;">
          <span style="font-size: 0.72rem; font-weight: 700; color: var(--text-muted); text-transform: uppercase;">Performance by Category</span>
          <div style="display: flex; gap: 8px; flex-wrap: wrap;">
            ${data.categories.map(c => `
              <div style="display: inline-flex; align-items: center; gap: 6px; background-color: var(--bg-card); border: 1px solid var(--border-color); padding: 4px 10px; border-radius: 8px; font-size: 0.78rem;">
                <span style="font-weight: 700; color: var(--text-primary);">${c.category}:</span>
                <span style="color: var(--color-success); font-weight: 600;">${c.won} won</span>
                <span style="color: var(--text-muted);">/ ${c.total} bids</span>
              </div>
            `).join("")}
          </div>
        </div>
      `;
    }

    perfContainer.innerHTML = winRateHtml + catHtml;
  }

  // 3. Application History Table & Empty State
  const tableWrapper = document.getElementById("apps-table-wrapper");
  const emptyState = document.getElementById("applications-empty-state");
  const tbody = document.getElementById("applications-table-body");

  if (!data.applications || data.applications.length === 0) {
    if (tableWrapper) tableWrapper.style.display = "none";
    if (emptyState) emptyState.style.display = "flex";
  } else {
    if (tableWrapper) tableWrapper.style.display = "block";
    if (emptyState) emptyState.style.display = "none";

    if (tbody) {
      tbody.innerHTML = data.applications.map(app => {
        // Status Badge formatting
        let statusBadge = "";
        const statusUpper = (app.application_status || "").toUpperCase();
        if (statusUpper === "WON") {
          statusBadge = `<span class="badge badge-green">Won</span>`;
        } else if (statusUpper === "NOT AWARDED") {
          statusBadge = `<span class="badge" style="background-color: rgba(239, 68, 68, 0.1); color: var(--color-danger); border: 1px solid rgba(239, 68, 68, 0.2);">Not Awarded</span>`;
        } else if (statusUpper === "UNDER REVIEW") {
          statusBadge = `<span class="badge badge-blue">Under Review</span>`;
        } else if (statusUpper === "WITHDRAWN") {
          statusBadge = `<span class="badge" style="background-color: var(--bg-secondary); color: var(--text-muted); border: 1px solid var(--border-color);">Withdrawn</span>`;
        } else {
          statusBadge = `<span class="badge badge-blue">Submitted</span>`;
        }

        const bidDisplay = app.bid_amount ? formatBudget(app.bid_amount) : '<span style="color: var(--text-muted);">Not Recorded</span>';
        const isWithdrawable = (app.application_status === "Submitted" || app.application_status === "Under Review") && app.outcome === "Pending";

        return `
          <tr style="border-bottom: 1px solid var(--border-color);">
            <td style="padding: 14px 16px; font-weight: 700; color: var(--text-primary); font-family: monospace; font-size: 0.82rem;">
              ${app.application_code || ("APP-" + app.id)}
            </td>
            <td style="padding: 14px 16px;">
              <a href="tenderDetails.html?id=${app.tender_id}" style="color: var(--text-primary); font-weight: 700; text-decoration: none; hover: underline;" class="hover-primary">
                ${app.tender_name}
              </a>
              <div style="font-size: 0.75rem; color: var(--text-muted); margin-top: 2px;">
                ${app.tender_category} • ${app.tender_department || ""}
              </div>
            </td>
            <td style="padding: 14px 16px; font-size: 0.82rem; color: var(--text-secondary);">
              ${app.tender_location || "N/A"}
            </td>
            <td style="padding: 14px 16px; font-size: 0.82rem; color: var(--text-secondary); white-space: nowrap;">
              ${app.applied_on}
            </td>
            <td style="padding: 14px 16px; font-weight: 700; color: var(--text-primary); white-space: nowrap;">
              ${bidDisplay}
            </td>
            <td style="padding: 14px 16px; white-space: nowrap;">
              ${statusBadge}
            </td>
            <td style="padding: 14px 16px; white-space: nowrap;">
              <div style="display: flex; gap: 8px; align-items: center;">
                <button type="button" onclick="openAnalysisModal(${app.id})" class="btn btn-primary" style="font-size: 0.75rem; padding: 5px 11px; display: inline-flex; align-items: center; gap: 4px;">
                  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M3 3v18h18"/><path d="m19 9-5 5-4-4-3 3"/></svg>
                  <span>View Analysis</span>
                </button>
                <a href="tenderDetails.html?id=${app.tender_id}" class="btn btn-outline" style="font-size: 0.75rem; padding: 5px 9px;">
                  Details
                </a>
                ${isWithdrawable ? `
                  <button type="button" onclick="withdrawApplication(${app.id})" class="btn btn-outline" style="font-size: 0.72rem; padding: 5px 8px; color: var(--color-danger); border-color: rgba(239, 68, 68, 0.2);" title="Withdraw this application">
                    Withdraw
                  </button>
                ` : ""}
              </div>
            </td>
          </tr>
        `;
      }).join("");
    }
  }
}

/* ---------------- TENDER PERFORMANCE INSIGHTS MODAL ---------------- */
window.openAnalysisModal = async (appId) => {
  currentAnalysisAppId = appId;
  const modal = document.getElementById("analysis-modal");
  if (!modal) return;

  const summarySection = document.getElementById("analysis-summary-section");
  const findingsList = document.getElementById("analysis-findings-list");
  const subtitleEl = document.getElementById("analysis-modal-subtitle");
  
  if (subtitleEl) subtitleEl.textContent = `Analyzing Application #${appId}...`;
  if (summarySection) {
    summarySection.innerHTML = `
      <div style="padding: 20px; text-align: center; color: var(--text-muted); font-size: 0.88rem;">
        Loading tender evaluation record...
      </div>
    `;
  }
  if (findingsList) findingsList.innerHTML = "";

  modal.style.display = "block";

  try {
    const res = await fetch(`${API_BASE}/applications/${appId}`, { headers: getAuthHeaders() });
    if (!res.ok) {
      showToast("Could not load application analysis", "error");
      modal.style.display = "none";
      return;
    }

    const data = await res.json();
    const app = data.application;
    const analysis = data.analysis;

    if (subtitleEl) {
      subtitleEl.textContent = `${app.application_code || ("APP-" + app.id)} • Submitted ${app.applied_on}`;
    }

    // Render Section A: Application Summary
    let outcomeBadge = "";
    if (app.outcome === "Won") {
      outcomeBadge = `<span class="badge badge-green">Won (Awarded)</span>`;
    } else if (app.outcome === "Not Awarded") {
      outcomeBadge = `<span class="badge" style="background-color: rgba(239, 68, 68, 0.1); color: var(--color-danger); border: 1px solid rgba(239, 68, 68, 0.2);">Not Awarded</span>`;
    } else if (app.outcome === "Withdrawn") {
      outcomeBadge = `<span class="badge" style="background-color: var(--bg-secondary); color: var(--text-muted); border: 1px solid var(--border-color);">Withdrawn</span>`;
    } else {
      outcomeBadge = `<span class="badge badge-blue">Pending Review</span>`;
    }

    const missingDocsText = app.missing_documents && app.missing_documents.length > 0
      ? `<span style="color: var(--color-danger); font-weight: 600;">${app.missing_documents.join(", ")}</span>`
      : `<span style="color: var(--color-success); font-weight: 600;">None recorded (Full compliance packet submitted)</span>`;

    const rawNotes = app.evaluation_notes || app.feedback_notes;
    const feedbackText = rawNotes
      ? `<p style="font-size: 0.86rem; color: var(--text-primary); line-height: 1.5; background: var(--bg-card); padding: 10px 12px; border-radius: 8px; border: 1px solid var(--border-color); margin-top: 4px;">${escapeHtml(rawNotes)}</p>`
      : `<p style="font-size: 0.82rem; color: var(--text-muted); font-style: italic; margin-top: 4px;">No evaluator notes recorded yet.</p>`;

    if (summarySection) {
      summarySection.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 8px;">
          <div>
            <span class="badge badge-blue" style="font-size: 0.72rem;">${app.tender_category}</span>
            <h4 style="font-size: 1.15rem; font-weight: 850; color: var(--text-primary); margin-top: 4px;">${app.tender_name}</h4>
            <span style="font-size: 0.8rem; color: var(--text-muted);">${app.tender_department} • ${app.tender_location}</span>
          </div>
          <div>
            ${outcomeBadge}
          </div>
        </div>

        <div class="grid-3" style="gap: 12px; margin-top: 8px; background-color: var(--bg-card); padding: 12px 14px; border-radius: 10px; border: 1px solid var(--border-color);">
          <div>
            <span style="font-size: 0.7rem; font-weight: 700; color: var(--text-muted); text-transform: uppercase; display: block;">Your Recorded Bid</span>
            <strong style="font-size: 0.95rem; color: var(--text-primary);">${app.bid_amount ? formatBudget(app.bid_amount) : "Not recorded"}</strong>
          </div>
          <div>
            <span style="font-size: 0.7rem; font-weight: 700; color: var(--text-muted); text-transform: uppercase; display: block;">Tender Outlay Budget</span>
            <strong style="font-size: 0.95rem; color: var(--text-primary);">${formatBudget(app.tender_budget)}</strong>
          </div>
          <div>
            <span style="font-size: 0.7rem; font-weight: 700; color: var(--text-muted); text-transform: uppercase; display: block;">Current Review Status</span>
            <strong style="font-size: 0.95rem; color: var(--color-primary);">${app.application_status}</strong>
          </div>
        </div>

        <div style="display: flex; flex-direction: column; gap: 4px; margin-top: 6px;">
          <span style="font-size: 0.72rem; font-weight: 700; color: var(--text-muted); text-transform: uppercase;">Recorded Compliance Deficiencies / Missing Documents</span>
          <div style="font-size: 0.85rem;">${missingDocsText}</div>
        </div>

        <div style="display: flex; flex-direction: column; gap: 4px; margin-top: 4px;">
          <span style="font-size: 0.72rem; font-weight: 700; color: var(--text-muted); text-transform: uppercase;">Official Evaluation Feedback</span>
          ${feedbackText}
        </div>
      `;
    }

    // Render Section B: Factual Findings
    if (findingsList) {
      if (!analysis.findings || analysis.findings.length === 0) {
        findingsList.innerHTML = `
          <div style="padding: 1.5rem; text-align: center; background-color: var(--bg-secondary); border-radius: 10px; border: 1px solid var(--border-color); color: var(--text-muted); font-size: 0.88rem;">
            <span>ℹ️ Not enough information to identify the reason for this outcome.</span>
          </div>
        `;
      } else {
        findingsList.innerHTML = analysis.findings.map(f => {
          let typeColor = "var(--color-primary)";
          let typeBg = "rgba(var(--primary-rgb), 0.08)";
          let typeIcon = "📌";

          if (f.type === "documentation") {
            typeColor = "var(--color-danger)";
            typeBg = "rgba(239, 68, 68, 0.08)";
            typeIcon = "📄";
          } else if (f.type === "financial") {
            typeColor = "var(--color-warning)";
            typeBg = "rgba(245, 158, 11, 0.08)";
            typeIcon = "💰";
          } else if (f.type === "feedback") {
            typeColor = "var(--color-success)";
            typeBg = "rgba(16, 185, 129, 0.08)";
            typeIcon = "📝";
          }

          return `
            <div style="border-radius: 12px; border: 1px solid var(--border-color); background: var(--bg-card); padding: 14px 16px; display: flex; flex-direction: column; gap: 8px;">
              <div style="display: flex; align-items: center; gap: 8px;">
                <span style="font-size: 1.1rem;">${typeIcon}</span>
                <span style="font-size: 0.75rem; font-weight: 700; color: ${typeColor}; background: ${typeBg}; padding: 2px 8px; border-radius: 6px; text-transform: uppercase;">
                  ${f.type} observation
                </span>
              </div>
              <div style="font-size: 0.88rem; color: var(--text-primary); line-height: 1.45;">
                <strong>Observation:</strong> ${f.observation}
              </div>
              <div style="font-size: 0.82rem; color: var(--text-secondary); line-height: 1.45; background: var(--bg-secondary); padding: 8px 12px; border-radius: 8px; border-left: 3px solid ${typeColor};">
                <strong>Why it matters:</strong> ${f.why_it_matters}
              </div>
              <div style="font-size: 0.82rem; color: var(--text-primary); line-height: 1.45;">
                <strong>Recommended action:</strong> ${f.recommended_action}
              </div>
            </div>
          `;
        }).join("");
      }
    }

    // Load persisted checklist state
    loadChecklistState(appId);

  } catch (err) {
    showToast("Error loading insights analysis", "error");
    modal.style.display = "none";
  }
};

window.closeAnalysisModal = () => {
  const modal = document.getElementById("analysis-modal");
  if (modal) modal.style.display = "none";
};

// Checklist Persistence helpers
function loadChecklistState(appId) {
  const savedGlobal = localStorage.getItem("tenderkart_bid_checklist");
  const savedApp = appId ? localStorage.getItem(`tenderkart_checklist_${appId}`) : null;
  const raw = savedApp || savedGlobal;

  const msgEl = document.getElementById("checklist-saved-msg");
  if (msgEl) msgEl.style.display = "none";

  if (!raw) {
    for (let i = 1; i <= 7; i++) {
      const el = document.getElementById(`chk-${i}`);
      if (el) el.checked = false;
    }
    return;
  }

  try {
    const states = JSON.parse(raw);
    for (let i = 1; i <= 7; i++) {
      const el = document.getElementById(`chk-${i}`);
      if (el) el.checked = !!states[`chk-${i}`];
    }
  } catch (e) {
    console.warn(e);
  }
}

window.persistChecklistState = () => {
  const states = {};
  for (let i = 1; i <= 7; i++) {
    const el = document.getElementById(`chk-${i}`);
    if (el) states[`chk-${i}`] = el.checked;
  }
  const str = JSON.stringify(states);
  localStorage.setItem("tenderkart_bid_checklist", str);
  if (currentAnalysisAppId) {
    localStorage.setItem(`tenderkart_checklist_${currentAnalysisAppId}`, str);
  }
};

window.saveChecklistProgress = () => {
  persistChecklistState();
  const msgEl = document.getElementById("checklist-saved-msg");
  if (msgEl) msgEl.style.display = "block";
  showToast("Checklist progress saved for your next tender preparation!", "success");
};

window.withdrawApplication = async (appId) => {
  if (!window.confirm("Are you sure you want to withdraw this tender application? This will record the application as Withdrawn.")) {
    return;
  }

  try {
    const res = await fetch(`${API_BASE}/applications/${appId}/withdraw`, {
      method: "PUT",
      headers: getAuthHeaders()
    });

    if (res.ok) {
      const data = await res.json();
      showToast(data.message || "Application withdrawn successfully", "info");
      await fetchDashboardData();
    } else {
      const err = await res.json();
      showToast(err.message || "Could not withdraw application", "error");
    }
  } catch (e) {
    showToast("Server error during application withdrawal", "error");
  }
};

async function handleDashboardUnsave(tenderId) {
  try {
    const res = await fetch(`${API_BASE}/saved/${tenderId}/save`, {
      method: "POST",
      headers: getAuthHeaders()
    });
    if (res.ok) {
      showToast("Opportunity removed", "info");
      fetchDashboardData();
    }
  } catch (e) {
    showToast("Error removing saved tender", "error");
  }
}

async function handleReadNotification(id, readStatus) {
  if (readStatus) return; // already read
  try {
    const res = await fetch(`${API_BASE}/users/notifications/${id}/read`, {
      method: "PUT",
      headers: getAuthHeaders()
    });
    if (res.ok) {
      fetchDashboardData();
    }
  } catch (e) {
    console.warn(e);
  }
}

/* ---------------- CENTRAL ADMIN WORKSPACE (NATIONWIDE SUPERVISION) ---------------- */
let adminTendersList = [];
let adminApplicationsList = [];
let adminManagersList = [];
let currentAdminTicketId = null;

async function initAdminPage() {
  window.switchAdminTab = (tabName) => {
    const tabs = ["stats", "managers", "tenders", "apps", "users", "helpdesk"];
    tabs.forEach(t => {
      const panel = document.getElementById(`admin-tab-${t}`);
      const btn = document.getElementById(`btn-admin-${t}`);
      if (panel) panel.style.display = "none";
      if (btn) {
        btn.style.backgroundColor = "transparent";
        btn.style.color = "var(--text-secondary)";
      }
    });

    const activePanel = document.getElementById(`admin-tab-${tabName}`);
    const activeBtn = document.getElementById(`btn-admin-${tabName}`);
    if (activePanel) activePanel.style.display = "flex";
    if (activeBtn) {
      activeBtn.style.backgroundColor = "var(--color-primary)";
      activeBtn.style.color = "#FFFFFF";
    }

    if (tabName === "helpdesk") {
      fetchAdminHelpdeskQueue();
    } else if (tabName === "managers") {
      fetchAdminManagers();
    } else if (tabName === "apps") {
      fetchAdminApplications();
    }
  };

  // Wire filter listeners for Nationwide Inquiries
  const filterSearch = document.getElementById("filter-inquiry-search");
  const filterState = document.getElementById("filter-inquiry-state");
  const filterStatus = document.getElementById("filter-inquiry-status");
  const filterAssign = document.getElementById("filter-inquiry-assignment");

  let debounceTimer;
  if (filterSearch) {
    filterSearch.addEventListener("input", () => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => fetchAdminHelpdeskQueue(), 300);
    });
  }
  if (filterState) filterState.addEventListener("change", () => fetchAdminHelpdeskQueue());
  if (filterStatus) filterStatus.addEventListener("change", () => fetchAdminHelpdeskQueue());
  if (filterAssign) filterAssign.addEventListener("change", () => fetchAdminHelpdeskQueue());

  const urlParams = new URLSearchParams(window.location.search);
  const targetTab = urlParams.get("tab");
  if (["managers", "tenders", "apps", "users", "helpdesk"].includes(targetTab)) {
    switchAdminTab(targetTab);
  } else {
    switchAdminTab("stats");
  }
  await fetchAdminWorkspace();
}

async function fetchAdminWorkspace() {
  const headers = getAuthHeaders();
  try {
    // 1. Fetch Real Nationwide Analytics
    const statsRes = await fetch(`${API_BASE}/admin/stats`, { headers });
    if (statsRes.ok) {
      const stats = await statsRes.json();

      document.getElementById("stat-box-tenders").textContent = stats.tendersCount ?? 0;
      document.getElementById("stat-box-budget").textContent = `Outlay: ${formatBudget(stats.totalBudget || 0)}`;
      document.getElementById("stat-box-contractors").textContent = stats.contractorsCount ?? 0;
      document.getElementById("stat-box-saves").textContent = `${stats.savedCount ?? 0} Saved Tenders`;
      document.getElementById("stat-box-managers").textContent = stats.approvedManagersCount ?? 0;
      document.getElementById("stat-box-pending-mgrs").textContent = `${stats.pendingManagersCount ?? 0} Pending Approval`;
      document.getElementById("stat-box-views").textContent = stats.totalViews ?? 0;
      document.getElementById("stat-box-apps-total").textContent = `${stats.applicationsSummary?.total ?? 0} Applications`;

      const pendingMgrBadge = document.getElementById("admin-pending-mgr-badge");
      if (pendingMgrBadge) pendingMgrBadge.textContent = stats.pendingManagersCount ?? 0;
      const tendersBadge = document.getElementById("admin-tenders-badge");
      if (tendersBadge) tendersBadge.textContent = stats.tendersCount ?? 0;

      // Application Outcomes Strip
      const appOutcomesEl = document.getElementById("analytics-app-outcomes");
      if (appOutcomesEl && stats.applicationsSummary) {
        const as = stats.applicationsSummary;
        appOutcomesEl.innerHTML = `
          <div style="padding:10px; background:var(--bg-secondary); border-radius:10px;">
            <div style="font-size:1.35rem; font-weight:850;">${as.total}</div>
            <div style="font-size:0.7rem; color:var(--text-muted); font-weight:700;">TOTAL</div>
          </div>
          <div style="padding:10px; background:rgba(16,185,129,0.08); border-radius:10px;">
            <div style="font-size:1.35rem; font-weight:850; color:var(--color-success);">${as.won}</div>
            <div style="font-size:0.7rem; color:var(--color-success); font-weight:700;">WON</div>
          </div>
          <div style="padding:10px; background:rgba(37,99,235,0.08); border-radius:10px;">
            <div style="font-size:1.35rem; font-weight:850; color:var(--color-primary);">${as.pending}</div>
            <div style="font-size:0.7rem; color:var(--color-primary); font-weight:700;">IN REVIEW</div>
          </div>
          <div style="padding:10px; background:rgba(239,68,68,0.08); border-radius:10px;">
            <div style="font-size:1.35rem; font-weight:850; color:var(--color-danger);">${as.notAwarded}</div>
            <div style="font-size:0.7rem; color:var(--color-danger); font-weight:700;">NOT AWARDED</div>
          </div>
        `;
      }

      // Nationwide Inquiries Summary Strip
      const inqSumEl = document.getElementById("analytics-inquiry-summary");
      if (inqSumEl && stats.inquiriesSummary) {
        const is = stats.inquiriesSummary;
        inqSumEl.innerHTML = `
          <div style="padding:10px; background:var(--bg-secondary); border-radius:10px;">
            <div style="font-size:1.35rem; font-weight:850;">${is.total}</div>
            <div style="font-size:0.7rem; color:var(--text-muted); font-weight:700;">TOTAL</div>
          </div>
          <div style="padding:10px; background:rgba(245,158,11,0.08); border-radius:10px;">
            <div style="font-size:1.35rem; font-weight:850; color:#D97706;">${is.pending}</div>
            <div style="font-size:0.7rem; color:#D97706; font-weight:700;">PENDING</div>
          </div>
          <div style="padding:10px; background:rgba(37,99,235,0.08); border-radius:10px;">
            <div style="font-size:1.35rem; font-weight:850; color:var(--color-primary);">${is.inProgress}</div>
            <div style="font-size:0.7rem; color:var(--color-primary); font-weight:700;">IN PROGRESS</div>
          </div>
          <div style="padding:10px; background:rgba(16,185,129,0.08); border-radius:10px;">
            <div style="font-size:1.35rem; font-weight:850; color:var(--color-success);">${is.resolved}</div>
            <div style="font-size:0.7rem; color:var(--color-success); font-weight:700;">RESOLVED</div>
          </div>
        `;
      }

      // 6-Category Distribution
      const allocContainer = document.getElementById("analytics-allocations");
      if (allocContainer) {
        allocContainer.innerHTML = (stats.categoryStats || []).map(cat => {
          const pct = Math.min(((cat.count / (stats.tendersCount || 12)) * 100), 100).toFixed(0);
          return `
            <div style="display: flex; flex-direction: column; gap: 6px;">
              <div style="display: flex; justify-content: space-between; font-size: 0.84rem; gap: 8px; flex-wrap: wrap;">
                <span style="font-weight: 700; color: var(--text-primary);">${escapeHtml(cat.category)} (${cat.count} tenders)</span>
                <span style="color: var(--text-secondary); font-weight: 600;">${formatBudget(cat.budget)} • ${cat.applications_count} apps • ${cat.views} views</span>
              </div>
              <div style="height: 6px; width: 100%; background-color: var(--bg-secondary); border-radius: 99px; overflow: hidden;">
                <div style="height: 100%; width: ${pct}%; background-color: var(--color-primary); border-radius: 99px;"></div>
              </div>
            </div>
          `;
        }).join("");
      }

      // Recent Platform Activity Log
      const logsContainer = document.getElementById("analytics-logs");
      if (logsContainer) {
        if (!stats.recentActivity || stats.recentActivity.length === 0) {
          logsContainer.innerHTML = `<p style="font-size:0.85rem; color:var(--text-muted);">No recorded activity yet.</p>`;
        } else {
          logsContainer.innerHTML = stats.recentActivity.map(act => `
            <div style="display: flex; gap: 10px; align-items: start;">
              <div style="height: 8px; width: 8px; border-radius: 50%; background-color: var(--color-primary); margin-top: 6px; flex-shrink: 0;"></div>
              <div>
                <p style="font-size: 0.84rem; color: var(--text-primary); line-height: 1.4; margin: 0; font-weight: 550;">
                  ${escapeHtml(act.details || act.action_type)}
                </p>
                <span style="font-size: 0.72rem; color: var(--text-muted);">
                  ${escapeHtml(act.actor_name || act.actor_role || "System")} ${act.state ? `• ${escapeHtml(act.state)}` : ""} • ${escapeHtml(act.created_at || "")}
                </span>
              </div>
            </div>
          `).join("");
        }
      }

      // State-Wise Distribution & Contractor Activity Table
      const stateTbody = document.getElementById("analytics-state-table");
      if (stateTbody) {
        stateTbody.innerHTML = (stats.stateStats || []).map(st => `
          <tr>
            <td><strong>${escapeHtml(st.state || "Unspecified")}</strong></td>
            <td><span class="badge badge-blue">${st.tender_count}</span></td>
            <td style="font-weight: 600;">${formatBudget(st.total_budget)}</td>
            <td>${st.total_views}</td>
            <td>${st.saved_count}</td>
            <td>${st.applications_count} (${st.active_contractors} contractors)</td>
            <td>${st.inquiries_count} (${st.resolved_inquiries_count} resolved)</td>
            <td>${st.approved_manager ? `<span class="badge badge-green">${escapeHtml(st.approved_manager)}</span>` : `<span class="badge badge-orange">Unassigned State</span>`}</td>
          </tr>
        `).join("");
      }

      // Manager-Wise Performance Table
      const mgrPerfTbody = document.getElementById("analytics-manager-perf-table");
      if (mgrPerfTbody) {
        mgrPerfTbody.innerHTML = (stats.managerPerformance || []).map(m => {
          const statusBadge = m.approval_status === "Pending"
            ? `<span class="badge badge-orange">Pending</span>`
            : (m.approval_status === "Rejected"
              ? `<span class="badge badge-red">Rejected</span>`
              : (m.is_active ? `<span class="badge badge-green">Active</span>` : `<span class="badge badge-muted">Inactive</span>`));
          return `
            <tr>
              <td>
                <strong>${escapeHtml(m.name || m.username)}</strong>
                <div style="font-size:0.74rem; color:var(--text-muted);">${escapeHtml(m.user_code || m.username)}</div>
              </td>
              <td><span class="badge badge-blue">${escapeHtml(m.office_state || "--")}</span></td>
              <td>${statusBadge}</td>
              <td>${m.state_tenders_count}</td>
              <td><strong>${m.tender_updates_count}</strong></td>
              <td><strong>${m.inquiry_responses_count}</strong></td>
              <td>${m.assigned_inquiries_count} / ${m.resolved_inquiries_count}</td>
              <td>${m.evaluated_applications_count}</td>
            </tr>
          `;
        }).join("");
      }
    }

    // 2. Fetch Tenders, Managers, Applications, Users, Inquiries
    await Promise.all([
      fetchAdminTenders(),
      fetchAdminManagers(),
      fetchAdminApplications(),
      fetchAdminUsers(),
      fetchAdminHelpdeskQueue()
    ]);

  } catch (err) {
    showToast("Error loading Central Admin workspace", "error");
  }
}

async function fetchAdminTenders() {
  const headers = getAuthHeaders();
  const res = await fetch(`${API_BASE}/admin/tenders`, { headers });
  if (!res.ok) return;
  adminTendersList = await res.json();

  // Populate state filter dropdowns on Admin page
  const uniqueStates = [...new Set(adminTendersList.map(t => t.state).filter(Boolean))].sort();
  const tenderStateSel = document.getElementById("admin-tenders-state-filter");
  if (tenderStateSel) {
    const prev = tenderStateSel.value;
    tenderStateSel.innerHTML = `<option value="">All States</option>` +
      uniqueStates.map(s => `<option value="${escapeHtml(s)}">${escapeHtml(s)}</option>`).join("");
    tenderStateSel.value = prev;
  }
  const inqStateSel = document.getElementById("filter-inquiry-state");
  if (inqStateSel) {
    const prev = inqStateSel.value;
    inqStateSel.innerHTML = `<option value="">All States</option>` +
      uniqueStates.map(s => `<option value="${escapeHtml(s)}">${escapeHtml(s)}</option>`).join("");
    inqStateSel.value = prev;
  }

  renderAdminTendersTable();
}

window.renderAdminTendersTable = () => {
  const tableBody = document.getElementById("admin-tenders-table");
  if (!tableBody) return;
  const stateFilter = document.getElementById("admin-tenders-state-filter")?.value || "";
  const filtered = stateFilter
    ? adminTendersList.filter(t => (t.state || "").toLowerCase() === stateFilter.toLowerCase())
    : adminTendersList;

  tableBody.innerHTML = filtered.map(t => {
    const st = getTenderStatus(t.deadline, t.status);
    return `
      <tr>
        <td>
          <a href="tenderDetails.html?id=${t.id}" style="font-weight:700; color:var(--text-primary);">${escapeHtml(t.name)}</a>
          <div style="font-size:0.74rem; color:var(--text-muted);">${escapeHtml(t.department)}</div>
        </td>
        <td><span class="badge badge-purple">${escapeHtml(t.state || "--")}</span></td>
        <td><span class="badge badge-blue">${escapeHtml(t.category)}</span></td>
        <td style="font-weight:700;">${formatBudget(t.budget)}</td>
        <td style="white-space:nowrap;">${escapeHtml(t.deadline)}</td>
        <td><span class="badge ${st.class}">${escapeHtml(st.label)}</span></td>
        <td style="font-size:0.8rem; color:var(--text-secondary);">
          ${t.views_count || 0} views • ${t.saved_count || 0} saves • ${t.applications_count || 0} apps
        </td>
      </tr>
    `;
  }).join("");
};

async function fetchAdminManagers() {
  const headers = getAuthHeaders();
  const res = await fetch(`${API_BASE}/admin/managers`, { headers });
  if (!res.ok) return;
  adminManagersList = await res.json();

  const pendingCount = adminManagersList.filter(m => m.approval_status === "Pending").length;
  const pendingBadge = document.getElementById("admin-pending-mgr-badge");
  if (pendingBadge) pendingBadge.textContent = pendingCount;

  const tbody = document.getElementById("admin-managers-table");
  if (!tbody) return;

  tbody.innerHTML = adminManagersList.map(m => {
    const approvalBadge = m.approval_status === "Approved"
      ? `<span class="badge badge-green">Approved</span>`
      : (m.approval_status === "Rejected"
        ? `<span class="badge badge-red">Rejected</span>`
        : `<span class="badge badge-orange">Pending Approval</span>`);

    const activeBadge = m.is_active
      ? `<span class="badge badge-green">Active</span>`
      : `<span class="badge badge-muted">Deactivated</span>`;

    let actionBtns = "";
    if (m.approval_status === "Pending") {
      actionBtns = `
        <button onclick="approveManagerAccount(${m.id})" class="btn btn-primary" style="font-size:0.75rem; padding:5px 12px;">Approve</button>
        <button onclick="rejectManagerAccount(${m.id})" class="btn btn-outline" style="font-size:0.75rem; padding:5px 12px; color:var(--color-danger); border-color:rgba(239,68,68,0.35);">Reject</button>
      `;
    } else if (m.approval_status === "Approved") {
      actionBtns = m.is_active
        ? `<button onclick="toggleManagerActiveStatus(${m.id}, false)" class="btn btn-outline" style="font-size:0.75rem; padding:5px 12px; color:var(--color-danger); border-color:rgba(239,68,68,0.35);">Deactivate</button>`
        : `<button onclick="toggleManagerActiveStatus(${m.id}, true)" class="btn btn-primary" style="font-size:0.75rem; padding:5px 12px;">Activate</button>`;
    } else {
      actionBtns = `<button onclick="approveManagerAccount(${m.id})" class="btn btn-outline" style="font-size:0.75rem; padding:5px 12px;">Re-Approve</button>`;
    }

    return `
      <tr>
        <td style="font-weight:700;">${escapeHtml(m.user_code || m.username)}</td>
        <td>
          <strong>${escapeHtml(m.name || m.username)}</strong>
          <div style="font-size:0.74rem; color:var(--text-muted);">${escapeHtml(m.email)}</div>
        </td>
        <td><span class="badge badge-blue">${escapeHtml(m.office_state || "--")}</span></td>
        <td>${approvalBadge}</td>
        <td>${activeBadge}</td>
        <td><strong>${m.tender_updates_count || 0}</strong></td>
        <td><strong>${m.inquiry_responses_count || 0}</strong></td>
        <td style="text-align:right; white-space:nowrap;">
          <div style="display:inline-flex; gap:6px;">${actionBtns}</div>
        </td>
      </tr>
    `;
  }).join("");
}

window.approveManagerAccount = async (managerId) => {
  try {
    const res = await fetch(`${API_BASE}/admin/managers/${managerId}/approve`, {
      method: "PATCH",
      headers: getAuthHeaders()
    });
    const data = await res.json();
    if (res.ok) {
      showToast(data.message || "Manager approved", "success");
      await fetchAdminWorkspace();
    } else {
      showToast(data.message || "Failed to approve manager", "error");
    }
  } catch (e) {
    showToast("Error approving manager", "error");
  }
};

window.rejectManagerAccount = async (managerId) => {
  if (!window.confirm("Reject this manager registration?")) return;
  try {
    const res = await fetch(`${API_BASE}/admin/managers/${managerId}/reject`, {
      method: "PATCH",
      headers: getAuthHeaders()
    });
    const data = await res.json();
    if (res.ok) {
      showToast(data.message || "Manager rejected", "info");
      await fetchAdminWorkspace();
    } else {
      showToast(data.message || "Failed to reject manager", "error");
    }
  } catch (e) {
    showToast("Error rejecting manager", "error");
  }
};

window.toggleManagerActiveStatus = async (managerId, nextActive) => {
  try {
    const res = await fetch(`${API_BASE}/admin/managers/${managerId}/status`, {
      method: "PATCH",
      headers: getAuthHeaders(),
      body: JSON.stringify({ is_active: nextActive })
    });
    const data = await res.json();
    if (res.ok) {
      showToast(data.message || "Manager status updated", "success");
      await fetchAdminWorkspace();
    } else {
      showToast(data.message || "Failed to update manager status", "error");
    }
  } catch (e) {
    showToast("Error updating manager status", "error");
  }
};

async function fetchAdminUsers() {
  const headers = getAuthHeaders();
  const res = await fetch(`${API_BASE}/admin/users`, { headers });
  if (!res.ok) return;
  const usersData = await res.json();
  const tbody = document.getElementById("admin-users-table");
  if (!tbody) return;

  tbody.innerHTML = usersData.map(u => {
    const roleLower = (u.role || "").toLowerCase();
    const badgeClass = roleLower === "admin" ? "badge-orange" : (roleLower === "manager" ? "badge-purple" : "badge-blue");
    const orgInfo = u.company ? ` • ${u.company}` : (u.office_state ? ` • ${u.office_state}` : "");
    const statusText = roleLower === "manager"
      ? `${u.approval_status}${u.is_active ? "" : " (Inactive)"}`
      : (u.is_active ? "Active" : "Inactive");

    const activitySummary = roleLower === "contractor"
      ? `${u.applications_count || 0} apps (${u.won_count || 0} won) • ${u.saved_count || 0} saved • ${u.inquiries_count || 0} inquiries`
      : (roleLower === "manager"
        ? `${u.tender_updates_count || 0} tender updates • ${u.inquiry_responses_count || 0} inquiry replies`
        : "Nationwide Central Supervisor");

    return `
      <tr>
        <td style="font-weight:700;">${escapeHtml(u.user_code || u.username)}</td>
        <td>
          <strong>${escapeHtml(u.name || u.username)}</strong>
          <div style="font-size:0.74rem; color:var(--text-muted);">${escapeHtml(u.username + orgInfo)}</div>
        </td>
        <td>${escapeHtml(u.email)}</td>
        <td><span class="badge ${badgeClass}">${escapeHtml(u.role)}</span></td>
        <td><span style="font-size:0.8rem; font-weight:600;">${escapeHtml(statusText)}</span></td>
        <td style="font-size:0.8rem; color:var(--text-secondary);">${escapeHtml(activitySummary)}</td>
        <td style="font-size:0.8rem; color:var(--text-muted);">${escapeHtml((u.created_at || "").substring(0, 10))}</td>
      </tr>
    `;
  }).join("");
}

async function fetchAdminApplications() {
  const headers = getAuthHeaders();
  const res = await fetch(`${API_BASE}/admin/applications`, { headers });
  if (!res.ok) return;
  adminApplicationsList = await res.json();

  const badge = document.getElementById("admin-apps-badge");
  if (badge) badge.textContent = adminApplicationsList.length;

  const tbody = document.getElementById("admin-apps-table");
  if (!tbody) return;

  if (adminApplicationsList.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding:2rem; color:var(--text-muted);">No applications recorded yet.</td></tr>`;
    return;
  }

  tbody.innerHTML = adminApplicationsList.map(app => {
    const stUp = (app.application_status || "").toUpperCase();
    const stClass = stUp === "WON" ? "badge-green" : ((stUp === "NOT AWARDED" || stUp === "REJECTED") ? "badge-red" : (stUp === "WITHDRAWN" ? "badge-muted" : "badge-blue"));
    const outClass = app.outcome === "Won" ? "badge-green" : ((app.outcome === "Not Awarded" || app.outcome === "Rejected") ? "badge-red" : "badge-secondary");

    return `
      <tr>
        <td style="font-family:monospace; font-weight:700;">${escapeHtml(app.application_code || ("APP-" + app.id))}</td>
        <td>
          <strong>${escapeHtml(app.contractor_name)}</strong>
          <div style="font-size:0.74rem; color:var(--text-muted);">${escapeHtml(app.contractor_company || app.contractor_code)}</div>
        </td>
        <td>
          <strong>${escapeHtml(app.tender_name)}</strong>
          <div style="font-size:0.74rem; color:var(--text-muted);">${escapeHtml(app.tender_state || "--")} • ${escapeHtml(app.tender_category)}</div>
        </td>
        <td style="white-space:nowrap;">${escapeHtml(app.applied_on)}</td>
        <td style="font-weight:700; white-space:nowrap;">${app.bid_amount ? formatBudget(app.bid_amount) : "N/A"}</td>
        <td><span class="badge ${stClass}">${escapeHtml(app.application_status)}</span></td>
        <td><span class="badge ${outClass}">${escapeHtml(app.outcome || "Pending")}</span></td>
      </tr>
    `;
  }).join("");
}

async function fetchAdminHelpdeskQueue() {
  const headers = getAuthHeaders();
  const search = document.getElementById("filter-inquiry-search")?.value.trim() || "";
  const state = document.getElementById("filter-inquiry-state")?.value || "";
  const status = document.getElementById("filter-inquiry-status")?.value || "";
  const assignment_status = document.getElementById("filter-inquiry-assignment")?.value || "";

  const params = new URLSearchParams();
  if (search) params.append("search", search);
  if (state) params.append("state", state);
  if (status) params.append("status", status);
  if (assignment_status) params.append("assignment_status", assignment_status);

  try {
    const res = await fetch(`${API_BASE}/admin/inquiries?${params.toString()}`, { headers });
    if (!res.ok) return;
    const data = await res.json();
    renderAdminHelpdeskQueue(data);
  } catch (err) {
    showToast("Error loading inquiries", "error");
  }
}

function renderAdminHelpdeskQueue(data) {
  const summary = data.summary || {};
  const inquiries = data.inquiries || [];

  const setTxt = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
  setTxt("stat-inquiries-total", summary.totalInquiries || 0);
  setTxt("stat-inquiries-new", summary.countPending || 0);
  setTxt("stat-inquiries-progress", summary.countInProgress || 0);
  setTxt("stat-inquiries-resolved", summary.countResolved || 0);
  setTxt("stat-inquiries-unassigned", summary.countUnassigned || 0);
  setTxt("admin-helpdesk-badge", (summary.countPending || 0) + (summary.countUnassigned || 0));

  const tbody = document.getElementById("admin-inquiries-tbody");
  const emptyEl = document.getElementById("admin-inquiries-empty");
  if (!tbody) return;

  if (inquiries.length === 0) {
    tbody.innerHTML = "";
    if (emptyEl) emptyEl.style.display = "block";
    return;
  }
  if (emptyEl) emptyEl.style.display = "none";

  tbody.innerHTML = inquiries.map(t => {
    const stLow = (t.status || "").toLowerCase();
    const stClass = stLow === "resolved" ? "badge-green" : ((stLow === "in progress" || stLow === "awaiting user response") ? "badge-blue" : "badge-orange");
    const assignedLabel = t.assigned_manager_name
      ? `<span class="badge badge-green">${escapeHtml(t.assigned_manager_name)}</span>`
      : `<span class="badge badge-red">${escapeHtml(t.assignment_status || "Unassigned / Pending Admin Assignment")}</span>`;

    return `
      <tr>
        <td style="font-weight:700; color:#D97706;">${escapeHtml(t.ticket_number)}</td>
        <td>
          <strong>${escapeHtml(t.sender_name)}</strong>
          <div style="font-size:0.74rem; color:var(--text-muted);">${escapeHtml(t.organization_name || t.sender_role)}</div>
        </td>
        <td><span class="badge badge-purple">${escapeHtml(t.state || t.tender_state || "--")}</span></td>
        <td>${assignedLabel}</td>
        <td><span class="badge badge-secondary" style="font-size:0.72rem;">${escapeHtml(t.inquiry_category)}</span></td>
        <td style="max-width:200px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;" title="${escapeHtml(t.tender_name || t.subject)}">
          ${escapeHtml(t.tender_name || t.subject)}
        </td>
        <td><span class="badge ${stClass}">${escapeHtml(t.status)}</span></td>
        <td style="font-size:0.78rem; color:var(--text-muted);">${escapeHtml((t.created_at || "").substring(0, 10))}</td>
        <td style="text-align:right;">
          <button onclick="openAdminTicketModal(${t.id})" class="btn btn-primary" style="font-size:0.76rem; padding:4px 12px;">Inspect</button>
        </td>
      </tr>
    `;
  }).join("");
}

window.resetAdminInquiryFilters = () => {
  ["filter-inquiry-search", "filter-inquiry-state", "filter-inquiry-status", "filter-inquiry-assignment"].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = "";
  });
  fetchAdminHelpdeskQueue();
};

window.openAdminTicketModal = async (id) => {
  currentAdminTicketId = id;
  const headers = getAuthHeaders();
  try {
    const res = await fetch(`${API_BASE}/inquiries/${id}`, { headers });
    if (!res.ok) {
      showToast("Could not load inquiry details", "error");
      return;
    }
    const data = await res.json();
    const t = data.ticket;
    const messages = data.messages || [];

    document.getElementById("amodal-ticket-number").textContent = t.ticket_number;
    document.getElementById("amodal-ticket-subject").textContent = t.subject;
    document.getElementById("amodal-ticket-meta").textContent = `Category: ${t.inquiry_category} • Created: ${t.created_at}`;
    document.getElementById("amodal-ticket-state-badge").textContent = t.state || t.tender_state || "India";

    const statusBadge = document.getElementById("amodal-ticket-status-badge");
    const stLow = (t.status || "").toLowerCase();
    statusBadge.textContent = t.status;
    statusBadge.className = "badge " + (stLow === "resolved" ? "badge-green" : ((stLow === "in progress" || stLow === "awaiting user response") ? "badge-blue" : "badge-orange"));

    document.getElementById("amodal-sender-name").textContent = t.sender_name;
    document.getElementById("amodal-sender-role").textContent = t.sender_role;
    document.getElementById("amodal-sender-org").textContent = t.organization_name || "--";
    document.getElementById("amodal-sender-email").textContent = t.sender_email;
    document.getElementById("amodal-assignment-info").textContent = t.assigned_manager_name
      ? `${t.assigned_manager_name} (${t.state} Manager)`
      : (t.assignment_status || "Unassigned / Pending Admin Assignment");

    const tenderBox = document.getElementById("amodal-tender-info");
    if (t.related_tender_id && t.tender_name) {
      tenderBox.style.display = "block";
      document.getElementById("amodal-tender-name").textContent = `${t.tender_name} (${t.tender_state || ""})`;
    } else {
      tenderBox.style.display = "none";
    }

    const statusSelect = document.getElementById("amodal-status-select");
    if (statusSelect) {
      statusSelect.value = stLow === "resolved" ? "Resolved" : (stLow === "in progress" || stLow === "awaiting user response" ? "In Progress" : "Pending");
    }

    const thread = document.getElementById("amodal-conversation-thread");
    thread.innerHTML = messages.map(m => {
      const roleL = (m.sender_role || "").toLowerCase();
      const isOfficial = roleL === "admin" || roleL === "manager";
      return `
        <div style="display:flex; flex-direction:column; align-items:${isOfficial ? "flex-end" : "flex-start"};">
          <div style="max-width:85%; background:${isOfficial ? "rgba(245,158,11,0.06)" : "var(--bg-secondary)"}; border:1px solid var(--border-color); border-radius:12px; padding:10px 14px;">
            <div style="font-size:0.75rem; color:var(--text-muted); margin-bottom:4px;">
              <strong style="color:var(--text-primary);">${escapeHtml(m.sender_name_cached || m.sender_role)} (${escapeHtml(m.sender_role)})</strong> • ${escapeHtml(m.created_at || "")}
            </div>
            <p style="margin:0; font-size:0.86rem; white-space:pre-wrap;">${escapeHtml(m.message_body)}</p>
          </div>
        </div>
      `;
    }).join("");

    document.getElementById("admin-ticket-modal").style.display = "block";
  } catch (err) {
    showToast("Error opening inquiry modal", "error");
  }
};

window.closeAdminTicketModal = () => {
  const modal = document.getElementById("admin-ticket-modal");
  if (modal) modal.style.display = "none";
  currentAdminTicketId = null;
};

window.updateAdminTicketControls = async () => {
  if (!currentAdminTicketId) return;
  const status = document.getElementById("amodal-status-select").value;
  try {
    const res = await fetch(`${API_BASE}/admin/inquiries/${currentAdminTicketId}`, {
      method: "PATCH",
      headers: getAuthHeaders(),
      body: JSON.stringify({ status })
    });
    if (res.ok) {
      showToast("Inquiry status updated", "success");
      await openAdminTicketModal(currentAdminTicketId);
      await fetchAdminHelpdeskQueue();
    }
  } catch (e) {
    showToast("Failed to update status", "error");
  }
};

window.submitAdminReply = async (targetStatus) => {
  if (!currentAdminTicketId) return;
  const input = document.getElementById("amodal-reply-input");
  const body = input ? input.value.trim() : "";
  if (!body) {
    showToast("Please enter a reply message", "warning");
    return;
  }
  try {
    const res = await fetch(`${API_BASE}/admin/inquiries/${currentAdminTicketId}/reply`, {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify({ message_body: body, status: targetStatus })
    });
    if (res.ok) {
      if (input) input.value = "";
      showToast("Admin reply saved", "success");
      await openAdminTicketModal(currentAdminTicketId);
      await fetchAdminWorkspace();
    } else {
      const err = await res.json();
      showToast(err.message || "Reply failed", "error");
    }
  } catch (e) {
    showToast("Network error", "error");
  }
};

/* ---------------- STATE-WISE MANAGER WORKSPACE ---------------- */
let mgrTendersList = [];
let mgrAppsList = [];
let mgrInquiriesList = [];
let currentMgrInquiryId = null;

async function initManagerPage() {
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const state = user.office_state || "";

  const setTxt = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
  setTxt("mgr-profile-name", user.name || user.username || "State Manager");
  setTxt("mgr-state-badge", `Assigned State: ${state || "Unassigned"}`);
  setTxt("mgr-code-badge", user.user_code || "MGR");
  setTxt("mgr-tenders-state-title", state);
  setTxt("mgr-add-state-title", state);
  setTxt("mgr-inq-state-title", state);
  setTxt("mgr-apps-state-title", state);
  setTxt("mgr-con-state-title", state);
  const addStateInp = document.getElementById("mgr-add-state");
  if (addStateInp) addStateInp.value = state;

  window.switchManagerTab = (tabName) => {
    const tabs = ["overview", "tenders", "add", "inquiries", "apps", "contractors"];
    tabs.forEach(t => {
      const panel = document.getElementById(`mgr-tab-${t}`);
      const btn = document.getElementById(`btn-mgr-${t}`);
      if (panel) panel.style.display = "none";
      if (btn) {
        btn.style.backgroundColor = "transparent";
        btn.style.color = "var(--text-secondary)";
      }
    });
    const activePanel = document.getElementById(`mgr-tab-${tabName}`);
    const activeBtn = document.getElementById(`btn-mgr-${tabName}`);
    if (activePanel) activePanel.style.display = "flex";
    if (activeBtn) {
      activeBtn.style.backgroundColor = "var(--color-primary)";
      activeBtn.style.color = "#FFFFFF";
    }
  };

  // Wire Manager Add Tender form
  const addForm = document.getElementById("mgr-add-form");
  if (addForm) {
    addForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const payload = {
        name: document.getElementById("mgr-add-name").value.trim(),
        department: document.getElementById("mgr-add-dept").value.trim(),
        category: document.getElementById("mgr-add-category").value,
        budget: document.getElementById("mgr-add-budget").value,
        deadline: document.getElementById("mgr-add-deadline").value,
        location: document.getElementById("mgr-add-location").value.trim(),
        required_documents: document.getElementById("mgr-add-docs").value.split(",").map(s => s.trim()).filter(Boolean),
        eligibility: document.getElementById("mgr-add-eligibility").value.trim(),
        description: document.getElementById("mgr-add-description").value.trim()
      };

      try {
        const res = await fetch(`${API_BASE}/manager/tenders`, {
          method: "POST",
          headers: getAuthHeaders(),
          body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (res.ok) {
          showToast(data.message || "Tender created", "success");
          addForm.reset();
          if (addStateInp) addStateInp.value = state;
          switchManagerTab("tenders");
          await fetchManagerWorkspace();
        } else {
          showToast(data.message || "Could not create tender", "error");
        }
      } catch (err) {
        showToast("Network error creating tender", "error");
      }
    });
  }

  // Wire Manager Edit Tender form
  const editForm = document.getElementById("mgr-edit-form");
  if (editForm) {
    editForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const id = document.getElementById("mgr-edit-id").value;
      const payload = {
        name: document.getElementById("mgr-edit-name").value.trim(),
        department: document.getElementById("mgr-edit-dept").value.trim(),
        category: document.getElementById("mgr-edit-category").value,
        budget: document.getElementById("mgr-edit-budget").value,
        deadline: document.getElementById("mgr-edit-deadline").value,
        location: document.getElementById("mgr-edit-location").value.trim(),
        status: document.getElementById("mgr-edit-status").value,
        required_documents: document.getElementById("mgr-edit-docs").value.split(",").map(s => s.trim()).filter(Boolean),
        eligibility: document.getElementById("mgr-edit-eligibility").value.trim(),
        description: document.getElementById("mgr-edit-description").value.trim()
      };

      try {
        const res = await fetch(`${API_BASE}/manager/tenders/${id}`, {
          method: "PUT",
          headers: getAuthHeaders(),
          body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (res.ok) {
          showToast("State tender updated successfully!", "success");
          closeManagerEditModal();
          await fetchManagerWorkspace();
        } else {
          showToast(data.message || "Failed to update tender", "error");
        }
      } catch (err) {
        showToast("Error updating tender", "error");
      }
    });
  }

  // Inquiry search/status filters
  const inqSearch = document.getElementById("mgr-inq-search");
  const inqStatus = document.getElementById("mgr-inq-status-filter");
  let mgrDeb;
  if (inqSearch) {
    inqSearch.addEventListener("input", () => {
      clearTimeout(mgrDeb);
      mgrDeb = setTimeout(() => fetchManagerInquiries(), 300);
    });
  }
  if (inqStatus) inqStatus.addEventListener("change", () => fetchManagerInquiries());

  const urlParams = new URLSearchParams(window.location.search);
  const targetTab = urlParams.get("tab");
  if (["tenders", "add", "inquiries", "apps", "contractors"].includes(targetTab)) {
    switchManagerTab(targetTab);
  } else {
    switchManagerTab("overview");
  }

  await fetchManagerWorkspace();
}

async function fetchManagerWorkspace() {
  const headers = getAuthHeaders();
  try {
    const dashRes = await fetch(`${API_BASE}/manager/dashboard`, { headers });
    if (dashRes.ok) {
      const d = await dashRes.json();
      const setTxt = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };

      setTxt("mgr-dataset-cap", `${d.platformTendersCount} / ${d.maxPlatformTenders} Tenders`);
      setTxt("mgr-stat-tenders", d.stateTendersCount);
      setTxt("mgr-stat-budget", formatBudget(d.stateBudgetTotal || 0));
      setTxt("mgr-stat-apps", d.applicationsSummary?.total || 0);
      setTxt("mgr-stat-pending-inq", d.inquiriesSummary?.pending || 0);
      setTxt("mgr-tenders-badge", d.stateTendersCount);
      setTxt("mgr-inquiries-badge", d.inquiriesSummary?.pending || 0);
      setTxt("mgr-apps-badge", d.applicationsSummary?.total || 0);

      // Show 12-tender cap warning banner if platform cap reached
      const limitWarn = document.getElementById("mgr-limit-warning");
      const addSubmitBtn = document.getElementById("mgr-add-submit-btn");
      if (d.platformTendersCount >= d.maxPlatformTenders) {
        if (limitWarn) limitWarn.style.display = "block";
        if (addSubmitBtn) {
          addSubmitBtn.title = "12-tender dataset limit reached";
        }
      } else {
        if (limitWarn) limitWarn.style.display = "none";
      }

      const breakEl = document.getElementById("mgr-overview-breakdown");
      if (breakEl) {
        breakEl.innerHTML = `
          <div style="display:flex; justify-content:space-between;"><span>State Tender Views:</span><strong>${d.stateViewsCount}</strong></div>
          <div style="display:flex; justify-content:space-between;"><span>State Saved Bookmarks:</span><strong>${d.stateSavedCount}</strong></div>
          <div style="display:flex; justify-content:space-between;"><span>Active Contractors in State:</span><strong>${d.activeContractorsCount}</strong></div>
          <div style="display:flex; justify-content:space-between;"><span>Applications (Won / Pending):</span><strong>${d.applicationsSummary.won} Won / ${d.applicationsSummary.pending} Pending</strong></div>
          <div style="display:flex; justify-content:space-between;"><span>Inquiries (Pending / In Progress / Resolved):</span><strong>${d.inquiriesSummary.pending} / ${d.inquiriesSummary.inProgress} / ${d.inquiriesSummary.resolved}</strong></div>
        `;
      }

      const actEl = document.getElementById("mgr-recent-activity");
      if (actEl) {
        if (!d.recentActivity || d.recentActivity.length === 0) {
          actEl.innerHTML = `<p style="color:var(--text-muted); font-size:0.85rem;">No state activity recorded yet.</p>`;
        } else {
          actEl.innerHTML = d.recentActivity.map(a => `
            <div style="display:flex; gap:10px; align-items:start;">
              <div style="height:8px; width:8px; border-radius:50%; background:var(--color-primary); margin-top:6px; flex-shrink:0;"></div>
              <div>
                <div style="font-size:0.84rem; font-weight:600; color:var(--text-primary);">${escapeHtml(a.details || a.action_type)}</div>
                <div style="font-size:0.72rem; color:var(--text-muted);">${escapeHtml(a.actor_name || a.actor_role || "")} • ${escapeHtml(a.created_at || "")}</div>
              </div>
            </div>
          `).join("");
        }
      }
    }

    await Promise.all([
      fetchManagerTenders(),
      fetchManagerInquiries(),
      fetchManagerApplications(),
      fetchManagerContractors()
    ]);
  } catch (err) {
    showToast("Error loading state manager dashboard", "error");
  }
}

async function fetchManagerTenders() {
  const res = await fetch(`${API_BASE}/manager/tenders`, { headers: getAuthHeaders() });
  if (!res.ok) return;
  const data = await res.json();
  mgrTendersList = data.tenders || [];

  const tbody = document.getElementById("mgr-tenders-table");
  if (!tbody) return;
  if (mgrTendersList.length === 0) {
    tbody.innerHTML = `<tr><td colspan="8" style="text-align:center; padding:2rem; color:var(--text-muted);">No tenders found in your assigned state.</td></tr>`;
    return;
  }

  tbody.innerHTML = mgrTendersList.map(t => {
    const st = getTenderStatus(t.deadline, t.status);
    return `
      <tr>
        <td><strong>${escapeHtml(t.name)}</strong><div style="font-size:0.74rem; color:var(--text-muted);">${escapeHtml(t.location)}</div></td>
        <td><span class="badge badge-blue">${escapeHtml(t.category)}</span></td>
        <td style="font-size:0.82rem;">${escapeHtml(t.department)}</td>
        <td style="font-weight:700; white-space:nowrap;">${formatBudget(t.budget)}</td>
        <td style="white-space:nowrap;">${escapeHtml(t.deadline)}</td>
        <td><span class="badge ${st.class}">${escapeHtml(st.label)}</span></td>
        <td style="font-size:0.8rem;">${t.views_count || 0} views • ${t.applications_count || 0} apps</td>
        <td>
          <button onclick="openManagerEditModal(${t.id})" class="btn btn-outline" style="font-size:0.76rem; padding:5px 12px;">Edit</button>
        </td>
      </tr>
    `;
  }).join("");
}

window.openManagerEditModal = (id) => {
  const t = mgrTendersList.find(x => x.id === id);
  if (!t) return;
  document.getElementById("mgr-edit-id").value = t.id;
  document.getElementById("mgr-edit-name").value = t.name;
  document.getElementById("mgr-edit-dept").value = t.department;
  document.getElementById("mgr-edit-category").value = t.category;
  document.getElementById("mgr-edit-budget").value = t.budget;
  document.getElementById("mgr-edit-deadline").value = t.deadline;
  document.getElementById("mgr-edit-state").value = t.state;
  document.getElementById("mgr-edit-location").value = t.location;
  document.getElementById("mgr-edit-status").value = t.status || "Open";
  document.getElementById("mgr-edit-docs").value = Array.isArray(t.required_documents) ? t.required_documents.join(", ") : "";
  document.getElementById("mgr-edit-eligibility").value = t.eligibility;
  document.getElementById("mgr-edit-description").value = t.description;
  document.getElementById("mgr-edit-overlay").style.display = "block";
};

window.closeManagerEditModal = () => {
  const m = document.getElementById("mgr-edit-overlay");
  if (m) m.style.display = "none";
};

async function fetchManagerInquiries() {
  const search = document.getElementById("mgr-inq-search")?.value.trim() || "";
  const status = document.getElementById("mgr-inq-status-filter")?.value || "";
  const params = new URLSearchParams();
  if (search) params.append("search", search);
  if (status) params.append("status", status);

  const res = await fetch(`${API_BASE}/manager/inquiries?${params.toString()}`, { headers: getAuthHeaders() });
  if (!res.ok) return;
  const data = await res.json();
  mgrInquiriesList = data.inquiries || [];
  const s = data.summary || { total: 0, pending: 0, inProgress: 0, resolved: 0 };

  const setTxt = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
  setTxt("mgr-inq-total", s.total);
  setTxt("mgr-inq-pending", s.pending);
  setTxt("mgr-inq-progress", s.inProgress);
  setTxt("mgr-inq-resolved", s.resolved);
  setTxt("mgr-inquiries-badge", s.pending);

  const tbody = document.getElementById("mgr-inquiries-tbody");
  const emptyEl = document.getElementById("mgr-inquiries-empty");
  if (!tbody) return;

  if (mgrInquiriesList.length === 0) {
    tbody.innerHTML = "";
    if (emptyEl) emptyEl.style.display = "block";
    return;
  }
  if (emptyEl) emptyEl.style.display = "none";

  tbody.innerHTML = mgrInquiriesList.map(i => {
    const stLow = (i.status || "").toLowerCase();
    const stClass = stLow === "resolved" ? "badge-green" : (stLow === "in progress" ? "badge-blue" : "badge-orange");
    return `
      <tr>
        <td style="font-weight:700; color:var(--color-primary);">${escapeHtml(i.ticket_number)}</td>
        <td>
          <strong>${escapeHtml(i.sender_name)}</strong>
          <div style="font-size:0.74rem; color:var(--text-muted);">${escapeHtml(i.organization_name || i.sender_email)}</div>
        </td>
        <td style="max-width:210px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;" title="${escapeHtml(i.tender_name || '')}">
          ${escapeHtml(i.tender_name || ("TND-" + i.related_tender_id))}
        </td>
        <td><span class="badge badge-secondary" style="font-size:0.72rem;">${escapeHtml(i.inquiry_category)}</span></td>
        <td><span class="badge ${stClass}">${escapeHtml(i.status)}</span></td>
        <td style="font-size:0.78rem; color:var(--text-muted);">${escapeHtml((i.created_at || "").substring(0, 10))}</td>
        <td style="text-align:right;">
          <button onclick="openManagerInquiryModal(${i.id})" class="btn btn-primary" style="font-size:0.76rem; padding:5px 12px;">View &amp; Respond</button>
        </td>
      </tr>
    `;
  }).join("");
}

window.openManagerInquiryModal = async (id) => {
  currentMgrInquiryId = id;
  try {
    const res = await fetch(`${API_BASE}/inquiries/${id}`, { headers: getAuthHeaders() });
    if (!res.ok) {
      showToast("Access denied or inquiry not found", "error");
      return;
    }
    const data = await res.json();
    const t = data.ticket;
    const messages = data.messages || [];

    document.getElementById("minq-ticket-num").textContent = t.ticket_number;
    document.getElementById("minq-subject").textContent = t.subject;
    document.getElementById("minq-meta").textContent = `Category: ${t.inquiry_category} • Created: ${t.created_at}`;
    document.getElementById("minq-state-badge").textContent = t.state;
    document.getElementById("minq-contractor").textContent = `${t.sender_name} (${t.organization_name || ""}) • ${t.sender_email}`;
    document.getElementById("minq-tender").textContent = t.tender_name || `Tender #${t.related_tender_id}`;

    const stLow = (t.status || "").toLowerCase();
    const stBadge = document.getElementById("minq-status-badge");
    stBadge.textContent = t.status;
    stBadge.className = "badge " + (stLow === "resolved" ? "badge-green" : (stLow === "in progress" ? "badge-blue" : "badge-orange"));

    const statusSel = document.getElementById("minq-status-select");
    if (statusSel) statusSel.value = stLow === "resolved" ? "Resolved" : (stLow === "in progress" ? "In Progress" : "Pending");

    const thread = document.getElementById("minq-thread");
    thread.innerHTML = messages.map(m => {
      const isMgr = (m.sender_role || "").toLowerCase() === "manager";
      return `
        <div style="display:flex; flex-direction:column; align-items:${isMgr ? "flex-end" : "flex-start"};">
          <div style="max-width:85%; background:${isMgr ? "rgba(37,99,235,0.06)" : "var(--bg-secondary)"}; border:1px solid var(--border-color); border-radius:12px; padding:10px 14px;">
            <div style="font-size:0.75rem; color:var(--text-muted); margin-bottom:4px;">
              <strong style="color:var(--text-primary);">${escapeHtml(m.sender_name_cached || m.sender_role)} (${escapeHtml(m.sender_role)})</strong> • ${escapeHtml(m.created_at || "")}
            </div>
            <p style="margin:0; font-size:0.86rem; white-space:pre-wrap;">${escapeHtml(m.message_body)}</p>
          </div>
        </div>
      `;
    }).join("");

    document.getElementById("mgr-inquiry-modal").style.display = "block";
  } catch (err) {
    showToast("Error opening inquiry", "error");
  }
};

window.closeManagerInquiryModal = () => {
  const m = document.getElementById("mgr-inquiry-modal");
  if (m) m.style.display = "none";
  currentMgrInquiryId = null;
};

window.updateManagerInquiryStatusOnly = async () => {
  if (!currentMgrInquiryId) return;
  const status = document.getElementById("minq-status-select").value;
  try {
    const res = await fetch(`${API_BASE}/manager/inquiries/${currentMgrInquiryId}`, {
      method: "PATCH",
      headers: getAuthHeaders(),
      body: JSON.stringify({ status })
    });
    const data = await res.json();
    if (res.ok) {
      showToast(data.message || "Status updated", "success");
      await openManagerInquiryModal(currentMgrInquiryId);
      await fetchManagerWorkspace();
    } else {
      showToast(data.message || "Failed to update status", "error");
    }
  } catch (e) {
    showToast("Error updating status", "error");
  }
};

window.submitManagerInquiryReply = async (targetStatus) => {
  if (!currentMgrInquiryId) return;
  const input = document.getElementById("minq-reply-input");
  const body = input ? input.value.trim() : "";
  if (!body) {
    showToast("Please type your response", "warning");
    return;
  }
  try {
    const res = await fetch(`${API_BASE}/manager/inquiries/${currentMgrInquiryId}/reply`, {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify({ message_body: body, status: targetStatus })
    });
    const data = await res.json();
    if (res.ok) {
      if (input) input.value = "";
      showToast("Response sent to contractor", "success");
      await openManagerInquiryModal(currentMgrInquiryId);
      await fetchManagerWorkspace();
    } else {
      showToast(data.message || "Failed to send response", "error");
    }
  } catch (e) {
    showToast("Error sending response", "error");
  }
};

async function fetchManagerApplications() {
  const res = await fetch(`${API_BASE}/manager/applications`, { headers: getAuthHeaders() });
  if (!res.ok) return;
  const data = await res.json();
  mgrAppsList = data.applications || [];

  const tbody = document.getElementById("mgr-apps-table");
  if (!tbody) return;

  if (mgrAppsList.length === 0) {
    tbody.innerHTML = `<tr><td colspan="8" style="text-align:center; padding:2rem; color:var(--text-muted);">No contractor applications recorded for your state yet.</td></tr>`;
    return;
  }

  tbody.innerHTML = mgrAppsList.map(app => {
    const stUp = (app.application_status || "").toUpperCase();
    const stClass = stUp === "WON" ? "badge-green" : ((stUp === "NOT AWARDED" || stUp === "REJECTED") ? "badge-red" : "badge-blue");
    return `
      <tr>
        <td style="font-family:monospace; font-weight:700;">${escapeHtml(app.application_code || ("APP-" + app.id))}</td>
        <td><strong>${escapeHtml(app.contractor_name)}</strong><div style="font-size:0.74rem; color:var(--text-muted);">${escapeHtml(app.contractor_company || "")}</div></td>
        <td><strong>${escapeHtml(app.tender_name)}</strong><div style="font-size:0.74rem; color:var(--text-muted);">${escapeHtml(app.tender_category)}</div></td>
        <td style="white-space:nowrap;">${escapeHtml(app.applied_on)}</td>
        <td style="font-weight:700; white-space:nowrap;">${app.bid_amount ? formatBudget(app.bid_amount) : "N/A"}</td>
        <td><span class="badge ${stClass}">${escapeHtml(app.application_status)}</span></td>
        <td>${escapeHtml(app.outcome || "Pending")}</td>
        <td><button onclick="openManagerEvalModal(${app.id})" class="btn btn-outline" style="font-size:0.76rem; padding:4px 10px;">Evaluate</button></td>
      </tr>
    `;
  }).join("");
}

window.openManagerEvalModal = (appId) => {
  const app = mgrAppsList.find(a => a.id === appId);
  if (!app) return;
  document.getElementById("mgr-eval-app-id").value = app.id;
  document.getElementById("mgr-eval-contractor").textContent = `${app.contractor_name} (${app.contractor_company || app.contractor_code})`;
  document.getElementById("mgr-eval-tender").textContent = `${app.tender_name} • Bid: ${app.bid_amount ? formatBudget(app.bid_amount) : "Not recorded"}`;
  document.getElementById("mgr-eval-status").value = app.application_status || "Under Review";
  document.getElementById("mgr-eval-outcome").value = app.outcome || "Pending";
  document.getElementById("mgr-eval-missing").value = Array.isArray(app.missing_documents) ? app.missing_documents.join(", ") : "";
  document.getElementById("mgr-eval-notes").value = app.evaluation_notes || "";
  document.getElementById("mgr-eval-overlay").style.display = "block";
};

window.closeManagerEvalModal = () => {
  const m = document.getElementById("mgr-eval-overlay");
  if (m) m.style.display = "none";
};

window.syncManagerEvalOutcome = () => {
  const st = document.getElementById("mgr-eval-status").value;
  const out = document.getElementById("mgr-eval-outcome");
  if (!out) return;
  if (["Won", "Not Awarded", "Rejected", "Withdrawn"].includes(st)) out.value = st;
  else out.value = "Pending";
};

window.handleManagerEvalSubmit = async (e) => {
  e.preventDefault();
  const appId = document.getElementById("mgr-eval-app-id").value;
  const application_status = document.getElementById("mgr-eval-status").value;
  const outcome = document.getElementById("mgr-eval-outcome").value;
  const missing_documents = document.getElementById("mgr-eval-missing").value.split(",").map(s => s.trim()).filter(Boolean);
  const evaluation_notes = document.getElementById("mgr-eval-notes").value.trim();

  try {
    const res = await fetch(`${API_BASE}/manager/applications/${appId}/evaluate`, {
      method: "PUT",
      headers: getAuthHeaders(),
      body: JSON.stringify({ application_status, outcome, missing_documents, evaluation_notes })
    });
    const data = await res.json();
    if (res.ok) {
      showToast("Application evaluation saved", "success");
      closeManagerEvalModal();
      await fetchManagerWorkspace();
    } else {
      showToast(data.message || "Evaluation failed", "error");
    }
  } catch (err) {
    showToast("Error saving evaluation", "error");
  }
};

async function fetchManagerContractors() {
  const res = await fetch(`${API_BASE}/manager/contractors`, { headers: getAuthHeaders() });
  if (!res.ok) return;
  const data = await res.json();
  const list = data.contractors || [];

  const tbody = document.getElementById("mgr-contractors-table");
  if (!tbody) return;
  if (list.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding:2rem; color:var(--text-muted);">No contractor activity recorded in your state yet.</td></tr>`;
    return;
  }
  tbody.innerHTML = list.map(c => `
    <tr>
      <td style="font-weight:700;">${escapeHtml(c.user_code || "--")}</td>
      <td><strong>${escapeHtml(c.name)}</strong><div style="font-size:0.74rem; color:var(--text-muted);">${escapeHtml(c.company || "")}</div></td>
      <td>${escapeHtml(c.email)}</td>
      <td>${c.state_applications_count || 0}</td>
      <td style="color:var(--color-success); font-weight:700;">${c.state_won_count || 0}</td>
      <td>${c.state_saved_count || 0}</td>
      <td>${c.state_inquiries_count || 0}</td>
    </tr>
  `).join("");
}

/* ---------------- CONTACT & TENDER INQUIRY PAGE ---------------- */
async function initContactPage() {
  const user = JSON.parse(localStorage.getItem("user") || "null");
  const token = localStorage.getItem("token");
  const roleLower = (user && user.role ? user.role : "").toLowerCase();

  const publicView = document.getElementById("contact-public-visitor-view");
  const nonContractorView = document.getElementById("contact-non-contractor-view");
  const contractorView = document.getElementById("contact-contractor-view");
  const roleBadge = document.getElementById("contact-role-badge");
  const cardTitle = document.getElementById("contact-card-title");

  if (!user || !token) {
    // Public Visitor View (no tender inquiry form shown)
    if (publicView) publicView.style.display = "flex";
    if (nonContractorView) nonContractorView.style.display = "none";
    if (contractorView) contractorView.style.display = "none";
    if (roleBadge) roleBadge.textContent = "Public Visitor";
    return;
  }

  if (roleLower !== "contractor") {
    // Manager / Central Admin View (cannot submit contractor inquiries)
    if (publicView) publicView.style.display = "none";
    if (contractorView) contractorView.style.display = "none";
    if (nonContractorView) nonContractorView.style.display = "flex";
    if (roleBadge) roleBadge.textContent = roleLower === "admin" ? "Central Admin" : `${user.office_state || "State"} Manager`;
    if (cardTitle) cardTitle.textContent = "Inquiry Management Notice";

    const link = document.getElementById("non-contractor-dashboard-link");
    if (link) {
      link.href = roleLower === "admin" ? "admin.html?tab=helpdesk" : "manager.html?tab=inquiries";
      link.textContent = roleLower === "admin" ? "Open Admin Inquiries Monitor" : `Open ${user.office_state || ""} State Inquiries`;
    }
    return;
  }

  // Logged-in Contractor View
  if (publicView) publicView.style.display = "none";
  if (nonContractorView) nonContractorView.style.display = "none";
  if (contractorView) contractorView.style.display = "flex";
  if (roleBadge) roleBadge.textContent = "Authenticated Contractor";
  if (cardTitle) cardTitle.textContent = "Submit Tender Inquiry";

  // Auto-populate contractor details from authenticated account (no manual re-entry)
  const nameEl = document.getElementById("auto-contractor-name");
  const compEl = document.getElementById("auto-contractor-company");
  const emailEl = document.getElementById("auto-contractor-email");
  if (nameEl) nameEl.textContent = user.name || user.username || "--";
  if (compEl) compEl.textContent = user.company || "Independent Contractor";
  if (emailEl) emailEl.textContent = user.email || "--";

  const tenderSelect = document.getElementById("contact-tender-id");
  const stateHint = document.getElementById("contact-tender-state-hint");
  let loadedTenders = [];

  try {
    const tRes = await fetch(`${API_BASE}/tenders`);
    if (tRes.ok) {
      loadedTenders = await tRes.json();
      if (tenderSelect) {
        tenderSelect.innerHTML = `<option value="">Select a tender from the 12 active tenders...</option>` +
          loadedTenders.map(t => `<option value="${t.id}">[${escapeHtml(t.state || "India")}] ${escapeHtml(t.name)} (${escapeHtml(t.category)})</option>`).join("");
      }
    }
  } catch (e) {
    console.warn("Could not load tenders for inquiry dropdown:", e);
  }

  const updateStateHint = () => {
    if (!tenderSelect || !stateHint) return;
    const selected = loadedTenders.find(t => String(t.id) === String(tenderSelect.value));
    if (selected && selected.state) {
      stateHint.style.display = "block";
      stateHint.textContent = `State Routing: This tender belongs to ${selected.state}. Your inquiry will be routed automatically to the approved ${selected.state} Manager (or Central Admin if unassigned).`;
    } else {
      stateHint.style.display = "none";
    }
  };

  if (tenderSelect) {
    tenderSelect.addEventListener("change", updateStateHint);
    const urlParams = new URLSearchParams(window.location.search);
    const paramTenderId = urlParams.get("tenderId") || urlParams.get("id");
    if (paramTenderId) {
      tenderSelect.value = paramTenderId;
      updateStateHint();
    }
  }

  window.resetContractorInquiryForm = () => {
    const banner = document.getElementById("contact-success-banner");
    const form = document.getElementById("contact-form");
    if (banner) banner.style.display = "none";
    if (form) form.style.display = "flex";
  };

  const form = document.getElementById("contact-form");
  if (!form) return;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const related_tender_id = tenderSelect ? tenderSelect.value : "";
    const inquiry_category = document.getElementById("contact-category")?.value || "";
    const message = document.getElementById("contact-message")?.value.trim() || "";

    if (!related_tender_id || !inquiry_category || !message) {
      showToast("Please select a tender, category, and enter your message", "warning");
      return;
    }

    const submitBtn = document.getElementById("contact-submit-btn");
    if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = "Routing Inquiry..."; }

    try {
      const res = await fetch(`${API_BASE}/inquiries`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          related_tender_id: parseInt(related_tender_id, 10),
          inquiry_category,
          message
        })
      });

      const data = await res.json();
      if (res.ok) {
        const banner = document.getElementById("contact-success-banner");
        const headerEl = document.getElementById("success-ticket-header");
        const msgEl = document.getElementById("success-ticket-msg");
        if (headerEl) headerEl.textContent = `Inquiry ${data.ticket_number} Submitted`;
        if (msgEl) msgEl.textContent = data.message || "Your tender inquiry has been saved and routed.";
        form.reset();
        if (stateHint) stateHint.style.display = "none";
        form.style.display = "none";
        if (banner) banner.style.display = "block";
        showToast(data.message || "Inquiry submitted!", "success");
      } else {
        showToast(data.message || "Failed to submit inquiry", "error");
      }
    } catch (err) {
      showToast("Network error submitting inquiry", "error");
    } finally {
      if (submitBtn) { submitBtn.disabled = false; submitBtn.innerHTML = "<span>Submit Tender Inquiry</span>"; }
    }
  });
}


