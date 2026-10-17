import { useCallback, useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import toast from 'react-hot-toast';
import { CalendarClock, Check, PackagePlus, Pencil, Pill, Plus, QrCode, X } from 'lucide-react';
import client from '../api/client';
import { useAuth } from '../context/useAuth';

const emptyMedicine = {
  medicine_name: '',
  generic_name: '',
  dosage: '',
  category: 'Maintenance',
  stock_quantity: 0,
  max_per_release: 30,
  reorder_level: 10,
  unit: 'tablets',
  expiry_date: '',
  description: '',
};

function formatDate(value) {
  return value ? new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(Date.parse(value)) : 'Not specified';
}

export default function MedicineList() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const showOrders = location.pathname === '/app/orders';
  const reservationConfirmation = location.state?.reservationConfirmation || null;
  const isResident = user?.role === 'resident';
  const canManageStock = ['admin', 'pharmacist'].includes(user?.role);
  const [medicines, setMedicines] = useState([]);
  const [reservations, setReservations] = useState([]);
  const [quantities, setQuantities] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [reserveError, setReserveError] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [newMedicine, setNewMedicine] = useState(emptyMedicine);
  const [editingId, setEditingId] = useState(null);
  const [editDraft, setEditDraft] = useState(null);

  const loadData = useCallback(async () => {
    try {
      if (showOrders) {
        const response = await client.get('/my-reservations');
        setReservations(response.data);
      } else {
        const response = await client.get('/medicines');
        setMedicines(response.data.data || []);
      }
      setError('');
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to load this information right now.');
    } finally {
      setLoading(false);
    }
  }, [showOrders]);

  useEffect(() => {
    const initialLoad = window.setTimeout(() => loadData(), 0);
    return () => window.clearTimeout(initialLoad);
  }, [loadData]);

  const handleReserve = async (medicine) => {
    const quantity = Number(quantities[medicine.id] || 1);
    const available = medicine.available_stock ?? Math.max(0, medicine.stock_quantity - medicine.reserved_quantity);
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > available || quantity > medicine.max_per_release) {
      setReserveError(`Choose a quantity from 1 to ${Math.min(available, medicine.max_per_release)} ${medicine.unit}.`);
      return;
    }

    setReserveError('');
    setSaving(true);
    try {
      const response = await client.post('/reservations', { medicine_id: medicine.id, quantity });
      navigate('/app/orders', {
        state: {
          reservationConfirmation: {
            id: response.data.id,
            medicineName: response.data.medicine?.medicine_name || medicine.medicine_name,
            quantity: response.data.quantity,
            pickupCode: response.data.pickup_code,
            expiresAt: response.data.expires_at,
          },
        },
      });
    } catch (requestError) {
      const validationMessage = Object.values(requestError.response?.data?.errors || {})[0]?.[0];
      setReserveError(validationMessage || requestError.response?.data?.message || 'Your order was not placed. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleCreate = async (event) => {
    event.preventDefault();
    setSaving(true);
    try {
      await client.post('/medicines', {
        ...newMedicine,
        stock_quantity: Number(newMedicine.stock_quantity),
        max_per_release: Number(newMedicine.max_per_release),
        reorder_level: Number(newMedicine.reorder_level),
        expiry_date: newMedicine.expiry_date || null,
      });
      toast.success('Medicine added to inventory.');
      setNewMedicine(emptyMedicine);
      setShowCreate(false);
      await loadData();
    } catch (requestError) {
      toast.error(requestError.response?.data?.message || 'Could not save the medicine.');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdate = async (event) => {
    event.preventDefault();
    setSaving(true);
    try {
      await client.put(`/medicines/${editingId}`, {
        ...editDraft,
        stock_quantity: Number(editDraft.stock_quantity),
        max_per_release: Number(editDraft.max_per_release),
        reorder_level: Number(editDraft.reorder_level),
        expiry_date: editDraft.expiry_date || null,
      });
      toast.success('Inventory updated.');
      setEditingId(null);
      setEditDraft(null);
      await loadData();
    } catch (requestError) {
      toast.error(requestError.response?.data?.message || 'Could not update inventory.');
    } finally {
      setSaving(false);
    }
  };

  if (showOrders) {
    return (
      <section className="mx-auto w-full max-w-5xl space-y-6">
        <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-teal-700">Resident portal · Your pickups</p>
            <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-slate-950 sm:text-3xl">Medicine claim passes</h1>
            <p className="mt-1 text-sm text-slate-600">Your pickup codes and QR passes, ready when you arrive at the health center.</p>
          </div>
          <button type="button" onClick={() => navigate('/app/medicines')} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-teal-700 px-4 text-sm font-semibold text-white hover:bg-teal-800">
            <Pill className="h-4 w-4" /> Browse medicines
          </button>
        </header>

        {error && <p role="alert" className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">{error}</p>}
        {reservationConfirmation && (
          <div role="status" className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 shadow-sm sm:p-5">
            <div className="flex items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-800"><Check className="h-5 w-5" /></span>
              <div className="min-w-0">
                <h2 className="font-bold text-emerald-950">Order placed successfully</h2>
                <p className="mt-1 text-sm text-emerald-900">
                  Reserved {reservationConfirmation.quantity} for {reservationConfirmation.medicineName}. Your pickup pass is below.
                </p>
                {reservationConfirmation.pickupCode && <p className="mt-2 break-all font-mono text-sm font-bold tracking-wide text-emerald-950">{reservationConfirmation.pickupCode}</p>}
                {reservationConfirmation.expiresAt && <p className="mt-1 text-xs text-emerald-800">Please collect it by {formatDate(reservationConfirmation.expiresAt)}.</p>}
              </div>
            </div>
          </div>
        )}
        {loading ? <p className="py-12 text-center text-sm text-slate-500">Loading reservations…</p> : reservations.length === 0 ? (
          <div className="rounded-lg border border-dashed border-slate-300 bg-white px-6 py-14 text-center">
            <QrCode className="mx-auto h-8 w-8 text-slate-400" />
            <h2 className="mt-3 font-semibold text-slate-900">No claim passes yet</h2>
            <p className="mt-1 text-sm text-slate-600">Reserve an available medicine to receive a pickup QR code.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {reservations.map((reservation) => {
              const active = ['pending', 'ready'].includes(reservation.status);
              return (
                <article key={reservation.id} className="group flex flex-col gap-4 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-teal-200 hover:shadow-lg hover:shadow-teal-950/5 sm:flex-row sm:items-center sm:p-5">
                  {active && <div className="mx-auto flex shrink-0 justify-center rounded-2xl bg-white p-3 ring-1 ring-slate-200 shadow-sm transition group-hover:ring-teal-200 sm:mx-0"><QRCodeSVG value={`${window.location.origin}/pharmacy/claims?pickup_code=${encodeURIComponent(reservation.pickup_code)}`} size={120} level="M" /></div>}
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h2 className="font-semibold text-slate-950">{reservation.medicine?.medicine_name}</h2>
                      <span className={`rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${active ? 'bg-emerald-50 text-emerald-800 ring-1 ring-inset ring-emerald-200' : 'bg-slate-100 text-slate-600'}`}>{active ? 'Ready to claim' : reservation.status}</span>
                    </div>
                    <p className="mt-1 text-sm text-slate-600">{reservation.quantity} {reservation.medicine?.unit}</p>
                    <p className="mt-3 break-all font-mono text-lg font-bold tracking-wide text-teal-800">{reservation.pickup_code}</p>
                    <p className="mt-2 flex items-center gap-1.5 text-xs text-slate-500"><CalendarClock className="h-4 w-4" /> Expires {formatDate(reservation.expires_at)}</p>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    );
  }

  return (
    <section className="mx-auto w-full max-w-6xl space-y-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-teal-700">{isResident ? 'Resident portal · Pharmacy' : 'Health center · Inventory'}</p>
          <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-slate-950 sm:text-3xl">Medicine availability</h1>
          <p className="mt-1 text-sm text-slate-600">{isResident ? 'Find available medicine and reserve a pickup in a few steps.' : 'Monitor on-hand stock, active holds, and reorder levels.'}</p>
        </div>
        {canManageStock && <button type="button" onClick={() => setShowCreate((value) => !value)} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-teal-800 px-4 text-sm font-semibold text-white shadow-md shadow-teal-900/10 transition hover:-translate-y-0.5 hover:bg-teal-900"><Plus className="h-4 w-4" /> Add medicine</button>}
      </header>

      {showCreate && (
        <form onSubmit={handleCreate} className="grid grid-cols-1 gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-lg shadow-slate-900/5 sm:grid-cols-2 sm:p-5 lg:grid-cols-4">
          <input required aria-label="Medicine name" placeholder="Medicine name" value={newMedicine.medicine_name} onChange={(event) => setNewMedicine({ ...newMedicine, medicine_name: event.target.value })} className="min-h-11 rounded-md border border-slate-300 px-3 text-sm" />
          <input aria-label="Generic name" placeholder="Generic name" value={newMedicine.generic_name} onChange={(event) => setNewMedicine({ ...newMedicine, generic_name: event.target.value })} className="min-h-11 rounded-md border border-slate-300 px-3 text-sm" />
          <input required aria-label="Category" placeholder="Category" value={newMedicine.category} onChange={(event) => setNewMedicine({ ...newMedicine, category: event.target.value })} className="min-h-11 rounded-md border border-slate-300 px-3 text-sm" />
          <input required aria-label="Dosage" placeholder="Dosage" value={newMedicine.dosage} onChange={(event) => setNewMedicine({ ...newMedicine, dosage: event.target.value })} className="min-h-11 rounded-md border border-slate-300 px-3 text-sm" />
          <input required aria-label="Quantity in stock" type="number" min="0" placeholder="Stock quantity" value={newMedicine.stock_quantity} onChange={(event) => setNewMedicine({ ...newMedicine, stock_quantity: event.target.value })} className="min-h-11 rounded-md border border-slate-300 px-3 text-sm" />
          <input required aria-label="Maximum per release" type="number" min="1" placeholder="Max per release" value={newMedicine.max_per_release} onChange={(event) => setNewMedicine({ ...newMedicine, max_per_release: event.target.value })} className="min-h-11 rounded-md border border-slate-300 px-3 text-sm" />
          <input required aria-label="Reorder threshold" type="number" min="0" placeholder="Reorder level" value={newMedicine.reorder_level} onChange={(event) => setNewMedicine({ ...newMedicine, reorder_level: event.target.value })} className="min-h-11 rounded-md border border-slate-300 px-3 text-sm" />
          <input required aria-label="Unit" placeholder="Unit (e.g. tablets)" value={newMedicine.unit} onChange={(event) => setNewMedicine({ ...newMedicine, unit: event.target.value })} className="min-h-11 rounded-md border border-slate-300 px-3 text-sm" />
          <input aria-label="Expiry date" type="date" value={newMedicine.expiry_date} onChange={(event) => setNewMedicine({ ...newMedicine, expiry_date: event.target.value })} className="min-h-11 rounded-md border border-slate-300 px-3 text-sm" />
          <div className="flex gap-2 sm:col-span-2 lg:col-span-4">
            <button type="submit" disabled={saving} className="inline-flex min-h-11 items-center gap-2 rounded-md bg-teal-700 px-4 text-sm font-semibold text-white disabled:opacity-60"><Check className="h-4 w-4" /> Save medicine</button>
            <button type="button" onClick={() => setShowCreate(false)} className="inline-flex min-h-11 items-center gap-2 rounded-md border border-slate-300 px-4 text-sm font-semibold text-slate-700"><X className="h-4 w-4" /> Cancel</button>
          </div>
        </form>
      )}

      {error && <p role="alert" className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">{error}</p>}
      {reserveError && <p role="alert" className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">{reserveError}</p>}
      {loading ? <p className="py-12 text-center text-sm text-slate-500">Loading inventory…</p> : medicines.length === 0 ? (
        <div className="rounded-lg border border-dashed border-slate-300 bg-white px-6 py-14 text-center"><PackagePlus className="mx-auto h-8 w-8 text-slate-400" /><p className="mt-3 font-semibold text-slate-900">No medicines found</p></div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {medicines.map((medicine) => {
            const available = medicine.available_stock ?? Math.max(0, medicine.stock_quantity - medicine.reserved_quantity);
            const isExpired = medicine.is_expired;
            const isLow = available <= medicine.reorder_level;
            const isEditing = editingId === medicine.id;
            return (
              <article key={medicine.id} className="min-w-0 rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-teal-200 hover:shadow-md">
                {isEditing ? (
                  <form onSubmit={handleUpdate} className="space-y-2">
                    {['medicine_name', 'generic_name', 'dosage', 'category', 'stock_quantity', 'reorder_level', 'max_per_release', 'unit', 'expiry_date'].map((field) => (
                      <label key={field} className="block text-xs font-medium capitalize text-slate-600">{field.replaceAll('_', ' ')}
                        <input required={!['generic_name', 'expiry_date'].includes(field)} type={['stock_quantity', 'reorder_level', 'max_per_release'].includes(field) ? 'number' : field === 'expiry_date' ? 'date' : 'text'} min={['stock_quantity', 'reorder_level'].includes(field) ? 0 : 1} value={editDraft[field] ?? ''} onChange={(event) => setEditDraft({ ...editDraft, [field]: event.target.value })} className="mt-1 min-h-11 w-full rounded-md border border-slate-300 px-2.5 text-sm" />
                      </label>
                    ))}
                    <div className="flex gap-2 pt-2">
                      <button type="submit" disabled={saving} className="min-h-10 rounded-md bg-teal-700 px-3 text-sm font-semibold text-white">Save</button>
                      <button type="button" onClick={() => setEditingId(null)} className="min-h-10 rounded-md border border-slate-300 px-3 text-sm font-semibold text-slate-700">Cancel</button>
                    </div>
                  </form>
                ) : (
                  <>
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h2 className="break-words font-semibold text-slate-950">{medicine.medicine_name}</h2>
                        <p className="mt-0.5 text-sm text-slate-600">{[medicine.generic_name, medicine.dosage, medicine.category].filter(Boolean).join(' · ')}</p>
                      </div>
                      <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${isExpired ? 'bg-rose-100 text-rose-800' : isLow ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'}`}>{isExpired ? 'Expired' : isLow ? 'Low stock' : 'Available'}</span>
                    </div>
                    <div className="mt-4 grid grid-cols-2 gap-3">
                      <div className="rounded-lg bg-teal-50 p-3">
                        <p className="text-xs font-medium text-teal-800">Available now</p>
                        <p className="mt-1 text-2xl font-bold tabular-nums text-teal-950">{available}<span className="ml-1 text-xs font-medium">{medicine.unit}</span></p>
                      </div>
                      <div className="rounded-lg bg-slate-50 p-3">
                        <p className="text-xs font-medium text-slate-600">Reserved</p>
                        <p className="mt-1 text-2xl font-bold tabular-nums text-slate-900">{medicine.reserved_quantity}<span className="ml-1 text-xs font-medium">{medicine.unit}</span></p>
                      </div>
                    </div>
                    {canManageStock && <p className="mt-2 text-xs text-slate-500">Total on hand: {medicine.stock_quantity} · Reorder at {medicine.reorder_level}</p>}
                    {!canManageStock && <p className="mt-2 text-xs text-slate-500">Reorder threshold: {medicine.reorder_level}</p>}
                    {medicine.expiry_date && <p className="mt-1 text-xs text-slate-500">Expires {formatDate(medicine.expiry_date)}</p>}
                    {isResident && (
                      <div className="mt-4 flex items-center gap-2 border-t border-slate-100 pt-3">
                        <label className="sr-only" htmlFor={`quantity-${medicine.id}`}>Quantity for {medicine.medicine_name}</label>
                        <input id={`quantity-${medicine.id}`} type="number" min="1" max={Math.min(medicine.max_per_release, available)} value={quantities[medicine.id] || 1} onChange={(event) => { setReserveError(''); setQuantities({ ...quantities, [medicine.id]: event.target.value }); }} disabled={!available} className="min-h-11 w-20 rounded-md border border-slate-300 px-2 text-center text-sm" />
                        <button type="button" onClick={() => handleReserve(medicine)} disabled={saving || !available} className="min-h-11 flex-1 rounded-md bg-teal-700 px-3 text-sm font-semibold text-white hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-50">Reserve for 24 hours</button>
                      </div>
                    )}
                    {canManageStock && <button type="button" onClick={() => { setEditingId(medicine.id); setEditDraft({ ...medicine, expiry_date: medicine.expiry_date?.slice(0, 10) || '' }); }} className="mt-4 inline-flex min-h-10 items-center gap-2 rounded-lg border border-slate-300 px-3 text-sm font-semibold text-slate-700 transition hover:border-teal-600 hover:bg-teal-50 hover:text-teal-900"><Pencil className="h-4 w-4" /> Edit stock & details</button>}
                  </>
                )}
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}