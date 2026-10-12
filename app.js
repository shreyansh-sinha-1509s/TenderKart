// TenderKart - Frontend Application Logic (app.js)
// Traditional student-friendly coding style

const API_BASE = (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1") && window.location.port !== "" && window.location.port !== "5000"
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
  } else if (page === "admin.html") {
    initAdminPage();
  } else if (page === "contact.html") {
    initContactPage();
  }
});

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

function getTenderStatus(deadlineStr) {
  const deadline = new Date(deadlineStr);
  const now = new Date();
  deadline.setHours(0,0,0,0);
  now.setHours(0,0,0,0);
  
  if (deadline < now) {
    return { label: "Closed", class: "badge-muted", countdown: "Closed" };
  }
  
  const diffDays = Math.ceil((deadline - now) / (1000 * 60 * 60 * 24));
  if (diffDays <= 7) {
    const dayText = diffDays === 1 ? "1 day" : `${diffDays} days`;
    return { label: "Closing Soon", class: "badge-orange", countdown: `Closes in ${dayText}` };
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
    const isManagerOrAdmin = roleLower === "admin" || roleLower === "manager";
    const dashboardPage = isManagerOrAdmin ? "admin.html" : "dashboard.html";
    const dashboardLabel = roleLower === "admin" ? "Admin Helpdesk" : (roleLower === "manager" ? "Manager Portal" : "Dashboard");
    const dashboardIcon = isManagerOrAdmin 
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
        <div style="display: flex; align-items: center; gap: 32px;" id="desktop-nav-links">
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
            <li><a href="tenders.html" class="footer-link">Search & Filter</a></li>
            <li><a href="tenders.html" class="footer-link">Tender Intelligence</a></li>
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

function setupAuthUI() {
  // Page authentication gates
  const userJson = localStorage.getItem("user");
  const user = userJson ? JSON.parse(userJson) : null;
  const path = currentPage();

  const roleLower = (user && user.role ? user.role : "").toLowerCase();
  const isManagerOrAdmin = roleLower === "admin" || roleLower === "manager";

  if (path === "dashboard.html" && (!user || isManagerOrAdmin)) {
    alert("Please login first as contractor to access dashboard.");
    window.location.href = "login.html";
  }

  if (path === "admin.html" && (!user || !isManagerOrAdmin)) {
    alert("Access denied. Manager / Admin authorization required.");
    window.location.href = "login.html";
  }

  if ((path === "login.html" || path === "register.html") && user) {
    window.location.href = isManagerOrAdmin ? "admin.html" : "dashboard.html";
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
    title: "Integrated Common Central Secretariat Office Complex (Blocks 4 & 5)",
    department: "Central Public Works Department (CPWD) • New Delhi",
    value: "₹980 Cr",
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
  if (!form) return;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const usernameOrEmail = document.getElementById("usernameOrEmail").value.trim();
    const password = document.getElementById("password").value;

    if (!usernameOrEmail || !password) {
      showToast("Please fill out all fields", "warning");
      return;
    }

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
          window.location.href = data.user.role === "admin" ? "admin.html" : "dashboard.html";
        }, 1000);
      } else {
        showToast(data.message || "Invalid credentials", "error");
      }
    } catch (err) {
      showToast("Backend connection failed", "error");
    }
  });
}

function initRegisterPage() {
  const form = document.getElementById("register-form");
  if (!form) return;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const username = document.getElementById("username").value.trim();
    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value;
    const confirmPassword = document.getElementById("confirmPassword").value;

    if (!username || !email || !password || !confirmPassword) {
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

    try {
      const res = await fetch(`${API_BASE}/users/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, email, password })
      });

      const data = await res.json();
      if (res.ok) {
        localStorage.setItem("token", data.token);
        localStorage.setItem("user", JSON.stringify(data.user));
        showToast("Registration successful!", "success");
        setTimeout(() => {
          window.location.href = "dashboard.html";
        }, 1000);
      } else {
        showToast(data.message || "Registration failed", "error");
      }
    } catch (err) {
      showToast("Backend connection failed", "error");
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
  if (urlParams.get("search")) {
    const searchInp = document.getElementById("search-input");
    if (searchInp) searchInp.value = urlParams.get("search");
  }
  if (urlParams.get("location")) {
    const locInp = document.getElementById("filter-location");
    if (locInp) locInp.value = urlParams.get("location");
  }

  // Load Saved Bids Ids to show proper bookmark stars
  const userJson = localStorage.getItem("user");
  if (userJson) {
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

  // Attach search form submit
  const form = document.getElementById("search-form");
  if (form) {
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      searchAndFilterTenders();
    });
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

  const search = document.getElementById("search-input")?.value.trim() || "";
  const category = document.getElementById("filter-category")?.value || "";
  const location = document.getElementById("filter-location")?.value.trim() || "";
  const department = document.getElementById("filter-department")?.value.trim() || "";
  const minBudget = document.getElementById("filter-minBudget")?.value || "";
  const maxBudget = document.getElementById("filter-maxBudget")?.value || "";
  const deadline = document.getElementById("filter-deadline")?.value || "";

  const q = new URLSearchParams();
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
    
    if (location) {
      if (headingBox) headingBox.textContent = `Tenders in "${location}"`;
      if (countBox) countBox.innerHTML = `Found <strong>${data.length}</strong> opportunities matching your location search`;
    } else {
      if (headingBox) headingBox.textContent = "Active Infrastructure Opportunities";
      if (countBox) countBox.innerHTML = `Showing <strong>${data.length}</strong> active urban tenders across India`;
    }

    if (data.length === 0) {
      container.innerHTML = `
        <div class="card" style="grid-column: 1 / -1; display: flex; flex-direction: column; align-items: center; text-align: center; gap: 16px; padding: 4rem 2rem; border: 2px dashed var(--border-color); border-radius: 16px; background-color: var(--bg-card); margin-top: 1rem;">
          <div style="height: 64px; width: 64px; border-radius: 50%; background-color: rgba(var(--primary-rgb), 0.08); color: var(--color-primary); display: flex; align-items: center; justify-content: center; font-size: 1.75rem;">
            📍
          </div>
          <div style="display: flex; flex-direction: column; gap: 6px; max-width: 540px;">
            <h3 style="font-size: 1.4rem; font-weight: 850; color: var(--text-primary);">No Current Tenders Available in This Area</h3>
            <p style="font-size: 0.95rem; color: var(--text-secondary); line-height: 1.5;">We couldn't find any tenders matching your selected location right now. Try another nearby city or district, or check again later when new opportunities are added.</p>
          </div>
          <div style="display: flex; gap: 12px; margin-top: 8px; flex-wrap: wrap; justify-content: center;">
            <button onclick="focusLocationInput()" class="btn btn-primary" style="display: inline-flex; align-items: center; gap: 8px;">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
              <span>Change Location</span>
            </button>
            <button onclick="viewAllTenders()" class="btn btn-secondary" style="display: inline-flex; align-items: center; gap: 8px;">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
              <span>View All Tenders</span>
            </button>
          </div>
        </div>
      `;
      return;
    }

    container.innerHTML = data.map(t => {
      const isSaved = savedTendersGlobalList.includes(t.id);
      const isLogged = !!localStorage.getItem("user");
      const bookmarkIconFill = isSaved ? "currentColor" : "none";
      const bookmarkColor = isSaved ? "var(--color-primary)" : "var(--text-muted)";
      const status = getTenderStatus(t.deadline);

      // Render tender card
      return `
        <div class="card" style="display: flex; flex-direction: column; gap: 16px; height: 100%;">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <div style="display: flex; gap: 8px; flex-wrap: wrap;">
              <span class="badge badge-blue">${t.category}</span>
              <span class="badge ${status.class}">${status.label}</span>
            </div>
            <button onclick="toggleSaveTender(${t.id})" style="background: none; border: none; cursor: pointer; padding: 6px; border-radius: 6px; display: flex; align-items: center; justify-content: center; color: ${bookmarkColor}; background-color: ${isSaved ? 'rgba(var(--primary-rgb), 0.08)' : 'transparent'}; border: 1px solid ${isSaved ? 'rgba(var(--primary-rgb), 0.1)' : 'transparent'}; transition: var(--transition-smooth);" title="${isSaved ? 'Saved' : 'Save Tender'}">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="${bookmarkIconFill}" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-bookmark"><path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z"/></svg>
            </button>
          </div>

          <div style="display: flex; flex-direction: column; gap: 4px;">
            <h3 style="font-size: 1.15rem; font-weight: 750; color: var(--text-primary); line-height: 1.4; letter-spacing: -0.25px;">${t.name}</h3>
            <span style="font-size: 0.75rem; color: var(--text-muted); font-weight: 600; line-height: 1.3;">${t.department}</span>
          </div>

          <p style="font-size: 0.85rem; color: var(--text-secondary); line-height: 1.5;">${t.description.substring(0, 130)}...</p>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; border-top: 1px solid var(--border-color); border-bottom: 1px solid var(--border-color); padding: 12px 0; margin-top: auto;">
            <div style="display: flex; align-items: center; gap: 8px;">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-indian-rupee"><path d="M6 3h12"/><path d="M6 8h12"/><path d="m6 13 8.5 8"/><path d="M6 13h3a6 6 0 0 0 6-6V8a6 6 0 0 0-6-6"/></svg>
              <div>
                <span style="display: block; font-size: 0.65rem; color: var(--text-muted); font-weight: 700;">BUDGET</span>
                <span style="display: block; font-size: 0.85rem; color: var(--text-primary); font-weight: 700;">${formatBudget(t.budget)}</span>
              </div>
            </div>
            <div style="display: flex; align-items: center; gap: 8px;">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-map-pin"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
              <div>
                <span style="display: block; font-size: 0.65rem; color: var(--text-muted); font-weight: 700;">LOCATION</span>
                <span style="display: block; font-size: 0.85rem; color: var(--text-primary); font-weight: 700;" title="${t.location}">${t.location}</span>
              </div>
            </div>
          </div>

          <div style="display: flex; justify-content: space-between; align-items: center; gap: 12px;">
            <span class="badge ${status.class}" style="display: inline-flex; align-items: center; gap: 4px; text-transform: none; font-size: 0.75rem;">
              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-calendar"><rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
              <span>${t.deadline} (${status.countdown})</span>
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
    
    // Render Category and Calculated Status badges
    const status = getTenderStatus(t.deadline);
    const catBox = document.getElementById("tender-category");
    if (catBox) {
      catBox.outerHTML = `
        <div style="display: flex; gap: 8px; flex-wrap: wrap;" id="tender-category-container">
          <span class="badge badge-blue">${t.category}</span>
          <span class="badge ${status.class}">${status.label} (${status.countdown})</span>
        </div>
      `;
    }
    document.getElementById("tender-budget").textContent = formatBudget(t.budget);
    document.getElementById("tender-location").textContent = t.location;
    document.getElementById("tender-deadline").textContent = `${t.deadline} (${status.countdown})`;
    document.getElementById("tender-description").textContent = t.description;
    document.getElementById("tender-eligibility").textContent = t.eligibility;

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
  if (!btn) return;
  const userJson = localStorage.getItem("user");
  if (!userJson) return;
  const user = JSON.parse(userJson);
  const role = (user.role || "").toLowerCase();
  if (role === "manager" || role === "admin") {
    btn.style.display = "none";
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
  const summary = data.summary || { totalTickets: 0, awaitingAdmin: 0, adminReplied: 0, resolved: 0 };
  const tickets = data.tickets || [];

  const totalEl = document.getElementById("stat-helpdesk-total");
  const awaitingEl = document.getElementById("stat-helpdesk-awaiting");
  const repliedEl = document.getElementById("stat-helpdesk-replied");
  const resolvedEl = document.getElementById("stat-helpdesk-resolved");
  const badgeEl = document.getElementById("helpdesk-count");

  if (totalEl) totalEl.textContent = summary.totalTickets;
  if (awaitingEl) awaitingEl.textContent = summary.awaitingAdmin;
  if (repliedEl) repliedEl.textContent = summary.adminReplied;
  if (resolvedEl) resolvedEl.textContent = summary.resolved;
  if (badgeEl) badgeEl.textContent = summary.totalTickets;

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
    let statusBadgeClass = "badge-blue";
    if (statusLower === "new") statusBadgeClass = "badge-orange";
    else if (statusLower === "in progress") statusBadgeClass = "badge-orange";
    else if (statusLower === "awaiting user response") statusBadgeClass = "badge-blue";
    else if (statusLower === "resolved") statusBadgeClass = "badge-green";

    const tenderInfo = t.related_tender_id 
      ? `<span style="font-weight: 600; color: var(--color-primary);" title="${t.tender_name || ''}">TND-${t.related_tender_id}</span>`
      : `<span style="color: var(--text-muted); font-size: 0.8rem;">General</span>`;

    const lastActivity = t.last_activity_at 
      ? new Date(t.last_activity_at).toLocaleDateString()
      : (t.created_at ? new Date(t.created_at).toLocaleDateString() : "--");

    const submittedDate = t.created_at ? new Date(t.created_at).toLocaleDateString() : "--";

    return `
      <tr>
        <td style="font-weight: 700; color: var(--color-primary);">${t.ticket_number}</td>
        <td style="font-weight: 600; color: var(--text-primary); max-width: 220px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${t.subject}">
          ${t.subject}
        </td>
        <td><span class="badge badge-secondary" style="font-size: 0.72rem;">${t.inquiry_category}</span></td>
        <td>${tenderInfo}</td>
        <td style="color: var(--text-secondary); font-size: 0.8rem;">${submittedDate}</td>
        <td><span class="badge ${statusBadgeClass}" style="font-size: 0.75rem;">${t.status}</span></td>
        <td style="color: var(--text-muted); font-size: 0.8rem;">${lastActivity}</td>
        <td style="text-align: right;">
          <button onclick="openContractorTicketModal(${t.id})" class="btn btn-outline" style="font-size: 0.78rem; padding: 4px 12px;">
            Open Ticket
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
      showToast("Could not open ticket details", "error");
      return;
    }
    const data = await res.json();
    const t = data.ticket;
    const messages = data.messages || [];

    document.getElementById("cmodal-ticket-number").textContent = t.ticket_number;
    document.getElementById("cmodal-ticket-subject").textContent = t.subject;
    document.getElementById("cmodal-ticket-meta").textContent = `Category: ${t.inquiry_category} • Submitted on ${t.created_at}`;

    const statusBadge = document.getElementById("cmodal-ticket-status-badge");
    statusBadge.textContent = t.status;
    const statusLower = (t.status || "").toLowerCase();
    statusBadge.className = "badge " + (statusLower === "resolved" ? "badge-green" : (statusLower === "awaiting user response" ? "badge-blue" : "badge-orange"));

    const prioBadge = document.getElementById("cmodal-ticket-priority-badge");
    prioBadge.textContent = `${t.priority} Priority`;
    prioBadge.className = "badge " + (t.priority === "High" || t.priority === "Urgent" ? "badge-orange" : "badge-secondary");

    // Tender info
    const tenderInfoBox = document.getElementById("cmodal-tender-info");
    if (t.related_tender_id && t.tender_name) {
      tenderInfoBox.style.display = "block";
      document.getElementById("cmodal-tender-name").textContent = `${t.tender_name} (${t.tender_category || ''})`;
    } else {
      tenderInfoBox.style.display = "none";
    }

    // Admin alert banner
    const adminAlert = document.getElementById("cmodal-admin-alert");
    if (statusLower === "awaiting user response") {
      adminAlert.style.display = "flex";
    } else {
      adminAlert.style.display = "none";
    }

    // Reply vs Resolved actions
    const replyBox = document.getElementById("cmodal-reply-box");
    const resolvedBox = document.getElementById("cmodal-resolved-box");
    if (statusLower === "resolved") {
      replyBox.style.display = "none";
      resolvedBox.style.display = "flex";
    } else {
      replyBox.style.display = "flex";
      resolvedBox.style.display = "none";
    }

    // Render conversation messages
    const thread = document.getElementById("cmodal-conversation-thread");
    thread.innerHTML = messages.map(m => {
      const isFromAdmin = (m.sender_role || "").toLowerCase() === "admin";
      const align = isFromAdmin ? "flex-start" : "flex-end";
      const bg = isFromAdmin ? "rgba(37, 99, 235, 0.05)" : "var(--bg-secondary)";
      const border = isFromAdmin ? "1px solid rgba(37, 99, 235, 0.25)" : "1px solid var(--border-color)";
      const senderLabel = isFromAdmin ? "TenderKart Central Admin" : (m.sender_name_cached || "You");
      const badgeRole = isFromAdmin 
        ? `<span class="badge badge-orange" style="font-size: 0.65rem;">Central Admin</span>`
        : `<span class="badge badge-blue" style="font-size: 0.65rem;">Contractor</span>`;

      return `
        <div style="display: flex; flex-direction: column; align-items: ${align}; width: 100%;">
          <div style="max-width: 85%; background: ${bg}; border: ${border}; border-radius: 14px; padding: 12px 16px; display: flex; flex-direction: column; gap: 6px;">
            <div style="display: flex; justify-content: space-between; align-items: center; gap: 10px; font-size: 0.76rem; color: var(--text-muted); border-bottom: 1px solid var(--border-color); padding-bottom: 4px;">
              <div style="display: flex; align-items: center; gap: 6px;">
                <strong style="color: var(--text-primary); font-size: 0.82rem;">${senderLabel}</strong>
                ${badgeRole}
              </div>
              <span>${m.created_at || ''}</span>
            </div>
            <p style="font-size: 0.88rem; color: var(--text-primary); margin: 0; line-height: 1.5; white-space: pre-wrap;">${m.message_body}</p>
          </div>
        </div>
      `;
    }).join("");

    document.getElementById("contractor-ticket-modal").style.display = "block";
    thread.scrollTop = thread.scrollHeight;
  } catch (err) {
    showToast("Error opening ticket modal", "error");
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
      showToast("Reply sent to TenderKart Admin", "success");
      await openContractorTicketModal(currentContractorTicketId);
      await fetchContractorHelpdesk();
    } else {
      const err = await res.json();
      showToast(err.message || "Could not send reply", "error");
    }
  } catch (e) {
    showToast("Network error sending reply", "error");
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = "Send Reply to Admin"; }
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

    const feedbackText = app.feedback_notes
      ? `<p style="font-size: 0.86rem; color: var(--text-primary); line-height: 1.5; background: var(--bg-card); padding: 10px 12px; border-radius: 8px; border: 1px solid var(--border-color); margin-top: 4px;">${app.feedback_notes}</p>`
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

/* ---------------- ADMIN WORKSPACE ---------------- */
let adminTendersList = [];
let adminApplicationsList = [];

async function initAdminPage() {
  // Add tender listener
  const form = document.getElementById("admin-add-form");
  if (form) {
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const name = document.getElementById("tender-add-name").value.trim();
      const department = document.getElementById("tender-add-dept").value.trim();
      const category = document.getElementById("tender-add-category").value;
      const budget = document.getElementById("tender-add-budget").value;
      const deadline = document.getElementById("tender-add-deadline").value;
      const location = document.getElementById("tender-add-location").value.trim();
      const documentsRaw = document.getElementById("tender-add-docs").value.trim();
      const eligibility = document.getElementById("tender-add-eligibility").value.trim();
      const description = document.getElementById("tender-add-description").value.trim();

      const required_documents = documentsRaw.split(",").map(d => d.trim()).filter(Boolean);

      try {
        const res = await fetch(`${API_BASE}/admin/tenders`, {
          method: "POST",
          headers: getAuthHeaders(),
          body: JSON.stringify({
            name, department, category, budget, location, deadline, eligibility, required_documents, description
          })
        });

        if (res.ok) {
          showToast("Tender published successfully!", "success");
          form.reset();
          switchAdminTab("tenders");
          await fetchAdminWorkspace();
        } else {
          showToast("Failed to create tender", "error");
        }
      } catch (err) {
        showToast("Error connecting to server", "error");
      }
    });
  }

  // Update tender listener
  const editForm = document.getElementById("admin-edit-form");
  if (editForm) {
    editForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const id = document.getElementById("edit-tender-id").value;
      const name = document.getElementById("tender-edit-name").value.trim();
      const department = document.getElementById("tender-edit-dept").value.trim();
      const category = document.getElementById("tender-edit-category").value;
      const budget = document.getElementById("tender-edit-budget").value;
      const deadline = document.getElementById("tender-edit-deadline").value;
      const location = document.getElementById("tender-edit-location").value.trim();
      const documentsRaw = document.getElementById("tender-edit-docs").value.trim();
      const eligibility = document.getElementById("tender-edit-eligibility").value.trim();
      const description = document.getElementById("tender-edit-description").value.trim();

      const required_documents = documentsRaw.split(",").map(d => d.trim()).filter(Boolean);

      try {
        const res = await fetch(`${API_BASE}/admin/tenders/${id}`, {
          method: "PUT",
          headers: getAuthHeaders(),
          body: JSON.stringify({
            name, department, category, budget, location, deadline, eligibility, required_documents, description
          })
        });

        if (res.ok) {
          showToast("Specifications updated successfully", "success");
          document.getElementById("edit-overlay").style.display = "none";
          await fetchAdminWorkspace();
        } else {
          showToast("Failed to save changes", "error");
        }
      } catch (err) {
        showToast("Error saving changes", "error");
      }
    });
  }

  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const roleLower = (user.role || "").toLowerCase();
  const isAdmin = roleLower === "admin";
  const isManager = roleLower === "manager";

  const adminHelpdeskBtn = document.getElementById("btn-admin-helpdesk");
  const managerHelpdeskBtn = document.getElementById("btn-manager-helpdesk");

  if (isAdmin) {
    if (adminHelpdeskBtn) adminHelpdeskBtn.style.display = "flex";
    if (managerHelpdeskBtn) managerHelpdeskBtn.style.display = "none";
    fetchAdminHelpdeskBadge();
  } else if (isManager) {
    if (adminHelpdeskBtn) adminHelpdeskBtn.style.display = "none";
    if (managerHelpdeskBtn) managerHelpdeskBtn.style.display = "flex";
    fetchManagerHelpdeskBadge();
  }

  // Switch tabs (Stats, Add, Tenders, Users, Apps, Helpdesk, Manager Helpdesk)
  window.switchAdminTab = (tabName) => {
    const tabs = ["stats", "add", "tenders", "users", "apps", "helpdesk", "manager-helpdesk"];
    tabs.forEach(t => {
      const panel = document.getElementById(`admin-tab-${t}`);
      const btn = document.getElementById(`btn-admin-${t}`) || document.getElementById(`btn-manager-${t}`);
      if (panel) panel.style.display = "none";
      if (btn) {
        btn.style.backgroundColor = "transparent";
        btn.style.color = "var(--text-secondary)";
      }
    });

    const activePanel = document.getElementById(`admin-tab-${tabName}`);
    const activeBtn = document.getElementById(`btn-admin-${tabName}`) || document.getElementById(`btn-manager-${tabName}`);
    if (activePanel) activePanel.style.display = "block";
    if (activeBtn) {
      activeBtn.style.backgroundColor = "var(--color-primary)";
      activeBtn.style.color = "#FFFFFF";
    }

    if (tabName === "apps") {
      fetchAdminApplications();
    } else if (tabName === "helpdesk") {
      fetchAdminHelpdeskQueue();
    } else if (tabName === "manager-helpdesk") {
      fetchManagerHelpdesk();
    }
  };

  // Wire filter listeners for Admin Queue
  const filterSearch = document.getElementById("filter-inquiry-search");
  const filterRole = document.getElementById("filter-inquiry-role");
  const filterCat = document.getElementById("filter-inquiry-category");
  const filterStatus = document.getElementById("filter-inquiry-status");
  const filterPrio = document.getElementById("filter-inquiry-priority");

  let debounceTimer;
  if (filterSearch) {
    filterSearch.addEventListener("input", () => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => fetchAdminHelpdeskQueue(), 300);
    });
  }
  if (filterRole) filterRole.addEventListener("change", () => fetchAdminHelpdeskQueue());
  if (filterCat) filterCat.addEventListener("change", () => fetchAdminHelpdeskQueue());
  if (filterStatus) filterStatus.addEventListener("change", () => fetchAdminHelpdeskQueue());
  if (filterPrio) filterPrio.addEventListener("change", () => fetchAdminHelpdeskQueue());

  const urlParams = new URLSearchParams(window.location.search);
  const targetTab = urlParams.get("tab");
  if (targetTab === "helpdesk" && isAdmin) {
    switchAdminTab("helpdesk");
  } else if ((targetTab === "helpdesk" || targetTab === "manager-helpdesk") && isManager) {
    switchAdminTab("manager-helpdesk");
  } else {
    switchAdminTab("stats");
  }
  await fetchAdminWorkspace();
}

async function fetchAdminApplications() {
  const headers = getAuthHeaders();
  try {
    const res = await fetch(`${API_BASE}/admin/applications`, { headers });
    if (!res.ok) return;

    adminApplicationsList = await res.json();

    const badge = document.getElementById("admin-apps-badge");
    if (badge) badge.textContent = `${adminApplicationsList.length} Applications`;

    const tbody = document.getElementById("admin-apps-table");
    if (!tbody) return;

    if (adminApplicationsList.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="8" style="padding: 2.5rem; text-align: center; color: var(--text-muted);">
            No applications recorded yet.
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = adminApplicationsList.map(app => {
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

      let outcomeBadge = "";
      if (app.outcome === "Won") {
        outcomeBadge = `<span class="badge badge-green">Won</span>`;
      } else if (app.outcome === "Not Awarded") {
        outcomeBadge = `<span class="badge" style="background-color: rgba(239, 68, 68, 0.1); color: var(--color-danger); border: 1px solid rgba(239, 68, 68, 0.2);">Not Awarded</span>`;
      } else if (app.outcome === "Withdrawn") {
        outcomeBadge = `<span class="badge" style="background-color: var(--bg-secondary); color: var(--text-muted); border: 1px solid var(--border-color);">Withdrawn</span>`;
      } else {
        outcomeBadge = `<span class="badge" style="background-color: var(--bg-secondary); color: var(--color-primary); border: 1px solid var(--border-color);">Pending</span>`;
      }

      return `
        <tr style="border-bottom: 1px solid var(--border-color);">
          <td style="padding: 14px 18px; font-weight: 700; color: var(--text-primary); font-family: monospace; font-size: 0.82rem;">
            ${app.application_code || ("APP-" + app.id)}
          </td>
          <td style="padding: 14px 18px;">
            <strong style="color: var(--text-primary);">${app.contractor_name}</strong>
            <div style="font-size: 0.75rem; color: var(--text-muted);">${app.contractor_company || app.contractor_code}</div>
          </td>
          <td style="padding: 14px 18px;">
            <strong style="color: var(--text-primary); font-size: 0.88rem;">${app.tender_name}</strong>
            <div style="font-size: 0.75rem; color: var(--text-muted);">${app.tender_category} • ${app.tender_location}</div>
          </td>
          <td style="padding: 14px 18px; font-size: 0.82rem; color: var(--text-secondary); white-space: nowrap;">
            ${app.applied_on}
          </td>
          <td style="padding: 14px 18px; font-weight: 700; color: var(--text-primary); white-space: nowrap;">
            ${app.bid_amount ? formatBudget(app.bid_amount) : '<span style="color: var(--text-muted);">N/A</span>'}
          </td>
          <td style="padding: 14px 18px; white-space: nowrap;">
            ${statusBadge}
          </td>
          <td style="padding: 14px 18px; white-space: nowrap;">
            ${outcomeBadge}
          </td>
          <td style="padding: 14px 18px; white-space: nowrap;">
            <button type="button" onclick="openAdminEvalModal(${app.id})" class="btn btn-outline" style="font-size: 0.78rem; padding: 5px 12px; display: inline-flex; align-items: center; gap: 4px;">
              <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
              <span>Evaluate</span>
            </button>
          </td>
        </tr>
      `;
    }).join("");

  } catch (err) {
    console.warn("Error fetching admin applications:", err);
  }
}

window.openAdminEvalModal = (appId) => {
  const app = adminApplicationsList.find(a => a.id === appId);
  if (!app) return;

  const overlay = document.getElementById("eval-overlay");
  if (!overlay) return;

  document.getElementById("eval-app-id").value = app.id;
  document.getElementById("eval-app-contractor").textContent = `${app.contractor_name} (${app.contractor_company || app.contractor_code})`;
  document.getElementById("eval-app-bid").textContent = `Bid: ${app.bid_amount ? formatBudget(app.bid_amount) : 'Not specified'}`;
  document.getElementById("eval-app-tender").textContent = `Tender: ${app.tender_name} (${app.tender_category})`;

  const statusSel = document.getElementById("eval-status-select");
  if (statusSel) statusSel.value = app.application_status || "Under Review";

  const outcomeSel = document.getElementById("eval-outcome-select");
  if (outcomeSel) outcomeSel.value = app.outcome || "Pending";

  const missingDocsEl = document.getElementById("eval-missing-docs");
  if (missingDocsEl) {
    missingDocsEl.value = Array.isArray(app.missing_documents) ? app.missing_documents.join(", ") : (app.missing_documents || "");
  }

  const notesEl = document.getElementById("eval-notes");
  if (notesEl) notesEl.value = app.feedback_notes || "";

  overlay.style.display = "block";
};

window.closeAdminEvalOverlay = () => {
  const overlay = document.getElementById("eval-overlay");
  if (overlay) overlay.style.display = "none";
};

window.syncOutcomeSelect = () => {
  const statusSel = document.getElementById("eval-status-select");
  const outcomeSel = document.getElementById("eval-outcome-select");
  if (!statusSel || !outcomeSel) return;

  const st = statusSel.value;
  if (st === "Won") outcomeSel.value = "Won";
  else if (st === "Not Awarded") outcomeSel.value = "Not Awarded";
  else if (st === "Withdrawn") outcomeSel.value = "Withdrawn";
  else outcomeSel.value = "Pending";
};

window.handleAdminEvalSubmit = async (e) => {
  e.preventDefault();
  const appId = document.getElementById("eval-app-id").value;
  const status = document.getElementById("eval-status-select").value;
  const outcome = document.getElementById("eval-outcome-select").value;
  const missingDocsRaw = document.getElementById("eval-missing-docs").value.trim();
  const feedback_notes = document.getElementById("eval-notes").value.trim();

  const missing_documents = missingDocsRaw ? missingDocsRaw.split(",").map(d => d.trim()).filter(Boolean) : [];

  try {
    const res = await fetch(`${API_BASE}/admin/applications/${appId}/evaluate`, {
      method: "PUT",
      headers: getAuthHeaders(),
      body: JSON.stringify({
        status,
        outcome,
        feedback_notes,
        missing_documents
      })
    });

    if (res.ok) {
      showToast("Application evaluation recorded successfully!", "success");
      closeAdminEvalOverlay();
      await fetchAdminApplications();
      await fetchAdminWorkspace();
    } else {
      const err = await res.json();
      showToast(err.message || "Failed to save evaluation", "error");
    }
  } catch (err) {
    showToast("Server error recording evaluation", "error");
  }
};

async function fetchAdminWorkspace() {
  const headers = getAuthHeaders();

  try {
    // 1. Fetch Stats
    const statsRes = await fetch(`${API_BASE}/admin/stats`, { headers });
    if (statsRes.ok) {
      const stats = await statsRes.json();
      
      document.getElementById("stat-box-tenders").textContent = `${stats.tendersCount} Tenders`;
      document.getElementById("stat-box-budget").textContent = formatBudget(stats.totalBudget);
      document.getElementById("stat-box-contractors").textContent = `${stats.usersCount} Profiles`;
      document.getElementById("stat-box-saves").textContent = `${stats.savedCount} Saves`;

      // Allocations progress bars
      const allocContainer = document.getElementById("analytics-allocations");
      if (allocContainer) {
        allocContainer.innerHTML = stats.categoryStats.map(cat => {
          const pct = Math.min((cat.budget / stats.totalBudget) * 100 || 0, 100).toFixed(0);
          return `
            <div style="display: flex; flex-direction: column; gap: 6px;">
              <div style="display: flex; justify-content: space-between; font-size: 0.85rem;">
                <span style="font-weight: 700; color: var(--text-primary);">${cat.category}</span>
                <span style="color: var(--text-secondary); font-weight: 600;">${formatBudget(cat.budget)} (${cat.count} bids)</span>
              </div>
              <div style="height: 6px; width: 100%; background-color: var(--bg-secondary); border-radius: 99px; overflow: hidden;">
                <div style="height: 100%; width: ${pct}%; background-color: var(--color-primary); border-radius: 99px;"></div>
              </div>
            </div>
          `;
        }).join("");
      }

      // Recent Activity Log
      const logsContainer = document.getElementById("analytics-logs");
      if (logsContainer) {
        logsContainer.innerHTML = stats.recentActivity.map(act => `
          <div style="display: flex; gap: 12px; align-items: start;">
            <div style="height: 8px; width: 8px; border-radius: 50%; background-color: var(--color-warning); margin-top: 6px; flex-shrink: 0;"></div>
            <div>
              <p style="font-size: 0.85rem; color: var(--text-primary); line-height: 1.4; font-weight: 550;">${act.message}</p>
              <span style="font-size: 0.7rem; color: var(--text-muted);">Log: ${act.time}</span>
            </div>
          </div>
        `).join("");
      }
    }

    // 2. Fetch Applications for Admin badge
    await fetchAdminApplications();

    // 3. Fetch Tenders list for table
    const tendersRes = await fetch(`${API_BASE}/tenders`);
    if (tendersRes.ok) {
      adminTendersList = await tendersRes.json();
      const tableBody = document.getElementById("admin-tenders-table");
      if (tableBody) {
        tableBody.innerHTML = adminTendersList.map(t => `
          <tr style="border-bottom: 1px solid var(--border-color);">
            <td style="padding: 16px 20px; font-size: 0.85rem; color: var(--text-primary);"><strong>${t.name}</strong></td>
            <td style="padding: 16px 20px; font-size: 0.85rem; color: var(--text-primary);"><span class="badge badge-blue">${t.category}</span></td>
            <td style="padding: 16px 20px; font-size: 0.85rem; color: var(--text-primary);">${t.department.split('(')[0].substring(0, 16)}...</td>
            <td style="padding: 16px 20px; font-size: 0.85rem; color: var(--text-primary); font-weight: bold;" class="text-primary">${formatBudget(t.budget)}</td>
            <td style="padding: 16px 20px; font-size: 0.85rem; color: var(--text-primary);"><span style="display: inline-flex; align-items: center; gap: 4px; font-size: 0.8rem;"><svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="lucide lucide-calendar"><rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg> ${t.deadline}</span></td>
            <td style="padding: 16px 20px; font-size: 0.85rem; color: var(--text-primary);">
              <div style="display: flex; gap: 8px;">
                <button onclick="handleEditTrigger(${t.id})" style="background: none; border: none; cursor: pointer; padding: 6px; border-radius: 4px; color: var(--color-primary); background-color: rgba(var(--primary-rgb), 0.05); border: 1px solid rgba(var(--primary-rgb), 0.1); transition: var(--transition-smooth);" title="Edit"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-edit-3"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg></button>
                <button onclick="handleDeleteTrigger(${t.id})" style="background: none; border: none; cursor: pointer; padding: 6px; border-radius: 4px; color: var(--color-danger); background-color: rgba(239, 68, 68, 0.05); border: 1px solid rgba(239, 68, 68, 0.1); transition: var(--transition-smooth);" title="Delete"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-trash-2"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg></button>
              </div>
            </td>
          </tr>
        `).join("");
      }
    }

    // 4. Fetch User registry accounts (Contractors and Managers)
    const usersRes = await fetch(`${API_BASE}/admin/users`, { headers });
    if (usersRes.ok) {
      const usersData = await usersRes.json();
      const usersTableBody = document.getElementById("admin-users-table");
      if (usersTableBody) {
        usersTableBody.innerHTML = usersData.map(u => {
          const roleLower = (u.role || "").toLowerCase();
          const badgeClass = (roleLower === 'admin' || roleLower === 'manager') ? 'badge-orange' : 'badge-green';
          const orgInfo = u.company ? ` • ${u.company}` : (u.department ? ` • ${u.department}` : '');
          const nameDisplay = u.name ? `<strong>${u.name}</strong><br><span style="font-size: 0.72rem; color: var(--text-muted);">${u.username}${orgInfo}</span>` : `<strong>${u.username}</strong>`;
          return `
            <tr style="border-bottom: 1px solid var(--border-color);">
              <td style="padding: 16px 20px; font-size: 0.85rem; color: var(--text-primary); font-weight: 700;">${u.user_code || u.username}</td>
              <td style="padding: 16px 20px; font-size: 0.85rem; color: var(--text-primary);">${nameDisplay}</td>
              <td style="padding: 16px 20px; font-size: 0.85rem; color: var(--text-primary);">${u.email}</td>
              <td style="padding: 16px 20px; font-size: 0.85rem; color: var(--text-primary);"><span class="badge ${badgeClass}" style="text-transform: capitalize;">${u.role}</span></td>
              <td style="padding: 16px 20px; font-size: 0.85rem; color: var(--text-primary);">${(u.created_at || '').substring(0, 10)}</td>
            </tr>
          `;
        }).join("");
      }
    }

  } catch (err) {
    showToast("Error updating administrative data", "error");
  }
}

window.handleEditTrigger = (tenderId) => {
  const tender = adminTendersList.find(t => t.id === tenderId);
  if (!tender) return;

  document.getElementById("edit-tender-id").value = tender.id;
  document.getElementById("tender-edit-name").value = tender.name;
  document.getElementById("tender-edit-dept").value = tender.department;
  document.getElementById("tender-edit-category").value = tender.category;
  document.getElementById("tender-edit-budget").value = tender.budget;
  document.getElementById("tender-edit-deadline").value = tender.deadline;
  document.getElementById("tender-edit-location").value = tender.location;
  document.getElementById("tender-edit-docs").value = tender.required_documents.join(", ");
  document.getElementById("tender-edit-eligibility").value = tender.eligibility;
  document.getElementById("tender-edit-description").value = tender.description;

  document.getElementById("edit-overlay").style.display = "block";
};

window.closeEditOverlay = () => {
  document.getElementById("edit-overlay").style.display = "none";
};

window.handleDeleteTrigger = async (tenderId) => {
  if (!window.confirm("Are you sure you want to delete this tender? This will erase bookmark records.")) return;
  const token = localStorage.getItem("token");

  try {
    const res = await fetch(`${API_BASE}/admin/tenders/${tenderId}`, {
      method: "DELETE",
      headers: { "Authorization": `Bearer ${token}` }
    });

    if (res.ok) {
      showToast("Tender removed successfully", "success");
      await fetchAdminWorkspace();
    } else {
      showToast("Failed to delete tender", "error");
    }
  } catch (e) {
    showToast("Connection error during delete", "error");
  }
};

/* ---------------- HELP DESK & INQUIRIES MANAGEMENT (ADMIN & MANAGER) ---------------- */
let currentAdminTicketId = null;
let currentManagerTicketId = null;

async function fetchAdminHelpdeskBadge() {
  const headers = getAuthHeaders();
  try {
    const res = await fetch(`${API_BASE}/inquiries/admin/all`, { headers });
    if (res.ok) {
      const data = await res.json();
      const badge = document.getElementById("admin-helpdesk-badge");
      if (badge) badge.textContent = (data.summary && data.summary.countNew) || 0;
    }
  } catch (e) {}
}

async function fetchAdminHelpdeskQueue() {
  const headers = getAuthHeaders();
  const search = document.getElementById("filter-inquiry-search") ? document.getElementById("filter-inquiry-search").value.trim() : "";
  const role = document.getElementById("filter-inquiry-role") ? document.getElementById("filter-inquiry-role").value : "";
  const category = document.getElementById("filter-inquiry-category") ? document.getElementById("filter-inquiry-category").value : "";
  const status = document.getElementById("filter-inquiry-status") ? document.getElementById("filter-inquiry-status").value : "";
  const priority = document.getElementById("filter-inquiry-priority") ? document.getElementById("filter-inquiry-priority").value : "";

  const params = new URLSearchParams();
  if (search) params.append("search", search);
  if (role) params.append("role", role);
  if (category) params.append("category", category);
  if (status) params.append("status", status);
  if (priority) params.append("priority", priority);

  try {
    const res = await fetch(`${API_BASE}/inquiries/admin/all?${params.toString()}`, { headers });
    if (!res.ok) {
      showToast("Access denied or error fetching admin helpdesk queue", "error");
      return;
    }
    const data = await res.json();
    renderAdminHelpdeskQueue(data);
  } catch (err) {
    showToast("Network error fetching admin queue", "error");
  }
}

function renderAdminHelpdeskQueue(data) {
  const summary = data.summary || {};
  const inquiries = data.inquiries || [];

  const totalEl = document.getElementById("stat-inquiries-total");
  const newEl = document.getElementById("stat-inquiries-new");
  const progressEl = document.getElementById("stat-inquiries-progress");
  const awaitingEl = document.getElementById("stat-inquiries-awaiting");
  const resolvedEl = document.getElementById("stat-inquiries-resolved");
  const badgeEl = document.getElementById("admin-helpdesk-badge");

  if (totalEl) totalEl.textContent = summary.totalInquiries || 0;
  if (newEl) newEl.textContent = summary.countNew || 0;
  if (progressEl) progressEl.textContent = summary.countInProgress || 0;
  if (awaitingEl) awaitingEl.textContent = summary.countAwaitingUser || 0;
  if (resolvedEl) resolvedEl.textContent = summary.countResolved || 0;
  if (badgeEl) badgeEl.textContent = summary.countNew || 0;

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
    const statusLower = (t.status || "").toLowerCase();
    let statusClass = "badge-blue";
    if (statusLower === "new") statusClass = "badge-orange";
    else if (statusLower === "in progress") statusClass = "badge-orange";
    else if (statusLower === "awaiting user response") statusClass = "badge-blue";
    else if (statusLower === "resolved") statusClass = "badge-green";

    const isManager = (t.sender_role || "").toLowerCase() === "manager";
    const roleBadge = isManager
      ? `<span class="badge badge-purple" style="font-size: 0.7rem; background: rgba(147, 51, 234, 0.1); color: #9333EA; border: 1px solid rgba(147, 51, 234, 0.25);">Manager</span>`
      : `<span class="badge badge-blue" style="font-size: 0.7rem;">Contractor</span>`;

    const prioBadge = t.priority === "High" || t.priority === "Urgent"
      ? `<span class="badge badge-orange" style="font-size: 0.72rem;">${t.priority}</span>`
      : `<span class="badge badge-secondary" style="font-size: 0.72rem;">${t.priority}</span>`;

    const tenderInfo = t.related_tender_id 
      ? `<span style="font-weight: 600; color: var(--color-primary);" title="${t.tender_name || ''}">TND-${t.related_tender_id}</span>`
      : `<span style="color: var(--text-muted); font-size: 0.78rem;">General</span>`;

    const submittedDate = t.created_at ? new Date(t.created_at).toLocaleDateString() : "--";

    return `
      <tr>
        <td style="font-weight: 700; color: #D97706;">${t.ticket_number}</td>
        <td style="font-weight: 600; color: var(--text-primary);">${t.sender_name}</td>
        <td>${roleBadge}</td>
        <td style="color: var(--text-secondary); font-size: 0.82rem;">${t.organization_name || '--'}</td>
        <td><span class="badge badge-secondary" style="font-size: 0.72rem;">${t.inquiry_category}</span></td>
        <td style="font-weight: 600; color: var(--text-primary); max-width: 180px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${t.subject}">
          ${t.subject}
        </td>
        <td>${tenderInfo}</td>
        <td>${prioBadge}</td>
        <td><span class="badge ${statusClass}" style="font-size: 0.74rem;">${t.status}</span></td>
        <td style="color: var(--text-muted); font-size: 0.8rem;">${submittedDate}</td>
        <td style="text-align: right;">
          <button onclick="openAdminTicketModal(${t.id})" class="btn btn-primary" style="font-size: 0.78rem; padding: 4px 12px;">
            Open Ticket
          </button>
        </td>
      </tr>
    `;
  }).join("");
}

window.resetAdminInquiryFilters = () => {
  if (document.getElementById("filter-inquiry-search")) document.getElementById("filter-inquiry-search").value = "";
  if (document.getElementById("filter-inquiry-role")) document.getElementById("filter-inquiry-role").value = "";
  if (document.getElementById("filter-inquiry-category")) document.getElementById("filter-inquiry-category").value = "";
  if (document.getElementById("filter-inquiry-status")) document.getElementById("filter-inquiry-status").value = "";
  if (document.getElementById("filter-inquiry-priority")) document.getElementById("filter-inquiry-priority").value = "";
  fetchAdminHelpdeskQueue();
};

window.openAdminTicketModal = async (id) => {
  currentAdminTicketId = id;
  const headers = getAuthHeaders();
  try {
    const res = await fetch(`${API_BASE}/inquiries/${id}`, { headers });
    if (!res.ok) {
      showToast("Could not load ticket details", "error");
      return;
    }
    const data = await res.json();
    const t = data.ticket;
    const messages = data.messages || [];

    document.getElementById("amodal-ticket-number").textContent = t.ticket_number;
    document.getElementById("amodal-ticket-subject").textContent = t.subject;
    document.getElementById("amodal-ticket-meta").textContent = `Category: ${t.inquiry_category} • Submitted on ${t.created_at}`;

    const statusBadge = document.getElementById("amodal-ticket-status-badge");
    statusBadge.textContent = t.status;
    const statusLower = (t.status || "").toLowerCase();
    statusBadge.className = "badge " + (statusLower === "resolved" ? "badge-green" : (statusLower === "awaiting user response" ? "badge-blue" : "badge-orange"));

    const prioBadge = document.getElementById("amodal-ticket-priority-badge");
    prioBadge.textContent = `${t.priority} Priority`;
    prioBadge.className = "badge " + (t.priority === "High" || t.priority === "Urgent" ? "badge-orange" : "badge-secondary");

    // Sender metadata
    document.getElementById("amodal-sender-name").textContent = t.sender_name;
    document.getElementById("amodal-sender-role").textContent = t.sender_role;
    document.getElementById("amodal-sender-org").textContent = t.organization_name || "Independent";
    document.getElementById("amodal-sender-email").textContent = t.sender_email;
    document.getElementById("amodal-sender-phone").textContent = t.contact_number || "Not provided";

    // Linked Tender info
    const tenderBox = document.getElementById("amodal-tender-info");
    if (t.related_tender_id && t.tender_name) {
      tenderBox.style.display = "block";
      document.getElementById("amodal-tender-name").textContent = `[TND-${t.related_tender_id}] ${t.tender_name}`;
      document.getElementById("amodal-tender-extra").textContent = `(${t.tender_category} • Dept: ${t.tender_authority || ''} • Deadline: ${t.tender_deadline || ''})`;
    } else {
      tenderBox.style.display = "none";
    }

    // Set control selects
    document.getElementById("amodal-priority-select").value = t.priority;
    document.getElementById("amodal-status-select").value = t.status;

    // Render conversation messages
    const thread = document.getElementById("amodal-conversation-thread");
    thread.innerHTML = messages.map(m => {
      const isFromAdmin = (m.sender_role || "").toLowerCase() === "admin";
      const align = isFromAdmin ? "flex-end" : "flex-start";
      const bg = isFromAdmin ? "rgba(245, 158, 11, 0.05)" : "var(--bg-secondary)";
      const border = isFromAdmin ? "1px solid rgba(245, 158, 11, 0.3)" : "1px solid var(--border-color)";
      const senderLabel = isFromAdmin ? "Admin (You)" : `${m.sender_name_cached || t.sender_name} (${t.sender_role})`;

      return `
        <div style="display: flex; flex-direction: column; align-items: ${align}; width: 100%;">
          <div style="max-width: 85%; background: ${bg}; border: ${border}; border-radius: 14px; padding: 12px 16px; display: flex; flex-direction: column; gap: 6px;">
            <div style="display: flex; justify-content: space-between; align-items: center; gap: 10px; font-size: 0.76rem; color: var(--text-muted); border-bottom: 1px solid var(--border-color); padding-bottom: 4px;">
              <strong style="color: var(--text-primary); font-size: 0.82rem;">${senderLabel}</strong>
              <span>${m.created_at || ''}</span>
            </div>
            <p style="font-size: 0.88rem; color: var(--text-primary); margin: 0; line-height: 1.5; white-space: pre-wrap;">${m.message_body}</p>
          </div>
        </div>
      `;
    }).join("");

    document.getElementById("admin-ticket-modal").style.display = "block";
    thread.scrollTop = thread.scrollHeight;
  } catch (err) {
    showToast("Error opening admin ticket modal", "error");
  }
};

window.closeAdminTicketModal = () => {
  const modal = document.getElementById("admin-ticket-modal");
  if (modal) modal.style.display = "none";
  currentAdminTicketId = null;
};

window.updateAdminTicketControls = async () => {
  if (!currentAdminTicketId) return;
  const priority = document.getElementById("amodal-priority-select").value;
  const status = document.getElementById("amodal-status-select").value;

  try {
    const res = await fetch(`${API_BASE}/inquiries/admin/${currentAdminTicketId}`, {
      method: "PATCH",
      headers: getAuthHeaders(),
      body: JSON.stringify({ priority, status })
    });

    if (res.ok) {
      showToast("Ticket controls updated", "success");
      await openAdminTicketModal(currentAdminTicketId);
      await fetchAdminHelpdeskQueue();
    } else {
      showToast("Failed to update ticket controls", "error");
    }
  } catch (e) {
    showToast("Error updating controls", "error");
  }
};

window.submitAdminReply = async (targetStatus, isRequestInfo) => {
  if (!currentAdminTicketId) return;
  const input = document.getElementById("amodal-reply-input");
  let body = input ? input.value.trim() : "";

  if (isRequestInfo && !body) {
    body = "Please share the relevant document, tender ID, and specific clarification so our administrative desk can proceed with your verification.";
  }

  if (!body) {
    showToast("Please enter an administrative reply", "warning");
    return;
  }

  try {
    const res = await fetch(`${API_BASE}/inquiries/admin/${currentAdminTicketId}/reply`, {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify({ message_body: body, status: targetStatus })
    });

    if (res.ok) {
      if (input) input.value = "";
      showToast("Official reply dispatched to sender dashboard", "success");
      await openAdminTicketModal(currentAdminTicketId);
      await fetchAdminHelpdeskQueue();
    } else {
      const err = await res.json();
      showToast(err.message || "Failed to submit admin reply", "error");
    }
  } catch (e) {
    showToast("Network error submitting admin reply", "error");
  }
};

/* --- Manager Self-Service Helpdesk Logic --- */
async function fetchManagerHelpdeskBadge() {
  const headers = getAuthHeaders();
  try {
    const res = await fetch(`${API_BASE}/inquiries/mine`, { headers });
    if (res.ok) {
      const data = await res.json();
      const badge = document.getElementById("manager-helpdesk-badge");
      if (badge) badge.textContent = (data.summary && data.summary.totalTickets) || 0;
    }
  } catch (e) {}
}

async function fetchManagerHelpdesk() {
  const headers = getAuthHeaders();
  try {
    const res = await fetch(`${API_BASE}/inquiries/mine`, { headers });
    if (!res.ok) {
      showToast("Could not load manager helpdesk tickets", "error");
      return;
    }
    const data = await res.json();
    renderManagerHelpdesk(data);
  } catch (err) {
    showToast("Network error fetching manager helpdesk", "error");
  }
}

function renderManagerHelpdesk(data) {
  const summary = data.summary || { totalTickets: 0, awaitingAdmin: 0, adminReplied: 0, resolved: 0 };
  const tickets = data.tickets || [];

  const totalEl = document.getElementById("stat-mgr-helpdesk-total");
  const awaitingEl = document.getElementById("stat-mgr-helpdesk-awaiting");
  const repliedEl = document.getElementById("stat-mgr-helpdesk-replied");
  const resolvedEl = document.getElementById("stat-mgr-helpdesk-resolved");
  const badgeEl = document.getElementById("manager-helpdesk-badge");

  if (totalEl) totalEl.textContent = summary.totalTickets;
  if (awaitingEl) awaitingEl.textContent = summary.awaitingAdmin;
  if (repliedEl) repliedEl.textContent = summary.adminReplied;
  if (resolvedEl) resolvedEl.textContent = summary.resolved;
  if (badgeEl) badgeEl.textContent = summary.totalTickets;

  const tbody = document.getElementById("manager-helpdesk-tbody");
  const emptyState = document.getElementById("manager-helpdesk-empty");
  if (!tbody) return;

  if (tickets.length === 0) {
    tbody.innerHTML = "";
    if (emptyState) emptyState.style.display = "flex";
    return;
  }

  if (emptyState) emptyState.style.display = "none";

  tbody.innerHTML = tickets.map(t => {
    const statusLower = (t.status || "").toLowerCase();
    let statusClass = "badge-blue";
    if (statusLower === "new") statusClass = "badge-orange";
    else if (statusLower === "in progress") statusClass = "badge-orange";
    else if (statusLower === "awaiting user response") statusClass = "badge-blue";
    else if (statusLower === "resolved") statusClass = "badge-green";

    const tenderInfo = t.related_tender_id 
      ? `<span style="font-weight: 600; color: var(--color-primary);" title="${t.tender_name || ''}">TND-${t.related_tender_id}</span>`
      : `<span style="color: var(--text-muted); font-size: 0.8rem;">General</span>`;

    const lastActivity = t.last_activity_at 
      ? new Date(t.last_activity_at).toLocaleDateString()
      : (t.created_at ? new Date(t.created_at).toLocaleDateString() : "--");

    const submittedDate = t.created_at ? new Date(t.created_at).toLocaleDateString() : "--";

    return `
      <tr>
        <td style="font-weight: 700; color: var(--color-primary);">${t.ticket_number}</td>
        <td style="font-weight: 600; color: var(--text-primary); max-width: 220px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${t.subject}">
          ${t.subject}
        </td>
        <td><span class="badge badge-secondary" style="font-size: 0.72rem;">${t.inquiry_category}</span></td>
        <td>${tenderInfo}</td>
        <td style="color: var(--text-secondary); font-size: 0.8rem;">${submittedDate}</td>
        <td><span class="badge ${statusClass}" style="font-size: 0.75rem;">${t.status}</span></td>
        <td style="color: var(--text-muted); font-size: 0.8rem;">${lastActivity}</td>
        <td style="text-align: right;">
          <button onclick="openManagerTicketModal(${t.id})" class="btn btn-outline" style="font-size: 0.78rem; padding: 4px 12px;">
            Open Ticket
          </button>
        </td>
      </tr>
    `;
  }).join("");
}

window.openManagerTicketModal = async (id) => {
  currentManagerTicketId = id;
  const headers = getAuthHeaders();
  try {
    const res = await fetch(`${API_BASE}/inquiries/${id}`, { headers });
    if (!res.ok) {
      showToast("Could not open manager ticket details", "error");
      return;
    }
    const data = await res.json();
    const t = data.ticket;
    const messages = data.messages || [];

    document.getElementById("mmodal-ticket-number").textContent = t.ticket_number;
    document.getElementById("mmodal-ticket-subject").textContent = t.subject;
    document.getElementById("mmodal-ticket-meta").textContent = `Category: ${t.inquiry_category} • Submitted on ${t.created_at}`;

    const statusBadge = document.getElementById("mmodal-ticket-status-badge");
    statusBadge.textContent = t.status;
    const statusLower = (t.status || "").toLowerCase();
    statusBadge.className = "badge " + (statusLower === "resolved" ? "badge-green" : (statusLower === "awaiting user response" ? "badge-blue" : "badge-orange"));

    const prioBadge = document.getElementById("mmodal-ticket-priority-badge");
    prioBadge.textContent = `${t.priority} Priority`;
    prioBadge.className = "badge " + (t.priority === "High" || t.priority === "Urgent" ? "badge-orange" : "badge-secondary");

    // Tender info
    const tenderInfoBox = document.getElementById("mmodal-tender-info");
    if (t.related_tender_id && t.tender_name) {
      tenderInfoBox.style.display = "block";
      document.getElementById("mmodal-tender-name").textContent = `${t.tender_name} (${t.tender_category || ''})`;
    } else {
      tenderInfoBox.style.display = "none";
    }

    // Admin alert banner
    const adminAlert = document.getElementById("mmodal-admin-alert");
    if (statusLower === "awaiting user response") {
      adminAlert.style.display = "flex";
    } else {
      adminAlert.style.display = "none";
    }

    // Reply vs Resolved actions
    const replyBox = document.getElementById("mmodal-reply-box");
    const resolvedBox = document.getElementById("mmodal-resolved-box");
    if (statusLower === "resolved") {
      replyBox.style.display = "none";
      resolvedBox.style.display = "flex";
    } else {
      replyBox.style.display = "flex";
      resolvedBox.style.display = "none";
    }

    // Render conversation messages
    const thread = document.getElementById("mmodal-conversation-thread");
    thread.innerHTML = messages.map(m => {
      const isFromAdmin = (m.sender_role || "").toLowerCase() === "admin";
      const align = isFromAdmin ? "flex-start" : "flex-end";
      const bg = isFromAdmin ? "rgba(37, 99, 235, 0.05)" : "var(--bg-secondary)";
      const border = isFromAdmin ? "1px solid rgba(37, 99, 235, 0.25)" : "1px solid var(--border-color)";
      const senderLabel = isFromAdmin ? "TenderKart Central Admin" : (m.sender_name_cached || "You (Manager)");
      const badgeRole = isFromAdmin 
        ? `<span class="badge badge-orange" style="font-size: 0.65rem;">Central Admin</span>`
        : `<span class="badge badge-purple" style="font-size: 0.65rem; background: rgba(147, 51, 234, 0.1); color: #9333EA;">Manager</span>`;

      return `
        <div style="display: flex; flex-direction: column; align-items: ${align}; width: 100%;">
          <div style="max-width: 85%; background: ${bg}; border: ${border}; border-radius: 14px; padding: 12px 16px; display: flex; flex-direction: column; gap: 6px;">
            <div style="display: flex; justify-content: space-between; align-items: center; gap: 10px; font-size: 0.76rem; color: var(--text-muted); border-bottom: 1px solid var(--border-color); padding-bottom: 4px;">
              <div style="display: flex; align-items: center; gap: 6px;">
                <strong style="color: var(--text-primary); font-size: 0.82rem;">${senderLabel}</strong>
                ${badgeRole}
              </div>
              <span>${m.created_at || ''}</span>
            </div>
            <p style="font-size: 0.88rem; color: var(--text-primary); margin: 0; line-height: 1.5; white-space: pre-wrap;">${m.message_body}</p>
          </div>
        </div>
      `;
    }).join("");

    document.getElementById("manager-ticket-modal").style.display = "block";
    thread.scrollTop = thread.scrollHeight;
  } catch (err) {
    showToast("Error opening manager ticket modal", "error");
  }
};

window.closeManagerTicketModal = () => {
  const modal = document.getElementById("manager-ticket-modal");
  if (modal) modal.style.display = "none";
  currentManagerTicketId = null;
};

window.submitManagerReply = async () => {
  if (!currentManagerTicketId) return;
  const input = document.getElementById("mmodal-reply-input");
  const body = input ? input.value.trim() : "";
  if (!body) {
    showToast("Please enter a reply message", "warning");
    return;
  }

  const btn = document.getElementById("mmodal-send-btn");
  if (btn) { btn.disabled = true; btn.textContent = "Sending..."; }

  try {
    const res = await fetch(`${API_BASE}/inquiries/${currentManagerTicketId}/messages`, {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify({ message_body: body })
    });

    if (res.ok) {
      if (input) input.value = "";
      showToast("Reply dispatched to Central Admin", "success");
      await openManagerTicketModal(currentManagerTicketId);
      await fetchManagerHelpdesk();
    } else {
      const err = await res.json();
      showToast(err.message || "Could not send reply", "error");
    }
  } catch (e) {
    showToast("Network error sending reply", "error");
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = "Send Reply to Admin"; }
  }
};

window.reopenManagerCurrentTicket = async () => {
  if (!currentManagerTicketId) return;
  try {
    const res = await fetch(`${API_BASE}/inquiries/${currentManagerTicketId}/reopen`, {
      method: "PATCH",
      headers: getAuthHeaders()
    });

    if (res.ok) {
      showToast("Ticket has been reopened", "success");
      await openManagerTicketModal(currentManagerTicketId);
      await fetchManagerHelpdesk();
    } else {
      showToast("Could not reopen ticket", "error");
    }
  } catch (e) {
    showToast("Network error reopening ticket", "error");
  }
};

/* ---------------- SHARED CONTACT & INQUIRY FORM ---------------- */
function initContactPage() {
  const form = document.getElementById("contact-form");
  if (!form) return;

  const user = JSON.parse(localStorage.getItem("user") || "null");
  const token = localStorage.getItem("token");

  const orgInput = document.getElementById("contact-org");
  const nameInput = document.getElementById("contact-name");
  const emailInput = document.getElementById("contact-email");
  const roleInput = document.getElementById("contact-role");
  const roleBadge = document.getElementById("contact-role-badge");
  const tenderInput = document.getElementById("contact-tender-id");

  // Prefill authenticated user profile
  if (user) {
    const roleLower = (user.role || "").toLowerCase();
    const roleDisplay = roleLower === "admin" ? "Admin" : (roleLower === "manager" ? "Manager" : "Contractor");

    if (roleInput) roleInput.value = roleDisplay;
    if (roleBadge) roleBadge.textContent = `${roleDisplay} Portal Helpdesk`;

    if (nameInput) {
      nameInput.value = user.name || user.username || "";
      nameInput.readOnly = true;
      nameInput.style.backgroundColor = "var(--bg-secondary)";
    }

    if (emailInput) {
      emailInput.value = user.email || "";
      emailInput.readOnly = true;
      emailInput.style.backgroundColor = "var(--bg-secondary)";
    }

    if (orgInput) {
      if (roleLower === "contractor") {
        orgInput.value = user.company || "";
      } else if (roleLower === "manager") {
        orgInput.value = user.department || "Municipal Department";
      } else {
        orgInput.value = user.department || user.company || "TenderKart Administration";
      }
    }
  } else {
    if (roleBadge) roleBadge.textContent = "General Helpdesk Inquiry";
  }

  // Check URL query parameters for related tender prefill: ?tenderId=123
  const urlParams = new URLSearchParams(window.location.search);
  const paramTenderId = urlParams.get("tenderId") || urlParams.get("id");
  if (paramTenderId && tenderInput) {
    tenderInput.value = paramTenderId;
  }

  // Handle form submission
  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    if (!token) {
      showToast("Please log in as a contractor or manager to submit helpdesk inquiries", "warning");
      setTimeout(() => { window.location.href = "login.html"; }, 1500);
      return;
    }

    const org = orgInput ? orgInput.value.trim() : "";
    const name = nameInput ? nameInput.value.trim() : "";
    const email = emailInput ? emailInput.value.trim() : "";
    const category = document.getElementById("contact-category") ? document.getElementById("contact-category").value : "";
    const tenderId = tenderInput ? tenderInput.value.trim() : "";
    const phone = document.getElementById("contact-phone") ? document.getElementById("contact-phone").value.trim() : "";
    const subject = document.getElementById("contact-subject") ? document.getElementById("contact-subject").value.trim() : "";
    const message = document.getElementById("contact-message") ? document.getElementById("contact-message").value.trim() : "";

    if (!org || !name || !email || !category || !subject || !message) {
      showToast("Please fill in all required fields", "warning");
      return;
    }

    const submitBtn = document.getElementById("contact-submit-btn") || form.querySelector("button[type='submit']");
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.innerHTML = `<span>Submitting to Admin Helpdesk...</span>`;
    }

    try {
      const res = await fetch(`${API_BASE}/inquiries`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          organization_name: org,
          inquiry_category: category,
          related_tender_id: tenderId ? parseInt(tenderId, 10) : null,
          contact_number: phone || null,
          subject,
          description: message
        })
      });

      const data = await res.json();

      if (res.ok) {
        // Show success banner with generated ticket number
        const banner = document.getElementById("contact-success-banner");
        const headerEl = document.getElementById("success-ticket-header");
        const msgEl = document.getElementById("success-ticket-msg");
        const viewBtn = document.getElementById("success-view-ticket-btn");

        if (headerEl) headerEl.textContent = `Inquiry Ticket ${data.ticket_number} Registered`;
        if (msgEl) {
          msgEl.textContent = `Your inquiry has been stored and routed to the TenderKart Central Admin. Replies and status updates will appear in your dashboard.`;
        }

        if (viewBtn) {
          const roleLower = user ? (user.role || "").toLowerCase() : "contractor";
          viewBtn.href = (roleLower === "admin" || roleLower === "manager") ? "admin.html?tab=helpdesk" : "dashboard.html?tab=helpdesk";
        }

        form.style.display = "none";
        if (banner) banner.style.display = "block";

        showToast(`Helpdesk inquiry ${data.ticket_number} registered successfully!`, "success");
        form.reset();
      } else {
        showToast(data.message || "Failed to submit inquiry", "error");
      }
    } catch (err) {
      showToast("Network connection error. Please try again.", "error");
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.innerHTML = `
          <span>Submit Inquiry to Admin Helpdesk</span>
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
        `;
      }
    }
  });
}
