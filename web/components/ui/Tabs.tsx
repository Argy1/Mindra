'use client';

import {
  createContext,
  useCallback,
  useContext,
  useId,
  useMemo,
  useState,
  type ComponentProps,
  type KeyboardEvent,
  type ReactNode,
} from 'react';
import { cn } from '@/lib/utils/cn';

interface TabsContextValue {
  baseId: string;
  value: string;
  setValue: (value: string) => void;
}

const TabsContext = createContext<TabsContextValue | null>(null);

function useTabs(): TabsContextValue {
  const context = useContext(TabsContext);
  if (!context) throw new Error('Komponen Tabs harus berada di dalam <Tabs>.');
  return context;
}

/** id aman untuk atribut `id`/`aria-*` (spasi dan karakter khusus diganti). */
function safeId(value: string): string {
  return value.replace(/[^a-zA-Z0-9_-]/g, '-');
}

interface TabsProps {
  /** Mode terkendali. */
  value?: string;
  /** Mode tak terkendali: tab yang aktif di awal. */
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  children: ReactNode;
  className?: string;
}

/**
 * Tab dengan gaya "segmented" (design/ui.css `.segmented`), mengikuti pola ARIA Tabs:
 * panah kiri/kanan berpindah tab, Home/End ke ujung, hanya tab aktif yang bisa di-Tab.
 *
 * <Tabs defaultValue="7">
 *   <TabsList label="Periode"><TabsTrigger value="7">7 hari</TabsTrigger>…</TabsList>
 *   <TabsContent value="7">…</TabsContent>
 * </Tabs>
 */
export function Tabs({ value, defaultValue = '', onValueChange, children, className }: TabsProps) {
  const baseId = useId();
  const [internal, setInternal] = useState(defaultValue);
  const isControlled = value !== undefined;
  const current = isControlled ? value : internal;

  const setValue = useCallback(
    (next: string) => {
      if (!isControlled) setInternal(next);
      onValueChange?.(next);
    },
    [isControlled, onValueChange],
  );

  const context = useMemo(
    () => ({ baseId, value: current, setValue }),
    [baseId, current, setValue],
  );

  return (
    <TabsContext value={context}>
      <div className={className}>{children}</div>
    </TabsContext>
  );
}

interface TabsListProps extends Omit<ComponentProps<'div'>, 'role' | 'aria-label'> {
  /** Wajib: nama daftar tab untuk pembaca layar, mis. "Periode". */
  label: string;
}

export function TabsList({ label, className, onKeyDown, ...rest }: TabsListProps) {
  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    onKeyDown?.(event);
    if (event.defaultPrevented) return;

    const tabs = Array.from(
      event.currentTarget.querySelectorAll<HTMLButtonElement>('[role="tab"]:not(:disabled)'),
    );
    const index = tabs.findIndex((tab) => tab === document.activeElement);
    if (index === -1 || tabs.length === 0) return;

    let next: number | null = null;
    if (event.key === 'ArrowRight') next = (index + 1) % tabs.length;
    else if (event.key === 'ArrowLeft') next = (index - 1 + tabs.length) % tabs.length;
    else if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = tabs.length - 1;
    if (next === null) return;

    event.preventDefault();
    const target = tabs[next];
    target?.focus();
    target?.click(); // aktivasi otomatis: fokus = pilih
  }

  return (
    // Handler di tablist adalah pola ARIA Tabs yang disengaja: panah berpindah antar tab.
    // eslint-disable-next-line jsx-a11y/interactive-supports-focus -- fokus ada di setiap tab (role="tab")
    <div
      {...rest}
      role="tablist"
      aria-label={label}
      onKeyDown={handleKeyDown}
      className={cn('inline-flex gap-1 rounded-pill bg-sunken p-1', className)}
    />
  );
}

interface TabsTriggerProps extends Omit<ComponentProps<'button'>, 'role' | 'value'> {
  value: string;
}

export function TabsTrigger({
  value,
  className,
  onClick,
  type = 'button',
  ...rest
}: TabsTriggerProps) {
  const tabs = useTabs();
  const selected = tabs.value === value;
  const key = safeId(value);

  return (
    <button
      {...rest}
      type={type}
      role="tab"
      id={`${tabs.baseId}-tab-${key}`}
      aria-selected={selected}
      aria-controls={`${tabs.baseId}-panel-${key}`}
      tabIndex={selected ? 0 : -1}
      onClick={(event) => {
        onClick?.(event);
        if (!event.defaultPrevented) tabs.setValue(value);
      }}
      className={cn(
        'touch-target min-h-9 cursor-pointer rounded-pill px-4 text-sm font-semibold text-fg-3',
        'transition-colors duration-(--dur-fast) hover:text-fg-1',
        'aria-selected:bg-raised aria-selected:text-fg-1 aria-selected:shadow-xs',
        'disabled:pointer-events-none disabled:opacity-50',
        className,
      )}
    />
  );
}

interface TabsContentProps extends Omit<ComponentProps<'div'>, 'role' | 'id'> {
  value: string;
}

/**
 * Panel selalu ada di DOM (supaya `aria-controls` pada tab valid), tetapi isinya hanya
 * dirender saat tab aktif — grafik berat tidak dibangun untuk tab yang tidak dilihat.
 */
export function TabsContent({ value, className, children, ...rest }: TabsContentProps) {
  const tabs = useTabs();
  const selected = tabs.value === value;
  const key = safeId(value);

  return (
    <div
      {...rest}
      role="tabpanel"
      id={`${tabs.baseId}-panel-${key}`}
      aria-labelledby={`${tabs.baseId}-tab-${key}`}
      hidden={!selected}
      tabIndex={0}
      className={className}
    >
      {selected ? children : null}
    </div>
  );
}
