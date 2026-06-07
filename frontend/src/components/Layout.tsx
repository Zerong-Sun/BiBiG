import { NavLink, Outlet } from 'react-router-dom';
import { useAppStore } from '../hooks/useAppStore';

const navItems = [
  { to: '/', label: '首页', end: true },
  { to: '/record', label: '录音' },
  { to: '/archive', label: '档案' },
  { to: '/books', label: '我的作品' },
  { to: '/settings', label: '设置' },
];

export default function Layout() {
  const offlineMode = useAppStore((s) => s.offlineMode);

  return (
    <div className="page-bg min-h-screen flex flex-col">
      <header
        className="card border-b-0 rounded-none"
        style={{ borderRadius: 0, borderLeft: 'none', borderRight: 'none', borderTop: 'none' }}
      >
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-accent">BiBiG 人生传记</h1>
            <p className="text-muted text-sm">为长辈记录一生</p>
          </div>
          {offlineMode && (
            <span className="px-3 py-1 rounded-full text-sm border border-[var(--accent-tech)] text-accent shrink-0">
              纯离线
            </span>
          )}
        </div>
        <nav className="max-w-5xl mx-auto px-6 pb-3 flex flex-wrap gap-1">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) => `nav-link ${isActive ? 'nav-link-active' : ''}`}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
      </header>

      <main className="flex-1 max-w-5xl w-full mx-auto px-6 py-8">
        <Outlet />
      </main>
    </div>
  );
}
