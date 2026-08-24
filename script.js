const PUBLIC_CONFIG_DEFAULTS = {
  SITE_NAME: "FLOW-NET",
  SITE_URL: "https://flow-net-pro.up.railway.app",
  CONTACT_EMAIL: "info@flow-net.co.za",
  SALES_EMAIL: "sales@flow-net.co.za",
  CONTACT_PHONE: "+27659821883",
  CONTACT_PHONE_LABEL: "065 982 1883 (WhatsApp)",
  PROJECT_ONE_NAME: "COLD CALLER",
  PROJECT_ONE_TYPE: "Cold calling dashboard",
  PROJECT_ONE_STATUS: "Live app",
  PROJECT_ONE_SUMMARY: "Agent login, lead queue, call outcomes, and live stats for outbound calling teams. Built for speed and tracking.",
  PROJECT_ONE_META_LABEL: "Live at",
  PROJECT_ONE_META_VALUE: "cold-caller-demo.up.railway.app",
  PROJECT_ONE_CTA_LABEL: "Open COLD CALLER",
  PROJECT_ONE_URL: "https://cold-caller-demo.up.railway.app/",
  PROJECT_ONE_THUMBNAIL_URL: "assets/cold-caller-preview.png",
  PROJECT_TWO_NAME: "THE BAKERY",
  PROJECT_TWO_TYPE: "Bakery showcase",
  PROJECT_TWO_STATUS: "Live demo",
  PROJECT_TWO_SUMMARY: "Bakery website demo with a menu-first layout, warm brand storytelling, and beautiful product presentation.",
  PROJECT_TWO_META_LABEL: "Live at",
  PROJECT_TWO_META_VALUE: "bakery-demo.up.railway.app",
  PROJECT_TWO_CTA_LABEL: "Open THE BAKERY",
  PROJECT_TWO_URL: "https://bakery-demo.up.railway.app/",
  PROJECT_TWO_THUMBNAIL_URL: "assets/bakery-preview.png",
  PROJECT_THREE_NAME: "DYNAMIC CV",
  PROJECT_THREE_TYPE: "Resume editor",
  PROJECT_THREE_STATUS: "Live app",
  PROJECT_THREE_SUMMARY: "Dynamic CV editor for creating, editing and publishing professional curriculum vitae with live preview and export.",
  PROJECT_THREE_META_LABEL: "Live at",
  PROJECT_THREE_META_VALUE: "dynamic-cv-demo.up.railway.app",
  PROJECT_THREE_CTA_LABEL: "Open DYNAMIC CV",
  PROJECT_THREE_URL: "https://dynamic-cv-demo.up.railway.app/",
  PROJECT_THREE_THUMBNAIL_URL: "assets/dynamic-cv-preview.png",
  PROJECT_FOUR_NAME: "LOMBICOR",
  PROJECT_FOUR_TYPE: "Business management tool",
  PROJECT_FOUR_STATUS: "Live app",
  PROJECT_FOUR_SUMMARY: "Lombicor is a lean business management tool built to streamline operations, track activity, and keep teams aligned.",
  PROJECT_FOUR_META_LABEL: "Live at",
  PROJECT_FOUR_META_VALUE: "lombicor-demo.up.railway.app",
  PROJECT_FOUR_CTA_LABEL: "Open LOMBICOR",
  PROJECT_FOUR_URL: "https://lombicor-demo.up.railway.app/",
  PROJECT_FOUR_THUMBNAIL_URL: "assets/lombicor-preview.png",
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
  const category = app.category ? `<p class="project-meta"><strong>Category</strong>: ${escapeHtml(app.category)}</p>` : "";
  const loginDetails = app.loginDetails ? `<p class="project-meta"><strong>Login</strong>: ${escapeHtml(app.loginDetails)}</p>` : "";
  const reviewSummary = app.reviewCount > 0
    ? `${Number(app.averageRating || 0).toFixed(1)} ★ · ${app.reviewCount} review${app.reviewCount === 1 ? "" : "s"}`
    : "No reviews yet";
  const reviewsMarkup = Array.isArray(app.reviews) && app.reviews.length > 0
    ? app.reviews.slice(0, 2).map((review) => `
        <div class="review-item">
          <p class="review-headline">${escapeHtml(review.reviewer || "Guest")} · ${Number(review.rating || 0)}★</p>
          <p>${escapeHtml(review.comment || "Great experience.")}</p>
        </div>
      `).join("")
    : '<div class="review-item"><p class="review-headline">Sample review</p><p>Mock feedback will appear here until a visitor adds their own.</p></div>';
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
      ${category}
      ${loginDetails}
      <p class="project-meta"><strong>Reviews</strong>: ${escapeHtml(reviewSummary)}</p>
      <div class="review-list">${reviewsMarkup}</div>
      <p class="project-meta"><strong>Added</strong>: ${createdAt || "Recently"}</p>
      <a class="text-link" href="${liveUrl}" target="_blank" rel="noreferrer">Open live app</a>
      <form class="review-form" data-review-form data-publish-id="${escapeHtml(app.publishId || "")}">
        <div class="form-field">
          <span>Your name</span>
          <input name="reviewer" placeholder="Your name" />
        </div>
        <div class="form-field">
          <span>Rating</span>
          <select name="rating">
            <option value="5">5 ★</option>
            <option value="4">4 ★</option>
            <option value="3">3 ★</option>
            <option value="2">2 ★</option>
            <option value="1">1 ★</option>
          </select>
        </div>
        <div class="form-field">
          <span>Review</span>
          <textarea name="comment" rows="3" placeholder="Tell others what stood out."></textarea>
        </div>
        <button class="button button-primary" type="submit">Leave review</button>
        <p class="form-status" data-review-status hidden></p>
      </form>
    </article>
  `;
}

function attachReviewForms() {
  document.querySelectorAll("[data-review-form]").forEach((form) => {
    if (form.dataset.bound === "true") {
      return;
    }

    form.dataset.bound = "true";
    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      const submitButton = form.querySelector('[type="submit"]');
      const status = form.querySelector("[data-review-status]");
      const publishId = form.dataset.publishId || "";
      const reviewer = (form.querySelector('[name="reviewer"]').value || "").trim();
      const rating = Number(form.querySelector('[name="rating"]').value || 0);
      const comment = (form.querySelector('[name="comment"]').value || "").trim();

      if (!publishId) {
        if (status) {
          status.hidden = false;
          status.dataset.state = "error";
          status.textContent = "This app is not ready for reviews yet.";
        }
        return;
      }

      if (submitButton) {
        submitButton.disabled = true;
        submitButton.textContent = "Posting...";
      }

      try {
        const response = await fetch("/api/review", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ publishId, reviewer, rating, comment }),
        });
        const payload = await response.json().catch(() => ({}));

        if (!response.ok || payload.ok === false) {
          throw new Error(payload.error || "Review could not be saved.");
        }

        form.reset();
        if (status) {
          status.hidden = false;
          status.dataset.state = "success";
          status.textContent = "Thanks. Your review has been added.";
        }
        renderLiveApps();
      } catch (error) {
        if (status) {
          status.hidden = false;
          status.dataset.state = "error";
          status.textContent = error.message || "Something went wrong.";
        }
      } finally {
        if (submitButton) {
          submitButton.disabled = false;
          submitButton.textContent = "Leave review";
        }
      }
    });
  });
}

async function renderLiveApps() {
  const target = document.getElementById("live-apps-list") || document.getElementById("portfolio-apps-list");
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
          <p>Add a live URL and thumbnail and it will show up here automatically.</p>
          <a class="button button-primary" href="contact.html#start-project-form">Contact us</a>
        </article>
      `;
      return;
    }

    target.innerHTML = apps.map(renderAppCard).join("");
    attachReviewForms();
  } catch (error) {
    target.innerHTML = `
      <article class="surface-card project-card empty-state-card">
        <p class="eyebrow">Load issue</p>
        <h3>We could not load the live app list.</h3>
        <p>Please try again in a moment or add a live URL and thumbnail.</p>
        <a class="button button-primary" href="contact.html#start-project-form">Contact us</a>
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
