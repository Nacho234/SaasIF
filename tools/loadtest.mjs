// Prueba de fuego: N negocios concurrentes operando random contra el Supabase de prod.
// Usa SOLO la anon/publishable key (signup público + cada negocio se borra a sí mismo).
// Uso: node loadtest.mjs <numNegocios> <duracionSeg>
const SB = 'https://epsotvywoklcaqbdvxrv.supabase.co';
const ANON = 'sb_publishable_Qmj1wLpzB1mAT2bhggH7iw_Vbp3iP9s';
const N = parseInt(process.argv[2] || '8', 10);
const DURATION = parseInt(process.argv[3] || '20', 10) * 1000;
const RUN = Date.now().toString(36);

const rnd = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
const pick = (arr) => arr[rnd(0, arr.length - 1)];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const lat = [];
const errors = {};
let ops = 0;
function recErr(where, status, msg) {
  const k = `${where}:${status}`;
  errors[k] = (errors[k] || 0) + 1;
  if (Object.values(errors).reduce((a, b) => a + b, 0) <= 5) console.log(`  ⚠️ ${k} ${String(msg).slice(0, 80)}`);
}

async function api(path, { method = 'GET', token, body, prefer } = {}) {
  const t0 = performance.now();
  const headers = { apikey: ANON, Authorization: `Bearer ${token || ANON}`, 'Content-Type': 'application/json' };
  if (prefer) headers.Prefer = prefer;
  const res = await fetch(`${SB}${path}`, { method, headers, body: body ? JSON.stringify(body) : undefined });
  lat.push(performance.now() - t0);
  const text = await res.text();
  let json = null;
  try { json = text ? JSON.parse(text) : null; } catch {}
  return { ok: res.ok, status: res.status, json, text };
}

// ---- alta de un negocio (signup público) con reintentos por rate limit ----
async function createBusiness(i) {
  const email = `loadtest.${RUN}.${i}@gmail.com`;
  const password = 'LoadTest1234';
  for (let attempt = 0; attempt < 5; attempt++) {
    const r = await api('/auth/v1/signup', {
      method: 'POST',
      body: { email, password, data: { business_name: `LOADTEST-${RUN}-${i}`, owner_name: `Dueño ${i}` } },
    });
    if (r.ok && r.json?.access_token) {
      const token = r.json.access_token;
      const prof = await api('/rest/v1/profiles?select=businessId', { token });
      return { i, email, password, token, businessId: prof.json?.[0]?.businessId };
    }
    if (r.status === 429 || /rate/i.test(r.text)) { await sleep(1500 * (attempt + 1)); continue; }
    recErr('signup', r.status, r.text);
    return null;
  }
  recErr('signup', 429, 'rate limit tras reintentos');
  return null;
}

async function seed(b) {
  b.products = [];
  b.customers = [];
  for (let k = 0; k < rnd(3, 6); k++) {
    const price = rnd(500, 8000);
    const r = await api('/rest/v1/products', {
      method: 'POST', token: b.token, prefer: 'return=representation',
      body: { businessId: b.businessId, name: `Prod ${k}`, sku: `P-${b.i}-${k}`, salePrice: price, costPrice: Math.round(price * 0.6), stock: rnd(50, 500) },
    });
    if (r.ok && r.json?.[0]) b.products.push(r.json[0]); else recErr('seedProduct', r.status, r.text);
  }
  for (let k = 0; k < rnd(1, 3); k++) {
    const r = await api('/rest/v1/customers', {
      method: 'POST', token: b.token, prefer: 'return=representation',
      body: { businessId: b.businessId, name: `Cliente ${k}`, debtBalance: k === 0 ? 2000 : 0 },
    });
    if (r.ok && r.json?.[0]) b.customers.push(r.json[0]); else recErr('seedCustomer', r.status, r.text);
  }
}

// ---- acciones random ----
async function openCash(b) {
  const r = await api('/rest/v1/cash_registers', {
    method: 'POST', token: b.token, prefer: 'return=representation',
    body: { businessId: b.businessId, number: `CJ-${Date.now() % 100000}`, openedById: 'sim', openedByName: 'Sim', openingAmount: rnd(0, 5000), status: 'open' },
  });
  if (r.ok && r.json?.[0]) { b.register = r.json[0].id; ops++; } else recErr('openCash', r.status, r.text);
}
async function sale(b) {
  if (!b.register || !b.products?.length) return;
  const p = pick(b.products);
  const qty = rnd(1, 3);
  const total = qty * Number(p.salePrice);
  const sid = `s-${b.i}-${Date.now()}-${rnd(0, 999)}`;
  const r = await api('/rest/v1/rpc/create_sale', {
    method: 'POST', token: b.token,
    body: { payload: {
      id: sid, saleNumber: `V${rnd(1, 9999)}`, sellerId: 'sim', sellerName: 'Sim', cashRegisterId: b.register,
      subtotal: total, total,
      items: [{ id: `it-${sid}`, productId: p.id, productName: p.name, sku: p.sku, quantity: qty, unitPrice: Number(p.salePrice), costPrice: Number(p.costPrice), subtotal: total, isCombo: false }],
      payments: [{ method: 'cash', amount: total }],
      stockDeltas: [{ productId: p.id, qty }],
      cashMovements: [{ cashRegisterId: b.register, method: 'cash', amount: total }],
    } },
  });
  if (r.ok) { ops++; (b.sales ||= []).push({ id: sid, item: `it-${sid}`, p, qty }); } else recErr('sale', r.status, r.text);
}
async function debtPayment(b) {
  const c = b.customers?.find((x) => Number(x.debtBalance) > 0);
  if (!c) return;
  const r = await api('/rest/v1/rpc/register_debt_payment', {
    method: 'POST', token: b.token,
    body: { payload: { customerId: c.id, amount: 200, method: 'cash', userName: 'Sim', cashMovement: b.register ? { cashRegisterId: b.register, method: 'cash', amount: 200 } : null } },
  });
  if (r.ok) ops++; else recErr('debtPayment', r.status, r.text);
}
async function expense(b) {
  if (!b.register) return;
  const r = await api('/rest/v1/cash_movements', {
    method: 'POST', token: b.token,
    body: { businessId: b.businessId, cashRegisterId: b.register, type: 'expense', direction: 'out', amount: rnd(100, 2000), method: 'cash', reason: 'Gasto sim', userId: 'sim', userName: 'Sim' },
  });
  if (r.ok) ops++; else recErr('expense', r.status, r.text);
}
async function doReturn(b) {
  const s = b.sales?.length ? pick(b.sales) : null;
  if (!s) return;
  const r = await api('/rest/v1/rpc/create_return', {
    method: 'POST', token: b.token,
    body: { payload: {
      saleId: s.id, saleNumber: 'V', items: [{ saleItemId: s.item, productId: s.p.id, productName: s.p.name, quantity: 1, unitPrice: Number(s.p.salePrice), restock: true }],
      reason: 'sim', refundMethod: 'cash', refundAmount: Number(s.p.salePrice), userName: 'Sim',
      itemReturnUpdates: [{ saleItemId: s.item, returnedQuantity: 1 }], saleStatus: 'partially_returned',
      restockDeltas: [{ productId: s.p.id, qty: 1 }],
      cashMovement: b.register ? { cashRegisterId: b.register, method: 'cash', amount: Number(s.p.salePrice) } : null, customerCreditDelta: 0,
    } },
  });
  if (r.ok) ops++; else recErr('return', r.status, r.text);
}

async function worker(b, until) {
  await openCash(b);
  while (performance.now() < until) {
    const action = pick(['sale', 'sale', 'sale', 'expense', 'addCustomer', 'debtPayment', 'return']);
    try {
      if (action === 'sale') await sale(b);
      else if (action === 'expense') await expense(b);
      else if (action === 'debtPayment') await debtPayment(b);
      else if (action === 'return') await doReturn(b);
      else if (action === 'addCustomer') {
        const r = await api('/rest/v1/customers', { method: 'POST', token: b.token, prefer: 'return=representation', body: { businessId: b.businessId, name: `Cli ${Date.now() % 1000}` } });
        if (r.ok) ops++; else recErr('addCustomer', r.status, r.text);
      }
    } catch (e) { recErr(action, 'EXC', e.message); }
    await sleep(rnd(30, 200));
  }
}

async function main() {
  console.log(`\n🔥 PRUEBA DE FUEGO — ${N} negocios, ${DURATION / 1000}s, run ${RUN}\n`);
  console.log('1) Creando negocios...');
  const biz = [];
  for (let i = 0; i < N; i++) {
    const b = await createBusiness(i);
    if (b?.businessId) { biz.push(b); process.stdout.write('.'); } else process.stdout.write('x');
    await sleep(250); // espaciar signups
  }
  console.log(`\n   ${biz.length}/${N} negocios creados`);
  if (!biz.length) { console.log('Sin negocios, aborto.'); return; }

  console.log('2) Sembrando productos/clientes...');
  await Promise.all(biz.map(seed));

  console.log('3) Verificación RLS (¿un negocio ve datos de otro?)...');
  let leak = false;
  if (biz.length >= 2) {
    const a = biz[0], other = biz[1];
    const r = await api(`/rest/v1/products?select=id&businessId=eq.${other.businessId}`, { token: a.token });
    if (r.json?.length > 0) { leak = true; console.log(`   ❌ LEAK: negocio A vio ${r.json.length} productos de B`); }
    else console.log('   ✅ Aislado: A no ve productos de B');
  }

  console.log(`4) Operando concurrente ${DURATION / 1000}s... (progreso en vivo cada 2s)`);
  const until = performance.now() + DURATION;
  const t0 = performance.now();
  const ticker = setInterval(() => {
    const el = (performance.now() - t0) / 1000;
    const te = Object.values(errors).reduce((a, b) => a + b, 0);
    process.stdout.write(`\r   ⏱ ${el.toFixed(0)}s | ops ${ops} | ${(ops / el).toFixed(1)}/s | errores ${te}      `);
  }, 2000);
  await Promise.all(biz.map((b) => worker(b, until)));
  clearInterval(ticker);
  process.stdout.write('\n');
  const secs = (performance.now() - t0) / 1000;

  console.log('5) Limpieza (cada negocio se borra a sí mismo)...');
  let deleted = 0;
  await Promise.all(biz.map(async (b) => {
    const r = await api(`/rest/v1/businesses?id=eq.${b.businessId}`, { method: 'DELETE', token: b.token });
    if (r.ok) deleted++; else recErr('cleanup', r.status, r.text);
  }));

  lat.sort((a, b) => a - b);
  const p = (q) => lat.length ? Math.round(lat[Math.floor(lat.length * q)]) : 0;
  const totalErr = Object.values(errors).reduce((a, b) => a + b, 0);
  console.log('\n════════ RESULTADO ════════');
  console.log(`Negocios: ${biz.length}/${N} | Ops OK: ${ops} | ~${(ops / secs).toFixed(1)} ops/s`);
  console.log(`Latencia: p50=${p(0.5)}ms  p95=${p(0.95)}ms  p99=${p(0.99)}ms  max=${p(0.999)}ms`);
  console.log(`Errores: ${totalErr}`, totalErr ? errors : '');
  console.log(`RLS: ${leak ? '❌ HUBO LEAK' : '✅ aislado'}`);
  console.log(`Limpieza: ${deleted}/${biz.length} negocios borrados`);
  console.log('═══════════════════════════\n');
}
main().catch((e) => { console.error(e); process.exit(1); });
