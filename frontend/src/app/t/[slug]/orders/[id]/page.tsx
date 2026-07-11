'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import { useParams, useRouter } from 'next/navigation';
import { API_BASE, apiRequest } from '@/lib/api';
import { useSocketStore } from '@/store/socketStore';
import {
  AlertCircle,
  Bike,
  Check,
  CheckCircle,
  ChevronLeft,
  Clock,
  Copy,
  Landmark,
  MapPin,
  MessageCircle,
  Receipt,
  Store,
} from 'lucide-react';

interface OrderItem {
  id: string;
  quantity: number;
  price: number;
  options: any;
  product: {
    name: string;
  };
}

interface Order {
  id: string;
  orderNumber: number;
  status: 'RECEIVED' | 'CONFIRMED' | 'PREPARING' | 'READY' | 'DISPATCHED' | 'DELIVERED' | 'CANCELLED';
  deliveryType: 'DELIVERY' | 'PICKUP' | 'IN_STORE';
  paymentMethod: 'PIX' | 'CARD' | 'CASH';
  paymentStatus: 'PENDING' | 'PAID' | 'FAILED';
  mpPaymentStatus?: string;
  pixQrCode?: string;
  pixQrCodeBase64?: string;
  paymentExpiresAt?: string;
  deliveryFee: number;
  subtotal: number;
  discount: number;
  total: number;
  changeFor?: number;
  notes?: string;
  deliveryAddressStreet?: string;
  deliveryAddressNumber?: string;
  deliveryAddressNeighborhood?: string;
  createdAt: string;
  items: OrderItem[];
}

const steps = [
  { label: 'Recebido', status: 'RECEIVED', desc: 'Seu pedido chegou na loja.' },
  { label: 'Confirmado', status: 'CONFIRMED', desc: 'A equipe confirmou o preparo.' },
  { label: 'Em preparo', status: 'PREPARING', desc: 'Seu pedido esta sendo feito.' },
  { label: 'Pronto', status: 'READY', desc: 'Pedido pronto para sair ou retirar.' },
  { label: 'Em rota', status: 'DISPATCHED', desc: 'O entregador saiu para entrega.' },
  { label: 'Entregue', status: 'DELIVERED', desc: 'Pedido finalizado. Bom apetite!' },
] as const;

export default function OrderTracking() {
  const { slug, id } = useParams();
  const router = useRouter();

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  const { connect, disconnect, socket, joinOrderRoom } = useSocketStore();

  useEffect(() => {
    async function loadOrder() {
      try {
        const data = await apiRequest(`/orders/${id}`);
        setOrder(data);
        connect(API_BASE);
      } catch (err) {
        console.error('Error fetching order:', err);
      } finally {
        setLoading(false);
      }
    }

    if (id) {
      loadOrder();
    }

    return () => {
      disconnect();
    };
  }, [id, connect, disconnect]);

  useEffect(() => {
    if (!socket || !order) {
      return;
    }

    joinOrderRoom(order.id);

    const handleStatusChanged = (data: { status: any; order: any }) => {
      setOrder(data.order);
    };

    socket.on('statusChanged', handleStatusChanged);

    return () => {
      socket.off('statusChanged', handleStatusChanged);
    };
  }, [socket, order, joinOrderRoom]);

  useEffect(() => {
    if (!id || order?.paymentStatus !== 'PENDING') {
      return;
    }

    const interval = window.setInterval(async () => {
      try {
        const data = await apiRequest(`/orders/${id}`);
        setOrder(data);
      } catch {
        // Socket is the primary update channel; polling is only a fallback.
      }
    }, 10000);

    return () => window.clearInterval(interval);
  }, [id, order?.paymentStatus]);

  const currentStepIndex = useMemo(() => {
    if (!order || order.status === 'CANCELLED') {
      return -1;
    }

    return steps.findIndex((step) => step.status === order.status);
  }, [order]);

  const qrCodeImage = order?.pixQrCodeBase64
    ? order.pixQrCodeBase64.startsWith('data:')
      ? order.pixQrCodeBase64
      : `data:image/png;base64,${order.pixQrCodeBase64}`
    : null;

  const handleCopyPix = () => {
    if (!order?.pixQrCode) {
      return;
    }

    navigator.clipboard.writeText(order.pixQrCode);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-background text-foreground">
        <div className="text-center space-y-4">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto" />
          <p className="text-sm font-semibold text-muted-foreground">Carregando pedido...</p>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="flex h-screen w-screen flex-col items-center justify-center bg-background text-foreground text-center p-6">
        <h1 className="text-2xl font-black text-primary">Pedido nao encontrado</h1>
        <button
          onClick={() => router.push(`/t/${slug}`)}
          className="mt-5 rounded-lg bg-primary px-5 py-2.5 text-sm font-black text-primary-foreground"
        >
          Voltar ao cardapio
        </button>
      </div>
    );
  }

  const currentStep = steps[currentStepIndex];

  return (
    <main className="min-h-screen bg-background pb-10 text-foreground">
      <header className="sticky top-0 z-30 border-b border-border bg-card/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-3xl items-center justify-between px-4">
          <button onClick={() => router.push(`/t/${slug}`)} className="rounded-lg p-2 transition hover:bg-muted" title="Voltar">
            <ChevronLeft className="h-6 w-6" />
          </button>
          <span className="text-sm font-black">Pedido #{order.orderNumber}</span>
          <div className="w-10" />
        </div>
      </header>

      <div className="mx-auto max-w-3xl px-4 py-6 space-y-4">
        <section className="rounded-lg border border-border bg-card p-5 shadow-sm">
          <div className="flex items-start gap-4">
            <div className="grid h-12 w-12 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
              {order.status === 'DISPATCHED' ? <Bike className="h-6 w-6" /> : <Clock className="h-6 w-6" />}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-black uppercase text-muted-foreground">
                {order.status === 'CANCELLED' ? 'Pedido cancelado' : 'Acompanhamento em tempo real'}
              </p>
              <h1 className="mt-1 text-2xl font-black">
                {order.status === 'CANCELLED' ? 'Pedido cancelado' : currentStep?.label}
              </h1>
              <p className="mt-1 text-sm font-medium text-muted-foreground">
                {order.status === 'CANCELLED'
                  ? 'A loja cancelou este pedido. Entre em contato para mais detalhes.'
                  : currentStep?.desc}
              </p>
            </div>
          </div>
        </section>

        {order.paymentStatus === 'PAID' && (
          <div className="flex items-center justify-center gap-2 rounded-lg border border-green-500/30 bg-green-500/10 p-4 text-sm font-black text-green-700 dark:text-green-300">
            <CheckCircle className="h-5 w-5" />
            Pagamento aprovado
          </div>
        )}

        {order.paymentStatus === 'FAILED' && (
          <div className="flex items-center justify-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-sm font-black text-red-600">
            <AlertCircle className="h-5 w-5" />
            Pagamento nao aprovado. Fale com a loja.
          </div>
        )}

        {order.paymentMethod === 'PIX' && order.paymentStatus === 'PENDING' && order.pixQrCode && (
          <section className="rounded-lg border border-border bg-card p-5 text-center shadow-sm">
            <div className="mb-4 flex items-center justify-center gap-2 text-sm font-black text-primary">
              <Landmark className="h-5 w-5" />
              PIX aguardando pagamento
            </div>

            {qrCodeImage && (
              <div className="mx-auto grid h-44 w-44 place-items-center rounded-lg border border-border bg-white p-2">
                <Image
                  src={qrCodeImage}
                  alt="QR Code PIX do pedido"
                  width={160}
                  height={160}
                  unoptimized
                  className="h-full w-full object-contain"
                />
              </div>
            )}

            <p className="mx-auto mt-4 max-w-md text-xs font-semibold leading-5 text-muted-foreground">
              Escaneie o QR Code ou copie o codigo PIX. A tela atualiza automaticamente quando o pagamento for confirmado.
            </p>

            <button
              onClick={handleCopyPix}
              className="mt-4 inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg border border-border bg-muted px-4 text-sm font-black transition hover:bg-muted/80"
            >
              {copied ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
              {copied ? 'Copiado' : 'Copiar codigo PIX'}
            </button>
          </section>
        )}

        {order.status === 'DISPATCHED' && (
          <section className="rounded-lg border border-border bg-card p-5 shadow-sm">
            <div className="mb-3 flex items-center justify-between">
              <span className="flex items-center gap-2 text-sm font-black text-primary">
                <Bike className="h-5 w-5" />
                Entrega em rota
              </span>
              <span className="rounded-full bg-primary/10 px-2 py-1 text-[10px] font-black text-primary">Ao vivo</span>
            </div>
            <div className="relative h-28 overflow-hidden rounded-lg border border-border bg-[#151512]">
              <div className="absolute left-8 right-8 top-1/2 h-1 -translate-y-1/2 rounded-full bg-primary/25" />
              <div className="absolute left-8 top-1/2 grid -translate-y-1/2 place-items-center">
                <div className="grid h-8 w-8 place-items-center rounded-lg border border-primary bg-card text-primary">
                  <Store className="h-4 w-4" />
                </div>
                <span className="mt-1 text-[10px] font-black text-white/70">Loja</span>
              </div>
              <div className="absolute right-8 top-1/2 grid -translate-y-1/2 place-items-center">
                <div className="grid h-8 w-8 place-items-center rounded-lg border border-green-500 bg-card text-green-500">
                  <MapPin className="h-4 w-4" />
                </div>
                <span className="mt-1 text-[10px] font-black text-white/70">Voce</span>
              </div>
              <div className="absolute top-1/2 z-10 -translate-y-1/2 animate-[bikeDrive_8s_infinite_linear] rounded-full bg-primary p-2 text-white">
                <Bike className="h-4 w-4" />
              </div>
              <style>{`
                @keyframes bikeDrive {
                  0% { left: 18%; }
                  100% { left: 76%; }
                }
              `}</style>
            </div>
          </section>
        )}

        {order.status !== 'CANCELLED' && (
          <section className="rounded-lg border border-border bg-card p-5 shadow-sm">
            <h2 className="mb-5 text-sm font-black uppercase text-muted-foreground">Status do pedido</h2>
            <div className="space-y-5">
              {steps.map((step, index) => {
                const isComplete = index < currentStepIndex;
                const isCurrent = index === currentStepIndex;

                return (
                  <div key={step.status} className="grid grid-cols-[28px_1fr] gap-3">
                    <div
                      className={`grid h-7 w-7 place-items-center rounded-full border text-xs ${
                        isComplete
                          ? 'border-primary bg-primary text-white'
                          : isCurrent
                          ? 'border-primary bg-primary/10 text-primary'
                          : 'border-border bg-background text-muted-foreground'
                      }`}
                    >
                      {isComplete ? <Check className="h-4 w-4 stroke-[4]" /> : index + 1}
                    </div>
                    <div>
                      <h3 className={`text-sm font-black ${isCurrent ? 'text-primary' : 'text-foreground'}`}>{step.label}</h3>
                      <p className="mt-0.5 text-xs font-medium text-muted-foreground">{step.desc}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        <section className="rounded-lg border border-border bg-card p-5 shadow-sm">
          <h2 className="mb-4 flex items-center gap-2 border-b border-border pb-3 text-sm font-black uppercase text-muted-foreground">
            <Receipt className="h-4 w-4 text-primary" />
            Resumo do pedido
          </h2>

          <div className="space-y-3">
            {order.items.map((item) => {
              const options = JSON.parse(JSON.stringify(item.options || []));

              return (
                <div key={item.id} className="flex justify-between gap-4">
                  <div>
                    <p className="text-sm font-black">
                      {item.quantity}x {item.product?.name}
                    </p>
                    {options.length > 0 && (
                      <div className="mt-1 flex flex-wrap gap-1">
                        {options.map((option: any, index: number) => (
                          <span key={index} className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-bold text-muted-foreground">
                            {option.optionName}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <span className="text-sm font-black">R$ {(item.price * item.quantity).toFixed(2)}</span>
                </div>
              );
            })}
          </div>

          <div className="mt-4 space-y-2 border-t border-border pt-4 text-sm font-bold text-muted-foreground">
            <div className="flex justify-between">
              <span>Subtotal</span>
              <span className="text-foreground">R$ {order.subtotal.toFixed(2)}</span>
            </div>
            {order.discount > 0 && (
              <div className="flex justify-between text-green-600">
                <span>Desconto</span>
                <span>- R$ {order.discount.toFixed(2)}</span>
              </div>
            )}
            {order.deliveryType === 'DELIVERY' && (
              <div className="flex justify-between">
                <span>Entrega</span>
                <span className="text-foreground">R$ {order.deliveryFee.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between border-t border-border pt-3 text-lg font-black text-foreground">
              <span>Total</span>
              <span className="text-primary">R$ {order.total.toFixed(2)}</span>
            </div>
          </div>
        </section>

        {order.deliveryType === 'DELIVERY' && (
          <section className="rounded-lg border border-border bg-card p-5 shadow-sm">
            <h2 className="mb-2 flex items-center gap-2 text-sm font-black uppercase text-muted-foreground">
              <MapPin className="h-4 w-4 text-primary" />
              Endereco de entrega
            </h2>
            <p className="text-sm font-black">
              {order.deliveryAddressStreet}, n. {order.deliveryAddressNumber}
            </p>
            <p className="mt-1 text-xs font-bold text-muted-foreground">Bairro: {order.deliveryAddressNeighborhood}</p>
          </section>
        )}

        <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
          <a
            href="https://whatsapp.com"
            target="_blank"
            className="flex h-12 items-center justify-center gap-2 rounded-lg bg-green-600 px-5 text-sm font-black text-white transition hover:bg-green-700"
          >
            <MessageCircle className="h-5 w-5" />
            Suporte no WhatsApp
          </a>
          <button
            onClick={() => router.push(`/t/${slug}`)}
            className="h-12 rounded-lg border border-border bg-card px-5 text-sm font-black transition hover:bg-muted"
          >
            Voltar ao menu
          </button>
        </div>
      </div>
    </main>
  );
}
