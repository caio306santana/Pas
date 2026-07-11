'use client';

/* eslint-disable @next/next/no-img-element -- tenant product images may use dynamic URLs */

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { apiRequest } from '@/lib/api';
import { CartOption, useCartStore } from '@/store/cartStore';
import { AlertCircle, Check, ChevronLeft, Minus, Plus, ShoppingBag } from 'lucide-react';

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
  optionGroups: OptionGroup[];
}

export default function ProductCustomization() {
  const { slug, id } = useParams();
  const router = useRouter();

  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const [notes, setNotes] = useState('');
  const [selections, setSelections] = useState<Record<string, string[]>>({});
  const [errorMsg, setErrorMsg] = useState('');

  const addItem = useCartStore((state) => state.addItem);

  useEffect(() => {
    async function loadProduct() {
      try {
        const prod = await apiRequest(`/menu/product/${id}`);
        setProduct(prod);

        const initialSelections: Record<string, string[]> = {};
        prod.optionGroups.forEach((group: OptionGroup) => {
          initialSelections[group.id] =
            group.minSelect === 1 && group.maxSelect === 1 && group.options.length > 0
              ? [group.options[0].id]
              : [];
        });
        setSelections(initialSelections);
      } catch (err) {
        console.error('Error fetching product:', err);
      } finally {
        setLoading(false);
      }
    }

    if (id) {
      loadProduct();
    }
  }, [id]);

  if (loading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-background text-foreground">
        <div className="text-center space-y-4">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto" />
          <p className="text-sm font-semibold text-muted-foreground">Carregando produto...</p>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="flex h-screen w-screen flex-col items-center justify-center bg-background text-foreground text-center p-6">
        <h1 className="text-2xl font-black text-primary">Produto nao encontrado</h1>
        <button
          onClick={() => router.push(`/t/${slug}`)}
          className="mt-5 rounded-lg bg-primary px-5 py-2.5 text-sm font-black text-primary-foreground"
        >
          Voltar ao cardapio
        </button>
      </div>
    );
  }

  const basePrice = product.promoPrice ?? product.price;

  const handleSelectOption = (groupId: string, optionId: string, group: OptionGroup) => {
    setSelections((prev) => {
      const selected = prev[groupId] || [];

      if (group.maxSelect === 1) {
        return { ...prev, [groupId]: [optionId] };
      }

      if (selected.includes(optionId)) {
        return { ...prev, [groupId]: selected.filter((selectedId) => selectedId !== optionId) };
      }

      if (selected.length < group.maxSelect) {
        return { ...prev, [groupId]: [...selected, optionId] };
      }

      return prev;
    });
  };

  const optionsPriceTotal = product.optionGroups.reduce((sum, group) => {
    const selectedIds = selections[group.id] || [];
    return (
      sum +
      selectedIds.reduce((groupSum, optionId) => {
        const option = group.options.find((item) => item.id === optionId);
        return groupSum + (option?.price || 0);
      }, 0)
    );
  }, 0);

  const totalPrice = (basePrice + optionsPriceTotal) * quantity;

  const handleAddToCart = () => {
    for (const group of product.optionGroups) {
      const selectedIds = selections[group.id] || [];
      if (selectedIds.length < group.minSelect) {
        setErrorMsg(`Selecione pelo menos ${group.minSelect} opcao em "${group.name}".`);
        return;
      }
    }

    const chosenOptions: CartOption[] = [];
    product.optionGroups.forEach((group) => {
      const selectedIds = selections[group.id] || [];
      selectedIds.forEach((optionId) => {
        const option = group.options.find((item) => item.id === optionId);
        if (option) {
          chosenOptions.push({
            groupName: group.name,
            optionName: option.name,
            price: option.price,
          });
        }
      });
    });

    addItem({
      productId: product.id,
      name: product.name,
      basePrice,
      quantity,
      imageUrl: product.imageUrl,
      notes,
      options: chosenOptions,
    });

    router.push(`/t/${slug}`);
  };

  return (
    <main className="min-h-screen bg-background text-foreground pb-28">
      <header className="sticky top-0 z-30 border-b border-border bg-card/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-3xl items-center justify-between px-4">
          <button onClick={() => router.back()} className="rounded-lg p-2 transition hover:bg-muted" title="Voltar">
            <ChevronLeft className="h-6 w-6" />
          </button>
          <span className="text-sm font-black uppercase text-muted-foreground">Personalizar item</span>
          <div className="w-10" />
        </div>
      </header>

      <div className="mx-auto max-w-3xl px-4 py-6">
        <section className="grid gap-5 md:grid-cols-[280px_1fr] md:items-start">
          <div className="overflow-hidden rounded-lg border border-border bg-muted">
            {product.imageUrl ? (
              <img src={product.imageUrl} alt={product.name} className="aspect-square h-full w-full object-cover" />
            ) : (
              <div className="grid aspect-square place-items-center text-primary">
                <ShoppingBag className="h-12 w-12" />
              </div>
            )}
          </div>

          <div className="space-y-4">
            <div>
              <h1 className="text-3xl font-black leading-tight">{product.name}</h1>
              <p className="mt-2 text-sm font-medium leading-6 text-muted-foreground">{product.description}</p>
            </div>

            <div className="rounded-lg border border-border bg-card p-4">
              <p className="text-xs font-black uppercase text-muted-foreground">Preco base</p>
              <div className="mt-1 flex items-center gap-2">
                <span className="text-2xl font-black text-primary">R$ {basePrice.toFixed(2)}</span>
                {product.promoPrice && (
                  <span className="text-sm font-bold text-muted-foreground line-through">
                    R$ {product.price.toFixed(2)}
                  </span>
                )}
              </div>
            </div>
          </div>
        </section>

        {errorMsg && (
          <div className="mt-5 flex items-center gap-3 rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-sm font-bold text-red-600">
            <AlertCircle className="h-5 w-5 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <section className="mt-6 space-y-4">
          {product.optionGroups.map((group) => {
            const selectedIds = selections[group.id] || [];
            const complete = selectedIds.length >= group.minSelect;

            return (
              <div key={group.id} className="rounded-lg border border-border bg-card p-5">
                <div className="mb-4 flex items-start justify-between gap-4 border-b border-border pb-3">
                  <div>
                    <h2 className="font-black">{group.name}</h2>
                    <p className="mt-1 text-xs font-bold text-muted-foreground">
                      {group.minSelect > 0 ? 'Obrigatorio' : 'Opcional'} - selecione{' '}
                      {group.minSelect === group.maxSelect ? group.minSelect : `de ${group.minSelect} a ${group.maxSelect}`}
                    </p>
                  </div>
                  {complete && (
                    <span className="rounded-full bg-green-100 px-2 py-1 text-[10px] font-black text-green-800 dark:bg-green-950 dark:text-green-200">
                      OK
                    </span>
                  )}
                </div>

                <div className="space-y-2">
                  {group.options.map((option) => {
                    const isSelected = selectedIds.includes(option.id);

                    return (
                      <button
                        key={option.id}
                        onClick={() => {
                          setErrorMsg('');
                          handleSelectOption(group.id, option.id, group);
                        }}
                        className={`flex w-full items-center justify-between gap-4 rounded-lg border p-3 text-left transition ${
                          isSelected ? 'border-primary bg-primary/10' : 'border-border hover:bg-muted'
                        }`}
                      >
                        <span className="flex items-center gap-3">
                          <span
                            className={`grid h-5 w-5 place-items-center rounded border ${
                              isSelected ? 'border-primary bg-primary text-white' : 'border-border bg-background'
                            }`}
                          >
                            {isSelected && <Check className="h-3 w-3 stroke-[4]" />}
                          </span>
                          <span className="text-sm font-bold">{option.name}</span>
                        </span>
                        {option.price > 0 && (
                          <span className="text-xs font-black text-primary">+ R$ {option.price.toFixed(2)}</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}

          <div className="rounded-lg border border-border bg-card p-5">
            <label className="text-sm font-black" htmlFor="notes">
              Observacoes
            </label>
            <textarea
              id="notes"
              placeholder="Ex: sem cebola, massa mais crocante, retirar molho..."
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              className="mt-3 h-24 w-full resize-none rounded-lg border border-border bg-background p-3 text-sm font-medium outline-none transition focus:border-primary"
            />
          </div>

          <div className="flex items-center justify-between rounded-lg border border-border bg-card p-5">
            <span className="font-black">Quantidade</span>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                className="rounded-lg border border-border p-2 transition hover:bg-muted"
                title="Diminuir"
              >
                <Minus className="h-4 w-4" />
              </button>
              <span className="w-8 text-center text-lg font-black">{quantity}</span>
              <button
                onClick={() => setQuantity(quantity + 1)}
                className="rounded-lg border border-border p-2 transition hover:bg-muted"
                title="Aumentar"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
          </div>
        </section>
      </div>

      <footer className="fixed bottom-0 left-0 right-0 z-30 border-t border-border bg-card/95 px-4 py-3 shadow-2xl backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase text-muted-foreground">Total</p>
            <p className="text-2xl font-black">R$ {totalPrice.toFixed(2)}</p>
          </div>
          <button
            onClick={handleAddToCart}
            className="h-14 flex-1 rounded-lg bg-primary px-5 text-sm font-black text-primary-foreground transition hover:brightness-95"
          >
            Adicionar a sacola
          </button>
        </div>
      </footer>
    </main>
  );
}
