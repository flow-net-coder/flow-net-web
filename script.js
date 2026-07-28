const PUBLIC_CONFIG_DEFAULTS = {
  SITE_NAME: "FLOW-NET",
  SITE_URL: "",
  CONTACT_EMAIL: "flow.net.v2@gmail.com",
  CONTACT_PHONE: "+27659821883",
  CONTACT_PHONE_LABEL: "065 982 1883 (WhatsApp)",
  PROJECT_ONE_NAME: "Cold Caller App",
  PROJECT_ONE_TYPE: "Cold caller dashboard",
  PROJECT_ONE_STATUS: "Live app",
  PROJECT_ONE_SUMMARY: "Agent login, lead queue, call outcomes, and stats for the DialFlow Pro cold-calling workflow.",
  PROJECT_ONE_META_LABEL: "Focus",
  PROJECT_ONE_META_VALUE: "Lead calling, agent stats, queue flow",
  PROJECT_ONE_CTA_LABEL: "Open app",
  PROJECT_ONE_URL: "https://coldcalle.up.railway.app/",
  PROJECT_ONE_THUMBNAIL_URL: "assets/cold-caller-preview.svg",
  PROJECT_TWO_NAME: "Your second app",
  PROJECT_TWO_TYPE: "Live app slot",
  PROJECT_TWO_STATUS: "Ready to connect",
  PROJECT_TWO_SUMMARY: "Use this slot for another public app, a client showcase, or a product demo.",
  PROJECT_TWO_META_LABEL: "Status",
  PROJECT_TWO_META_VALUE: "Waiting for your URL",
  PROJECT_TWO_CTA_LABEL: "Add your app",
  PROJECT_TWO_URL: "",
  PROJECT_THREE_NAME: "Your third app",
  PROJECT_THREE_TYPE: "Live app slot",
  PROJECT_THREE_STATUS: "Ready to connect",
  PROJECT_THREE_SUMMARY: "Keep the public list tidy while you add the apps you want visitors to open.",
  PROJECT_THREE_META_LABEL: "Status",
  PROJECT_THREE_META_VALUE: "Waiting for your URL",
  PROJECT_THREE_CTA_LABEL: "Add your app",
  PROJECT_THREE_URL: "",
  PROJECT_FOUR_NAME: "Your fourth app",
  PROJECT_FOUR_TYPE: "Live app slot",
  PROJECT_FOUR_STATUS: "Ready to connect",
  PROJECT_FOUR_SUMMARY: "Another app slot for a live product, workflow tool, or customer-facing portal.",
  PROJECT_FOUR_META_LABEL: "Status",
  PROJECT_FOUR_META_VALUE: "Waiting for your URL",
  PROJECT_FOUR_CTA_LABEL: "Add your app",
  PROJECT_FOUR_URL: "",
  PROJECT_FIVE_NAME: "Your fifth app",
  PROJECT_FIVE_TYPE: "Live app slot",
  PROJECT_FIVE_STATUS: "Ready to connect",
  PROJECT_FIVE_SUMMARY: "Use this final slot for your strongest live app or the next one you want to launch.",
  PROJECT_FIVE_META_LABEL: "Status",
  PROJECT_FIVE_META_VALUE: "Waiting for your URL",
  PROJECT_FIVE_CTA_LABEL: "Add your app",
  PROJECT_FIVE_URL: "",
};

const publicConfig = {
  ...PUBLIC_CONFIG_DEFAULTS,
  ...(window.FLOW_NET_PUBLIC_CONFIG || {}),
};

const navToggle = document.querySelector(".nav-toggle");
const siteNav = document.querySelector(".site-nav");
const revealItems = document.querySelectorAll("[data-reveal]");
const yearTarget = document.getElementById("year");

function getPublicConfigValue(key) {
  return publicConfig[key] || "";
}

function applyPublicConfig() {
  document.querySelectorAll("[data-config-text]").forEach((element) => {
    const value = getPublicConfigValue(element.dataset.configText);
    if (value) {
      element.textContent = value;
    }
  });

  document.querySelectorAll("[data-config-href]").forEach((element) => {
    const value = getPublicConfigValue(element.dataset.configHref);
    if (!value) {
      return;
    }

    element.setAttribute("href", value);
    if (/^https?:\/\//i.test(value)) {
      element.setAttribute("target", "_blank");
      element.setAttribute("rel", "noreferrer");
    } else {
      element.removeAttribute("target");
      element.removeAttribute("rel");
    }
  });

  document.querySelectorAll("[data-config-src]").forEach((element) => {
    const value = getPublicConfigValue(element.dataset.configSrc);
    if (value) {
      element.setAttribute("src", value);
    }
  });

  document.querySelectorAll("[data-config-mailto]").forEach((element) => {
    const value = getPublicConfigValue(element.dataset.configMailto);
    if (value) {
      element.setAttribute("href", `mailto:${value}`);
    }
  });

  document.querySelectorAll("[data-config-tel]").forEach((element) => {
    const value = getPublicConfigValue(element.dataset.configTel);
    if (value) {
      element.setAttribute("href", `tel:${value}`);
    }
  });
}

function applyNavigation() {
  if (!navToggle || !siteNav) {
    return;
  }

  navToggle.addEventListener("click", () => {
    const expanded = navToggle.getAttribute("aria-expanded") === "true";
    navToggle.setAttribute("aria-expanded", String(!expanded));
    siteNav.classList.toggle("open", !expanded);
  });

  siteNav.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", () => {
      navToggle.setAttribute("aria-expanded", "false");
      siteNav.classList.remove("open");
    });
  });
}

function applyRevealAnimations() {
  if ("IntersectionObserver" in window && revealItems.length > 0) {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("revealed");
            observer.unobserve(entry.target);
          }
        });
      },
      {
        threshold: 0.12,
        rootMargin: "0px 0px -24px 0px",
      }
    );

    revealItems.forEach((item) => observer.observe(item));
    return;
  }

  revealItems.forEach((item) => item.classList.add("revealed"));
}

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function setStatusMessage(form, message, kind = "success") {
  const status = form.querySelector("[data-form-status]");
  if (!status) {
    return;
  }

  status.textContent = message;
  status.dataset.state = kind;
  status.hidden = !message;
}

async function submitEnhancedForm(form) {
  const submitButton = form.querySelector('[type="submit"]');
  const originalLabel = submitButton ? submitButton.textContent : "";
  const action = form.getAttribute("action") || "";
  const method = (form.getAttribute("method") || "post").toUpperCase();
  const body = Object.fromEntries(new FormData(form).entries());

  if (submitButton) {
    submitButton.disabled = true;
    submitButton.textContent = "Sending...";
  }

  try {
    const response = await fetch(action, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok || payload.ok === false) {
      throw new Error(payload.error || `Request failed with status ${response.status}`);
    }

    form.reset();
    setStatusMessage(form, payload.message || "Thanks. Your message was sent.", "success");
  } catch (error) {
    setStatusMessage(form, error.message || "Something went wrong. Please try again.", "error");
  } finally {
    if (submitButton) {
      submitButton.disabled = false;
      submitButton.textContent = originalLabel;
    }
  }
}

function enhanceForms() {
  document.querySelectorAll("form[data-enhance='true']").forEach((form) => {
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      submitEnhancedForm(form);
    });
  });
}

function renderAppCard(app) {
  const title = escapeHtml(app.appName || "Untitled app");
  const description = escapeHtml(app.description || "No description provided yet.");
  const liveUrl = escapeHtml(app.liveUrl || app.appUrl || "#");
  const createdAt = app.createdAt ? new Date(app.createdAt).toLocaleDateString() : "";
  const thumbnail = app.thumbnailUrl
    ? `<img class="project-thumb" src="${escapeHtml(app.thumbnailUrl)}" alt="${title} preview" />`
    : "";

  return `
    <article class="surface-card project-card">
      ${thumbnail}
      <div class="project-topline">
        <p class="project-type">FLOW-NET app</p>
        <span class="project-status">Live</span>
      </div>
      <h3>${title}</h3>
      <p>${description}</p>
      <p class="project-meta"><strong>Added</strong>: ${createdAt || "Recently"}</p>
      <a class="text-link" href="${liveUrl}" target="_blank" rel="noreferrer">Open live app</a>
    </article>
  `;
}

async function renderLiveApps() {
  const target = document.getElementById("live-apps-list");
  if (!target) {
    return;
  }

  target.innerHTML = '<article class="surface-card project-card"><p>Loading live apps...</p></article>';

  try {
    const response = await fetch("/api/live-apps");
    const payload = await response.json();
    const apps = Array.isArray(payload.apps) ? payload.apps : [];

    if (!payload.ok || apps.length === 0) {
      target.innerHTML = `
        <article class="surface-card project-card empty-state-card">
          <p class="eyebrow">Nothing live yet</p>
          <h3>No apps have been added yet.</h3>
          <p>Add your first app in the contact form and it will show up here automatically.</p>
          <a class="button button-primary" href="contact.html#start-project-form">Add your app</a>
        </article>
      `;
      return;
    }

    target.innerHTML = apps.map(renderAppCard).join("");
  } catch (error) {
    target.innerHTML = `
      <article class="surface-card project-card empty-state-card">
        <p class="eyebrow">Load issue</p>
        <h3>We could not load the live app list.</h3>
        <p>Please try again in a moment or add apps from the contact form.</p>
        <a class="button button-primary" href="contact.html#start-project-form">Add your app</a>
      </article>
    `;
  }
}

function initPageSpecificFeatures() {
  const page = document.body.dataset.page;
  if (page === "live") {
    renderLiveApps();
  }
}

if (yearTarget) {
  yearTarget.textContent = new Date().getFullYear();
}

applyPublicConfig();
applyNavigation();
applyRevealAnimations();
enhanceForms();
initPageSpecificFeatures();
