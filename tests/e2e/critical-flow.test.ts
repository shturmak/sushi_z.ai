/**
 * E2E Tests — Critical Customer Ordering Flow
 *
 * Hits the real running API at localhost:3000.
 * Run with: bun test tests/e2e/critical-flow.test.ts
 *
 * Prerequisites:
 *   - Dev server running on port 3000
 *   - Database seeded (bun run prisma db seed)
 */

import { describe, test, expect, beforeAll, afterAll } from "bun:test";

const base = "http://localhost:3000";

// ── Shared state across tests ────────────────────────────────────────
let brandId: string;
let branchId: string;
let accessToken: string;
let userId: string;
let productId: string;
let orderId: string;
const timestamp = Date.now();
const testEmail = `e2e-test-${timestamp}@example.com`;
const testPassword = "TestPass123!";

// ── Helpers ──────────────────────────────────────────────────────────

async function json(method: string, path: string, body?: unknown, headers?: Record<string, string>) {
  const opts: RequestInit = {
    method,
    headers: {
      "Content-Type": "application/json",
      ...headers,
    },
  };
  if (body !== undefined) {
    opts.body = JSON.stringify(body);
  }
  const res = await fetch(`${base}${path}`, opts);
  const data = await res.json();
  return { status: res.status, data };
}

function authHeaders(token: string) {
  return { Authorization: `Bearer ${token}` };
}

// ── Setup: resolve brandId & branchId from seed data ─────────────────

describe("E2E Critical Ordering Flow", () => {
  beforeAll(async () => {
    // Fetch brands to get a valid brandId
    const brandsRes = await json("GET", "/api/brands");
    expect(brandsRes.status).toBe(200);
    expect(brandsRes.data.success).toBe(true);
    expect(brandsRes.data.data.length).toBeGreaterThan(0);
    brandId = brandsRes.data.data[0].id;

    // Fetch branches and find one belonging to our brand
    const branchesRes = await json("GET", "/api/branches");
    expect(branchesRes.status).toBe(200);
    expect(branchesRes.data.success).toBe(true);
    const branch = branchesRes.data.data.find((b: { brandId: string }) => b.brandId === brandId);
    expect(branch).toBeDefined();
    branchId = branch.id;
  }, 30000);

  // ─── 1. AUTH FLOW ───────────────────────────────────────────────────

  describe("Auth Flow: Register → Login → Get Profile", () => {
    test(
      "should register a new user",
      async () => {
        const res = await json("POST", "/api/auth/register", {
          email: testEmail,
          password: testPassword,
          firstName: "E2E",
          phone: `+38099${String(Math.floor(Math.random() * 100000000)).padStart(8, "0")}`,
          brandId,
        });

        // If user already exists, that's okay — just log in instead
        if (res.status === 409) {
          console.log(`  ⚠ User ${testEmail} already exists, skipping registration`);
          return;
        }

        expect(res.status).toBe(201);
        expect(res.data.success).toBe(true);
        expect(res.data.data.user).toBeDefined();
        expect(res.data.data.user.email).toBe(testEmail);
        expect(res.data.data.accessToken).toBeDefined();
        accessToken = res.data.data.accessToken;
        userId = res.data.data.user.id;
      },
      30000,
    );

    test(
      "should login with the registered user",
      async () => {
        const res = await json("POST", "/api/auth/login", {
          email: testEmail,
          password: testPassword,
        });

        expect(res.status).toBe(200);
        expect(res.data.success).toBe(true);
        expect(res.data.data.accessToken).toBeDefined();
        expect(res.data.data.user.email).toBe(testEmail);

        accessToken = res.data.data.accessToken;
        userId = res.data.data.user.id;
      },
      30000,
    );

    test(
      "should get the user profile",
      async () => {
        const res = await json("GET", "/api/me", undefined, authHeaders(accessToken));

        expect(res.status).toBe(200);
        expect(res.data.success).toBe(true);
        expect(res.data.data.id).toBe(userId);
        expect(res.data.data.email).toBe(testEmail);
        expect(res.data.data.firstName).toBe("E2E");
      },
      30000,
    );

    test(
      "should reject unauthenticated profile request",
      async () => {
        const res = await json("GET", "/api/me");
        expect(res.status).toBe(401);
        expect(res.data.success).toBe(false);
        expect(res.data.error.code).toBe("UNAUTHORIZED");
      },
      30000,
    );
  });

  // ─── 2. BROWSE FLOW ─────────────────────────────────────────────────

  describe("Browse Flow: Branches → Menu", () => {
    test(
      "should list all branches",
      async () => {
        const res = await json("GET", "/api/branches");

        expect(res.status).toBe(200);
        expect(res.data.success).toBe(true);
        expect(Array.isArray(res.data.data)).toBe(true);
        expect(res.data.data.length).toBeGreaterThan(0);
      },
      30000,
    );

    test(
      "should return menu for a branch with categories and products",
      async () => {
        const res = await json("GET", `/api/menu?branchId=${branchId}`);

        expect(res.status).toBe(200);
        expect(res.data.success).toBe(true);
        expect(Array.isArray(res.data.data)).toBe(true);
        expect(res.data.data.length).toBeGreaterThan(0);

        // Verify category structure
        const firstCategory = res.data.data[0];
        expect(firstCategory).toHaveProperty("id");
        expect(firstCategory).toHaveProperty("name");
        expect(firstCategory).toHaveProperty("products");
        expect(Array.isArray(firstCategory.products)).toBe(true);

        // Grab a product ID for later use
        const allProducts = res.data.data.flatMap(
          (cat: { products: Array<{ id: string; isAvailable: boolean }> }) =>
            cat.products.filter((p) => p.isAvailable),
        );
        expect(allProducts.length).toBeGreaterThan(0);
        productId = allProducts[0].id;
      },
      30000,
    );

    test(
      "should return 400 for menu without branchId",
      async () => {
        const res = await json("GET", "/api/menu");
        expect(res.status).toBe(400);
        expect(res.data.success).toBe(false);
      },
      30000,
    );
  });

  // ─── 3. CART FLOW ───────────────────────────────────────────────────

  describe("Cart Flow: Create → Add Item → Verify", () => {
    test(
      "should create a cart for a branch",
      async () => {
        // Clear any existing cart first
        await json("DELETE", "/api/cart", undefined, authHeaders(accessToken));

        const res = await json(
          "POST",
          "/api/cart",
          { branchId },
          authHeaders(accessToken),
        );

        expect(res.status).toBe(201);
        expect(res.data.success).toBe(true);
        expect(res.data.data.branchId).toBe(branchId);
      },
      30000,
    );

    test(
      "should add an item to the cart",
      async () => {
        const res = await json(
          "POST",
          "/api/cart/items",
          { productId, quantity: 2 },
          authHeaders(accessToken),
        );

        expect(res.status).toBe(201);
        expect(res.data.success).toBe(true);
        expect(res.data.data.productId).toBe(productId);
        expect(res.data.data.quantity).toBe(2);
      },
      30000,
    );

    test(
      "should reject adding item without auth",
      async () => {
        const res = await json("POST", "/api/cart/items", {
          productId,
          quantity: 1,
        });
        expect(res.status).toBe(401);
      },
      30000,
    );

    test(
      "should get cart with items and computed subtotal",
      async () => {
        const res = await json("GET", "/api/cart", undefined, authHeaders(accessToken));

        expect(res.status).toBe(200);
        expect(res.data.success).toBe(true);
        expect(res.data.data).toBeDefined();
        expect(res.data.data.items).toBeDefined();
        expect(res.data.data.items.length).toBeGreaterThan(0);
        expect(res.data.data.totalItems).toBeGreaterThanOrEqual(2);
        expect(typeof res.data.data.subtotal).toBe("number");
        expect(res.data.data.subtotal).toBeGreaterThan(0);

        // Verify the product is in the cart
        const cartProductIds = res.data.data.items.map(
          (item: { productId: string }) => item.productId,
        );
        expect(cartProductIds).toContain(productId);
      },
      30000,
    );
  });

  // ─── 4. ORDER FLOW ──────────────────────────────────────────────────

  describe("Order Flow: Create → List → Verify", () => {
    test(
      "should create a pickup order with cash payment",
      async () => {
        const res = await json(
          "POST",
          "/api/orders",
          {
            branchId,
            type: "pickup",
            paymentMethod: "cash",
          },
          authHeaders(accessToken),
        );

        expect(res.status).toBe(201);
        expect(res.data.success).toBe(true);
        expect(res.data.data).toBeDefined();
        expect(res.data.data.orderNumber).toBeDefined();
        expect(res.data.data.status).toBe("new");
        expect(res.data.data.total).toBeGreaterThanOrEqual(0);
        expect(res.data.data.items).toBeDefined();
        expect(res.data.data.items.length).toBeGreaterThan(0);

        orderId = res.data.data.id;
      },
      30000,
    );

    test(
      "should list user orders and find the created one",
      async () => {
        const res = await json("GET", "/api/orders", undefined, authHeaders(accessToken));

        expect(res.status).toBe(200);
        expect(res.data.success).toBe(true);
        expect(res.data.data.data).toBeDefined();
        expect(Array.isArray(res.data.data.data)).toBe(true);
        expect(res.data.data.pagination).toBeDefined();
        expect(res.data.data.pagination.total).toBeGreaterThan(0);

        // Verify our order is in the list
        const found = res.data.data.data.find(
          (o: { id: string }) => o.id === orderId,
        );
        expect(found).toBeDefined();
        expect(found.branch).toBeDefined();
        expect(found.payments).toBeDefined();
      },
      30000,
    );

    test(
      "should reject order creation without auth",
      async () => {
        // Need a new cart since the previous was consumed
        const res = await json("POST", "/api/orders", {
          branchId,
          type: "pickup",
          paymentMethod: "cash",
        });
        expect(res.status).toBe(401);
      },
      30000,
    );

    test(
      "should reject order creation with empty cart",
      async () => {
        const res = await json(
          "POST",
          "/api/orders",
          {
            branchId,
            type: "pickup",
            paymentMethod: "cash",
          },
          authHeaders(accessToken),
        );

        // Cart was cleared after the previous order, so this should fail
        expect(res.data.success).toBe(false);
        expect(
          res.data.error.code === "EMPTY_CART" || res.data.error.code === "NO_CART",
        ).toBe(true);
      },
      30000,
    );
  });

  // ─── 5. LOYALTY FLOW ────────────────────────────────────────────────

  describe("Loyalty Flow: Check balance after order", () => {
    test(
      "should have earned bonus points from the order",
      async () => {
        const res = await json(
          "GET",
          `/api/me/loyalty?brandId=${brandId}`,
          undefined,
          authHeaders(accessToken),
        );

        expect(res.status).toBe(200);
        expect(res.data.success).toBe(true);
        expect(typeof res.data.data.balance).toBe("number");
        expect(typeof res.data.data.lifetime).toBe("number");
        expect(res.data.data.tier).toBeDefined();

        // After an order, lifetime should be > 0 (5% bonus earned)
        expect(res.data.data.lifetime).toBeGreaterThan(0);
        expect(res.data.data.balance).toBeGreaterThan(0);
      },
      30000,
    );

    test(
      "should return default loyalty for unknown brandId",
      async () => {
        const res = await json(
          "GET",
          "/api/me/loyalty?brandId=nonexistent-brand-id",
          undefined,
          authHeaders(accessToken),
        );

        expect(res.status).toBe(200);
        expect(res.data.success).toBe(true);
        expect(res.data.data.balance).toBe(0);
        expect(res.data.data.tier).toBe("bronze");
      },
      30000,
    );
  });

  // ─── 6. PROMOTION FLOW ─────────────────────────────────────────────

  describe("Promotion Flow: List → Validate", () => {
    test(
      "should list active promotions",
      async () => {
        const res = await json("GET", "/api/promotions");

        expect(res.status).toBe(200);
        expect(res.data.success).toBe(true);
        expect(Array.isArray(res.data.data)).toBe(true);
        expect(res.data.data.length).toBeGreaterThan(0);
      },
      30000,
    );

    test(
      "should validate SUSHI20 promo code with sufficient subtotal",
      async () => {
        const res = await json("POST", "/api/promotions/validate", {
          code: "SUSHI20",
          subtotal: 500,
        });

        expect(res.status).toBe(200);
        expect(res.data.success).toBe(true);
        expect(res.data.data.type).toBe("percentage");
        expect(res.data.data.value).toBe(20);
        expect(res.data.data.discount).toBe(100); // 20% of 500
        expect(res.data.data.name).toBeDefined();
      },
      30000,
    );

    test(
      "should reject SUSHI20 promo when subtotal is below minimum",
      async () => {
        const res = await json("POST", "/api/promotions/validate", {
          code: "SUSHI20",
          subtotal: 100,
        });

        expect(res.status).toBe(400);
        expect(res.data.success).toBe(false);
        expect(res.data.error.code).toBe("PROMO_INVALID");
      },
      30000,
    );

    test(
      "should reject invalid promo code",
      async () => {
        const res = await json("POST", "/api/promotions/validate", {
          code: "NONEXISTENT",
          subtotal: 500,
        });

        expect(res.status).toBe(400);
        expect(res.data.success).toBe(false);
        expect(res.data.error.code).toBe("PROMO_INVALID");
      },
      30000,
    );

    test(
      "should reject validation with missing code",
      async () => {
        const res = await json("POST", "/api/promotions/validate", {
          subtotal: 500,
        });

        expect(res.status).toBe(400);
        expect(res.data.success).toBe(false);
      },
      30000,
    );

    test(
      "should reject validation with zero subtotal",
      async () => {
        const res = await json("POST", "/api/promotions/validate", {
          code: "SUSHI20",
          subtotal: 0,
        });

        expect(res.status).toBe(400);
        expect(res.data.success).toBe(false);
      },
      30000,
    );
  });
});