import React, { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Building2, Eye, EyeOff, ShieldCheck, ArrowLeft } from 'lucide-react';
import { useAuth, OtpChallenge } from '../contexts/AuthContext';
import toast from 'react-hot-toast';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // OTP step
  const [otpChallenge, setOtpChallenge] = useState<OtpChallenge | null>(null);
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);

  const { login, verifyOtp } = useAuth();

  useEffect(() => {
    if (otpChallenge) otpRefs.current[0]?.focus();
  }, [otpChallenge]);

  const handleCredentials = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    setLoading(true);
    setError('');
    try {
      const challenge = await login(email, password);
      setOtpChallenge(challenge);
      setOtp(['', '', '', '', '', '']);
    } catch (err: any) {
      const message =
        err?.response?.data?.error ||
        (err?.code === 'ERR_NETWORK' ? 'Cannot reach server.' : '') ||
        err?.message ||
        'Login failed. Check your credentials.';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleOtpChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;
    const next = [...otp];
    next[index] = value.slice(-1);
    setOtp(next);
    if (value && index < 5) otpRefs.current[index + 1]?.focus();
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  };

  const handleOtpPaste = (e: React.ClipboardEvent) => {
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pasted.length === 6) {
      setOtp(pasted.split(''));
      otpRefs.current[5]?.focus();
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = otp.join('');
    if (code.length !== 6) { setError('Enter the 6-digit code'); return; }
    setLoading(true);
    setError('');
    try {
      await verifyOtp(otpChallenge!.sessionId, code);
      // AuthContext sets user → AppRoutes redirects automatically
    } catch (err: any) {
      const message = err?.response?.data?.error || 'Verification failed. Try again.';
      setError(message);
      if (message.includes('log in again')) {
        setOtpChallenge(null);
        setOtp(['', '', '', '', '', '']);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1e3a5f] to-blue-800 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center bg-blue-600 rounded-xl p-3 mb-4">
            <Building2 size={32} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Landview Buyback</h1>
          <p className="text-gray-500 text-sm mt-1">Internal Investment Management System</p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg">
            {error}
          </div>
        )}

        {!otpChallenge ? (
          /* Step 1: Email + Password */
          <form onSubmit={handleCredentials} className="space-y-4">
            <div>
              <label className="label">Email Address</label>
              <input
                type="email"
                className="input"
                placeholder="you@landview.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                autoFocus
              />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="label mb-0">Password</label>
                <Link to="/forgot-password" className="text-xs text-blue-600 hover:underline">
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <input
                  type={showPass ? 'text' : 'password'}
                  className="input pr-10"
                  placeholder="••••••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>
            <button type="submit" className="btn-primary w-full py-3 text-base mt-2" disabled={loading}>
              {loading ? 'Checking...' : 'Continue'}
            </button>
          </form>
        ) : (
          /* Step 2: OTP */
          <form onSubmit={handleVerify} className="space-y-5">
            <div className="text-center">
              <div className="inline-flex items-center justify-center bg-green-100 rounded-full p-3 mb-3">
                <ShieldCheck size={28} className="text-green-600" />
              </div>
              <h2 className="font-semibold text-gray-900 text-lg">Verify your identity</h2>
              <p className="text-sm text-gray-500 mt-1">
                A 6-digit code was sent to <span className="font-medium text-gray-700">{otpChallenge.maskedEmail}</span>
              </p>
            </div>

            <div className="flex justify-center gap-2" onPaste={handleOtpPaste}>
              {otp.map((digit, i) => (
                <input
                  key={i}
                  ref={el => { otpRefs.current[i] = el; }}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={e => handleOtpChange(i, e.target.value)}
                  onKeyDown={e => handleOtpKeyDown(i, e)}
                  className="w-11 h-14 text-center text-2xl font-bold border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100 transition-colors"
                />
              ))}
            </div>

            <button type="submit" className="btn-primary w-full py-3 text-base" disabled={loading || otp.join('').length !== 6}>
              {loading ? 'Verifying...' : 'Verify & Sign In'}
            </button>

            <button
              type="button"
              onClick={() => { setOtpChallenge(null); setError(''); setOtp(['', '', '', '', '', '']); }}
              className="flex items-center justify-center gap-1.5 w-full text-sm text-gray-500 hover:text-gray-700 transition-colors"
            >
              <ArrowLeft size={14} /> Back to login
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
