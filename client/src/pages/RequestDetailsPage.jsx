import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import { useSocket } from '../context/SocketContext';
import LiveMap from '../components/LiveMap';
import { ArrowLeft, Navigation, Building2, UserCheck, Activity, Phone, ShieldCheck, CheckCircle2 } from 'lucide-react';

export default function RequestDetailsPage() {
  const { id } = useParams();
  const { socket } = useSocket();
  const [requestData, setRequestData] = useState(null);
  const [donorLocation, setDonorLocation] = useState(null);
  const [distanceKm, setDistanceKm] = useState(null);
  const [etaMinutes, setEtaMinutes] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchRequestDetails = async () => {
    try {
      const res = await axios.get(`/api/requests/${id}`);
      if (res.data.success) {
        setRequestData(res.data);
        if (res.data.locationSession) {
          setDonorLocation({
            latitude: res.data.locationSession.donor_lat,
            longitude: res.data.locationSession.donor_lng
          });
          setDistanceKm(res.data.locationSession.distance_km);
          setEtaMinutes(res.data.locationSession.eta_minutes);
        }
      }
    } catch (err) {
      console.error('Failed to fetch request details:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequestDetails();
  }, [id]);

  // Join Socket.IO Request Tracking Room
  useEffect(() => {
    if (!socket || !id) return;

    socket.emit('request:join', { requestId: parseInt(id) });

    socket.on('tracking:initialState', (session) => {
      if (session) {
        setDonorLocation({ latitude: session.donor_lat, longitude: session.donor_lng });
        setDistanceKm(session.distance_km);
        setEtaMinutes(session.eta_minutes);
      }
    });

    socket.on('tracking:locationUpdated', (data) => {
      setDonorLocation({ latitude: data.latitude, longitude: data.longitude });
      setDistanceKm(data.distanceKm);
      setEtaMinutes(data.etaMinutes);
    });

    socket.on('request:statusUpdated', ({ status }) => {
      setRequestData(prev => prev ? { ...prev, request: { ...prev.request, status } } : null);
    });

    return () => {
      socket.off('tracking:initialState');
      socket.off('tracking:locationUpdated');
      socket.off('request:statusUpdated');
    };
  }, [socket, id]);

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-crimson-700 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const handleCompleteDonation = async () => {
    if (!window.confirm('Confirm blood donation has been completed successfully? This will stop live GPS tracking and close this emergency request.')) return;
    try {
      const res = await axios.post('/api/donations', { requestId: id });
      if (res.data.success) {
        navigate('/');
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to complete donation');
    }
  };

  const request = requestData?.request;
  const acceptedMatch = requestData?.acceptedMatch;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      
      {/* Navigation Top Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-xs font-semibold text-slate-600 hover:text-crimson-700 bg-white px-4 py-2 rounded-2xl border border-slate-200 shadow-sm transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Dashboard
        </Link>

        <div className="flex items-center gap-3">
          <span className="font-mono text-xs font-bold text-slate-500 uppercase">
            REQUEST #{id} • <span className="text-crimson-700 font-extrabold">{request?.status}</span>
          </span>

          {['MATCHED', 'DONOR_ACCEPTED', 'DONOR_EN_ROUTE', 'ACTIVE'].includes(request?.status) && (
            <button
              onClick={handleCompleteDonation}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-2xl shadow-soft flex items-center gap-1.5 transition-all hover:scale-105"
            >
              <CheckCircle2 className="w-4 h-4" />
              Complete Donation & End Tracking
            </button>
          )}
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Live Leaflet Map */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white rounded-3xl p-6 shadow-card border border-slate-100 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-heading font-bold text-xl text-slate-900 flex items-center gap-2">
                <Navigation className="w-5 h-5 text-crimson-700" />
                Live Real-Time GPS Tracking
              </h2>
              <span className="text-xs font-mono text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full font-bold border border-emerald-200">
                SECURE AUTHENTICATED ROOM
              </span>
            </div>

            <LiveMap
              requestLocation={{
                hospitalName: request?.hospital_name,
                patientName: request?.patient_name,
                latitude: request?.latitude,
                longitude: request?.longitude
              }}
              donorLocation={donorLocation}
              distanceKm={distanceKm}
              etaMinutes={etaMinutes}
              isBroadcasting={donorLocation != null}
            />
          </div>
        </div>

        {/* Request & Matched Donor Card Details */}
        <div className="space-y-6">
          
          <div className="bg-white rounded-3xl p-6 shadow-card border border-slate-100 space-y-4">
            <h3 className="font-heading font-bold text-lg text-slate-900 border-b border-slate-100 pb-3 flex items-center gap-2">
              <Building2 className="w-5 h-5 text-slate-700" />
              Emergency Request Details
            </h3>

            <div className="space-y-2.5 text-xs text-slate-600">
              <p className="flex justify-between">
                <span className="text-slate-400 font-semibold">Patient:</span>
                <strong className="text-slate-900 font-heading">{request?.patient_name}</strong>
              </p>
              <p className="flex justify-between">
                <span className="text-slate-400 font-semibold">Blood Group:</span>
                <span className="bg-crimson-100 text-crimson-800 font-mono font-bold px-2.5 py-0.5 rounded-md">
                  {request?.blood_group} ({request?.units_needed} Units)
                </span>
              </p>
              <p className="flex justify-between">
                <span className="text-slate-400 font-semibold">Hospital:</span>
                <strong className="text-slate-900">{request?.hospital_name}</strong>
              </p>
              <p className="flex justify-between">
                <span className="text-slate-400 font-semibold">Urgency Level:</span>
                <span className="uppercase font-mono text-crimson-700 font-bold">{request?.urgency}</span>
              </p>
            </div>
          </div>

          {/* Matched Donor Details Card */}
          <div className="bg-white rounded-3xl p-6 shadow-card border border-slate-100 space-y-4">
            <h3 className="font-heading font-bold text-lg text-slate-900 border-b border-slate-100 pb-3 flex items-center gap-2">
              <UserCheck className="w-5 h-5 text-emerald-600" />
              Matched Hero Donor
            </h3>

            {acceptedMatch ? (
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-800 font-bold font-mono flex items-center justify-center text-sm">
                    {acceptedMatch.donor_name ? acceptedMatch.donor_name[0] : 'D'}
                  </div>
                  <div>
                    <h4 className="font-heading font-bold text-sm text-slate-900">{acceptedMatch.donor_name}</h4>
                    <p className="text-xs font-mono text-slate-500">Blood Group: {acceptedMatch.donor_blood}</p>
                  </div>
                </div>

                <div className="p-3 bg-slate-50 rounded-2xl space-y-1 text-xs text-slate-600">
                  <p className="flex items-center gap-2">
                    <Phone className="w-3.5 h-3.5 text-slate-400" />
                    <strong>Contact:</strong> {acceptedMatch.donor_phone || 'Available upon en route'}
                  </p>
                  <p className="flex items-center gap-2">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                    <strong>Status:</strong> Verified Active Donor
                  </p>
                </div>
              </div>
            ) : (
              <div className="p-4 text-center text-xs text-slate-500 bg-slate-50 rounded-2xl">
                Waiting for a compatible nearby donor to accept the request...
              </div>
            )}
          </div>

        </div>

      </div>

    </div>
  );
}
