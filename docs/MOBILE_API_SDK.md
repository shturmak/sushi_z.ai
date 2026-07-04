# Mobile API SDK — SushiChain

Complete API reference for mobile app developers. All endpoints are prefixed with `{brand_domain}/api`.

**Base URL example:** `https://sushichain.example.com/api`

---

## 1. Authentication

### JWT Bearer Token

All authenticated endpoints require an `Authorization` header:

```
Authorization: Bearer <accessToken>
```

Access tokens are short-lived. Use the refresh endpoint to obtain a new access token when it expires (HTTP 401).

### Rate Limiting

Auth endpoints are rate-limited to **10 requests per minute per IP**.

Check response headers:
- `X-RateLimit-Remaining` — requests left in the current window
- `X-RateLimit-Reset` — Unix timestamp when the window resets
- `Retry-After` — seconds to wait (only present when rate-limited, HTTP 429)

---

## 2. Endpoints Reference

### 2.1 Auth

#### POST `/auth/register`

Register a new user account.

**Auth:** None (public)

**Request Body:**
```json
{
  "phone": "+380991234567",
  "email": "user@example.com",
  "password": "secret123",
  "firstName": "Ivan",
  "lastName": "Petrenko",
  "brandId": "clx_abc123..."
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| phone | string | At least one of phone/email | Ukrainian phone format |
| email | string | At least one of phone/email | |
| password | string | Yes | |
| firstName | string | No | |
| lastName | string | No | |
| brandId | string | No | Brand to create loyalty account for |

**Response (201):**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "clx_xyz...",
      "phone": "+380991234567",
      "email": "user@example.com",
      "firstName": "Ivan",
      "lastName": "Petrenko",
      "role": "customer"
    },
    "loyalty": {
      "balance": 0,
      "tier": "bronze"
    },
    "accessToken": "eyJhbGciOiJIUzI1NiIs...",
    "refreshToken": "rt_a1b2c3d4..."
  },
  "message": "Registration successful"
}
```

**Errors:**
- `409 CONFLICT` — Phone or email already registered
- `429 RATE_LIMITED` — Too many requests

---

#### POST `/auth/login`

Authenticate and receive tokens.

**Auth:** None (public)

**Request Body:**
```json
{
  "email": "user@example.com",
  "phone": "+380991234567",
  "password": "secret123"
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| email | string | At least one of email/phone | |
| phone | string | At least one of email/phone | |
| password | string | Yes | |

**Response (200):**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "clx_xyz...",
      "phone": "+380991234567",
      "email": "user@example.com",
      "firstName": "Ivan",
      "lastName": "Petrenko",
      "role": "customer"
    },
    "loyalty": {
      "balance": 150,
      "tier": "silver"
    },
    "accessToken": "eyJhbGciOiJIUzI1NiIs...",
    "refreshToken": "rt_a1b2c3d4..."
  }
}
```

**Errors:**
- `401 INVALID_CREDENTIALS` — Wrong email/phone or password
- `403 ACCOUNT_DISABLED` — Account is disabled

---

#### POST `/auth/refresh`

Obtain a new access token using a refresh token.

**Auth:** None (uses refresh token in body)

**Request Body:**
```json
{
  "refreshToken": "rt_a1b2c3d4..."
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIs..."
  }
}
```

**Errors:**
- `401 UNAUTHORIZED` — Invalid, expired, or not found refresh token

---

#### POST `/auth/logout`

Invalidate a refresh token.

**Auth:** None (uses refresh token in body)

**Request Body:**
```json
{
  "refreshToken": "rt_a1b2c3d4..."
}
```

**Response (200):**
```json
{
  "success": true,
  "data": null,
  "message": "Logged out successfully"
}
```

---

### 2.2 Brands

#### GET `/brands`

List all active brands.

**Auth:** None (public)

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": "clx_abc...",
      "name": "SushiChain",
      "slug": "sushichain",
      "logoUrl": "https://...",
      "primaryColor": "#e11d48",
      "secondaryColor": "#f97316",
      "accentColor": "#0ea5e9",
      "heroBannerUrl": "https://...",
      "promoBannerUrls": "[\"https://...\"]",
      "description": "Best sushi in town",
      "slogan": "Fresh. Fast. Delicious.",
      "isActive": true,
      "currency": "UAH",
      "currencySymbol": "\u20b4",
      "createdAt": "2025-01-15T10:00:00.000Z",
      "updatedAt": "2025-06-01T12:00:00.000Z"
    }
  ]
}
```

---

### 2.3 Branches

#### GET `/branches`

List branches. Filter by `isOpen` status.

**Auth:** None (public, rate-limited: 60 req/min)

**Query Parameters:**

| Param | Type | Description |
|---|---|---|
| isOpen | string | `"true"` or `"false"` — filter by open status |

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": "clx_br1...",
      "brandId": "clx_abc...",
      "name": "SushiChain Central",
      "slug": "central",
      "address": "123 Khreshchatyk St, Kyiv",
      "phone": "+380441234567",
      "email": "central@sushichain.com",
      "latitude": 50.4501,
      "longitude": 30.5234,
      "isOpen": true,
      "workSchedule": "{\"mon\":\"09:00-22:00\",\"tue\":\"09:00-22:00\"}",
      "description": "Our flagship branch",
      "imageUrl": "https://...",
      "sortOrder": 0,
      "autoConfirm": true,
      "acceptingOrders": true,
      "minOrderAmount": 200,
      "prepTimeMinutes": 30,
      "createdAt": "2025-01-15T10:00:00.000Z",
      "updatedAt": "2025-06-01T12:00:00.000Z"
    }
  ],
  "headers": {
    "X-RateLimit-Remaining": 59,
    "X-RateLimit-Reset": 1719900000
  }
}
```

---

#### GET `/branches/:id`

Get a single branch with delivery zones and product/category counts.

**Auth:** None (public)

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "clx_br1...",
    "name": "SushiChain Central",
    "...": "...",
    "deliveryZones": [
      {
        "id": "clx_dz1...",
        "branchId": "clx_br1...",
        "name": "City Center",
        "description": "Central Kyiv area",
        "minOrder": 200,
        "deliveryFee": 50,
        "estimatedMinutes": 40,
        "polygonData": "[[50.45,30.52],[...]]",
        "isActive": true,
        "createdAt": "2025-01-15T10:00:00.000Z",
        "updatedAt": "2025-01-15T10:00:00.000Z"
      }
    ],
    "_count": {
      "categories": 6,
      "products": 18
    }
  }
}
```

---

#### GET `/branches/:id/delivery-zones`

List active delivery zones for a branch.

**Auth:** None (public)

**Response (200):** Array of `DeliveryZone` objects (same shape as above).

---

### 2.4 Menu

#### GET `/menu`

Get the full menu for a branch (categories with products).

**Auth:** None (public, rate-limited: 60 req/min)

**Query Parameters:**

| Param | Type | Required | Description |
|---|---|---|---|
| branchId | string | Yes | Branch to load menu for |

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": "clx_cat1...",
      "brandId": "clx_abc...",
      "branchId": null,
      "name": "Rolls",
      "slug": "rolls",
      "description": "Fresh sushi rolls",
      "imageUrl": "https://...",
      "sortOrder": 0,
      "isActive": true,
      "products": [
        {
          "id": "clx_prd1...",
          "brandId": "clx_abc...",
          "categoryId": "clx_cat1...",
          "branchId": null,
          "name": "California Roll",
          "slug": "california-roll",
          "description": "Crab, avocado, cucumber",
          "imageUrl": "https://...",
          "price": 189,
          "weight": "280\u0433",
          "calories": 350,
          "tags": "[\"rolls\",\"popular\"]",
          "allergens": "[\"\u0433\u043b\u044e\u0442\u0435\u043d\"]",
          "isVegetarian": false,
          "isAvailable": true,
          "sortOrder": 0,
          "optionGroups": [
            {
              "id": "clx_og1...",
              "productId": "clx_prd1...",
              "name": "Size",
              "isRequired": true,
              "maxChoices": 1,
              "sortOrder": 0,
              "options": [
                {
                  "id": "clx_opt1...",
                  "groupId": "clx_og1...",
                  "name": "Standard",
                  "priceDelta": 0,
                  "sortOrder": 0
                },
                {
                  "id": "clx_opt2...",
                  "groupId": "clx_og1...",
                  "name": "Large +80\u20b4",
                  "priceDelta": 80,
                  "sortOrder": 1
                }
              ]
            }
          ]
        }
      ]
    }
  ]
}
```

**Errors:**
- `400 VALIDATION_ERROR` — `branchId` is missing
- `404 NOT_FOUND` — Branch not found
- `403 NOT_ACCEPTING` — Branch is not currently accepting orders

---

#### GET `/menu/:id`

Get a single product with its category and option groups.

**Auth:** None (public)

**Response (200):** Single `Product` object with `category` and `optionGroups` populated.

---

#### GET `/products/search`

Search products with filters.

**Auth:** None (public)

**Query Parameters:**

| Param | Type | Description |
|---|---|---|
| branchId | string | Filter by branch (or brandId) |
| brandId | string | Filter by brand |
| search | string | Text search in name/description |
| tags | string | Comma-separated tags to match |
| excludeAllergens | string | Comma-separated allergens to exclude |
| vegetarian | string | `"true"` to filter vegetarian only |
| minPrice | number | Minimum price (default: 0) |
| maxPrice | number | Maximum price (default: 999999) |
| limit | number | Results per page (default: 50) |
| offset | number | Results offset (default: 0) |

**Response (200):**
```json
{
  "success": true,
  "data": {
    "data": [/* Product[] */],
    "total": 42,
    "limit": 50,
    "offset": 0
  }
}
```

---

### 2.5 Cart

All cart endpoints require authentication. The cart is **server-side** — one cart per user per brand.

#### GET `/cart`

Get the current user's cart with items, branch info, and totals.

**Auth:** Bearer token

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "clx_cart1...",
    "userId": "clx_xyz...",
    "brandId": "clx_abc...",
    "branchId": "clx_br1...",
    "totalItems": 3,
    "subtotal": 567,
    "items": [
      {
        "id": "clx_ci1...",
        "cartId": "clx_cart1...",
        "productId": "clx_prd1...",
        "quantity": 2,
        "selectedOptions": "[{\"optionId\":\"clx_opt2\",\"name\":\"Large +80\u20b4\",\"priceDelta\":80}]",
        "totalPrice": 538,
        "product": {
          "id": "clx_prd1...",
          "name": "California Roll",
          "price": 189,
          "imageUrl": "https://...",
          "isAvailable": true
        }
      }
    ],
    "branch": {
      "id": "clx_br1...",
      "name": "SushiChain Central",
      "address": "123 Khreshchatyk St, Kyiv"
    }
  }
}
```

Returns `null` data if no cart exists.

---

#### POST `/cart`

Create a new cart for a branch. One cart per user per brand.

**Auth:** Bearer token

**Request Body:**
```json
{
  "branchId": "clx_br1..."
}
```

**Response (201):**
```json
{
  "success": true,
  "data": { "id": "clx_cart1...", "...": "..." },
  "message": "Cart created"
}
```

**Errors:**
- `409 CONFLICT` — Cart already exists for this brand. Clear it first or use the existing one.

---

#### DELETE `/cart`

Clear the current cart (delete all items and the cart itself).

**Auth:** Bearer token

---

#### POST `/cart/items`

Add an item to the cart.

**Auth:** Bearer token

**Request Body:**
```json
{
  "productId": "clx_prd1...",
  "quantity": 2,
  "selectedOptions": [
    { "optionId": "clx_opt2", "name": "Large +80\u20b4", "priceDelta": 80 }
  ]
}
```

**Response (201):**
```json
{
  "success": true,
  "data": {
    "id": "clx_ci1...",
    "cartId": "clx_cart1...",
    "productId": "clx_prd1...",
    "quantity": 2,
    "selectedOptions": "[...]",
    "totalPrice": 538,
    "product": { "id": "clx_prd1...", "name": "California Roll", "..." }
  },
  "message": "Item added to cart"
}
```

**Errors:**
- `404 NO_CART` — Cart does not exist. Create a cart first.
- `404 NOT_FOUND` — Product not found or unavailable.

---

#### PUT `/cart/items/:id`

Update cart item quantity.

**Auth:** Bearer token

**Request Body:**
```json
{
  "quantity": 3
}
```

**Response (200):** Updated `CartItem` object.

---

#### DELETE `/cart/items/:id`

Remove an item from the cart.

**Auth:** Bearer token

**Response (200):**
```json
{
  "success": true,
  "data": null,
  "message": "Cart item removed"
}
```

---

### 2.6 Orders

#### POST `/orders`

Create an order from the current cart. The cart is cleared after successful creation.

**Auth:** Bearer token

**Request Body:**
```json
{
  "branchId": "clx_br1...",
  "type": "delivery",
  "addressId": "clx_addr1...",
  "paymentMethod": "card",
  "note": "No onions please",
  "promotionCode": "SUMMER20",
  "useBonus": 50,
  "scheduledAt": "2025-07-20T18:00:00.000Z"
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| branchId | string | Yes | Branch to order from |
| type | string | Yes | `"delivery"` or `"pickup"` |
| addressId | string | Required for delivery | User address for delivery |
| paymentMethod | string | Yes | `"card"`, `"cash"`, or `"bonus"` |
| note | string | No | Customer note |
| promotionCode | string | No | Promotion code to apply |
| useBonus | number | No | Bonus points to use for payment |
| scheduledAt | string | No | ISO 8601 date for scheduled delivery/pickup |

**Response (201):**
```json
{
  "success": true,
  "data": {
    "id": "clx_ord1...",
    "orderNumber": "#1042",
    "userId": "clx_xyz...",
    "brandId": "clx_abc...",
    "branchId": "clx_br1...",
    "type": "delivery",
    "status": "new",
    "addressSnapshot": "{...}",
    "deliveryFee": 50,
    "subtotal": 567,
    "discount": 113.4,
    "total": 453.6,
    "note": "No onions please",
    "promotionCode": "SUMMER20",
    "bonusUsed": 50,
    "estimatedMinutes": 35,
    "scheduledAt": "2025-07-20T18:00:00.000Z",
    "confirmedAt": "2025-07-15T12:05:00.000Z",
    "createdAt": "2025-07-15T12:04:00.000Z",
    "updatedAt": "2025-07-15T12:05:00.000Z",
    "items": [
      {
        "id": "clx_oi1...",
        "orderId": "clx_ord1...",
        "productId": "clx_prd1...",
        "productName": "California Roll",
        "productPrice": 189,
        "quantity": 2,
        "selectedOptions": "[...]",
        "totalPrice": 378
      }
    ],
    "branch": {
      "name": "SushiChain Central",
      "address": "123 Khreshchatyk St, Kyiv"
    },
    "payments": [
      {
        "method": "card",
        "status": "pending"
      }
    ]
  },
  "message": "Order created successfully"
}
```

**Errors:**
- `EMPTY_CART` — Cart is empty or does not exist
- `BRANCH_MISMATCH` — Cart branch does not match order branch
- `ADDRESS_REQUIRED` — Delivery address required for delivery orders
- `ADDRESS_NOT_FOUND` — Address not found
- `MIN_ORDER_AMOUNT` — Below minimum order amount for delivery
- `INVALID_PROMO` / `PROMO_EXPIRED` / `PROMO_EXHAUSTED` / `PROMO_MIN_ORDER` — Promotion errors
- `INSUFFICIENT_BONUS` — Not enough bonus points

---

#### GET `/orders`

List the current user's orders with pagination.

**Auth:** Bearer token

**Query Parameters:**

| Param | Type | Description |
|---|---|---|
| page | number | Page number (default: 1) |
| limit | number | Items per page (default: 20, max: 100) |
| status | string | Filter by order status |

**Response (200):**
```json
{
  "success": true,
  "data": {
    "data": [/* Order[] */],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 15,
      "pages": 1,
      "hasNext": false,
      "hasPrev": false
    }
  }
}
```

---

#### GET `/orders/:id`

Get a single order with full details.

**Auth:** Bearer token

**Response (200):** Full `Order` object with `branch`, `items` (with product images), `payments`, and `promotion`.

---

#### POST `/orders/:id/cancel`

Cancel an order. Only possible when order is in `new` or `confirmed` status. Bonus points are refunded.

**Auth:** Bearer token

**Response (200):**
```json
{
  "success": true,
  "data": null,
  "message": "Order cancelled"
}
```

**Errors:**
- `CANCEL_FAILED` — Order not found, not yours, or cannot be cancelled at this stage.

---

#### POST `/orders/:id/repeat`

Repeat a previous order — populates the cart with available items from the original order.

**Auth:** Bearer token

**Response (200):**
```json
{
  "success": true,
  "data": { /* Cart object with items and branch */ },
  "message": "Cart populated from previous order"
}
```

**Errors:**
- `REORDER_FAILED` — Order not found, not yours, or no items available for reorder.

---

### 2.7 Payments

#### POST `/payments/intent`

Create a payment intent for a card payment. Returns provider-specific checkout data (e.g., LiqPay).

**Auth:** Bearer token

**Request Body:**
```json
{
  "orderId": "clx_ord1..."
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "paymentId": "clx_pay1...",
    "amount": 453.6,
    "provider": "liqpay",
    "data": "base64_encoded_data...",
    "signature": "signature_string...",
    "checkoutUrl": "https://www.liqpay.ua/api/3/checkout?data=..."
  }
}
```

**Errors:**
- `404 NOT_FOUND` — Order not found
- `403 FORBIDDEN` — Order does not belong to the user
- `NO_CARD_PAYMENT` — No card payment method for this order
- `ALREADY_PAID` — Payment already completed

---

### 2.8 Promotions

#### GET `/promotions`

List all currently active promotions (auto-applied and code-based).

**Auth:** None (public)

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": "clx_promo1...",
      "code": "SUMMER20",
      "name": "Summer 20% Off",
      "description": "Get 20% off your order",
      "type": "percentage",
      "value": 20,
      "minOrder": 300,
      "maxUses": 100,
      "usedCount": 42,
      "startDate": "2025-06-01T00:00:00.000Z",
      "endDate": "2025-08-31T23:59:59.000Z",
      "status": "active",
      "createdAt": "2025-05-30T10:00:00.000Z",
      "updatedAt": "2025-07-15T10:00:00.000Z"
    }
  ]
}
```

---

#### POST `/promotions/validate`

Validate a promotion code against a cart subtotal.

**Auth:** None (public)

**Request Body:**
```json
{
  "code": "SUMMER20",
  "subtotal": 567
}
```

**Response (200):** Returns the full `Promotion` object if valid.

**Errors:**
- `PROMO_INVALID` — Code not found, expired, exhausted, or below minimum order.

---

### 2.9 Loyalty

#### GET `/me/loyalty`

Get the current user's loyalty account for a brand.

**Auth:** Bearer token

**Query Parameters:**

| Param | Type | Description |
|---|---|---|
| brandId | string | Brand ID (defaults to empty) |

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "clx_loy1...",
    "userId": "clx_xyz...",
    "brandId": "clx_abc...",
    "balance": 150,
    "lifetime": 3200,
    "tier": "silver",
    "createdAt": "2025-01-15T10:00:00.000Z",
    "updatedAt": "2025-07-15T12:00:00.000Z"
  }
}
```

Returns `{ balance: 0, lifetime: 0, tier: "bronze" }` if no account exists.

---

#### GET `/loyalty/transactions`

List loyalty transactions with pagination.

**Auth:** Bearer token

**Query Parameters:**

| Param | Type | Description |
|---|---|---|
| brandId | string | Brand ID |
| page | number | Page number (default: 1) |
| limit | number | Items per page (default: 20) |

**Response (200):**
```json
{
  "success": true,
  "data": {
    "data": [
      {
        "id": "clx_lt1...",
        "accountId": "clx_loy1...",
        "type": "earned",
        "amount": 28,
        "balanceAfter": 150,
        "description": "\u0411\u043e\u043d\u0443\u0441\u0438 \u0437\u0430 #1042",
        "relatedOrderId": "clx_ord1...",
        "createdAt": "2025-07-15T12:05:00.000Z"
      }
    ],
    "pagination": { "page": 1, "limit": 20, "total": 8, "pages": 1, "hasNext": false, "hasPrev": false }
  }
}
```

**Transaction types:** `earned`, `spent`, `adjusted`, `expired`

---

### 2.10 Favorites

#### GET `/favorites`

List the current user's favorite products.

**Auth:** Bearer token

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": "clx_fav1...",
      "userId": "clx_xyz...",
      "brandId": "clx_abc...",
      "productId": "clx_prd1...",
      "createdAt": "2025-07-10T10:00:00.000Z",
      "product": {
        "id": "clx_prd1...",
        "name": "California Roll",
        "price": 189,
        "weight": "280\u0433",
        "imageUrl": "https://...",
        "isAvailable": true,
        "categoryId": "clx_cat1..."
      }
    }
  ]
}
```

---

#### POST `/favorites`

Add a product to favorites.

**Auth:** Bearer token

**Request Body:**
```json
{
  "productId": "clx_prd1..."
}
```

**Response (201):** Created `FavoriteProduct` object.

---

#### DELETE `/favorites`

Remove a product from favorites.

**Auth:** Bearer token

**Request Body:**
```json
{
  "productId": "clx_prd1..."
}
```

**Response (200):**
```json
{
  "success": true,
  "data": null,
  "message": "Removed from favorites"
}
```

---

### 2.11 Addresses

#### GET `/me/addresses`

List the current user's saved addresses, sorted by default first.

**Auth:** Bearer token

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": "clx_addr1...",
      "userId": "clx_xyz...",
      "label": "Home",
      "street": "Khreshchatyk St",
      "building": "123",
      "apartment": "42",
      "floor": "5",
      "entrance": "2",
      "comment": "Ring doorbell 3 times",
      "latitude": 50.4501,
      "longitude": 30.5234,
      "isDefault": true,
      "createdAt": "2025-03-01T10:00:00.000Z",
      "updatedAt": "2025-03-01T10:00:00.000Z"
    }
  ]
}
```

---

#### POST `/me/addresses`

Create a new address. If `isDefault` is `true`, all other addresses are un-defaulted.

**Auth:** Bearer token

**Request Body:**
```json
{
  "label": "Work",
  "street": "Instytutska St",
  "building": "1",
  "apartment": "15",
  "floor": "3",
  "entrance": "A",
  "comment": "Call on arrival",
  "latitude": 50.4475,
  "longitude": 30.5251,
  "isDefault": false
}
```

**Response (201):** Created `UserAddress` object.

---

#### PUT `/me/addresses/:id`

Update an existing address.

**Auth:** Bearer token

**Request Body:** Same fields as POST (all optional).

**Response (200):** Updated `UserAddress` object.

---

#### DELETE `/me/addresses/:id`

Delete an address.

**Auth:** Bearer token

**Response (200):**
```json
{
  "success": true,
  "data": null,
  "message": "Address deleted"
}
```

---

### 2.12 Profile

#### GET `/me`

Get the current user's profile (without loyalty data).

**Auth:** Bearer token

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "clx_xyz...",
    "phone": "+380991234567",
    "email": "user@example.com",
    "firstName": "Ivan",
    "lastName": "Petrenko",
    "role": "customer",
    "avatarUrl": null,
    "createdAt": "2025-01-15T10:00:00.000Z"
  }
}
```

---

#### GET `/auth/profile`

Get the current user's profile with loyalty data.

**Auth:** Bearer token

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "clx_xyz...",
    "phone": "+380991234567",
    "email": "user@example.com",
    "firstName": "Ivan",
    "lastName": "Petrenko",
    "role": "customer",
    "avatarUrl": null,
    "isActive": true,
    "createdAt": "2025-01-15T10:00:00.000Z",
    "loyalty": {
      "balance": 150,
      "lifetime": 3200,
      "tier": "silver"
    }
  }
}
```

---

#### PUT `/auth/profile`

Update the current user's profile.

**Auth:** Bearer token

**Request Body:**
```json
{
  "firstName": "Ivan",
  "lastName": "Petrenko-Shevchuk",
  "email": "newemail@example.com"
}
```

**Response (200):** Updated user object.

**Errors:**
- `409 CONFLICT` — Email already taken by another user.

---

### 2.13 Reviews

#### GET `/products/:id/reviews`

List approved reviews for a product (public endpoint).

**Auth:** None (public)

**Query Parameters:**

| Param | Type | Description |
|---|---|---|
| page | number | Page number (default: 1) |
| limit | number | Items per page (default: 10) |

**Response (200):**
```json
{
  "success": true,
  "data": {
    "data": [
      {
        "id": "clx_rev1...",
        "rating": 5,
        "comment": "Amazing sushi!",
        "isAdminReply": null,
        "createdAt": "2025-07-10T10:00:00.000Z",
        "user": {
          "firstName": "Olena",
          "lastName": "Kovalenko"
        }
      }
    ],
    "pagination": { "page": 1, "limit": 10, "total": 3, "pages": 1, "hasNext": false, "hasPrev": false },
    "averageRating": 4.7,
    "totalApproved": 3
  }
}
```

---

#### POST `/products/:id/reviews`

Create a review for a product. Requires a completed order containing the product.

**Auth:** Bearer token

**Request Body:**
```json
{
  "orderId": "clx_ord1...",
  "rating": 5,
  "comment": "Amazing sushi!"
}
```

**Response (201):** Created review object.

**Errors:**
- `VALIDATION_ERROR` — Missing orderId/rating, order not completed, or product not in order.
- `409 CONFLICT` — Already reviewed this product from this order.

---

### 2.14 Feedback / Support

#### POST `/feedback`

Submit customer feedback or a support request.

**Auth:** Optional (works for both authenticated and anonymous users)

**Query Parameters:**

| Param | Type | Required | Description |
|---|---|---|---|
| brandId | string | Yes | Brand to associate feedback with |

**Request Body:**
```json
{
  "type": "order_issue",
  "subject": "Missing item",
  "message": "My order #1042 was missing the miso soup",
  "contactInfo": "+380991234567",
  "orderId": "clx_ord1...",
  "branchId": "clx_br1..."
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| type | string | Yes | `order_issue`, `general`, `suggestion`, `complaint` |
| subject | string | No | |
| message | string | Yes | Non-empty string |
| contactInfo | string | No | Phone/email for non-authenticated users |
| orderId | string | No | Link to a specific order |
| branchId | string | No | Link to a specific branch |

**Response (201):** Created `Feedback` object.

---

## 3. Response Format

All API responses follow a consistent envelope format:

### Success
```json
{
  "success": true,
  "data": <T>,
  "message?": "<optional message>"
}
```

### Error
```json
{
  "success": false,
  "error": {
    "code": "<ERROR_CODE>",
    "message": "<human-readable message>",
    "details?": <optional additional info>
  }
}
```

---

## 4. Error Handling

### HTTP Status Codes

| Code | Meaning | When |
|---|---|---|
| 200 | OK | Successful GET, PUT, DELETE |
| 201 | Created | Successful POST (register, cart, order, favorite, address, review, feedback) |
| 400 | Bad Request | Validation errors, missing required fields |
| 401 | Unauthorized | Missing or invalid JWT, expired refresh token |
| 403 | Forbidden | Account disabled, branch not accepting orders, not your resource |
| 404 | Not Found | Resource does not exist |
| 409 | Conflict | Duplicate email/phone, duplicate review, cart already exists |
| 429 | Too Many Requests | Rate limit exceeded |
| 500 | Internal Server Error | Unexpected server error |

### Common Error Codes

| Code | Description |
|---|---|
| `VALIDATION_ERROR` | Missing or invalid request fields |
| `INVALID_CREDENTIALS` | Wrong email/phone or password |
| `ACCOUNT_DISABLED` | Account has been disabled |
| `CONFLICT` | Duplicate resource |
| `NOT_FOUND` | Resource not found |
| `NO_CART` | Cart does not exist |
| `EMPTY_CART` | Cart is empty |
| `BRANCH_MISMATCH` | Cart branch differs from order branch |
| `ADDRESS_REQUIRED` | Delivery address required for delivery orders |
| `MIN_ORDER_AMOUNT` | Below minimum order amount for delivery |
| `PROMO_INVALID` | Invalid, expired, or exhausted promotion |
| `INSUFFICIENT_BONUS` | Not enough bonus points |
| `CANCEL_FAILED` | Order cannot be cancelled at this stage |
| `ALREADY_PAID` | Payment already completed |
| `RATE_LIMITED` | Too many requests |
| `INTERNAL_ERROR` | Unexpected server error |

### Handling Errors in the Mobile App

```typescript
import { AxiosError } from 'axios';
import type { ApiErrorResponse } from '../types/api';

apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError<ApiErrorResponse>) => {
    const code = error.response?.data?.error?.code;
    const message = error.response?.data?.error?.message;
    const status = error.response?.status;

    if (status === 401) {
      // Token expired — will be handled by refresh interceptor
      return Promise.reject(error);
    }

    if (status === 429) {
      const retryAfter = error.response?.headers?.['retry-after'];
      // Show "Try again in ${retryAfter} seconds" toast
    }

    // Show error message to user
    // showToast(message || 'Something went wrong');

    return Promise.reject(error);
  }
);
```

---

## 5. Rate Limiting

Different endpoints have different rate limits:

| Endpoint Category | Limit | Window |
|---|---|---|
| Auth (login, register) | 10 requests | Per minute per IP |
| Public API (branches, menu) | 60 requests | Per minute per IP |
| General API | 120 requests | Per minute per IP |
| Feedback | 120 requests | Per minute per IP |

**Headers to monitor:**

| Header | Description |
|---|---|
| `X-RateLimit-Remaining` | Number of requests remaining in the current window |
| `X-RateLimit-Reset` | Unix timestamp when the rate limit window resets |
| `Retry-After` | Seconds until the rate limit resets (only on 429 responses) |

**Mobile SDK recommendation:** Decrement a local counter based on `X-RateLimit-Remaining` and show a warning when below 5 requests remaining. On 429, parse `Retry-After` and schedule an automatic retry.