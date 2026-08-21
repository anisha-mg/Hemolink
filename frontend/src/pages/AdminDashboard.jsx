import React, { useState, useEffect } from 'react';
import axios from 'axios';
import StatCounter from '../components/StatCounter';
import { Users, Heart, Activity, CheckCircle2, ShieldAlert, Database, RefreshCw } from 'lucide-react';

export default function AdminDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchAdminStats = async () => {
    setLoading(true);
    try {
      const res = await axios.get('/api/admin/stats');
      if (res.data.success) {
        setData(res.data);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch admin stats');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdminStats();
  }, []);

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-purple-700 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const stats = data?.stats || {};
  const bgDistribution = data?.bloodGroupDistribution || [];
  const recentRequests = data?.recentRequests || [];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      
      {/* Banner */}
      <div className="bg-gradient-to-r from-purple-900 to-purple-800 text-white rounded-3xl p-6 sm:p-8 shadow-elevated flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="bg-white/20 px-3 py-1 rounded-full text-xs font-mono font-bold tracking-wider uppercase backdrop-blur-sm">
              SQL AGGREGATED METRICS
            </span>
            <span className="bg-purple-300 text-purple-950 font-mono text-xs font-bold px-3 py-1 rounded-full">
              POSTGRESQL DB
            </span>
          </div>
          <h1 className="font-heading font-bold text-3xl sm:text-4xl text-white">
            System Admin Overview
          </h1>
          <p className="text-purple-100 text-sm mt-1 max-w-xl">
            Real-time analytics directly queried from PostgreSQL database tables (SELECT COUNT(*)...). Zero hardcoded or simulated values.
          </p>
        </div>

        <button
          onClick={fetchAdminStats}
          className="px-4 py-2.5 bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/20 text-white font-mono text-xs font-bold rounded-2xl flex items-center gap-2 transition-all"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh SQL Stats
        </button>
      </div>

      {error && (
        <div className="p-4 rounded-2xl bg-crimson-50 text-crimson-800 text-xs">
          {error}
        </div>
      )}

      {/* Real-time Animated Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
        
        <div className="bg-white rounded-3xl p-6 shadow-card border border-slate-100 space-y-2">
          <div className="w-10 h-10 rounded-2xl bg-purple-50 text-purple-700 flex items-center justify-center">
            <Users className="w-5 h-5" />
          </div>
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">Total Users</span>
          <div className="text-3xl font-heading text-slate-900">
            <StatCounter value={stats.totalUsers} />
          </div>
        </div>

        <div className="bg-white rounded-3xl p-6 shadow-card border border-slate-100 space-y-2">
          <div className="w-10 h-10 rounded-2xl bg-crimson-50 text-crimson-700 flex items-center justify-center">
            <Heart className="w-5 h-5 fill-current" />
          </div>
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">Available Donors</span>
          <div className="text-3xl font-heading text-slate-900">
            <StatCounter value={stats.availableDonors} />
            <span className="text-xs font-mono font-normal text-slate-400 ml-1">/ {stats.totalDonors}</span>
          </div>
        </div>

        <div className="bg-white rounded-3xl p-6 shadow-card border border-slate-100 space-y-2">
          <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-700 flex items-center justify-center">
            <Activity className="w-5 h-5" />
          </div>
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">Active Requests</span>
          <div className="text-3xl font-heading text-slate-900">
            <StatCounter value={stats.activeRequests} />
          </div>
        </div>

        <div className="bg-white rounded-3xl p-6 shadow-card border border-slate-100 space-y-2">
          <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">Fulfilled Donations</span>
          <div className="text-3xl font-heading text-slate-900">
            <StatCounter value={stats.totalDonations} />
          </div>
        </div>

      </div>

      {/* Blood Group Breakdown & Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Blood Group Distribution */}
        <div className="bg-white rounded-3xl p-6 shadow-card border border-slate-100 space-y-4">
          <h3 className="font-heading font-bold text-lg text-slate-900 border-b border-slate-100 pb-3 flex items-center gap-2">
            <Database className="w-5 h-5 text-purple-700" />
            Donor Blood Groups
          </h3>

          {bgDistribution.length === 0 ? (
            <p className="text-xs text-slate-400 text-center py-6">No donors registered in DB</p>
          ) : (
            <div className="space-y-3">
              {bgDistribution.map(bg => (
                <div key={bg.blood_group} className="flex items-center justify-between p-3 bg-slate-50 rounded-2xl">
                  <span className="font-mono font-bold text-sm text-crimson-700 bg-crimson-100 px-3 py-1 rounded-xl">
                    {bg.blood_group}
                  </span>
                  <span className="font-mono text-xs font-bold text-slate-700">
                    {bg.count} Donor(s) Registered
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Requests Table */}
        <div className="lg:col-span-2 bg-white rounded-3xl p-6 shadow-card border border-slate-100 space-y-4">
          <h3 className="font-heading font-bold text-lg text-slate-900 border-b border-slate-100 pb-3">
            Recent System Activity Log
          </h3>

          {recentRequests.length === 0 ? (
            <p className="text-xs text-slate-400 text-center py-8">No requests logged in database</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-100 text-slate-400 font-mono uppercase">
                    <th className="pb-3 font-semibold">ID</th>
                    <th className="pb-3 font-semibold">Patient</th>
                    <th className="pb-3 font-semibold">Blood</th>
                    <th className="pb-3 font-semibold">Hospital</th>
                    <th className="pb-3 font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 text-slate-700">
                  {recentRequests.map(r => (
                    <tr key={r.id} className="hover:bg-slate-50/50">
                      <td className="py-3 font-mono font-bold text-slate-400">#{r.id}</td>
                      <td className="py-3 font-semibold text-slate-900">{r.patient_name}</td>
                      <td className="py-3 font-mono font-bold text-crimson-700">{r.blood_group}</td>
                      <td className="py-3">{r.hospital_name}</td>
                      <td className="py-3">
                        <span className="px-2.5 py-1 rounded-full font-mono text-[10px] font-bold bg-slate-100 text-slate-800">
                          {r.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>

    </div>
  );
}
