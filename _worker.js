/**
 * 行銷資料庫 · Cloudflare Pages Worker
 * - /api/* 路由由此 Worker 處理
 * - 其餘請求交由 Cloudflare Pages 靜態資源回應
 *
 * 環境變數（在 Cloudflare Dashboard > Pages > Settings > Environment variables 設定）：
 *   ADMIN_NAME     - 管理者帳號（預設：sz0453）
 *   ADMIN_PASSWORD - 管理者密碼（設為 Secret）
 */

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname.startsWith('/api/')) {
      return handleAPI(request, env, url);
    }

    // 靜態資源交由 Pages 處理
    return env.ASSETS.fetch(request);
  }
};

// ─────────────────────────────────────────
// Router
// ─────────────────────────────────────────
async function handleAPI(request, env, url) {
  const { method, pathname } = { method: request.method, pathname: url.pathname };

  if (method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: cors() });
  }

  try {
    if (pathname === '/api/login'         && method === 'POST')   return await login(request, env);
    if (pathname === '/api/list/add'      && method === 'POST')   return await listAdd(request, env);
    if (pathname === '/api/list/remove'   && method === 'DELETE') return await listRemove(request, env);
    if (/^\/api\/list\/\d+$/.test(pathname) && method === 'GET') return await listGet(pathname, env);
    if (pathname === '/api/admin/overview'   && method === 'GET')   return await adminOverview(request, env);
    if (pathname === '/api/companies/claimed' && method === 'GET')  return await companiesClaimed(env);

    return res({ error: 'Not found' }, 404);
  } catch (e) {
    return res({ error: e.message }, 500);
  }
}

// ─────────────────────────────────────────
// POST /api/login
// body: { name, password? }
// ─────────────────────────────────────────
async function login(request, env) {
  const body = await request.json().catch(() => ({}));
  const name = (body.name || '').trim();
  if (!name) return res({ error: '請輸入名字' }, 400);

  const ADMIN_NAME = (env.ADMIN_NAME || 'sz0453').trim();
  const isAdminAttempt = name === ADMIN_NAME;

  if (isAdminAttempt) {
    if (!body.password) return res({ requires_password: true });
    if (body.password !== env.ADMIN_PASSWORD) return res({ error: '密碼錯誤' }, 401);
  }

  // 取得或建立用戶
  let user = await env.DB
    .prepare('SELECT id, name, is_admin, created_at FROM users WHERE name = ?')
    .bind(name).first();

  if (!user) {
    user = await env.DB
      .prepare('INSERT INTO users (name, is_admin) VALUES (?, ?) RETURNING id, name, is_admin, created_at')
      .bind(name, isAdminAttempt ? 1 : 0)
      .first();
  }

  return res({ id: user.id, name: user.name, is_admin: user.is_admin });
}

// ─────────────────────────────────────────
// POST /api/list/add
// body: { user_id, company_id, company_name }
// ─────────────────────────────────────────
async function listAdd(request, env) {
  const { user_id, company_id, company_name } = await request.json().catch(() => ({}));
  if (!user_id || company_id == null) return res({ error: '缺少參數' }, 400);

  await env.DB
    .prepare('INSERT OR IGNORE INTO user_lists (user_id, company_id, company_name) VALUES (?, ?, ?)')
    .bind(user_id, company_id, company_name || '')
    .run();

  return res({ ok: true });
}

// ─────────────────────────────────────────
// DELETE /api/list/remove
// body: { user_id, company_id }
// ─────────────────────────────────────────
async function listRemove(request, env) {
  const { user_id, company_id } = await request.json().catch(() => ({}));
  if (!user_id || company_id == null) return res({ error: '缺少參數' }, 400);

  await env.DB
    .prepare('DELETE FROM user_lists WHERE user_id = ? AND company_id = ?')
    .bind(user_id, company_id)
    .run();

  return res({ ok: true });
}

// ─────────────────────────────────────────
// GET /api/list/:userId
// ─────────────────────────────────────────
async function listGet(pathname, env) {
  const userId = pathname.split('/').pop();

  const rows = await env.DB
    .prepare('SELECT company_id, company_name, added_at, note FROM user_lists WHERE user_id = ? ORDER BY added_at DESC')
    .bind(userId)
    .all();

  return res(rows.results);
}

// ─────────────────────────────────────────
// GET /api/admin/overview
// header: X-User-Id
// ─────────────────────────────────────────
async function adminOverview(request, env) {
  const userId = request.headers.get('X-User-Id');
  if (!userId) return res({ error: '未授權' }, 401);

  const caller = await env.DB
    .prepare('SELECT is_admin FROM users WHERE id = ?')
    .bind(userId).first();

  if (!caller?.is_admin) return res({ error: '無管理者權限' }, 403);

  const users = await env.DB
    .prepare('SELECT id, name, is_admin, created_at FROM users ORDER BY created_at ASC')
    .all();

  const lists = await env.DB
    .prepare(`
      SELECT ul.user_id, ul.company_id, ul.company_name, ul.added_at
      FROM user_lists ul
      ORDER BY ul.user_id ASC, ul.added_at DESC
    `)
    .all();

  return res({ users: users.results, lists: lists.results });
}

// ─────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────
// ─────────────────────────────────────────
// GET /api/companies/claimed
// 回傳已被任何人加入名單的 company_id 清單
// ─────────────────────────────────────────
async function companiesClaimed(env) {
  const rows = await env.DB
    .prepare('SELECT DISTINCT company_id FROM user_lists')
    .all();
  return res({ claimed: rows.results.map(r => r.company_id) });
}

function cors() {
  return {
    'Access-Control-Allow-Origin':  '*',
    'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-User-Id',
  };
}

function res(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...cors() },
  });
}
