import { useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BadgePercent, Gift, Lock, Search, ShoppingCart, Star, Wallet } from 'lucide-react';
import { isWithinInterval, parseISO } from 'date-fns';
import { useBusinessStore } from '@/store/businessStore';
import { useProductStore } from '@/store/productStore';
import { usePromotionStore } from '@/store/promotionStore';
import { useCashStore, selectOpenRegister } from '@/store/cashStore';
import { toast, useUiStore } from '@/store/uiStore';
import { comboAvailableStock, type CartLine } from '@/services/salesService';
import { usePermissions } from '@/hooks/usePermissions';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { useDebounce } from '@/hooks/useDebounce';
import { generateId } from '@/utils/id';
import { calcCartTotals } from '@/utils/calc';
import { formatMoney } from '@/utils/format';
import { ROUTES } from '@/constants/routes';
import type { Combo, Customer, Product, Promotion } from '@/types';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Drawer } from '@/components/ui/Drawer';
import { EmptyState } from '@/components/ui/EmptyState';
import { ProductIcon } from '@/components/ui/ProductIcon';
import { OpenCashModal } from '@/components/cash/OpenCashModal';
import { CartPanel } from '@/components/pos/CartPanel';
import { PaymentModal } from '@/components/pos/PaymentModal';
import { cn } from '@/utils/cn';

export function POSPage() {
  const navigate = useNavigate();
  const { can, user } = usePermissions();
  const settings = useBusinessStore((s) => s.settings);
  const products = useProductStore((s) => s.products);
  const categories = useProductStore((s) => s.categories);
  const combos = useProductStore((s) => s.combos);
  const promotions = usePromotionsActive();
  const openRegister = useCashStore((s) => selectOpenRegister(s));
  const askConfirm = useUiStore((s) => s.askConfirm);

  const [query, setQuery] = useState('');
  const debouncedQuery = useDebounce(query, 150);
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [lines, setLines] = useState<CartLine[]>([]);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [discountPercent, setDiscountPercent] = useState(0);
  const [discountAmount, setDiscountAmount] = useState(0);
  const [surcharge, setSurcharge] = useState(0);
  const [promotionId, setPromotionId] = useState<string | null>(null);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [cartDrawerOpen, setCartDrawerOpen] = useState(false);
  const [openCashModal, setOpenCashModal] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);

  const cashBlocked = settings.requireOpenCashToSell && !openRegister;

  const totals = useMemo(
    () => calcCartTotals({ items: lines, discountPercent, discountAmount, surcharge }),
    [lines, discountPercent, discountAmount, surcharge],
  );
  const itemCount = lines.reduce((acc, l) => acc + l.quantity, 0);

  const visibleProducts = useMemo(() => {
    const q = debouncedQuery.trim().toLowerCase();
    return products
      .filter((p) => p.isActive)
      .filter((p) => {
        if (categoryFilter === 'fav') return p.isFavorite;
        if (categoryFilter !== 'all' && categoryFilter !== 'combos') return p.categoryId === categoryFilter;
        return categoryFilter !== 'combos';
      })
      .filter(
        (p) =>
          !q ||
          p.name.toLowerCase().includes(q) ||
          p.sku.toLowerCase().includes(q) ||
          p.barcode.includes(q),
      )
      .slice(0, 60);
  }, [products, debouncedQuery, categoryFilter]);

  const visibleCombos = useMemo(() => {
    if (categoryFilter !== 'all' && categoryFilter !== 'combos') return [];
    const q = debouncedQuery.trim().toLowerCase();
    return combos.filter((c) => c.isActive && (!q || c.name.toLowerCase().includes(q)));
  }, [combos, debouncedQuery, categoryFilter]);

  const stockInCart = (productId: string) =>
    lines.filter((l) => !l.isCombo && l.productId === productId).reduce((a, l) => a + l.quantity, 0) +
    lines
      .filter((l) => l.isCombo && l.comboId)
      .reduce((a, l) => {
        const combo = combos.find((c) => c.id === l.comboId);
        const item = combo?.items.find((i) => i.productId === productId);
        return a + (item ? item.quantity * l.quantity : 0);
      }, 0);

  const addProduct = (product: Product) => {
    const available = product.stock - stockInCart(product.id);
    if (available <= 0 && !settings.allowNegativeStock) {
      toast.error('No hay stock suficiente', `"${product.name}" no tiene más unidades disponibles.`);
      return;
    }
    setLines((prev) => {
      const existing = prev.find((l) => !l.isCombo && l.productId === product.id);
      if (existing) {
        return prev.map((l) => (l === existing ? { ...l, quantity: l.quantity + 1 } : l));
      }
      return [
        ...prev,
        {
          lineId: generateId(),
          productId: product.id,
          name: product.name,
          sku: product.sku,
          quantity: 1,
          unitPrice: product.salePrice,
          costPrice: product.costPrice,
          discount: 0,
          isCombo: false,
          comboId: null,
        },
      ];
    });
  };

  const addCombo = (combo: Combo) => {
    const inCart = lines.filter((l) => l.comboId === combo.id).reduce((a, l) => a + l.quantity, 0);
    if (comboAvailableStock(combo, products) - inCart <= 0 && !settings.allowNegativeStock) {
      toast.error('No hay stock suficiente', `El combo "${combo.name}" no tiene componentes disponibles.`);
      return;
    }
    const cost = combo.items.reduce((acc, ci) => {
      const p = products.find((x) => x.id === ci.productId);
      return acc + (p?.costPrice ?? 0) * ci.quantity;
    }, 0);
    setLines((prev) => {
      const existing = prev.find((l) => l.isCombo && l.comboId === combo.id);
      if (existing) return prev.map((l) => (l === existing ? { ...l, quantity: l.quantity + 1 } : l));
      return [
        ...prev,
        {
          lineId: generateId(),
          productId: combo.id,
          name: combo.name,
          sku: 'COMBO',
          quantity: 1,
          unitPrice: combo.comboPrice,
          costPrice: cost,
          discount: 0,
          isCombo: true,
          comboId: combo.id,
        },
      ];
    });
  };

  const changeQuantity = (lineId: string, delta: number) => {
    setLines((prev) =>
      prev
        .map((l) => {
          if (l.lineId !== lineId) return l;
          const next = l.quantity + delta;
          if (next <= 0) return null;
          if (delta > 0 && !settings.allowNegativeStock) {
            if (l.isCombo && l.comboId) {
              const combo = combos.find((c) => c.id === l.comboId);
              if (combo && comboAvailableStock(combo, products) < next) {
                toast.error('No hay stock suficiente para el combo.');
                return l;
              }
            } else {
              const product = products.find((p) => p.id === l.productId);
              if (product && product.stock < stockInCart(l.productId) + 1) {
                toast.error('No hay stock suficiente', `Disponible: ${product.stock} unidades.`);
                return l;
              }
            }
          }
          return { ...l, quantity: next };
        })
        .filter((l): l is CartLine => l !== null),
    );
  };

  const clearCart = () => {
    if (lines.length === 0) return;
    askConfirm({
      title: 'Vaciar carrito',
      message: 'Se van a quitar todos los productos del carrito. ¿Continuar?',
      confirmLabel: 'Vaciar',
      danger: true,
      onConfirm: () => {
        resetSale();
        toast.info('Carrito vacío');
      },
    });
  };

  const resetSale = () => {
    setLines([]);
    setCustomer(null);
    setDiscountPercent(0);
    setDiscountAmount(0);
    setSurcharge(0);
    setPromotionId(null);
  };

  const applyPromotion = (promo: Promotion) => {
    if (!can('create_discount')) {
      toast.error('Este usuario no tiene permiso para aplicar descuentos.');
      return;
    }
    if (promo.type === 'percentage' || promo.type === 'category_discount' || promo.type === 'brand_discount') {
      setDiscountPercent(Math.min(promo.value, settings.maxDiscountPercent));
      setDiscountAmount(0);
    } else if (promo.type === 'fixed_amount' || promo.type === 'product_discount') {
      setDiscountAmount(promo.value);
      setDiscountPercent(0);
    } else {
      toast.info('Promo 2x1', 'Agregá 2 unidades y descontá una manualmente (demo).');
      return;
    }
    setPromotionId(promo.id);
    toast.success(`Promoción aplicada: ${promo.name}`);
  };

  const openPayment = () => {
    if (cashBlocked) return;
    if (lines.length === 0) {
      toast.error('El carrito está vacío', 'Agregá al menos un producto para cobrar.');
      return;
    }
    setPaymentOpen(true);
  };

  useKeyboardShortcuts({
    f2: () => searchRef.current?.focus(),
    f4: openPayment,
    delete: clearCart,
  });

  // --- Caja cerrada: bloquea la venta ---
  if (cashBlocked) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center text-center animate-fade-in">
        <span className="mb-4 rounded-2xl bg-amber-100 p-5 text-amber-500 dark:bg-amber-950">
          <Lock className="size-10" aria-hidden />
        </span>
        <h1 className="font-display text-2xl font-bold text-slate-900 dark:text-slate-50">La caja está cerrada</h1>
        <p className="mt-2 max-w-sm text-sm text-slate-500 dark:text-slate-400">
          Primero tenés que abrir la caja para vender. El monto inicial queda registrado en el arqueo.
        </p>
        {can('open_cash') ? (
          <Button size="lg" className="mt-6" onClick={() => setOpenCashModal(true)}>
            <Wallet className="size-5" aria-hidden />
            Abrir caja ahora
          </Button>
        ) : (
          <p className="mt-6 rounded-xl bg-slate-100 px-4 py-3 text-sm font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">
            Pedile a un encargado que abra la caja.
          </p>
        )}
        <OpenCashModal open={openCashModal} onClose={() => setOpenCashModal(false)} />
      </div>
    );
  }

  return (
    <div className="flex gap-4 animate-fade-in lg:h-[calc(100dvh-8.5rem)]">
      {/* Columna izquierda: búsqueda y productos */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Buscador grande */}
        <div className="relative mb-3">
          <Search className="absolute top-1/2 left-4 size-5 -translate-y-1/2 text-slate-400" aria-hidden />
          <input
            ref={searchRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key !== 'Enter') return;
              const code = query.trim();
              if (!code) return;
              // Scanner: match exacto por código de barras o SKU; si no, único resultado visible.
              const exact = products.find(
                (p) => p.isActive && (p.barcode === code || p.sku.toLowerCase() === code.toLowerCase()),
              );
              const target = exact ?? (visibleProducts.length === 1 ? visibleProducts[0]! : null);
              if (target) {
                addProduct(target);
                setQuery('');
              } else {
                toast.error('Sin resultados', 'No encontramos un producto con ese código de barras.');
              }
            }}
            placeholder="Buscar o escanear código… (F2)"
            className="h-12 w-full rounded-xl border border-slate-300 bg-white pl-12 pr-4 text-base shadow-xs focus:outline-2 focus:outline-primary-600 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
            aria-label="Buscar producto"
          />
        </div>

        {/* Promos activas */}
        {promotions.length > 0 && (
          <div className="mb-3 flex gap-2 overflow-x-auto pb-1">
            {promotions.map((promo) => (
              <button
                key={promo.id}
                onClick={() => applyPromotion(promo)}
                className={cn(
                  'flex shrink-0 cursor-pointer items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors',
                  promotionId === promo.id
                    ? 'border-primary-500 bg-primary-600 text-white'
                    : 'border-primary-200 bg-primary-50 text-primary-700 hover:bg-primary-100 dark:border-primary-800 dark:bg-primary-950 dark:text-primary-300',
                )}
              >
                <BadgePercent className="size-3.5" aria-hidden />
                {promo.name}
              </button>
            ))}
          </div>
        )}

        {/* Categorías rápidas */}
        <div className="mb-3 flex gap-2 overflow-x-auto pb-1">
          {[
            { id: 'all', name: 'Todos' },
            { id: 'fav', name: '★ Favoritos' },
            ...(combos.some((c) => c.isActive) ? [{ id: 'combos', name: 'Combos' }] : []),
            ...categories.filter((c) => c.isActive).map((c) => ({ id: c.id, name: c.name })),
          ].map((cat) => (
            <button
              key={cat.id}
              onClick={() => setCategoryFilter(cat.id)}
              className={cn(
                'shrink-0 cursor-pointer rounded-full px-3.5 py-1.5 text-xs font-semibold whitespace-nowrap transition-colors',
                categoryFilter === cat.id
                  ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900'
                  : 'bg-white text-slate-600 border border-slate-200 hover:border-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700',
              )}
            >
              {cat.name}
            </button>
          ))}
        </div>

        {/* Grid de productos */}
        <div className="min-h-0 flex-1 overflow-y-auto rounded-xl">
          {visibleProducts.length === 0 && visibleCombos.length === 0 ? (
            <EmptyState
              icon={Search}
              title="No encontramos productos"
              description="Probá con otro término o revisá los filtros de categoría."
            />
          ) : (
            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 xl:grid-cols-4">
              {visibleCombos.map((combo) => {
                const available = comboAvailableStock(combo, products);
                return (
                  <button
                    key={combo.id}
                    onClick={() => addCombo(combo)}
                    className="group flex cursor-pointer flex-col rounded-xl border border-violet-200 bg-white p-3 text-left transition-all hover:border-violet-400 hover:shadow-card active:scale-[0.98] dark:border-violet-900 dark:bg-slate-900"
                  >
                    <div className="mb-2 flex items-start justify-between">
                      <ProductIcon isCombo color="#8b5cf6" />
                      <Badge variant="primary" className="bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-300">
                        <Gift className="size-3" aria-hidden /> Combo
                      </Badge>
                    </div>
                    <p className="line-clamp-2 text-sm font-semibold text-slate-800 dark:text-slate-200">{combo.name}</p>
                    <p className="mt-auto pt-2 font-display text-base font-bold text-slate-900 tabular-nums dark:text-slate-50">
                      {formatMoney(combo.comboPrice)}
                    </p>
                    <p className="text-[11px] text-slate-400">Disponible: {available}</p>
                  </button>
                );
              })}
              {visibleProducts.map((product) => {
                const category = categories.find((c) => c.id === product.categoryId);
                const out = product.stock <= 0;
                const low = !out && product.stock <= product.minStock;
                return (
                  <button
                    key={product.id}
                    onClick={() => addProduct(product)}
                    disabled={out && !settings.allowNegativeStock}
                    className={cn(
                      'group relative flex cursor-pointer flex-col rounded-xl border border-slate-200 bg-white p-3 text-left transition-all',
                      'hover:border-primary-300 hover:shadow-card active:scale-[0.98]',
                      'disabled:cursor-not-allowed disabled:opacity-50',
                      'dark:border-slate-700 dark:bg-slate-900 dark:hover:border-primary-700',
                    )}
                  >
                    <div className="mb-2 flex items-start justify-between gap-1">
                      <ProductIcon categoryId={product.categoryId} color={category?.color} />
                      {product.isFavorite && <Star className="size-3.5 fill-amber-400 text-amber-400" aria-hidden />}
                    </div>
                    <p className="line-clamp-2 text-sm font-semibold text-slate-800 dark:text-slate-200">{product.name}</p>
                    <p className="text-[11px] text-slate-400">{product.sku}</p>
                    <div className="mt-auto flex items-end justify-between pt-2">
                      <p className="font-display text-base font-bold text-slate-900 tabular-nums dark:text-slate-50">
                        {formatMoney(product.salePrice)}
                      </p>
                      {out ? (
                        <Badge variant="danger">Sin stock</Badge>
                      ) : low ? (
                        <Badge variant="warning">{product.stock} u.</Badge>
                      ) : (
                        <span className="text-[11px] text-slate-400">{product.stock} u.</span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Carrito desktop */}
      <div className="hidden w-[380px] shrink-0 lg:block">
        <CartPanel
          lines={lines}
          totals={totals}
          customer={customer}
          onCustomerChange={setCustomer}
          discountPercent={discountPercent}
          discountAmount={discountAmount}
          onDiscountPercent={setDiscountPercent}
          onDiscountAmount={setDiscountAmount}
          surcharge={surcharge}
          onSurcharge={setSurcharge}
          onChangeQuantity={changeQuantity}
          onRemoveLine={(lineId) => setLines((prev) => prev.filter((l) => l.lineId !== lineId))}
          onClear={clearCart}
          onCheckout={openPayment}
          sellerName={user?.name ?? ''}
          registerNumber={openRegister?.number ?? null}
        />
      </div>

      {/* Botón carrito mobile */}
      <button
        onClick={() => setCartDrawerOpen(true)}
        className="fixed right-4 bottom-20 z-40 flex cursor-pointer items-center gap-2 rounded-full bg-primary-600 px-5 py-3.5 font-semibold text-white shadow-pop transition-transform active:scale-95 lg:hidden"
        aria-label={`Ver carrito (${itemCount} productos)`}
      >
        <ShoppingCart className="size-5" aria-hidden />
        {itemCount > 0 && (
          <>
            <span className="text-sm">{itemCount}</span>
            <span className="text-sm tabular-nums">{formatMoney(totals.total)}</span>
          </>
        )}
      </button>

      <Drawer open={cartDrawerOpen} onClose={() => setCartDrawerOpen(false)} title="Carrito" side="bottom">
        <CartPanel
          lines={lines}
          totals={totals}
          customer={customer}
          onCustomerChange={setCustomer}
          discountPercent={discountPercent}
          discountAmount={discountAmount}
          onDiscountPercent={setDiscountPercent}
          onDiscountAmount={setDiscountAmount}
          surcharge={surcharge}
          onSurcharge={setSurcharge}
          onChangeQuantity={changeQuantity}
          onRemoveLine={(lineId) => setLines((prev) => prev.filter((l) => l.lineId !== lineId))}
          onClear={clearCart}
          onCheckout={() => {
            setCartDrawerOpen(false);
            openPayment();
          }}
          sellerName={user?.name ?? ''}
          registerNumber={openRegister?.number ?? null}
          bare
        />
      </Drawer>

      <PaymentModal
        open={paymentOpen}
        onClose={() => setPaymentOpen(false)}
        lines={lines}
        totals={totals}
        customer={customer}
        promotionId={promotionId}
        discountPercent={discountPercent}
        discountAmount={discountAmount}
        surcharge={surcharge}
        onSuccess={(saleId) => {
          setPaymentOpen(false);
          resetSale();
          navigate(ROUTES.receipt(saleId));
        }}
      />
    </div>
  );
}

/** Promociones vigentes (activas y dentro de fechas). */
function usePromotionsActive(): Promotion[] {
  const promotions = usePromotionStore((s) => s.promotions);
  const now = new Date();
  return promotions.filter(
    (p) => p.isActive && isWithinInterval(now, { start: parseISO(p.startDate), end: parseISO(p.endDate) }),
  );
}
