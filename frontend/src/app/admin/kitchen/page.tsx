'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import AdminLayout from '@/components/AdminLayout';
import { API_BASE, apiRequest } from '@/lib/api';
import { useSocketStore } from '@/store/socketStore';
import { CheckCircle2, ChefHat, Clock, Flame, Printer, RefreshCw } from 'lucide-react';

type OrderStatus = 'RECEIVED' | 'CONFIRMED' | 'PREPARING' | 'READY' | 'DISPATCHED' | 'DELIVERED' | 'COMPLETED' | 'CANCELLED';

interface OrderItem {
  id: string;
  quantity: number;
  options: unknown;
  product?: { name: string };
}

interface Order {
  id: string;
  orderNumber: number;
  status: OrderStatus;
  createdAt: string;
  notes?: string;
  customer?: { name: string };
  items: OrderItem[];
}

const kitchenStatuses: OrderStatus[] = ['RECEIVED', 'CONFIRMED', 'PREPARING'];

function parseOptions(options: unknown): { optionName?: string; groupName?: string }[] {
  if (Array.isArray(options)) return options as { optionName?: string; groupName?: string }[];
  return [];
}

export default function KitchenPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const { connect, disconnect, socket, joinKitchenRoom } = useSocketStore();

  const tenantId = useMemo(() => {
    if (typeof window === 'undefined') return '';
    const raw = localStorage.getItem('menino_staff_data');
    if (!raw) return '';
    try {
      return JSON.parse(raw).user.tenant.id as string;
    } catch {
      return '';
    }
  }, []);

  const loadOrders = useCallback(async () => {
    if (!tenantId) return;
    setLoading(true);
    try {
      const data = await apiRequest('/orders/active', {
        headers: { 'x-tenant-id': tenantId },
      });
      setOrders(data.filter((order: Order) => kitchenStatuses.includes(order.status)));
    } finally {
      setLoading(false);
    }
  }, [tenantId]);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  useEffect(() => {
    if (!tenantId) return;
    connect(API_BASE);
    return () => disconnect();
  }, [tenantId, connect, disconnect]);

  useEffect(() => {
    if (!socket || !tenantId) return;
    joinKitchenRoom(tenantId);

    const upsertOrder = (order: Order) => {
      setOrders((current) => {
        const without = current.filter((item) => item.id !== order.id);
        if (!kitchenStatuses.includes(order.status)) return without;
        return [order, ...without].sort((a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt));
      });
    };

    socket.on('newOrder', upsertOrder);
    socket.on('orderStatusUpdated', (data: { order: Order }) => upsertOrder(data.order));

    return () => {
      socket.off('newOrder', upsertOrder);
      socket.off('orderStatusUpdated');
    };
  }, [socket, tenantId, joinKitchenRoom]);

  const updateStatus = async (orderId: string, status: OrderStatus) => {
    setUpdatingId(orderId);
    try {
      const updated = await apiRequest(`/orders/${orderId}/status`, {
        method: 'PUT',
        body: JSON.stringify({ status }),
      });
      setOrders((current) => {
        const without = current.filter((order) => order.id !== orderId);
        return kitchenStatuses.includes(updated.status) ? [updated, ...without] : without;
      });
    } finally {
      setUpdatingId(null);
    }
  };

  const nextKitchenStatus = (status: OrderStatus): OrderStatus => {
    if (status === 'RECEIVED') return 'CONFIRMED';
    if (status === 'CONFIRMED') return 'PREPARING';
    return 'READY';
  };

  const printComanda = (order: Order) => {
    const win = window.open('', '_blank', 'width=400,height=600');
    if (!win) return;
    const time = new Date(order.createdAt).toLocaleString('pt-BR');
    const itemsHtml = order.items.map((item) => {
      const opts = Array.isArray(item.options) ? item.options : [];
      const optsHtml = opts.length > 0
        ? `<ul style="margin:4px 0 0 12px;padding:0;font-size:11px;color:#555">${opts.map((o: any) => `<li>${o.optionName || ''}</li>`).join('')}</ul>`
        : '';
      return `<div style="margin-bottom:8px;border-bottom:1px dashed #ccc;padding-bottom:8px">
        <strong style="font-size:15px">${item.quantity}x ${item.product?.name || 'Produto'}</strong>${optsHtml}
      </div>`;
    }).join('');

    win.document.write(`
      <!DOCTYPE html><html><head><title>Comanda #${order.orderNumber}</title>
      <style>
        body { font-family: monospace; padding: 16px; max-width: 320px; margin: 0 auto; }
        h1 { font-size: 28px; text-align: center; margin: 0 0 4px; }
        .sub { text-align: center; font-size: 12px; color: #666; margin-bottom: 12px; }
        .sep { border-top: 2px dashed #000; margin: 12px 0; }
        .label { font-size: 10px; text-transform: uppercase; color: #999; }
        .obs { background: #fffbeb; border: 1px solid #f59e0b; padding: 8px; border-radius: 6px; font-size: 12px; margin-top: 8px; }
        @media print { button { display: none; } }
      </style></head><body>
      <div class="sub">Menino Travesso · Pastel e Churros</div>
      <h1>Pedido #${order.orderNumber}</h1>
      <div class="sep"></div>
      <div class="label">Cliente</div>
      <p style="margin:2px 0 8px;font-size:14px;font-weight:bold">${order.customer?.name || '—'}</p>
      <div class="label">Horário</div>
      <p style="margin:2px 0 8px;font-size:12px">${time}</p>
      <div class="sep"></div>
      <div class="label">Itens</div>
      <div style="margin-top:8px">${itemsHtml}</div>
      ${order.notes ? `<div class="obs">⚠️ Obs: ${order.notes}</div>` : ''}
      <div class="sep"></div>
      <p style="text-align:center;font-size:11px;color:#999">Bom trabalho! 🍳</p>
      <script>window.onload = () => window.print();<\/script>
      </body></html>
    `);
    win.document.close();
  };

  return (
    <AdminLayout>
      <div className="space-y-6 animate-fade-in">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-black tracking-tight text-white">Monitor Cozinha</h1>
            <p className="text-xs text-slate-400 font-semibold mt-0.5">Tela focada para preparo, com itens e adicionais por pedido.</p>
          </div>
          <button onClick={loadOrders} className="rounded-xl border border-slate-800 bg-slate-900 px-4 py-2.5 text-xs font-bold text-slate-300 hover:bg-slate-800">
            <RefreshCw className="mr-2 inline h-4 w-4" /> Atualizar
          </button>
        </div>

        {loading ? (
          <div className="flex min-h-[320px] items-center justify-center">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          </div>
        ) : orders.length === 0 ? (
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-10 text-center">
            <ChefHat className="mx-auto mb-3 h-10 w-10 text-slate-600" />
            <p className="text-sm font-bold text-slate-300">Cozinha sem pedidos pendentes.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 2xl:grid-cols-3">
            {orders.map((order) => {
              const next = nextKitchenStatus(order.status);

              return (
                <article key={order.id} className="rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow-sm">
                  <div className="mb-4 flex items-start justify-between gap-3">
                    <div>
                      <h2 className="text-xl font-black text-white">#{order.orderNumber}</h2>
                      <p className="text-xs font-bold text-slate-500">{order.customer?.name || 'Cliente'}</p>
                    </div>
                    <div className="rounded-xl border border-primary/20 bg-primary/10 px-3 py-2 text-right">
                      <p className="text-[10px] font-black uppercase text-primary">{order.status === 'PREPARING' ? 'Preparando' : 'Novo'}</p>
                      <p className="text-xs font-bold text-slate-300">
                        <Clock className="mr-1 inline h-3.5 w-3.5" />
                        {new Date(order.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    {order.items.map((item) => {
                      const options = parseOptions(item.options);
                      return (
                        <div key={item.id} className="rounded-xl border border-slate-800 bg-slate-950 p-4">
                          <p className="text-base font-black text-white">{item.quantity}x {item.product?.name || 'Produto'}</p>
                          {options.length > 0 && (
                            <div className="mt-2 flex flex-wrap gap-1.5">
                              {options.map((option, index) => (
                                <span key={index} className="rounded-md bg-slate-800 px-2 py-1 text-[10px] font-bold text-slate-300">
                                  {option.optionName}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {order.notes && (
                    <p className="mt-4 rounded-xl border border-amber-500/20 bg-amber-500/10 p-3 text-xs font-bold text-amber-200">
                      <Flame className="mr-2 inline h-4 w-4" /> {order.notes}
                    </p>
                  )}

                  <div className="mt-4 flex gap-2">
                    <button
                      onClick={() => printComanda(order)}
                      className="flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800 px-3 py-3 text-xs font-bold text-slate-300 hover:bg-slate-700"
                      title="Imprimir comanda"
                    >
                      <Printer className="h-4 w-4" />
                      Imprimir
                    </button>
                    <button
                      disabled={updatingId === order.id}
                      onClick={() => updateStatus(order.id, next)}
                      className="flex-1 rounded-xl bg-primary px-4 py-3 text-xs font-black text-white shadow-lg shadow-primary/10 hover:brightness-110 disabled:opacity-60"
                    >
                      <CheckCircle2 className="mr-2 inline h-4 w-4" />
                      {updatingId === order.id ? 'Atualizando...' : next === 'READY' ? '✅ Marcar Pronto' : '⏩ Avançar Etapa'}
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
