'use client';

import React, { useEffect, useState } from 'react';
import AdminLayout from '@/components/AdminLayout';
import { apiRequest } from '@/lib/api';
import {
  TrendingUp, Users, ShoppingBag, DollarSign,
  ArrowUpRight, Award, Clock, ArrowDownRight, Printer
} from 'lucide-react';

interface Stats {
  activeCount: number;
  finalCount: number;
  cancelledCount: number;
  revenue: number;
  profit: number;
  expenses: number;
  ticketAverage: number;
  totalOrders: number;
  hourlyStats: { hour: string; pedidos: number }[];
  topProducts: { name: string; quantity: number; revenue: number }[];
  monthlyStats: { month: string; receita: number; pedidos: number }[];
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadStats() {
      try {
        const rawStaff = localStorage.getItem('menino_staff_data');
        if (rawStaff) {
          const staff = JSON.parse(rawStaff);
          const data = await apiRequest('/orders/dashboard/stats', {
            headers: { 'x-tenant-id': staff.user.tenant.id },
          });
          setStats(data);
        }
      } catch (err) {
        console.error('Error fetching dashboard stats:', err);
      } finally {
        setLoading(false);
      }
    }
    loadStats();
  }, []);

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex h-full w-full items-center justify-center min-h-[400px]">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
        </div>
      </AdminLayout>
    );
  }

  if (!stats) {
    return (
      <AdminLayout>
        <div className="text-center p-12 bg-slate-900 border border-slate-800 rounded-3xl">
          <p className="text-slate-400 font-bold">Nenhum dado financeiro encontrado. Faça alguns pedidos teste para gerar métricas!</p>
        </div>
      </AdminLayout>
    );
  }

  // Find max value in charts to scale bars correctly
  const maxHourlyPedidos = Math.max(...stats.hourlyStats.map(h => h.pedidos), 1);
  const maxMonthlyReceita = Math.max(...stats.monthlyStats.map(m => m.receita), 1);

  return (
    <AdminLayout>
      <div className="space-y-8 animate-fade-in">

        {/* Header Title */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-black tracking-tight text-white">Dashboard Analítico</h1>
            <p className="text-xs text-slate-400 font-semibold mt-0.5">Visão geral financeira e operacional do trailer</p>
          </div>
          <button
            onClick={() => window.print()}
            className="bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-300 font-bold py-2.5 px-4 rounded-xl text-xs flex items-center gap-2 transition-all no-print"
          >
            <Printer className="h-4 w-4" /> Exportar PDF
          </button>
        </div>

        {/* 1. Cards grid metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {/* Revenue */}
          <div className="bg-slate-900 border border-slate-800/80 rounded-2xl p-5 space-y-4 shadow-sm relative overflow-hidden group hover:border-primary/20 transition-all duration-300">
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Receita Total</span>
              <div className="h-9 w-9 rounded-lg bg-green-500/10 border border-green-500/20 text-green-400 flex items-center justify-center">
                <DollarSign className="h-5 w-5" />
              </div>
            </div>
            <div className="space-y-1">
              <h3 className="text-2xl font-black text-white">R$ {stats.revenue.toFixed(2)}</h3>
              <p className="text-[10px] text-green-400 font-bold flex items-center gap-1">
                <ArrowUpRight className="h-3.5 w-3.5" /> +12.5% vs. mês anterior
              </p>
            </div>
          </div>

          {/* Profit */}
          <div className="bg-slate-900 border border-slate-800/80 rounded-2xl p-5 space-y-4 shadow-sm relative overflow-hidden group hover:border-primary/20 transition-all duration-300">
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Lucro Líquido (65%)</span>
              <div className="h-9 w-9 rounded-lg bg-primary/10 border border-primary/20 text-primary flex items-center justify-center">
                <TrendingUp className="h-5 w-5" />
              </div>
            </div>
            <div className="space-y-1">
              <h3 className="text-2xl font-black text-white">R$ {stats.profit.toFixed(2)}</h3>
              <p className="text-[10px] text-primary font-bold flex items-center gap-1">
                <ArrowUpRight className="h-3.5 w-3.5" /> Margem comercial excelente
              </p>
            </div>
          </div>

          {/* Pedidos */}
          <div className="bg-slate-900 border border-slate-800/80 rounded-2xl p-5 space-y-4 shadow-sm relative overflow-hidden group hover:border-primary/20 transition-all duration-300">
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Pedidos Finalizados</span>
              <div className="h-9 w-9 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center">
                <ShoppingBag className="h-5 w-5" />
              </div>
            </div>
            <div className="space-y-1">
              <h3 className="text-2xl font-black text-white">{stats.totalOrders}</h3>
              <p className="text-[10px] text-slate-500 font-bold">Total acumulado na plataforma</p>
            </div>
          </div>

          {/* Ticket Médio */}
          <div className="bg-slate-900 border border-slate-800/80 rounded-2xl p-5 space-y-4 shadow-sm relative overflow-hidden group hover:border-primary/20 transition-all duration-300">
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Ticket Médio</span>
              <div className="h-9 w-9 rounded-lg bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center">
                <Award className="h-5 w-5" />
              </div>
            </div>
            <div className="space-y-1">
              <h3 className="text-2xl font-black text-white">R$ {stats.ticketAverage.toFixed(2)}</h3>
              <p className="text-[10px] text-purple-400 font-bold flex items-center gap-1">
                Gasto médio por cliente
              </p>
            </div>
          </div>
        </div>

        {/* 2. Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* Custom CSS Bar Chart: Peak Hours */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
            <div>
              <h3 className="font-extrabold text-sm text-white uppercase tracking-wider">Pedidos por Horário</h3>
              <p className="text-[10px] text-slate-500 font-semibold mt-0.5">Distribuição das vendas por horário do dia</p>
            </div>

            {/* Custom Bar Graphs */}
            <div className="h-48 flex items-end gap-3 pt-6 border-b border-slate-800">
              {stats.hourlyStats.map((h, i) => {
                const heightPercent = (h.pedidos / maxHourlyPedidos) * 100;
                return (
                  <div key={i} className="flex-1 flex flex-col items-center gap-2 group h-full justify-end">
                    <span className="text-[9px] font-extrabold text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                      {h.pedidos}
                    </span>
                    <div
                      style={{ height: `${Math.max(5, heightPercent)}%` }}
                      className="w-full bg-primary/25 group-hover:bg-primary rounded-t-md transition-all duration-300 relative"
                    >
                      {/* Glow effect on hover */}
                      <div className="absolute inset-0 bg-primary opacity-0 group-hover:opacity-20 blur-[2px] rounded-t-md"></div>
                    </div>
                    <span className="text-[9px] text-slate-500 font-bold pb-2 shrink-0">{h.hour}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Monthly Comparison */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
            <div>
              <h3 className="font-extrabold text-sm text-white uppercase tracking-wider">Evolução Mensal (Faturamento)</h3>
              <p className="text-[10px] text-slate-500 font-semibold mt-0.5">Comparativo do faturamento nos últimos 3 meses</p>
            </div>

            <div className="space-y-4 pt-4">
              {stats.monthlyStats.map((m, i) => {
                const widthPercent = (m.receita / maxMonthlyReceita) * 100;
                return (
                  <div key={i} className="space-y-1.5">
                    <div className="flex justify-between text-xs font-bold">
                      <span className="text-slate-300">{m.month}</span>
                      <span className="text-white">R$ {m.receita.toFixed(2)} ({m.pedidos} ped.)</span>
                    </div>
                    <div className="h-3 w-full bg-slate-950 rounded-full overflow-hidden border border-slate-800">
                      <div
                        style={{ width: `${widthPercent}%` }}
                        className="h-full bg-gradient-to-r from-primary to-orange-500 rounded-full"
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

        </div>

        {/* 3. Bottom Grid: Top Products and Queue info */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Top Products */}
          <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
            <div>
              <h3 className="font-extrabold text-sm text-white uppercase tracking-wider">Produtos Mais Vendidos</h3>
              <p className="text-[10px] text-slate-500 font-semibold mt-0.5">Top 5 itens com maior saída no cardápio</p>
            </div>

            <div className="divide-y divide-slate-800">
              {stats.topProducts.map((prod, idx) => (
                <div key={idx} className="flex justify-between items-center py-3.5">
                  <div className="flex items-center gap-3">
                    <span className="h-6 w-6 rounded bg-primary/10 border border-primary/20 text-primary flex items-center justify-center text-xs font-black">
                      {idx + 1}
                    </span>
                    <span className="text-xs font-bold text-slate-200">{prod.name}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-black text-white">{prod.quantity} vendas</span>
                    <span className="text-[10px] text-slate-500 block font-bold">R$ {prod.revenue.toFixed(2)}</span>
                  </div>
                </div>
              ))}
              {stats.topProducts.length === 0 && (
                <p className="text-xs text-slate-500 text-center py-6 font-bold">Nenhum produto vendido ainda.</p>
              )}
            </div>
          </div>

          {/* Operational summary */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
            <div>
              <h3 className="font-extrabold text-sm text-white uppercase tracking-wider">Fila Operacional</h3>
              <p className="text-[10px] text-slate-500 font-semibold mt-0.5">Pedidos ativos e cancelados</p>
            </div>

            <div className="grid grid-cols-2 gap-4 pt-2">
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 text-center space-y-1">
                <span className="text-xs font-bold text-slate-500 uppercase">Ativos</span>
                <p className="text-2xl font-black text-primary">{stats.activeCount}</p>
              </div>
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 text-center space-y-1">
                <span className="text-xs font-bold text-slate-500 uppercase">Recusados</span>
                <p className="text-2xl font-black text-red-500">{stats.cancelledCount}</p>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-xs font-semibold text-slate-400 space-y-2">
              <p className="flex items-center gap-2">
                <Clock className="h-4.5 w-4.5 text-primary" /> Tempo Médio de Entrega: <strong className="text-white">35 min</strong>
              </p>
              <p className="flex items-center gap-2">
                <Users className="h-4.5 w-4.5 text-primary" /> Taxa de Cancelamento: <strong className="text-white">
                  {stats.totalOrders > 0 ? ((stats.cancelledCount / stats.totalOrders) * 100).toFixed(1) : 0}%
                </strong>
              </p>
            </div>
          </div>

        </div>

      </div>
    </AdminLayout>
  );
}
