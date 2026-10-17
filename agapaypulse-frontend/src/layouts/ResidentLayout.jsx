import React from 'react';
import { Outlet, Link } from 'react-router-dom';
import { useAuth } from '../context/useAuth';
import { Activity, Pill, LogOut } from 'lucide-react';

export default function ResidentLayout() {
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <header className="bg-teal-700 text-white shadow-md">
        <div className="max-w-6xl mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <Activity className="h-7 w-7 text-teal-200" />
            <div>
              <h1 className="text-xl font-bold leading-none">AgapayPulse</h1>
              <p className="text-xs text-teal-100">Barangay Health Center Resident Portal</p>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <span className="text-sm font-medium">{user?.name}</span>
            <button type="button" onClick={logout} className="inline-flex h-11 w-11 items-center justify-center rounded-lg transition hover:bg-teal-600" aria-label="Sign out" title="Sign Out">
              <LogOut className="h-5 w-5" />
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-6xl w-full mx-auto p-6">
        <Outlet />
      </main>

      <nav className="bg-white border-t border-slate-200 sticky bottom-0 md:hidden">
        <div className="flex justify-around p-3">
          <Link to="/app/dashboard" className="flex flex-col items-center text-xs font-medium text-slate-600">
            <Activity className="h-5 w-5" />
            <span>Dashboard</span>
          </Link>
          <Link to="/app/med-reserve" className="flex flex-col items-center text-xs font-medium text-slate-600">
            <Pill className="h-5 w-5" />
            <span>Reserve Meds</span>
          </Link>
        </div>
      </nav>
    </div>
  );
}