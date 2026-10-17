function Footer() {
  return (
    <footer className="bg-slate-900 text-white mt-10 border-t-4 border-teal-500">
      <div className="max-w-6xl mx-auto px-6 py-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
      <div className="text-teal-300 font-semibold">
  AgapayPulse
</div>
          <p className="text-sm text-slate-400 text-center">
            Supporting SDG 3 (Good Health) &amp; SDG 10 (Reduced Inequalities)
          </p>
          <p className="text-xs text-slate-500">ReactJS · Laravel · MySQL</p>
        </div>
      </div>
    </footer>
  );
}

export default Footer;