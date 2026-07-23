const fs = require('fs');
const http = require('http');
const path = require('path');
const formidable = require('formidable');
const unzipper = require('unzipper');

const rootDir = __dirname;
const port = Number.parseInt(process.env.PORT || '3000', 10);

const PUBLIC_CONFIG_DEFAULTS = {
  SITE_NAME: 'FLOW-NET',
  SITE_URL: 'https://flow-net-pro.up.railway.app',
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

const WHATB_PROXY_TARGET = process.env.WHATB_PROXY_TARGET || '';
const WHATB_PROXY_PATH = process.env.WHATB_PROXY_PATH || '/whatb';
const publishedRoot = path.join(rootDir, 'published');

function ensurePublishedRoot() {
  if (!fs.existsSync(publishedRoot)) {
    fs.mkdirSync(publishedRoot, { recursive: true });
  }
}

function safeName(value) {
  return String(value || 'app')
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '') || 'app';
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
    const form = new formidable.IncomingForm({ multiples: false, keepExtensions: true });
    ensurePublishedRoot();

    form.parse(req, async (err, fields, files) => {
      if (err) {
        res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ ok: false, error: err.message }));
        return;
      }

      const appName = safeName(fields.app_name || fields.appName || 'app');
      const publishId = `${appName}-${Date.now()}`;
      const destination = path.join(publishedRoot, publishId);
      const codeFile = files.code_bundle || files.codeBundle;
      const envFile = files.env_file || files.envFile;

      if (!codeFile || codeFile.size === 0) {
        res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ ok: false, error: 'A code bundle zip file is required.' }));
        return;
      }

      if (!envFile || envFile.size === 0) {
        res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ ok: false, error: '.env upload is required.' }));
        return;
      }

      fs.mkdirSync(destination, { recursive: true });

      const envTargetPath = path.join(destination, '.env');
      fs.copyFileSync(envFile.filepath || envFile.path, envTargetPath);

      const publishMeta = {
        appName,
        publishId,
        description: String(fields.description || fields.notes || '').trim(),
        createdAt: new Date().toISOString(),
        liveUrl: `/live/${publishId}/`,
      };

      const metaTargetPath = path.join(destination, 'meta.json');
      fs.writeFileSync(metaTargetPath, JSON.stringify(publishMeta, null, 2));

      const zipStream = fs.createReadStream(codeFile.filepath || codeFile.path).pipe(unzipper.Parse());
      let unzipError = null;
      for await (const entry of zipStream) {
        const target = normalizePublishedPath(destination, entry.path);
        if (!target) {
          unzipError = new Error('Zip contains unsafe file paths.');
          entry.autodrain();
          continue;
        }

        if (entry.type === 'Directory') {
          fs.mkdirSync(target, { recursive: true });
          entry.autodrain();
          continue;
        }

        fs.mkdirSync(path.dirname(target), { recursive: true });
        await new Promise((resolve, reject) => {
          const writeStream = fs.createWriteStream(target);
          entry.pipe(writeStream);
          writeStream.on('finish', resolve);
          writeStream.on('error', reject);
        });
      }

      if (unzipError) {
        res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ ok: false, error: unzipError.message }));
        return;
      }

      const liveUrl = publishMeta.liveUrl;
      res.writeHead(201, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ ok: true, liveUrl, publishId, appName, description: publishMeta.description }));
    });

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
      apps.push({
        publishId: item.name,
        appName: meta?.appName || item.name,
        description: meta?.description || '',
        createdAt: meta?.createdAt || fs.statSync(appFolder).ctime.toISOString(),
        liveUrl: meta?.liveUrl || `/live/${item.name}/`,
      });
    }

    apps.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ ok: true, apps }));
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

server.listen(port, () => {
  console.log(`FLOW-NET site running on http://127.0.0.1:${port}`);
});
