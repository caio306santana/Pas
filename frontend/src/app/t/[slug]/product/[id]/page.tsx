'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { apiRequest } from '@/lib/api';
import { useCartStore, CartOption } from '@/store/cartStore';
import { ChevronLeft, Plus, Minus, Check, AlertCircle } from 'lucide-react';

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
  
  // Maps group ID to array of selected option IDs
  const [selections, setSelections] = useState<Record<string, string[]>>({});
  const [errorMsg, setErrorMsg] = useState('');

  const addItem = useCartStore((state) => state.addItem);

  useEffect(() => {
    async function loadProduct() {
      try {
        const prod = await apiRequest(`/menu/product/${id}`);
        setProduct(prod);
        
        // Initialize default selections
        const initialSelections: Record<string, string[]> = {};
        prod.optionGroups.forEach((group: OptionGroup) => {
          // If minSelect is 1 and it's a radio select, we can auto-select the first option
          if (group.minSelect === 1 && group.maxSelect === 1 && group.options.length > 0) {
            initialSelections[group.id] = [group.options[0].id];
          } else {
            initialSelections[group.id] = [];
          }
        });
        setSelections(initialSelections);
      } catch (err) {
        console.error('Error fetching product:', err);
      } finally {
        setLoading(false);
      }
    }
    if (id) loadProduct();
  }, [id]);

  if (loading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-background text-foreground">
        <div className="text-center space-y-4">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto"></div>
          <p className="text-lg font-medium text-muted-foreground animate-pulse">Carregando detalhes do pastel...</p>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="flex h-screen w-screen flex-col items-center justify-center bg-background text-foreground text-center p-6">
        <h1 className="text-3xl font-extrabold text-primary">Produto não encontrado</h1>
        <button onClick={() => router.push(`/t/${slug}`)} className="mt-4 bg-primary text-primary-foreground px-6 py-2 rounded-full font-semibold">
          Voltar ao Cardápio
        </button>
      </div>
    );
  }

  const basePrice = product.promoPrice ?? product.price;

  // Toggle selection handler
  const handleSelectOption = (groupId: string, optionId: string, group: OptionGroup) => {
    setSelections((prev) => {
      const selected = prev[groupId] || [];
      
      // Radio mode (maxSelect = 1)
      if (group.maxSelect === 1) {
        return {
          ...prev,
          [groupId]: [optionId],
        };
      }
      
      // Checkbox mode
      if (selected.includes(optionId)) {
        // Remove option
        return {
          ...prev,
          [groupId]: selected.filter((id) => id !== optionId),
        };
      } else {
        // Add option if under maxSelect limit
        if (selected.length < group.maxSelect) {
          return {
            ...prev,
            [groupId]: [...selected, optionId],
          };
        }
        return prev;
      }
    });
  };

  // Compute options prices
  const getSelectedOptionsPrice = () => {
    let priceSum = 0;
    product.optionGroups.forEach((group) => {
      const selectedIds = selections[group.id] || [];
      selectedIds.forEach((optId) => {
        const option = group.options.find((o) => o.id === optId);
        if (option) priceSum += option.price;
      });
    });
    return priceSum;
  };

  const optionsPriceTotal = getSelectedOptionsPrice();
  const totalPrice = (basePrice + optionsPriceTotal) * quantity;

  // Validate additions
  const handleAddToCart = () => {
    // Check minSelect constraints for all groups
    for (const group of product.optionGroups) {
      const selectedIds = selections[group.id] || [];
      if (selectedIds.length < group.minSelect) {
        setErrorMsg(`Por favor, selecione pelo menos ${group.minSelect} opção(ões) em "${group.name}".`);
        return;
      }
    }

    // Build options payload for store
    const chosenOptions: CartOption[] = [];
    product.optionGroups.forEach((group) => {
      const selectedIds = selections[group.id] || [];
      selectedIds.forEach((optId) => {
        const opt = group.options.find((o) => o.id === optId);
        if (opt) {
          chosenOptions.push({
            groupName: group.name,
            optionName: opt.name,
            price: opt.price,
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
    <div className="relative min-h-screen bg-background text-foreground pb-32">
      
      {/* 1. Header Bar */}
      <div className="fixed top-0 left-0 right-0 z-30 bg-card border-b border-border py-4 px-4 flex items-center justify-between">
        <button onClick={() => router.back()} className="p-2 rounded-full hover:bg-muted transition-colors">
          <ChevronLeft className="h-6 w-6 text-foreground" />
        </button>
        <span className="font-extrabold text-sm uppercase tracking-wider text-muted-foreground">Personalizar</span>
        <div className="w-10"></div>
      </div>

      <div className="max-w-xl mx-auto px-4 pt-20 space-y-6">
        
        {/* 2. Product Image and Bio */}
        {product.imageUrl && (
          <div className="h-64 w-full rounded-2xl overflow-hidden bg-muted border border-border shadow-sm">
            <img src={product.imageUrl} alt={product.name} className="h-full w-full object-cover" />
          </div>
        )}
        
        <div className="space-y-2">
          <h1 className="text-2xl font-extrabold tracking-tight">{product.name}</h1>
          <p className="text-sm text-muted-foreground leading-relaxed">{product.description}</p>
          <div className="text-xl font-extrabold text-primary">
            R$ {basePrice.toFixed(2)}
          </div>
        </div>

        {errorMsg && (
          <div className="bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 p-4 rounded-xl flex items-center gap-3 border border-red-200 dark:border-red-900/50 text-sm font-semibold">
            <AlertCircle className="h-5 w-5 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* 3. Option Groups Selection */}
        <div className="space-y-6">
          {product.optionGroups.map((group) => {
            const selectedIds = selections[group.id] || [];
            return (
              <div key={group.id} className="bg-card rounded-2xl border border-border p-5 space-y-4">
                <div className="flex justify-between items-center pb-2 border-b border-border">
                  <div>
                    <h3 className="font-bold text-base text-foreground">{group.name}</h3>
                    <p className="text-xs text-muted-foreground font-semibold">
                      {group.minSelect > 0 ? `Obrigatório • ` : `Opcional • `}
                      Selecione {group.minSelect === group.maxSelect ? group.minSelect : `de ${group.minSelect} a ${group.maxSelect}`}
                    </p>
                  </div>
                  {selectedIds.length >= group.minSelect && (
                    <span className="bg-green-100 dark:bg-green-950 text-green-700 dark:text-green-300 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">
                      OK
                    </span>
                  )}
                </div>

                <div className="space-y-3">
                  {group.options.map((opt) => {
                    const isSelected = selectedIds.includes(opt.id);
                    return (
                      <div
                        key={opt.id}
                        onClick={() => {
                          setErrorMsg('');
                          handleSelectOption(group.id, opt.id, group);
                        }}
                        className={`flex items-center justify-between p-3.5 rounded-xl border cursor-pointer transition-all duration-200 ${
                          isSelected
                            ? 'bg-primary/5 border-primary shadow-sm'
                            : 'border-border hover:bg-muted'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`h-5 w-5 rounded-md border flex items-center justify-center transition-all ${
                            isSelected ? 'bg-primary border-primary text-white scale-105' : 'border-border bg-background'
                          }`}>
                            {isSelected && <Check className="h-3 w-3 stroke-[3]" />}
                          </div>
                          <span className="font-semibold text-sm">{opt.name}</span>
                        </div>
                        {opt.price > 0 && (
                          <span className="text-xs font-bold text-primary">+ R$ {opt.price.toFixed(2)}</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {/* 4. Special Notes */}
        <div className="bg-card rounded-2xl border border-border p-5 space-y-3">
          <h3 className="font-bold text-base">Alguma observação?</h3>
          <textarea
            placeholder="Ex: sem cebola, sem milho, bem passado, etc."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full h-24 p-3 rounded-xl bg-background border border-border text-foreground placeholder:text-muted-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
          />
        </div>

        {/* 5. Quantity Controls */}
        <div className="flex items-center justify-between bg-card rounded-2xl border border-border p-5">
          <span className="font-bold text-base">Quantidade</span>
          <div className="flex items-center gap-4">
            <button
              onClick={() => setQuantity(Math.max(1, quantity - 1))}
              className="p-2.5 rounded-full border border-border hover:bg-muted transition-colors"
            >
              <Minus className="h-4 w-4" />
            </button>
            <span className="text-lg font-extrabold w-6 text-center">{quantity}</span>
            <button
              onClick={() => setQuantity(quantity + 1)}
              className="p-2.5 rounded-full border border-border hover:bg-muted transition-colors"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>
        </div>

      </div>

      {/* 6. Sticky Total Bar */}
      <div className="fixed bottom-0 left-0 right-0 z-30 bg-card border-t border-border py-5 px-6 shadow-2xl">
        <div className="max-w-xl mx-auto flex items-center justify-between gap-4">
          <div className="flex flex-col">
            <span className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Total</span>
            <span className="text-2xl font-extrabold text-foreground">R$ {totalPrice.toFixed(2)}</span>
          </div>
          <button
            onClick={handleAddToCart}
            className="flex-1 bg-primary text-primary-foreground font-extrabold py-4 px-6 rounded-2xl shadow-lg shadow-primary/20 hover:scale-[1.01] transition-transform text-center text-sm"
          >
            Adicionar à sacola
          </button>
        </div>
      </div>

    </div>
  );
}
