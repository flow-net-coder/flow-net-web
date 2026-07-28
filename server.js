const fs = require('fs');
const http = require('http');
const path = require('path');
const child_process = require('child_process');

const rootDir = __dirname;
const port = Number.parseInt(process.env.PORT || '3000', 10);

const PUBLIC_CONFIG_DEFAULTS = {
  SITE_NAME: 'FLOW-NET',
  SITE_URL: '',
  CONTACT_EMAIL: 'hello@flow-net.dev',
  CONTACT_PHONE: '+27650000000',
  CONTACT_PHONE_LABEL: '+27 65 000 0000',
  PROJECT_ONE_NAME: 'Your first app',
  PROJECT_ONE_TYPE: 'Live app slot',
  PROJECT_ONE_STATUS: 'Ready to connect',
  PROJECT_ONE_SUMMARY: 'Drop in a live app URL, thumbnail, and a short description when you are ready.',
  PROJECT_ONE_META_LABEL: 'Status',
  PROJECT_ONE_META_VALUE: 'Waiting for your URL',
  PROJECT_ONE_CTA_LABEL: 'Add your app',
  PROJECT_ONE_URL: '',
  PROJECT_TWO_NAME: 'Your second app',
  PROJECT_TWO_TYPE: 'Live app slot',
  PROJECT_TWO_STATUS: 'Ready to connect',
  PROJECT_TWO_SUMMARY: 'Use this slot for another public app, a client showcase, or a product demo.',
  PROJECT_TWO_META_LABEL: 'Status',
  PROJECT_TWO_META_VALUE: 'Waiting for your URL',
  PROJECT_TWO_CTA_LABEL: 'Add your app',
  PROJECT_TWO_URL: '',
  PROJECT_THREE_NAME: 'Your third app',
  PROJECT_THREE_TYPE: 'Live app slot',
  PROJECT_THREE_STATUS: 'Ready to connect',
  PROJECT_THREE_SUMMARY: 'Keep the public list tidy while you add the apps you want visitors to open.',
  PROJECT_THREE_META_LABEL: 'Status',
  PROJECT_THREE_META_VALUE: 'Waiting for your URL',
  PROJECT_THREE_CTA_LABEL: 'Add your app',
  PROJECT_THREE_URL: '',
  PROJECT_FOUR_NAME: 'Your fourth app',
  PROJECT_FOUR_TYPE: 'Live app slot',
  PROJECT_FOUR_STATUS: 'Ready to connect',
  PROJECT_FOUR_SUMMARY: 'Another app slot for a live product, workflow tool, or customer-facing portal.',
  PROJECT_FOUR_META_LABEL: 'Status',
  PROJECT_FOUR_META_VALUE: 'Waiting for your URL',
  PROJECT_FOUR_CTA_LABEL: 'Add your app',
  PROJECT_FOUR_URL: '',
  PROJECT_FIVE_NAME: 'Your fifth app',
  PROJECT_FIVE_TYPE: 'Live app slot',
  PROJECT_FIVE_STATUS: 'Ready to connect',
  PROJECT_FIVE_SUMMARY: 'Use this final slot for your strongest live app or the next one you want to launch.',
  PROJECT_FIVE_META_LABEL: 'Status',
  PROJECT_FIVE_META_VALUE: 'Waiting for your URL',
  PROJECT_FIVE_CTA_LABEL: 'Add your app',
  PROJECT_FIVE_URL: '',
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

const ADMIN_PIN = process.env.ADMIN_BOOTSTRAP_PIN || '2026';

function isAdmin(req) {
  try {
    const u = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
    const pinQuery = u.searchParams.get('pin');
    if (pinQuery && pinQuery === String(ADMIN_PIN)) return true;
    const headerPin = String(req.headers['x-admin-pin'] || '');
    if (headerPin && headerPin === String(ADMIN_PIN)) return true;
    const cookieHeader = req.headers.cookie || '';
    const cookies = cookieHeader.split(';').map(c => c.trim()).filter(Boolean);
    for (const c of cookies) {
      const parts = c.split('=');
      if (parts[0] === 'admin_pin' && parts[1] === String(ADMIN_PIN)) return true;
    }
  } catch (e) {
    // ignore
  }
  return false;
}

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

const WHATB_PROXY_TARGET = process.env.WHATB_PROXY_TARGET || '';
const WHATB_PROXY_PATH = process.env.WHATB_PROXY_PATH || '/whatb';
const publishedRoot = path.join(rootDir, 'published');
const contactSubmissionsPath = path.join(rootDir, 'data', 'contact-submissions.json');

function ensurePublishedRoot() {
  if (!fs.existsSync(publishedRoot)) {
    fs.mkdirSync(publishedRoot, { recursive: true });
  }
}

function ensureDataRoot() {
  const dataRoot = path.dirname(contactSubmissionsPath);
  if (!fs.existsSync(dataRoot)) {
    fs.mkdirSync(dataRoot, { recursive: true });
  }
}

function safeName(value) {
  return String(value || 'app')
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '') || 'app';
}

function isValidHttpUrl(value) {
  try {
    const url = new URL(String(value).trim());
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

function parseRequestBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk) => { body += chunk.toString(); });
    req.on('end', () => resolve(body));
    req.on('error', reject);
  });
}

function parseBodyPayload(rawBody) {
  const body = String(rawBody || '').trim();
  if (!body) return {};
  try {
    return JSON.parse(body);
  } catch {
    return Object.fromEntries(new URLSearchParams(body));
  }
}

function readContactSubmissions() {
  ensureDataRoot();
  if (!fs.existsSync(contactSubmissionsPath)) return [];
  try {
    const parsed = JSON.parse(fs.readFileSync(contactSubmissionsPath, 'utf8'));
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveContactSubmission(submission) {
  ensureDataRoot();
  const submissions = readContactSubmissions();
  submissions.unshift(submission);
  fs.writeFileSync(contactSubmissionsPath, JSON.stringify(submissions, null, 2));
}

function computeReviewStats(reviews) {
  if (!Array.isArray(reviews) || reviews.length === 0) {
    return { averageRating: 0, reviewCount: 0 };
  }
  const sum = reviews.reduce((acc, review) => acc + (Number(review.rating) || 0), 0);
  const count = reviews.length;
  return { averageRating: Number((sum / count).toFixed(2)), reviewCount: count };
}

function normalizePublishedPath(base, entryPath) {
  const normalized = path.normalize(entryPath.replace(/^\/+/, ''));
  if (normalized.startsWith('..') || path.isAbsolute(normalized)) {
    return null;
  }
  return path.join(base, normalized);
}

function proxyToWhatb(req, res) {
  if (!WHATB_PROXY_TARGET) {
    res.writeHead(502, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('WHATB proxy target is not configured.');
    return;
  }

  const originalUrl = new URL(req.url || '/', 'http://localhost');
  const targetBase = new URL(WHATB_PROXY_TARGET);
  const proxyPath = originalUrl.pathname.startsWith(WHATB_PROXY_PATH)
    ? originalUrl.pathname.slice(WHATB_PROXY_PATH.length) || '/'
    : originalUrl.pathname;

  targetBase.pathname = path.posix.join(targetBase.pathname, proxyPath);
  targetBase.search = originalUrl.search;

  const proxyHeaders = { ...req.headers, host: targetBase.host };
  const requestFn = targetBase.protocol === 'https:' ? require('https').request : require('http').request;

  const proxyReq = requestFn(targetBase, {
    method: req.method,
    headers: proxyHeaders,
  }, (proxyRes) => {
    const responseHeaders = { ...proxyRes.headers };
    if (responseHeaders.location) {
      responseHeaders.location = String(responseHeaders.location).replace(
        targetBase.origin,
        WHATB_PROXY_PATH,
      );
    }

    res.writeHead(proxyRes.statusCode || 500, responseHeaders);
    proxyRes.pipe(res, { end: true });
  });

  proxyReq.on('error', (error) => {
    res.writeHead(502, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end(`WHATB proxy error: ${error.message}`);
  });

  req.pipe(proxyReq, { end: true });
}

function proxyToLocalHost(host, port, req, res, fallback) {
  const originalUrl = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
  const proxyPath = originalUrl.pathname.replace(/^\/live\/[A-Za-z0-9_-]+/, '') || '/';
  const target = `http://${host}:${port}${proxyPath}${originalUrl.search}`;

  const requestFn = target.startsWith('https:') ? require('https').request : require('http').request;
  const proxyReq = requestFn(target, {
    method: req.method,
    headers: { ...req.headers, host: `${host}:${port}` },
    timeout: 10000,
  }, (proxyRes) => {
    res.writeHead(proxyRes.statusCode || 500, { ...proxyRes.headers });
    proxyRes.pipe(res, { end: true });
  });

  let timedOut = false;
  proxyReq.on('timeout', () => {
    timedOut = true;
    try { proxyReq.abort(); } catch (e) {}
  });

  proxyReq.on('error', (error) => {
    console.error('Proxy to container error:', error && error.message ? error.message : error);
    if (fallback && typeof fallback === 'function') {
      fallback();
      return;
    }
    res.writeHead(502, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end(`Proxy error: ${error.message}`);
  });

  // If the request timed out, attempt fallback
  req.on('aborted', () => {
    if (timedOut && fallback && typeof fallback === 'function') {
      fallback();
    }
  });

  req.pipe(proxyReq, { end: true });
}

// Update lastAccess for a publishId when proxying to its container
function markPublishedLastAccess(publishId) {
  try {
    const metaPath = path.join(publishedRoot, publishId, 'meta.json');
    if (!fs.existsSync(metaPath)) return;
    const meta = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
    meta.lastAccess = new Date().toISOString();
    fs.writeFileSync(metaPath, JSON.stringify(meta, null, 2));
  } catch (e) {
    console.error('Failed to update lastAccess for', publishId, e);
  }
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
  // Block any paths containing dotfiles (e.g., /.env or /static/.secret)
  if (absolutePath.split(path.sep).some((p) => p.startsWith('.'))) {
    return null;
  }
  if (!absolutePath.startsWith(rootDir)) {
    return null;
  }

  if (!fs.existsSync(absolutePath) || fs.statSync(absolutePath).isDirectory()) {
    return null;
  }

  return absolutePath;
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
  const requestPath = decodeURIComponent(url.pathname);

  if (requestPath === '/api/health' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ ok: true, service: 'FLOW-NET', status: 'ready' }));
    return;
  }

  if (requestPath.startsWith(WHATB_PROXY_PATH)) {
    proxyToWhatb(req, res);
    return;
  }

  if (requestPath.startsWith('/live/')) {
    const livePath = requestPath.slice('/live/'.length);
    const segments = livePath.split('/').filter(Boolean);
    const appId = segments.shift();
    if (!appId) {
      res.writeHead(400, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Missing app ID.');
      return;
    }

    const publishFolder = path.join(publishedRoot, appId);
    const filePath = segments.length > 0 ? path.join(publishFolder, segments.join('/')) : path.join(publishFolder, 'index.html');
    const normalizedPath = path.normalize(filePath);

    // Block any attempts to access dotfiles inside published apps
    if (normalizedPath.split(path.sep).some((p) => p.startsWith('.'))) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Published app not found.');
      return;
    }
    // If this published app is running in a container, proxy to it
    try {
      const metaPath = path.join(publishFolder, 'meta.json');
      if (fs.existsSync(metaPath)) {
        const meta = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
        if (meta && meta.container && meta.container.hostPort) {
          // record access time for idle cleanup
          markPublishedLastAccess(appId);
          // fallback serves static file when proxy fails
          proxyToLocalHost('127.0.0.1', meta.container.hostPort, req, res, () => {
            try {
              if (fs.existsSync(normalizedPath) && !fs.statSync(normalizedPath).isDirectory()) {
                sendFile(res, normalizedPath);
                return;
              }
            } catch (e) {}
            res.writeHead(502, { 'Content-Type': 'text/plain; charset=utf-8' });
            res.end('Published app is unavailable.');
          });
          return;
        }
      }
    } catch (e) {
      console.error('Error reading meta for live app proxy:', e);
    }

    if (!normalizedPath.startsWith(publishFolder) || !fs.existsSync(normalizedPath)) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Published app not found.');
      return;
    }

    const stat = fs.statSync(normalizedPath);
    if (stat.isDirectory()) {
      const indexFile = path.join(normalizedPath, 'index.html');
      if (fs.existsSync(indexFile)) {
        sendFile(res, indexFile);
        return;
      }
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Directory index not found.');
      return;
    }

    sendFile(res, normalizedPath);
    return;
  }

  if (requestPath === '/api/publish' && req.method === 'POST') {
    ensurePublishedRoot();

    try {
      const rawBody = await parseRequestBody(req);
      const fields = Object.fromEntries(new URLSearchParams(rawBody));
      const appName = safeName(fields.app_name || fields.appName || 'app');
      const appUrl = String(fields.app_url || fields.appUrl || '').trim();
      const thumbnailUrl = String(fields.thumbnail_url || fields.thumbnailUrl || '').trim();
      const description = String(fields.description || fields.notes || '').trim();

      if (!appName) {
        res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ ok: false, error: 'App name is required.' }));
        return;
      }

      if (!isValidHttpUrl(appUrl)) {
        res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ ok: false, error: 'A valid app URL is required.' }));
        return;
      }

      if (thumbnailUrl && !isValidHttpUrl(thumbnailUrl)) {
        res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ ok: false, error: 'Thumbnail URL must be a valid http or https URL.' }));
        return;
      }

      const publishId = `${appName}-${Date.now()}`;
      const destination = path.join(publishedRoot, publishId);
      fs.mkdirSync(destination, { recursive: true });

      const publishMeta = {
        appName,
        publishId,
        appUrl: new URL(appUrl).href,
        thumbnailUrl: thumbnailUrl ? new URL(thumbnailUrl).href : '',
        description,
        createdAt: new Date().toISOString(),
        liveUrl: new URL(appUrl).href,
        reviews: [],
        averageRating: 0,
        reviewCount: 0,
      };

      const metaTargetPath = path.join(destination, 'meta.json');
      fs.writeFileSync(metaTargetPath, JSON.stringify(publishMeta, null, 2));

      res.writeHead(201, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ ok: true, liveUrl: publishMeta.liveUrl, publishId, appName, description }));
    } catch (publishError) {
      console.error('Publish error:', publishError);
      res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ ok: false, error: String(publishError.message || publishError) }));
    }

    return;
  }

  if (requestPath === '/api/live-apps' && req.method === 'GET') {
    ensurePublishedRoot();
    const apps = [];
    for (const item of fs.readdirSync(publishedRoot, { withFileTypes: true })) {
      if (!item.isDirectory()) {
        continue;
      }
      const appFolder = path.join(publishedRoot, item.name);
      const metaPath = path.join(appFolder, 'meta.json');
      let meta = null;
      if (fs.existsSync(metaPath)) {
        try {
          meta = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
        } catch {
          meta = null;
        }
      }
      const reviewCount = meta?.reviewCount || (Array.isArray(meta?.reviews) ? meta.reviews.length : 0);
    const averageRating = meta?.averageRating || 0;
    apps.push({
        publishId: item.name,
        appName: meta?.appName || item.name,
        description: meta?.description || '',
        createdAt: meta?.createdAt || fs.statSync(appFolder).ctime.toISOString(),
        liveUrl: meta?.liveUrl || `/live/${item.name}/`,
        appUrl: meta?.appUrl || meta?.liveUrl || `/live/${item.name}/`,
        thumbnailUrl: meta?.thumbnailUrl || '',
        reviewCount,
        averageRating,
      });
    }

    apps.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ ok: true, apps }));
    return;
  }

  if (requestPath === '/api/reviews' && req.method === 'GET') {
    const publishId = url.searchParams.get('publishId');
    if (!publishId) {
      res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ ok: false, error: 'publishId query is required.' }));
      return;
    }

    const metaPath = path.join(publishedRoot, publishId, 'meta.json');
    if (!fs.existsSync(metaPath)) {
      res.writeHead(404, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ ok: false, error: 'App not found.' }));
      return;
    }

    let meta;
    try {
      meta = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
    } catch (e) {
      res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ ok: false, error: 'Failed to read app metadata.' }));
      return;
    }

    const reviews = Array.isArray(meta.reviews) ? meta.reviews : [];
    const stats = computeReviewStats(reviews);
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ ok: true, reviews, averageRating: stats.averageRating, reviewCount: stats.reviewCount }));
    return;
  }

  if (requestPath === '/api/review' && req.method === 'POST') {
    try {
      const rawBody = await parseRequestBody(req);
      const data = parseBodyPayload(rawBody);
      const publishId = String(data.publishId || '').trim();
      const rating = Number(data.rating || 0);
      const comment = String(data.comment || '').trim();
      const reviewer = String(data.reviewer || 'Anonymous').trim() || 'Anonymous';

      if (!publishId) {
        res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ ok: false, error: 'publishId is required.' }));
        return;
      }

      if (!rating || rating < 1 || rating > 5) {
        res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ ok: false, error: 'Rating must be a number between 1 and 5.' }));
        return;
      }

      const metaPath = path.join(publishedRoot, publishId, 'meta.json');
      if (!fs.existsSync(metaPath)) {
        res.writeHead(404, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ ok: false, error: 'App not found.' }));
        return;
      }

      const meta = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
      meta.reviews = Array.isArray(meta.reviews) ? meta.reviews : [];
      const review = {
        reviewer,
        rating,
        comment,
        createdAt: new Date().toISOString(),
      };
      meta.reviews.push(review);
      const stats = computeReviewStats(meta.reviews);
      meta.averageRating = stats.averageRating;
      meta.reviewCount = stats.reviewCount;
      fs.writeFileSync(metaPath, JSON.stringify(meta, null, 2));

      res.writeHead(201, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ ok: true, review, averageRating: meta.averageRating, reviewCount: meta.reviewCount }));
    } catch (error) {
      res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ ok: false, error: String(error.message || error) }));
    }
    return;
  }

  if (requestPath === '/api/contact' && req.method === 'POST') {
    try {
      const rawBody = await parseRequestBody(req);
      const data = parseBodyPayload(rawBody);
      const name = String(data.name || '').trim();
      const email = String(data.email || '').trim();
      const phone = String(data.phone || '').trim();
      const company = String(data.company || '').trim();
      const projectType = String(data.project_type || data.projectType || '').trim();
      const message = String(data.message || data.project_idea || data.projectGoal || data.project_goal || '').trim();
      const timeline = String(data.timeline || '').trim();
      const additionalDetails = String(data.additional_details || data.additionalDetails || '').trim();

      if (!name || !email || !message) {
        res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ ok: false, error: 'Name, email, and message are required.' }));
        return;
      }

      const submission = {
        id: `${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
        name,
        email,
        phone,
        company,
        projectType,
        message,
        timeline,
        additionalDetails,
        createdAt: new Date().toISOString(),
      };

      saveContactSubmission(submission);

      res.writeHead(201, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({
        ok: true,
        message: 'Thanks. Your message has been received.',
        submission,
      }));
    } catch (error) {
      res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ ok: false, error: String(error.message || error) }));
    }
    return;
  }

  // Admin APIs for managing published app containers
  if (requestPath === '/admin' && req.method === 'GET') {
    const adminPath = path.join(rootDir, 'admin.html');
    if (fs.existsSync(adminPath)) {
      sendFile(res, adminPath);
      return;
    }
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Admin UI not found.');
    return;
  }

  // Admin login to set cookie
  if (requestPath === '/api/admin/login' && req.method === 'POST') {
    let body = '';
    req.on('data', (chunk) => { body += chunk.toString(); });
    req.on('end', () => {
      try {
        const data = JSON.parse(body || '{}');
        const pin = String(data.pin || '');
        if (pin !== String(ADMIN_PIN)) {
          res.writeHead(401, { 'Content-Type': 'application/json; charset=utf-8' });
          res.end(JSON.stringify({ ok: false, error: 'invalid pin' }));
          return;
        }

        // set a cookie valid for 1 day
        res.writeHead(200, {
          'Content-Type': 'application/json; charset=utf-8',
          'Set-Cookie': `admin_pin=${pin}; Path=/; Max-Age=${24*60*60}; HttpOnly=false`,
        });
        res.end(JSON.stringify({ ok: true }));
      } catch (e) {
        res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ ok: false, error: String(e.message || e) }));
      }
    });
    return;
  }

  if (requestPath === '/api/admin/apps' && req.method === 'GET') {
    if (!isAdmin(req)) {
      res.writeHead(401, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ ok: false, error: 'unauthorized' }));
      return;
    }
    ensurePublishedRoot();
    const apps = [];
    for (const item of fs.readdirSync(publishedRoot, { withFileTypes: true })) {
      if (!item.isDirectory()) continue;
      const appFolder = path.join(publishedRoot, item.name);
      const metaPath = path.join(appFolder, 'meta.json');
      let meta = null;
      if (fs.existsSync(metaPath)) {
        try {
          meta = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
        } catch {
          meta = null;
        }
      }

      let containerStatus = null;
      try {
        if (meta && meta.container && meta.container.name) {
          const inspect = child_process.execSync(`docker inspect -f '{{json .State}}' ${meta.container.name}`, { encoding: 'utf8' });
          containerStatus = JSON.parse(inspect);
        }
      } catch (e) {
        containerStatus = { error: String(e.message || e) };
      }

      apps.push({
        publishId: item.name,
        appName: meta?.appName || item.name,
        description: meta?.description || '',
        createdAt: meta?.createdAt || fs.statSync(appFolder).ctime.toISOString(),
        liveUrl: meta?.liveUrl || `/live/${item.name}/`,
        container: meta?.container || null,
        lastAccess: meta?.lastAccess || null,
        containerStatus,
      });
    }
    apps.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ ok: true, apps }));
    return;
  }

  if (requestPath === '/api/admin/stop' && req.method === 'POST') {
    if (!isAdmin(req)) {
      res.writeHead(401, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ ok: false, error: 'unauthorized' }));
      return;
    }
    let body = '';
    req.on('data', (chunk) => { body += chunk.toString(); });
    req.on('end', () => {
      try {
        const data = JSON.parse(body || '{}');
        const publishId = String(data.publishId || '').trim();
        if (!publishId) throw new Error('publishId required');
        const metaPath = path.join(publishedRoot, publishId, 'meta.json');
        if (!fs.existsSync(metaPath)) throw new Error('publishId not found');
        const meta = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
        if (meta.container && meta.container.name) {
          child_process.execSync(`docker stop ${meta.container.name}`, { stdio: 'ignore' });
          child_process.execSync(`docker rm ${meta.container.name}`, { stdio: 'ignore' });
          delete meta.container;
          fs.writeFileSync(metaPath, JSON.stringify(meta, null, 2));
        }
        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ ok: true }));
      } catch (e) {
        res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ ok: false, error: String(e.message || e) }));
      }
    });
    return;
  }

  if (requestPath === '/api/admin/logs' && req.method === 'GET') {
    if (!isAdmin(req)) {
      res.writeHead(401, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ ok: false, error: 'unauthorized' }));
      return;
    }
    const publishId = url.searchParams.get('publishId');
    if (!publishId) {
      res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ ok: false, error: 'publishId query required' }));
      return;
    }
    const metaPath = path.join(publishedRoot, publishId, 'meta.json');
    if (!fs.existsSync(metaPath)) {
      res.writeHead(404, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ ok: false, error: 'publishId not found' }));
      return;
    }
    const meta = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
    if (!meta.container || !meta.container.name) {
      res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ ok: false, error: 'No container for this app' }));
      return;
    }
    try {
      const logs = child_process.execSync(`docker logs --tail 200 ${meta.container.name}`, { encoding: 'utf8' });
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ ok: true, logs }));
    } catch (e) {
      res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ ok: false, error: String(e.message || e) }));
    }
    return;
  }

  if (requestPath === '/api/flow-net/actions' && req.method === 'GET') {
    const botAppId = url.searchParams.get('botAppId') || 'flow-net-main';
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({
      actions: [
        {
          actionId: 'flow-net.echo',
          label: 'Echo message',
          appAction: 'echo',
          description: 'Return the incoming message payload in a structured response.',
          enabled: true,
          requiresApproval: false,
        },
        {
          actionId: 'flow-net.notify',
          label: 'Send notification',
          appAction: 'notify',
          description: 'Send a simple notification payload to the FLOW-NET app.',
          enabled: true,
          requiresApproval: true,
        },
      ],
      botAppId,
    }));
    return;
  }

  if (requestPath === '/api/flow-net/webhook' && req.method === 'POST') {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
    });
    req.on('end', () => {
      let payload = {};
      try {
        payload = body ? JSON.parse(body) : {};
      } catch {
        payload = { raw: body };
      }

      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({
        ok: true,
        received: true,
        action: payload.action || 'unknown',
        appId: payload.appId || 'flow-net-main',
        message: 'FLOW-NET webhook received.',
      }));
    });
    return;
  }

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

// Periodic cleanup: stop containers idle for more than 30 minutes
setInterval(() => {
  try {
    ensurePublishedRoot();
    const now = Date.now();
    const idleMs = 30 * 60 * 1000; // 30 minutes
    for (const item of fs.readdirSync(publishedRoot, { withFileTypes: true })) {
      if (!item.isDirectory()) continue;
      const publishId = item.name;
      const metaPath = path.join(publishedRoot, publishId, 'meta.json');
      if (!fs.existsSync(metaPath)) continue;
      try {
        const meta = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
        const last = meta.lastAccess ? new Date(meta.lastAccess).getTime() : new Date(meta.createdAt || fs.statSync(path.join(publishedRoot, publishId)).ctime).getTime();
        if (meta.container && meta.container.name && now - last > idleMs) {
          try {
            child_process.execSync(`docker stop ${meta.container.name}`, { stdio: 'ignore' });
            child_process.execSync(`docker rm ${meta.container.name}`, { stdio: 'ignore' });
          } catch (e) {
            console.error('Failed to stop/remove idle container', meta.container.name, e);
          }
          delete meta.container;
          fs.writeFileSync(metaPath, JSON.stringify(meta, null, 2));
        }
      } catch (e) {
        console.error('Error checking published meta for cleanup', publishId, e);
      }
    }
  } catch (e) {
    console.error('Cleanup job failed', e);
  }
}, 5 * 60 * 1000);

const host = process.env.HOST || '0.0.0.0';

server.listen(port, host, () => {
  console.log(`FLOW-NET site running on http://${host}:${port}`);
});
