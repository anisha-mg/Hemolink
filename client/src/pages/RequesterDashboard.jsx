import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { useSocket } from '../context/SocketContext';
import EmptyState from '../components/EmptyState';
import { Heart, Plus, MapPin, Activity, CheckCircle2, Clock, Navigation, AlertCircle } from 'lucide-react';

const BLOOD_GROUPS = ['O-', 'O+', 'A-', 'A+', 'B-', 'B+', 'AB-', 'AB+'];

export default function RequesterDashboard() {
  const { socket } = useSocket();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const [formData, setFormData] = useState({
    patientName: '',
    bloodGroup: 'O+',
    unitsNeeded: 1,
    hospitalName: '',
    city: 'Hyderabad',
    address: '',
    latitude: 17.4374,
    longitude: 78.4482,
    urgency: 'urgent',
    notes: ''
  });

  const [geoStatus, setGeoStatus] = useState('');

  const fetchRequests = async () => {
    try {
      const res = await axios.get('/api/requests');
      if (res.data.success) {
        setRequests(res.data.requests);
      }
    } catch (err) {
      console.error('Failed to fetch requests:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  // Listen to Socket events
  useEffect(() => {
    if (!socket) return;

    socket.on('match:accepted', () => {
      fetchRequests();
    });

    socket.on('request:completed', () => {
      fetchRequests();
    });

    return () => {
      socket.off('match:accepted');
      socket.off('request:completed');
    };
  }, [socket]);

  const handleGetLocation = () => {
    if (!navigator.geolocation) {
      setGeoStatus('Geolocation is not supported');
      return;
    }
    setGeoStatus('Fetching hospital GPS coordinates...');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setFormData(prev => ({
          ...prev,
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude
        }));
        setGeoStatus(`Hospital GPS Captured: ${pos.coords.latitude.toFixed(4)}, ${pos.coords.longitude.toFixed(4)}`);
      },
      (err) => {
        setGeoStatus('Could not capture GPS location.');
      }
    );
  };

  const handleCreateRequest = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');

    try {
      const res = await axios.post('/api/requests', formData);
      if (res.data.success) {
        setSuccessMsg(`Emergency request created! Matching engine immediately notified ${res.data.matchedDonorsCount} donor(s) nearby.`);
        setShowForm(false);
        fetchRequests();
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create emergency request');
    }
  };

  const handleCompleteDonation = async (requestId) => {
    if (!window.confirm('Confirm blood donation has been completed successfully?')) return;
    try {
      const res = await axios.post('/api/donations', { requestId });
      if (res.data.success) {
        fetchRequests();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to complete donation');
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 to-slate-800 text-white rounded-3xl p-6 sm:p-8 shadow-elevated flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div>
          <span className="bg-sage-500/20 text-sage-100 px-3 py-1 rounded-full text-xs font-mono font-bold tracking-wider uppercase border border-sage-500/30">
            REQUESTER PORTAL
          </span>
          <h1 className="font-heading font-bold text-3xl sm:text-4xl text-white mt-2">
            Emergency Blood Requests
          </h1>
          <p className="text-slate-300 text-sm mt-1 max-w-xl">
            Create real-time emergency requests. HemoLink's PostGIS spatial matching engine will instantly locate compatible donors nearby.
          </p>
        </div>

        <button
          onClick={() => setShowForm(!showForm)}
          className="px-6 py-3.5 bg-crimson-700 hover:bg-crimson-800 text-white font-semibold rounded-2xl shadow-soft flex items-center justify-center gap-2 text-sm transition-all hover:scale-105"
        >
          <Plus className="w-5 h-5" />
          Create Blood Request
        </button>
      </div>

      {successMsg && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Emergency Request Modal / Drawer */}
      {showForm && (
        <form onSubmit={handleCreateRequest} className="bg-white rounded-3xl p-6 sm:p-8 shadow-card border border-crimson-100 space-y-4 animate-in fade-in duration-200">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <h2 className="font-heading font-bold text-xl text-slate-900 flex items-center gap-2">
              <Heart className="w-5 h-5 text-crimson-700 fill-current" />
              New Emergency Blood Request
            </h2>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="text-slate-400 hover:text-slate-700 text-sm font-bold"
            >
              ✕
            </button>
          </div>

          {error && (
            <div className="p-3 rounded-xl bg-crimson-50 text-crimson-800 text-xs">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Patient Name</label>
              <input
                type="text"
                required
                value={formData.patientName}
                onChange={(e) => setFormData({ ...formData, patientName: e.target.value })}
                placeholder="Patient Full Name"
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Blood Group Required</label>
              <select
                value={formData.bloodGroup}
                onChange={(e) => setFormData({ ...formData, bloodGroup: e.target.value })}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-mono font-bold text-crimson-700"
              >
                {BLOOD_GROUPS.map(bg => (
                  <option key={bg} value={bg}>{bg}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Units Needed</label>
              <input
                type="number"
                min="1"
                max="10"
                value={formData.unitsNeeded}
                onChange={(e) => setFormData({ ...formData, unitsNeeded: e.target.value })}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-mono font-bold"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Hospital / Medical Center Name</label>
              <input
                type="text"
                required
                value={formData.hospitalName}
                onChange={(e) => setFormData({ ...formData, hospitalName: e.target.value })}
                placeholder="Apollo Hospital / Sunrise Care"
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Urgency Level</label>
              <select
                value={formData.urgency}
                onChange={(e) => setFormData({ ...formData, urgency: e.target.value })}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-semibold"
              >
                <option value="normal">Normal (Within 10 km)</option>
                <option value="urgent">Urgent (Within 20 km)</option>
                <option value="critical">Critical Emergency (Within 30 km)</option>
              </select>
            </div>
          </div>

          {/* Hospital Location GPS */}
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div>
              <span className="text-xs font-bold text-slate-800 block">Hospital Location GPS Coordinates</span>
              <span className="text-[11px] font-mono text-slate-500">
                Lat: {formData.latitude.toFixed(4)}, Lng: {formData.longitude.toFixed(4)}
              </span>
            </div>
            <button
              type="button"
              onClick={handleGetLocation}
              className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 hover:bg-slate-800 transition-colors"
            >
              <MapPin className="w-3.5 h-3.5 text-crimson-400" />
              Capture Hospital GPS
            </button>
          </div>

          {geoStatus && (
            <p className="text-[11px] font-mono text-slate-500 text-center">{geoStatus}</p>
          )}

          <div className="pt-2 flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="px-5 py-2.5 bg-slate-100 text-slate-700 rounded-2xl text-xs font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 bg-crimson-700 hover:bg-crimson-800 text-white rounded-2xl text-xs font-semibold shadow-soft"
            >
              Dispatch Matching Engine
            </button>
          </div>
        </form>
      )}

      {/* Created Requests List */}
      <section className="space-y-4">
        <h2 className="font-heading font-bold text-xl text-slate-900">Your Active Requests</h2>

        {requests.length === 0 ? (
          <EmptyState
            title="No Active Blood Requests"
            message="You have not created any emergency blood requests yet. Click 'Create Blood Request' above to alert nearby donors."
            actionLabel="Create Request Now"
            onAction={() => setShowForm(true)}
          />
        ) : (
          <div className="space-y-4">
            {requests.map(req => (
              <div key={req.id} className="bg-white rounded-3xl p-6 shadow-card border border-slate-100 space-y-4">
                
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="bg-crimson-100 text-crimson-800 font-mono font-bold text-xs px-3 py-1 rounded-full">
                        {req.blood_group} ({req.units_needed} Unit{req.units_needed > 1 ? 's' : ''})
                      </span>
                      <span className="text-[10px] font-mono uppercase bg-slate-100 text-slate-600 px-2.5 py-1 rounded-full font-bold">
                        {req.urgency}
                      </span>
                    </div>
                    <h3 className="font-heading font-bold text-lg text-slate-900">{req.hospital_name}</h3>
                    <p className="text-xs text-slate-500">Patient: <strong>{req.patient_name}</strong> • {req.city}</p>
                  </div>

                  {/* State Machine Status Badge */}
                  <div className="flex items-center gap-3">
                    <span className={`px-4 py-1.5 rounded-full font-mono text-xs font-bold ${
                      req.status === 'COMPLETED'
                        ? 'bg-emerald-100 text-emerald-800'
                        : req.status === 'DONOR_ACCEPTED'
                        ? 'bg-blue-100 text-blue-800 animate-pulse'
                        : 'bg-amber-100 text-amber-800'
                    }`}>
                      {req.status}
                    </span>

                    <Link
                      to={`/request/${req.id}`}
                      className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs rounded-2xl flex items-center gap-1.5 transition-colors"
                    >
                      <Navigation className="w-3.5 h-3.5 text-crimson-400" />
                      Live Track Map
                    </Link>
                  </div>
                </div>

                {/* Progress State Machine Timeline */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs">
                  <div className={`p-2 rounded-xl border ${req.status !== 'ACTIVE' ? 'bg-emerald-50 border-emerald-200 text-emerald-800 font-semibold' : 'bg-slate-50 text-slate-500'}`}>
                    1. Created & Matched
                  </div>
                  <div className={`p-2 rounded-xl border ${['DONOR_ACCEPTED', 'DONOR_EN_ROUTE', 'DONOR_ARRIVED', 'COMPLETED'].includes(req.status) ? 'bg-emerald-50 border-emerald-200 text-emerald-800 font-semibold' : 'bg-slate-50 text-slate-500'}`}>
                    2. Donor Accepted
                  </div>
                  <div className={`p-2 rounded-xl border ${['DONOR_EN_ROUTE', 'DONOR_ARRIVED', 'COMPLETED'].includes(req.status) ? 'bg-emerald-50 border-emerald-200 text-emerald-800 font-semibold' : 'bg-slate-50 text-slate-500'}`}>
                    3. Live GPS En Route
                  </div>
                  <div className={`p-2 rounded-xl border ${req.status === 'COMPLETED' ? 'bg-emerald-50 border-emerald-200 text-emerald-800 font-semibold' : 'bg-slate-50 text-slate-500'}`}>
                    4. Donation Complete
                  </div>
                </div>

                {req.status !== 'COMPLETED' && (
                  <div className="flex justify-end pt-2">
                    <button
                      onClick={() => handleCompleteDonation(req.id)}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-2xl shadow-soft"
                    >
                      Mark Donation Fulfilled & Complete
                    </button>
                  </div>
                )}

              </div>
            ))}
          </div>
        )}
      </section>

    </div>
  );
}
