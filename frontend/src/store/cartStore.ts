import { create } from 'zustand';

export interface CartOption {
  groupName: string;
  optionName: string;
  price: number;
}

export interface CartItem {
  key: string; // unique combination of product + options
  productId: string;
  name: string;
  price: number; // base price + options price
  basePrice: number;
  quantity: number;
  imageUrl?: string;
  notes?: string;
  options: CartOption[];
}

export interface CustomerData {
  id: string;
  name: string;
  email: string;
  phone: string;
  cashbackBalance: number;
  points: number;
  token: string;
}

interface CartStore {
  items: CartItem[];
  customer: CustomerData | null;
  couponCode: string;
  couponDiscount: number; // percentage or fixed value
  couponDiscountType: 'PERCENTAGE' | 'FIXED' | null;
  deliveryArea: { neighborhood: string; fee: number } | null;
  deliveryType: 'DELIVERY' | 'PICKUP' | 'IN_STORE';
  paymentMethod: 'PIX' | 'CARD' | 'CASH';
  changeFor?: number;
  notes?: string;
  
  // Actions
  addItem: (item: Omit<CartItem, 'key' | 'price'>) => void;
  removeItem: (key: string) => void;
  updateQuantity: (key: string, qty: number) => void;
  clearCart: () => void;
  setCustomer: (customer: CustomerData | null) => void;
  applyCoupon: (code: string, value: number, type: 'PERCENTAGE' | 'FIXED') => void;
  removeCoupon: () => void;
  setDeliveryArea: (area: { neighborhood: string; fee: number } | null) => void;
  setDeliveryType: (type: 'DELIVERY' | 'PICKUP' | 'IN_STORE') => void;
  setPaymentMethod: (method: 'PIX' | 'CARD' | 'CASH') => void;
  setChangeFor: (val?: number) => void;
  setNotes: (val?: string) => void;
  
  // Computeds
  getSubtotal: () => number;
  getDiscount: () => number;
  getDeliveryFee: () => number;
  getTotal: () => number;
}

// Key helper
const generateItemKey = (productId: string, options: CartOption[]) => {
  const optionsKey = options
    .map((o) => `${o.groupName}:${o.optionName}`)
    .sort()
    .join('|');
  return `${productId}-${optionsKey}`;
};

export const useCartStore = create<CartStore>((set, get) => {
  // Try to load initial cart from localStorage
  let initialItems: CartItem[] = [];
  let initialCustomer: CustomerData | null = null;
  if (typeof window !== 'undefined') {
    try {
      initialItems = JSON.parse(localStorage.getItem('menino_cart_items') || '[]');
      initialCustomer = JSON.parse(localStorage.getItem('menino_customer_data') || 'null');
    } catch {
      initialItems = [];
      initialCustomer = null;
    }
  }

  const persist = (items: CartItem[]) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('menino_cart_items', JSON.stringify(items));
    }
  };

  return {
    items: initialItems,
    customer: initialCustomer,
    couponCode: '',
    couponDiscount: 0,
    couponDiscountType: null,
    deliveryArea: null,
    deliveryType: 'DELIVERY',
    paymentMethod: 'PIX',
    changeFor: undefined,
    notes: '',

    addItem: (item) => {
      const key = generateItemKey(item.productId, item.options);
      const optionsPriceSum = item.options.reduce((sum, o) => sum + o.price, 0);
      const finalPrice = item.basePrice + optionsPriceSum;

      set((state) => {
        const existingIndex = state.items.findIndex((i) => i.key === key);
        let updatedItems = [...state.items];

        if (existingIndex >= 0) {
          // Add quantity
          updatedItems[existingIndex].quantity += item.quantity;
        } else {
          updatedItems.push({
            ...item,
            key,
            price: finalPrice,
          });
        }
        persist(updatedItems);
        return { items: updatedItems };
      });
    },

    removeItem: (key) => {
      set((state) => {
        const updatedItems = state.items.filter((i) => i.key !== key);
        persist(updatedItems);
        return { items: updatedItems };
      });
    },

    updateQuantity: (key, qty) => {
      if (qty <= 0) {
        get().removeItem(key);
        return;
      }
      set((state) => {
        const updatedItems = state.items.map((item) =>
          item.key === key ? { ...item, quantity: qty } : item
        );
        persist(updatedItems);
        return { items: updatedItems };
      });
    },

    clearCart: () => {
      set(() => {
        persist([]);
        return {
          items: [],
          couponCode: '',
          couponDiscount: 0,
          couponDiscountType: null,
          changeFor: undefined,
        };
      });
    },

    setCustomer: (customer) => {
      set(() => {
        if (typeof window !== 'undefined') {
          localStorage.setItem('menino_customer_data', JSON.stringify(customer));
        }
        return { customer };
      });
    },

    applyCoupon: (code, value, type) => {
      set({ couponCode: code, couponDiscount: value, couponDiscountType: type });
    },

    removeCoupon: () => {
      set({ couponCode: '', couponDiscount: 0, couponDiscountType: null });
    },

    setDeliveryArea: (area) => set({ deliveryArea: area }),
    setDeliveryType: (type) => set({ deliveryType: type }),
    setPaymentMethod: (method) => set({ paymentMethod: method }),
    setChangeFor: (val) => set({ changeFor: val }),
    setNotes: (val) => set({ notes: val }),

    // Helpers
    getSubtotal: () => {
      return get().items.reduce((sum, item) => sum + item.price * item.quantity, 0);
    },

    getDiscount: () => {
      const subtotal = get().getSubtotal();
      const { couponDiscount, couponDiscountType } = get();
      if (!couponDiscountType) return 0;
      if (couponDiscountType === 'PERCENTAGE') {
        return subtotal * (couponDiscount / 100);
      }
      return couponDiscount;
    },

    getDeliveryFee: () => {
      if (get().deliveryType !== 'DELIVERY') return 0;
      return get().deliveryArea?.fee || 0;
    },

    getTotal: () => {
      const subtotal = get().getSubtotal();
      const discount = get().getDiscount();
      const deliveryFee = get().getDeliveryFee();
      return Math.max(0, subtotal - discount + deliveryFee);
    },
  };
});
