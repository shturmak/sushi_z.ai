// ──────────────────────────────────────────────────────
//  Admin Panel — TypeScript Types
// ──────────────────────────────────────────────────────

export interface Branch {
  id: string;
  name: string;
  slug: string;
  address: string;
  phone: string | null;
  email: string | null;
  latitude: number | null;
  longitude: number | null;
  isOpen: boolean;
  workSchedule: string | null;
  description: string | null;
  imageUrl: string | null;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
  _count?: { orders: number; categories: number };
  deliveryZones?: DeliveryZone[];
}

export interface DeliveryZone {
  id: string;
  branchId: string;
  name: string;
  description: string | null;
  minOrder: number;
  deliveryFee: number;
  estimatedMinutes: number;
  polygonData: string | null;
  isActive: boolean;
}

export interface Category {
  id: string;
  branchId: string | null;
  name: string;
  slug: string;
  description: string | null;
  imageUrl: string | null;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  branch?: { name: string } | null;
  _count?: { products: number };
}

export interface ProductOption {
  id: string;
  groupId: string;
  name: string;
  priceDelta: number;
  sortOrder: number;
}

export interface ProductOptionGroup {
  id: string;
  productId: string;
  name: string;
  isRequired: boolean;
  maxChoices: number;
  sortOrder: number;
  options: ProductOption[];
}

export interface Product {
  id: string;
  categoryId: string;
  branchId: string | null;
  name: string;
  slug: string;
  description: string | null;
  imageUrl: string | null;
  price: number;
  weight: string | null;
  calories: number | null;
  isAvailable: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
  category: { name: string };
  branch?: { name: string } | null;
  optionGroups: ProductOptionGroup[];
}

export type OrderType = 'delivery' | 'pickup';
export type OrderStatus = 'new' | 'confirmed' | 'cooking' | 'ready' | 'delivering' | 'completed' | 'cancelled';
export type PaymentMethod = 'card' | 'cash' | 'bonus';
export type PaymentStatus = 'pending' | 'processing' | 'succeeded' | 'failed' | 'refunded';
export type PromotionType = 'percentage' | 'fixed' | 'free_delivery' | 'bonus';
export type PromotionStatus = 'active' | 'inactive' | 'expired';

export interface OrderItem {
  id: string;
  orderId: string;
  productId: string;
  productName: string;
  productPrice: number;
  quantity: number;
  selectedOptions: string | null;
  totalPrice: number;
  createdAt: string;
}

export interface Order {
  id: string;
  orderNumber: string;
  userId: string;
  branchId: string;
  type: OrderType;
  status: OrderStatus;
  addressSnapshot: string | null;
  deliveryFee: number;
  subtotal: number;
  discount: number;
  total: number;
  note: string | null;
  promotionId: string | null;
  promotionCode: string | null;
  bonusUsed: number;
  estimatedMinutes: number | null;
  confirmedAt: string | null;
  cookingAt: string | null;
  readyAt: string | null;
  deliveringAt: string | null;
  completedAt: string | null;
  cancelledAt: string | null;
  createdAt: string;
  updatedAt: string;
  user: { firstName: string; lastName: string; phone: string | null; email: string | null };
  branch: { name: string; address: string };
  items: OrderItem[];
  payments: { method: PaymentMethod; status: PaymentStatus }[];
}

export interface Promotion {
  id: string;
  code: string | null;
  name: string;
  description: string | null;
  type: PromotionType;
  value: number;
  minOrder: number;
  maxUses: number | null;
  usedCount: number;
  startDate: string;
  endDate: string;
  status: PromotionStatus;
  createdAt: string;
  updatedAt: string;
}

export interface Analytics {
  orders: { today: number; week: number; month: number };
  revenue: { today: number; week: number; month: number };
  statusDistribution: { status: string; count: number }[];
  topProducts: { name: string; quantity: number; revenue: number }[];
  recentOrders: Order[];
  ordersByDay?: { date: string; count: number; revenue: number }[];
  revenueByCategory?: { category: string; revenue: number }[];
}

// API Response wrapper
export interface ApiSuccessResponse<T = unknown> {
  success: true;
  data: T;
  message?: string;
}

export interface ApiErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
  };
}

// Form input types
export interface BranchFormData {
  name: string;
  slug: string;
  address: string;
  phone: string;
  email: string;
  latitude: string;
  longitude: string;
  isOpen: boolean;
  workSchedule: string;
  description: string;
}

export interface CategoryFormData {
  branchId: string;
  name: string;
  slug: string;
  description: string;
  sortOrder: number;
  isActive: boolean;
}

export interface ProductFormData {
  categoryId: string;
  branchId: string;
  name: string;
  slug: string;
  description: string;
  price: number;
  weight: string;
  calories: number;
  isAvailable: boolean;
  sortOrder: number;
  optionGroups: {
    name: string;
    isRequired: boolean;
    maxChoices: number;
    sortOrder: number;
    options: { name: string; priceDelta: number; sortOrder: number }[];
  }[];
}

export interface PromotionFormData {
  code: string;
  name: string;
  description: string;
  type: PromotionType;
  value: number;
  minOrder: number;
  maxUses: string;
  startDate: string;
  endDate: string;
  status: PromotionStatus;
}