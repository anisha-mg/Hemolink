import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import NotificationBell from './NotificationBell';
import { Heart, Activity, User, LogOut, ShieldAlert, ArrowRightLeft, RefreshCw } from 'lucide-react';

export default function Navbar() {
  const { user, logout, switchRole } = useAuth();
  const { isConnected } = useSocket();
  const navigate = useNavigate();
  const [switching, setSwitching] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleSwitchRole = async () => {
    setSwitching(true);
    try {
      const res = await switchRole();
      if (res.user.role === 'donor') {
        navigate('/donor-dashboard');
      } else if (res.user.role === 'requester') {
        navigate('/requester-dashboard');
      }
    } catch (err) {
      console.error('Role switch failed:', err);
    } finally {
      setSwitching(false);
    }
  };

  return (
    <header className="bg-white border-b border-slate-100 sticky top-0 z-40 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        
        {/* Brand Logo */}
        <Link to="/" className="flex items-center gap-2.5 group">
          <div className="w-10 h-10 rounded-2xl bg-crimson-700 text-white flex items-center justify-center shadow-soft group-hover:scale-105 transition-transform">
            <Heart className="w-5 h-5 fill-current" />
          </div>
          <div>
            <span className="font-heading font-bold text-xl tracking-tight text-slate-900">
              Hemo<span className="text-crimson-700">Link</span>
            </span>
            <span className="block text-[10px] uppercase font-mono tracking-widest text-slate-400 -mt-1">
              Real-time Emergency
            </span>
          </div>
        </Link>

        {/* User Navigation Actions */}
        {user ? (
          <div className="flex items-center gap-3">
            
            {/* Live WebSocket Connection Status Badge */}
            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 text-xs font-mono text-slate-600">
              <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
              {isConnected ? 'LIVE' : 'CONNECTING'}
            </div>

            {/* Role Switcher Toggle Button */}
            {user.role !== 'admin' && (
              <button
                onClick={handleSwitchRole}
                disabled={switching}
                title={`Switch from ${user.role} mode`}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl text-xs font-semibold shadow-sm transition-all hover:scale-105 disabled:opacity-50"
              >
                {switching ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <ArrowRightLeft className="w-3.5 h-3.5 text-crimson-400" />
                )}
                <span className="hidden sm:inline">
                  {user.role === 'donor' ? 'Switch to Requester' : 'Switch to Donor'}
                </span>
              </button>
            )}

            {/* Role Badge */}
            <span className={`px-2.5 py-1 rounded-full text-xs font-semibold uppercase font-mono tracking-wide ${
              user.role === 'donor' 
                ? 'bg-crimson-50 text-crimson-700 border border-crimson-200' 
                : user.role === 'admin'
                ? 'bg-purple-50 text-purple-700 border border-purple-200'
                : 'bg-sage-50 text-sage-500 border border-sage-100'
            }`}>
              {user.role}
            </span>

            {/* Navigation links based on role */}
            <nav className="flex items-center gap-3">
              {user.role === 'donor' && (
                <Link 
                  to="/donor-dashboard" 
                  className="hidden md:flex items-center gap-1.5 text-sm font-medium text-slate-700 hover:text-crimson-700 transition-colors"
                >
                  <Activity className="w-4 h-4" />
                  Donor Dashboard
                </Link>
              )}

              {user.role === 'requester' && (
                <Link 
                  to="/requester-dashboard" 
                  className="hidden md:flex items-center gap-1.5 text-sm font-medium text-slate-700 hover:text-sage-500 transition-colors"
                >
                  <Activity className="w-4 h-4" />
                  My Requests
                </Link>
              )}

              {user.role === 'admin' && (
                <Link 
                  to="/admin" 
                  className="hidden md:flex items-center gap-1.5 text-sm font-medium text-purple-700 hover:text-purple-900 transition-colors"
                >
                  <ShieldAlert className="w-4 h-4" />
                  Admin Overview
                </Link>
              )}
            </nav>

            {/* Real-Time Notification Bell Component */}
            <NotificationBell />

            {/* User Profile info */}
            <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
              <div className="w-8 h-8 rounded-full bg-slate-200 text-slate-700 font-bold flex items-center justify-center text-xs font-mono">
                {user.fullName ? user.fullName[0].toUpperCase() : 'U'}
              </div>
              <span className="hidden lg:block text-xs font-medium text-slate-700">
                {user.fullName || user.email}
              </span>
              <button
                onClick={handleLogout}
                title="Logout"
                className="p-2 text-slate-400 hover:text-crimson-700 rounded-xl hover:bg-slate-50 transition-colors"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>

          </div>
        ) : (
          <div className="flex items-center gap-3">
            <Link
              to="/login"
              className="text-sm font-medium text-slate-700 hover:text-crimson-700 px-3 py-2 transition-colors"
            >
              Sign In
            </Link>
            <Link
              to="/register"
              className="text-sm font-medium bg-crimson-700 text-white px-4 py-2 rounded-2xl hover:bg-crimson-800 shadow-soft transition-all hover:scale-105"
            >
              Register Now
            </Link>
          </div>
        )}

      </div>
    </header>
  );
}
