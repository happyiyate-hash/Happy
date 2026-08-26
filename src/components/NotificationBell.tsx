import React, { useEffect, useState } from 'react';
import { Bell } from 'lucide-react';

interface NotificationBellProps {
  unreadCount: number;
  onClick: () => void;
  className?: string;
}

export const NotificationBell: React.FC<NotificationBellProps> = ({
  unreadCount,
  onClick,
  className = '',
}) => {
  const [shouldAnimate, setShouldAnimate] = useState(false);

  useEffect(() => {
    if (unreadCount > 0) {
      setShouldAnimate(true);
      const timer = setTimeout(() => {
        setShouldAnimate(false);
      }, 3600);
      return () => clearTimeout(timer);
    } else {
      setShouldAnimate(false);
    }
  }, [unreadCount]);

  return (
    <button
      type="button"
      onClick={onClick}
      className={`relative p-2 rounded-full hover:bg-zinc-800/80 active:scale-95 transition-all text-white cursor-pointer focus:outline-none ${className}`}
      title="Notification Center"
    >
      <Bell
        className={`w-5 h-5 text-white stroke-[2.2] ${
          shouldAnimate ? 'animate-bell-shake' : ''
        }`}
      />
      {unreadCount > 0 && (
        <span className="absolute top-0 right-0 bg-rose-500 text-white font-mono font-bold text-[10px] min-w-[16px] h-[16px] px-1 flex items-center justify-center rounded-full shadow-sm border border-[#090C13] select-none">
          {unreadCount > 99 ? '99+' : unreadCount}
        </span>
      )}
    </button>
  );
};
