import { useEffect, useState } from 'react';
import { queueApi } from '../services/api';

function QueueDisplay() {
  const [queue, setQueue] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    queueApi.getQueue()
      .then((res) => {
        setQueue(res.data.queue || []);
        setError(null);
      })
      .catch((err) => {
        console.error(err);
        setError('Could not load queue. Make sure Laravel is running.');
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-4 border-teal-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <section className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
      <div className="px-6 py-5 border-b border-slate-100 flex items-center gap-3">
        <div className="w-1.5 h-8 bg-teal-600 rounded-full"></div>
        <div>
          <h2 className="text-xl font-bold text-slate-800">Live Queue</h2>
          <p className="text-xs text-slate-500">Real-time patient triage monitor</p>
        </div>
      </div>

      <div className="p-6">
        {error && (
          <div className="bg-rose-50 border border-rose-200 text-rose-700 px-4 py-3 rounded-lg text-sm mb-4">
            {error}
          </div>
        )}

        {queue.length === 0 ? (
          <div className="text-center py-16">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-teal-50 mb-4">
              <svg className="w-10 h-10 text-teal-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <p className="text-slate-600 font-medium">No patients in queue</p>
            <p className="text-xs text-slate-400 mt-1">All clear - health center is ready.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {queue.map((q) => (
              <div
                key={q.id}
                className="flex items-center justify-between px-4 py-3 rounded-lg border border-slate-100 hover:border-teal-200 transition"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-teal-50 flex items-center justify-center font-bold text-teal-700">
                    {q.queue_number}
                  </div>
                  <div>
                    <p className="font-medium text-slate-800">{q.patient?.full_name}</p>
                    <p className="text-xs text-slate-500">{q.queue_type}</p>
                  </div>
                </div>
                <span className="px-3 py-1 rounded-full text-xs font-medium bg-teal-100 text-teal-700">
                  {q.priority_tag}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

export default QueueDisplay;