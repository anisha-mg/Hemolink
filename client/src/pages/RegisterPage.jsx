import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { Heart, MapPin, AlertCircle, ArrowRight, UserCheck, Stethoscope, ShieldCheck, Mail, KeyRound } from 'lucide-react';

const BLOOD_GROUPS = ['O-', 'O+', 'A-', 'A+', 'B-', 'B+', 'AB-', 'AB+'];

export default function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [role, setRole] = useState('donor'); // 'donor' or 'requester'
  const [step, setStep] = useState(1); // 1: Enter details & Request OTP, 2: Enter OTP & Verify
  const [otp, setOtp] = useState('');
  const [retrievedOtp, setRetrievedOtp] = useState('');

  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    password: '',
    bloodGroup: 'O+',
    dob: '',
    gender: 'male',
    city: 'Hyderabad',
    address: '',
    latitude: 17.4374,
    longitude: 78.4482,
    lastDonationDate: '',
    availability: true
  });

  const [geoStatus, setGeoStatus] = useState('');
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleGetLocation = () => {
    if (!navigator.geolocation) {
      setGeoStatus('Geolocation is not supported by your browser');
      return;
    }
    setGeoStatus('Fetching current GPS coordinates...');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setFormData(prev => ({
          ...prev,
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude
        }));
        setGeoStatus(`GPS Captured: ${pos.coords.latitude.toFixed(4)}, ${pos.coords.longitude.toFixed(4)}`);
      },
      (err) => {
        setGeoStatus('Could not retrieve location. Using city center default.');
      }
    );
  };

  // Step 1: Send Registration OTP Email
  const handleSendOtp = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');

    if (!formData.email || !formData.phone || !formData.password || !formData.fullName) {
      setError('Please fill in all required fields');
      return;
    }

    setLoading(true);

    try {
      const res = await axios.post('/api/auth/send-register-otp', { email: formData.email });
      if (res.data.success) {
        setSuccessMsg(`Verification OTP sent to ${formData.email}`);
        setStep(2);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to send verification OTP');
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Complete Registration with OTP
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await register({
        ...formData,
        role,
        otp
      });
      if (role === 'donor') {
        navigate('/donor-dashboard');
      } else {
        navigate('/requester-dashboard');
      }
    } catch (err) {
      setError(err.message || 'Registration failed. Invalid OTP.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] py-8 px-4 flex items-center justify-center">
      <div className="w-full max-w-xl bg-white rounded-3xl p-8 shadow-card border border-slate-100 animate-in fade-in duration-300">
        
        {/* Header */}
        <div className="text-center mb-6">
          <div className="w-12 h-12 rounded-2xl bg-crimson-700 text-white flex items-center justify-center mx-auto mb-3 shadow-soft">
            <Heart className="w-6 h-6 fill-current" />
          </div>
          <h2 className="font-heading font-bold text-2xl text-slate-900">Create HemoLink Account</h2>
          <p className="text-xs text-slate-500 mt-1">Join the real-time emergency blood donor network</p>
        </div>

        {/* Role Selector Tabs */}
        <div className="flex bg-slate-100 p-1.5 rounded-2xl mb-6">
          <button
            type="button"
            onClick={() => setRole('donor')}
            className={`flex-1 py-2.5 rounded-xl font-heading font-semibold text-xs transition-all flex items-center justify-center gap-2 ${
              role === 'donor'
                ? 'bg-white text-crimson-700 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Heart className="w-4 h-4" />
            Register as Donor
          </button>

          <button
            type="button"
            onClick={() => setRole('requester')}
            className={`flex-1 py-2.5 rounded-xl font-heading font-semibold text-xs transition-all flex items-center justify-center gap-2 ${
              role === 'requester'
                ? 'bg-white text-sage-500 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Stethoscope className="w-4 h-4" />
            Register as Requester
          </button>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-2xl bg-crimson-50 border border-crimson-200 text-crimson-800 text-xs flex flex-col gap-2">
            <div className="flex items-center gap-2.5">
              <AlertCircle className="w-4 h-4 flex-shrink-0 text-crimson-700" />
              <span className="font-medium">{error}</span>
            </div>
            {(error.includes('already exists') || error.includes('already registered')) && (
              <div className="flex items-center gap-3 pt-2 border-t border-crimson-200/60 font-semibold">
                <Link to="/login" className="text-crimson-700 hover:underline">
                  ➔ Sign In Now
                </Link>
                <span className="text-crimson-300">|</span>
                <Link to="/forgot-password" className="text-crimson-700 hover:underline">
                  ➔ Forgot Password?
                </Link>
              </div>
            )}
          </div>
        )}

        {/* STEP 1: Enter Registration Details */}
        {step === 1 && (
          <form onSubmit={handleSendOtp} className="space-y-4">
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">Full Name</label>
                <input
                  type="text"
                  name="fullName"
                  required
                  value={formData.fullName}
                  onChange={handleChange}
                  placeholder="John Doe"
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">Email Address</label>
                <input
                  type="email"
                  name="email"
                  required
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="name@domain.com"
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">Phone Number</label>
                <input
                  type="tel"
                  name="phone"
                  required
                  value={formData.phone}
                  onChange={handleChange}
                  placeholder="+91 98765 43210"
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">Password</label>
                <input
                  type="password"
                  name="password"
                  required
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="••••••••"
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm"
                />
              </div>
            </div>

            {role === 'donor' && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">Blood Group</label>
                  <select
                    name="bloodGroup"
                    value={formData.bloodGroup}
                    onChange={handleChange}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-mono font-bold text-crimson-700"
                  >
                    {BLOOD_GROUPS.map(bg => (
                      <option key={bg} value={bg}>{bg}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">Gender</label>
                  <select
                    name="gender"
                    value={formData.gender}
                    onChange={handleChange}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm"
                  >
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">Last Donated (Optional)</label>
                  <input
                    type="date"
                    name="lastDonationDate"
                    value={formData.lastDonationDate}
                    onChange={handleChange}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm"
                  />
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">City</label>
                <input
                  type="text"
                  name="city"
                  value={formData.city}
                  onChange={handleChange}
                  placeholder="Hyderabad"
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">Address / Landmark</label>
                <input
                  type="text"
                  name="address"
                  value={formData.address}
                  onChange={handleChange}
                  placeholder="Madhapur, Hyderabad"
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm"
                />
              </div>
            </div>

            {/* Geolocation Button */}
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div>
                <span className="text-xs font-bold text-slate-800 block">Current Location GPS</span>
                <span className="text-[11px] font-mono text-slate-500">
                  Lat: {formData.latitude.toFixed(4)}, Lng: {formData.longitude.toFixed(4)}
                </span>
              </div>
              <button
                type="button"
                onClick={handleGetLocation}
                className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 hover:bg-slate-800 transition-colors"
              >
                <MapPin className="w-3.5 h-3.5" />
                Use Current GPS
              </button>
            </div>

            {geoStatus && (
              <p className="text-[11px] font-mono text-slate-500 text-center">{geoStatus}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className={`w-full py-3.5 text-white font-semibold rounded-2xl shadow-soft flex items-center justify-center gap-2 text-sm transition-all hover:scale-[1.02] disabled:opacity-50 mt-4 ${
                role === 'donor' ? 'bg-crimson-700 hover:bg-crimson-800' : 'bg-sage-500 hover:bg-sage-600'
              }`}
            >
              {loading ? (
                <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  Send Email Verification OTP <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        )}

        {/* STEP 2: Enter OTP & Verify Email */}
        {step === 2 && (
          <form onSubmit={handleSubmit} className="space-y-6 animate-in fade-in duration-300">
            
            <div className="p-5 bg-crimson-50 text-crimson-900 rounded-3xl border border-crimson-200 text-center space-y-1.5 shadow-sm">
              <div className="flex items-center justify-center gap-2 font-bold text-crimson-800 text-sm">
                <Mail className="w-4 h-4 text-crimson-700" />
                <span>Verification OTP Sent to Your Email</span>
              </div>
              <p className="text-xs text-crimson-700/90 leading-relaxed">
                We sent a 6-digit verification code to <strong>{formData.email}</strong>. Please check your inbox or spam folder.
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2 text-center">
                Enter 6-Digit Email Verification OTP
              </label>
              <input
                type="text"
                required
                maxLength={6}
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                placeholder="123456"
                className="w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-center font-mono font-bold text-2xl tracking-widest focus:outline-none focus:ring-2 focus:ring-crimson-700/20 focus:border-crimson-700"
              />
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="px-5 py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-2xl text-xs transition-colors"
              >
                Back to Details
              </button>

              <button
                type="submit"
                disabled={loading}
                className="flex-1 py-3.5 bg-crimson-700 hover:bg-crimson-800 text-white font-semibold rounded-2xl shadow-soft flex items-center justify-center gap-2 text-sm transition-all hover:scale-[1.02] disabled:opacity-50"
              >
                {loading ? (
                  <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    Verify OTP & Create Account <ShieldCheck className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </form>
        )}

        <div className="mt-6 text-center border-t border-slate-100 pt-4">
          <p className="text-xs text-slate-500">
            Already registered?{' '}
            <Link to="/login" className="text-crimson-700 font-semibold hover:underline">
              Sign In
            </Link>
          </p>
        </div>

      </div>
    </div>
  );
}
