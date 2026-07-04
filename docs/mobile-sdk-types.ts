// ──────────────────────────────────────────────────────
//  Mobile API Client — TypeScript Type Definitions
//  Matches the actual SushiChain REST API
// ──────────────────────────────────────────────────────

// ── API Response Envelope ─────────────────────────────

export interface ApiSuccessResponse<T> {
  success: true;
  data: T;
  message?: string;
}

export interface ApiErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse;

// ── Pagination ────────────────────────────────────────

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  pages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: PaginationMeta;
}

// ── Auth ──────────────────────────────────────────────

export interface LoginRequest {
  email?: string;
  phone?: string;
  password: string;
}

export interface RegisterRequest {
  phone?: string;
  email?: string;
  password: string;
  firstName?: string;
  lastName?: string;
  brandId?: string;
}

export interface RefreshRequest {
  refreshToken: string;
}

export interface LogoutRequest {
  refreshToken: string;
}

export interface AuthUser {
  id: string;
  phone: string | null;
  email: string | null;
  firstName: string;
  lastName: string;
  role: string;
}

export interface LoyaltySummary {
  balance: number;
  tier: string;
}

export interface AuthResponse {
  user: AuthUser;
  loyalty: LoyaltySummary;
  accessToken: string;
  refreshToken: string;
}

export interface RefreshResponse {
  accessToken: string;
}

// ── Brand ─────────────────────────────────────────────

export interface Brand {
  id: string;
  name: string;
  slug: string;
  logoUrl: string | null;
  primaryColor: string;
  secondaryColor: string | null;
  accentColor: string | null;
  heroBannerUrl: string | null;
  promoBannerUrls: string | null;
  description: string | null;
  slogan: string | null;
  isActive: boolean;
  currency: string;
  currencySymbol: string;
  createdAt: string;
  updatedAt: string;
}

// ── Branch ────────────────────────────────────────────

export interface Branch {
  id: string;
  brandId: string;
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
  autoConfirm: boolean;
  acceptingOrders: boolean;
  minOrderAmount: number;
  prepTimeMinutes: number;
  createdAt: string;
  updatedAt: string;
}

export interface BranchDetail extends Branch {
  deliveryZones?: DeliveryZone[];
  _count?: {
    categories: number;
    products: number;
  };
}

// ── Delivery Zone ─────────────────────────────────────

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
  createdAt: string;
  updatedAt: string;
}

// ── Category ──────────────────────────────────────────

export interface Category {
  id: string;
  brandId: string;
  branchId: string | null;
  name: string;
  slug: string;
  description: string | null;
  imageUrl: string | null;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CategoryWithProducts extends Category {
  products: Product[];
}

// ── Product ───────────────────────────────────────────

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
  brandId: string;
  categoryId: string;
  branchId: string | null;
  name: string;
  slug: string;
  description: string | null;
  imageUrl: string | null;
  price: number;
  weight: string | null;
  calories: number | null;
  tags: string | null;
  allergens: string | null;
  isVegetarian: boolean;
  isAvailable: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface ProductWithCategory extends Product {
  category: Category;
}

export interface ProductDetail extends Product {
  category: Category;
  optionGroups: ProductOptionGroup[];
}

export interface ProductSearchResult {
  data: ProductDetail[];
  total: number;
  limit: number;
  offset: number;
}

export interface SelectedOption {
  optionId: string;
  groupId: string;
  name: string;
  priceDelta: number;
}

// ── Cart ──────────────────────────────────────────────

export interface CartItem {
  id: string;
  cartId: string;
  productId: string;
  quantity: number;
  selectedOptions: string | null;
  totalPrice: number;
  createdAt: string;
  updatedAt: string;
  product?: {
    id: string;
    name: string;
    price: number;
    imageUrl: string | null;
    isAvailable: boolean;
  };
}

export interface Cart {
  id: string;
  userId: string;
  brandId: string;
  branchId: string;
  totalItems: number;
  subtotal: number;
  items: CartItem[];
  branch?: {
    id: string;
    name: string;
    address: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface AddCartItemRequest {
  productId: string;
  quantity: number;
  selectedOptions?: SelectedOption[];
}

export interface UpdateCartItemRequest {
  quantity: number;
}

export interface RemoveCartItemRequest {
  productId: string;
}

export interface CreateCartRequest {
  branchId: string;
}

// ── Order ─────────────────────────────────────────────

export type OrderType = "delivery" | "pickup";

export type OrderStatus =
  | "new"
  | "confirmed"
  | "cooking"
  | "ready"
  | "delivering"
  | "completed"
  | "cancelled";

export type PaymentMethod = "card" | "cash" | "bonus";

export type PaymentStatus =
  | "pending"
  | "processing"
  | "succeeded"
  | "failed"
  | "refunded";

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
  product?: {
    imageUrl: string | null;
  };
}

export interface Payment {
  id: string;
  orderId: string;
  method: PaymentMethod;
  status: PaymentStatus;
  amount: number;
  providerTxId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface OrderPromotion {
  name: string;
  type: string;
  value: number;
}

export interface Order {
  id: string;
  orderNumber: string;
  userId: string;
  brandId: string;
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
  scheduledAt: string | null;
  confirmedAt: string | null;
  cookingAt: string | null;
  readyAt: string | null;
  deliveringAt: string | null;
  completedAt: string | null;
  cancelledAt: string | null;
  createdAt: string;
  updatedAt: string;
  items: OrderItem[];
  payments: { method: PaymentMethod; status: PaymentStatus }[];
  branch?: { name: string; address: string; phone?: string };
  promotion?: OrderPromotion | null;
}

export interface CreateOrderRequest {
  branchId: string;
  type: OrderType;
  addressId?: string;
  paymentMethod: PaymentMethod;
  note?: string;
  promotionCode?: string;
  useBonus?: number;
  scheduledAt?: string;
}

// ── Payment Intent ────────────────────────────────────

export interface PaymentIntentRequest {
  orderId: string;
}

export interface PaymentIntentResponse {
  paymentId: string;
  amount: number;
  provider: string;
  data: string;
  signature: string;
  checkoutUrl: string;
}

// ── Promotion ─────────────────────────────────────────

export type PromotionType = "percentage" | "fixed" | "free_delivery" | "bonus";

export type PromotionStatus = "active" | "inactive" | "expired";

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
  brandId: string;
  createdAt: string;
  updatedAt: string;
}

export interface ValidatePromotionRequest {
  code: string;
  subtotal: number;
}

export interface ValidatePromotionResponse {
  promotion: Promotion;
}

// ── Loyalty ───────────────────────────────────────────

export type LoyaltyTransactionType =
  | "earned"
  | "spent"
  | "adjusted"
  | "expired";

export interface LoyaltyAccount {
  id: string;
  userId: string;
  brandId: string;
  balance: number;
  lifetime: number;
  tier: string;
  createdAt: string;
  updatedAt: string;
}

export interface LoyaltyTransaction {
  id: string;
  accountId: string;
  type: LoyaltyTransactionType;
  amount: number;
  balanceAfter: number;
  description: string | null;
  relatedOrderId: string | null;
  createdAt: string;
}

// ── User & Address ────────────────────────────────────

export interface User {
  id: string;
  phone: string | null;
  email: string | null;
  firstName: string;
  lastName: string;
  role: string;
  avatarUrl: string | null;
  isActive?: boolean;
  createdAt: string;
}

export interface UserProfileWithLoyalty extends User {
  isActive: boolean;
  loyalty: {
    balance: number;
    lifetime: number;
    tier: string;
  } | null;
}

export interface UpdateProfileRequest {
  firstName?: string;
  lastName?: string;
  email?: string;
}

export interface UserAddress {
  id: string;
  userId: string;
  label: string | null;
  street: string;
  building: string | null;
  apartment: string | null;
  floor: string | null;
  entrance: string | null;
  comment: string | null;
  latitude: number | null;
  longitude: number | null;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateUserAddressRequest {
  label?: string;
  street: string;
  building?: string;
  apartment?: string;
  floor?: string;
  entrance?: string;
  comment?: string;
  latitude?: number | null;
  longitude?: number | null;
  isDefault?: boolean;
}

export interface UpdateUserAddressRequest {
  label?: string;
  street?: string;
  building?: string;
  apartment?: string;
  floor?: string;
  entrance?: string;
  comment?: string;
  latitude?: number | null;
  longitude?: number | null;
  isDefault?: boolean;
}

// ── Favorites ─────────────────────────────────────────

export interface FavoriteProduct {
  id: string;
  userId: string;
  brandId: string;
  productId: string;
  createdAt: string;
  product?: {
    id: string;
    name: string;
    price: number;
    weight: string | null;
    imageUrl: string | null;
    isAvailable: boolean;
    categoryId: string;
  };
}

export interface AddFavoriteRequest {
  productId: string;
}

export interface RemoveFavoriteRequest {
  productId: string;
}

// ── Reviews ───────────────────────────────────────────

export interface Review {
  id: string;
  rating: number;
  comment: string | null;
  isAdminReply: string | null;
  createdAt: string;
  user: {
    firstName: string;
    lastName: string;
  };
}

export interface ProductReviewsResponse {
  data: Review[];
  pagination: PaginationMeta;
  averageRating: number;
  totalApproved: number;
}

export interface CreateReviewRequest {
  orderId: string;
  rating: number;
  comment?: string;
}

// ── Feedback ──────────────────────────────────────────

export type FeedbackType =
  | "order_issue"
  | "general"
  | "suggestion"
  | "complaint";

export interface FeedbackRequest {
  type: FeedbackType;
  subject?: string;
  message: string;
  contactInfo?: string;
  orderId?: string;
  branchId?: string;
}

export interface Feedback {
  id: string;
  userId: string | null;
  brandId: string;
  branchId: string | null;
  orderId: string | null;
  type: FeedbackType;
  status: string;
  subject: string | null;
  message: string;
  contactInfo: string | null;
  adminReply: string | null;
  createdAt: string;
  updatedAt: string;
  user: { firstName: string; lastName: string } | null;
  branch: { name: string } | null;
  order: { orderNumber: string } | null;
}

// ── Rate Limiting ─────────────────────────────────────

export interface RateLimitHeaders {
  "X-RateLimit-Remaining": string;
  "X-RateLimit-Reset": string;
  "Retry-After"?: string;
}