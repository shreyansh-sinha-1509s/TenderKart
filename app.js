// TenderKart - Frontend Application Logic (app.js)
// Traditional student-friendly coding style

const API_BASE = "http://localhost:5000/api";

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
    return { label: "Closed", class: "badge-muted" };
  }
  
  const diffDays = Math.ceil((deadline - now) / (1000 * 60 * 60 * 24));
  if (diffDays <= 30) {
    return { label: "Closing Soon", class: "badge-orange" };
  }
  return { label: "Open", class: "badge-green" };
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
    const dashboardPage = user.role === "admin" ? "admin.html" : "dashboard.html";
    const dashboardLabel = user.role === "admin" ? "Admin" : "Dashboard";
    const dashboardIcon = user.role === "admin" 
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
    <footer style="background-color: var(--bg-secondary); color: var(--text-primary); border-top: 1px solid var(--border-color); padding: 4rem 0 2rem 0; margin-top: auto; transition: var(--transition-smooth);">
      <div class="container" style="display: grid; grid-template-columns: 2fr 1fr 1fr 1fr; gap: 4rem; padding-bottom: 3rem;" id="footer-grid">
        <!-- About / Brand Column -->
        <div style="display: flex; flex-direction: column; gap: 1.25rem;">
          <div style="display: flex; align-items: center; gap: 12px;">
            <img src="images/logo.jpg" alt="TenderKart Logo" style="height: 42px; width: 42px; border-radius: 8px; object-fit: cover;" />
            <div>
              <h3 style="font-size: 1.2rem; font-weight: 800; color: var(--color-primary); letter-spacing: -0.5px;">TenderKart</h3>
              <p style="font-size: 0.6rem; color: var(--text-muted); font-weight: 600; margin-top: -2px;">Urban Infrastructure Opportunities Tracker</p>
            </div>
          </div>
          <p style="font-size: 0.9rem; line-height: 1.6; color: var(--text-secondary); max-width: 320px;">
            Simplifying urban infrastructure discovery for businesses — smart tracking, dynamic categories, and AI-powered tender digests in one place.
          </p>
        </div>

        <!-- Column 2 (PRODUCT) -->
        <div style="display: flex; flex-direction: column; gap: 1.25rem;">
          <h4 style="font-size: 0.8rem; font-weight: 800; color: var(--text-primary); text-transform: uppercase; letter-spacing: 1px;">Product</h4>
          <ul style="list-style: none; display: flex; flex-direction: column; gap: 12px;">
            <li><a href="tenders.html" style="font-size: 0.9rem; color: var(--text-muted);">Browse Tenders</a></li>
            <li><a href="tenders.html" style="font-size: 0.9rem; color: var(--text-muted);">Search & Filter</a></li>
            <li><a href="tenders.html" style="font-size: 0.9rem; color: var(--text-muted);">AI Summary Digests</a></li>
            <li><a href="dashboard.html" style="font-size: 0.9rem; color: var(--text-muted);">Dashboard</a></li>
          </ul>
        </div>

        <!-- Column 3 (ACCOUNT) -->
        <div style="display: flex; flex-direction: column; gap: 1.25rem;">
          <h4 style="font-size: 0.8rem; font-weight: 800; color: var(--text-primary); text-transform: uppercase; letter-spacing: 1px;">Account</h4>
          <ul style="list-style: none; display: flex; flex-direction: column; gap: 12px;">
            <li><a href="login.html" style="font-size: 0.9rem; color: var(--text-muted);">Login</a></li>
            <li><a href="register.html" style="font-size: 0.9rem; color: var(--text-muted);">Register</a></li>
          </ul>
        </div>

        <!-- Column 4 (NAVIGATE) -->
        <div style="display: flex; flex-direction: column; gap: 1.25rem;">
          <h4 style="font-size: 0.8rem; font-weight: 800; color: var(--text-primary); text-transform: uppercase; letter-spacing: 1px;">Navigate</h4>
          <ul style="list-style: none; display: flex; flex-direction: column; gap: 12px;">
            <li><a href="index.html" style="font-size: 0.9rem; color: var(--text-muted);">← Home</a></li>
            <li><a href="tenders.html" style="font-size: 0.9rem; color: var(--text-muted);">Browse Tenders</a></li>
            <li><a href="about.html" style="font-size: 0.9rem; color: var(--text-muted);">About Us</a></li>
            <li><a href="contact.html" style="font-size: 0.9rem; color: var(--text-muted);">Contact Us</a></li>
          </ul>
        </div>
      </div>

      <!-- Bottom bar copyright and Back to Top link -->
      <div style="border-top: 1px solid var(--border-color); padding: 1.75rem 0 0.5rem 0;">
        <div class="container" style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px; font-size: 0.85rem; color: var(--text-muted);">
          <span>© 2026 TenderKart · Created by Shreyansh Sinha</span>
          <a href="#" style="color: var(--text-muted); font-weight: 500; font-size: 0.85rem; transition: var(--transition-smooth); display: inline-flex; align-items: center; gap: 4px;">← Back to Top</a>
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

  if (path === "dashboard.html" && (!user || user.role === "admin")) {
    alert("Please login first as contractor to access dashboard.");
    window.location.href = "login.html";
  }

  if (path === "admin.html" && (!user || user.role !== "admin")) {
    alert("Access denied. Admin authorization required.");
    window.location.href = "login.html";
  }

  if ((path === "login.html" || path === "register.html") && user) {
    window.location.href = user.role === "admin" ? "admin.html" : "dashboard.html";
  }
}

/* ---------------- HOMEPAGE LOGIC ---------------- */
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
      console.warn("Using fallback counts for demo illustration:", err.message);
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
    title: "NH-48 National Highway 6-Lane Expansion",
    department: "National Highways Authority of India (NHAI) • Gujarat-Maharashtra",
    value: "₹4,500 Cr",
    matchScore: "⚡ 99.2% Match",
    pipeline: "₹14,500+ Cr",
    categoryFilter: "Roads",
    image: "images/hero-roads.jpg"
  },
  {
    category: "METRO & TRANSIT",
    badgeClass: "badge-purple",
    title: "Metro Line 4 - Elevated Viaduct & 4 Stations",
    department: "MMRDA Urban Transit Board • Thane, Maharashtra",
    value: "₹6,800 Cr",
    matchScore: "⚡ 98.4% Match",
    pipeline: "₹18,200+ Cr",
    categoryFilter: "Metro Projects",
    image: "images/hero-metro.jpg"
  },
  {
    category: "GOVT BUILDINGS",
    badgeClass: "badge-orange",
    title: "Greenfield Integrated Govt Office Complex (IGOC)",
    department: "Central Public Works Department (CPWD) • New Delhi",
    value: "₹1,800 Cr",
    matchScore: "⚡ 97.6% Match",
    pipeline: "₹9,400+ Cr",
    categoryFilter: "Buildings",
    image: "images/hero-buildings.jpg"
  },
  {
    category: "BRIDGES & FLYOVERS",
    badgeClass: "badge-green",
    title: "Cable-Stayed Bridge Construction over Thane Creek",
    department: "Mumbai Metropolitan Region Dev Authority • Mumbai",
    value: "₹1,200 Cr",
    matchScore: "⚡ 96.8% Match",
    pipeline: "₹11,600+ Cr",
    categoryFilter: "Bridges",
    image: "images/hero-bridges.jpg"
  },
  {
    category: "WATER INFRASTRUCTURE",
    badgeClass: "badge-cyan",
    title: "100 MLD Centralized Water Treatment Plant",
    department: "Pune Municipal Corporation (PMC) • Pune, Maharashtra",
    value: "₹850 Cr",
    matchScore: "⚡ 95.9% Match",
    pipeline: "₹7,800+ Cr",
    categoryFilter: "Water Supply",
    image: "images/hero-water.jpg"
  },
  {
    category: "SMART CITY & ICCC",
    badgeClass: "badge-purple",
    title: "Smart City Integrated Command & Control Center (ICCC)",
    department: "Bhopal Smart City Development Corp • Bhopal",
    value: "₹420 Cr",
    matchScore: "⚡ 99.1% Match",
    pipeline: "₹15,100+ Cr",
    categoryFilter: "Smart City",
    image: "images/hero-smartcity.jpg"
  }
];

let currentHeroTenderIndex = 0;

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
    };
  }

  if (nextBtn) {
    nextBtn.onclick = (e) => {
      e.stopPropagation();
      changeHeroTender(1);
    };
  }

  // Keyboard navigation support (ArrowLeft / ArrowRight)
  window.addEventListener("keydown", (e) => {
    if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA" || e.target.tagName === "SELECT") return;
    if (e.key === "ArrowLeft") {
      changeHeroTender(-1);
    } else if (e.key === "ArrowRight") {
      changeHeroTender(1);
    }
  });
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

  // Initial Fetch
  await searchAndFilterTenders();

  // Attach search listeners
  const form = document.getElementById("search-form");
  if (form) {
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      searchAndFilterTenders();
    });
  }

  const resetBtn = document.getElementById("reset-filters");
  if (resetBtn) {
    resetBtn.addEventListener("click", () => {
      document.getElementById("search-input").value = "";
      document.getElementById("filter-category").value = "";
      document.getElementById("filter-location").value = "";
      document.getElementById("filter-department").value = "";
      document.getElementById("filter-minBudget").value = "";
      document.getElementById("filter-maxBudget").value = "";
      document.getElementById("filter-deadline").value = "";
      searchAndFilterTenders();
    });
  }
}

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

  const search = document.getElementById("search-input")?.value || "";
  const category = document.getElementById("filter-category")?.value || "";
  const location = document.getElementById("filter-location")?.value || "";
  const department = document.getElementById("filter-department")?.value || "";
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
    if (countBox) {
      countBox.innerHTML = `Found <strong>${data.length}</strong> active urban tenders matching your parameters`;
    }

    if (data.length === 0) {
      container.innerHTML = `
        <div style="grid-column: 1 / -1; display: flex; flex-direction: column; align-items: center; text-align: center; gap: 12px; padding: 4rem 2rem; background-color: var(--bg-card); border: 2px dashed var(--border-color); border-radius: 12px; margin-top: 2rem;">
          <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-shield-alert text-muted"><path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.8 17 5 19 5a1 1 0 0 1 1 1Z"/><path d="M12 8v4"/><path d="M12 16h.01"/></svg>
          <h3>No opportunities found</h3>
          <p>Try clearing your active filters or searching for another keyword.</p>
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
                <span style="display: block; font-size: 0.85rem; color: var(--text-primary); font-weight: 700;" title="${t.location}">${t.location.split(',')[0]}</span>
              </div>
            </div>
          </div>

          <div style="display: flex; justify-content: space-between; align-items: center; gap: 12px;">
            <span class="badge badge-green" style="display: inline-flex; align-items: center; gap: 4px; text-transform: none; font-size: 0.75rem;">
              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-calendar"><rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
              <span>Deadline: ${t.deadline}</span>
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
          <span class="badge ${status.class}">${status.label}</span>
        </div>
      `;
    }
    document.getElementById("tender-budget").textContent = formatBudget(t.budget);
    document.getElementById("tender-location").textContent = t.location;
    document.getElementById("tender-deadline").textContent = t.deadline;
    document.getElementById("tender-description").textContent = t.description;
    document.getElementById("tender-eligibility").textContent = t.eligibility;

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

    // Checking saved status to show bookmark button state
    checkSaveButtonState(tenderId);

  } catch (err) {
    showToast("Error connecting to server", "error");
  }
}

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
async function initDashboardPage() {
  const userJson = localStorage.getItem("user");
  const user = JSON.parse(userJson);

  document.getElementById("profile-name").textContent = user.username;
  document.getElementById("profile-email").textContent = `${user.email} • Contractor Workspace`;

  // Tabs navigation
  window.switchTab = (tabName) => {
    // Hide all contents
    document.getElementById("tab-saved").style.display = "none";
    document.getElementById("tab-notifications").style.display = "none";
    
    // De-activate sidebar btns
    document.getElementById("btn-saved").classList.remove("badge-blue");
    document.getElementById("btn-notifications").classList.remove("badge-blue");
    document.getElementById("btn-saved").style.backgroundColor = "transparent";
    document.getElementById("btn-notifications").style.backgroundColor = "transparent";
    document.getElementById("btn-saved").style.color = "var(--text-secondary)";
    document.getElementById("btn-notifications").style.color = "var(--text-secondary)";

    // Show active
    document.getElementById(`tab-${tabName}`).style.display = "block";
    const activeBtn = document.getElementById(`btn-${tabName}`);
    activeBtn.style.backgroundColor = "var(--color-primary)";
    activeBtn.style.color = "#FFFFFF";
  };

  switchTab("saved");
  await fetchDashboardData();
}

async function fetchDashboardData() {
  const token = localStorage.getItem("token");
  const headers = getAuthHeaders();

  try {
    // 1. Fetch Saved Tenders
    const savedRes = await fetch(`${API_BASE}/saved`, { headers });
    const savedTenders = await savedRes.json();
    
    document.getElementById("saved-count").textContent = savedTenders.length;
    const listContainer = document.getElementById("saved-list");
    
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

    // 2. Fetch Notifications
    const notifRes = await fetch(`${API_BASE}/users/notifications`, { headers });
    const notifications = await notifRes.json();
    
    const unread = notifications.filter(n => !n.read).length;
    document.getElementById("notif-count").textContent = unread;
    const notifContainer = document.getElementById("notifications-list");

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
        const unreadTag = n.read ? "" : `<span style="font-size: 0.65rem; font-weight: 700; color: #FFFFFF; background-color: var(--color-primary); padding: 2px 6px; borderRadius: 4px; text-transform: uppercase;">New</span>`;
        return `
          <div onclick="handleReadNotification(${n.id}, ${n.read})" style="display: flex; justify-content: space-between; align-items: flex-start; padding: 16px 20px; background-color: ${n.read ? 'var(--bg-secondary)' : 'rgba(var(--primary-rgb), 0.02)'}; border-radius: 12px; border: 1px solid ${n.read ? 'var(--border-color)' : 'rgba(var(--primary-rgb), 0.15)'}; transition: var(--transition-smooth); cursor: ${n.read ? 'default' : 'pointer'};">
            <div style="display: flex; gap: 12px; align-items: flex-start;">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="${n.read ? 'var(--text-muted)' : 'var(--color-primary)'}" stroke-width="2" style="margin-top: 2px; flex-shrink: 0;" class="lucide lucide-check-circle"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><path d="m9 11 3 3L22 4"/></svg>
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

  } catch (err) {
    showToast("Error updating workspace data", "error");
  }
}

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

  // Switch tabs
  window.switchAdminTab = (tabName) => {
    document.getElementById("admin-tab-stats").style.display = "none";
    document.getElementById("admin-tab-add").style.display = "none";
    document.getElementById("admin-tab-tenders").style.display = "none";
    document.getElementById("admin-tab-users").style.display = "none";

    document.getElementById("btn-admin-stats").style.backgroundColor = "transparent";
    document.getElementById("btn-admin-add").style.backgroundColor = "transparent";
    document.getElementById("btn-admin-tenders").style.backgroundColor = "transparent";
    document.getElementById("btn-admin-users").style.backgroundColor = "transparent";
    
    document.getElementById("btn-admin-stats").style.color = "var(--text-secondary)";
    document.getElementById("btn-admin-add").style.color = "var(--text-secondary)";
    document.getElementById("btn-admin-tenders").style.color = "var(--text-secondary)";
    document.getElementById("btn-admin-users").style.color = "var(--text-secondary)";

    document.getElementById(`admin-tab-${tabName}`).style.display = "block";
    const btn = document.getElementById(`btn-admin-${tabName}`);
    btn.style.backgroundColor = "var(--color-primary)";
    btn.style.color = "#FFFFFF";
  };

  switchAdminTab("stats");
  await fetchAdminWorkspace();
}

async function fetchAdminWorkspace() {
  const token = localStorage.getItem("token");
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

    // 2. Fetch Tenders list for table
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

    // 3. Fetch Contractor User accounts
    const usersRes = await fetch(`${API_BASE}/admin/users`, { headers });
    if (usersRes.ok) {
      const usersData = await usersRes.json();
      const usersTableBody = document.getElementById("admin-users-table");
      if (usersTableBody) {
        usersTableBody.innerHTML = usersData.map(u => `
          <tr style="border-bottom: 1px solid var(--border-color);">
            <td style="padding: 16px 20px; font-size: 0.85rem; color: var(--text-primary);">#${u.id}</td>
            <td style="padding: 16px 20px; font-size: 0.85rem; color: var(--text-primary);"><strong>${u.username}</strong></td>
            <td style="padding: 16px 20px; font-size: 0.85rem; color: var(--text-primary);">${u.email}</td>
            <td style="padding: 16px 20px; font-size: 0.85rem; color: var(--text-primary);"><span class="badge ${u.role === 'admin' ? 'badge-orange' : 'badge-green'}">${u.role}</span></td>
            <td style="padding: 16px 20px; font-size: 0.85rem; color: var(--text-primary);">${u.created_at.substring(0, 10)}</td>
          </tr>
        `).join("");
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

/* ---------------- CONTACT FORM ---------------- */
function initContactPage() {
  const form = document.getElementById("contact-form");
  if (!form) return;

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const name = document.getElementById("contact-name").value.trim();
    const email = document.getElementById("contact-email").value.trim();
    const message = document.getElementById("contact-message").value.trim();

    if (!name || !email || !message) {
      showToast("Please fill in required fields", "warning");
      return;
    }

    // Mock send success
    showToast("Thank you! Your inquiry has been sent to our GovTech team.", "success");
    form.reset();
  });
}
