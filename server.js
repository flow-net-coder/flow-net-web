const fs = require('fs');
const http = require('http');
const path = require('path');

const rootDir = __dirname;
const port = Number.parseInt(process.env.PORT || '3000', 10);

const PUBLIC_CONFIG_DEFAULTS = {
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

const mimeTypes = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.ico': 'image/x-icon',
  '.jpg': 'image/jpeg',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.txt': 'text/plain; charset=utf-8',
  '.zip': 'application/zip',
};

loadDotEnv(path.join(rootDir, '.env'));

function loadDotEnv(filePath) {
  if (!fs.existsSync(filePath)) {
    return;
  }

  const lines = fs.readFileSync(filePath, 'utf8').split(/\r?\n/);

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) {
      continue;
    }

    const separatorIndex = trimmed.indexOf('=');
    if (separatorIndex === -1) {
      continue;
    }

    const key = trimmed.slice(0, separatorIndex).trim();
    if (!key || process.env[key]) {
      continue;
    }

    let value = trimmed.slice(separatorIndex + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    process.env[key] = value;
  }
}

function getPublicConfig() {
  return Object.fromEntries(
    Object.entries(PUBLIC_CONFIG_DEFAULTS).map(([key, fallbackValue]) => [
      key,
      process.env[`PUBLIC_${key}`] || fallbackValue,
    ])
  );
}

function sendFile(res, filePath) {
  fs.readFile(filePath, (error, contents) => {
    if (error) {
      res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Internal server error');
      return;
    }

    const extension = path.extname(filePath).toLowerCase();
    const contentType = mimeTypes[extension] || 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': contentType });
    res.end(contents);
  });
}

function resolveStaticFile(requestPath) {
  let targetPath = requestPath === '/' ? '/index.html' : requestPath;

  if (!path.extname(targetPath)) {
    const htmlCandidate = `${targetPath}.html`;
    if (fs.existsSync(path.join(rootDir, htmlCandidate))) {
      targetPath = htmlCandidate;
    }
  }

  const absolutePath = path.normalize(path.join(rootDir, targetPath));
  if (!absolutePath.startsWith(rootDir)) {
    return null;
  }

  if (!fs.existsSync(absolutePath) || fs.statSync(absolutePath).isDirectory()) {
    return null;
  }

  return absolutePath;
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
  const requestPath = decodeURIComponent(url.pathname);

  if (requestPath === '/config.js') {
    const payload = `window.FLOW_NET_PUBLIC_CONFIG = ${JSON.stringify(getPublicConfig(), null, 2)};`;
    res.writeHead(200, {
      'Cache-Control': 'no-store',
      'Content-Type': 'application/javascript; charset=utf-8',
    });
    res.end(payload);
    return;
  }

  const staticFile = resolveStaticFile(requestPath);
  if (!staticFile) {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Not found');
    return;
  }

  sendFile(res, staticFile);
});

server.listen(port, () => {
  console.log(`FLOW-NET site running on http://127.0.0.1:${port}`);
});
