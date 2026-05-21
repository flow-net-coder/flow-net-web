const publicConfigDefaults = {
  SITE_NAME: 'FLOW-NET',
  SITE_URL: 'https://flow-net.up.railway.app',
  CONTACT_EMAIL: 'hello@flow-net.dev',
  CONTACT_PHONE: '+27650000000',
  CONTACT_PHONE_LABEL: '+27 65 000 0000',
  PROJECT_ONE_NAME: 'AAA',
  PROJECT_ONE_TYPE: 'Horse race predictor app',
  PROJECT_ONE_STATUS: 'Live demo',
  PROJECT_ONE_SUMMARY: 'AI-powered South African horse race predictor with live race sync, guided analysis, and an installable race-day dashboard.',
  PROJECT_ONE_META_LABEL: 'Focus',
  PROJECT_ONE_META_VALUE: 'predictions, race cards, live insights',
  PROJECT_ONE_CTA_LABEL: 'Try AAA',
  PROJECT_ONE_URL: 'https://aaa-demo-url.up.railway.app',
  PROJECT_TWO_NAME: 'PIZZA_SHOP',
  PROJECT_TWO_TYPE: 'Pizza ordering app',
  PROJECT_TWO_STATUS: 'Live demo',
  PROJECT_TWO_SUMMARY: 'Pizza shop ordering app with menu browsing, delivery zones, cart flow, and Railway-backed checkout handling.',
  PROJECT_TWO_META_LABEL: 'Focus',
  PROJECT_TWO_META_VALUE: 'menu, delivery, checkout',
  PROJECT_TWO_CTA_LABEL: 'Try PIZZA_SHOP',
  PROJECT_TWO_URL: 'https://pizza-shop-demo-url.up.railway.app',
  PROJECT_THREE_NAME: 'THE_BAKERY',
  PROJECT_THREE_TYPE: 'Bakery showcase',
  PROJECT_THREE_STATUS: 'Demo build',
  PROJECT_THREE_SUMMARY: 'Bakery website demo with a menu-first layout, warm brand storytelling, and a presentation style made for local food businesses.',
  PROJECT_THREE_META_LABEL: 'Focus',
  PROJECT_THREE_META_VALUE: 'brand, menu, local presence',
  PROJECT_THREE_CTA_LABEL: 'View THE_BAKERY',
  PROJECT_THREE_URL: 'https://the-bakery-demo-url.up.railway.app',
  PROJECT_FOUR_NAME: 'LOMBICOR_RECRUITMENT',
  PROJECT_FOUR_TYPE: 'Recruitment portal',
  PROJECT_FOUR_STATUS: 'Live on Railway',
  PROJECT_FOUR_SUMMARY: 'Recruitment portal with applicant intake, document uploads, admin review, and placement workflow.',
  PROJECT_FOUR_META_LABEL: 'Focus',
  PROJECT_FOUR_META_VALUE: 'applicants, documents, admin review',
  PROJECT_FOUR_CTA_LABEL: 'Open LOMBICOR',
  PROJECT_FOUR_URL: 'https://lombicor-demo-url.up.railway.app',
  PROJECT_FIVE_NAME: 'DISJOINTED_SHOP',
  PROJECT_FIVE_TYPE: 'Storefront app',
  PROJECT_FIVE_STATUS: 'Live on Railway',
  PROJECT_FIVE_SUMMARY: 'Storefront and admin app with product catalog, account flow, cart, checkout, and order management.',
  PROJECT_FIVE_META_LABEL: 'Focus',
  PROJECT_FIVE_META_VALUE: 'catalog, orders, admin tools',
  PROJECT_FIVE_CTA_LABEL: 'Open DISJOINTED',
  PROJECT_FIVE_URL: 'https://disjointed-demo-url.up.railway.app',
};

const publicConfig = {
  ...publicConfigDefaults,
  ...(window.FLOW_NET_PUBLIC_CONFIG || {}),
};

const navToggle = document.querySelector('.nav-toggle');
const siteNav = document.querySelector('.site-nav');
const revealItems = document.querySelectorAll('[data-reveal]');
const yearTarget = document.getElementById('year');

function getPublicConfigValue(key) {
  return publicConfig[key] || '';
}

function applyPublicConfig() {
  document.querySelectorAll('[data-config-text]').forEach((element) => {
    const value = getPublicConfigValue(element.dataset.configText);
    if (value) {
      element.textContent = value;
    }
  });

  document.querySelectorAll('[data-config-href]').forEach((element) => {
    const value = getPublicConfigValue(element.dataset.configHref);
    if (!value) {
      return;
    }

    element.setAttribute('href', value);
    if (/^https?:\/\//i.test(value)) {
      element.setAttribute('target', '_blank');
      element.setAttribute('rel', 'noreferrer');
    }
  });

  document.querySelectorAll('[data-config-mailto]').forEach((element) => {
    const value = getPublicConfigValue(element.dataset.configMailto);
    if (value) {
      element.setAttribute('href', `mailto:${value}`);
    }
  });

  document.querySelectorAll('[data-config-tel]').forEach((element) => {
    const value = getPublicConfigValue(element.dataset.configTel);
    if (value) {
      element.setAttribute('href', `tel:${value}`);
    }
  });
}

applyPublicConfig();

if (yearTarget) {
  yearTarget.textContent = new Date().getFullYear();
}

if (navToggle && siteNav) {
  navToggle.addEventListener('click', () => {
    const expanded = navToggle.getAttribute('aria-expanded') === 'true';
    navToggle.setAttribute('aria-expanded', String(!expanded));
    siteNav.classList.toggle('open', !expanded);
  });

  siteNav.querySelectorAll('a').forEach((link) => {
    link.addEventListener('click', () => {
      navToggle.setAttribute('aria-expanded', 'false');
      siteNav.classList.remove('open');
    });
  });
}

if ('IntersectionObserver' in window && revealItems.length > 0) {
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('revealed');
          observer.unobserve(entry.target);
        }
      });
    },
    {
      threshold: 0.12,
      rootMargin: '0px 0px -24px 0px',
    }
  );

  revealItems.forEach((item) => observer.observe(item));
} else {
  revealItems.forEach((item) => item.classList.add('revealed'));
}
