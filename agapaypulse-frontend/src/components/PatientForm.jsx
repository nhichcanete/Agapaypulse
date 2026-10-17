import { useState } from 'react';
import { patientApi } from '../services/api';

function PatientForm() {
  const [formData, setFormData] = useState({
    patient_number: '',
    full_name: '',
    birth_date: '',
    age: '',
    gender: 'Male',
    priority_tag: 'Regular',
  });
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await patientApi.create(formData);
      alert('Patient registered successfully.');
      setFormData({
        patient_number: '',
        full_name: '',
        birth_date: '',
        age: '',
        gender: 'Male',
        priority_tag: 'Regular',
      });
    } catch (err) {
      alert('Error: ' + JSON.stringify(err.response?.data?.errors || err.message));
    } finally {
      setLoading(false);
    }
  };

  const inputClass =
    'w-full border border-slate-200 rounded-lg px-4 py-2.5 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition';

  return (
    <section className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
      <div className="px-6 py-5 border-b border-slate-100 flex items-center gap-3">
        <div className="w-1.5 h-8 bg-teal-600 rounded-full"></div>
        <div>
          <h2 className="text-xl font-bold text-slate-800">Register Patient</h2>
          <p className="text-xs text-slate-500">Add a new patient to the system</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="p-6 space-y-4 max-w-2xl">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">
            Patient Number
          </label>
          <input
            name="patient_number"
            placeholder="Enter patient number"
            value={formData.patient_number}
            onChange={handleChange}
            required
            className={inputClass}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">
            Full Name
          </label>
          <input
            name="full_name"
            placeholder="Enter full name"
            value={formData.full_name}
            onChange={handleChange}
            required
            className={inputClass}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Birth Date
            </label>
            <input
              name="birth_date"
              type="date"
              value={formData.birth_date}
              onChange={handleChange}
              required
              className={inputClass}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Age
            </label>
            <input
              name="age"
              type="number"
              placeholder="0"
              value={formData.age}
              onChange={handleChange}
              required
              className={inputClass}
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">
            Priority Tag
          </label>
          <select
            name="priority_tag"
            value={formData.priority_tag}
            onChange={handleChange}
            className={inputClass}
          >
            <option value="Regular">Regular</option>
            <option value="Senior Citizen">Senior Citizen</option>
            <option value="PWD">PWD</option>
            <option value="Pregnant">Pregnant</option>
            <option value="Infant">Infant</option>
          </select>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full md:w-auto bg-teal-600 hover:bg-teal-700 text-white font-semibold px-6 py-2.5 rounded-lg transition shadow-sm disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              Saving...
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
              </svg>
              Register Patient
            </>
          )}
        </button>
      </form>
    </section>
  );
}

export default PatientForm;