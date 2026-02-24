'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';

interface NotificationItem {
  id: string;
  event: 'trade.created' | 'user.balance_changed' | 'position.settled';
  createdAt: string;
  externalUserId?: string;
  title: string;
  detail: string;
}

interface ToastItem {
  key: string;
  title: string;
  detail: string;
  createdAt: string;
}

interface WebhookEventsResponse {
  trade_created?: Array<Record<string, unknown>>;
  user_balance_changed?: Array<Record<string, unknown>>;
  position_settled?: Array<Record<string, unknown>>;
}

const STORAGE_KEY = 'webhook_last_seen_at';
const POLL_MS = 5000;

function toNum(value: unknown, fallback = 0): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function toStr(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback;
}

function normalizeItems(json: WebhookEventsResponse): NotificationItem[] {
  const tradeItems = Array.isArray(json.trade_created)
    ? json.trade_created.map((e, idx) => ({
        id: toStr(e.event_id, `trade-${idx}`),
        event: 'trade.created' as const,
        createdAt: toStr(e.created_at),
        externalUserId: toStr(e.external_user_id) || undefined,
        title: '交易成交',
        detail: `${toStr(e.type).toUpperCase()} ${toStr(e.outcome).toUpperCase()} · ${toNum(e.shares)} 股 · $${toNum(e.total_amount).toFixed(2)}`,
      }))
    : [];

  const balanceItems = Array.isArray(json.user_balance_changed)
    ? json.user_balance_changed.map((e, idx) => ({
        id: toStr(e.event_id, `balance-${idx}`),
        event: 'user.balance_changed' as const,
        createdAt: toStr(e.created_at),
        externalUserId: toStr(e.external_user_id) || undefined,
        title: '餘額變動',
        detail: `${toStr(e.reason) || 'unknown'} · ${toNum(e.change) >= 0 ? '+' : ''}${toNum(e.change).toFixed(2)} · 餘額 $${toNum(e.balance_after).toFixed(2)}`,
      }))
    : [];

  const settledItems = Array.isArray(json.position_settled)
    ? json.position_settled.map((e, idx) => ({
        id: toStr(e.event_id, `settled-${idx}`),
        event: 'position.settled' as const,
        createdAt: toStr(e.created_at),
        externalUserId: toStr(e.external_user_id) || undefined,
        title: '持倉結算',
        detail: `Market ${toStr(e.market_id).slice(0, 8)}... · Payout $${toNum(e.payout).toFixed(2)}`,
      }))
    : [];

  return [...tradeItems, ...balanceItems, ...settledItems]
    .filter((item) => item.createdAt)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export function WebhookNotifications() {
  const searchParams = useSearchParams();
  const user = searchParams.get('user') ?? 'alice';
  const targetUserIds = useMemo(() => new Set([user, `demo_${user}`]), [user]);

  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [unread, setUnread] = useState(0);
  const [ready, setReady] = useState(false);
  const seenAtRef = useRef<string | null>(null);
  const seenEventIdsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    let mounted = true;
    let timer: NodeJS.Timeout | null = null;

    const fetchEvents = async () => {
      try {
        const res = await fetch('/api/webhook/events', { cache: 'no-store' });
        if (!res.ok) return;
        const json = (await res.json()) as WebhookEventsResponse;
        let normalized = normalizeItems(json);

        normalized = normalized.filter((item) => {
          if (!item.externalUserId) return true;
          return targetUserIds.has(item.externalUserId);
        });

        if (!mounted) return;
        setItems(normalized.slice(0, 20));

        if (seenEventIdsRef.current.size === 0) {
          seenEventIdsRef.current = new Set(normalized.map((item) => item.id));
        } else {
          const newItems = normalized.filter((item) => !seenEventIdsRef.current.has(item.id));
          if (newItems.length > 0) {
            setToasts((prev) => {
              const incoming = newItems
                .slice(0, 3)
                .reverse()
                .map((item) => ({
                  key: `${item.id}-${Date.now()}`,
                  title: item.title,
                  detail: item.detail,
                  createdAt: item.createdAt,
                }));
              return [...incoming, ...prev].slice(0, 4);
            });
          }
          seenEventIdsRef.current = new Set(normalized.map((item) => item.id));
        }

        if (seenAtRef.current === null) {
          const saved = window.localStorage.getItem(STORAGE_KEY);
          if (saved) {
            seenAtRef.current = saved;
          } else {
            const latest = normalized[0]?.createdAt ?? new Date().toISOString();
            seenAtRef.current = latest;
            window.localStorage.setItem(STORAGE_KEY, latest);
          }
          setReady(true);
          return;
        }

        const seenAt = seenAtRef.current;
        const unreadCount = normalized.filter((item) => new Date(item.createdAt).getTime() > new Date(seenAt).getTime()).length;
        setUnread(unreadCount);
      } catch {
        // Ignore polling errors; notification UI should fail silently.
      }
    };

    void fetchEvents();
    timer = setInterval(() => {
      void fetchEvents();
    }, POLL_MS);

    return () => {
      mounted = false;
      if (timer) clearInterval(timer);
    };
  }, [targetUserIds]);

  useEffect(() => {
    if (toasts.length === 0) return;
    const timer = setTimeout(() => {
      setToasts((prev) => prev.slice(0, -1));
    }, 4000);
    return () => clearTimeout(timer);
  }, [toasts]);

  const markAllRead = () => {
    const latest = items[0]?.createdAt ?? new Date().toISOString();
    seenAtRef.current = latest;
    window.localStorage.setItem(STORAGE_KEY, latest);
    setUnread(0);
  };

  return (
    <div className="relative">
      <button
        onClick={() => {
          setOpen((prev) => {
            const next = !prev;
            if (next) markAllRead();
            return next;
          });
        }}
        className="relative flex h-10 w-10 items-center justify-center rounded-full border border-slate-300 bg-white text-slate-700 shadow-sm transition hover:border-slate-400 hover:bg-slate-50"
        aria-label="Webhook 通知"
      >
        <svg className="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" aria-hidden="true">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M7 10a5 5 0 1 1 10 0v3.2c0 .6.24 1.18.67 1.6l.9.9a.7.7 0 0 1-.5 1.2H5.93a.7.7 0 0 1-.5-1.2l.9-.9A2.25 2.25 0 0 0 7 13.2V10Z"
          />
          <path strokeLinecap="round" strokeLinejoin="round" d="M10 19a2 2 0 0 0 4 0" />
        </svg>
        {ready && unread > 0 && (
          <span className="absolute -right-1.5 -top-1.5 inline-flex min-h-5 min-w-5 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-semibold text-white ring-2 ring-white">
            {unread > 99 ? '99+' : unread}
          </span>
        )}
      </button>

      <div className="pointer-events-none fixed right-2 top-20 z-40 flex w-[min(22rem,calc(100vw-1rem))] flex-col gap-2 sm:right-4 sm:top-16 sm:w-[360px] sm:max-w-[calc(100vw-2rem)]">
        {toasts.map((toast) => (
          <div
            key={toast.key}
            className="pointer-events-auto rounded-xl border border-slate-200 bg-white/95 px-4 py-3 shadow-lg backdrop-blur-sm"
          >
            <div className="flex items-start justify-between gap-2">
              <p className="text-sm font-semibold text-slate-800">{toast.title}</p>
              <p className="text-[11px] text-slate-400">
                {new Date(toast.createdAt).toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
            <p className="mt-1 text-xs text-slate-600">{toast.detail}</p>
          </div>
        ))}
      </div>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 z-20 mt-2 w-[min(22rem,calc(100vw-1rem))] overflow-hidden rounded-xl border border-gray-100 bg-white shadow-xl sm:w-96">
            <div className="border-b border-gray-100 px-4 py-3">
              <p className="text-sm font-semibold text-gray-900">Webhook 通知</p>
              <p className="text-xs text-gray-500">顯示目前使用者相關事件（{user}）</p>
            </div>

            <div className="max-h-96 overflow-y-auto">
              {items.length === 0 ? (
                <p className="px-4 py-6 text-sm text-gray-500">目前沒有通知。</p>
              ) : (
                items.map((item) => (
                  <div key={item.id} className="border-b border-gray-50 px-4 py-3 last:border-b-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-medium text-gray-800">{item.title}</p>
                      <p className="text-[11px] text-gray-400">
                        {new Date(item.createdAt).toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                    <p className="mt-1 text-xs text-gray-600">{item.detail}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
