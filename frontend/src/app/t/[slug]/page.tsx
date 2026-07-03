'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { apiRequest } from '@/lib/api';
import { useCartStore } from '@/store/cartStore';
import { 
  Search, ShoppingBag, Clock, MapPin, 
  Phone, Instagram, ChevronRight, Moon, Sun, Award, Flame, Sparkles 
} from 'lucide-react';

interface Option {
  id: string;
  name: string;
  price: number;
}

interface OptionGroup {
  id: string;
  name: string;
  minSelect: number;
  maxSelect: number;
  options: Option[];
}

interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  promoPrice?: number;
  imageUrl?: string;
  label?: 'NEW' | 'PROMO' | 'BESTSELLER' | 'EXCLUSIVE';
  optionGroups: OptionGroup[];
}

interface Category {
  id: string;
  name: string;
  products: Product[];
}

interface Tenant {
  id: string;
  name: string;
  logoUrl?: string;
  bannerUrl?: string;
  themeColor: string;
  configs?: {
    operatingHours: any;
    whatsappNumber?: string;
    deliveryMinTime: number;
    deliveryMaxTime: number;
  };
  deliveryAreas: { neighborhood: string; fee: number }[];
}

export default function DigitalMenu() {
  const { slug } = useParams();
  const router = useRouter();
  
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('');
  const [darkMode, setDarkMode] = useState(false);

  const cartItems = useCartStore((state) => state.items);
  const totalItems = cartItems.reduce((sum, item) => sum + item.quantity, 0);
  const subtotal = useCartStore((state) => state.getSubtotal());

  // Dark Mode toggle
  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
    if (!darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  useEffect(() => {
    async function loadData() {
      try {
        const tenantData = await apiRequest(`/tenants/${slug}`);
        setTenant(tenantData);

        const menuData = await apiRequest(`/menu`, {
          headers: { 'x-tenant-id': tenantData.id },
        });
        setCategories(menuData);
        if (menuData.length > 0) {
          setActiveCategory(menuData[0].id);
        }
      } catch (err) {
        console.error('Error loading menu:', err);
      } finally {
        setLoading(false);
      }
    }
    if (slug) loadData();
  }, [slug]);

  if (loading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-background text-foreground">
        <div className="text-center space-y-4">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto"></div>
          <p className="text-lg font-medium text-muted-foreground animate-pulse">Carregando cardápio gourmet...</p>
        </div>
      </div>
    );
  }

  if (!tenant) {
    return (
      <div className="flex h-screen w-screen flex-col items-center justify-center bg-background text-foreground text-center p-6">
        <h1 className="text-3xl font-extrabold text-primary mb-2">Trailer Não Encontrado</h1>
        <p className="text-muted-foreground mb-6">Desculpe, não conseguimos encontrar a lanchonete solicitada.</p>
        <button onClick={() => router.push('/')} className="bg-primary text-primary-foreground px-6 py-2 rounded-full font-semibold shadow-md">
          Voltar para Home
        </button>
      </div>
    );
  }

  const getLabelBadge = (label?: string) => {
    switch (label) {
      case 'BESTSELLER':
        return (
          <span className="flex items-center gap-1 bg-amber-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
            <Award className="h-3 w-3" /> Mais Vendido
          </span>
        );
      case 'PROMO':
        return (
          <span className="flex items-center gap-1 bg-green-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
            <Flame className="h-3 w-3" /> Promoção
          </span>
        );
      case 'NEW':
        return (
          <span className="flex items-center gap-1 bg-blue-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
            <Sparkles className="h-3 w-3" /> Novo
          </span>
        );
      case 'EXCLUSIVE':
        return (
          <span className="flex items-center gap-1 bg-purple-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
            Exclusivo
          </span>
        );
      default:
        return null;
    }
  };

  // Filter products by search query
  const filteredCategories = categories.map((cat) => ({
    ...cat,
    products: cat.products.filter(
      (prod) =>
        prod.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        prod.description.toLowerCase().includes(searchQuery.toLowerCase())
    ),
  })).filter((cat) => cat.products.length > 0);

  return (
    <div className="relative min-h-screen bg-background text-foreground transition-all duration-300 pb-28">
      
      {/* 1. Header Banner & Theme Toggle */}
      <div className="relative h-48 md:h-64 w-full bg-slate-800 overflow-hidden">
        {tenant.bannerUrl ? (
          <img src={tenant.bannerUrl} alt={tenant.name} className="h-full w-full object-cover opacity-60 filter blur-[1px]" />
        ) : (
          <div className="h-full w-full bg-gradient-to-r from-primary to-orange-500 opacity-65" />
        )}
        <div className="absolute top-4 right-4 z-10 flex gap-2">
          <button 
            onClick={toggleDarkMode}
            className="p-2 rounded-full bg-black/40 text-white hover:bg-black/60 backdrop-blur-md transition-colors"
          >
            {darkMode ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* 2. Brand Bio Card */}
      <div className="max-w-4xl mx-auto px-4 -mt-16 relative z-10">
        <div className="bg-card text-card-foreground p-6 rounded-2xl shadow-xl border border-border flex flex-col md:flex-row items-center md:items-start text-center md:text-left gap-6 transition-all duration-300">
          <div className="h-24 w-24 rounded-2xl bg-muted overflow-hidden border-2 border-primary shadow-lg shrink-0">
            {tenant.logoUrl ? (
              <img src={tenant.logoUrl} alt={tenant.name} className="h-full w-full object-cover" />
            ) : (
              <div className="h-full w-full flex items-center justify-center text-2xl font-bold bg-primary text-white">MT</div>
            )}
          </div>
          <div className="flex-1 space-y-2">
            <div className="flex flex-col sm:flex-row items-center gap-2 justify-center md:justify-start">
              <h1 className="text-3xl font-extrabold tracking-tight text-foreground">{tenant.name}</h1>
              <span className="bg-green-100 dark:bg-green-950 text-green-700 dark:text-green-300 text-xs px-2.5 py-0.5 rounded-full font-semibold animate-pulse flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-green-500"></span> Aberto
              </span>
            </div>
            <p className="text-sm text-muted-foreground font-medium">Os melhores pastéis gourmet, churros crocantes e bebidas geladas da cidade!</p>
            
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-y-2 gap-x-4 text-xs font-semibold text-muted-foreground pt-1 border-t border-border">
              <div className="flex items-center gap-1">
                <Clock className="h-4 w-4 text-primary" />
                <span>{tenant.configs?.deliveryMinTime}-{tenant.configs?.deliveryMaxTime} min</span>
              </div>
              <div className="flex items-center gap-1">
                <MapPin className="h-4 w-4 text-primary" />
                <span>Entrega a partir de R$ 5,00</span>
              </div>
              <div className="flex items-center gap-1">
                <Phone className="h-4 w-4 text-primary" />
                <span>Contato e Suporte</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Search & Categories Slider */}
      <div className="max-w-4xl mx-auto px-4 mt-8 space-y-4">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-4 top-3.5 h-5 w-5 text-muted-foreground" />
          <input
            type="text"
            placeholder="O que você quer comer hoje?"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-3 rounded-2xl bg-card border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary shadow-sm transition-all duration-300"
          />
        </div>

        {/* Categories Bar */}
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none snap-x -mx-4 px-4">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => {
                setActiveCategory(cat.id);
                document.getElementById(`category-${cat.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
              }}
              className={`px-5 py-2.5 rounded-full font-bold text-sm shrink-0 transition-all duration-300 border ${
                activeCategory === cat.id
                  ? 'bg-primary text-primary-foreground border-primary shadow-md shadow-primary/20 scale-105'
                  : 'bg-card text-muted-foreground border-border hover:text-foreground'
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>
      </div>

      {/* 4. Products Menu */}
      <div className="max-w-4xl mx-auto px-4 mt-8 space-y-12">
        {filteredCategories.length > 0 ? (
          filteredCategories.map((cat) => (
            <div key={cat.id} id={`category-${cat.id}`} className="space-y-4 scroll-mt-24">
              <h2 className="text-xl font-extrabold tracking-tight border-l-4 border-primary pl-3">{cat.name}</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {cat.products.map((product) => (
                  <div
                    key={product.id}
                    onClick={() => router.push(`/t/${slug}/product/${product.id}`)}
                    className="bg-card text-card-foreground p-4 rounded-2xl border border-border flex items-start gap-4 hover:shadow-md transition-all duration-300 cursor-pointer hover:border-primary group"
                  >
                    <div className="flex-1 space-y-2">
                      <div className="flex flex-wrap items-center gap-1.5">
                        {getLabelBadge(product.label)}
                        <h3 className="text-base font-bold group-hover:text-primary transition-colors">{product.name}</h3>
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-2">{product.description}</p>
                      <div className="flex items-center gap-2">
                        {product.promoPrice ? (
                          <>
                            <span className="text-base font-extrabold text-primary">R$ {product.promoPrice.toFixed(2)}</span>
                            <span className="text-xs line-through text-muted-foreground">R$ {product.price.toFixed(2)}</span>
                          </>
                        ) : (
                          <span className="text-base font-extrabold text-foreground">R$ {product.price.toFixed(2)}</span>
                        )}
                      </div>
                    </div>
                    {product.imageUrl && (
                      <div className="h-20 w-20 rounded-xl overflow-hidden shrink-0 bg-muted border border-border">
                        <img src={product.imageUrl} alt={product.name} className="h-full w-full object-cover" />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))
        ) : (
          <div className="text-center p-12 bg-card rounded-2xl border border-border">
            <ShoppingBag className="h-10 w-10 text-muted-foreground mx-auto mb-2" />
            <p className="text-muted-foreground font-semibold">Nenhum pastel ou churro encontrado para sua busca.</p>
          </div>
        )}
      </div>

      {/* 5. Trailer Bio / FAQ */}
      <div className="max-w-4xl mx-auto px-4 mt-16 border-t border-border pt-10 grid grid-cols-1 md:grid-cols-2 gap-8 text-muted-foreground text-sm font-medium">
        <div className="space-y-4">
          <h3 className="text-foreground font-bold text-lg">Informações do Trailer</h3>
          <p>Trabalhamos com ingredientes frescos do dia, massa artesanal e frita na hora em óleo limpo!</p>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-primary" />
              <span>Terça a Domingo - 18:00 às 23:30</span>
            </div>
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-primary" />
              <span>Av. Central dos Pasteis, 99 - Estacionamento do Menino</span>
            </div>
          </div>
          <div className="flex gap-4 pt-2">
            <a href="https://instagram.com" target="_blank" className="p-2 rounded-full bg-card border border-border text-foreground hover:text-primary transition-colors">
              <Instagram className="h-5 w-5" />
            </a>
            <a href="https://whatsapp.com" target="_blank" className="p-2 rounded-full bg-card border border-border text-foreground hover:text-green-500 transition-colors">
              <Phone className="h-5 w-5" />
            </a>
          </div>
        </div>
        <div className="space-y-4">
          <h3 className="text-foreground font-bold text-lg">Perguntas Frequentes (FAQ)</h3>
          <div className="space-y-3">
            <div>
              <p className="font-bold text-foreground">Como funciona o Cashback?</p>
              <p className="text-xs">Você ganha 5% do valor total de cada pedido de volta na sua carteira virtual para usar no próximo pastel!</p>
            </div>
            <div>
              <p className="font-bold text-foreground">Posso retirar no trailer?</p>
              <p className="text-xs">Sim, basta selecionar a opção &quot;Retirada&quot; no carrinho de compras antes de finalizar o pedido.</p>
            </div>
          </div>
        </div>
      </div>

      {/* 6. Floating Cart Notification */}
      {totalItems > 0 && (
        <div className="fixed bottom-6 left-4 right-4 z-40 max-w-lg mx-auto">
          <button
            onClick={() => router.push(`/t/${slug}/cart`)}
            className="w-full bg-primary text-primary-foreground py-4 px-6 rounded-2xl flex items-center justify-between shadow-xl shadow-primary/30 hover:scale-[1.02] transition-transform duration-300"
          >
            <div className="flex items-center gap-3">
              <div className="bg-white/20 px-2.5 py-1 rounded-lg text-sm font-extrabold flex items-center justify-center">
                {totalItems}
              </div>
              <span className="font-extrabold tracking-wide text-sm">Ver minha sacola</span>
            </div>
            <div className="flex items-center gap-1 font-extrabold text-base">
              <span>R$ {subtotal.toFixed(2)}</span>
              <ChevronRight className="h-5 w-5" />
            </div>
          </button>
        </div>
      )}

    </div>
  );
}
