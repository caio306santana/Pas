'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useCartStore } from '@/store/cartStore';
import { apiRequest } from '@/lib/api';
import { 
  ChevronLeft, MapPin, CreditCard, Landmark, DollarSign, 
  User, Mail, Phone, Lock, Sparkles, CheckCircle, Search 
} from 'lucide-react';

export default function CheckoutPage() {
  const { slug } = useParams();
  const router = useRouter();

  const {
    items,
    customer,
    deliveryType,
    deliveryArea,
    couponCode,
    paymentMethod,
    changeFor,
    setCustomer,
    setPaymentMethod,
    setChangeFor,
    getSubtotal,
    getDiscount,
    getDeliveryFee,
    getTotal,
    clearCart,
  } = useCartStore();

  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);
  
  // Auth state if not logged in
  const [authMode, setAuthMode] = useState<'LOGIN' | 'REGISTER'>('LOGIN');
  const [authForm, setAuthForm] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
  });
  const [authError, setAuthError] = useState('');

  // Address form
  const [addressForm, setAddressForm] = useState({
    cep: '',
    street: '',
    number: '',
    neighborhood: deliveryArea?.neighborhood || '',
    city: 'São Paulo',
    state: 'SP',
  });
  const [searchingCep, setSearchingCep] = useState(false);

  // Credit Card Form
  const [cardForm, setCardForm] = useState({
    number: '',
    name: '',
    expiry: '',
    cvv: '',
  });

  // Observações
  const [userNotes, setUserNotes] = useState('');
  // Tipo de pagamento com cartão
  const [cardPaymentType, setCardPaymentType] = useState<'ONLINE' | 'DELIVERY_MACHINE' | 'PICKUP_MACHINE'>('ONLINE');

  useEffect(() => {
    if (cardPaymentType !== 'ONLINE') {
      setCardPaymentType(deliveryType === 'DELIVERY' ? 'DELIVERY_MACHINE' : 'PICKUP_MACHINE');
    }
  }, [deliveryType, cardPaymentType]);

  // Load defaults from state
  useEffect(() => {
    if (items.length === 0) {
      router.push(`/t/${slug}`);
    }
  }, [items, slug, router]);

  // Handle Cep search mock
  const handleCepSearch = async () => {
    const rawCep = addressForm.cep.replace(/\D/g, '');
    if (rawCep.length !== 8) {
      alert('CEP inválido. Digite 8 algarismos.');
      return;
    }
    setSearchingCep(true);
    // Simulate CEP database search
    await new Promise((res) => setTimeout(res, 800));
    setAddressForm((prev) => ({
      ...prev,
      street: 'Rua do Menino Travesso',
      neighborhood: deliveryArea?.neighborhood || 'Centro',
      city: 'São Paulo',
      state: 'SP',
    }));
    setSearchingCep(false);
  };

  // Handle Staff/Customer inline login
  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    setLoading(true);

    const cleanPhone = authForm.phone.replace(/\D/g, '');
    if (cleanPhone.length < 10) {
      setAuthError('WhatsApp inválido. Digite DDD + Número (ex: 11999999999).');
      setLoading(false);
      return;
    }

    const email = `${cleanPhone}@menino.com`;
    const password = `${cleanPhone}123`;

    try {
      if (authMode === 'LOGIN') {
        const data = await apiRequest('/auth/customer/login', {
          method: 'POST',
          headers: { 'x-tenant-slug': slug as string },
          body: JSON.stringify({
            email,
            password,
          }),
        });
        setCustomer({
          id: data.customer.id,
          name: data.customer.name,
          email: data.customer.email,
          phone: data.customer.phone,
          cashbackBalance: data.customer.cashbackBalance,
          points: data.customer.points,
          token: data.token,
        });
      } else {
        if (!authForm.name.trim()) {
          setAuthError('Por favor, informe seu nome.');
          setLoading(false);
          return;
        }
        const data = await apiRequest('/auth/customer/register', {
          method: 'POST',
          headers: { 'x-tenant-slug': slug as string },
          body: JSON.stringify({
            name: authForm.name,
            email,
            phone: cleanPhone,
            password,
          }),
        });
        setCustomer({
          id: data.customer.id,
          name: data.customer.name,
          email: data.customer.email,
          phone: data.customer.phone,
          cashbackBalance: data.customer.cashbackBalance,
          points: data.customer.points,
          token: data.token,
        });
      }
    } catch (err: any) {
      setAuthError(err.message || 'Falha na autenticação.');
    } finally {
      setLoading(false);
    }
  };

  // Place order
  const handlePlaceOrder = async () => {
    if (!customer) {
      alert('Por favor, faça login ou cadastre-se primeiro.');
      return;
    }

    if (deliveryType === 'DELIVERY' && (!addressForm.street || !addressForm.number)) {
      alert('Por favor, preencha o endereço completo de entrega.');
      return;
    }

    setLoading(true);

    try {
      // Fetch tenant data
      const tenantData = await apiRequest(`/tenants/${slug}`);

      let notesParts: string[] = [];
      if (userNotes.trim()) {
        notesParts.push(userNotes.trim());
      }
      if (paymentMethod === 'CARD') {
        if (cardPaymentType === 'DELIVERY_MACHINE') {
          notesParts.push('[PAGAMENTO: Cartão na Entrega]');
        } else if (cardPaymentType === 'PICKUP_MACHINE') {
          notesParts.push('[PAGAMENTO: Cartão na Retirada]');
        } else {
          notesParts.push('[PAGAMENTO: Cartão Online]');
        }
      }

      const orderPayload = {
        customerId: customer.id,
        deliveryType,
        paymentMethod,
        changeFor: paymentMethod === 'CASH' ? changeFor : undefined,
        street: deliveryType === 'DELIVERY' ? addressForm.street : undefined,
        number: deliveryType === 'DELIVERY' ? addressForm.number : undefined,
        neighborhood: deliveryType === 'DELIVERY' ? addressForm.neighborhood : undefined,
        city: deliveryType === 'DELIVERY' ? addressForm.city : undefined,
        zipCode: deliveryType === 'DELIVERY' ? addressForm.cep : undefined,
        couponCode: couponCode || undefined,
        notes: notesParts.length > 0 ? notesParts.join(' | ') : undefined,
        items: items.map((i) => ({
          productId: i.productId,
          quantity: i.quantity,
          options: i.options,
        })),
      };

      const order = await apiRequest('/orders', {
        method: 'POST',
        headers: { 'x-tenant-id': tenantData.id },
        body: JSON.stringify(orderPayload),
      });

      // Clear local cart
      clearCart();
      
      // Redirect to dynamic tracking screen
      router.push(`/t/${slug}/orders/${order.id}`);
    } catch (err: any) {
      alert(err.message || 'Erro ao realizar o pedido.');
    } finally {
      setLoading(false);
    }
  };

  const total = getTotal();
  const deliveryFee = getDeliveryFee();

  return (
    <div className="relative min-h-screen bg-background text-foreground pb-24">
      
      {/* 1. Header */}
      <div className="fixed top-0 left-0 right-0 z-30 bg-card border-b border-border py-4 px-4 flex items-center justify-between">
        <button onClick={() => router.back()} className="p-2 rounded-full hover:bg-muted transition-colors">
          <ChevronLeft className="h-6 w-6" />
        </button>
        <span className="font-extrabold text-base">Finalizar Pedido</span>
        <div className="w-10"></div>
      </div>

      <div className="max-w-xl mx-auto px-4 pt-20 space-y-6 animate-fade-in">
        
        {/* 2. Customer Auth Step (If not logged in) */}
        {!mounted ? (
          <div className="bg-card rounded-2xl border border-border p-6 h-40 animate-pulse flex items-center justify-center text-muted-foreground text-xs font-semibold">
            Carregando identificação...
          </div>
        ) : !customer ? (
          <div className="bg-card rounded-2xl border border-border p-6 space-y-4 shadow-sm">
            <div className="text-center space-y-2">
              <h2 className="text-lg font-bold">Identifique-se</h2>
              <p className="text-xs text-muted-foreground">Para salvar seus pontos e acompanhar a entrega, precisamos do seu login.</p>
            </div>

            <div className="flex bg-muted rounded-xl p-1 text-sm font-bold">
              <button
                onClick={() => setAuthMode('LOGIN')}
                className={`flex-1 py-2 rounded-lg transition-all ${
                  authMode === 'LOGIN' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground'
                }`}
              >
                Já tenho conta
              </button>
              <button
                onClick={() => setAuthMode('REGISTER')}
                className={`flex-1 py-2 rounded-lg transition-all ${
                  authMode === 'REGISTER' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground'
                }`}
              >
                Criar Cadastro
              </button>
            </div>

            {authError && (
              <p className="text-xs text-red-500 font-bold text-center bg-red-50 dark:bg-red-950/20 py-2 rounded-lg">
                {authError}
              </p>
            )}

            <form onSubmit={handleAuthSubmit} className="space-y-3.5">
              {authMode === 'REGISTER' && (
                <div className="relative">
                  <User className="absolute left-3.5 top-3.5 h-4.5 w-4.5 text-muted-foreground" />
                  <input
                    type="text"
                    required
                    placeholder="Seu nome completo"
                    value={authForm.name}
                    onChange={(e) => setAuthForm({ ...authForm, name: e.target.value })}
                    className="w-full pl-10 pr-4 py-3 rounded-xl bg-background border border-border text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
              )}

              <div className="relative">
                <Phone className="absolute left-3.5 top-3.5 h-4.5 w-4.5 text-muted-foreground" />
                <input
                  type="tel"
                  required
                  placeholder="Seu celular / WhatsApp (com DDD)"
                  value={authForm.phone}
                  onChange={(e) => setAuthForm({ ...authForm, phone: e.target.value })}
                  className="w-full pl-10 pr-4 py-3 rounded-xl bg-background border border-border text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-primary text-primary-foreground font-extrabold py-3.5 rounded-xl shadow-md hover:scale-[1.01] transition-transform text-sm"
              >
                {loading ? 'Processando...' : authMode === 'LOGIN' ? 'Entrar' : 'Cadastrar'}
              </button>
            </form>
          </div>
        ) : (
          /* Logged In Info */
          <div className="bg-card rounded-2xl border border-border p-4 shadow-sm flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 bg-primary/10 rounded-full flex items-center justify-center text-primary font-bold">
                {customer.name.charAt(0)}
              </div>
              <div>
                <p className="text-sm font-bold text-foreground">{customer.name}</p>
                <p className="text-xs text-muted-foreground">{customer.phone}</p>
              </div>
            </div>
            <button
              onClick={() => setCustomer(null)}
              className="text-xs font-bold text-primary border border-primary/20 px-3 py-1 rounded-lg hover:bg-primary/5"
            >
              Alterar
            </button>
          </div>
        )}

        {/* 3. Address details (If delivery) */}
        {customer && deliveryType === 'DELIVERY' && (
          <div className="bg-card rounded-2xl border border-border p-5 space-y-4 shadow-sm">
            <h3 className="font-bold text-sm uppercase tracking-wider text-muted-foreground">Endereço de Entrega</h3>
            
            <div className="space-y-3.5">
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="CEP (Ex: 01001000)"
                  value={addressForm.cep}
                  onChange={(e) => setAddressForm({ ...addressForm, cep: e.target.value })}
                  className="flex-1 p-3 rounded-xl bg-background border border-border text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-primary"
                />
                <button
                  type="button"
                  onClick={handleCepSearch}
                  disabled={searchingCep}
                  className="bg-muted text-foreground px-4 rounded-xl border border-border hover:bg-muted/80 text-xs font-bold flex items-center gap-1 shrink-0"
                >
                  <Search className="h-4 w-4" /> Buscar
                </button>
              </div>

              <div className="grid grid-cols-4 gap-2">
                <input
                  type="text"
                  placeholder="Rua / Logradouro"
                  value={addressForm.street}
                  onChange={(e) => setAddressForm({ ...addressForm, street: e.target.value })}
                  className="col-span-3 p-3 rounded-xl bg-background border border-border text-sm font-semibold focus:outline-none"
                />
                <input
                  type="text"
                  placeholder="Nº"
                  value={addressForm.number}
                  onChange={(e) => setAddressForm({ ...addressForm, number: e.target.value })}
                  className="col-span-1 p-3 rounded-xl bg-background border border-border text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  disabled
                  placeholder="Bairro"
                  value={addressForm.neighborhood}
                  className="p-3 rounded-xl bg-muted border border-border text-sm font-semibold text-muted-foreground"
                />
                <input
                  type="text"
                  disabled
                  placeholder="Cidade"
                  value={addressForm.city}
                  className="p-3 rounded-xl bg-muted border border-border text-sm font-semibold text-muted-foreground"
                />
              </div>
            </div>
          </div>
        )}

        {/* 4. Payments Section */}
        {customer && (
          <div className="bg-card rounded-2xl border border-border p-5 space-y-4 shadow-sm">
            <h3 className="font-bold text-sm uppercase tracking-wider text-muted-foreground">Forma de Pagamento</h3>
            
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => setPaymentMethod('PIX')}
                className={`flex flex-col items-center gap-2 p-3 rounded-xl border text-xs font-bold transition-all ${
                  paymentMethod === 'PIX'
                    ? 'bg-primary/5 border-primary text-primary shadow-sm'
                    : 'border-border hover:bg-muted'
                }`}
              >
                <Landmark className="h-5 w-5" />
                <span>PIX</span>
              </button>
              <button
                onClick={() => setPaymentMethod('CARD')}
                className={`flex flex-col items-center gap-2 p-3 rounded-xl border text-xs font-bold transition-all ${
                  paymentMethod === 'CARD'
                    ? 'bg-primary/5 border-primary text-primary shadow-sm'
                    : 'border-border hover:bg-muted'
                }`}
              >
                <CreditCard className="h-5 w-5" />
                <span>Cartão</span>
              </button>
              <button
                onClick={() => setPaymentMethod('CASH')}
                className={`flex flex-col items-center gap-2 p-3 rounded-xl border text-xs font-bold transition-all ${
                  paymentMethod === 'CASH'
                    ? 'bg-primary/5 border-primary text-primary shadow-sm'
                    : 'border-border hover:bg-muted'
                }`}
              >
                <DollarSign className="h-5 w-5" />
                <span>Dinheiro</span>
              </button>
            </div>

            {/* Sub-form based on choice */}
            {paymentMethod === 'PIX' && (
              <div className="bg-muted p-4 rounded-xl space-y-3 text-xs text-muted-foreground font-semibold">
                <p className="flex items-center gap-2 text-foreground font-bold">
                  <CheckCircle className="h-4.5 w-4.5 text-primary" /> PIX Copia e Cola / QR Code
                </p>
                <p>Ao finalizar, o QR Code de pagamento do PIX será gerado na tela para pagar em até 10 minutos.</p>
              </div>
            )}

            {paymentMethod === 'CARD' && (
              <div className="space-y-3.5 pt-2">
                <div className="flex bg-muted rounded-xl p-1 text-xs font-bold">
                  <button
                    type="button"
                    onClick={() => setCardPaymentType('ONLINE')}
                    className={`flex-1 py-2 rounded-lg transition-all ${
                      cardPaymentType === 'ONLINE' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground'
                    }`}
                  >
                    Pagar Online
                  </button>
                  <button
                    type="button"
                    onClick={() => setCardPaymentType(deliveryType === 'DELIVERY' ? 'DELIVERY_MACHINE' : 'PICKUP_MACHINE')}
                    className={`flex-1 py-2 rounded-lg transition-all ${
                      cardPaymentType !== 'ONLINE' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground'
                    }`}
                  >
                    {deliveryType === 'DELIVERY' ? 'Pagar na Entrega' : 'Pagar na Retirada'}
                  </button>
                </div>

                {cardPaymentType === 'ONLINE' ? (
                  <div className="space-y-3.5">
                    <input
                      type="text"
                      placeholder="Número do Cartão"
                      value={cardForm.number}
                      onChange={(e) => setCardForm({ ...cardForm, number: e.target.value })}
                      className="w-full p-3 rounded-xl bg-background border border-border text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="text"
                        placeholder="Validade (MM/AA)"
                        value={cardForm.expiry}
                        onChange={(e) => setCardForm({ ...cardForm, expiry: e.target.value })}
                        className="p-3 rounded-xl bg-background border border-border text-sm font-semibold focus:outline-none"
                      />
                      <input
                        type="text"
                        placeholder="CVV"
                        value={cardForm.cvv}
                        onChange={(e) => setCardForm({ ...cardForm, cvv: e.target.value })}
                        className="p-3 rounded-xl bg-background border border-border text-sm font-semibold focus:outline-none"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="bg-muted p-4 rounded-xl space-y-2 text-xs text-muted-foreground font-semibold">
                    <p className="flex items-center gap-2 text-foreground font-bold">
                      <CreditCard className="h-4.5 w-4.5 text-primary" /> Pagar com Maquininha
                    </p>
                    <p>
                      {deliveryType === 'DELIVERY' 
                        ? 'O entregador levará a maquininha de cartão (Crédito/Débito) até o seu endereço.'
                        : 'Você realizará o pagamento na maquininha de cartão (Crédito/Débito) ao retirar seu pedido no balcão.'}
                    </p>
                  </div>
                )}
              </div>
            )}

            {paymentMethod === 'CASH' && (
              <div className="space-y-2 pt-2">
                <label className="text-xs font-bold text-muted-foreground">Precisa de troco?</label>
                <input
                  type="number"
                  placeholder="Troco para quanto? (Ex: 50)"
                  value={changeFor || ''}
                  onChange={(e) => setChangeFor(e.target.value ? parseFloat(e.target.value) : undefined)}
                  className="w-full p-3 rounded-xl bg-background border border-border text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            )}
          </div>
        )}

        {/* Observações / Instruções */}
        {customer && (
          <div className="bg-card rounded-2xl border border-border p-5 space-y-3 shadow-sm">
            <h3 className="font-bold text-sm uppercase tracking-wider text-muted-foreground">Observações / Instruções</h3>
            <textarea
              placeholder="Ex: sem cebola, ponto da massa, portaria do prédio, etc."
              value={userNotes}
              onChange={(e) => setUserNotes(e.target.value)}
              className="w-full p-3 rounded-xl bg-background border border-border text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-primary h-20 resize-none"
            />
          </div>
        )}

      </div>

      {/* 5. Sticky checkout footer */}
      {customer && (
        <div className="fixed bottom-0 left-0 right-0 z-30 bg-card border-t border-border py-5 px-6 shadow-2xl">
          <div className="max-w-xl mx-auto flex items-center justify-between gap-4">
            <div className="flex flex-col">
              <span className="text-xs text-muted-foreground font-semibold uppercase">Total a Pagar</span>
              <span className="text-xl font-extrabold text-primary">R$ {total.toFixed(2)}</span>
            </div>
            <button
              onClick={handlePlaceOrder}
              disabled={loading}
              className="flex-1 bg-primary text-primary-foreground font-extrabold py-4 px-6 rounded-2xl shadow-lg shadow-primary/20 hover:scale-[1.01] transition-transform text-center text-sm disabled:opacity-50"
            >
              {loading ? 'Enviando Pedido...' : 'Confirmar Pedido'}
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
