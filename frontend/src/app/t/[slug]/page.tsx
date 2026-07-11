'use client';

/* eslint-disable @next/next/no-img-element -- tenant branding and product images use dynamic URLs */

import React, { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { apiRequest } from '@/lib/api';
import { useCartStore } from '@/store/cartStore';
import {
  Award,
  ChevronRight,
  Clock,
  Flame,
  MapPin,
  Moon,
  Search,
  ShoppingBag,
  Sparkles,
  Sun,
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
  const subtotal = useCartStore((state) => state.getSubtotal());
  const totalItems = cartItems.reduce((sum, item) => sum + item.quantity, 0);

  useEffect(() => {
    async function loadData() {
      try {
        const tenantData = await apiRequest(`/tenants/${slug}`);
        setTenant(tenantData);

        const menuData = await apiRequest('/menu', {
          headers: { 'x-tenant-id': tenantData.id },
        });
        setCategories(menuData);
        setActiveCategory(menuData[0]?.id || '');
      } catch (err) {
        console.error('Error loading menu:', err);
      } finally {
        setLoading(false);
      }
    }

    if (slug) {
      loadData();
    }
  }, [slug]);

  const filteredCategories = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) {
      return categories;
    }

    return categories
      .map((category) => ({
        ...category,
        products: category.products.filter((product) =>
          `${product.name} ${product.description}`.toLowerCase().includes(query),
        ),
      }))
      .filter((category) => category.products.length > 0);
  }, [categories, searchQuery]);

  const toggleDarkMode = () => {
    setDarkMode((current) => {
      document.documentElement.classList.toggle('dark', !current);
      return !current;
    });
  };

  if (loading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-background text-foreground">
        <div className="text-center space-y-4">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto" />
          <p className="text-sm font-semibold text-muted-foreground">Carregando cardapio...</p>
        </div>
      </div>
    );
  }

  if (!tenant) {
    return (
      <div className="flex h-screen w-screen flex-col items-center justify-center bg-background text-foreground text-center p-6">
        <h1 className="text-2xl font-extrabold text-primary">Loja nao encontrada</h1>
        <p className="mt-2 text-sm text-muted-foreground">Confira o link e tente novamente.</p>
        <button
          onClick={() => router.push('/')}
          className="mt-6 bg-primary text-primary-foreground px-5 py-2.5 rounded-lg font-bold"
        >
          Voltar
        </button>
      </div>
    );
  }

  const deliveryMin = tenant.configs?.deliveryMinTime ?? 35;
  const deliveryMax = tenant.configs?.deliveryMaxTime ?? 55;
  const firstDeliveryFee = tenant.deliveryAreas?.[0]?.fee ?? 5;

  const getLabelBadge = (label?: string) => {
    const badgeClass = 'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-black uppercase';

    switch (label) {
      case 'BESTSELLER':
        return (
          <span className={`${badgeClass} bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200`}>
            <Award className="h-3 w-3" /> Mais vendido
          </span>
        );
      case 'PROMO':
        return (
          <span className={`${badgeClass} bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-200`}>
            <Flame className="h-3 w-3" /> Promocao
          </span>
        );
      case 'NEW':
        return (
          <span className={`${badgeClass} bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-200`}>
            <Sparkles className="h-3 w-3" /> Novo
          </span>
        );
      case 'EXCLUSIVE':
        return <span className={`${badgeClass} bg-primary/10 text-primary`}>Exclusivo</span>;
      default:
        return null;
    }
  };

  return (
    <main className="min-h-screen bg-background text-foreground pb-28">
      <section className="relative border-b border-border bg-card">
        <div className="absolute inset-x-0 top-0 h-36 overflow-hidden bg-muted">
          {tenant.bannerUrl ? (
            <img src={tenant.bannerUrl} alt={tenant.name} className="h-full w-full object-cover opacity-85" />
          ) : (
            <div className="h-full w-full bg-[linear-gradient(110deg,#2f2a22,#d46a16)]" />
          )}
          <div className="absolute inset-0 bg-gradient-to-b from-black/10 to-card" />
        </div>

        <div className="relative mx-auto max-w-5xl px-4 pt-20 pb-6">
          <div className="flex items-end justify-between gap-4">
            <div className="flex items-end gap-4">
              <div className="h-24 w-24 overflow-hidden rounded-lg border border-border bg-card shadow-lg">
                {tenant.logoUrl ? (
                  <img src={tenant.logoUrl} alt={tenant.name} className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-primary text-2xl font-black text-white">
                    MT
                  </div>
                )}
              </div>
              <div className="pb-1">
                <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-green-100 px-3 py-1 text-xs font-black text-green-800 dark:bg-green-950 dark:text-green-200">
                  <span className="h-2 w-2 rounded-full bg-green-500" />
                  Aberto agora
                </div>
                <h1 className="text-3xl font-black tracking-tight md:text-4xl">{tenant.name}</h1>
                <p className="mt-1 max-w-2xl text-sm font-medium text-muted-foreground">
                  Pasteis, churros e bebidas preparados para pedir sem fila.
                </p>
              </div>
            </div>

            <button
              onClick={toggleDarkMode}
              title="Alternar tema"
              className="mb-2 hidden rounded-lg border border-border bg-card p-2.5 text-foreground shadow-sm transition hover:bg-muted sm:block"
            >
              {darkMode ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </button>
          </div>

          <div className="mt-6 grid grid-cols-3 gap-2 text-xs font-bold text-muted-foreground">
            <div className="flex items-center gap-2 rounded-lg border border-border bg-background p-3">
              <Clock className="h-4 w-4 text-primary" />
              <span>{deliveryMin}-{deliveryMax} min</span>
            </div>
            <div className="flex items-center gap-2 rounded-lg border border-border bg-background p-3">
              <MapPin className="h-4 w-4 text-primary" />
              <span>Entrega desde R$ {firstDeliveryFee.toFixed(2)}</span>
            </div>
            <button
              onClick={() => router.push(`/t/${slug}/cart`)}
              className="flex items-center justify-between rounded-lg border border-primary/30 bg-primary/10 p-3 text-left text-primary"
            >
              <span>Sacola</span>
              <span>{totalItems} itens</span>
            </button>
          </div>
        </div>
      </section>

      <section className="sticky top-0 z-20 border-b border-border bg-background/95 backdrop-blur">
        <div className="mx-auto max-w-5xl px-4 py-3">
          <div className="grid gap-3 md:grid-cols-[1fr_auto]">
            <label className="relative block">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder="Buscar pasteis, churros ou bebidas"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                className="h-11 w-full rounded-lg border border-border bg-card pl-10 pr-4 text-sm font-semibold outline-none transition focus:border-primary"
              />
            </label>

            <div className="flex gap-2 overflow-x-auto md:max-w-md">
              {categories.map((category) => (
                <button
                  key={category.id}
                  onClick={() => {
                    setActiveCategory(category.id);
                    document.getElementById(`category-${category.id}`)?.scrollIntoView({
                      behavior: 'smooth',
                      block: 'start',
                    });
                  }}
                  className={`h-11 shrink-0 rounded-lg border px-4 text-sm font-black transition ${
                    activeCategory === category.id
                      ? 'border-primary bg-primary text-primary-foreground'
                      : 'border-border bg-card text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {category.name}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-4 py-8">
        {filteredCategories.length > 0 ? (
          <div className="space-y-10">
            {filteredCategories.map((category) => (
              <div key={category.id} id={`category-${category.id}`} className="scroll-mt-24">
                <div className="mb-4 flex items-end justify-between border-b border-border pb-3">
                  <div>
                    <h2 className="text-xl font-black">{category.name}</h2>
                    <p className="text-xs font-bold text-muted-foreground">{category.products.length} opcoes</p>
                  </div>
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  {category.products.map((product) => {
                    const price = product.promoPrice ?? product.price;

                    return (
                      <button
                        key={product.id}
                        onClick={() => router.push(`/t/${slug}/product/${product.id}`)}
                        className="group grid min-h-32 grid-cols-[1fr_auto] gap-4 rounded-lg border border-border bg-card p-4 text-left shadow-sm transition hover:border-primary hover:-translate-y-0.5"
                      >
                        <div className="flex min-w-0 flex-col">
                          <div className="mb-2 flex flex-wrap items-center gap-2">
                            {getLabelBadge(product.label)}
                          </div>
                          <h3 className="text-base font-black leading-tight group-hover:text-primary">{product.name}</h3>
                          <p className="mt-1 line-clamp-2 text-xs font-medium leading-5 text-muted-foreground">
                            {product.description}
                          </p>
                          <div className="mt-auto flex items-center gap-2 pt-3">
                            <span className="text-base font-black text-foreground">R$ {price.toFixed(2)}</span>
                            {product.promoPrice && (
                              <span className="text-xs font-bold text-muted-foreground line-through">
                                R$ {product.price.toFixed(2)}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="h-24 w-24 overflow-hidden rounded-lg border border-border bg-muted">
                          {product.imageUrl ? (
                            <img src={product.imageUrl} alt={product.name} className="h-full w-full object-cover" />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center text-primary">
                              <ShoppingBag className="h-7 w-7" />
                            </div>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-lg border border-border bg-card p-10 text-center">
            <ShoppingBag className="mx-auto mb-3 h-9 w-9 text-muted-foreground" />
            <p className="font-black">Nada encontrado</p>
            <p className="mt-1 text-sm text-muted-foreground">Tente buscar por outro produto.</p>
          </div>
        )}
      </section>

      {totalItems > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-card/95 px-4 py-3 shadow-2xl backdrop-blur">
          <button
            onClick={() => router.push(`/t/${slug}/cart`)}
            className="mx-auto flex h-14 w-full max-w-xl items-center justify-between rounded-lg bg-primary px-4 text-primary-foreground shadow-lg transition hover:brightness-95"
          >
            <span className="flex items-center gap-3 text-sm font-black">
              <span className="grid h-7 min-w-7 place-items-center rounded-md bg-white/20 px-2">{totalItems}</span>
              Ver sacola
            </span>
            <span className="flex items-center gap-1 text-base font-black">
              R$ {subtotal.toFixed(2)}
              <ChevronRight className="h-5 w-5" />
            </span>
          </button>
        </div>
      )}
    </main>
  );
}
