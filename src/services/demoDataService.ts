import { addDays, addHours, addMinutes, setHours, setMinutes, startOfDay, startOfMonth, subDays } from 'date-fns';
import type {
  AppNotification,
  AuditLog,
  CashMovement,
  CashRegister,
  Customer,
  CustomerPayment,
  Expense,
  InventoryMovement,
  PaymentMethodId,
  Product,
  Promotion,
  Purchase,
  Sale,
  SaleItem,
  SaleReturn,
  User,
} from '@/types';
import { MOCK_USERS } from '@/mocks/mockUsers';
import { MOCK_BRANDS, MOCK_CATEGORIES, MOCK_COMBOS, MOCK_PRODUCTS } from '@/mocks/mockCatalog';
import { MOCK_CUSTOMERS } from '@/mocks/mockCustomers';
import { MOCK_SUPPLIERS } from '@/mocks/mockSuppliers';
import { useUserStore } from '@/store/userStore';
import { useProductStore } from '@/store/productStore';
import { useCustomerStore } from '@/store/customerStore';
import { useSupplierStore } from '@/store/supplierStore';
import { useSalesStore } from '@/store/salesStore';
import { useCashStore } from '@/store/cashStore';
import { useInventoryStore } from '@/store/inventoryStore';
import { usePromotionStore } from '@/store/promotionStore';
import { useExpenseStore } from '@/store/expenseStore';
import { useNotificationStore } from '@/store/notificationStore';
import { useAuditStore } from '@/store/auditStore';
import { useBusinessStore } from '@/store/businessStore';
import { generateCashNumber, generateId, generatePurchaseNumber, generateSaleNumber } from '@/utils/id';
import { round2 } from '@/utils/calc';
import { clearAllAppStorage } from './storageService';
import { ROUTES } from '@/constants/routes';

/** RNG determinístico para que la demo sea reproducible. */
function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function seedDemoData(): void {
  const rand = mulberry32(20260701);
  const pick = <T,>(arr: T[]): T => arr[Math.floor(rand() * arr.length)]!;

  const users: User[] = MOCK_USERS.map((u) => ({ ...u }));
  const products: Product[] = MOCK_PRODUCTS.map((p) => ({ ...p }));
  const customers: Customer[] = MOCK_CUSTOMERS.map((c) => ({ ...c }));

  const now = new Date();
  users[0]!.lastLoginAt = addHours(now, -1).toISOString();
  users[1]!.lastLoginAt = subDays(now, 1).toISOString();
  users[2]!.lastLoginAt = addHours(now, -3).toISOString();

  const sellers = [users[1]!, users[2]!];
  const weightedProducts = products.flatMap((p) => (p.isFavorite ? [p, p] : [p]));

  const sales: Sale[] = [];
  const registers: CashRegister[] = [];
  const movements: CashMovement[] = [];
  const expenses: Expense[] = [];
  const customerPayments: CustomerPayment[] = [];
  const returns: SaleReturn[] = [];
  const auditLogs: AuditLog[] = [];

  let registerCounter = 1;
  const DAYS = 14;

  for (let offset = DAYS; offset >= 0; offset--) {
    const dayStart = startOfDay(subDays(now, offset));
    const isToday = offset === 0;
    if (isToday && now.getHours() < 9) break;

    const openedAt = setMinutes(setHours(dayStart, isToday ? 8 : 9), Math.floor(rand() * 30));
    const closedAt = isToday
      ? addMinutes(now, -45)
      : setMinutes(setHours(dayStart, 20), Math.floor(rand() * 40));
    if (isToday && closedAt <= openedAt) break;

    const openedBy = pick(sellers.length ? [users[0]!, users[1]!] : users);
    const register: CashRegister = {
      id: generateId(),
      number: generateCashNumber(registerCounter++),
      openedAt: openedAt.toISOString(),
      closedAt: null,
      openedById: openedBy.id,
      openedByName: openedBy.name,
      closedById: null,
      closedByName: null,
      openingAmount: 5000 + Math.floor(rand() * 6) * 1000,
      expectedCash: null,
      countedCash: null,
      difference: null,
      status: 'open',
      openingNotes: '',
      closingNotes: '',
    };
    registers.push(register);
    movements.push({
      id: generateId(),
      cashRegisterId: register.id,
      type: 'opening',
      direction: 'in',
      amount: register.openingAmount,
      method: 'cash',
      reason: 'Apertura de caja',
      userId: openedBy.id,
      userName: openedBy.name,
      relatedSaleId: null,
      date: openedAt.toISOString(),
      notes: '',
    });

    // --- Ventas del día ---
    const windowMinutes = Math.max(60, (closedAt.getTime() - openedAt.getTime()) / 60000 - 30);
    const salesCount = isToday
      ? 3 + Math.floor(rand() * 3)
      : 5 + Math.floor(rand() * 5);

    for (let i = 0; i < salesCount; i++) {
      const saleDate = addMinutes(openedAt, 15 + Math.floor(rand() * windowMinutes));
      const seller = pick(sellers);
      const lineCount = 1 + (rand() < 0.45 ? 1 : 0) + (rand() < 0.2 ? 1 : 0);
      const chosen: Product[] = [];
      for (let l = 0; l < lineCount; l++) {
        const p = pick(weightedProducts);
        if (!chosen.some((c) => c.id === p.id)) chosen.push(p);
      }
      const items: SaleItem[] = chosen.map((p) => {
        const quantity = p.salePrice < 10000 ? 1 + Math.floor(rand() * 3) : rand() < 0.25 ? 2 : 1;
        return {
          id: generateId(),
          productId: p.id,
          productName: p.name,
          sku: p.sku,
          quantity,
          unitPrice: p.salePrice,
          costPrice: p.costPrice,
          discount: 0,
          subtotal: round2(quantity * p.salePrice),
          isCombo: false,
          comboId: null,
          comboComponents: null,
          returnedQuantity: 0,
        };
      });

      const subtotal = round2(items.reduce((acc, it) => acc + it.subtotal, 0));
      const discountPercent = rand() < 0.12 ? (rand() < 0.5 ? 5 : 10) : 0;
      const discountTotal = round2((subtotal * discountPercent) / 100);
      const total = round2(subtotal - discountTotal);

      const r = rand();
      let method: PaymentMethodId =
        r < 0.4 ? 'cash' : r < 0.6 ? 'mercado_pago' : r < 0.75 ? 'debit_card' : r < 0.85 ? 'credit_card' : r < 0.94 ? 'transfer' : 'customer_credit';
      let customer: Customer | null = rand() < 0.35 ? pick(customers) : null;
      if (method === 'customer_credit') {
        customer = customers.find((c) => c.id === (rand() < 0.5 ? 'cus-3' : 'cus-5'))!;
      }

      const isCash = method === 'cash';
      const cashReceived = isCash ? Math.ceil(total / 1000) * 1000 : null;
      const change = isCash ? round2((cashReceived ?? 0) - total) : 0;

      const sale: Sale = {
        id: generateId(),
        saleNumber: '',
        date: saleDate.toISOString(),
        customerId: customer?.id ?? null,
        customerName: customer?.name ?? null,
        sellerId: seller.id,
        sellerName: seller.name,
        cashRegisterId: register.id,
        items,
        subtotal,
        discountTotal,
        surchargeTotal: 0,
        total,
        payments: [
          {
            id: generateId(),
            method,
            amount: isCash ? (cashReceived ?? total) : total,
            reference: method === 'transfer' ? `TRF-${Math.floor(rand() * 90000 + 10000)}` : '',
            cardLast4: method.endsWith('card') ? String(Math.floor(rand() * 9000 + 1000)) : '',
            installments: method === 'credit_card' ? (rand() < 0.4 ? 3 : 1) : 1,
            status: method === 'customer_credit' ? 'pending' : 'approved',
          },
        ],
        cashReceived,
        change,
        status: method === 'customer_credit' ? 'pending' : 'paid',
        notes: '',
        promotionId: null,
        createdAt: saleDate.toISOString(),
        cancelledAt: null,
        cancelReason: '',
      };
      sales.push(sale);

      if (method !== 'customer_credit') {
        movements.push({
          id: generateId(),
          cashRegisterId: register.id,
          type: 'sale',
          direction: 'in',
          amount: total,
          method,
          reason: `Venta`,
          userId: seller.id,
          userName: seller.name,
          relatedSaleId: sale.id,
          date: saleDate.toISOString(),
          notes: '',
        });
      }
    }

    // --- Gastos y retiros del día ---
    if (rand() < 0.5) {
      const isCleaning = rand() < 0.5;
      const amount = isCleaning ? 8000 + Math.floor(rand() * 7) * 1000 : 20000 + Math.floor(rand() * 25) * 1000;
      const expenseDate = addMinutes(openedAt, 60 + Math.floor(rand() * windowMinutes));
      const user = users[1]!;
      const expense: Expense = {
        id: generateId(),
        category: isCleaning ? 'cleaning' : 'services',
        description: isCleaning ? 'Artículos de limpieza' : 'Pago de servicios del local',
        amount,
        date: expenseDate.toISOString(),
        paymentMethod: 'cash',
        cashRegisterId: register.id,
        userId: user.id,
        userName: user.name,
        status: 'active',
        notes: '',
      };
      expenses.push(expense);
      movements.push({
        id: generateId(),
        cashRegisterId: register.id,
        type: 'expense',
        direction: 'out',
        amount,
        method: 'cash',
        reason: `Gasto: ${expense.description}`,
        userId: user.id,
        userName: user.name,
        relatedSaleId: null,
        date: expenseDate.toISOString(),
        notes: '',
      });
    }
    if (!isToday && rand() < 0.35) {
      const amount = 20000 + Math.floor(rand() * 30) * 1000;
      const wDate = setMinutes(setHours(dayStart, 18), Math.floor(rand() * 50));
      movements.push({
        id: generateId(),
        cashRegisterId: register.id,
        type: 'withdrawal',
        direction: 'out',
        amount,
        method: 'cash',
        reason: 'Retiro para pagos a proveedores',
        userId: users[0]!.id,
        userName: users[0]!.name,
        relatedSaleId: null,
        date: wDate.toISOString(),
        notes: '',
      });
    }

    // --- Pago de deuda (anteayer) ---
    if (offset === 1) {
      const debtor = customers.find((c) => c.id === 'cus-3')!;
      const pDate = setMinutes(setHours(dayStart, 17), 20);
      customerPayments.push({
        id: generateId(),
        customerId: debtor.id,
        amount: 15000,
        method: 'cash',
        date: pDate.toISOString(),
        userId: users[1]!.id,
        userName: users[1]!.name,
        notes: 'Pago parcial en mostrador',
      });
      movements.push({
        id: generateId(),
        cashRegisterId: register.id,
        type: 'debt_payment',
        direction: 'in',
        amount: 15000,
        method: 'cash',
        reason: `Pago de deuda de ${debtor.name}`,
        userId: users[1]!.id,
        userName: users[1]!.name,
        relatedSaleId: null,
        date: pDate.toISOString(),
        notes: '',
      });
    }

    // --- Devolución (hace 2 días) ---
    if (offset === 2) {
      const daySales = sales.filter((s) => s.cashRegisterId === register.id && s.status === 'paid');
      const target = daySales.find((s) => s.items.some((i) => i.quantity >= 1));
      if (target) {
        const item = target.items[0]!;
        const retDate = addHours(new Date(target.date), 2);
        const refund = round2(item.unitPrice);
        returns.push({
          id: generateId(),
          saleId: target.id,
          saleNumber: '',
          items: [
            {
              saleItemId: item.id,
              productId: item.productId,
              productName: item.productName,
              quantity: 1,
              unitPrice: item.unitPrice,
              restock: true,
            },
          ],
          reason: 'defective',
          refundMethod: 'cash',
          refundAmount: refund,
          userId: users[1]!.id,
          userName: users[1]!.name,
          date: retDate.toISOString(),
          notes: 'Producto con falla, se repone al stock tras revisión.',
        });
        item.returnedQuantity = 1;
        target.status = item.quantity === 1 && target.items.length === 1 ? 'returned' : 'partially_returned';
        movements.push({
          id: generateId(),
          cashRegisterId: register.id,
          type: 'refund',
          direction: 'out',
          amount: refund,
          method: 'cash',
          reason: `Devolución de venta`,
          userId: users[1]!.id,
          userName: users[1]!.name,
          relatedSaleId: target.id,
          date: retDate.toISOString(),
          notes: '',
        });
      }
    }

    // --- Cierre de caja ---
    const expectedCash = round2(
      movements
        .filter((m) => m.cashRegisterId === register.id && m.method === 'cash')
        .reduce((acc, m) => acc + (m.direction === 'in' ? m.amount : -m.amount), 0),
    );
    const closer = users[Math.floor(rand() * 2)]!;
    movements.push({
      id: generateId(),
      cashRegisterId: register.id,
      type: 'closing',
      direction: 'out',
      amount: 0,
      method: 'cash',
      reason: 'Cierre de caja',
      userId: closer.id,
      userName: closer.name,
      relatedSaleId: null,
      date: closedAt.toISOString(),
      notes: '',
    });
    const difference = offset === 3 ? -1500 : 0;
    register.closedAt = closedAt.toISOString();
    register.closedById = closer.id;
    register.closedByName = closer.name;
    register.expectedCash = expectedCash;
    register.countedCash = round2(expectedCash + difference);
    register.difference = difference;
    register.status = difference === 0 ? 'closed' : 'closed_with_difference';
    register.closingNotes = difference !== 0 ? 'Faltante detectado al contar el efectivo. Se revisan los movimientos del turno.' : '';
  }

  // --- Numeración de ventas y devoluciones ---
  sales.sort((a, b) => a.date.localeCompare(b.date));
  sales.forEach((s, idx) => {
    s.saleNumber = generateSaleNumber(idx + 1);
  });
  for (const ret of returns) {
    ret.saleNumber = sales.find((s) => s.id === ret.saleId)?.saleNumber ?? '';
  }
  for (const m of movements) {
    if (m.relatedSaleId) {
      const sale = sales.find((s) => s.id === m.relatedSaleId);
      if (sale) m.reason = m.type === 'refund' ? `Devolución de venta ${sale.saleNumber}` : m.type === 'sale' ? `Venta ${sale.saleNumber}` : m.reason;
    }
  }

  // --- Deudas de clientes según ventas a cuenta corriente ---
  for (const customer of customers) {
    const credit = sales
      .filter((s) => s.customerId === customer.id && s.status === 'pending')
      .reduce((acc, s) => acc + s.payments.filter((p) => p.method === 'customer_credit').reduce((a, p) => a + p.amount, 0), 0);
    const paid = customerPayments.filter((p) => p.customerId === customer.id).reduce((a, p) => a + p.amount, 0);
    customer.debtBalance = round2(Math.max(0, credit - paid));
  }

  // --- Movimientos de inventario (kardex coherente con el stock final) ---
  const inventoryMovements: InventoryMovement[] = [];
  const soldByProduct = new Map<string, number>();
  const returnedByProduct = new Map<string, number>();
  for (const sale of sales) {
    for (const item of sale.items) {
      soldByProduct.set(item.productId, (soldByProduct.get(item.productId) ?? 0) + item.quantity);
    }
  }
  for (const ret of returns) {
    for (const item of ret.items) {
      if (item.restock) returnedByProduct.set(item.productId, (returnedByProduct.get(item.productId) ?? 0) + item.quantity);
    }
  }

  type StockEvent = { date: string; productId: string; qty: number; type: 'sale' | 'return'; saleId: string; userName: string; userId: string; reason: string };
  const events: StockEvent[] = [];
  for (const sale of sales) {
    for (const item of sale.items) {
      events.push({ date: sale.date, productId: item.productId, qty: item.quantity, type: 'sale', saleId: sale.id, userId: sale.sellerId, userName: sale.sellerName, reason: `Venta ${sale.saleNumber}` });
    }
  }
  for (const ret of returns) {
    for (const item of ret.items) {
      if (item.restock) events.push({ date: ret.date, productId: item.productId, qty: item.quantity, type: 'return', saleId: ret.saleId, userId: ret.userId, userName: ret.userName, reason: `Devolución de venta ${ret.saleNumber}` });
    }
  }
  events.sort((a, b) => a.date.localeCompare(b.date));

  const running = new Map<string, number>();
  const initialDate = setHours(startOfDay(subDays(now, DAYS + 2)), 10);
  for (const product of products) {
    const initial = product.stock + (soldByProduct.get(product.id) ?? 0) - (returnedByProduct.get(product.id) ?? 0);
    running.set(product.id, initial);
    inventoryMovements.push({
      id: generateId(),
      productId: product.id,
      productName: product.name,
      type: 'initial',
      quantity: initial,
      previousStock: 0,
      newStock: initial,
      reason: 'Carga inicial de stock',
      userId: users[0]!.id,
      userName: users[0]!.name,
      relatedSaleId: null,
      relatedPurchaseId: null,
      date: initialDate.toISOString(),
      notes: '',
    });
  }
  for (const ev of events) {
    const prev = running.get(ev.productId) ?? 0;
    const next = ev.type === 'sale' ? prev - ev.qty : prev + ev.qty;
    running.set(ev.productId, next);
    inventoryMovements.push({
      id: generateId(),
      productId: ev.productId,
      productName: products.find((p) => p.id === ev.productId)?.name ?? '',
      type: ev.type === 'sale' ? 'sale' : 'return',
      quantity: ev.qty,
      previousStock: prev,
      newStock: next,
      reason: ev.reason,
      userId: ev.userId,
      userName: ev.userName,
      relatedSaleId: ev.saleId,
      relatedPurchaseId: null,
      date: ev.date,
      notes: '',
    });
  }
  inventoryMovements.sort((a, b) => b.date.localeCompare(a.date));

  // --- Compras ---
  const purchases: Purchase[] = [
    {
      id: generateId(),
      number: generatePurchaseNumber(1),
      supplierId: 'sup-3',
      supplierName: 'Alimentos Rosario',
      date: subDays(now, 20).toISOString(),
      items: [
        { id: generateId(), productId: 'prod-1', productName: 'Alimento perro adulto 15kg', quantity: 10, unitCost: 62000, subtotal: 620000 },
        { id: generateId(), productId: 'prod-2', productName: 'Alimento cachorro 15kg', quantity: 6, unitCost: 68500, subtotal: 411000 },
      ],
      subtotal: 1031000,
      total: 1031000,
      status: 'received',
      notes: 'Reposición quincenal de balanceados.',
      createdById: users[0]!.id,
      createdByName: users[0]!.name,
      receivedAt: subDays(now, 19).toISOString(),
    },
    {
      id: generateId(),
      number: generatePurchaseNumber(2),
      supplierId: 'sup-1',
      supplierName: 'Distribuidora Animal',
      date: subDays(now, 2).toISOString(),
      items: [
        { id: generateId(), productId: 'prod-3', productName: 'Alimento perro adulto premium 15kg', quantity: 6, unitCost: 129000, subtotal: 774000 },
        { id: generateId(), productId: 'prod-6', productName: 'Alimento gato castrado 7,5kg', quantity: 4, unitCost: 96500, subtotal: 386000 },
      ],
      subtotal: 1160000,
      total: 1160000,
      status: 'sent',
      notes: 'Entrega estimada para el jueves.',
      createdById: users[1]!.id,
      createdByName: users[1]!.name,
      receivedAt: null,
    },
    {
      id: generateId(),
      number: generatePurchaseNumber(3),
      supplierId: 'sup-2',
      supplierName: 'Mayorista Pet Sur',
      date: now.toISOString(),
      items: [
        { id: generateId(), productId: 'prod-9', productName: 'Galletitas de hígado 500g', quantity: 12, unitCost: 2100, subtotal: 25200 },
        { id: generateId(), productId: 'prod-20', productName: 'Pretal ajustable mediano', quantity: 6, unitCost: 8200, subtotal: 49200 },
        { id: generateId(), productId: 'prod-23', productName: 'Piedritas aglomerantes 8kg', quantity: 10, unitCost: 6400, subtotal: 64000 },
      ],
      subtotal: 138400,
      total: 138400,
      status: 'draft',
      notes: 'Borrador para reponer productos con bajo stock.',
      createdById: users[1]!.id,
      createdByName: users[1]!.name,
      receivedAt: null,
    },
  ];

  // --- Promociones ---
  const promotions: Promotion[] = [
    {
      id: generateId(),
      name: '10% en alimentos',
      type: 'category_discount',
      value: 10,
      startDate: subDays(now, 5).toISOString(),
      endDate: addDays(now, 10).toISOString(),
      productIds: [],
      categoryIds: ['cat-ali-perro', 'cat-ali-gato'],
      brandIds: [],
      isActive: true,
      conditions: 'Válido en alimentos secos para perros y gatos.',
      usedCount: 12,
      createdAt: subDays(now, 5).toISOString(),
    },
    {
      id: generateId(),
      name: '2x1 en snacks dentales',
      type: 'two_for_one',
      value: 0,
      startDate: subDays(now, 3).toISOString(),
      endDate: addDays(now, 5).toISOString(),
      productIds: ['prod-8'],
      categoryIds: [],
      brandIds: [],
      isActive: true,
      conditions: 'Llevando 2 unidades, la segunda es sin cargo.',
      usedCount: 5,
      createdAt: subDays(now, 3).toISOString(),
    },
    {
      id: generateId(),
      name: '$2.000 off en arena sanitaria',
      type: 'product_discount',
      value: 2000,
      startDate: subDays(now, 40).toISOString(),
      endDate: subDays(now, 20).toISOString(),
      productIds: ['prod-22'],
      categoryIds: [],
      brandIds: [],
      isActive: false,
      conditions: '',
      usedCount: 31,
      createdAt: subDays(now, 40).toISOString(),
    },
  ];

  // --- Gastos fijos del mes ---
  const monthStart = startOfMonth(now);
  expenses.push(
    {
      id: generateId(),
      category: 'rent',
      description: 'Alquiler del local',
      amount: 450000,
      date: setHours(monthStart, 10).toISOString(),
      paymentMethod: 'transfer',
      cashRegisterId: null,
      userId: users[0]!.id,
      userName: users[0]!.name,
      status: 'active',
      notes: '',
    },
    {
      id: generateId(),
      category: 'taxes',
      description: 'Monotributo + tasa municipal',
      amount: 96000,
      date: setHours(addDays(monthStart, 4), 11).toISOString(),
      paymentMethod: 'transfer',
      cashRegisterId: null,
      userId: users[0]!.id,
      userName: users[0]!.name,
      status: 'active',
      notes: '',
    },
  );

  // --- Notificaciones ---
  const notifications: AppNotification[] = [];
  for (const p of products) {
    if (p.stock <= 0) {
      notifications.push({
        id: generateId(),
        title: `Sin stock: ${p.name}`,
        description: 'El producto se quedó sin stock. Considerá reponerlo.',
        type: 'out_of_stock',
        read: false,
        date: subDays(now, 1).toISOString(),
        actionUrl: ROUTES.productDetail(p.id),
      });
    } else if (p.stock <= p.minStock) {
      notifications.push({
        id: generateId(),
        title: `Bajo stock: ${p.name}`,
        description: `Quedan ${p.stock} unidades (mínimo: ${p.minStock}).`,
        type: 'low_stock',
        read: false,
        date: addHours(now, -6).toISOString(),
        actionUrl: ROUTES.productDetail(p.id),
      });
    }
  }
  const diffRegister = registers.find((r) => r.status === 'closed_with_difference');
  if (diffRegister) {
    notifications.push({
      id: generateId(),
      title: `Cierre con diferencia en ${diffRegister.number}`,
      description: 'Se detectó un faltante de $1.500 al cerrar la caja.',
      type: 'cash_difference',
      read: false,
      date: diffRegister.closedAt ?? now.toISOString(),
      actionUrl: ROUTES.cashDetail(diffRegister.id),
    });
  }
  for (const c of customers.filter((c) => c.debtBalance > 0)) {
    notifications.push({
      id: generateId(),
      title: `Deuda pendiente: ${c.name}`,
      description: `Cuenta corriente con saldo pendiente.`,
      type: 'pending_debt',
      read: true,
      date: subDays(now, 1).toISOString(),
      actionUrl: ROUTES.customerDetail(c.id),
    });
  }
  notifications.push({
    id: generateId(),
    title: 'Promoción por vencer: 2x1 en snacks dentales',
    description: 'La promoción vence en 5 días.',
    type: 'promotion_expiring',
    read: true,
    date: addHours(now, -20).toISOString(),
    actionUrl: ROUTES.promotions,
  });
  notifications.sort((a, b) => b.date.localeCompare(a.date));

  // --- Auditoría inicial ---
  auditLogs.push({
    id: generateId(),
    date: now.toISOString(),
    userId: 'system',
    userName: 'Sistema',
    action: 'demo_seeded',
    module: 'system',
    description: 'Datos de demostración cargados',
    severity: 'info',
    metadata: { sales: sales.length, products: products.length },
  });
  for (const sale of sales.slice(-5)) {
    auditLogs.push({
      id: generateId(),
      date: sale.date,
      userId: sale.sellerId,
      userName: sale.sellerName,
      action: 'sale_created',
      module: 'sales',
      description: `Venta ${sale.saleNumber} confirmada`,
      severity: 'success',
      metadata: { sale: sale.saleNumber, total: sale.total },
    });
  }
  const lastRegister = registers[registers.length - 1];
  if (lastRegister) {
    auditLogs.push({
      id: generateId(),
      date: lastRegister.openedAt,
      userId: lastRegister.openedById,
      userName: lastRegister.openedByName,
      action: 'cash_opened',
      module: 'cash',
      description: `Abrió la caja ${lastRegister.number} con monto inicial`,
      severity: 'success',
      metadata: { register: lastRegister.number },
    });
    if (lastRegister.closedAt) {
      auditLogs.push({
        id: generateId(),
        date: lastRegister.closedAt,
        userId: lastRegister.closedById ?? 'system',
        userName: lastRegister.closedByName ?? 'Sistema',
        action: 'cash_closed',
        module: 'cash',
        description: `Cerró la caja ${lastRegister.number}`,
        severity: 'success',
        metadata: { register: lastRegister.number },
      });
    }
  }
  auditLogs.sort((a, b) => b.date.localeCompare(a.date));

  // --- Persistir todo en los stores ---
  useUserStore.getState().replaceAll({ users });
  useProductStore.getState().replaceAll({
    products,
    categories: MOCK_CATEGORIES.map((c) => ({ ...c })),
    brands: MOCK_BRANDS.map((b) => ({ ...b })),
    combos: MOCK_COMBOS.map((c) => ({ ...c })),
  });
  useCustomerStore.getState().replaceAll({ customers, payments: customerPayments });
  useSupplierStore.getState().replaceAll({
    suppliers: MOCK_SUPPLIERS.map((s) => ({ ...s })),
    purchases,
    purchaseCounter: purchases.length + 1,
  });
  useSalesStore.getState().replaceAll({
    sales: [...sales].sort((a, b) => b.date.localeCompare(a.date)),
    returns,
    saleCounter: sales.length + 1,
  });
  useCashStore.getState().replaceAll({
    registers: [...registers].sort((a, b) => b.openedAt.localeCompare(a.openedAt)),
    movements: [...movements].sort((a, b) => b.date.localeCompare(a.date)),
    registerCounter,
  });
  useInventoryStore.getState().replaceAll({ movements: inventoryMovements });
  usePromotionStore.getState().replaceAll({ promotions });
  useExpenseStore.getState().replaceAll({ expenses: [...expenses].sort((a, b) => b.date.localeCompare(a.date)) });
  useNotificationStore.getState().replaceAll({ notifications });
  useAuditStore.getState().replaceAll({ logs: auditLogs });

  useBusinessStore.getState().updateSettings({
    businessName: 'Petshop San Martín',
    category: 'Petshop',
    cuit: '30-71234567-8',
    address: 'Av. San Martín 1420, Rosario, Santa Fe',
    phone: '341 555-0199',
    email: 'hola@petshopsanmartin.com.ar',
  });
  useBusinessStore.getState().setDemoSeeded(true);
}

/** Borra todos los datos locales y recarga (vuelve a sembrar la demo). */
export function resetDemoData(): void {
  clearAllAppStorage();
  window.location.reload();
}
