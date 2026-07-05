'use client';

import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import { useParams, useRouter } from 'next/navigation';
import { apiRequest, API_BASE } from '@/lib/api';
import { useSocketStore } from '@/store/socketStore';
import { 
  ChevronLeft, Clock, MapPin, Receipt, CheckCircle, 
  Bike, Check, AlertCircle, MessageCircle, HelpCircle, Landmark 
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

        // Start Socket.IO
        connect(API_BASE);
      } catch (err) {
        console.error('Error fetching order:', err);
      } finally {
        setLoading(false);
      }
    }
    if (id) loadOrder();

    return () => {
      disconnect();
    };
  }, [id, connect, disconnect]);

  // Join Socket Room once connected
  useEffect(() => {
    if (socket && order) {
      joinOrderRoom(order.id);

      const handleStatusChanged = (data: { status: any; order: any }) => {
        console.log('Socket update received:', data);
        setOrder(data.order);
      };
      socket.on('statusChanged', handleStatusChanged);

      return () => {
        socket.off('statusChanged', handleStatusChanged);
      };
    }
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
        // Socket remains the primary update channel; polling is a fallback.
      }
    }, 10000);

    return () => window.clearInterval(interval);
  }, [id, order?.paymentStatus]);

  if (loading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-background text-foreground">
        <div className="text-center space-y-4">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto"></div>
          <p className="text-lg font-medium text-muted-foreground animate-pulse">Carregando rastreamento em tempo real...</p>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="flex h-screen w-screen flex-col items-center justify-center bg-background text-foreground text-center p-6">
        <h1 className="text-3xl font-extrabold text-primary">Pedido não encontrado</h1>
        <button onClick={() => router.push(`/t/${slug}`)} className="mt-4 bg-primary text-primary-foreground px-6 py-2 rounded-full font-semibold">
          Voltar ao Cardápio
        </button>
      </div>
    );
  }

  const steps = [
    { label: 'Recebido', status: 'RECEIVED', desc: 'Aguardando confirmação do caixa' },
    { label: 'Confirmado', status: 'CONFIRMED', desc: 'Pedido aceito e agendado' },
    { label: 'Em Preparo', status: 'PREPARING', desc: 'Seus pastéis estão fritando!' },
    { label: 'Pronto', status: 'READY', desc: 'Saindo quentinho da cozinha' },
    { label: 'Em Rota', status: 'DISPATCHED', desc: 'Entregador à caminho' },
    { label: 'Entregue', status: 'DELIVERED', desc: 'Bom apetite!' },
  ];

  const getCurrentStepIndex = () => {
    if (order.status === 'CANCELLED') return -1;
    return steps.findIndex((step) => step.status === order.status);
  };

  const currentStepIndex = getCurrentStepIndex();

  const handleCopyPix = () => {
    if (!order.pixQrCode) return;
    navigator.clipboard.writeText(order.pixQrCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const qrCodeImage = order.pixQrCodeBase64
    ? order.pixQrCodeBase64.startsWith('data:')
      ? order.pixQrCodeBase64
      : `data:image/png;base64,${order.pixQrCodeBase64}`
    : null;

  return (
    <div className="relative min-h-screen bg-background text-foreground pb-24">
      
      {/* 1. Header */}
      <div className="fixed top-0 left-0 right-0 z-30 bg-card border-b border-border py-4 px-4 flex items-center justify-between shadow-sm">
        <button onClick={() => router.push(`/t/${slug}`)} className="p-2 rounded-full hover:bg-muted transition-colors">
          <ChevronLeft className="h-6 w-6" />
        </button>
        <span className="font-extrabold text-base">Acompanhar Pedido #{order.orderNumber}</span>
        <div className="w-10"></div>
      </div>

      <div className="max-w-xl mx-auto px-4 pt-22 space-y-6 animate-fade-in">
        
        {/* 2. Banner Status Summary */}
        <div className="bg-card rounded-2xl border border-border p-6 shadow-sm flex items-center gap-4">
          <div className="h-12 w-12 bg-primary/10 rounded-full flex items-center justify-center text-primary shrink-0 animate-pulse">
            <Clock className="h-6 w-6" />
          </div>
          <div className="flex-1 space-y-1">
            <h2 className="font-extrabold text-lg">
              {order.status === 'CANCELLED' ? 'Pedido Cancelado' : steps[currentStepIndex]?.label}
            </h2>
            <p className="text-xs text-muted-foreground font-semibold">
              {order.status === 'CANCELLED' ? 'Infelizmente o pedido foi recusado pelo trailer.' : steps[currentStepIndex]?.desc}
            </p>
          </div>
        </div>

        {/* 3. Realtime Map / Motorbike Animation (Shown when DISPATCHED) */}
        {order.status === 'DISPATCHED' && (
          <div className="bg-card rounded-2xl border border-border p-5 overflow-hidden relative shadow-md">
            <div className="flex justify-between items-center mb-3">
              <span className="text-xs font-bold text-primary flex items-center gap-1">
                <Bike className="h-4 w-4 animate-bounce" /> MotoBoy em Trânsito
              </span>
              <span className="text-[10px] bg-primary/10 text-primary font-bold px-2 py-0.5 rounded">Rastreamento Live</span>
            </div>
            
            {/* Mock Map View with nice street paths and animating motorbike */}
            <div className="h-32 bg-slate-950 rounded-xl relative border border-border overflow-hidden">
              {/* Premium futuristic dark map grid representation */}
              <div className="absolute inset-0 opacity-15 bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:16px_16px]"></div>
              
              {/* Street Line */}
              <div className="absolute left-0 right-0 top-1/2 h-1 bg-primary/40 -translate-y-1/2"></div>
              <div className="absolute left-0 right-0 top-1/2 h-0.5 bg-primary -translate-y-1/2"></div>
              
              {/* Shop Node */}
              <div className="absolute left-6 top-1/2 -translate-y-1/2 flex flex-col items-center">
                <div className="h-6 w-6 rounded-full bg-slate-900 border-2 border-primary flex items-center justify-center text-[10px] text-primary font-bold shadow-lg z-10">
                  🏠
                </div>
                <span className="text-[8px] text-muted-foreground font-extrabold mt-1">Trailer</span>
              </div>

              {/* Home Node */}
              <div className="absolute right-6 top-1/2 -translate-y-1/2 flex flex-col items-center">
                <div className="h-6 w-6 rounded-full bg-slate-900 border-2 border-green-500 flex items-center justify-center text-[10px] text-green-500 font-bold shadow-lg z-10">
                  📍
                </div>
                <span className="text-[8px] text-muted-foreground font-extrabold mt-1">Você</span>
              </div>

              {/* Moving Bike Icon */}
              <div className="absolute top-1/2 -translate-y-1/2 flex items-center justify-center z-20 animate-[bikeDrive_8s_infinite_linear]" style={{ left: '0%' }}>
                <div className="bg-primary p-1.5 rounded-full shadow-lg border border-primary/20 text-white">
                  <Bike className="h-4 w-4" />
                </div>
              </div>

              <style>{`
                @keyframes bikeDrive {
                  0% { left: 15%; }
                  100% { left: 80%; }
                }
              `}</style>
            </div>
          </div>
        )}

        {/* 4. PIX Payment code (If PENDING) */}
        {order.paymentStatus === 'PAID' && (
          <div className="bg-green-500/10 border border-green-500/30 p-4 rounded-xl text-sm font-bold text-green-600 flex items-center justify-center gap-2">
            <CheckCircle className="h-5 w-5" /> Pagamento aprovado
          </div>
        )}

        {order.paymentStatus === 'FAILED' && (
          <div className="bg-red-500/10 border border-red-500/30 p-4 rounded-xl text-sm font-bold text-red-600 flex items-center justify-center gap-2">
            <AlertCircle className="h-5 w-5" /> Pagamento não aprovado. Entre em contato com a loja.
          </div>
        )}

        {order.paymentMethod === 'PIX' && order.paymentStatus === 'PENDING' && order.pixQrCode && (
          <div className="bg-card rounded-2xl border border-border p-5 space-y-4 shadow-sm text-center">
            <div className="flex justify-center items-center gap-2 text-primary font-bold text-sm">
              <Landmark className="h-5 w-5" /> Pagamento Pendente
            </div>
            
            {qrCodeImage && (
              <div className="h-44 w-44 bg-white p-2 rounded-xl border border-border mx-auto">
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

            <p className="text-xs text-muted-foreground font-semibold px-4">
              Escaneie o QR Code ou copie o código PIX abaixo. A confirmação aparece automaticamente após o pagamento.
            </p>

            <button
              onClick={handleCopyPix}
              className="w-full bg-muted border border-border hover:bg-muted/80 text-foreground font-bold py-3 px-4 rounded-xl text-xs flex items-center justify-center gap-2 transition-all"
            >
              {copied ? (
                <>
                  <Check className="h-4 w-4 text-green-500" /> Copiado!
                </>
              ) : (
                'Copiar código PIX Copia e Cola'
              )}
            </button>
          </div>
        )}

        {/* 5. Animated Visual Timeline */}
        {order.status !== 'CANCELLED' && (
          <div className="bg-card rounded-2xl border border-border p-6 shadow-sm">
            <h3 className="font-extrabold text-sm uppercase tracking-wider text-muted-foreground mb-6">Status do Pedido</h3>
            
            <div className="relative pl-6 border-l border-border space-y-8">
              {steps.map((step, idx) => {
                const isCompleted = idx < currentStepIndex;
                const isCurrent = idx === currentStepIndex;
                
                return (
                  <div key={idx} className="relative">
                    {/* Glowing Node indicator */}
                    <div className={`absolute -left-[31px] top-0 h-[18px] w-[18px] rounded-full border-2 flex items-center justify-center z-10 transition-all ${
                      isCompleted 
                        ? 'bg-primary border-primary text-white scale-105' 
                        : isCurrent 
                        ? 'bg-background border-primary text-primary scale-110 ring-4 ring-primary/10 animate-pulse'
                        : 'bg-background border-border text-muted-foreground'
                    }`}>
                      {isCompleted && <Check className="h-2.5 w-2.5 stroke-[4]" />}
                    </div>

                    <div className="space-y-1">
                      <h4 className={`text-sm font-extrabold ${isCurrent ? 'text-primary' : isCompleted ? 'text-foreground' : 'text-muted-foreground'}`}>
                        {step.label}
                      </h4>
                      <p className="text-xs text-muted-foreground font-medium">
                        {step.desc}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* 6. Order Summary Details */}
        <div className="bg-card rounded-2xl border border-border p-5 space-y-4 shadow-sm text-sm font-semibold">
          <h3 className="font-extrabold text-sm uppercase tracking-wider text-muted-foreground border-b border-border pb-2 flex items-center gap-1.5">
            <Receipt className="h-4.5 w-4.5 text-primary" /> Detalhes do Pedido
          </h3>

          <div className="space-y-3.5">
            {order.items.map((item) => (
              <div key={item.id} className="flex justify-between items-start gap-4">
                <div className="space-y-0.5">
                  <p className="text-foreground font-bold">{item.quantity}x {item.product?.name}</p>
                  
                  {item.options && JSON.parse(JSON.stringify(item.options)).length > 0 && (
                    <div className="flex flex-wrap gap-1 text-[10px] text-muted-foreground">
                      {JSON.parse(JSON.stringify(item.options)).map((opt: any, i: number) => (
                        <span key={i} className="bg-muted px-1 py-0.2 rounded font-semibold">
                          {opt.optionName}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <span className="text-foreground font-extrabold">R$ {(item.price * item.quantity).toFixed(2)}</span>
              </div>
            ))}
          </div>

          <div className="border-t border-border pt-3 space-y-2 text-xs text-muted-foreground font-bold">
            <div className="flex justify-between">
              <span>Subtotal</span>
              <span className="text-foreground">R$ {order.subtotal.toFixed(2)}</span>
            </div>
            {order.discount > 0 && (
              <div className="flex justify-between text-green-500">
                <span>Desconto</span>
                <span>- R$ {order.discount.toFixed(2)}</span>
              </div>
            )}
            {order.deliveryType === 'DELIVERY' && (
              <div className="flex justify-between">
                <span>Taxa de Entrega</span>
                <span className="text-foreground">R$ {order.deliveryFee.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between text-base font-extrabold text-foreground border-t border-border pt-2">
              <span>Total</span>
              <span className="text-primary text-lg font-black">R$ {order.total.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* 7. Delivery Location / Customer Info */}
        {order.deliveryType === 'DELIVERY' && (
          <div className="bg-card rounded-2xl border border-border p-5 space-y-3 shadow-sm text-sm font-semibold">
            <h3 className="font-extrabold text-sm uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <MapPin className="h-4.5 w-4.5 text-primary" /> Endereço de Entrega
            </h3>
            <p className="text-foreground">
              {order.deliveryAddressStreet}, Nº {order.deliveryAddressNumber}
            </p>
            <p className="text-xs text-muted-foreground font-semibold">
              Bairro: {order.deliveryAddressNeighborhood}
            </p>
          </div>
        )}

        {/* 8. Support shortcut */}
        <div className="flex gap-2">
          <a
            href="https://whatsapp.com"
            target="_blank"
            className="flex-1 bg-green-600 hover:bg-green-700 text-white font-extrabold py-3.5 px-6 rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-green-600/10 text-sm transition-transform"
          >
            <MessageCircle className="h-5 w-5" /> Suporte no WhatsApp
          </a>
          <button
            onClick={() => router.push(`/t/${slug}`)}
            className="bg-muted border border-border hover:bg-muted/80 text-foreground font-extrabold px-6 rounded-2xl text-sm"
          >
            Voltar Menu
          </button>
        </div>

      </div>

    </div>
  );
}
