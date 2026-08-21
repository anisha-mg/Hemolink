import React, { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';
import axios from 'axios';

const SocketContext = createContext();

export function SocketProvider({ children }) {
  const { token, user } = useAuth();
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [toasts, setToasts] = useState([]);

  // Fetch persistent notifications from database
  const fetchNotifications = async () => {
    if (!token) return;
    try {
      const res = await axios.get('/api/notifications');
      if (res.data.success) {
        setNotifications(res.data.notifications);
        setUnreadCount(res.data.unreadCount);
      }
    } catch (err) {
      console.error('Failed to fetch notifications:', err);
    }
  };

  useEffect(() => {
    if (!token || !user) {
      if (socket) {
        socket.disconnect();
        setSocket(null);
      }
      setIsConnected(false);
      return;
    }

    fetchNotifications();

    const socketUrl = import.meta.env.VITE_API_URL || (window.location.protocol + '//' + window.location.hostname + ':5000');
    const newSocket = io(socketUrl, {
      auth: { token },
      transports: ['websocket', 'polling']
    });

    newSocket.on('connect', () => {
      console.log('⚡ Socket.IO connected:', newSocket.id);
      setIsConnected(true);
    });

    newSocket.on('disconnect', () => {
      console.log('🔌 Socket.IO disconnected');
      setIsConnected(false);
    });

    // Real-time Notification event
    newSocket.on('notification:new', (notif) => {
      setNotifications(prev => [notif, ...prev]);
      setUnreadCount(prev => prev + 1);

      // Add floating Toast alert
      const toastId = Date.now();
      setToasts(prev => [...prev, { id: toastId, title: notif.title, message: notif.message, type: notif.type }]);

      setTimeout(() => {
        setToasts(prev => prev.filter(t => t.id !== toastId));
      }, 5000);
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, [token, user]);

  const markAllRead = async () => {
    try {
      await axios.patch('/api/notifications/read-all');
      setUnreadCount(0);
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    } catch (err) {
      console.error('Failed to mark read:', err);
    }
  };

  const removeToast = (id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  return (
    <SocketContext.Provider value={{ socket, isConnected, notifications, unreadCount, toasts, markAllRead, removeToast, fetchNotifications }}>
      {children}
      {/* Toast Alert Portal Container */}
      <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-3 max-w-sm w-full pointer-events-none">
        {toasts.map(toast => (
          <div
            key={toast.id}
            className="pointer-events-auto bg-slate-900 text-white p-4 rounded-2xl shadow-elevated border border-slate-700 flex items-start gap-3 animate-bounce-short"
          >
            <div className="w-3 h-3 rounded-full bg-crimson-600 animate-ping mt-1.5 flex-shrink-0" />
            <div className="flex-1">
              <h4 className="font-heading font-semibold text-sm text-crimson-100">{toast.title}</h4>
              <p className="text-xs text-slate-300 mt-0.5">{toast.message}</p>
            </div>
            <button
              onClick={() => removeToast(toast.id)}
              className="text-slate-400 hover:text-white text-xs font-bold px-1"
            >
              ✕
            </button>
          </div>
        ))}
      </div>
    </SocketContext.Provider>
  );
}

export function useSocket() {
  return useContext(SocketContext);
}
