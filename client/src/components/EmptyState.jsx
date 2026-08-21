import React from 'react';
import { Inbox } from 'lucide-react';

export default function EmptyState({ title = "No data available", message = "There are no records found at this time.", icon: Icon = Inbox, actionLabel, onAction }) {
  return (
    <div className="bg-white rounded-3xl p-8 sm:p-12 text-center border border-slate-100 shadow-card max-w-lg mx-auto my-6">
      <div className="w-16 h-16 rounded-3xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-4">
        <Icon className="w-8 h-8 opacity-70" />
      </div>
      <h3 className="font-heading font-bold text-lg text-slate-900 mb-1">{title}</h3>
      <p className="text-slate-500 text-sm max-w-sm mx-auto leading-relaxed mb-6">{message}</p>
      {actionLabel && onAction && (
        <button
          onClick={onAction}
          className="bg-crimson-700 hover:bg-crimson-800 text-white font-medium text-sm px-5 py-2.5 rounded-2xl shadow-soft transition-all hover:scale-105"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}
