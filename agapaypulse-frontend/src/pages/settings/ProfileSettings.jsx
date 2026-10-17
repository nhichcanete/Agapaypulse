import { useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Activity, BadgeCheck, CheckCircle2, Clock3, FileImage, KeyRound, Save, ShieldCheck, Upload, UserRound } from 'lucide-react';
import toast from 'react-hot-toast';
import client from '../../api/client';
import { useAuth } from '../../context/useAuth';

function profileValues(user) {
  return {
    name: user?.name || '',
    email: user?.email || '',
    phone: user?.phone || '',
    birth_date: user?.patient?.birth_date?.slice(0, 10) || '',
    sex: user?.patient?.sex || '',
    philhealth_no: user?.patient?.philhealth_no || '',
  };
}

function Field({ label, name, value, onChange, type = 'text', required = false, hint }) {
  return (
    <label className="block">
      <span className="text-sm font-semibold text-slate-700">{label}{required && <span className="ml-1 text-rose-600">*</span>}</span>
      <input
        name={name}
        type={type}
        required={required}
        value={value}
        onChange={onChange}
        className="mt-1.5 min-h-12 w-full rounded-xl border border-slate-300 bg-white px-3.5 text-sm text-slate-900 shadow-sm placeholder:text-slate-400 focus:border-teal-600 focus:ring-4 focus:ring-teal-600/10"
      />
      {hint && <span className="mt-1.5 block text-xs leading-relaxed text-slate-500">{hint}</span>}
    </label>
  );
}

export default function ProfileSettings() {
  const queryClient = useQueryClient();
  const { token, establishSession } = useAuth();
  const documentInput = useRef(null);
  const [profile, setProfile] = useState(null);
  const [priorityIdType, setPriorityIdType] = useState('');
  const [priorityIdNumber, setPriorityIdNumber] = useState('');
  const [priorityDocument, setPriorityDocument] = useState(null);
  const [priorityUploadPending, setPriorityUploadPending] = useState(false);
  const [password, setPassword] = useState({ current_password: '', password: '', password_confirmation: '' });
  const { data: user, isPending, isError } = useQuery({
    queryKey: ['current-user'],
    queryFn: async () => (await client.get('/me')).data,
    staleTime: 0,
    retry: false,
    select: (data) => data,
    placeholderData: (previous) => previous,
  });
  const values = profile || profileValues(user);

  const profileMutation = useMutation({
    mutationFn: async (payload) => (await client.put('/profile', payload)).data,
    onSuccess: (data) => {
      setProfile(profileValues(data.user));
      queryClient.setQueryData(['current-user'], data.user);
      establishSession(token, data.user);
      toast.success(data.message);
    },
    onError: (error) => toast.error(error.response?.data?.message || 'Could not save your profile.'),
  });

  const passwordMutation = useMutation({
    mutationFn: async (payload) => (await client.put('/profile/password', payload)).data,
    onSuccess: (data) => {
      setPassword({ current_password: '', password: '', password_confirmation: '' });
      toast.success(data.message);
    },
    onError: (error) => toast.error(error.response?.data?.message || 'Could not update your password.'),
  });

  const handleProfileSubmit = (event) => {
    event.preventDefault();
    profileMutation.mutate({
      ...values,
      phone: values.phone || null,
      birth_date: values.birth_date || null,
      sex: values.sex || null,
      philhealth_no: values.philhealth_no || null,
    });
  };

  const handlePriorityDocumentSubmit = async (event) => {
    event.preventDefault();
    if (!priorityDocument || !priorityIdType) return;

    const payload = new FormData();
    payload.append('id_type', priorityIdType);
    payload.append('id_number', priorityIdNumber);
    payload.append('document', priorityDocument);
    setPriorityUploadPending(true);
    try {
      const response = await client.post('/priority-verification', payload, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      queryClient.setQueryData(['current-user'], (current) => current
        ? { ...current, patient: { ...current.patient, ...response.data.patient } }
        : current);
      setPriorityDocument(null);
      setPriorityIdNumber('');
      if (documentInput.current) documentInput.current.value = '';
      toast.success(response.data.message);
    } catch (error) {
      const validationMessage = Object.values(error.response?.data?.errors || {})[0]?.[0];
      toast.error(validationMessage || error.response?.data?.message || 'Could not submit your document.');
    } finally {
      setPriorityUploadPending(false);
    }
  };

  const handlePasswordSubmit = (event) => {
    event.preventDefault();
    passwordMutation.mutate(password);
  };

  const updateProfileField = (event) => setProfile({ ...values, [event.target.name]: event.target.value });
  const updatePasswordField = (event) => setPassword({ ...password, [event.target.name]: event.target.value });

  if (isPending && !user) return <p role="status" className="py-12 text-center text-sm text-slate-500">Loading account settings…</p>;
  if (isError && !user) return <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">We could not load your account settings. Refresh the page and try again.</p>;

  const isResident = user?.role === 'resident';
  const patient = user?.patient;
  const ageBasedPriority = patient?.age >= 60;
  const documentStatus = patient?.priority_document_status || 'not_submitted';

  return (
    <section className="mx-auto w-full max-w-5xl space-y-6">
      <header className="relative isolate overflow-hidden rounded-3xl bg-[linear-gradient(120deg,#123b39_0%,#14645e_65%,#16857b_100%)] p-5 text-white shadow-xl shadow-teal-950/10 sm:p-7">
        <div className="pointer-events-none absolute -right-12 -top-24 -z-10 h-72 w-72 rounded-full border border-white/10" />
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-semibold text-teal-50"><ShieldCheck className="h-3.5 w-3.5" /> Private account settings</span>
            <h1 className="mt-4 text-2xl font-extrabold tracking-tight sm:text-3xl">Profile & security</h1>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-teal-50/80">Keep your contact details current and protect access to your AgapayPulse account.</p>
          </div>
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-white/20 bg-white/10 text-2xl font-extrabold shadow-inner">
            {user?.name?.trim()?.slice(0, 1)?.toUpperCase() || <UserRound className="h-7 w-7" />}
          </div>
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.6fr)_minmax(260px,0.8fr)]">
        <form onSubmit={handleProfileSubmit} className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-5 py-4 sm:px-6">
            <h2 className="flex items-center gap-2 font-bold text-slate-950"><UserRound className="h-5 w-5 text-teal-700" /> Personal information</h2>
            <p className="mt-1 text-sm text-slate-500">Used for account access and health-center communication.</p>
          </div>
          <div className="grid gap-4 p-5 sm:grid-cols-2 sm:p-6">
            <Field label="Full name" name="name" value={values.name} onChange={updateProfileField} required />
            <Field label="Email address" name="email" type="email" value={values.email} onChange={updateProfileField} required />
            <Field label="Phone number" name="phone" type="tel" value={values.phone} onChange={updateProfileField} hint="Used by health-center staff to contact you about your visit." />
            {isResident && (
              <>
                <Field label="Date of birth" name="birth_date" type="date" value={values.birth_date} onChange={updateProfileField} />
                <label className="block">
                  <span className="text-sm font-semibold text-slate-700">Sex</span>
                  <select name="sex" value={values.sex} onChange={updateProfileField} className="mt-1.5 min-h-12 w-full rounded-xl border border-slate-300 bg-white px-3.5 text-sm text-slate-900 shadow-sm">
                    <option value="">Not provided</option><option value="Female">Female</option><option value="Male">Male</option><option value="Other">Other</option>
                  </select>
                </label>
                <Field label="PhilHealth number" name="philhealth_no" value={values.philhealth_no} onChange={updateProfileField} />
              </>
            )}
          </div>
          <div className="flex flex-col justify-between gap-3 border-t border-slate-100 bg-slate-50/70 px-5 py-4 sm:flex-row sm:items-center sm:px-6">
            <span className="text-xs text-slate-500">Account role: <strong className="capitalize text-slate-700">{user?.role}</strong></span>
            <button type="submit" disabled={profileMutation.isPending} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-teal-800 px-4 text-sm font-bold text-white shadow-sm transition hover:bg-teal-900 disabled:opacity-60"><Save className="h-4 w-4" />{profileMutation.isPending ? 'Saving…' : 'Save profile'}</button>
          </div>
        </form>

        <div className="space-y-5">
          {isResident && (
            <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
              <div className="border-b border-slate-100 px-5 py-4">
                <h2 className="flex items-center gap-2 font-bold text-slate-950"><BadgeCheck className="h-5 w-5 text-teal-700" /> Priority status</h2>
                <p className="mt-1 text-sm text-slate-500">Age-based senior priority is applied automatically. Other priority IDs need admin review.</p>
              </div>
              <div className="space-y-4 p-5">
                {ageBasedPriority ? (
                  <div className="flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900">
                    <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" /> Senior priority is applied automatically from your date of birth.
                  </div>
                ) : documentStatus === 'approved' ? (
                  <div className="flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900">
                    <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" /> Your {patient?.id_type} ID has been verified by the health-center admin.
                  </div>
                ) : (
                  <>
                    <div className={`flex items-start gap-2 rounded-xl border p-3 text-sm ${documentStatus === 'pending' ? 'border-amber-200 bg-amber-50 text-amber-950' : 'border-slate-200 bg-slate-50 text-slate-700'}`}>
                      {documentStatus === 'pending' ? <Clock3 className="mt-0.5 h-5 w-5 shrink-0" /> : <FileImage className="mt-0.5 h-5 w-5 shrink-0" />}
                      <div>
                        <p className="font-semibold">{documentStatus === 'pending' ? 'Waiting for admin review' : documentStatus === 'rejected' ? 'Please review and submit again' : 'Submit an eligible priority ID'}</p>
                        {patient?.priority_review_note && <p className="mt-1 text-xs leading-relaxed">{patient.priority_review_note}</p>}
                      </div>
                    </div>
                    <form onSubmit={handlePriorityDocumentSubmit} className="space-y-3">
                      <label className="block text-sm font-semibold text-slate-700">
                        ID category
                        <select required value={priorityIdType} onChange={(event) => setPriorityIdType(event.target.value)} className="mt-1.5 min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm">
                          <option value="">Choose category</option>
                          <option value="Senior Citizen">Senior Citizen ID</option>
                          <option value="PWD">PWD ID</option>
                          <option value="Indigent">Barangay indigency certificate</option>
                        </select>
                      </label>
                      <label className="block text-sm font-semibold text-slate-700">
                        ID / reference number <span className="font-normal text-slate-500">(optional)</span>
                        <input value={priorityIdNumber} onChange={(event) => setPriorityIdNumber(event.target.value)} maxLength={100} className="mt-1.5 min-h-11 w-full rounded-lg border border-slate-300 px-3 text-sm" />
                      </label>
                      <label className="block text-sm font-semibold text-slate-700">
                        Photo of your ID
                        <input
                          ref={documentInput}
                          type="file"
                          accept="image/jpeg,image/png,image/webp"
                          capture="environment"
                          required
                          onChange={(event) => setPriorityDocument(event.target.files?.[0] || null)}
                          className="mt-1.5 block min-h-11 w-full rounded-lg border border-slate-300 bg-white p-2 text-sm file:mr-3 file:min-h-8 file:rounded-md file:border-0 file:bg-teal-50 file:px-3 file:font-semibold file:text-teal-800"
                        />
                        <span className="mt-1 block text-xs font-normal text-slate-500">JPG, PNG, or WebP · up to 5 MB. The image is private and only admins can review it.</span>
                      </label>
                      <button type="submit" disabled={priorityUploadPending || !priorityDocument || !priorityIdType} className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-teal-800 px-4 text-sm font-bold text-white hover:bg-teal-900 disabled:opacity-60">
                        <Upload className="h-4 w-4" /> {priorityUploadPending ? 'Submitting…' : 'Submit for review'}
                      </button>
                    </form>
                  </>
                )}
              </div>
            </section>
          )}
          <form onSubmit={handlePasswordSubmit} className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
            <div className="border-b border-slate-100 px-5 py-4">
              <h2 className="flex items-center gap-2 font-bold text-slate-950"><KeyRound className="h-5 w-5 text-teal-700" /> Change password</h2>
              <p className="mt-1 text-sm text-slate-500">Use at least eight characters.</p>
            </div>
            <div className="space-y-4 p-5">
              <Field label="Current password" name="current_password" type="password" value={password.current_password} onChange={updatePasswordField} required />
              <Field label="New password" name="password" type="password" value={password.password} onChange={updatePasswordField} required hint="Minimum 8 characters." />
              <Field label="Confirm new password" name="password_confirmation" type="password" value={password.password_confirmation} onChange={updatePasswordField} required />
              <button type="submit" disabled={passwordMutation.isPending} className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 text-sm font-bold text-slate-800 transition hover:border-teal-600 hover:bg-teal-50 disabled:opacity-60">{passwordMutation.isPending ? 'Updating…' : 'Update password'}</button>
            </div>
          </form>

          <aside className="rounded-2xl border border-teal-100 bg-[linear-gradient(145deg,#f0fdfa_0%,#ecfdf5_100%)] p-5">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-teal-800 shadow-sm"><Activity className="h-5 w-5" /></span>
            <h3 className="mt-3 font-bold text-teal-950">Your information stays yours</h3>
            <p className="mt-1 text-sm leading-relaxed text-teal-900/75">Only update your own account here. System role and clinical verification are managed by authorized health-center administrators.</p>
          </aside>
        </div>
      </div>
    </section>
  );
}
