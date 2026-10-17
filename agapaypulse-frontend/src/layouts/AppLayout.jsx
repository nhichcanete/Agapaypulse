import React, { useState } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/useAuth';
import { useQuery } from '@tanstack/react-query';
import client from '../api/client';
import { 
  Activity, 
  Users, 
  Pill, 
  BarChart3, 
  ClipboardList,
  FileText,
  UserRoundSearch,
  LogOut, 
  Ticket, 
  QrCode, 
  Menu, 
  X,
  ChevronRight,
  ExternalLink,
  Settings,
  BadgeCheck,
} from 'lucide-react';

export default function AppLayout() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const pageNames = {
    '/app/dashboard': 'My Queue & Triage',
    '/app/medicines': 'Medicine availability',
    '/app/orders': 'Medicine claim passes',
    '/app/visits': 'Visit history',
    '/staff/console': 'Staff Desk Operations',
    '/directory': 'Resident Directory',
    '/pharmacy/claims': 'Medicine claim verification',
    '/pharmacy/queue': 'Express pharmacy pickup queue',
    '/pharmacy/inventory': 'Pharmacy inventory',
    '/admin/analytics': 'Analytics overview',
    '/admin/audit': 'Activity log',
    '/admin/priority-verifications': 'Priority ID review',
    '/admin/inventory': 'Medicine inventory',
    '/settings/profile': 'Profile & security',
  };
  const pageTitle = pageNames[location.pathname] || 'Health center workspace';
  const { data: userProfile } = useQuery({
    queryKey: ['current-user'],
    queryFn: async () => (await client.get('/me')).data,
    enabled: Boolean(user),
    staleTime: 5 * 60 * 1000,
    retry: false,
  });
  const displayUser = userProfile || user;

  // Role-specific navigation definitions
  const navigationByRole = {
    resident: [
      { name: 'My Queue & Triage', path: '/app/dashboard', icon: Ticket },
      { name: 'Reserve Medicine', path: '/app/medicines', icon: Pill },
      { name: 'Claim Codes', path: '/app/orders', icon: QrCode },
      { name: 'Visit History', path: '/app/visits', icon: FileText },
    ],
    staff: [
      { name: 'Triage & Call Desk', path: '/staff/console', icon: Users },
      { name: 'Resident Directory', path: '/directory', icon: UserRoundSearch },
      { name: 'Public Live Display', path: '/display', icon: Activity, external: true },
    ],
    pharmacist: [
      { name: 'Express Claim Verifier', path: '/pharmacy/claims', icon: QrCode },
      { name: 'Express Pickup Queue', path: '/pharmacy/queue', icon: Ticket },
      { name: 'Medicine Stock', path: '/pharmacy/inventory', icon: Pill },
      { name: 'Resident Directory', path: '/directory', icon: UserRoundSearch },
    ],
    admin: [
      { name: 'Analytics Overview', path: '/admin/analytics', icon: BarChart3 },
      { name: 'Activity Log', path: '/admin/audit', icon: ClipboardList },
      { name: 'Priority ID Review', path: '/admin/priority-verifications', icon: BadgeCheck },
      { name: 'Staff Call Console', path: '/staff/console', icon: Users },
      { name: 'Resident Directory', path: '/directory', icon: UserRoundSearch },
      { name: 'Pharmacy Claims', path: '/pharmacy/claims', icon: QrCode },
      { name: 'Pharmacy Pickup Queue', path: '/pharmacy/queue', icon: Ticket },
      { name: 'Pharmacy Inventory', path: '/admin/inventory', icon: Pill },
      { name: 'Live Queue Board', path: '/display', icon: Activity, external: true },
    ],
  };

  const navItems = [
    ...(navigationByRole[user?.role] || []),
    { name: 'Profile & Settings', path: '/settings/profile', icon: Settings },
  ];

  const handleSignOut = async () => {
    setMobileOpen(false);
    await logout();
    navigate('/login', { replace: true });
  };

  return (
    <div className="min-h-dvh flex flex-col bg-[radial-gradient(ellipse_at_top_left,_#e6f4ee_0%,_#f5f8f7_38%,_#f3f7f5_100%)] md:h-dvh md:min-h-0 md:overflow-hidden md:flex-row">
      {/* Desktop Navigation Sidebar */}
      <aside className="hidden w-[272px] shrink-0 flex-col justify-between border-r border-white/10 bg-[linear-gradient(165deg,#123f3d_0%,#0d302f_55%,#092726_100%)] text-white shadow-[12px_0_40px_rgba(13,48,47,0.08)] md:sticky md:top-0 md:flex md:h-dvh">
        <div>
          <div className="flex items-center gap-3 border-b border-white/10 px-6 py-6">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-teal-200/30 bg-gradient-to-br from-teal-300/20 to-emerald-300/5 shadow-inner">
              <Activity className="h-6 w-6 text-teal-200" />
            </div>
            <div>
              <h1 className="text-base font-extrabold leading-tight tracking-tight">AgapayPulse</h1>
              <span className="mt-1 block text-[10px] font-semibold uppercase tracking-[0.18em] text-teal-200/75">{user?.role} workspace</span>
            </div>
          </div>

          <p className="px-6 pb-2 pt-6 text-[10px] font-bold uppercase tracking-[0.18em] text-teal-100/45">Workspace menu</p>
          <nav aria-label="Main navigation" className="space-y-1 px-3 pb-5">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return item.external ? (
                <a
                  key={item.path}
                  href={item.path}
                  target="_blank"
                  rel="noreferrer"
                  className="flex min-h-12 items-center gap-3 rounded-xl px-3 text-sm font-semibold text-teal-100/80 transition hover:translate-x-0.5 hover:bg-white/[0.07] hover:text-white"
                >
                  <Icon className="h-4 w-4 text-teal-300" />
                  <span>{item.name}</span>
                </a>
              ) : (
                <Link
                  key={item.path}
                  to={item.path}
                  aria-current={isActive ? 'page' : undefined}
                  className={`flex min-h-12 items-center gap-3 rounded-xl px-3 text-sm font-semibold transition ${
                    isActive
                      ? 'bg-gradient-to-r from-teal-300/20 to-teal-300/5 text-white ring-1 ring-inset ring-teal-100/20 shadow-sm'
                      : 'text-teal-100/80 hover:translate-x-0.5 hover:bg-white/[0.07] hover:text-white'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="border-t border-white/10 bg-black/10 p-4">
          <div className="mb-3 flex items-center gap-3 px-1">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-teal-100 to-emerald-200 font-bold text-teal-950 ring-2 ring-white/10">{displayUser?.name?.trim()?.slice(0, 1)?.toUpperCase()}</div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-white">{displayUser?.name}</p>
              <p className="text-xs capitalize text-teal-200">{displayUser?.role}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleSignOut}
            className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-white/10 text-sm font-semibold text-teal-50/80 transition hover:border-rose-300/30 hover:bg-rose-900/40 hover:text-white"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Mobile Header Bar */}
      <header className="sticky top-0 z-50 flex min-h-16 items-center justify-between gap-3 border-b border-white/10 bg-[#103b39] px-4 py-2 text-white shadow-lg shadow-teal-950/10 md:hidden">
        <div className="flex min-w-0 items-center gap-2.5">
          <Activity className="h-6 w-6 shrink-0 text-teal-200" />
          <div className="min-w-0">
            <span className="block truncate text-sm font-bold">AgapayPulse</span>
            <span className="block truncate text-[11px] capitalize text-teal-100/80">{user?.role} workspace</span>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setMobileOpen((open) => !open)}
          aria-label={mobileOpen ? 'Close navigation menu' : 'Open navigation menu'}
          aria-expanded={mobileOpen}
          aria-controls="mobile-navigation"
          className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-white hover:bg-white/10"
        >
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </header>

      {mobileOpen && (
        <div className="fixed inset-0 top-16 z-40 bg-slate-950/35 md:hidden" onClick={() => setMobileOpen(false)}>
          <nav id="mobile-navigation" aria-label="Main navigation" onClick={(event) => event.stopPropagation()} className="max-h-[calc(100dvh-4rem)] overflow-y-auto border-b border-teal-800 bg-teal-950 p-4 text-white shadow-xl">
            <p className="mb-3 px-3 text-xs font-semibold uppercase text-teal-300">{user?.name}</p>
            <div className="space-y-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path;
                return item.external ? (
                  <a key={item.path} href={item.path} onClick={() => setMobileOpen(false)} className="flex min-h-11 items-center gap-3 rounded-lg px-3 text-sm font-medium text-teal-100 hover:bg-teal-900">
                    <Icon className="h-4 w-4 text-teal-300" />{item.name}
                  </a>
                ) : (
                  <Link key={item.path} to={item.path} onClick={() => setMobileOpen(false)} aria-current={isActive ? 'page' : undefined} className={`flex min-h-11 items-center gap-3 rounded-lg px-3 text-sm font-medium ${isActive ? 'bg-teal-700 text-white' : 'text-teal-100 hover:bg-teal-900'}`}>
                    <Icon className="h-4 w-4" />{item.name}
                  </Link>
                );
              })}
            </div>
            <button type="button" onClick={handleSignOut} className="mt-3 flex min-h-11 w-full items-center gap-3 rounded-lg px-3 text-left text-sm font-semibold text-rose-200 hover:bg-rose-950/50">
              <LogOut className="h-4 w-4" /> Sign out
            </button>
          </nav>
        </div>
      )}

      {/* Main Content Render View */}
      <main className="min-h-0 min-w-0 flex-1 md:h-dvh md:overflow-y-auto">
        <div className="sticky top-0 z-30 hidden items-center justify-between border-b border-slate-200/70 bg-white/75 px-8 py-3 backdrop-blur-xl md:flex">
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <span className="font-medium capitalize">{user?.role}</span>
            <ChevronRight className="h-4 w-4 text-slate-300" />
            <span className="font-bold text-slate-900">{pageTitle}</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-800"><span className="h-1.5 w-1.5 rounded-full bg-emerald-500 shadow-[0_0_0_3px_rgba(16,185,129,0.12)]" /> System ready</span>
          </div>
        </div>
        <div className="px-4 py-5 pb-8 sm:px-6 md:px-8 md:py-8">
          <div key={location.pathname} className="ap-page-enter">
            <Outlet />
          </div>
          <footer className="mx-auto mt-12 flex max-w-6xl flex-col items-center justify-between gap-2 border-t border-slate-200/80 py-5 text-xs text-slate-400 sm:flex-row">
            <span>AgapayPulse · Barangay health, connected.</span>
            <a href="/display" target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 font-medium text-slate-500 hover:text-teal-800">Open public display <ExternalLink className="h-3 w-3" /></a>
          </footer>
        </div>
      </main>
    </div>
  );
}