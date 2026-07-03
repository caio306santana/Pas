'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiRequest } from '@/lib/api';
import { Lock, Mail, Shield, AlertCircle } from 'lucide-react';

export default function AdminLogin() {
  const router = useRouter();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setLoading(true);

    try {
      const data = await apiRequest('/auth/staff/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });

      // Save staff user data in localStorage
      localStorage.setItem('menino_staff_data', JSON.stringify(data));
      
      // Redirect to admin dashboard
      router.push('/admin/dashboard');
    } catch (err: any) {
      setErrorMsg(err.message || 'Falha ao autenticar. Verifique suas credenciais.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 text-slate-100 px-4">
      {/* Premium Dark Glassmorphism container */}
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-8 space-y-6 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary to-orange-500"></div>

        <div className="text-center space-y-2">
          <div className="h-12 w-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary mx-auto mb-2">
            <Shield className="h-6 w-6" />
          </div>
          <h1 className="text-2xl font-black tracking-tight">Painel do Trailer</h1>
          <p className="text-xs text-slate-400 font-semibold">Entre com sua conta administrativa ou operacional</p>
        </div>

        {errorMsg && (
          <div className="bg-red-950/30 text-red-400 border border-red-900/50 p-4 rounded-xl flex items-center gap-3 text-xs font-semibold animate-shake">
            <AlertCircle className="h-5 w-5 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-400">E-mail</label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-3.5 h-4.5 w-4.5 text-slate-500" />
              <input
                type="email"
                required
                placeholder="Ex: admin@menino.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-950 border border-slate-800 text-sm font-semibold placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-400">Senha</label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-3.5 h-4.5 w-4.5 text-slate-500" />
              <input
                type="password"
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-950 border border-slate-800 text-sm font-semibold placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-primary text-white font-extrabold py-3.5 rounded-xl shadow-lg shadow-primary/10 hover:scale-[1.01] transition-transform text-sm disabled:opacity-50"
          >
            {loading ? 'Entrando...' : 'Entrar no Painel'}
          </button>
        </form>

        <div className="text-center pt-2 text-[10px] text-slate-500 font-bold border-t border-slate-800/50">
          Trailer Menino Travesso • Sistema SaaS de Delivery Independente
        </div>

      </div>
    </div>
  );
}
