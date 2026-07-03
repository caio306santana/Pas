'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { LayoutDashboard, ShoppingBag, ChefHat, LogOut, ShieldAlert } from 'lucide-react';

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

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  
  const [staff, setStaff] = useState<StaffUser | null>(null);
  const [loading, setLoading] = useState(true);

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
    { label: 'Fila de Pedidos', path: '/admin/orders', icon: ShoppingBag },
    { label: 'Monitor Cozinha', path: '/admin/kitchen', icon: ChefHat },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col md:flex-row">
      
      {/* Sidebar Navigation */}
      <aside className="w-full md:w-64 bg-slate-900 border-r border-slate-800 flex flex-col shrink-0">
        <div className="p-6 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center font-bold text-white">M</div>
            <span className="font-extrabold text-base tracking-tight">Painel Menino</span>
          </div>
          <span className="text-[9px] bg-primary/20 text-primary font-bold px-2 py-0.5 rounded border border-primary/20">SaaS</span>
        </div>

        {/* Staff bio */}
        <div className="p-4 border-b border-slate-800 bg-slate-950/20 text-xs flex items-center gap-3">
          <div className="h-8 w-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-extrabold uppercase">
            {staff?.user.name.charAt(0)}
          </div>
          <div className="flex-1 overflow-hidden">
            <p className="font-bold truncate">{staff?.user.name}</p>
            <p className="text-[10px] text-slate-500 font-bold uppercase">{staff?.user.role}</p>
          </div>
        </div>

        {/* Links list */}
        <nav className="flex-1 p-4 space-y-1">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.path;
            return (
              <button
                key={item.path}
                onClick={() => router.push(item.path)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold transition-all ${
                  isActive 
                    ? 'bg-primary text-white shadow-md shadow-primary/10' 
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                }`}
              >
                <Icon className="h-4.5 w-4.5" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Footer Logout */}
        <div className="p-4 border-t border-slate-800">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold text-red-400 hover:bg-red-950/10 hover:text-red-300 transition-all"
          >
            <LogOut className="h-4.5 w-4.5" />
            <span>Sair do Painel</span>
          </button>
        </div>
      </aside>

      {/* Main Panel Content Area */}
      <main className="flex-1 p-6 md:p-8 overflow-y-auto max-h-screen">
        {children}
      </main>

    </div>
  );
}
export type { StaffUser };
