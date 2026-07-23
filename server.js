const fs = require('fs');
const http = require('http');
const path = require('path');
const formidable = require('formidable');
const unzipper = require('unzipper');
const child_process = require('child_process');

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

function proxyToLocalHost(host, port, req, res) {
  const originalUrl = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
  const proxyPath = originalUrl.pathname.replace(/^\/live\/[A-Za-z0-9_-]+/, '') || '/';
  const target = `http://${host}:${port}${proxyPath}${originalUrl.search}`;

  const requestFn = target.startsWith('https:') ? require('https').request : require('http').request;
  const proxyReq = requestFn(target, {
    method: req.method,
    headers: { ...req.headers, host: `${host}:${port}` },
  }, (proxyRes) => {
    res.writeHead(proxyRes.statusCode || 500, { ...proxyRes.headers });
    proxyRes.pipe(res, { end: true });
  });

  proxyReq.on('error', (error) => {
    res.writeHead(502, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end(`Proxy error: ${error.message}`);
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
          proxyToLocalHost('127.0.0.1', meta.container.hostPort, req, res);
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
    const form = new formidable.IncomingForm({ multiples: false, keepExtensions: true });
    ensurePublishedRoot();

    form.on('error', (error) => {
      console.error('Publish form error:', error);
    });

    form.parse(req, async (err, fields, files) => {
      if (err) {
        console.error('Publish parse error:', err);
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

      // Resolve uploaded file paths robustly across formidable versions.
      function resolveUploadedPath(file, depth = 0) {
        if (!file) return null;
        // Avoid deep recursion
        if (depth > 4) return null;

        // If it's an array-like or object with numeric keys, try entries
        if (Array.isArray(file)) {
          for (const f of file) {
            const p = resolveUploadedPath(f, depth + 1);
            if (p) return p;
          }
        }
        if (typeof file === 'object') {
          // numeric keys case: { '0': { ... } }
          const keys = Object.keys(file || {});
          const numericKey = keys.find((k) => /^\d+$/.test(k));
          if (numericKey) {
            const nested = file[numericKey];
            const p = resolveUploadedPath(nested, depth + 1);
            if (p) return p;
          }
        }

        if (typeof file === 'string') {
          if (fs.existsSync(file)) return file;
          return null;
        }

        if (file.filepath && fs.existsSync(file.filepath)) return file.filepath;
        if (file.path && fs.existsSync(file.path)) return file.path;
        if (file.filePath && fs.existsSync(file.filePath)) return file.filePath;

        // Buffer upload fallback
        if (file.buffer && Buffer.isBuffer(file.buffer) && file.originalFilename) {
          const tmp = path.join(require('os').tmpdir(), `upload-${Date.now()}-${safeName(file.originalFilename)}`);
          try {
            fs.writeFileSync(tmp, file.buffer);
            return tmp;
          } catch (e) {
            console.error('Failed to write buffer upload to tmp file', e);
            return null;
          }
        }

        // Try enumerating plausible props for strings pointing to paths
        for (const p of Object.keys(file || {})) {
          try {
            if (typeof file[p] === 'string' && (p.toLowerCase().includes('path') || p.toLowerCase().includes('file'))) {
              if (fs.existsSync(file[p])) return file[p];
            }
            // nested objects
            if (typeof file[p] === 'object') {
              const nested = resolveUploadedPath(file[p], depth + 1);
              if (nested) return nested;
            }
          } catch (e) {}
        }

        return null;
      }

      const envPath = resolveUploadedPath(envFile);
      const zipPath = resolveUploadedPath(codeFile);
      if (!envPath || !zipPath) {
        // Write a small diagnostic summary to tmp for debugging (no file contents)
        try {
          const diag = {
            time: new Date().toISOString(),
            envFileKeys: envFile ? Object.keys(envFile) : null,
            codeFileKeys: codeFile ? Object.keys(codeFile) : null,
            envFileSample: envFile && typeof envFile === 'object' ? summarizeFileObject(envFile) : null,
            codeFileSample: codeFile && typeof codeFile === 'object' ? summarizeFileObject(codeFile) : null,
          };
          const diagPath = path.join(require('os').tmpdir(), `flownet-upload-diag-${Date.now()}.json`);
          fs.writeFileSync(diagPath, JSON.stringify(diag, null, 2));
          console.error('Publish missing uploaded file paths', diag);
        } catch (e) {
          console.error('Failed writing upload diagnostic', e);
        }

        res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ ok: false, error: 'Uploaded files were not received correctly.' }));
        return;
      }

      function summarizeFileObject(obj) {
        const out = {};
        try {
          for (const k of Object.keys(obj || {})) {
            const v = obj[k];
            out[k] = { type: typeof v };
            if (v && typeof v === 'object') {
              out[k].keys = Object.keys(v).slice(0, 10);
            }
          }
        } catch (e) {}
        return out;
      }

      const cleanup = () => {
        if (fs.existsSync(destination)) {
          fs.rmSync(destination, { recursive: true, force: true });
        }
      };

      try {
        fs.mkdirSync(destination, { recursive: true });

        const envTargetPath = path.join(destination, '.env');
        fs.copyFileSync(envPath, envTargetPath);

        const publishMeta = {
          appName,
          publishId,
          description: String(fields.description || fields.notes || '').trim(),
          createdAt: new Date().toISOString(),
          liveUrl: `/live/${publishId}/`,
        };

        const metaTargetPath = path.join(destination, 'meta.json');
        fs.writeFileSync(metaTargetPath, JSON.stringify(publishMeta, null, 2));

        const zipStream = fs.createReadStream(zipPath).pipe(unzipper.Parse());
        zipStream.on('error', (error) => {
          throw error;
        });

        try {
          for await (const entry of zipStream) {
            const target = normalizePublishedPath(destination, String(entry.path || ''));
            if (!target) {
              entry.autodrain();
              throw new Error('Zip contains unsafe file paths.');
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
              entry.on('error', reject);
            });
          }
        } catch (unzipError) {
          cleanup();
          console.error('Publish unzip error:', unzipError);
          res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
          res.end(JSON.stringify({ ok: false, error: unzipError.message }));
          return;
        }

        // Attempt to build and run a Docker container for this app if Docker is available.
        try {
          child_process.execSync('docker version', { stdio: 'ignore' });
          const imageTag = `flownet-${publishId}`;
          const containerName = `flownet_${publishId}`;

          // Create a default Dockerfile if none is provided.
          const dockerfilePath = path.join(destination, 'Dockerfile');
          if (!fs.existsSync(dockerfilePath)) {
            if (fs.existsSync(path.join(destination, 'package.json'))) {
              // Node app Dockerfile
              fs.writeFileSync(
                dockerfilePath,
                `FROM node:20-alpine\nWORKDIR /app\nCOPY package*.json ./\nRUN npm ci --production || true\nCOPY . .\nEXPOSE 3000\nCMD ["sh","-c","npm start || node server.js || npx serve -s build -l 3000"]\n`
              );
            } else {
              // Static app Dockerfile (simple Python server)
              fs.writeFileSync(
                dockerfilePath,
                `FROM python:3.11-slim\nWORKDIR /app\nCOPY . .\nEXPOSE 3000\nCMD ["python3", "-m", "http.server", "3000"]\n`
              );
            }
          }

          // Build image (may take some time)
          child_process.execSync(`docker build -t ${imageTag} .`, { cwd: destination, stdio: 'ignore', timeout: 120000 });

          // Run container with random published host port mapping
          child_process.execSync(
            `docker run -d -P --name ${containerName} --env-file ${envTargetPath} --memory=256m --cpus=0.5 --restart=unless-stopped ${imageTag}`,
            { stdio: 'ignore', timeout: 30000 }
          );

          // Query mapped host port for container's 3000/tcp
          const portOutput = child_process.execSync(`docker port ${containerName} 3000`, { encoding: 'utf8' }).trim();
          let hostPort = null;
          if (portOutput) {
            const m = portOutput.match(/:(\d+)$/);
            if (m) hostPort = Number(m[1]);
          }

          if (hostPort) {
            publishMeta.container = { name: containerName, hostPort };
            fs.writeFileSync(metaTargetPath, JSON.stringify(publishMeta, null, 2));
          }
        } catch (dockerError) {
          console.error('Docker build/run skipped or failed:', dockerError && dockerError.message ? dockerError.message : dockerError);
        }

        const liveUrl = publishMeta.liveUrl;
        res.writeHead(201, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ ok: true, liveUrl, publishId, appName, description: publishMeta.description }));
      } catch (publishError) {
        cleanup();
        console.error('Publish error:', publishError);
        res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ ok: false, error: publishError.message }));
      }
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

server.listen(port, () => {
  console.log(`FLOW-NET site running on http://127.0.0.1:${port}`);
});
