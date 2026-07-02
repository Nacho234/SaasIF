import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Package, Users, Receipt, Truck, LayoutGrid, Search, CornerDownLeft } from 'lucide-react';
import { useUiStore } from '@/store/uiStore';
import { globalSearch, type SearchResult, type SearchResultType } from '@/services/searchService';
import { useDebounce } from '@/hooks/useDebounce';
import { EmptyState } from '@/components/ui/EmptyState';
import { Modal } from '@/components/ui/Modal';
import { cn } from '@/utils/cn';

const TYPE_META: Record<SearchResultType, { label: string; icon: typeof Package }> = {
  product: { label: 'Productos', icon: Package },
  customer: { label: 'Clientes', icon: Users },
  sale: { label: 'Ventas', icon: Receipt },
  supplier: { label: 'Proveedores', icon: Truck },
  module: { label: 'Módulos', icon: LayoutGrid },
};

export function GlobalSearch() {
  const open = useUiStore((s) => s.globalSearchOpen);
  const setOpen = useUiStore((s) => s.setGlobalSearchOpen);
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const debounced = useDebounce(query, 150);
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);

  const results = useMemo(() => (open ? globalSearch(debounced) : []), [debounced, open]);
  const grouped = useMemo(() => {
    const groups = new Map<SearchResultType, SearchResult[]>();
    for (const r of results) {
      groups.set(r.type, [...(groups.get(r.type) ?? []), r]);
    }
    return groups;
  }, [results]);

  useEffect(() => {
    if (open) {
      setQuery('');
      setActiveIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  useEffect(() => setActiveIndex(0), [results.length]);

  const go = (result: SearchResult) => {
    setOpen(false);
    navigate(result.url);
  };

  return (
    <Modal open={open} onClose={() => setOpen(false)} size="lg">
      <div className="-mx-5 -my-4">
        <div className="flex items-center gap-3 border-b border-slate-100 px-5 py-3 dark:border-slate-800">
          <Search className="size-5 text-slate-400" aria-hidden />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'ArrowDown') {
                e.preventDefault();
                setActiveIndex((i) => Math.min(i + 1, results.length - 1));
              } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                setActiveIndex((i) => Math.max(i - 1, 0));
              } else if (e.key === 'Enter' && results[activeIndex]) {
                go(results[activeIndex]);
              }
            }}
            placeholder="Buscar productos, clientes, ventas, módulos…"
            className="h-9 flex-1 bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400 dark:text-slate-100"
            aria-label="Búsqueda global"
          />
          <kbd className="hidden items-center gap-1 rounded border border-slate-200 px-1.5 py-0.5 text-[10px] text-slate-400 sm:flex dark:border-slate-700">
            <CornerDownLeft className="size-3" /> abrir
          </kbd>
        </div>

        <div className="max-h-[55dvh] overflow-y-auto p-2">
          {query.trim().length < 2 ? (
            <p className="px-4 py-8 text-center text-sm text-slate-400">
              Escribí al menos 2 caracteres. Probá “alimento”, “Juan” o “V-000”.
            </p>
          ) : results.length === 0 ? (
            <EmptyState
              icon={Search}
              title="Sin resultados"
              description={`No encontramos nada para “${query}”. Probá con otro término.`}
              className="py-8"
            />
          ) : (
            [...grouped.entries()].map(([type, items]) => {
              const meta = TYPE_META[type];
              return (
                <div key={type} className="mb-2">
                  <p className="px-3 pt-2 pb-1 text-[11px] font-semibold tracking-wider text-slate-400 uppercase">
                    {meta.label}
                  </p>
                  {items.map((result) => {
                    const index = results.indexOf(result);
                    return (
                      <button
                        key={`${result.type}-${result.id}`}
                        onClick={() => go(result)}
                        onMouseEnter={() => setActiveIndex(index)}
                        className={cn(
                          'flex w-full cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors',
                          index === activeIndex ? 'bg-primary-50 dark:bg-primary-950' : 'hover:bg-slate-50 dark:hover:bg-slate-800',
                        )}
                      >
                        <meta.icon className="size-4 shrink-0 text-slate-400" aria-hidden />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-medium text-slate-800 dark:text-slate-200">
                            {result.title}
                          </span>
                          <span className="block truncate text-xs text-slate-500">{result.subtitle}</span>
                        </span>
                      </button>
                    );
                  })}
                </div>
              );
            })
          )}
        </div>
      </div>
    </Modal>
  );
}
