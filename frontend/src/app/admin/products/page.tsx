'use client';

import React, { useEffect, useState, useRef } from 'react';
import AdminLayout from '@/components/AdminLayout';
import { apiRequest, API_BASE } from '@/lib/api';
import {
  Plus, Pencil, Trash2, Upload, X, Check, ImageIcon,
  ToggleLeft, ToggleRight, ChevronDown, ChevronUp
} from 'lucide-react';

interface Category {
  id: string;
  name: string;
}

interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  promoPrice: number | null;
  imageUrl: string | null;
  isAvailable: boolean;
  label: string | null;
  categoryId: string;
  category?: { name: string };
}

const LABEL_OPTIONS = [
  { value: '', label: 'Sem destaque' },
  { value: 'BESTSELLER', label: '🔥 Mais Vendido' },
  { value: 'NEW', label: '🆕 Novidade' },
  { value: 'PROMO', label: '🏷️ Promoção' },
  { value: 'EXCLUSIVE', label: '⭐ Exclusivo' },
];

const emptyForm = {
  name: '',
  description: '',
  price: '',
  promoPrice: '',
  categoryId: '',
  label: '',
  isAvailable: true,
};

export default function AdminProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ ...emptyForm });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [toast, setToast] = useState<{ msg: string; type: 'ok' | 'err' } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const tenantId = typeof window !== 'undefined'
    ? (() => { try { return JSON.parse(localStorage.getItem('menino_staff_data') || '').user.tenant.id; } catch { return ''; } })()
    : '';

  const staffToken = typeof window !== 'undefined'
    ? (() => { try { return JSON.parse(localStorage.getItem('menino_staff_data') || '').token; } catch { return ''; } })()
    : '';

  const showToast = (msg: string, type: 'ok' | 'err' = 'ok') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const loadData = async () => {
    if (!tenantId) return;
    setLoading(true);
    try {
      const [prods, menu] = await Promise.all([
        apiRequest(`/menu/admin/products`, { headers: { 'x-tenant-id': tenantId } }),
        apiRequest(`/menu`, { headers: { 'x-tenant-id': tenantId } }),
      ]);
      setProducts(prods);
      setCategories(menu.map((c: any) => ({ id: c.id, name: c.name })));
    } catch (e) {
      showToast('Erro ao carregar produtos', 'err');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, [tenantId]);

  const openCreate = () => {
    setEditingId(null);
    setForm({ ...emptyForm });
    setImageFile(null);
    setImagePreview(null);
    setShowForm(true);
  };

  const openEdit = (p: Product) => {
    setEditingId(p.id);
    setForm({
      name: p.name,
      description: p.description,
      price: String(p.price),
      promoPrice: p.promoPrice != null ? String(p.promoPrice) : '',
      categoryId: p.categoryId,
      label: p.label || '',
      isAvailable: p.isAvailable,
    });
    setImageFile(null);
    setImagePreview(p.imageUrl || null);
    setShowForm(true);
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const handleSave = async () => {
    if (!form.name || !form.price || !form.categoryId) {
      showToast('Preencha nome, preço e categoria.', 'err');
      return;
    }
    setSaving(true);
    try {
      const payload: any = {
        name: form.name,
        description: form.description,
        price: parseFloat(form.price),
        promoPrice: form.promoPrice ? parseFloat(form.promoPrice) : null,
        categoryId: form.categoryId,
        label: form.label || null,
        isAvailable: form.isAvailable,
      };

      let savedProduct: Product;
      if (editingId) {
        savedProduct = await apiRequest(`/menu/product/${editingId}`, {
          method: 'PUT',
          headers: { 'x-tenant-id': tenantId },
          body: JSON.stringify(payload),
        });
      } else {
        savedProduct = await apiRequest(`/menu/product`, {
          method: 'POST',
          headers: { 'x-tenant-id': tenantId },
          body: JSON.stringify(payload),
        });
      }

      // Upload image if selected
      if (imageFile && savedProduct?.id) {
        const formData = new FormData();
        formData.append('file', imageFile);
        const res = await fetch(`${API_BASE}/menu/product/${savedProduct.id}/image`, {
          method: 'POST',
          headers: {
            'x-tenant-id': tenantId,
            'Authorization': `Bearer ${staffToken}`,
          },
          body: formData,
        });
        if (!res.ok) throw new Error('Falha ao enviar imagem.');
      }

      showToast(editingId ? 'Produto atualizado!' : 'Produto criado!');
      setShowForm(false);
      loadData();
    } catch (e: any) {
      showToast(e.message || 'Erro ao salvar produto.', 'err');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await apiRequest(`/menu/product/${id}`, {
        method: 'DELETE',
        headers: { 'x-tenant-id': tenantId },
      });
      showToast('Produto removido.');
      setDeleteConfirm(null);
      loadData();
    } catch {
      showToast('Erro ao remover produto.', 'err');
    }
  };

  const toggleAvailability = async (p: Product) => {
    try {
      await apiRequest(`/menu/product/${p.id}`, {
        method: 'PUT',
        headers: { 'x-tenant-id': tenantId },
        body: JSON.stringify({ isAvailable: !p.isAvailable }),
      });
      setProducts((prev) => prev.map((x) => x.id === p.id ? { ...x, isAvailable: !x.isAvailable } : x));
    } catch {
      showToast('Erro ao alterar disponibilidade.', 'err');
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-5 animate-fade-in pb-24 md:pb-0">

        {/* Toast */}
        {toast && (
          <div className={`fixed top-16 right-4 z-50 px-4 py-3 rounded-xl text-sm font-bold shadow-2xl flex items-center gap-2 ${
            toast.type === 'ok' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'
          }`}>
            {toast.type === 'ok' ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" />}
            {toast.msg}
          </div>
        )}

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-black tracking-tight text-white">Gestão de Produtos</h1>
            <p className="text-xs text-slate-400 mt-0.5">{products.length} produto(s) cadastrado(s)</p>
          </div>
          <button
            onClick={openCreate}
            className="flex items-center gap-2 bg-primary text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow hover:scale-105 transition-transform"
          >
            <Plus className="h-4 w-4" />
            Novo Produto
          </button>
        </div>

        {/* Form Modal */}
        {showForm && (
          <div className="fixed inset-0 z-40 bg-black/70 flex items-end md:items-center justify-center p-0 md:p-4">
            <div className="bg-slate-900 border border-slate-700 rounded-t-2xl md:rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
              <div className="sticky top-0 bg-slate-900 px-5 pt-5 pb-3 border-b border-slate-800 flex items-center justify-between">
                <h2 className="font-extrabold text-base">{editingId ? 'Editar Produto' : 'Novo Produto'}</h2>
                <button onClick={() => setShowForm(false)} className="text-slate-400 hover:text-white">
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="p-5 space-y-4">
                {/* Image upload */}
                <div
                  className="relative h-40 bg-slate-800 rounded-xl border-2 border-dashed border-slate-600 flex items-center justify-center cursor-pointer hover:border-primary transition-colors overflow-hidden"
                  onClick={() => fileInputRef.current?.click()}
                >
                  {imagePreview ? (
                    <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                  ) : (
                    <div className="text-center text-slate-500 space-y-1">
                      <ImageIcon className="h-8 w-8 mx-auto" />
                      <p className="text-xs font-semibold">Clique para adicionar foto</p>
                      <p className="text-[10px]">JPG, PNG ou WEBP · Máx 5MB</p>
                    </div>
                  )}
                  <div className="absolute bottom-2 right-2 bg-primary text-white rounded-lg p-1.5">
                    <Upload className="h-3.5 w-3.5" />
                  </div>
                  <input ref={fileInputRef} type="file" className="hidden" accept="image/*" onChange={handleImageSelect} />
                </div>

                {/* Name */}
                <div>
                  <label className="text-xs font-bold text-slate-400 mb-1 block">Nome do Produto *</label>
                  <input
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="Ex: Pastel de Carne Especial"
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>

                {/* Description */}
                <div>
                  <label className="text-xs font-bold text-slate-400 mb-1 block">Descrição</label>
                  <textarea
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    rows={2}
                    placeholder="Ingredientes e detalhes do produto..."
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                  />
                </div>

                {/* Price + Promo */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold text-slate-400 mb-1 block">Preço (R$) *</label>
                    <input
                      type="number" step="0.01" min="0"
                      value={form.price}
                      onChange={(e) => setForm({ ...form, price: e.target.value })}
                      placeholder="0.00"
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-400 mb-1 block">Preço Promo (opcional)</label>
                    <input
                      type="number" step="0.01" min="0"
                      value={form.promoPrice}
                      onChange={(e) => setForm({ ...form, promoPrice: e.target.value })}
                      placeholder="0.00"
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                </div>

                {/* Category + Label */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold text-slate-400 mb-1 block">Categoria *</label>
                    <select
                      value={form.categoryId}
                      onChange={(e) => setForm({ ...form, categoryId: e.target.value })}
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-primary"
                    >
                      <option value="">Selecione...</option>
                      {categories.map((c) => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-400 mb-1 block">Destaque</label>
                    <select
                      value={form.label}
                      onChange={(e) => setForm({ ...form, label: e.target.value })}
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-primary"
                    >
                      {LABEL_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Available toggle */}
                <button
                  type="button"
                  onClick={() => setForm({ ...form, isAvailable: !form.isAvailable })}
                  className="flex items-center gap-3 w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3"
                >
                  {form.isAvailable
                    ? <ToggleRight className="h-6 w-6 text-green-400" />
                    : <ToggleLeft className="h-6 w-6 text-slate-500" />
                  }
                  <span className="text-sm font-bold">
                    {form.isAvailable ? 'Disponível no cardápio' : 'Oculto no cardápio'}
                  </span>
                </button>

                {/* Save button */}
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="w-full bg-primary text-white font-extrabold py-3.5 rounded-xl shadow hover:scale-[1.01] transition-transform disabled:opacity-50"
                >
                  {saving ? 'Salvando...' : editingId ? 'Salvar Alterações' : 'Criar Produto'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Delete confirm modal */}
        {deleteConfirm && (
          <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 max-w-xs w-full text-center space-y-4">
              <Trash2 className="h-10 w-10 text-red-400 mx-auto" />
              <p className="font-bold text-sm">Tem certeza que deseja remover este produto? Esta ação não pode ser desfeita.</p>
              <div className="flex gap-3">
                <button onClick={() => setDeleteConfirm(null)} className="flex-1 py-2.5 rounded-xl border border-slate-700 text-xs font-bold text-slate-300 hover:bg-slate-800">
                  Cancelar
                </button>
                <button onClick={() => handleDelete(deleteConfirm)} className="flex-1 py-2.5 rounded-xl bg-red-600 text-white text-xs font-bold hover:bg-red-700">
                  Remover
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Products list */}
        {loading ? (
          <div className="flex justify-center py-16">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          </div>
        ) : products.length === 0 ? (
          <div className="text-center py-16 text-slate-500">
            <UtensilsCrossed className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p className="font-bold">Nenhum produto cadastrado ainda.</p>
            <p className="text-xs mt-1">Clique em "Novo Produto" para começar.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {products.map((p) => (
              <div key={p.id} className="bg-slate-900 border border-slate-800 rounded-2xl flex items-center gap-3 p-3">
                {/* Image */}
                <div className="h-14 w-14 rounded-xl overflow-hidden shrink-0 bg-slate-800">
                  {p.imageUrl ? (
                    <img src={p.imageUrl.startsWith('/') ? p.imageUrl : `/${p.imageUrl}`} alt={p.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-600">
                      <ImageIcon className="h-5 w-5" />
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-extrabold truncate">{p.name}</p>
                  <p className="text-[10px] text-slate-500 truncate">{p.category?.name}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-primary font-bold text-xs">R$ {p.price.toFixed(2)}</span>
                    {p.promoPrice && (
                      <span className="text-green-400 font-bold text-[10px]">→ R$ {p.promoPrice.toFixed(2)}</span>
                    )}
                    {p.label && (
                      <span className="text-[9px] font-black uppercase bg-primary/20 text-primary rounded-full px-2 py-0.5">
                        {LABEL_OPTIONS.find((o) => o.value === p.label)?.label}
                      </span>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => toggleAvailability(p)}
                    title={p.isAvailable ? 'Ocultar' : 'Ativar'}
                    className={`p-2 rounded-lg transition-colors ${p.isAvailable ? 'text-green-400 hover:bg-green-950/30' : 'text-slate-600 hover:bg-slate-800'}`}
                  >
                    {p.isAvailable ? <ToggleRight className="h-5 w-5" /> : <ToggleLeft className="h-5 w-5" />}
                  </button>
                  <button onClick={() => openEdit(p)} className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors">
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button onClick={() => setDeleteConfirm(p.id)} className="p-2 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-950/20 transition-colors">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}

function UtensilsCrossed({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 3v18M10 3v6a4 4 0 01-4 4M18 3c0 0 2 2 2 6s-2 6-2 6v6M18 15H8.5" />
    </svg>
  );
}
