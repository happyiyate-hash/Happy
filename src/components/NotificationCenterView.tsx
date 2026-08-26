import React, { useState, useEffect } from 'react';
import {
  Bell,
  ArrowLeft,
  Gift,
  Coins,
  ArrowDown,
  FileText,
  ArrowUp,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
  CheckCheck,
  Trash2,
  RefreshCw,
  ExternalLink,
} from 'lucide-react';
import {
  AppNotification,
  getCachedNotifications,
  saveCachedNotifications,
  fetchUserNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  subscribeToRealtimeNotifications,
} from '../lib/supabase';

interface NotificationCenterViewProps {
  currentUser?: any;
  onClose?: () => void;
  onNavigateToTab?: (tab: string) => void;
  onUnreadCountChange?: (count: number) => void;
}

interface NotificationDetailsProps {
  details?: Record<string, any>;
}

export const NotificationDetails: React.FC<NotificationDetailsProps> = ({ details }) => {
  if (!details || typeof details !== 'object') return null;

  const items: { label: string; value: string }[] = [];

  // 1. IP
  if (details.ip) {
    items.push({ label: 'IP', value: String(details.ip) });
  }

  // 2. Location
  if (details.location) {
    items.push({ label: 'Location', value: String(details.location) });
  }

  // 3. Client / Browser / OS
  if (details.client) {
    items.push({ label: 'Client', value: String(details.client) });
  } else if (details.browser || details.os) {
    const parts = [details.browser, details.os ? `on ${details.os}` : ''].filter(Boolean);
    if (parts.length > 0) {
      items.push({ label: 'Client', value: parts.join(' ') });
    }
  }

  // 4. Time / Timestamp
  if (details.time) {
    items.push({ label: 'Time', value: String(details.time) });
  } else if (details.timestamp) {
    try {
      const d = new Date(details.timestamp);
      const formatted = !isNaN(d.getTime())
        ? d.toLocaleString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
            hour12: true,
          })
        : String(details.timestamp);
      items.push({ label: 'Time', value: formatted });
    } catch {
      items.push({ label: 'Time', value: String(details.timestamp) });
    }
  }

  // 5. Transaction
  const txVal = details.transaction || details.txHash || details.tx_hash || details.hash;
  if (txVal) {
    items.push({ label: 'Transaction', value: String(txVal) });
  }

  // 6. Amount
  if (details.amount) {
    items.push({ label: 'Amount', value: String(details.amount) });
  }

  // 7. Token
  const tokenVal = details.token || details.tokenSymbol;
  if (tokenVal) {
    items.push({ label: 'Token', value: String(tokenVal) });
  }

  // 8. Network
  const networkVal = details.network || details.chain;
  if (networkVal) {
    items.push({ label: 'Network', value: String(networkVal) });
  }

  // 9. Status
  if (details.status) {
    items.push({ label: 'Status', value: String(details.status) });
  }

  // 10. Action
  if (details.action) {
    items.push({ label: 'Action', value: String(details.action) });
  }

  // 11. Method
  if (details.method) {
    items.push({ label: 'Method', value: String(details.method) });
  }

  // 12. Device
  if (details.device) {
    items.push({ label: 'Device', value: String(details.device) });
  }

  // Any other custom keys
  const handledKeys = new Set([
    'ip',
    'location',
    'client',
    'browser',
    'os',
    'time',
    'timestamp',
    'transaction',
    'txHash',
    'tx_hash',
    'hash',
    'amount',
    'token',
    'tokenSymbol',
    'network',
    'chain',
    'status',
    'action',
    'method',
    'device',
    'deviceType',
    'category',
    'icon',
    'url',
    'actionUrl',
  ]);

  Object.keys(details).forEach((key) => {
    if (!handledKeys.has(key)) {
      const val = details[key];
      if (val !== undefined && val !== null && String(val).trim() !== '') {
        const formattedLabel = key
          .replace(/([A-Z])/g, ' $1')
          .replace(/_/g, ' ')
          .trim()
          .replace(/^\w/, (c) => c.toUpperCase());
        items.push({ label: formattedLabel, value: String(val) });
      }
    }
  });

  if (items.length === 0) return null;

  return (
    <div className="mt-2 pt-2 border-t border-white/[0.06] w-full max-w-full min-w-0 box-border">
      {items.map((item, idx) => (
        <div
          key={idx}
          className="grid grid-cols-[80px_minmax(0,1fr)] max-[380px]:grid-cols-[65px_minmax(0,1fr)] gap-x-2 items-start py-0.5 w-full min-w-0 max-w-full"
        >
          <div className="text-zinc-500 text-[10.5px] max-[380px]:text-[10px] font-semibold select-none shrink-0">
            {item.label}
          </div>
          <div className="text-zinc-200 text-[10.5px] max-[380px]:text-[10px] leading-tight min-w-0 max-w-full [overflow-wrap:anywhere] [word-break:break-word]">
            {item.value}
          </div>
        </div>
      ))}
    </div>
  );
};

export const NotificationCenterView: React.FC<NotificationCenterViewProps> = ({
  currentUser,
  onClose,
  onNavigateToTab,
  onUnreadCountChange,
}) => {
  const userId = currentUser?.id || 'demo-user-id';

  // Synchronously initialize state from local storage cache for instant rendering
  const [notifications, setNotifications] = useState<AppNotification[]>(() => {
    return getCachedNotifications(userId);
  });

  // Only show full loading spinner if local cache is completely empty
  const [loading, setLoading] = useState<boolean>(() => {
    const cached = getCachedNotifications(userId);
    return cached.length === 0;
  });

  // Background revalidation status
  const [isSyncing, setIsSyncing] = useState<boolean>(false);

  const [activeFilter, setActiveFilter] = useState<'all' | 'rewards' | 'transactions' | 'system'>('all');
  const [expandedIds, setExpandedIds] = useState<Record<string, boolean>>({});

  const toggleExpand = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    handleMarkAsRead(id);
    setExpandedIds((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  // Stale-While-Revalidate lifecycle & realtime updates
  useEffect(() => {
    let isMounted = true;

    // Report cached unread count immediately
    const cachedInitial = getCachedNotifications(userId);
    if (cachedInitial.length > 0) {
      const unread = cachedInitial.filter((n) => !n.is_read).length;
      if (onUnreadCountChange) onUnreadCountChange(unread);
    }

    // Silent background fetch
    const syncNotifications = async () => {
      if (cachedInitial.length > 0) {
        setIsSyncing(true);
      } else {
        setLoading(true);
      }

      try {
        const freshData = await fetchUserNotifications(userId);
        if (!isMounted) return;

        setNotifications(freshData);
        const unread = freshData.filter((n) => !n.is_read).length;
        if (onUnreadCountChange) onUnreadCountChange(unread);
      } catch (err) {
        console.warn('Background notification sync note:', err);
      } finally {
        if (isMounted) {
          setLoading(false);
          setIsSyncing(false);
        }
      }
    };

    syncNotifications();

    // Realtime notification listener
    const unsubscribe = subscribeToRealtimeNotifications(userId, (newNotif) => {
      if (!isMounted) return;

      if (newNotif) {
        setNotifications((prev) => {
          const exists = prev.some((n) => n.id === newNotif.id);
          let updated: AppNotification[];
          if (exists) {
            updated = prev.map((n) =>
              n.id === newNotif.id ? { ...newNotif, is_read: n.is_read || newNotif.is_read } : n
            );
          } else {
            // Unshift new notification at top immediately
            updated = [newNotif, ...prev];
          }

          saveCachedNotifications(userId, updated);
          const unread = updated.filter((n) => !n.is_read).length;
          if (onUnreadCountChange) onUnreadCountChange(unread);
          return updated;
        });
      } else {
        syncNotifications();
      }
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, [userId]);

  // Optimistic Mark Read
  const handleMarkAsRead = async (id: string) => {
    const target = notifications.find((n) => n.id === id);
    if (target && target.is_read) return;

    const updated = notifications.map((n) => (n.id === id ? { ...n, is_read: true } : n));
    setNotifications(updated);
    saveCachedNotifications(userId, updated);

    const unread = updated.filter((n) => !n.is_read).length;
    if (onUnreadCountChange) onUnreadCountChange(unread);

    markNotificationAsRead(id, userId).catch((err) => {
      console.warn('Background mark read sync error:', err);
    });
  };

  // Optimistic Mark All Read
  const handleMarkAllRead = async () => {
    const hasUnread = notifications.some((n) => !n.is_read);
    if (!hasUnread) return;

    const updated = notifications.map((n) => ({ ...n, is_read: true }));
    setNotifications(updated);
    saveCachedNotifications(userId, updated);

    if (onUnreadCountChange) onUnreadCountChange(0);

    markAllNotificationsAsRead(userId).catch((err) => {
      console.warn('Background mark all read sync error:', err);
    });
  };

  // Optimistic Clear All
  const handleClearAll = async () => {
    setNotifications([]);
    saveCachedNotifications(userId, []);
    if (onUnreadCountChange) onUnreadCountChange(0);

    try {
      await markAllNotificationsAsRead(userId);
    } catch {}
  };

  // Robust Category Matching
  const isRewardNotif = (n: AppNotification) => {
    const type = (n.type || '').toLowerCase();
    const cat = n.metadata?.category;
    return type.includes('reward') || type.includes('donat') || cat === 'rewards';
  };

  const isTxNotif = (n: AppNotification) => {
    const type = (n.type || '').toLowerCase();
    const cat = n.metadata?.category;
    return type.includes('withdraw') || type.includes('payout') || type.includes('tx') || cat === 'transactions';
  };

  const isSystemNotif = (n: AppNotification) => {
    const type = (n.type || '').toLowerCase();
    const cat = n.metadata?.category;
    return type.includes('security') || type.includes('system') || type.includes('alert') || type.includes('login') || cat === 'system';
  };

  // Category counts
  const rewardsCount = notifications.filter(isRewardNotif).length;
  const transactionsCount = notifications.filter(isTxNotif).length;
  const systemCount = notifications.filter(isSystemNotif).length;

  const filteredNotifications = notifications.filter((n) => {
    if (activeFilter === 'rewards') return isRewardNotif(n);
    if (activeFilter === 'transactions') return isTxNotif(n);
    if (activeFilter === 'system') return isSystemNotif(n);
    return true;
  });

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  const formatTimeAgo = (dateStr: string) => {
    if (!dateStr) return 'Just now';
    const diff = Math.floor((new Date().getTime() - new Date(dateStr).getTime()) / 1000);
    if (diff < 60) return 'Just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  };

  const getItemIcon = (n: AppNotification) => {
    const iconKey = n.metadata?.icon || '';
    const title = (n.title || '').toLowerCase();
    const type = (n.type || '').toUpperCase();

    // 1. Security / System -> 🟠 Amber Icon
    if (iconKey === 'shield' || type === 'SECURITY_ALERT' || type === 'SECURITY' || title.includes('login') || title.includes('security')) {
      return (
        <div className="w-7 h-7 rounded-lg bg-amber-500/15 border border-amber-500/20 flex items-center justify-center text-amber-400 shrink-0">
          <ShieldCheck className="w-3.5 h-3.5" />
        </div>
      );
    }
    // 2. Reward / Coins / Gift -> 🟢 Green Icon
    if (iconKey === 'coins' || type === 'REWARD_EARNED' || title.includes('reward')) {
      return (
        <div className="w-7 h-7 rounded-lg bg-emerald-500/15 border border-emerald-500/20 flex items-center justify-center text-[#4ADE80] shrink-0">
          <Coins className="w-3.5 h-3.5" />
        </div>
      );
    }
    if (iconKey === 'gift' || title.includes('welcome')) {
      return (
        <div className="w-7 h-7 rounded-lg bg-emerald-500/15 border border-emerald-500/20 flex items-center justify-center text-[#4ADE80] shrink-0">
          <Gift className="w-3.5 h-3.5" />
        </div>
      );
    }
    // 3. Transactions / Withdrawals -> 🔵 Blue Icon
    if (iconKey === 'arrow-down' || type === 'WITHDRAWAL_APPROVED' || title.includes('approved')) {
      return (
        <div className="w-7 h-7 rounded-lg bg-blue-500/15 border border-blue-500/20 flex items-center justify-center text-blue-400 shrink-0">
          <ArrowDown className="w-3.5 h-3.5" />
        </div>
      );
    }
    if (type === 'WITHDRAWAL_FAILED' || title.includes('rejected')) {
      return (
        <div className="w-7 h-7 rounded-lg bg-rose-500/15 border border-rose-500/20 flex items-center justify-center text-rose-400 shrink-0">
          <ArrowUp className="w-3.5 h-3.5" />
        </div>
      );
    }
    // 4. System / Token Verification -> 🟣 Purple Icon
    if (iconKey === 'file' || title.includes('token verification') || title.includes('token submitted')) {
      return (
        <div className="w-7 h-7 rounded-lg bg-purple-500/15 border border-purple-500/20 flex items-center justify-center text-purple-400 shrink-0">
          <FileText className="w-3.5 h-3.5" />
        </div>
      );
    }
    return (
      <div className="w-7 h-7 rounded-lg bg-emerald-500/15 border border-emerald-500/20 flex items-center justify-center text-[#4ADE80] shrink-0">
        <Bell className="w-3.5 h-3.5" />
      </div>
    );
  };

  return (
    <div className="w-full h-full flex flex-col min-h-0 overflow-hidden bg-[#06080E] text-white font-sans">
      
      {/* ========================================== */}
      {/* LAYER 1: FIXED SLIM TOP HEADER             */}
      {/* ========================================== */}
      <header className="shrink-0 z-40 bg-[#06080E] border-b border-white/[0.04] px-3 py-2 pt-safe-nav max-w-md mx-auto w-full flex items-center justify-between">
        <div className="flex items-center space-x-2">
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="px-2 py-1 bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] rounded-md text-zinc-300 transition-colors cursor-pointer flex items-center space-x-1 text-xs font-medium"
              title="Back"
            >
              <ArrowLeft className="w-3 h-3 text-[#4ADE80]" />
              <span>Back</span>
            </button>
          )}
          <div>
            <div className="flex items-center space-x-1.5">
              <h1 className="text-sm font-bold text-white tracking-tight flex items-center gap-1.5">
                Notifications
                <div className="relative inline-flex items-center">
                  <Bell className="w-3.5 h-3.5 text-[#4ADE80]" />
                  {unreadCount > 0 && (
                    <span className="w-1.5 h-1.5 rounded-full bg-[#22C55E] animate-pulse absolute -top-0.5 -right-0.5" />
                  )}
                </div>
              </h1>
              {isSyncing && (
                <span className="inline-flex items-center gap-1 text-[9px] text-emerald-400/80 font-mono font-medium animate-pulse">
                  <RefreshCw className="w-2.5 h-2.5 animate-spin text-[#4ADE80]" />
                </span>
              )}
            </div>
          </div>
        </div>

        {unreadCount > 0 && (
          <span className="bg-[#22C55E]/15 border border-[#22C55E]/30 text-[#4ADE80] text-[10px] font-bold px-2 py-0.5 rounded-full font-mono shrink-0">
            {unreadCount} unread
          </span>
        )}
      </header>

      {/* ========================================== */}
      {/* LAYER 2: COMPACT CATEGORY & QUICK ACTIONS  */}
      {/* ========================================== */}
      <div className="shrink-0 z-30 bg-[#06080E] border-b border-white/[0.04] max-w-md mx-auto w-full px-3 py-1.5 flex flex-col gap-1.5">
        {/* Category Pills */}
        <div className="flex items-center justify-between gap-1 w-full">
          {[
            { id: 'all', label: 'All', count: notifications.length },
            { id: 'rewards', label: 'Rewards', count: rewardsCount },
            { id: 'transactions', label: 'Transactions', count: transactionsCount },
            { id: 'system', label: 'System', count: systemCount },
          ].map((tab) => {
            const isActive = activeFilter === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveFilter(tab.id as any)}
                className={`flex-1 py-1 px-1 rounded-md text-[11px] transition-all cursor-pointer flex items-center justify-center space-x-1 ${
                  isActive
                    ? 'bg-[#22C55E]/15 text-[#4ADE80] border border-[#22C55E]/25 font-bold'
                    : 'text-zinc-400 hover:text-zinc-200 bg-white/[0.02] hover:bg-white/[0.04] border border-transparent font-medium'
                }`}
              >
                <span>{tab.label}</span>
                {tab.count > 0 && (
                  <span
                    className={`text-[9px] px-1 py-0.1 rounded-full font-mono font-bold ${
                      isActive
                        ? 'bg-[#22C55E]/25 text-[#4ADE80]'
                        : 'bg-zinc-800/80 text-zinc-400'
                    }`}
                  >
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Quick Actions Row */}
        {notifications.length > 0 && (
          <div className="flex items-center justify-between text-[10px] text-zinc-400 font-sans px-0.5">
            <button
              type="button"
              onClick={handleMarkAllRead}
              className="flex items-center space-x-1 hover:text-emerald-400 transition-colors cursor-pointer"
            >
              <CheckCheck className="w-3 h-3 text-emerald-400" />
              <span>Mark all read</span>
            </button>
            <button
              type="button"
              onClick={handleClearAll}
              className="flex items-center space-x-1 hover:text-rose-400 transition-colors cursor-pointer"
            >
              <Trash2 className="w-3 h-3 text-rose-400" />
              <span>Clear activity</span>
            </button>
          </div>
        )}
      </div>

      {/* ========================================== */}
      {/* LAYER 3: DENSE SLIM NOTIFICATION FEED     */}
      {/* ========================================== */}
      <div className="flex-1 min-h-0 overflow-y-auto max-w-md mx-auto w-full divide-y divide-white/[0.03]">
        {loading ? (
          <div className="p-6 text-center space-y-2 py-12">
            <RefreshCw className="w-4 h-4 text-[#4ADE80] animate-spin mx-auto" />
            <p className="text-xs text-zinc-400">Loading activity updates...</p>
          </div>
        ) : filteredNotifications.length === 0 ? (
          <div className="p-6 text-center space-y-1.5 py-12">
            <Bell className="w-6 h-6 text-zinc-600 mx-auto" />
            <h3 className="text-xs font-bold text-white">No notifications in this category</h3>
            <p className="text-[11px] text-zinc-500 max-w-xs mx-auto">
              Check back later for real-time activity updates.
            </p>
          </div>
        ) : (
          filteredNotifications.map((n) => {
            const isExpanded = !!expandedIds[n.id];

            return (
              <div
                key={n.id}
                onClick={(e) => toggleExpand(n.id, e)}
                className={`w-full py-2 px-3 transition-colors cursor-pointer group ${
                  isExpanded
                    ? 'bg-white/[0.04]'
                    : !n.is_read
                    ? 'bg-emerald-500/[0.03] hover:bg-white/[0.03]'
                    : 'hover:bg-white/[0.02]'
                }`}
              >
                <div className="flex items-start gap-2.5 w-full min-w-0">
                  {/* Left Icon sitting close to edge */}
                  <div className="relative shrink-0 pt-0.5">
                    {getItemIcon(n)}
                    {!n.is_read && (
                      <span
                        className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-[#22C55E] ring-2 ring-[#06080E] animate-pulse"
                        title="Unread"
                      />
                    )}
                  </div>

                  {/* Dense Content Block */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-1.5 w-full">
                      <h4
                        className={`text-[12px] leading-tight font-semibold truncate transition-colors ${
                          !n.is_read ? 'text-white font-bold' : 'text-zinc-200'
                        }`}
                      >
                        {n.title}
                      </h4>

                      <div className="flex items-center gap-1 shrink-0">
                        <span className="text-[10px] text-zinc-500 font-mono">
                          {formatTimeAgo(n.created_at)}
                        </span>
                        <ChevronDown
                          className={`w-3 h-3 text-zinc-500 transition-transform ${
                            isExpanded ? 'rotate-180 text-[#4ADE80]' : 'group-hover:text-zinc-300'
                          }`}
                        />
                      </div>
                    </div>

                    <p
                      className={`text-[11px] text-zinc-400 mt-0.5 leading-tight font-sans ${
                        isExpanded ? 'whitespace-pre-wrap select-text text-zinc-300' : 'line-clamp-1'
                      }`}
                    >
                      {n.message}
                    </p>

                    {/* Expanded Details */}
                    {isExpanded && (
                      <div className="mt-2 animate-in fade-in duration-150 w-full min-w-0">
                        <NotificationDetails details={n.metadata} />

                        {n.actionUrl && (
                          <div className="pt-2">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                if (onNavigateToTab && n.actionUrl) {
                                  const tabName = n.actionUrl.replace('/', '');
                                  onNavigateToTab(tabName);
                                }
                              }}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-[#22C55E]/15 hover:bg-[#22C55E]/25 text-[#4ADE80] border border-[#22C55E]/25 text-[10.5px] font-semibold transition-all cursor-pointer"
                            >
                              <span>View Details</span>
                              <ExternalLink className="w-2.5 h-2.5" />
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
