import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import client from '../../api/client';
import { useAuth } from '../../context/useAuth';
import toast, { Toaster } from 'react-hot-toast';
import { UserPlus, ArrowLeft, Eye, EyeOff } from 'lucide-react';
import AuthBrandPanel from '../../components/AuthBrandPanel';

const today = new Date().toISOString().slice(0, 10);

export default function Register() {
  const navigate = useNavigate();
  const { establishSession } = useAuth();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [formError, setFormError] = useState('');
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    phone: '',
    password: '',
    password_confirmation: '',
    birth_date: '',
    sex: '',
    philhealth_no: '',
  });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (formData.password !== formData.password_confirmation) {
      toast.error('Passwords do not match.');
      return;
    }

    setLoading(true);
    setFormError('');
    try {
      const res = await client.post('/register', {
        full_name: formData.full_name,
        email: formData.email,
        phone: formData.phone,
        password: formData.password,
        password_confirmation: formData.password_confirmation,
        birth_date: formData.birth_date,
        sex: formData.sex,
        philhealth_no: formData.philhealth_no || null,
      });

      establishSession(res.data.token, res.data.user);
      toast.success('Registration successful! Welcome to AgapayPulse.');
      navigate('/app/dashboard', { replace: true });
    } catch (err) {
      const validationMessage = Object.values(err.response?.data?.errors || {})[0]?.[0];
      const message = validationMessage || err.response?.data?.message || 'Registration failed. Please check your inputs.';
      setFormError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-dvh bg-[#f3f7f5] md:grid md:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
      <Toaster />
      <AuthBrandPanel
        eyebrow="A simpler way to access care"
        headline="Get ready before you reach the health center."
        description="Create a resident account to check in, follow your queue, and reserve available medicines."
        features={['One resident account for your health-center visits', 'Optional priority identification for staff verification', 'Protected account details and personal queue updates']}
      />

      <main className="px-4 py-5 sm:px-7 sm:py-8 md:max-h-dvh md:overflow-y-auto md:px-10 md:py-8">
        <div className="ap-enter mx-auto w-full max-w-2xl rounded-2xl border border-white/80 bg-white p-5 shadow-[0_24px_70px_rgba(21,51,50,0.12)] sm:p-7 md:p-8">
          <div className="flex flex-col gap-4 border-b border-slate-100 pb-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-[11px] font-bold uppercase text-teal-800">Resident registration</p>
              <h2 className="mt-1 text-2xl font-bold text-slate-950 sm:text-3xl">Create your account</h2>
              <p className="mt-1 text-sm text-slate-600">Fields marked with * are required.</p>
            </div>
            <Link to="/login" className="inline-flex min-h-10 w-fit items-center gap-1.5 rounded-lg px-2 text-sm font-semibold text-teal-800 hover:bg-teal-50">
              <ArrowLeft className="h-4 w-4" />
              <span>Back to sign in</span>
            </Link>
          </div>

          {formError && <p role="alert" className="mt-4 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">{formError}</p>}

          <form onSubmit={handleSubmit} className="mt-5 space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">Full Name *</label>
              <input
                type="text"
                name="full_name"
                required
                value={formData.full_name}
                onChange={handleChange}
                autoComplete="name"
                className="mt-1.5 min-h-12 w-full rounded-xl border border-slate-300 bg-slate-50 px-4 text-base text-slate-950 transition placeholder:text-slate-400 hover:border-slate-400 focus:border-teal-600 focus:bg-white focus:ring-2 focus:ring-teal-600/20"
                placeholder="Juan Dela Cruz"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">Email Address *</label>
                <input
                  type="email"
                  name="email"
                  required
                  value={formData.email}
                  onChange={handleChange}
                  autoComplete="email"
                  className="mt-1.5 min-h-12 w-full rounded-xl border border-slate-300 bg-slate-50 px-4 text-base text-slate-950 transition placeholder:text-slate-400 hover:border-slate-400 focus:border-teal-600 focus:bg-white focus:ring-2 focus:ring-teal-600/20"
                  placeholder="juan@gmail.com"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">Mobile Number *</label>
                <input
                  type="tel"
                  name="phone"
                  required
                  value={formData.phone}
                  onChange={handleChange}
                  autoComplete="tel"
                  inputMode="tel"
                  className="mt-1.5 min-h-12 w-full rounded-xl border border-slate-300 bg-slate-50 px-4 text-base text-slate-950 transition placeholder:text-slate-400 hover:border-slate-400 focus:border-teal-600 focus:bg-white focus:ring-2 focus:ring-teal-600/20"
                  placeholder="09171234567"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">Date of Birth *</label>
                <input type="date" name="birth_date" required max={today} value={formData.birth_date} onChange={handleChange} autoComplete="bday" className="mt-1.5 min-h-12 w-full rounded-xl border border-slate-300 bg-slate-50 px-3 text-base text-slate-950 transition focus:border-teal-600 focus:bg-white focus:ring-2 focus:ring-teal-600/20" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">Sex *</label>
                <select name="sex" required value={formData.sex} onChange={handleChange} className="mt-1.5 min-h-12 w-full rounded-xl border border-slate-300 bg-slate-50 px-3 text-base text-slate-950 transition focus:border-teal-600 focus:bg-white focus:ring-2 focus:ring-teal-600/20">
                  <option value="">Select</option>
                  <option value="Female">Female</option>
                  <option value="Male">Male</option>
                  <option value="Other">Other</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">PhilHealth Number <span className="font-normal normal-case text-slate-500">(optional)</span></label>
              <input type="text" name="philhealth_no" maxLength={50} autoComplete="off" value={formData.philhealth_no} onChange={handleChange} className="mt-1.5 min-h-12 w-full rounded-xl border border-slate-300 bg-slate-50 px-4 text-base text-slate-950 transition focus:border-teal-600 focus:bg-white focus:ring-2 focus:ring-teal-600/20" placeholder="For Konsulta reporting" />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="register-password" className="block text-sm font-semibold text-slate-800">Password *</label>
                <div className="relative mt-1.5">
                  <input id="register-password" type={showPassword ? 'text' : 'password'} name="password" required minLength={8} autoComplete="new-password" value={formData.password} onChange={handleChange} className="min-h-12 w-full rounded-xl border border-slate-300 bg-slate-50 px-4 pr-14 text-base text-slate-950 transition focus:border-teal-600 focus:bg-white focus:ring-2 focus:ring-teal-600/20" placeholder="At least 8 characters" />
                  <button type="button" onClick={() => setShowPassword((visible) => !visible)} aria-label={showPassword ? 'Hide password' : 'Show password'} className="absolute inset-y-0 right-1 inline-flex w-11 items-center justify-center rounded-lg text-slate-500 hover:bg-teal-50 hover:text-teal-800">
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
                <p className="mt-1 text-xs text-slate-500">Use at least 8 characters.</p>
              </div>

              <div>
                <label htmlFor="register-password-confirm" className="block text-sm font-semibold text-slate-800">Confirm password *</label>
                <div className="relative mt-1.5">
                  <input id="register-password-confirm" type={showConfirmation ? 'text' : 'password'} name="password_confirmation" required minLength={8} autoComplete="new-password" value={formData.password_confirmation} onChange={handleChange} className="min-h-12 w-full rounded-xl border border-slate-300 bg-slate-50 px-4 pr-14 text-base text-slate-950 transition focus:border-teal-600 focus:bg-white focus:ring-2 focus:ring-teal-600/20" placeholder="Repeat your password" />
                  <button type="button" onClick={() => setShowConfirmation((visible) => !visible)} aria-label={showConfirmation ? 'Hide confirmation password' : 'Show confirmation password'} className="absolute inset-y-0 right-1 inline-flex w-11 items-center justify-center rounded-lg text-slate-500 hover:bg-teal-50 hover:text-teal-800">
                    {showConfirmation ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="mt-2 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-teal-700 px-4 text-base font-bold text-white shadow-[0_8px_18px_rgba(8,126,121,0.22)] transition hover:-translate-y-0.5 hover:bg-teal-800 disabled:translate-y-0 disabled:opacity-60"
            >
              <UserPlus className="h-5 w-5" />
              <span>{loading ? 'Creating Account...' : 'Complete Registration'}</span>
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}