'use client';

import React, { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useCartStore } from '@/store/cartStore';
import { 
  ChevronLeft, Trash2, Copy, Plus, Minus, Ticket, MapPin, 
  Store, Utensils, ShieldAlert, Sparkles, Receipt 
} from 'lucide-react';
import { apiRequest } from '@/lib/api';

export default function CartPage() {
  const { slug } = useParams();
  const router = useRouter();

  const {
    items,
    deliveryType,
    deliveryArea,
    couponCode,
    couponDiscount,
    paymentMethod,
    changeFor,
    removeItem,
    updateQuantity,
    addItem,
    setDeliveryType,
    setDeliveryArea,
    applyCoupon,
    removeCoupon,
    getSubtotal,
    getDiscount,
    getDeliveryFee,
    getTotal,
  } = useCartStore();

  const [couponInput, setCouponInput] = useState(couponCode);
  const [couponError, setCouponError] = useState('');
  const [couponSuccess, setCouponSuccess] = useState(couponCode ? 'Cupom aplicado!' : '');
  const [selectedNeighborhood, setSelectedNeighborhood] = useState(deliveryArea?.neighborhood || '');

  // Default neighborhoods and fees seeded in the DB
  const deliveryAreasMock = [
    { neighborhood: 'Centro', fee: 5.0 },
    { neighborhood: 'Jardim América', fee: 7.0 },
    { neighborhood: 'Vila Madalena', fee: 10.0 },
    { neighborhood: 'Bela Vista', fee: 8.0 },
  ];

  const handleDuplicateItem = (item: any) => {
    // Adds a copy with quantity = 1
    addItem({
      productId: item.productId,
      name: item.name,
      basePrice: item.basePrice,
      quantity: 1,
      imageUrl: item.imageUrl,
      notes: item.notes,
      options: item.options,
    });
  };

  const handleApplyCoupon = async () => {
    setCouponError('');
    setCouponSuccess('');
    if (!couponInput) return;

    try {
      // Simulate/request coupon validation
      const tenantData = await apiRequest(`/tenants/${slug}`);
      const codeUpper = couponInput.toUpperCase();
      
      if (codeUpper === 'BEMVINDO') {
        applyCoupon('BEMVINDO', 10, 'PERCENTAGE');
        setCouponSuccess('Cupom BEMVINDO (10%) aplicado com sucesso!');
      } else if (codeUpper === 'MENINO10') {
        applyCoupon('MENINO10', 10.0, 'FIXED');
        setCouponSuccess('Cupom MENINO10 (R$ 10,00) aplicado com sucesso!');
      } else {
        setCouponError('Cupom inválido ou expirado.');
        removeCoupon();
      }
    } catch (e) {
      setCouponError('Erro ao aplicar cupom.');
      removeCoupon();
    }
  };

  const handleNeighborhoodChange = (neighborhood: string) => {
    setSelectedNeighborhood(neighborhood);
    const area = deliveryAreasMock.find((a) => a.neighborhood === neighborhood);
    if (area) {
      setDeliveryArea(area);
    } else {
      setDeliveryArea(null);
    }
  };

  const handleCheckout = () => {
    if (deliveryType === 'DELIVERY' && !selectedNeighborhood) {
      alert('Por favor, selecione o bairro de entrega.');
      return;
    }
    router.push(`/t/${slug}/checkout`);
  };

  const subtotal = getSubtotal();
  const discount = getDiscount();
  const deliveryFee = getDeliveryFee();
  const total = getTotal();

  return (
    <div className="relative min-h-screen bg-background text-foreground pb-32">
      
      {/* 1. Header */}
      <div className="fixed top-0 left-0 right-0 z-30 bg-card border-b border-border py-4 px-4 flex items-center justify-between">
        <button onClick={() => router.back()} className="p-2 rounded-full hover:bg-muted transition-colors">
          <ChevronLeft className="h-6 w-6" />
        </button>
        <span className="font-extrabold text-base">Minha Sacola</span>
        <div className="w-10"></div>
      </div>

      <div className="max-w-xl mx-auto px-4 pt-20 space-y-6 animate-fade-in">
        
        {items.length === 0 ? (
          <div className="text-center p-12 bg-card rounded-2xl border border-border space-y-4">
            <Utensils className="h-12 w-12 text-primary mx-auto opacity-50" />
            <h2 className="text-lg font-bold">Sua sacola está vazia</h2>
            <p className="text-sm text-muted-foreground">Adicione alguns pastéis crocantes ou churros do cardápio para começar.</p>
            <button
              onClick={() => router.push(`/t/${slug}`)}
              className="bg-primary text-primary-foreground font-bold px-6 py-2 rounded-full shadow-md text-sm"
            >
              Ver Cardápio
            </button>
          </div>
        ) : (
          <>
            {/* 2. Items List */}
            <div className="space-y-4">
              <h2 className="text-base font-extrabold tracking-tight">Produtos Selecionados</h2>
              <div className="space-y-3">
                {items.map((item) => (
                  <div key={item.key} className="bg-card rounded-2xl border border-border p-4 space-y-3 shadow-sm">
                    <div className="flex items-start gap-4">
                      {item.imageUrl && (
                        <div className="h-16 w-16 rounded-xl overflow-hidden bg-muted shrink-0 border border-border">
                          <img src={item.imageUrl} alt={item.name} className="h-full w-full object-cover" />
                        </div>
                      )}
                      <div className="flex-1 space-y-1">
                        <h3 className="font-bold text-sm text-foreground">{item.name}</h3>
                        
                        {item.options.length > 0 && (
                          <div className="flex flex-wrap gap-x-2 gap-y-0.5 text-xs text-muted-foreground font-semibold">
                            {item.options.map((opt, i) => (
                              <span key={i} className="bg-muted px-1.5 py-0.5 rounded text-[10px]">
                                {opt.optionName} {opt.price > 0 ? `(+R$ ${opt.price.toFixed(2)})` : ''}
                              </span>
                            ))}
                          </div>
                        )}
                        {item.notes && (
                          <p className="text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/20 px-2 py-1 rounded font-semibold italic">
                            Obs: {item.notes}
                          </p>
                        )}
                      </div>
                      
                      <div className="text-right">
                        <span className="font-extrabold text-sm block">R$ {(item.price * item.quantity).toFixed(2)}</span>
                        <span className="text-[10px] text-muted-foreground font-bold">Un: R$ {item.price.toFixed(2)}</span>
                      </div>
                    </div>

                    {/* Actions and Quantity */}
                    <div className="flex items-center justify-between border-t border-border pt-3">
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleDuplicateItem(item)}
                          title="Duplicar Item"
                          className="p-2 rounded-lg border border-border hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                        >
                          <Copy className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => removeItem(item.key)}
                          title="Excluir Item"
                          className="p-2 rounded-lg border border-border hover:bg-muted text-red-500 hover:text-red-600 transition-colors"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>

                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => updateQuantity(item.key, item.quantity - 1)}
                          className="p-1.5 rounded-full border border-border hover:bg-muted"
                        >
                          <Minus className="h-3 w-3" />
                        </button>
                        <span className="text-sm font-extrabold w-5 text-center">{item.quantity}</span>
                        <button
                          onClick={() => updateQuantity(item.key, item.quantity + 1)}
                          className="p-1.5 rounded-full border border-border hover:bg-muted"
                        >
                          <Plus className="h-3 w-3" />
                        </button>
                      </div>
                    </div>

                  </div>
                ))}
              </div>
            </div>

            {/* 3. Delivery Method Selection */}
            <div className="bg-card rounded-2xl border border-border p-5 space-y-4">
              <h2 className="text-sm font-extrabold uppercase tracking-wider text-muted-foreground">Como deseja receber?</h2>
              
              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={() => setDeliveryType('DELIVERY')}
                  className={`flex flex-col items-center gap-2 p-3 rounded-xl border text-xs font-bold transition-all ${
                    deliveryType === 'DELIVERY'
                      ? 'bg-primary/5 border-primary text-primary shadow-sm'
                      : 'border-border hover:bg-muted'
                  }`}
                >
                  <MapPin className="h-5 w-5" />
                  <span>Entrega</span>
                </button>
                <button
                  onClick={() => {
                    setDeliveryType('PICKUP');
                    setDeliveryArea(null);
                  }}
                  className={`flex flex-col items-center gap-2 p-3 rounded-xl border text-xs font-bold transition-all ${
                    deliveryType === 'PICKUP'
                      ? 'bg-primary/5 border-primary text-primary shadow-sm'
                      : 'border-border hover:bg-muted'
                  }`}
                >
                  <Store className="h-5 w-5" />
                  <span>Retirada</span>
                </button>
                <button
                  onClick={() => {
                    setDeliveryType('IN_STORE');
                    setDeliveryArea(null);
                  }}
                  className={`flex flex-col items-center gap-2 p-3 rounded-xl border text-xs font-bold transition-all ${
                    deliveryType === 'IN_STORE'
                      ? 'bg-primary/5 border-primary text-primary shadow-sm'
                      : 'border-border hover:bg-muted'
                  }`}
                >
                  <Utensils className="h-5 w-5" />
                  <span>Na Mesa</span>
                </button>
              </div>

              {deliveryType === 'DELIVERY' && (
                <div className="space-y-2 pt-2">
                  <label className="text-xs font-bold text-muted-foreground">Bairro de Entrega:</label>
                  <select
                    value={selectedNeighborhood}
                    onChange={(e) => handleNeighborhoodChange(e.target.value)}
                    className="w-full p-3 rounded-xl bg-background border border-border text-foreground text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="">Selecione o Bairro...</option>
                    {deliveryAreasMock.map((area, i) => (
                      <option key={i} value={area.neighborhood}>
                        {area.neighborhood} (R$ {area.fee.toFixed(2)})
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* 4. Coupons Section */}
            <div className="bg-card rounded-2xl border border-border p-5 space-y-4">
              <h2 className="text-sm font-extrabold uppercase tracking-wider text-muted-foreground">Cupom de Desconto</h2>
              
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Ticket className="absolute left-3.5 top-3.5 h-4 w-4 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="Insira seu cupom (Ex: BEMVINDO)"
                    value={couponInput}
                    onChange={(e) => setCouponInput(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 rounded-xl bg-background border border-border text-sm font-semibold placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary uppercase"
                  />
                </div>
                <button
                  onClick={handleApplyCoupon}
                  className="bg-primary text-primary-foreground font-bold px-5 py-3 rounded-xl text-sm hover:scale-[1.01] transition-transform"
                >
                  Aplicar
                </button>
              </div>

              {couponError && (
                <p className="text-xs text-red-500 font-bold flex items-center gap-1">
                  <ShieldAlert className="h-3 w-3" /> {couponError}
                </p>
              )}
              {couponSuccess && (
                <p className="text-xs text-green-500 font-bold flex items-center gap-1">
                  <Sparkles className="h-3 w-3" /> {couponSuccess}
                </p>
              )}
            </div>

            {/* 5. Summary Bills */}
            <div className="bg-card rounded-2xl border border-border p-5 space-y-3 text-sm font-semibold text-muted-foreground">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span className="text-foreground">R$ {subtotal.toFixed(2)}</span>
              </div>
              
              {discount > 0 && (
                <div className="flex justify-between text-green-500">
                  <span>Desconto ({couponCode})</span>
                  <span>- R$ {discount.toFixed(2)}</span>
                </div>
              )}

              {deliveryType === 'DELIVERY' && (
                <div className="flex justify-between">
                  <span>Taxa de Entrega</span>
                  <span className="text-foreground">
                    {deliveryFee > 0 ? `R$ ${deliveryFee.toFixed(2)}` : 'R$ 0,00'}
                  </span>
                </div>
              )}

              <div className="flex justify-between text-base font-extrabold text-foreground border-t border-border pt-3">
                <span className="flex items-center gap-1.5"><Receipt className="h-5 w-5 text-primary" /> Total</span>
                <span className="text-primary">R$ {total.toFixed(2)}</span>
              </div>
            </div>
          </>
        )}

      </div>

      {/* 6. Sticky Confirm */}
      {items.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-30 bg-card border-t border-border py-5 px-6 shadow-2xl">
          <div className="max-w-xl mx-auto flex items-center justify-between gap-4">
            <button
              onClick={handleCheckout}
              className="w-full bg-primary text-primary-foreground font-extrabold py-4 px-6 rounded-2xl shadow-lg shadow-primary/20 hover:scale-[1.01] transition-transform text-center text-sm"
            >
              Ir para o Pagamento
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
