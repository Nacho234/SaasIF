/**
 * Smoke test sin navegador: siembra la demo y verifica invariantes
 * de negocio (stock, caja, totales). Ejecutar con:
 *   npx tsx --tsconfig tsconfig.app.json scripts/smoke.ts
 */
// Requiere Node >= 22 ejecutado con --localstorage-file para tener localStorage real.
localStorage.clear();
(globalThis as unknown as { window: unknown }).window = { location: { reload() {} }, localStorage };

const { seedDemoData } = await import('../src/services/demoDataService');
const { useProductStore } = await import('../src/store/productStore');
const { useInventoryStore } = await import('../src/store/inventoryStore');
const { useCashStore } = await import('../src/store/cashStore');
const { useSalesStore } = await import('../src/store/salesStore');
const { useCustomerStore } = await import('../src/store/customerStore');
const { round2 } = await import('../src/utils/calc');

let failures = 0;
function check(label: string, ok: boolean, detail = '') {
  if (!ok) {
    failures++;
    console.error(`✗ ${label} ${detail}`);
  } else {
    console.log(`✓ ${label}`);
  }
}

seedDemoData();

const products = useProductStore.getState().products;
const invMovements = useInventoryStore.getState().movements;
const { registers, movements } = useCashStore.getState();
const { sales } = useSalesStore.getState();
const customers = useCustomerStore.getState().customers;

check('Se sembraron productos', products.length >= 20, String(products.length));
check('Se sembraron ventas', sales.length >= 40, String(sales.length));
check('Se sembraron cajas', registers.length >= 10, String(registers.length));

// 1. Kardex consistente: último movimiento de cada producto termina en el stock actual.
for (const product of products) {
  const productMovs = invMovements
    .filter((m) => m.productId === product.id)
    .sort((a, b) => a.date.localeCompare(b.date));
  const last = productMovs[productMovs.length - 1];
  check(
    `Kardex de ${product.sku} termina en stock actual`,
    last !== undefined && last.newStock === product.stock,
    `último=${last?.newStock} stock=${product.stock}`,
  );
  // Cadena previous -> new coherente
  let prev = 0;
  let chainOk = true;
  for (const m of productMovs) {
    if (m.previousStock !== prev) chainOk = false;
    prev = m.newStock;
  }
  check(`Cadena de kardex de ${product.sku}`, chainOk);
  if (product.stock < 0) check(`Stock no negativo ${product.sku}`, false, String(product.stock));
}

// 2. Cajas: expectedCash coincide con la suma de movimientos en efectivo.
for (const register of registers) {
  const cash = movements
    .filter((m) => m.cashRegisterId === register.id && m.method === 'cash')
    .reduce((acc, m) => acc + (m.direction === 'in' ? m.amount : -m.amount), 0);
  if (register.expectedCash != null) {
    check(
      `Caja ${register.number}: efectivo esperado coherente`,
      Math.abs(round2(cash) - register.expectedCash) < 0.01,
      `mov=${round2(cash)} reg=${register.expectedCash}`,
    );
    check(
      `Caja ${register.number}: diferencia = contado - esperado`,
      Math.abs((register.countedCash ?? 0) - register.expectedCash - (register.difference ?? 0)) < 0.01,
    );
  }
}
check('Hay exactamente una caja con diferencia', registers.filter((r) => r.status === 'closed_with_difference').length === 1);
check('No queda caja abierta al sembrar', registers.every((r) => r.status !== 'open'));

// 3. Ventas: totales coherentes.
for (const sale of sales) {
  const gross = round2(sale.items.reduce((a, i) => a + i.subtotal, 0));
  const expected = round2(gross - (sale.discountTotal - sale.items.reduce((a, i) => a + i.discount, 0)) + sale.surchargeTotal);
  check(`Venta ${sale.saleNumber}: total coherente`, Math.abs(expected - sale.total) < 0.02, `esp=${expected} tot=${sale.total}`);
  const paid = round2(sale.payments.reduce((a, p) => a + p.amount, 0));
  check(`Venta ${sale.saleNumber}: pagos cubren total`, paid + 0.01 >= sale.total, `pagado=${paid}`);
}

// 4. Deudas: coinciden con ventas a cuenta corriente menos pagos.
for (const customer of customers) {
  const credit = sales
    .filter((s) => s.customerId === customer.id && s.status === 'pending')
    .reduce((a, s) => a + s.payments.filter((p) => p.method === 'customer_credit').reduce((x, p) => x + p.amount, 0), 0);
  const payments = useCustomerStore.getState().payments.filter((p) => p.customerId === customer.id).reduce((a, p) => a + p.amount, 0);
  check(
    `Deuda de ${customer.name} coherente`,
    Math.abs(round2(Math.max(0, credit - payments)) - customer.debtBalance) < 0.01,
    `calc=${round2(credit - payments)} reg=${customer.debtBalance}`,
  );
}

// 5. Flujo en vivo: abrir caja → vender → anular → cerrar caja.
const { useAuthStore } = await import('../src/store/authStore');
const { useUserStore } = await import('../src/store/userStore');
const admin = useUserStore.getState().users.find((u) => u.role === 'admin')!;
useAuthStore.getState().setUser(admin);

const cashService = await import('../src/services/cashRegisterService');
const salesService = await import('../src/services/salesService');

const opened = cashService.openRegister({ openingAmount: 10000, notes: 'smoke' });
check('Abrir caja OK', opened.ok, opened.error);
const openedTwice = cashService.openRegister({ openingAmount: 1, notes: '' });
check('No permite doble apertura', !openedTwice.ok);

const target = useProductStore.getState().products.find((p) => p.stock >= 3)!;
const before = target.stock;
const saleResult = salesService.confirmSale({
  items: [
    {
      lineId: 'l1',
      productId: target.id,
      name: target.name,
      sku: target.sku,
      quantity: 2,
      unitPrice: target.salePrice,
      costPrice: target.costPrice,
      discount: 0,
      isCombo: false,
      comboId: null,
    },
  ],
  customerId: null,
  discountPercent: 0,
  discountAmount: 0,
  surcharge: 0,
  payments: [{ method: 'cash', amount: Math.ceil((target.salePrice * 2) / 1000) * 1000 }],
  cashReceived: Math.ceil((target.salePrice * 2) / 1000) * 1000,
  notes: '',
  promotionId: null,
});
check('Venta en vivo OK', saleResult.ok, saleResult.error);
const afterSale = useProductStore.getState().products.find((p) => p.id === target.id)!.stock;
check('Stock descontado (2 u.)', afterSale === before - 2, `${before} → ${afterSale}`);

const overSale = salesService.confirmSale({
  items: [
    {
      lineId: 'l2',
      productId: target.id,
      name: target.name,
      sku: target.sku,
      quantity: 9999,
      unitPrice: target.salePrice,
      costPrice: target.costPrice,
      discount: 0,
      isCombo: false,
      comboId: null,
    },
  ],
  customerId: null,
  discountPercent: 0,
  discountAmount: 0,
  surcharge: 0,
  payments: [{ method: 'cash', amount: target.salePrice * 9999 }],
  cashReceived: target.salePrice * 9999,
  notes: '',
  promotionId: null,
});
check('Bloquea venta sin stock', !overSale.ok);

const cancelResult = salesService.cancelSale(saleResult.sale!.id, 'smoke test');
check('Anulación OK', cancelResult.ok, cancelResult.error);
const afterCancel = useProductStore.getState().products.find((p) => p.id === target.id)!.stock;
check('Stock repuesto tras anular', afterCancel === before, `${afterCancel} vs ${before}`);

const openReg = cashService.getOpenRegister()!;
const summary = cashService.getRegisterSummary(openReg.id);
check('Efectivo esperado vuelve al inicial tras anular', Math.abs(summary.expectedCash - 10000) < 0.01, String(summary.expectedCash));

const closed = cashService.closeRegister({ countedCash: summary.expectedCash, notes: '' });
check('Cierre de caja OK', closed.ok, closed.error);
check('Cierre sin diferencia', closed.register?.status === 'closed', closed.register?.status);

console.log(failures === 0 ? '\nTODOS LOS CHECKS PASARON' : `\n${failures} CHECKS FALLARON`);
process.exit(failures === 0 ? 0 : 1);
