import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Heart, Mail, Lock, KeyRound, ArrowRight, ArrowLeft, CheckCircle2, AlertCircle, ShieldCheck } from 'lucide-react';

export default function ForgotPasswordPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1); // 1: Request OTP, 2: Verify OTP, 3: Set New Password
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [retrievedOtp, setRetrievedOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const [error, setError] = useState('');
  const [isUnregistered, setIsUnregistered] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [loading, setLoading] = useState(false);

  // Step 1: Request OTP
  const handleRequestOtp = async (e) => {
    e.preventDefault();
    setError('');
    setIsUnregistered(false);
    setSuccessMsg('');
    setLoading(true);

    try {
      const res = await axios.post('/api/auth/forgot-password', { email });
      if (res.data.success) {
        setRetrievedOtp(res.data.otp);
        setSuccessMsg(res.data.message);
        setStep(2);
      }
    } catch (err) {
      if (err.response?.data?.isNotRegistered) {
        setIsUnregistered(true);
      }
      setError(err.response?.data?.message || 'This email address is not registered with any HemoLink account.');
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Verify OTP
  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    setLoading(true);

    try {
      const res = await axios.post('/api/auth/verify-otp', { email, otp });
      if (res.data.success) {
        setSuccessMsg('OTP Verified! Enter your new password below.');
        setStep(3);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid or expired OTP code.');
    } finally {
      setLoading(false);
    }
  };

  // Step 3: Reset Password
  const handleResetPassword = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters long');
      return;
    }

    setLoading(true);
    try {
      const res = await axios.post('/api/auth/reset-password', { email, otp, newPassword });
      if (res.data.success) {
        setSuccessMsg('Password reset successfully! Redirecting to login...');
        setTimeout(() => {
          navigate('/login');
        }, 2000);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to reset password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-3xl p-8 shadow-card border border-slate-100 animate-in fade-in duration-300">
        
        {/* Header */}
        <div className="text-center mb-6">
          <div className="w-12 h-12 rounded-2xl bg-crimson-700 text-white flex items-center justify-center mx-auto mb-3 shadow-soft">
            <KeyRound className="w-6 h-6" />
          </div>
          <h2 className="font-heading font-bold text-2xl text-slate-900">Forgot Password</h2>
          <p className="text-xs text-slate-500 mt-1">
            {step === 1 && 'Enter your email to receive a 6-digit OTP code'}
            {step === 2 && 'Enter the 6-digit OTP code sent to your email'}
            {step === 3 && 'Create a new secure password for your account'}
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-2xl bg-crimson-50 border border-crimson-200 text-crimson-800 text-xs flex flex-col gap-2">
            <div className="flex items-center gap-2.5">
              <AlertCircle className="w-4 h-4 flex-shrink-0 text-crimson-700" />
              <span className="font-medium">{error}</span>
            </div>
            {isUnregistered && (
              <div className="pt-2 border-t border-crimson-200/60 font-semibold">
                <Link to="/register" className="text-crimson-700 hover:underline">
                  ➔ Click here to Create a New HemoLink Account
                </Link>
              </div>
            )}
          </div>
        )}

        {successMsg && (
          <div className="mb-6 p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2.5">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* STEP 1: Request OTP */}
        {step === 1 && (
          <form onSubmit={handleRequestOtp} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Registered Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@domain.com"
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-crimson-700/20 focus:border-crimson-700"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-crimson-700 hover:bg-crimson-800 text-white font-semibold rounded-2xl shadow-soft flex items-center justify-center gap-2 text-sm transition-all hover:scale-[1.02] disabled:opacity-50 mt-2"
            >
              {loading ? (
                <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  Send OTP Code <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        )}

        {/* STEP 2: Verify OTP */}
        {step === 2 && (
          <form onSubmit={handleVerifyOtp} className="space-y-4">
            
            <div className="p-4 bg-crimson-50 border border-crimson-200 text-crimson-900 rounded-2xl text-center space-y-1">
              <div className="flex items-center justify-center gap-2 font-bold text-crimson-800 text-xs">
                <Mail className="w-4 h-4 text-crimson-700" />
                <span>OTP Sent to Your Email</span>
              </div>
              <p className="text-[11px] text-crimson-700/90">
                We sent a 6-digit OTP code to <strong>{email}</strong>. Check your inbox or spam folder.
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Enter 6-Digit OTP Code
              </label>
              <input
                type="text"
                required
                maxLength={6}
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                placeholder="123456"
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-center font-mono font-bold text-xl tracking-widest focus:outline-none focus:ring-2 focus:ring-crimson-700/20 focus:border-crimson-700"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-crimson-700 hover:bg-crimson-800 text-white font-semibold rounded-2xl shadow-soft flex items-center justify-center gap-2 text-sm transition-all hover:scale-[1.02] disabled:opacity-50 mt-2"
            >
              {loading ? (
                <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  Verify OTP <ShieldCheck className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        )}

        {/* STEP 3: Reset Password */}
        {step === 3 && (
          <form onSubmit={handleResetPassword} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                New Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                <input
                  type="password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-crimson-700/20 focus:border-crimson-700"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Confirm New Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-crimson-700/20 focus:border-crimson-700"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-crimson-700 hover:bg-crimson-800 text-white font-semibold rounded-2xl shadow-soft flex items-center justify-center gap-2 text-sm transition-all hover:scale-[1.02] disabled:opacity-50 mt-2"
            >
              {loading ? (
                <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  Reset Password <CheckCircle2 className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        )}

        <div className="mt-8 text-center border-t border-slate-100 pt-6">
          <Link to="/login" className="text-xs font-semibold text-slate-600 hover:text-crimson-700 inline-flex items-center gap-1.5">
            <ArrowLeft className="w-3.5 h-3.5" /> Return to Login
          </Link>
        </div>

      </div>
    </div>
  );
}
