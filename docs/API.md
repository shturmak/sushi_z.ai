# SushiChain API — Mobile Developer Guide

## Base URL

| Environment | URL |
|---|---|
| Local dev | `http://localhost:3000` |
| Staging | _(configure per deployment)_ |
| Production | _(configure per deployment)_ |

All endpoints are prefixed with `/api/`.

---

## Authentication

The API uses **JWT access tokens + refresh tokens**.

### Login / Register

```
POST /api/auth/login
POST /api/auth/register
```

Both return:

```json
{
  "success": true,
  "data": {
    "user": { "id": "...", "firstName": "John", "role": "customer" },
    "loyalty": { "balance": 0, "tier": "bronze" },
    "accessToken": "eyJ...",
    "refreshToken": "eyJ..."
  }
}
```

### Token Lifecycle

| Token | TTL | Usage |
|---|---|---|
| **Access Token** | 15 minutes | Send in `Authorization: Bearer <token>` header on every authenticated request |
| **Refresh Token** | 30 days | Store securely; use to obtain a new access token when it expires |

### Refreshing Tokens

When the access token expires (HTTP 401 with code `UNAUTHORIZED`), call:

```
POST /api/auth/refresh
{ "refreshToken": "..." }
```

Returns `{ "success": true, "data": { "accessToken": "eyJ..." } }`.

### Logout

```
POST /api/auth/logout
{ "refreshToken": "..." }
```

### Mobile Implementation Tips

- Store refresh token in **secure storage** (Keychain on iOS, EncryptedSharedPreferences on Android).
- Use an **auth interceptor** in your HTTP client to:
  1. Attach `Authorization: Bearer` header automatically.
  2. On 401, call `/api/auth/refresh`, retry the failed request.
  3. If refresh also fails, redirect to login screen.

---

## Branch Isolation (Multi-Branch)

This is a **multi-branch** system. Most customer-facing data is scoped by branch:

- **Menu**: Pass `?branchId=<id>` to `/api/menu` to get the menu for a specific branch.
- **Cart**: Each cart is bound to a `branchId` (set at creation).
- **Orders**: Include the target `branchId`.
- **Delivery Zones**: Fetched per branch via `/api/branches/{id}/delivery-zones`.

**Flow:**
1. Call `GET /api/branches` to list available branches.
2. User selects a branch.
3. All subsequent menu/cart/order calls use that branch's ID.

---

## Response Envelope

Every endpoint returns a consistent JSON envelope:

### Success

```json
{
  "success": true,
  "data": <T>,
  "message": "Optional human-readable message"
}
```

### Error

```json
{
  "success": false,
  "error": {
    "code": "MACHINE_READABLE_CODE",
    "message": "Human-readable description",
    "details": {} // optional
  }
}
```

### Common Error Codes

| Code | HTTP Status | Meaning |
|---|---|---|
| `UNAUTHORIZED` | 401 | Missing/invalid/expired access token |
| `FORBIDDEN` | 403 | Insufficient permissions (e.g., non-admin accessing admin endpoints) |
| `NOT_FOUND` | 404 | Resource not found |
| `VALIDATION_ERROR` | 400 | Invalid request body/params |
| `CONFLICT` | 409 | Duplicate resource (email/phone/slug) |
| `INTERNAL_ERROR` | 500 | Server error |
| `INVALID_CREDENTIALS` | 401 | Wrong email/phone or password |
| `EMPTY_CART` | 400 | Cannot create order — cart is empty |
| `BRANCH_MISMATCH` | 400 | Cart branch doesn't match order branch |
| `INVALID_PROMO` | 400 | Promotion code invalid or expired |
| `INSUFFICIENT_BONUS` | 400 | Not enough bonus points |

---

## Key Workflows

### 1. Browse & Order

```
GET /api/branches                          → select a branch
GET /api/menu?branchId=<id>                → browse categories & products
GET /api/menu/<productId>                  → product detail with options
POST /api/cart                             → create cart for branch
POST /api/cart/items                       → add items with options
GET /api/cart                              → review cart
POST /api/promotions/validate              → optionally check promo code
POST /api/orders                           → place order (consumes cart)
POST /api/payments/intent                  → if card payment, get payment URL
GET /api/orders                            → track order status
```

### 2. Order Status State Machine

```
new → confirmed → cooking → ready → delivering → completed
  ↘ cancelled (from new or confirmed only)
```

### 3. Loyalty Program

- **5%** of every paid order total is earned as bonus points.
- Tiers: `bronze` (< 3000 UAH lifetime), `silver` (>= 3000), `gold` (>= 10000).
- Bonus can be used as partial payment via `useBonus` field in order creation.
- On cancellation, used bonus points are refunded.

### 4. Repeat Order

```
POST /api/orders/<id>/repeat
```

Populates the cart with available items from a previous order, replacing any existing cart.

---

## Admin Endpoints

All `/api/admin/*` endpoints require `role: admin` or `role: manager`.

| Endpoint | Description |
|---|---|
| `GET /api/admin/analytics` | Dashboard KPIs |
| `GET /api/admin/orders` | All orders (paginated, filterable) |
| `PUT /api/admin/orders/{id}/status` | Update order status |
| `GET/POST /api/admin/branches` | List/create branches |
| `GET/PUT/DELETE /api/admin/branches/{id}` | Branch CRUD |
| `GET/POST /api/admin/menu/categories` | List/create categories |
| `PUT/DELETE /api/admin/menu/categories/{id}` | Category CRUD |
| `GET/POST /api/admin/menu/products` | List/create products |
| `GET/PUT/DELETE /api/admin/menu/products/{id}` | Product CRUD |
| `GET/POST /api/admin/promotions` | List/create promotions |
| `PUT/DELETE /api/admin/promotions/{id}` | Promotion CRUD |

---

## Using the OpenAPI Spec

The complete API specification is in [`docs/openapi.yaml`](./openapi.yaml).

### Swagger UI

1. Go to [https://editor.swagger.io/](https://editor.swagger.io/)
2. Paste the contents of `openapi.yaml`
3. Browse and test all endpoints interactively

### Code Generation

Generate type-safe client SDKs for your mobile app:

```bash
# TypeScript / Axios
npx openapi-generator-cli generate \
  -i docs/openapi.yaml \
  -g typescript-axios \
  -o ./generated/api-client

# Kotlin (Retrofit)
npx openapi-generator-cli generate \
  -i docs/openapi.yaml \
  -g kotlin \
  -o ./generated/kotlin-client

# Swift (Alamofire)
npx openapi-generator-cli generate \
  -i docs/openapi.yaml \
  -g swift5 \
  -o ./generated/swift-client

# Dart (Flutter)
npx openapi-generator-cli generate \
  -i docs/openapi.yaml \
  -g dart \
  -o ./generated/dart-client
```

### Postman

1. Import → Raw text → paste the YAML content
2. Postman will auto-generate a collection with all endpoints