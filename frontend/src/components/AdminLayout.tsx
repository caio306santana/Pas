'use client';

/* eslint-disable @next/next/no-img-element -- tenant logos may use dynamic URLs */

import React, { useEffect, useState, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { LayoutDashboard, ShoppingBag, ChefHat, LogOut, UtensilsCrossed, Bell, BellRing } from 'lucide-react';
import { API_BASE } from '@/lib/api';
import { useSocketStore } from '@/store/socketStore';

interface StaffUser {
  token: string;
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
    tenant: {
      id: string;
      name: string;
      slug: string;
    };
  };
}

interface ToastNotif {
  id: string;
  orderNumber: number;
  customerName: string;
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  
  const [staff, setStaff] = useState<StaffUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [newOrderCount, setNewOrderCount] = useState(0);
  const [toasts, setToasts] = useState<ToastNotif[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const { connect, socket, joinAdminRoom } = useSocketStore();

  useEffect(() => {
    const raw = localStorage.getItem('menino_staff_data');
    if (!raw) {
      router.push('/admin/login');
      return;
    }
    try {
      setStaff(JSON.parse(raw));
    } catch {
      router.push('/admin/login');
    } finally {
      setLoading(false);
    }
  }, [router]);

  // Connect to Socket.IO for real-time new order notifications
  useEffect(() => {
    if (!staff) return;
    connect(API_BASE);
  }, [staff, connect]);

  useEffect(() => {
    if (!socket || !staff) return;
    joinAdminRoom(staff.user.tenant.id);

    const handler = (data: any) => {
      const order = data.order || data;
      setNewOrderCount((n) => n + 1);

      const toast: ToastNotif = {
        id: Date.now().toString(),
        orderNumber: order.orderNumber,
        customerName: order.customer?.name || 'Cliente',
      };
      setToasts((prev) => [...prev, toast]);
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== toast.id));
      }, 6000);

      // Play beep sound
      try {
        const ctx = new AudioContext();
        const oscillator = ctx.createOscillator();
        const gain = ctx.createGain();
        oscillator.connect(gain);
        gain.connect(ctx.destination);
        oscillator.frequency.value = 880;
        gain.gain.setValueAtTime(0.3, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
        oscillator.start(ctx.currentTime);
        oscillator.stop(ctx.currentTime + 0.4);
      } catch {}
    };

    socket.on('newOrder', handler);
    return () => { socket.off('newOrder', handler); };
  }, [socket, staff, joinAdminRoom]);

  // Clear badge when on orders page
  useEffect(() => {
    if (pathname === '/admin/orders' || pathname === '/admin/kitchen') {
      setNewOrderCount(0);
    }
  }, [pathname]);

  const handleLogout = () => {
    localStorage.removeItem('menino_staff_data');
    router.push('/admin/login');
  };

  if (loading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-slate-950 text-slate-100">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
      </div>
    );
  }

  const menuItems = [
    { label: 'Dashboard', path: '/admin/dashboard', icon: LayoutDashboard },
    { label: 'Pedidos', path: '/admin/orders', icon: ShoppingBag, badge: newOrderCount },
    { label: 'Cozinha', path: '/admin/kitchen', icon: ChefHat, badge: newOrderCount },
    { label: 'Produtos', path: '/admin/products', icon: UtensilsCrossed },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      
      {/* Toast Notifications */}
      <div className="fixed top-4 right-4 z-50 space-y-2 pointer-events-none">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className="bg-primary text-white px-4 py-3 rounded-2xl shadow-2xl flex items-center gap-3 animate-fade-in pointer-events-auto min-w-[260px]"
          >
            <BellRing className="h-5 w-5 shrink-0 animate-bounce" />
            <div>
              <p className="font-extrabold text-sm">🆕 Novo Pedido #{toast.orderNumber}</p>
              <p className="text-xs opacity-90">{toast.customerName}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Top header bar */}
      <header className="bg-slate-900 border-b border-slate-800 px-4 py-3 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <img src="/logo.png" alt="Logo" className="h-9 w-9 rounded-xl object-cover" />
          <div>
            <p className="font-extrabold text-sm tracking-tight leading-tight">Painel Menino Travesso</p>
            <p className="text-[10px] text-slate-500 font-semibold uppercase">{staff?.user.role} · {staff?.user.name}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {newOrderCount > 0 && (
            <div className="relative">
              <BellRing className="h-5 w-5 text-primary animate-bounce" />
              <span className="absolute -top-1 -right-1 h-4 w-4 bg-primary text-white rounded-full text-[9px] flex items-center justify-center font-black">
                {newOrderCount > 9 ? '9+' : newOrderCount}
              </span>
            </div>
          )}
          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 text-xs font-bold text-slate-400 hover:text-red-400 transition-colors px-3 py-1.5 rounded-lg hover:bg-red-950/20"
          >
            <LogOut className="h-4 w-4" />
            Sair
          </button>
        </div>
      </header>

      {/* Content area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar (hidden on mobile, visible on md+) */}
        <aside className="hidden md:flex w-52 bg-slate-900 border-r border-slate-800 flex-col shrink-0">
          <nav className="flex-1 p-3 space-y-1 pt-4">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.path || pathname.startsWith(item.path + '/');
              return (
                <button
                  key={item.path}
                  onClick={() => router.push(item.path)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all relative ${
                    isActive 
                      ? 'bg-primary text-white shadow-md shadow-primary/20' 
                      : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                  }`}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span>{item.label}</span>
                  {item.badge && item.badge > 0 && !isActive && (
                    <span className="ml-auto h-5 w-5 bg-red-500 text-white rounded-full text-[9px] flex items-center justify-center font-black">
                      {item.badge > 9 ? '9+' : item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </aside>

        {/* Main content */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          {children}
        </main>
      </div>

      {/* Bottom tab bar (mobile only) */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-slate-900 border-t border-slate-800 flex z-40">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.path || pathname.startsWith(item.path + '/');
          return (
            <button
              key={item.path}
              onClick={() => router.push(item.path)}
              className={`flex-1 flex flex-col items-center gap-1 py-3 text-[10px] font-bold transition-colors relative ${
                isActive ? 'text-primary' : 'text-slate-500'
              }`}
            >
              <Icon className="h-5 w-5" />
              <span>{item.label}</span>
              {item.badge && item.badge > 0 && !isActive && (
                <span className="absolute top-1.5 right-1/4 h-4 w-4 bg-red-500 text-white rounded-full text-[8px] flex items-center justify-center font-black">
                  {item.badge > 9 ? '9+' : item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

    </div>
  );
}
export type { StaffUser };
