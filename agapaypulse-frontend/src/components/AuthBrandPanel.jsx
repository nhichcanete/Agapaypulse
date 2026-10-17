import { Activity, CheckCircle2 } from 'lucide-react';

const brandImage = 'https://images.unsplash.com/photo-1505751172876-fa1923c5c528?auto=format&fit=crop&w=2000&q=90';

export default function AuthBrandPanel({ eyebrow, headline, description, features }) {
  return (
    <section
      className="relative isolate flex min-h-[220px] flex-col justify-between overflow-hidden bg-slate-950 bg-cover bg-center px-5 py-5 text-white sm:min-h-[250px] sm:px-8 md:min-h-dvh md:px-12 md:py-10"
      style={{ backgroundImage: `url('${brandImage}')` }}
    >
      <div className="absolute inset-0 -z-10 bg-gradient-to-br from-[#092f2d]/95 via-[#0b514d]/82 to-[#133c3b]/72" />
      <div className="absolute inset-x-0 top-0 h-1 bg-teal-300" />

      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-teal-200/40 bg-teal-300/15 text-teal-200 shadow-inner sm:h-12 sm:w-12">
          <Activity className="h-6 w-6" />
        </div>
        <div>
          <p className="text-lg font-bold leading-tight sm:text-xl">AgapayPulse</p>
          <p className="mt-0.5 text-[11px] font-medium text-teal-100/85 sm:text-xs">Barangay Health Station System</p>
        </div>
      </div>

      <div className="relative z-10 mt-8 max-w-xl md:my-auto md:py-10">
        <p className="mb-2 text-[11px] font-bold uppercase text-teal-200 sm:text-xs">{eyebrow}</p>
        <h1 className="max-w-lg text-2xl font-bold leading-tight sm:text-3xl md:text-4xl">{headline}</h1>
        <p className="mt-2 max-w-lg text-sm leading-relaxed text-teal-50/90 sm:mt-4 sm:text-base">{description}</p>
        <ul className="mt-6 hidden space-y-3 md:grid">
          {features.map((feature) => (
            <li key={feature} className="flex items-start gap-3 text-sm font-medium text-white/95">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-teal-200" />
              <span>{feature}</span>
            </li>
          ))}
        </ul>
      </div>

      <p className="relative z-10 mt-5 hidden text-xs text-teal-100/75 md:block">AgapayPulse Health Information System · 2026</p>
    </section>
  );
}