'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import AdminLayout from '@/components/AdminLayout';
import { API_BASE, apiRequest } from '@/lib/api';
import { useSocketStore } from '@/store/socketStore';
import { Bike, CheckCircle2, Clock, CookingPot, PackageCheck, Printer, RefreshCw, XCircle } from 'lucide-react';

type OrderStatus = 'RECEIVED' | 'CONFIRMED' | 'PREPARING' | 'READY' | 'DISPATCHED' | 'DELIVERED' | 'COMPLETED' | 'CANCELLED';

interface OrderItem {
  id: string;
  quantity: number;
  price: number;
  product?: { name: string };
}

interface Order {
  id: string;
  orderNumber: number;
  status: OrderStatus;
  deliveryType: 'DELIVERY' | 'PICKUP' | 'IN_STORE';
  paymentMethod: 'PIX' | 'CARD' | 'CASH';
  paymentStatus: 'PENDING' | 'PAID' | 'FAILED';
  total: number;
  createdAt: string;
  customer?: { name: string; phone: string };
  deliveryAddressStreet?: string;
  deliveryAddressNumber?: string;
  deliveryAddressNeighborhood?: string;
  items: OrderItem[];
}

const statusLabel: Record<OrderStatus, string> = {
  RECEIVED: 'Recebido',
  CONFIRMED: 'Confirmado',
  PREPARING: 'Em preparo',
  READY: 'Pronto',
  DISPATCHED: 'Em rota',
  DELIVERED: 'Entregue',
  COMPLETED: 'Concluido',
  CANCELLED: 'Cancelado',
};

const nextActions: Partial<Record<OrderStatus, { label: string; status: OrderStatus; icon: React.ElementType }>> = {
  RECEIVED: { label: 'Confirmar', status: 'CONFIRMED', icon: CheckCircle2 },
  CONFIRMED: { label: 'Preparar', status: 'PREPARING', icon: CookingPot },
  PREPARING: { label: 'Marcar pronto', status: 'READY', icon: PackageCheck },
  READY: { label: 'Saiu entrega', status: 'DISPATCHED', icon: Bike },
  DISPATCHED: { label: 'Entregue', status: 'DELIVERED', icon: CheckCircle2 },
};

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const { connect, disconnect, socket, joinAdminRoom } = useSocketStore();

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
      setOrders(data);
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
    joinAdminRoom(tenantId);

    const upsertOrder = (order: Order) => {
      setOrders((current) => {
        const isFinal = ['DELIVERED', 'COMPLETED', 'CANCELLED'].includes(order.status);
        const without = current.filter((item) => item.id !== order.id);
        return isFinal ? without : [order, ...without].sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
      });
    };

    socket.on('newOrder', upsertOrder);
    socket.on('orderStatusUpdated', (data: { order: Order }) => upsertOrder(data.order));

    return () => {
      socket.off('newOrder', upsertOrder);
      socket.off('orderStatusUpdated');
    };
  }, [socket, tenantId, joinAdminRoom]);

  const updateStatus = async (orderId: string, status: OrderStatus) => {
    setUpdatingId(orderId);
    try {
      const updated = await apiRequest(`/orders/${orderId}/status`, {
        method: 'PUT',
        body: JSON.stringify({ status }),
      });
      setOrders((current) => current.map((order) => (order.id === orderId ? updated : order)));
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6 animate-fade-in">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-black tracking-tight text-white">Fila de Pedidos</h1>
            <p className="text-xs text-slate-400 font-semibold mt-0.5">Acompanhe, imprima e avance os pedidos ativos.</p>
          </div>
          <div className="flex gap-2 no-print">
            <button onClick={loadOrders} className="rounded-xl border border-slate-800 bg-slate-900 px-4 py-2.5 text-xs font-bold text-slate-300 hover:bg-slate-800">
              <RefreshCw className="mr-2 inline h-4 w-4" /> Atualizar
            </button>
            <button onClick={() => window.print()} className="rounded-xl border border-slate-800 bg-slate-900 px-4 py-2.5 text-xs font-bold text-slate-300 hover:bg-slate-800">
              <Printer className="mr-2 inline h-4 w-4" /> Imprimir
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex min-h-[320px] items-center justify-center">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          </div>
        ) : orders.length === 0 ? (
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-10 text-center">
            <Clock className="mx-auto mb-3 h-10 w-10 text-slate-600" />
            <p className="text-sm font-bold text-slate-300">Nenhum pedido ativo no momento.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            {orders.map((order) => {
              const action = nextActions[order.status];
              const ActionIcon = action?.icon;

              return (
                <article key={order.id} className="rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow-sm">
                  <div className="flex items-start justify-between gap-4 border-b border-slate-800 pb-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="text-lg font-black text-white">Pedido #{order.orderNumber}</h2>
                        <span className="rounded-full bg-primary/10 px-2.5 py-1 text-[10px] font-black uppercase text-primary">{statusLabel[order.status]}</span>
                      </div>
                      <p className="mt-1 text-xs font-semibold text-slate-400">{order.customer?.name || 'Cliente'} • {order.paymentMethod} • R$ {order.total.toFixed(2)}</p>
                    </div>
                    <span className="shrink-0 rounded-lg border border-slate-800 bg-slate-950 px-2.5 py-1 text-[10px] font-bold text-slate-400">
                      {new Date(order.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>

                  <div className="space-y-3 py-4">
                    {order.items.map((item) => (
                      <div key={item.id} className="flex justify-between gap-3 text-sm">
                        <span className="font-bold text-slate-200">{item.quantity}x {item.product?.name || 'Produto'}</span>
                        <span className="font-black text-white">R$ {(item.price * item.quantity).toFixed(2)}</span>
                      </div>
                    ))}
                  </div>

                  {order.deliveryType === 'DELIVERY' && (
                    <p className="rounded-xl border border-slate-800 bg-slate-950 p-3 text-xs font-semibold text-slate-400">
                      {order.deliveryAddressStreet}, {order.deliveryAddressNumber} - {order.deliveryAddressNeighborhood}
                    </p>
                  )}

                  <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                    {action && ActionIcon && (
                      <button
                        disabled={updatingId === order.id}
                        onClick={() => updateStatus(order.id, action.status)}
                        className="flex-1 rounded-xl bg-primary px-4 py-3 text-xs font-black text-white shadow-lg shadow-primary/10 hover:brightness-110 disabled:opacity-60"
                      >
                        <ActionIcon className="mr-2 inline h-4 w-4" /> {updatingId === order.id ? 'Atualizando...' : action.label}
                      </button>
                    )}
                    <button
                      disabled={updatingId === order.id}
                      onClick={() => updateStatus(order.id, 'CANCELLED')}
                      className="rounded-xl border border-red-900/60 bg-red-950/20 px-4 py-3 text-xs font-black text-red-300 hover:bg-red-950/40 disabled:opacity-60"
                    >
                      <XCircle className="mr-2 inline h-4 w-4" /> Cancelar
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
