import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import EmptyState from '../components/EmptyState';
import StatCounter from '../components/StatCounter';
import LiveMap from '../components/LiveMap';
import { Heart, Activity, MapPin, Navigation, Clock, CheckCircle2, ShieldAlert, AlertTriangle, Award, Calendar, Droplet } from 'lucide-react';

export default function DonorDashboard() {
  const { user, updateAvailability } = useAuth();
  const { socket } = useSocket();

  const [matches, setMatches] = useState([]);
  const [donations, setDonations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTrackingMatch, setActiveTrackingMatch] = useState(null);
  const [isBroadcasting, setIsBroadcasting] = useState(false);
  const [watchId, setWatchId] = useState(null);
  const [lastCoords, setLastCoords] = useState(null);
  const [actionError, setActionError] = useState('');

  const profile = user?.profile || {};
  const availability = user?.availability !== false && profile.availability !== false;
  const lastDonationDate = user?.lastDonationDate || profile.last_donation_date;

  // Calculate 90-day cooldown days remaining
  let cooldownDaysRemaining = 0;
  if (lastDonationDate) {
    const lastDate = new Date(lastDonationDate);
    const now = new Date();
    const diffDays = Math.ceil(Math.abs(now - lastDate) / (1000 * 60 * 60 * 24));
    if (diffDays < 90) {
      cooldownDaysRemaining = 90 - diffDays;
    }
  }

  const fetchMatches = async () => {
    try {
      const res = await axios.get('/api/matches/my-matches');
      if (res.data.success) {
        setMatches(res.data.matches);
        const accepted = res.data.matches.find(m => m.status === 'ACCEPTED');
        if (accepted) {
          setActiveTrackingMatch(accepted);
        }
      }
    } catch (err) {
      console.error('Failed to fetch matches:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchDonationHistory = async () => {
    try {
      const res = await axios.get('/api/donations/my-donations');
      if (res.data.success) {
        setDonations(res.data.donations);
      }
    } catch (err) {
      console.error('Failed to fetch donation history:', err);
    }
  };

  useEffect(() => {
    fetchMatches();
    fetchDonationHistory();
  }, []);

  // Listen to socket for real-time matches & completed donations
  useEffect(() => {
    if (!socket) return;

    socket.on('match:new', (newMatch) => {
      fetchMatches();
    });

    socket.on('notification:new', (notif) => {
      if (notif.type === 'DONATION_COMPLETED') {
        fetchDonationHistory();
        fetchMatches();
      }
    });

    return () => {
      socket.off('match:new');
      socket.off('notification:new');
    };
  }, [socket]);

  const handleToggleAvailability = async () => {
    try {
      await updateAvailability(!availability);
    } catch (err) {
      console.error('Failed to update availability:', err);
    }
  };

  const handleRespondMatch = async (matchId, action) => {
    setActionError('');
    try {
      const res = await axios.post(`/api/matches/${matchId}/respond`, { action });
      if (res.data.success) {
        fetchMatches();
        if (action === 'ACCEPT' && socket) {
          socket.emit('request:join', { requestId: res.data.requestId });
        }
      }
    } catch (err) {
      setActionError(err.response?.data?.message || 'Failed to respond to match');
    }
  };

  // Start real-time device GPS Geolocation broadcast
  const startLiveBroadcasting = (requestId) => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser');
      return;
    }

    if (socket) {
      socket.emit('request:join', { requestId });
    }

    setIsBroadcasting(true);

    const id = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        setLastCoords({ latitude, longitude });

        if (socket) {
          socket.emit('tracking:location', {
            requestId,
            latitude,
            longitude
          });
        }
      },
      (err) => {
        console.error('Geolocation error:', err);
      },
      {
        enableHighAccuracy: true,
        maximumAge: 1000,
        timeout: 10000
      }
    );

    setWatchId(id);
  };

  const stopLiveBroadcasting = () => {
    if (watchId != null) {
      navigator.geolocation.clearWatch(watchId);
      setWatchId(null);
    }
    setIsBroadcasting(false);
  };

  const handleSimulateStep = (match) => {
    const currentLat = lastCoords?.latitude || match.req_lat || 17.4321;
    const currentLng = lastCoords?.longitude || match.req_lng || 78.4071;
    const reqLat = parseFloat(match.req_lat);
    const reqLng = parseFloat(match.req_lng);

    const newLat = currentLat + (reqLat - currentLat) * 0.15;
    const newLng = currentLng + (reqLng - currentLng) * 0.15;

    setLastCoords({ latitude: newLat, longitude: newLng });
    setIsBroadcasting(true);

    if (socket) {
      socket.emit('request:join', { requestId: match.request_id });
      socket.emit('tracking:location', {
        requestId: match.request_id,
        latitude: newLat,
        longitude: newLng
      });
    }
  };

  const pendingMatches = matches.filter(m => m.status === 'PENDING');
  const acceptedMatches = matches.filter(m => m.status === 'ACCEPTED');

  const handleCompleteDonation = async (requestId) => {
    if (!window.confirm('Confirm blood donation has been completed successfully? This will end the live tracking session.')) return;
    try {
      stopLiveBroadcasting();
      const res = await axios.post('/api/donations', { requestId });
      if (res.data.success) {
        setActiveTrackingMatch(null);
        fetchMatches();
        fetchDonationHistory();
      }
    } catch (err) {
      setActionError(err.response?.data?.message || 'Failed to complete donation');
    }
  };

  const totalUnitsDonated = donations.reduce((sum, d) => sum + (parseInt(d.units_donated) || 1), 0);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      
      {/* Top Banner & Profile Overview */}
      <div className="bg-gradient-to-r from-crimson-800 to-crimson-700 text-white rounded-3xl p-6 sm:p-8 shadow-elevated relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          
          <div>
            <div className="flex items-center gap-3 mb-2">
              <span className="bg-white/20 px-3 py-1 rounded-full text-xs font-mono font-bold tracking-wider uppercase backdrop-blur-sm">
                DONOR DASHBOARD
              </span>
              <span className="bg-white text-crimson-700 font-mono text-xs font-bold px-3 py-1 rounded-full">
                BLOOD GROUP: {profile.blood_group || user?.bloodGroup || 'O+'}
              </span>
            </div>
            <h1 className="font-heading font-bold text-3xl sm:text-4xl text-white">
              Hello, {user?.fullName || 'Hero Donor'}
            </h1>
            <p className="text-crimson-100 text-sm mt-1 max-w-xl">
              Your real-time blood donor profile is active and ready to receive emergency requests in your area.
            </p>
          </div>

          {/* Availability Toggle & Cooldown Card */}
          <div className="bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/20 flex flex-col gap-3 min-w-[260px]">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-crimson-100">Donor Status</span>
              <button
                onClick={handleToggleAvailability}
                className={`px-3 py-1.5 rounded-xl font-mono text-xs font-bold transition-all ${
                  availability
                    ? 'bg-emerald-400 text-emerald-950 hover:bg-emerald-300'
                    : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                }`}
              >
                {availability ? 'SET AVAILABLE' : 'SET UNAVAILABLE'}
              </button>
            </div>

            {cooldownDaysRemaining > 0 ? (
              <div className="p-3 rounded-xl bg-amber-500/20 border border-amber-300/30 text-amber-100 text-xs flex flex-col gap-1">
                <div className="flex items-center gap-2 font-bold text-amber-200">
                  <Clock className="w-4 h-4 flex-shrink-0 text-amber-300" />
                  <span>90-Day Cooldown Active</span>
                </div>
                <p className="text-[11px] text-amber-100/90 leading-tight">
                  {cooldownDaysRemaining} days remaining in recommended wait time. You can still accept emergency requests below if you feel fit.
                </p>
              </div>
            ) : (
              <div className="p-2.5 rounded-xl bg-emerald-500/20 border border-emerald-300/30 text-emerald-100 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-emerald-300" />
                <span>Eligible & ready to donate blood</span>
              </div>
            )}
          </div>

        </div>
      </div>

      {actionError && (
        <div className="p-4 rounded-2xl bg-crimson-50 border border-crimson-200 text-crimson-800 text-xs flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          <span>{actionError}</span>
        </div>
      )}

      {/* Hero Impact Stats Counter Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <StatCounter
          title="TOTAL DONATIONS"
          value={donations.length}
          subtitle="Life-saving contributions"
          icon={Award}
          highlightColor="crimson"
        />
        <StatCounter
          title="BLOOD UNITS DONATED"
          value={totalUnitsDonated}
          subtitle="Pints of blood provided"
          icon={Droplet}
          highlightColor="emerald"
        />
        <StatCounter
          title="LAST DONATION DATE"
          value={lastDonationDate ? new Date(lastDonationDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'No donations yet'}
          subtitle={cooldownDaysRemaining > 0 ? `${cooldownDaysRemaining} days cooldown remaining` : 'Ready to save lives'}
          icon={Calendar}
          highlightColor="amber"
        />
      </div>

      {/* Active Accepted Match & Live GPS Broadcasting Screen */}
      {acceptedMatches.length > 0 && (
        <section className="bg-white rounded-3xl p-6 sm:p-8 shadow-card border border-emerald-100 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
            <div>
              <span className="bg-emerald-100 text-emerald-800 text-xs font-mono font-bold px-3 py-1 rounded-full inline-block mb-1">
                ACTIVE DONATION IN PROGRESS
              </span>
              <h2 className="font-heading font-bold text-xl text-slate-900">
                Live Geolocation Tracking Session
              </h2>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {!isBroadcasting ? (
                <button
                  onClick={() => startLiveBroadcasting(acceptedMatches[0].request_id)}
                  className="px-5 py-2.5 bg-crimson-700 hover:bg-crimson-800 text-white font-semibold text-xs rounded-2xl shadow-soft flex items-center gap-2 transition-all hover:scale-105"
                >
                  <Navigation className="w-4 h-4" />
                  Start Device GPS Tracking
                </button>
              ) : (
                <button
                  onClick={stopLiveBroadcasting}
                  className="px-5 py-2.5 bg-slate-800 hover:bg-slate-900 text-white font-semibold text-xs rounded-2xl flex items-center gap-2"
                >
                  Stop GPS Broadcast
                </button>
              )}

              <button
                onClick={() => handleSimulateStep(acceptedMatches[0])}
                title="Test map movement step by stepping 15% closer to hospital"
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold text-xs rounded-2xl shadow-sm flex items-center gap-1.5 transition-all"
              >
                <Navigation className="w-3.5 h-3.5 text-crimson-700" />
                Simulate 15% Move Step
              </button>

              <button
                onClick={() => handleCompleteDonation(acceptedMatches[0].request_id)}
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-2xl shadow-soft flex items-center gap-1.5 transition-all hover:scale-105"
              >
                <CheckCircle2 className="w-4 h-4" />
                Complete Donation & Stop Live Tracking
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <LiveMap
                requestLocation={{
                  hospitalName: acceptedMatches[0].hospital_name,
                  patientName: acceptedMatches[0].patient_name,
                  latitude: acceptedMatches[0].req_lat,
                  longitude: acceptedMatches[0].req_lng
                }}
                donorLocation={lastCoords}
                distanceKm={acceptedMatches[0].distance_km}
                isBroadcasting={isBroadcasting}
              />
            </div>

            <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 flex flex-col justify-between space-y-4">
              <div>
                <h3 className="font-heading font-semibold text-base text-slate-900 mb-2">Request Details</h3>
                <div className="space-y-2 text-xs text-slate-600">
                  <p><strong className="text-slate-900">Patient:</strong> {acceptedMatches[0].patient_name}</p>
                  <p><strong className="text-slate-900">Hospital:</strong> {acceptedMatches[0].hospital_name}</p>
                  <p><strong className="text-slate-900">Units Needed:</strong> {acceptedMatches[0].units_needed}</p>
                  <p><strong className="text-slate-900">Urgency:</strong> <span className="uppercase text-crimson-700 font-bold">{acceptedMatches[0].urgency}</span></p>
                  <p><strong className="text-slate-900">Distance:</strong> {acceptedMatches[0].distance_km} km away</p>
                </div>
              </div>

              <div className="p-3 bg-white rounded-xl border border-slate-200 text-xs text-slate-500">
                <p className="font-semibold text-slate-700 mb-1">Navigation Guidance:</p>
                Please proceed safely to the hospital. Your real-time position is being updated to the requester over authenticated WebSockets.
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Pending Emergency Match Requests */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-heading font-bold text-xl text-slate-900 flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-crimson-700" />
            Nearby Emergency Match Requests
          </h2>
          <span className="font-mono text-xs font-semibold text-slate-500">
            {pendingMatches.length} Pending
          </span>
        </div>

        {pendingMatches.length === 0 && acceptedMatches.length === 0 ? (
          <EmptyState
            title="No Compatible Emergency Requests Nearby"
            message="There are currently no active emergency blood requests matching your blood group in your radius. We will notify you immediately via Socket.IO when a request is made."
            icon={Heart}
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {pendingMatches.map(match => (
              <div key={match.id} className="bg-white rounded-3xl p-6 shadow-card border border-slate-100 hover:shadow-elevated transition-all flex flex-col justify-between space-y-4">
                
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="bg-crimson-100 text-crimson-800 text-xs font-mono font-bold px-3 py-1 rounded-full">
                      {match.blood_group} NEEDED
                    </span>
                    <span className="text-[10px] font-mono uppercase bg-slate-100 text-slate-600 px-2.5 py-1 rounded-full font-bold">
                      {match.urgency} URGENCY
                    </span>
                  </div>

                  <h3 className="font-heading font-bold text-lg text-slate-900">{match.hospital_name}</h3>
                  <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-slate-400" />
                    {match.city} • <strong className="text-crimson-700 font-mono">{match.distance_km} km away</strong>
                  </p>

                  <div className="mt-4 p-3 bg-slate-50 rounded-2xl text-xs space-y-1 text-slate-600">
                    <p><strong>Patient:</strong> {match.patient_name}</p>
                    <p><strong>Units Required:</strong> {match.units_needed} Unit(s)</p>
                  </div>

                  {cooldownDaysRemaining > 0 && (
                    <div className="mt-2 p-2.5 bg-amber-50 border border-amber-200 rounded-xl text-[11px] text-amber-800 flex items-start gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-amber-600 flex-shrink-0 mt-0.5" />
                      <span>
                        <strong>90-Day Cooldown Notice:</strong> Recommended wait time applies ({cooldownDaysRemaining} days left). If healthy and willing, you may accept.
                      </span>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-3 pt-2">
                  <button
                    onClick={() => handleRespondMatch(match.id, 'ACCEPT')}
                    className="flex-1 py-2.5 bg-crimson-700 hover:bg-crimson-800 text-white font-semibold text-xs rounded-2xl shadow-soft transition-all"
                  >
                    Accept Request
                  </button>
                  <button
                    onClick={() => handleRespondMatch(match.id, 'DECLINE')}
                    className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-2xl transition-colors"
                  >
                    Decline
                  </button>
                </div>

              </div>
            ))}
          </div>
        )}
      </section>

      {/* Past Donation History Section */}
      <section className="space-y-4">
        <div className="flex items-center justify-between border-b border-slate-200 pb-3">
          <h2 className="font-heading font-bold text-xl text-slate-900 flex items-center gap-2">
            <Award className="w-5 h-5 text-emerald-600" />
            Past Donation History
          </h2>
          <span className="font-mono text-xs font-bold text-slate-500 bg-slate-100 px-3 py-1 rounded-full">
            {donations.length} {donations.length === 1 ? 'Record' : 'Records'}
          </span>
        </div>

        {donations.length === 0 ? (
          <EmptyState
            title="No Past Donations Recorded Yet"
            message="Your completed blood donations will appear here once you accept an emergency request and complete the donation session."
            icon={Award}
          />
        ) : (
          <div className="bg-white rounded-3xl shadow-card border border-slate-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-mono font-bold uppercase text-slate-500 tracking-wider">
                    <th className="py-4 px-6">Donation Date</th>
                    <th className="py-4 px-6">Patient Name</th>
                    <th className="py-4 px-6">Blood Group</th>
                    <th className="py-4 px-6">Hospital & Location</th>
                    <th className="py-4 px-6">Units Donated</th>
                    <th className="py-4 px-6">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs text-slate-700 font-medium">
                  {donations.map((donation) => (
                    <tr key={donation.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-4 px-6 font-mono font-bold text-slate-900">
                        {new Date(donation.donation_date || donation.created_at).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric'
                        })}
                      </td>
                      <td className="py-4 px-6 font-semibold text-slate-900">
                        {donation.patient_name || 'Emergency Patient'}
                      </td>
                      <td className="py-4 px-6">
                        <span className="bg-crimson-100 text-crimson-800 font-mono font-bold px-2.5 py-1 rounded-full text-[11px]">
                          {donation.blood_group || profile.blood_group || 'O+'}
                        </span>
                      </td>
                      <td className="py-4 px-6">
                        <div className="font-semibold text-slate-900">{donation.hospital_name || 'Hospital'}</div>
                        <div className="text-[11px] text-slate-500">{donation.city || donation.address || 'Hyderabad'}</div>
                      </td>
                      <td className="py-4 px-6 font-mono font-bold text-slate-800">
                        {donation.units_donated || 1} Unit(s)
                      </td>
                      <td className="py-4 px-6">
                        <span className="inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-700 font-semibold px-3 py-1 rounded-full border border-emerald-200 text-[11px]">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          COMPLETED
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>

    </div>
  );
}

