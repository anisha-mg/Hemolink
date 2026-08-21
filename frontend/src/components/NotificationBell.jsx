import React, { useState } from 'react';
import { useSocket } from '../context/SocketContext';
import { Bell, CheckCheck, Clock } from 'lucide-react';

export default function NotificationBell() {
  const { notifications, unreadCount, markAllRead } = useSocket();
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-slate-600 hover:text-crimson-700 hover:bg-slate-100 rounded-2xl transition-colors"
        title="Notifications"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 w-5 h-5 bg-crimson-700 text-white font-mono text-[10px] font-bold rounded-full flex items-center justify-center animate-pulse">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <>
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => setIsOpen(false)} 
          />
          <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-elevated border border-slate-100 z-50 overflow-hidden animate-in fade-in duration-200">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <h3 className="font-heading font-semibold text-sm text-slate-900">Notifications</h3>
                {unreadCount > 0 && (
                  <span className="bg-crimson-100 text-crimson-800 text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full">
                    {unreadCount} unread
                  </span>
                )}
              </div>
              {unreadCount > 0 && (
                <button
                  onClick={markAllRead}
                  className="text-xs text-crimson-700 hover:text-crimson-900 font-medium flex items-center gap-1"
                >
                  <CheckCheck className="w-3.5 h-3.5" />
                  Mark all read
                </button>
              )}
            </div>

            <div className="max-h-80 overflow-y-auto divide-y divide-slate-50">
              {notifications.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-xs">
                  <Clock className="w-8 h-8 mx-auto mb-2 opacity-40 text-slate-400" />
                  No notifications yet
                </div>
              ) : (
                notifications.map((n) => (
                  <div
                    key={n.id}
                    className={`p-4 transition-colors ${n.is_read ? 'bg-white' : 'bg-crimson-50/40'}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <h4 className="text-xs font-semibold text-slate-900 font-heading">{n.title}</h4>
                      <span className="text-[10px] font-mono text-slate-400">
                        {new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 mt-1 leading-relaxed">{n.message}</p>
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
