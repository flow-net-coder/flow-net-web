const fs = require('fs');
const http = require('http');
const path = require('path');
const child_process = require('child_process');
const nodemailer = require('nodemailer');
const { getDb, schema } = require('./db');
const { eq } = require('drizzle-orm');

const rootDir = __dirname;
const port = Number.parseInt(process.env.PORT || '3000', 10);

const PUBLIC_CONFIG_DEFAULTS = {
  SITE_NAME: 'FLOW-NET',
  SITE_URL: '',
  CONTACT_EMAIL: 'info@flow-net.co.za',
  SALES_EMAIL: 'sales@flow-net.co.za',
  CONTACT_PHONE: '+27659821883',
  CONTACT_PHONE_LABEL: '065 982 1883 (WhatsApp)',
  PROJECT_ONE_NAME: 'COLD CALLER',
  PROJECT_ONE_TYPE: 'Cold calling dashboard',
  PROJECT_ONE_STATUS: 'Live app',
  PROJECT_ONE_SUMMARY: 'Agent login, lead queue, call outcomes, and live stats for outbound calling teams. Built for speed and tracking.',
  PROJECT_ONE_META_LABEL: 'Live at',
  PROJECT_ONE_META_VALUE: 'cold-caller-demo.up.railway.app',
  PROJECT_ONE_CTA_LABEL: 'Open COLD CALLER',
  PROJECT_ONE_URL: 'https://cold-caller-demo.up.railway.app/',
  PROJECT_ONE_THUMBNAIL_URL: 'assets/cold-caller-preview.png',
  PROJECT_TWO_NAME: 'THE BAKERY',
  PROJECT_TWO_TYPE: 'Bakery showcase',
  PROJECT_TWO_STATUS: 'Live demo',
  PROJECT_TWO_SUMMARY: 'Bakery website demo with a menu-first layout, warm brand storytelling, and beautiful product presentation.',
  PROJECT_TWO_META_LABEL: 'Live at',
  PROJECT_TWO_META_VALUE: 'bakery-demo.up.railway.app',
  PROJECT_TWO_CTA_LABEL: 'Open THE BAKERY',
  PROJECT_TWO_URL: 'https://bakery-demo.up.railway.app/',
  PROJECT_TWO_THUMBNAIL_URL: 'assets/bakery-preview.png',
  PROJECT_THREE_NAME: 'DYNAMIC CV',
  PROJECT_THREE_TYPE: 'Resume editor',
  PROJECT_THREE_STATUS: 'Live app',
  PROJECT_THREE_SUMMARY: 'Dynamic CV editor for creating, editing and publishing professional curriculum vitae with live preview and export.',
  PROJECT_THREE_META_LABEL: 'Live at',
  PROJECT_THREE_META_VALUE: 'dynamic-cv-demo.up.railway.app',
  PROJECT_THREE_CTA_LABEL: 'Open DYNAMIC CV',
  PROJECT_THREE_URL: 'https://dynamic-cv-demo.up.railway.app/',
  PROJECT_THREE_THUMBNAIL_URL: 'assets/dynamic-cv-preview.png',
  PROJECT_FOUR_NAME: 'LOMBICOR',
  PROJECT_FOUR_TYPE: 'Business management tool',
  PROJECT_FOUR_STATUS: 'Live app',
  PROJECT_FOUR_SUMMARY: 'Lombicor is a lean business management tool built to streamline operations, track activity, and keep teams aligned.',
  PROJECT_FOUR_META_LABEL: 'Live at',
  PROJECT_FOUR_META_VALUE: 'lombicor-demo.up.railway.app',
  PROJECT_FOUR_CTA_LABEL: 'Open LOMBICOR',
  PROJECT_FOUR_URL: 'https://lombicor-demo.up.railway.app/',
  PROJECT_FOUR_THUMBNAIL_URL: 'assets/lombicor-preview.png',
};

const curatedAppSeedData = [
  {
    appName: 'Cold Mailer',
    appUrl: 'https://cold-mailer.up.railway.app/',
    thumbnailUrl: '/assets/cold-mailer-preview.svg',
    description: 'Cold-mailer outreach workspace for multi-step campaigns. Use the live portal to launch and track outreach efforts.',
    category: 'Email outreach',
    loginDetails: 'Portal access is available directly through the live app.',
    reviews: [],
  },
  {
    appName: 'Cold Caller',
    appUrl: 'https://coldcalle.up.railway.app/',
    thumbnailUrl: '/assets/cold-caller-preview.svg',
    description: 'Lead queue and outbound calling workflow with admin and agent roles. Admin: 2026 · Agent: tester.',
    category: 'Call centre ops',
    loginDetails: 'Admin login: 2026 · Agent login: tester',
    reviews: [],
  },
  {
    appName: 'WhatsApp Bot Workspace',
    appUrl: 'https://what-b-production.up.railway.app/',
    thumbnailUrl: '/assets/whatsapp-bot-preview.svg',
    description: 'Automation workspace for WhatsApp conversations, bot flows, and customer support actions. Password: 2026.',
    category: 'Messaging automation',
    loginDetails: 'Password: 2026',
    reviews: [],
  },
  {
    appName: 'CV Editor',
    appUrl: 'https://letscrypto25.github.io/Dynamic-CV./',
    thumbnailUrl: '/assets/cv-editor-preview.svg',
    description: 'Interactive CV editor for creating a polished, dynamic resume through a simple web interface.',
    category: 'Portfolio tools',
    loginDetails: 'No login required for the public editor.',
    reviews: [],
  },
  {
    appName: 'Bakery',
    appUrl: 'https://letscrypto25.github.io/THE_BAKERY-/',
    thumbnailUrl: '/assets/bakery-preview.svg',
    description: 'A clean bakery website demo with product presentation and a friendly storefront experience.',
    category: 'Local business',
    loginDetails: 'No login required for the public storefront.',
    reviews: [],
  },
  {
    appName: 'Pizza',
    appUrl: 'https://flow-net-projects.github.io/PIZZA/',
    thumbnailUrl: '/assets/pizza-preview.svg',
    description: 'Pizza ordering demo with a simple digital menu and a polished front-end experience.',
    category: 'Food ordering',
    loginDetails: 'No login required for the public site.',
    reviews: [],
  },
];

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

const ADMIN_PIN = process.env.ADMIN_PIN || process.env.ADMIN_BOOTSTRAP_PIN || '2026';

function isAdmin(req) {
  try {
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

function seedCuratedApps() {
  ensurePublishedRoot();

  curatedAppSeedData.forEach((seed) => {
    const publishId = safeName(seed.appName);
    const destination = path.join(publishedRoot, publishId);
    fs.mkdirSync(destination, { recursive: true });

    const metaPath = path.join(destination, 'meta.json');
    let existingMeta = {};

    if (fs.existsSync(metaPath)) {
      try {
        existingMeta = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
      } catch {
        existingMeta = {};
      }
    }

    const reviewSource = Array.isArray(existingMeta.reviews) && existingMeta.reviews.length > 0
      ? existingMeta.reviews
      : (Array.isArray(seed.reviews) ? seed.reviews : []);
    const reviewStats = computeReviewStats(reviewSource);

    const publishMeta = {
      appName: existingMeta.appName || seed.appName,
      publishId,
      appUrl: new URL(seed.appUrl).href,
      thumbnailUrl: seed.thumbnailUrl || '',
      description: existingMeta.description || seed.description,
      category: existingMeta.category || seed.category || 'Live app',
      loginDetails: existingMeta.loginDetails || seed.loginDetails || '',
      createdAt: existingMeta.createdAt || new Date().toISOString(),
      liveUrl: new URL(seed.appUrl).href,
      reviews: reviewSource,
      averageRating: reviewStats.averageRating,
      reviewCount: reviewStats.reviewCount,
    };

    fs.writeFileSync(metaPath, JSON.stringify(publishMeta, null, 2));
  });
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

const pipelineFile = path.join(rootDir, 'pipeline.json');

function ensurePipelineFile() {
  if (!fs.existsSync(pipelineFile)) {
    const initialSeed = [
      {
        id: 'lead_1',
        stage: 'demos_ideas',
        name: 'Sipho Ndlovu',
        email: 'sipho@example.co.za',
        phone: '071 234 5678',
        company: 'Ndlovu Logistics',
        project_idea: 'Fleet tracking and dispatch bot for drivers',
        project_goal: 'Automate driver check-ins and delivery sign-offs over WhatsApp',
        timeline: 'Within 3 weeks',
        additional_details: 'Needs integration with existing Google Sheets or simple database',
        source: 'website',
        proposal_notes: '',
        demo_url: '',
        quote_amount: '',
        scope_summary: '',
        app_name: '',
        live_url: '',
        monthly_price: '',
        status: 'new',
        createdAt: new Date(Date.now() - 3600000 * 24).toISOString(),
        updatedAt: new Date(Date.now() - 3600000 * 24).toISOString(),
      },
      {
        id: 'lead_2',
        stage: 'pricing_links',
        name: 'Claire Bennett',
        email: 'claire@artisancakes.co.za',
        phone: '082 998 7766',
        company: 'Artisan Bakery Co',
        project_idea: 'Custom bakery ordering site with menu showcase',
        project_goal: 'Allow customers to view daily bread/pastry stock and place custom cake orders',
        timeline: 'End of month',
        additional_details: 'Wants warm aesthetics and WhatsApp order confirmation',
        source: 'walk_in',
        proposal_notes: 'Client reviewed demo layout. Preparing custom cake request form addon.',
        demo_url: 'https://bakery-demo.up.railway.app/',
        quote_amount: 'R3,800 once-off + R350/mo hosting',
        scope_summary: '4-page responsive site, menu catalog, WhatsApp ordering hook, SSL & hosting',
        app_name: 'The Bakery',
        live_url: '',
        monthly_price: 'R350/month',
        status: 'proposal_sent',
        createdAt: new Date(Date.now() - 3600000 * 48).toISOString(),
        updatedAt: new Date(Date.now() - 3600000 * 12).toISOString(),
      },
      {
        id: 'lead_3',
        stage: 'apps',
        name: 'David Miller',
        email: 'david@dialflow.io',
        phone: '083 456 7890',
        company: 'DialFlow Pro Outbound',
        project_idea: 'Cold calling agent dashboard and queue system',
        project_goal: 'Agent login, lead queue, call outcome logging, and analytics',
        timeline: 'Launched',
        additional_details: 'Production live on Railway',
        source: 'website',
        proposal_notes: 'Full custom dashboard delivered on schedule.',
        demo_url: 'https://cold-caller-demo.up.railway.app/',
        quote_amount: 'R8,500 once-off',
        scope_summary: 'Full dashboard with authentication, queue dispatcher, outcome analytics',
        app_name: 'COLD CALLER',
        live_url: 'https://cold-caller-demo.up.railway.app/',
        monthly_price: 'R650/month',
        status: 'active',
        createdAt: new Date(Date.now() - 3600000 * 72).toISOString(),
        updatedAt: new Date(Date.now() - 3600000 * 6).toISOString(),
      }
    ];
    fs.writeFileSync(pipelineFile, JSON.stringify(initialSeed, null, 2));
  }
}

async function getPipelineItems() {
  ensurePipelineFile();
  const db = getDb();

  if (db) {
    try {
      const rows = await db.select().from(schema.pipeline);
      if (rows && rows.length > 0) {
        return rows.map(r => ({
          id: r.id,
          stage: r.stage,
          name: r.name,
          email: r.email,
          phone: r.phone,
          company: r.company,
          project_idea: r.project_idea,
          project_goal: r.project_goal,
          timeline: r.timeline,
          additional_details: r.additional_details,
          source: r.source,
          proposal_notes: r.proposal_notes,
          demo_url: r.demo_url,
          quote_amount: r.quote_amount,
          scope_summary: r.scope_summary,
          app_name: r.app_name,
          live_url: r.live_url,
          monthly_price: r.monthly_price,
          status: r.status,
          createdAt: r.created_at,
          updatedAt: r.updated_at,
        })).sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
      }
    } catch (dbErr) {
      console.error('[Drizzle] Error fetching pipeline:', dbErr.message || dbErr);
    }
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_KEY;

  if (supabaseUrl && supabaseKey) {
    try {
      const response = await fetch(`${supabaseUrl.replace(/\/$/, '')}/rest/v1/pipeline?select=*&order=created_at.desc`, {
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json',
        }
      });
      if (response.ok) {
        const data = await response.json();
        if (Array.isArray(data) && data.length > 0) {
          return data.map((r) => ({
            id: r.id,
            stage: r.stage,
            name: r.name,
            email: r.email,
            phone: r.phone,
            company: r.company,
            project_idea: r.project_idea,
            project_goal: r.project_goal,
            timeline: r.timeline,
            additional_details: r.additional_details,
            source: r.source,
            proposal_notes: r.proposal_notes,
            demo_url: r.demo_url,
            quote_amount: r.quote_amount,
            scope_summary: r.scope_summary,
            app_name: r.app_name,
            live_url: r.live_url,
            monthly_price: r.monthly_price,
            status: r.status,
            createdAt: r.createdAt || r.created_at,
            updatedAt: r.updatedAt || r.updated_at,
          })).sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
        }
      }
    } catch (sbErr) {
      console.error('[Supabase] Fetch pipeline error:', sbErr.message || sbErr);
    }
  }

  try {
    const raw = fs.readFileSync(pipelineFile, 'utf8');
    return JSON.parse(raw) || [];
  } catch {
    return [];
  }
}

async function savePipelineItem(item) {
  ensurePipelineFile();
  let items = [];
  try {
    items = JSON.parse(fs.readFileSync(pipelineFile, 'utf8')) || [];
  } catch {
    items = [];
  }

  const existingIdx = items.findIndex(i => String(i.id) === String(item.id));
  if (existingIdx >= 0) {
    items[existingIdx] = { ...items[existingIdx], ...item, updatedAt: new Date().toISOString() };
  } else {
    items.unshift({ ...item, createdAt: item.createdAt || new Date().toISOString(), updatedAt: new Date().toISOString() });
  }

  fs.writeFileSync(pipelineFile, JSON.stringify(items, null, 2));

  // Sync to PostgreSQL via Drizzle
  const db = getDb();
  if (db) {
    try {
      const dbRow = {
        id: String(item.id),
        stage: String(item.stage || 'demos_ideas'),
        name: String(item.name || ''),
        email: String(item.email || ''),
        phone: String(item.phone || ''),
        company: String(item.company || ''),
        project_idea: String(item.project_idea || ''),
        project_goal: String(item.project_goal || ''),
        timeline: String(item.timeline || ''),
        additional_details: String(item.additional_details || ''),
        source: String(item.source || 'website'),
        proposal_notes: String(item.proposal_notes || ''),
        demo_url: String(item.demo_url || ''),
        quote_amount: String(item.quote_amount || ''),
        scope_summary: String(item.scope_summary || ''),
        app_name: String(item.app_name || ''),
        live_url: String(item.live_url || ''),
        monthly_price: String(item.monthly_price || ''),
        status: String(item.status || 'new'),
        created_at: String(item.createdAt || new Date().toISOString()),
        updated_at: String(item.updatedAt || new Date().toISOString()),
      };

      await db.insert(schema.pipeline).values(dbRow).onConflictDoUpdate({
        target: schema.pipeline.id,
        set: dbRow,
      });
      console.log('[Drizzle] Synced pipeline item to DB:', item.id);
    } catch (drizzleErr) {
      console.error('[Drizzle] Error saving pipeline item:', drizzleErr.message || drizzleErr);
    }
  }

  return item;
}

async function deletePipelineItem(id) {
  ensurePipelineFile();
  let items = [];
  try {
    items = JSON.parse(fs.readFileSync(pipelineFile, 'utf8')) || [];
  } catch {
    items = [];
  }

  items = items.filter(i => String(i.id) !== String(id));
  fs.writeFileSync(pipelineFile, JSON.stringify(items, null, 2));

  const db = getDb();
  if (db) {
    try {
      await db.delete(schema.pipeline).where(eq(schema.pipeline.id, String(id)));
      console.log('[Drizzle] Deleted item from DB:', id);
    } catch (drizzleErr) {
      console.error('[Drizzle] Error deleting item:', drizzleErr.message || drizzleErr);
    }
  }
}

function dispatchEmailNotification(data) {
  const smtpHost = process.env.SMTP_HOST || 'smtp.hmailplus.com';
  const smtpPort = Number(process.env.SMTP_PORT) || 587;
  const smtpUser = process.env.SMTP_USER || process.env.PUBLIC_CONTACT_EMAIL || 'info@flow-net.co.za';
  const smtpPass = process.env.SMTP_PASS || process.env.SMTP_PASSWORD || '';
  const recipient = process.env.CONTACT_RECIPIENT_EMAIL || process.env.PUBLIC_CONTACT_EMAIL || 'info@flow-net.co.za';

  if (!smtpPass) {
    console.log('[Form Submission] SMTP_PASS not set. Submission saved to submissions.json.');
    return;
  }

  const transporter = nodemailer.createTransport({
    host: smtpHost,
    port: smtpPort,
    secure: smtpPort === 465,
    auth: {
      user: smtpUser,
      pass: smtpPass,
    },
    connectionTimeout: 8000,
    greetingTimeout: 8000,
    socketTimeout: 10000,
    tls: {
      rejectUnauthorized: false
    }
  });

  transporter.sendMail({
    from: `"FLOW-NET Website" <${smtpUser}>`,
    to: recipient,
    replyTo: data.email || undefined,
    subject: `New Project Inquiry from ${data.name || 'Client'}`,
    text: `New submission from FLOW-NET website:\n\nName: ${data.name || 'N/A'}\nEmail: ${data.email || 'N/A'}\nPhone: ${data.phone || 'N/A'}\nCompany: ${data.company || 'N/A'}\n\nProject Idea:\n${data.project_idea || 'N/A'}\n\nProblem to solve:\n${data.project_goal || 'N/A'}\n\nTimeline: ${data.timeline || 'N/A'}\n\nAdditional Details:\n${data.additional_details || 'N/A'}\n\nSubmitted at: ${data.timestamp}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; color: #222;">
        <h2 style="color: #FF3B30;">New Project Inquiry - FLOW-NET</h2>
        <p><strong>Name:</strong> ${data.name || 'N/A'}</p>
        <p><strong>Email:</strong> <a href="mailto:${data.email}">${data.email || 'N/A'}</a></p>
        <p><strong>Phone:</strong> ${data.phone || 'N/A'}</p>
        <p><strong>Company:</strong> ${data.company || 'N/A'}</p>
        <hr style="border: 0; border-top: 1px solid #eee;" />
        <h3>Project Idea</h3>
        <p style="background: #f9f9f9; padding: 12px; border-radius: 6px;">${(data.project_idea || 'N/A').replace(/\n/g, '<br/>')}</p>
        <h3>Problem to Solve / Goal</h3>
        <p style="background: #f9f9f9; padding: 12px; border-radius: 6px;">${(data.project_goal || 'N/A').replace(/\n/g, '<br/>')}</p>
        <p><strong>Timeline:</strong> ${data.timeline || 'N/A'}</p>
        <p><strong>Additional Details:</strong> ${(data.additional_details || 'N/A').replace(/\n/g, '<br/>')}</p>
        <hr style="border: 0; border-top: 1px solid #eee;" />
        <small style="color: #888;">Submitted at: ${data.timestamp}</small>
      </div>
    `
  }).then((info) => {
    console.log('[Form Submission] Successfully sent email notification to', recipient, info && info.messageId);
  }).catch((err) => {
    console.error('[Form Submission] SMTP error while sending email:', err.message || err);
  });
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
  const requestPath = decodeURIComponent(url.pathname);

  if (requestPath === '/api/health' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ ok: true, service: 'FLOW-NET', status: 'ready' }));
    return;
  }

  if (requestPath === '/submit-project' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
    });
    req.on('end', () => {
      try {
        let data = {};
        const contentType = req.headers['content-type'] || '';
        if (contentType.includes('application/json')) {
          try {
            data = JSON.parse(body);
          } catch {
            data = {};
          }
        } else if (contentType.includes('application/x-www-form-urlencoded')) {
          const params = new URLSearchParams(body);
          data = Object.fromEntries(params.entries());
        } else {
          try {
            data = JSON.parse(body);
          } catch {
            const params = new URLSearchParams(body);
            data = Object.fromEntries(params.entries());
          }
        }

        data.timestamp = new Date().toISOString();
        const submissionsFile = path.join(__dirname, 'submissions.json');
        let submissions = [];
        if (fs.existsSync(submissionsFile)) {
          const fileData = fs.readFileSync(submissionsFile, 'utf8');
          if (fileData) submissions = JSON.parse(fileData);
        }
        submissions.push(data);
        fs.writeFileSync(submissionsFile, JSON.stringify(submissions, null, 2));

        // Save to pipeline under Stage 1 (demos_ideas)
        const pipelineEntry = {
          id: `lead_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          stage: 'demos_ideas',
          name: String(data.name || 'Anonymous client').trim(),
          email: String(data.email || '').trim(),
          phone: String(data.phone || '').trim(),
          company: String(data.company || '').trim(),
          project_idea: String(data.project_idea || '').trim(),
          project_goal: String(data.project_goal || '').trim(),
          timeline: String(data.timeline || '').trim(),
          additional_details: String(data.additional_details || '').trim(),
          source: 'website',
          proposal_notes: '',
          demo_url: '',
          quote_amount: '',
          scope_summary: '',
          app_name: '',
          live_url: '',
          monthly_price: '',
          status: 'new',
          createdAt: data.timestamp,
          updatedAt: data.timestamp,
        };
        savePipelineItem(pipelineEntry).catch((err) => console.error('[Pipeline] Save error:', err));

        const acceptsHtml = (req.headers['accept'] || '').includes('text/html');
        if (acceptsHtml && !contentType.includes('application/json')) {
          res.writeHead(302, { Location: '/contact.html?submitted=true#start-project-form' });
          res.end();
        } else {
          res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
          res.end(JSON.stringify({ ok: true, message: 'Thanks. Your message was sent.' }));
        }

        // Dispatch email notification asynchronously in the background
        dispatchEmailNotification(data);
      } catch (err) {
        console.error('Error processing submission:', err);
        res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ ok: false, error: 'Invalid submission data.' }));
      }
    });
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
        category: meta?.category || '',
        loginDetails: meta?.loginDetails || '',
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

        const cookieFlags = [
          `admin_pin=${encodeURIComponent(pin)}`,
          'Path=/',
          `Max-Age=${24 * 60 * 60}`,
          'HttpOnly',
          'SameSite=Strict',
        ];
        if (process.env.NODE_ENV === 'production') {
          cookieFlags.push('Secure');
        }
        res.writeHead(200, {
          'Content-Type': 'application/json; charset=utf-8',
          'Set-Cookie': cookieFlags.join('; '),
        });
        res.end(JSON.stringify({ ok: true }));
      } catch (e) {
        res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ ok: false, error: String(e.message || e) }));
      }
    });
    return;
  }

  // Admin Pipeline API (Demos/Ideas, Pricing & Links, Apps)
  if (requestPath === '/api/admin/pipeline' && req.method === 'GET') {
    if (!isAdmin(req)) {
      res.writeHead(401, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ ok: false, error: 'Unauthorized' }));
      return;
    }
    try {
      const items = await getPipelineItems();
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ ok: true, items }));
    } catch (e) {
      res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ ok: false, error: String(e.message || e) }));
    }
    return;
  }

  if (requestPath === '/api/admin/pipeline' && req.method === 'POST') {
    if (!isAdmin(req)) {
      res.writeHead(401, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ ok: false, error: 'Unauthorized' }));
      return;
    }
    let body = '';
    req.on('data', chunk => { body += chunk.toString(); });
    req.on('end', async () => {
      try {
        const data = JSON.parse(body || '{}');
        const item = {
          id: data.id || `lead_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          stage: data.stage || 'demos_ideas',
          name: String(data.name || 'Walk-in client').trim(),
          email: String(data.email || '').trim(),
          phone: String(data.phone || '').trim(),
          company: String(data.company || '').trim(),
          project_idea: String(data.project_idea || '').trim(),
          project_goal: String(data.project_goal || '').trim(),
          timeline: String(data.timeline || '').trim(),
          additional_details: String(data.additional_details || '').trim(),
          source: data.source || 'walk_in',
          proposal_notes: String(data.proposal_notes || '').trim(),
          demo_url: String(data.demo_url || '').trim(),
          quote_amount: String(data.quote_amount || '').trim(),
          scope_summary: String(data.scope_summary || '').trim(),
          app_name: String(data.app_name || '').trim(),
          live_url: String(data.live_url || '').trim(),
          monthly_price: String(data.monthly_price || '').trim(),
          status: data.status || 'new',
          createdAt: data.createdAt || new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        const saved = await savePipelineItem(item);
        res.writeHead(201, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ ok: true, item: saved }));
      } catch (e) {
        res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ ok: false, error: String(e.message || e) }));
      }
    });
    return;
  }

  if (requestPath === '/api/admin/pipeline' && req.method === 'PUT') {
    if (!isAdmin(req)) {
      res.writeHead(401, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ ok: false, error: 'Unauthorized' }));
      return;
    }
    let body = '';
    req.on('data', chunk => { body += chunk.toString(); });
    req.on('end', async () => {
      try {
        const data = JSON.parse(body || '{}');
        if (!data.id) {
          res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
          res.end(JSON.stringify({ ok: false, error: 'Item ID required.' }));
          return;
        }
        const saved = await savePipelineItem(data);
        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ ok: true, item: saved }));
      } catch (e) {
        res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ ok: false, error: String(e.message || e) }));
      }
    });
    return;
  }

  if (requestPath === '/api/admin/pipeline' && req.method === 'DELETE') {
    if (!isAdmin(req)) {
      res.writeHead(401, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ ok: false, error: 'Unauthorized' }));
      return;
    }
    let body = '';
    req.on('data', chunk => { body += chunk.toString(); });
    req.on('end', async () => {
      try {
        const data = JSON.parse(body || '{}');
        const urlParams = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`).searchParams;
        const id = data.id || urlParams.get('id');
        if (!id) {
          res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
          res.end(JSON.stringify({ ok: false, error: 'Item ID required.' }));
          return;
        }
        await deletePipelineItem(id);
        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
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
