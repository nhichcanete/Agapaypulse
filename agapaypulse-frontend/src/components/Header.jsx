function Header() {
  return (
    <header className="bg-teal-700 text-white shadow-md relative overflow-hidden">
      {/* Subtle medical heartbeat line */}
      <svg
        className="absolute bottom-0 left-0 w-full h-8 opacity-10"
        viewBox="0 0 1200 100"
        preserveAspectRatio="none"
      >
        <path
          d="M0,50 L200,50 L220,20 L240,80 L260,50 L400,50 L420,30 L440,70 L460,50 L1200,50"
          stroke="white"
          strokeWidth="2"
          fill="none"
        />
      </svg>

      <div className="relative max-w-6xl mx-auto px-6 py-8">
        <div className="flex items-center justify-center gap-3">
          <div className="bg-white/15 rounded-xl p-2.5">
            <svg className="w-7 h-7 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M19 8h-2V6a3 3 0 0 0-3-3h-4a3 3 0 0 0-3 3v2H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-9a2 2 0 0 0-2-2zm-9-2a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2h-6V6zm9 13H5v-9h14v9z" />
              <path d="M11 11h2v3h3v2h-3v3h-2v-3H8v-2h3v-3z" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold tracking-tight">AgapayPulse</h1>
        </div>

        <p className="mt-3 text-center text-teal-50 text-sm tracking-wide">
          Smart Triage &amp; Express Medicine Reservation
        </p>

        <div className="mt-3 flex items-center justify-center gap-4 text-xs text-teal-100">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-300 animate-pulse"></span>
            Live System
          </span>
          <span>·</span>
          <span>Barangay Health Center</span>
        </div>
      </div>
    </header>
  );
}

export default Header;