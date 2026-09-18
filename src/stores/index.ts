import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Profile, SyncStatus, Notification, DashboardKPIs } from '@/types';

// ==================== AUTH STORE ====================
interface AuthState {
  user: Profile | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isOwner: boolean;
  setUser: (user: Profile | null) => void;
  setLoading: (loading: boolean) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,
  isOwner: false,
  setUser: (user) =>
    set({
      user,
      isAuthenticated: !!user,
      isOwner: user?.role === 'OWNER',
      isLoading: false,
    }),
  setLoading: (isLoading) => set({ isLoading }),
  logout: () =>
    set({
      user: null,
      isAuthenticated: false,
      isOwner: false,
      isLoading: false,
    }),
}));

// ==================== SYNC STORE ====================
interface SyncState {
  status: SyncStatus;
  pendingCount: number;
  lastSyncAt: string | null;
  isOnline: boolean;
  setStatus: (status: SyncStatus) => void;
  setPendingCount: (count: number) => void;
  setLastSyncAt: (date: string) => void;
  setOnline: (online: boolean) => void;
}

export const useSyncStore = create<SyncState>()(
  persist(
    (set) => ({
      status: 'synced',
      pendingCount: 0,
      lastSyncAt: null,
      isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
      setStatus: (status) => set({ status }),
      setPendingCount: (pendingCount) => set({ pendingCount }),
      setLastSyncAt: (lastSyncAt) => set({ lastSyncAt }),
      setOnline: (isOnline) => set({ isOnline }),
    }),
    { name: 'ferme-sync-state' }
  )
);

// ==================== NOTIFICATIONS STORE ====================
interface NotificationState {
  notifications: Notification[];
  unreadCount: number;
  setNotifications: (notifications: Notification[]) => void;
  addNotification: (notification: Notification) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  setUnreadCount: (count: number) => void;
}

export const useNotificationStore = create<NotificationState>()((set) => ({
  notifications: [],
  unreadCount: 0,
  setNotifications: (notifications) =>
    set({
      notifications,
      unreadCount: notifications.filter((n) => n.status === 'unread').length,
    }),
  addNotification: (notification) =>
    set((state) => ({
      notifications: [notification, ...state.notifications],
      unreadCount: notification.status === 'unread' ? state.unreadCount + 1 : state.unreadCount,
    })),
  markAsRead: (id) =>
    set((state) => ({
      notifications: state.notifications.map((n) =>
        n.id === id ? { ...n, status: 'read' as const } : n
      ),
      unreadCount: Math.max(0, state.unreadCount - 1),
    })),
  markAllAsRead: () =>
    set((state) => ({
      notifications: state.notifications.map((n) => ({ ...n, status: 'read' as const })),
      unreadCount: 0,
    })),
  setUnreadCount: (unreadCount) => set({ unreadCount }),
}));

// ==================== UI STORE ====================
interface UIState {
  sidebarOpen: boolean;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  currentPage: string;
  setCurrentPage: (page: string) => void;
}

export const useUIStore = create<UIState>()((set) => ({
  sidebarOpen: false,
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  setSidebarOpen: (sidebarOpen) => set({ sidebarOpen }),
  currentPage: 'dashboard',
  setCurrentPage: (currentPage) => set({ currentPage }),
}));

// ==================== DASHBOARD STORE ====================
interface DashboardState {
  kpis: DashboardKPIs | null;
  isLoading: boolean;
  setKPIs: (kpis: DashboardKPIs) => void;
  setLoading: (loading: boolean) => void;
}

export const useDashboardStore = create<DashboardState>()((set) => ({
  kpis: null,
  isLoading: true,
  setKPIs: (kpis) => set({ kpis, isLoading: false }),
  setLoading: (isLoading) => set({ isLoading }),
}));
