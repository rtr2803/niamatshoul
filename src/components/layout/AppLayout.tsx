import { useState, useEffect, ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, Bird, Home, Egg, Package, DollarSign,
  ShoppingCart, FileText, Bell, Settings, Menu, X, ChevronLeft,
  Thermometer, LogOut, User, Wifi, WifiOff, AlertTriangle,
  ChevronDown
} from 'lucide-react';
import { useAuthStore, useSyncStore, useNotificationStore, useUIStore } from '@/stores';
import { useAuth } from '@/hooks/useAuth';
import { APP_NAME } from '@/lib/constants';

const NAV_ITEMS = [
  { path: '/', icon: LayoutDashboard, label: 'Tableau de bord' },
  { path: '/daily', icon: Egg, label: 'Saisie journalière' },
  { path: '/animals', icon: Bird, label: 'Animaux' },
  { path: '/houses', icon: Home, label: 'Poulaillers' },
  { path: '/incubation', icon: Thermometer, label: 'Incubation' },
  { path: '/production', icon: Egg, label: 'Production' },
  { path: '/inventory', icon: Package, label: 'Inventaire' },
  { path: '/finance', icon: DollarSign, label: 'Finances' },
  { path: '/sales', icon: ShoppingCart, label: 'Ventes' },
  { path: '/reports', icon: FileText, label: 'Rapports' },
  { path: '/alerts', icon: Bell, label: 'Alertes' },
  { path: '/settings', icon: Settings, label: 'Paramètres' },
];

const BOTTOM_NAV_ITEMS = [
  { path: '/', icon: LayoutDashboard, label: 'Accueil' },
  { path: '/daily', icon: Egg, label: 'Journée' },
  { path: '/animals', icon: Bird, label: 'Animaux' },
  { path: '/finance', icon: DollarSign, label: 'Finances' },
  { path: '/alerts', icon: Bell, label: 'Alertes' },
];

interface AppLayoutProps {
  children: ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const location = useLocation();
  const { signOut } = useAuth();
  const { user, isOwner } = useAuthStore();
  const { status: syncStatus, isOnline } = useSyncStore();
  const { unreadCount } = useNotificationStore();
  const { sidebarOpen, setSidebarOpen } = useUIStore();

  // Close sidebar on route change (mobile)
  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname, setSidebarOpen]);

  const getSyncIndicator = () => {
    if (!isOnline) return { class: 'sync-offline', icon: WifiOff, text: 'HORS LIGNE' };
    if (syncStatus === 'error') return { class: 'sync-error', icon: AlertTriangle, text: 'ERREUR SYNC' };
    if (syncStatus === 'syncing') return { class: 'sync-synced', icon: Wifi, text: 'SYNCHRONISATION...' };
    return { class: 'sync-synced', icon: Wifi, text: 'SYNCHRONISÉ' };
  };

  const sync = getSyncIndicator();

  return (
    <div className="min-h-screen bg-surface-secondary flex">
      {/* Sidebar overlay (mobile) */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 z-50 h-full w-64 bg-surface border-r border-border transform transition-transform duration-200 ease-in-out lg:translate-x-0 lg:static lg:z-auto ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Logo */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-border">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary-600 flex items-center justify-center">
              <Bird className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-sm font-bold text-text-primary leading-none">{APP_NAME}</h1>
              <p className="text-[10px] text-text-muted">Gestion Avicole</p>
            </div>
          </Link>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden p-1 rounded-md hover:bg-surface-tertiary"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
          {NAV_ITEMS.map((item) => {
            const isActive = location.pathname === item.path ||
              (item.path !== '/' && location.pathname.startsWith(item.path));
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-primary-50 text-primary-700 border-l-3 border-primary-600'
                    : 'text-text-secondary hover:bg-surface-tertiary hover:text-text-primary'
                }`}
              >
                <item.icon className={`w-5 h-5 ${isActive ? 'text-primary-600' : ''}`} />
                {item.label}
                {item.path === '/alerts' && unreadCount > 0 && (
                  <span className="ml-auto bg-danger-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
                    {unreadCount}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* User section */}
        <div className="border-t border-border p-3 space-y-2">
          <div className={sync.class}>
            <sync.icon className="w-3 h-3" />
            {sync.text}
          </div>
          <div className="flex items-center gap-3 px-3 py-2">
            <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center">
              <User className="w-4 h-4 text-primary-700" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-text-primary truncate">
                {user?.full_name || user?.email}
              </p>
              <p className="text-xs text-text-muted">
                {isOwner ? 'Propriétaire' : 'Partenaire'}
              </p>
            </div>
            <button
              onClick={signOut}
              className="p-1.5 rounded-md hover:bg-surface-tertiary text-text-muted hover:text-danger-600"
              title="Déconnexion"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="h-16 bg-surface border-b border-border flex items-center justify-between px-4 lg:px-6 sticky top-0 z-30">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 rounded-md hover:bg-surface-tertiary"
            >
              <Menu className="w-5 h-5" />
            </button>
            <h2 className="text-lg font-semibold text-text-primary hidden sm:block">
              {NAV_ITEMS.find(
                (item) =>
                  item.path === location.pathname ||
                  (item.path !== '/' && location.pathname.startsWith(item.path))
              )?.label || 'Tableau de bord'}
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <div className={`${sync.class} hidden sm:flex`}>
              <sync.icon className="w-3 h-3" />
              <span className="hidden md:inline">{sync.text}</span>
            </div>
            <Link
              to="/alerts"
              className="relative p-2 rounded-md hover:bg-surface-tertiary text-text-secondary"
            >
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 bg-danger-500 text-white text-[10px] font-bold px-1 py-0.5 rounded-full min-w-[16px] text-center">
                  {unreadCount}
                </span>
              )}
            </Link>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 p-4 lg:p-6 pb-20 lg:pb-6 overflow-y-auto">
          {children}
        </main>
      </div>

      {/* Bottom navigation (mobile) */}
      <nav className="fixed bottom-0 left-0 right-0 bg-surface border-t border-border flex items-center justify-around h-16 z-30 lg:hidden safe-area-pb">
        {BOTTOM_NAV_ITEMS.map((item) => {
          const isActive = location.pathname === item.path ||
            (item.path !== '/' && location.pathname.startsWith(item.path));
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex flex-col items-center justify-center gap-0.5 px-3 py-1 rounded-lg min-w-[60px] transition-colors ${
                isActive
                  ? 'text-primary-600'
                  : 'text-text-muted hover:text-text-secondary'
              }`}
            >
              <item.icon className="w-5 h-5" />
              <span className="text-[10px] font-medium">{item.label}</span>
              {item.path === '/alerts' && unreadCount > 0 && (
                <span className="absolute -top-0.5 right-0.5 bg-danger-500 text-white text-[8px] font-bold px-1 rounded-full min-w-[14px] text-center">
                  {unreadCount}
                </span>
              )}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
