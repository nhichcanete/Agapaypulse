import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/useAuth';
import toast, { Toaster } from 'react-hot-toast';
import { Eye, EyeOff, LogIn } from 'lucide-react';
import AuthBrandPanel from '../../components/AuthBrandPanel';

export default function Login() {
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { login: authenticate } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleSubmit = async (e) => {
    e.preventDefault();
    const email = login.trim().toLowerCase();

    if (!email) {
      toast.error('Enter your email address.');
      return;
    }

    setLoading(true);

    try {
      const loggedInUser = await authenticate(email, password);
      toast.success('Signed in successfully!');

      const pickupReturnPath = location.state?.from;
      const canReturnToPickup = (loggedInUser.role === 'pharmacist' || loggedInUser.role === 'admin')
        && (pickupReturnPath === '/pharmacy/claims' || pickupReturnPath?.startsWith('/pharmacy/claims?'));

      if (canReturnToPickup) navigate(pickupReturnPath, { replace: true });
      else if (loggedInUser.role === 'admin') navigate('/admin/analytics', { replace: true });
      else if (loggedInUser.role === 'staff') navigate('/staff/console', { replace: true });
      else if (loggedInUser.role === 'pharmacist') navigate('/pharmacy/claims', { replace: true });
      else navigate('/app/dashboard', { replace: true });
    } catch (err) {
      const message = err.code === 'ECONNABORTED'
        ? 'The server is taking too long to respond. Please try again.'
        : err.code === 'ERR_NETWORK'
          ? 'Unable to reach the server. Check that the API is running and try again.'
          : err.response?.data?.message || 'Sign-in failed. Check your credentials and try again.';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-dvh bg-[#f3f7f5] md:grid md:grid-cols-[minmax(0,1.05fr)_minmax(420px,0.95fr)]">
      <Toaster />
      <AuthBrandPanel
        eyebrow="Care, closer to home"
        headline="Your health center, in step with you."
        description="Triage, medicine availability, and queue updates for your barangay health station."
        features={['Pre-register before travelling to the center', 'Check medicine availability and reserve a pickup', 'See verified queue calls in real time']}
      />

      <main className="relative flex min-h-[470px] items-center justify-center overflow-hidden bg-[linear-gradient(145deg,#f4f8f6_0%,#e8f0ec_100%)] px-4 py-7 sm:px-8 sm:py-10 md:min-h-dvh md:px-10">
        <div className="pointer-events-none absolute -right-24 top-10 hidden h-72 w-72 rounded-full border border-teal-900/5 md:block" />
        <form onSubmit={handleSubmit} className="ap-enter relative w-full max-w-[440px] space-y-6 rounded-2xl border border-white/80 bg-white p-5 shadow-[0_24px_70px_rgba(21,51,50,0.12)] sm:p-8 md:p-9">
          <div className="flex items-start gap-3">
            <div className="mt-1 h-9 w-1 shrink-0 rounded-full bg-teal-600" />
            <div>
              <p className="text-[11px] font-bold uppercase text-teal-800">Resident and staff access</p>
              <h2 className="mt-1 text-2xl font-bold leading-tight text-slate-950 sm:text-3xl">Welcome back</h2>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">Sign in to continue to your AgapayPulse workspace.</p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label htmlFor="login-email" className="block text-sm font-semibold text-slate-800">Email address</label>
              <input
                id="login-email"
                type="email"
                autoComplete="username"
                required
                value={login}
                onChange={(e) => setLogin(e.target.value)}
                className="mt-1.5 min-h-12 w-full rounded-xl border border-slate-300 bg-slate-50 px-4 text-base text-slate-950 transition placeholder:text-slate-400 hover:border-slate-400 focus:border-teal-600 focus:bg-white focus:ring-2 focus:ring-teal-600/20"
                placeholder="you@example.com"
              />
            </div>

            <div>
              <div className="flex items-center justify-between gap-2">
                <label htmlFor="login-password" className="block text-sm font-semibold text-slate-800">Password</label>
                <span className="text-xs text-slate-500">Use your registered account</span>
              </div>
              <div className="relative mt-1.5">
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="min-h-12 w-full rounded-xl border border-slate-300 bg-slate-50 px-4 pr-14 text-base text-slate-950 transition placeholder:text-slate-400 hover:border-slate-400 focus:border-teal-600 focus:bg-white focus:ring-2 focus:ring-teal-600/20"
                  placeholder="Enter your password"
                />
                <button type="button" onClick={() => setShowPassword((visible) => !visible)} aria-label={showPassword ? 'Hide password' : 'Show password'} className="absolute inset-y-0 right-1 inline-flex w-11 items-center justify-center rounded-lg text-slate-500 hover:bg-teal-50 hover:text-teal-800">
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>
          </div>

          <button type="submit" disabled={loading} className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-teal-700 px-4 text-base font-bold text-white shadow-[0_8px_18px_rgba(8,126,121,0.22)] transition hover:-translate-y-0.5 hover:bg-teal-800 hover:shadow-[0_12px_24px_rgba(8,126,121,0.25)] disabled:translate-y-0 disabled:opacity-60">
            <LogIn className="h-5 w-5" />
            <span>{loading ? 'Signing in…' : 'Sign in'}</span>
          </button>

          <div className="border-t border-slate-100 pt-4 text-center text-sm">
            <span className="text-slate-600">New resident? </span>
            <Link to="/register" className="rounded font-bold text-teal-800 underline decoration-teal-300 underline-offset-4 hover:text-teal-950">Create an account</Link>
          </div>
          <p className="text-center text-xs text-slate-500">If you need assistance, ask the health center staff to help you sign in.</p>
        </form>
      </main>
    </div>
  );
}