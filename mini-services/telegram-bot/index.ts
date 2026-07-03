import { Bot, InlineKeyboard, Context } from "grammy";
import { PrismaClient } from "@prisma/client";

// ─── DB (same SQLite as main app) ──────────────────────────────────
const db = new PrismaClient({
  datasources: { db: { url: "file:../../db/custom.db" } },
});

// ─── In-memory session store ────────────────────────────────────────
interface CartItem {
  productId: string;
  name: string;
  price: number;
  quantity: number;
}

interface UserSession {
  brandId?: string;
  brandName?: string;
  branchId?: string;
  branchName?: string;
  cart: CartItem[];
}

const sessions = new Map<number, UserSession>();

function getSession(chatId: number): UserSession {
  if (!sessions.has(chatId)) sessions.set(chatId, { cart: [] });
  return sessions.get(chatId)!;
}

// ─── Helpers ────────────────────────────────────────────────────────
const STATUS_LABELS: Record<string, string> = {
  new: "🆕 Нове",
  confirmed: "✅ Підтверджено",
  cooking: "👨‍🍳 Готується",
  ready: "📦 Готово",
  delivering: "🚗 Доставляється",
  completed: "✅ Виконано",
  cancelled: "❌ Скасовано",
};

// ─── Bot ────────────────────────────────────────────────────────────
const token = process.env.TELEGRAM_BOT_TOKEN;

if (!token) {
  console.warn(
    "⚠️  TELEGRAM_BOT_TOKEN not set. Create a .env file or set the env var. Bot will not start."
  );
  process.exit(0);
}

const bot = new Bot(token);

// ─── /start ─────────────────────────────────────────────────────────
bot.command("start", async (ctx) => {
  const session = getSession(ctx.chat.id);
  session.brandId = undefined;
  session.branchId = undefined;
  session.cart = [];

  const brands = await db.brand.findMany({ where: { isActive: true } });

  if (brands.length === 0) {
    await ctx.reply("🚫 Наразі немає доступних брендів.");
    return;
  }

  const kb = new InlineKeyboard();
  brands.forEach((b) => kb.text(b.name, `brand:${b.id}`));

  await ctx.reply(
    "👋 Вітаємо у SushiChain!\n\nОберіть бренд для замовлення:",
    { reply_markup: kb }
  );
});

// ─── /help ──────────────────────────────────────────────────────────
bot.command("help", async (ctx) => {
  await ctx.reply(
    "📋 <b>Доступні команди:</b>\n\n" +
      "/start — Почати замовлення\n" +
      "/cart — Кошик\n" +
      "/checkout — Оформити замовлення\n" +
      "/orders — Мої замовлення\n" +
      "/help — Ця довідка",
    { parse_mode: "HTML" }
  );
});

// ─── /cart ──────────────────────────────────────────────────────────
bot.command("cart", async (ctx) => {
  const session = getSession(ctx.chat.id);

  if (session.cart.length === 0) {
    await ctx.reply("🛒 Ваш кошик порожній.");
    return;
  }

  const lines = session.cart.map(
    (item, i) =>
      `${i + 1}. ${item.name} × ${item.quantity} — ${item.price * item.quantity}₴`
  );
  const total = session.cart.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );

  await ctx.reply(
    "🛒 <b>Ваш кошик:</b>\n\n" +
      lines.join("\n") +
      "\n\n" +
      `💰 <b>Разом:</b> ${total.toFixed(0)}₴\n\n` +
      "Щоб оформити — /checkout",
    { parse_mode: "HTML" }
  );
});

// ─── /checkout ──────────────────────────────────────────────────────
bot.command("checkout", async (ctx) => {
  const session = getSession(ctx.chat.id);

  if (!session.branchId) {
    await ctx.reply("❌ Спочатку оберіть бренд та філіал через /start");
    return;
  }

  if (session.cart.length === 0) {
    await ctx.reply("🛒 Ваш кошик порожній. Додайте товари через меню.");
    return;
  }

  const total = session.cart.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );

  const kb = new InlineKeyboard()
    .text("🚗 Доставка", "checkout:delivery")
    .text("🏪 Самовивіз", "checkout:pickup");

  await ctx.reply(
    "📦 <b>Оформлення замовлення</b>\n\n" +
      `📍 Філіал: ${session.branchName}\n` +
      `💰 Сума: ${total.toFixed(0)}₴\n\n` +
      "Оберіть спосіб отримання:",
    { parse_mode: "HTML", reply_markup: kb }
  );
});

// ─── /orders ────────────────────────────────────────────────────────
bot.command("orders", async (ctx) => {
  // We look up orders by Telegram chatId stored in the Order's note or
  // by a simple lookup. Since the schema doesn't have a telegramId field,
  // we use a convention: store telegramChatId in the order note as JSON metadata.
  // For demo purposes, we show orders that have our chatId in note.
  const tag = `tg:${ctx.chat.id}`;
  const orders = await db.order.findMany({
    where: {
      OR: [
        { note: { contains: tag } },
        { note: { endsWith: tag } },
      ],
    },
    orderBy: { createdAt: "desc" },
    take: 10,
    include: { brand: true, branch: true },
  });

  if (orders.length === 0) {
    await ctx.reply("📋 У вас ще немає замовлень.");
    return;
  }

  const lines = orders.map((o) => {
    const status = STATUS_LABELS[o.status] || o.status;
    return `${o.orderNumber} · ${o.brand.name} · ${o.branch.name}\n   ${status} · ${o.total.toFixed(0)}₴ · ${o.createdAt.toLocaleDateString("uk-UA")}`;
  });

  await ctx.reply("📋 <b>Ваші замовлення:</b>\n\n" + lines.join("\n\n"), {
    parse_mode: "HTML",
  });
});

// ─── Callback queries ───────────────────────────────────────────────
bot.on("callback_query:data", async (ctx) => {
  const data = ctx.callbackQuery.data;
  const chatId = ctx.chat?.id;
  if (!chatId) {
    await ctx.answerCallbackQuery("Помилка: повідомлення недоступне");
    return;
  }
  const session = getSession(chatId);

  // ── Brand selection ───────────────────────────────────────────
  if (data.startsWith("brand:")) {
    const brandId = data.slice(6);
    const brand = await db.brand.findUnique({ where: { id: brandId } });
    if (!brand) {
      await ctx.answerCallbackQuery("Бренд не знайдено");
      return;
    }

    session.brandId = brand.id;
    session.brandName = brand.name;
    session.branchId = undefined;
    session.cart = [];

    const branches = await db.branch.findMany({
      where: { brandId, isOpen: true },
      orderBy: { sortOrder: "asc" },
    });

    if (branches.length === 0) {
      await ctx.editMessageText("❌ У цього бренду немає відкритих філіалів.");
      return;
    }

    const kb = new InlineKeyboard();
    branches.forEach((b) => kb.text(b.name, `branch:${b.id}`));

    await ctx.editMessageText(
      `🏪 <b>${brand.name}</b>\n\nОберіть філіал:`,
      { parse_mode: "HTML", reply_markup: kb }
    );
    await ctx.answerCallbackQuery();
    return;
  }

  // ── Branch selection ──────────────────────────────────────────
  if (data.startsWith("branch:")) {
    const branchId = data.slice(7);
    const branch = await db.branch.findUnique({ where: { id: branchId } });
    if (!branch) {
      await ctx.answerCallbackQuery("Філіал не знайдено");
      return;
    }

    session.branchId = branch.id;
    session.branchName = branch.name;
    session.cart = [];

    // Show categories
    await showCategories(ctx, session);
    await ctx.answerCallbackQuery();
    return;
  }

  // ── Category selection ────────────────────────────────────────
  if (data.startsWith("category:")) {
    const categoryId = data.slice(9);
    await showProducts(ctx, session, categoryId);
    await ctx.answerCallbackQuery();
    return;
  }

  // ── Add to cart ───────────────────────────────────────────────
  if (data.startsWith("add:")) {
    const productId = data.slice(4);
    await addToCart(ctx, session, productId);
    await ctx.answerCallbackQuery("✅ Додано до кошика");
    return;
  }

  // ── Checkout type ─────────────────────────────────────────────
  if (data.startsWith("checkout:")) {
    const type = data.slice(9) as "delivery" | "pickup";
    await processCheckout(ctx, session, type, chatId);
    await ctx.answerCallbackQuery();
    return;
  }

  // ── Back to categories ────────────────────────────────────────
  if (data === "back:categories") {
    await showCategories(ctx, session);
    await ctx.answerCallbackQuery();
    return;
  }

  await ctx.answerCallbackQuery();
});

// ─── Show categories ────────────────────────────────────────────────
async function showCategories(
  ctx: Context,
  session: UserSession
) {
  if (!session.brandId || !session.branchId) return;

  const categories = await db.category.findMany({
    where: {
      brandId: session.brandId,
      isActive: true,
      OR: [{ branchId: null }, { branchId: session.branchId }],
    },
    orderBy: { sortOrder: "asc" },
  });

  if (categories.length === 0) {
    await ctx.editMessageText("📭 Категорії меню ще не додані.");
    return;
  }

  const kb = new InlineKeyboard();
  categories.forEach((c) => kb.text(c.name, `category:${c.id}`));

  await ctx.editMessageText(
    `📍 <b>${session.branchName}</b>\n\nОберіть категорію:`,
    { parse_mode: "HTML", reply_markup: kb }
  );
}

// ─── Show products in a category ────────────────────────────────────
async function showProducts(
  ctx: Context,
  session: UserSession,
  categoryId: string
) {
  if (!session.brandId || !session.branchId) return;

  const category = await db.category.findUnique({
    where: { id: categoryId },
  });
  if (!category) return;

  const products = await db.product.findMany({
    where: {
      categoryId,
      isAvailable: true,
      OR: [{ branchId: null }, { branchId: session.branchId }],
    },
    orderBy: { sortOrder: "asc" },
  });

  if (products.length === 0) {
    const kb = new InlineKeyboard().text("◀️ Назад", "back:categories");
    await ctx.editMessageText("📭 У цій категорії поки немає товарів.", {
      reply_markup: kb,
    });
    return;
  }

  const lines = products.map(
    (p) =>
      `🔸 <b>${p.name}</b>${p.weight ? ` · ${p.weight}` : ""}\n   💰 ${p.price.toFixed(0)}₴`
  );

  const kb = new InlineKeyboard();
  products.forEach((p) => kb.text(`🛒 ${p.name}`, `add:${p.id}`));
  kb.row().text("◀️ Назад", "back:categories");

  await ctx.editMessageText(
    `📂 <b>${category.name}</b>\n\n` + lines.join("\n\n"),
    { parse_mode: "HTML", reply_markup: kb }
  );
}

// ─── Add to cart ────────────────────────────────────────────────────
async function addToCart(
  ctx: Context,
  session: UserSession,
  productId: string
) {
  const product = await db.product.findUnique({ where: { id: productId } });
  if (!product) return;

  const existing = session.cart.find((item) => item.productId === productId);
  if (existing) {
    existing.quantity += 1;
  } else {
    session.cart.push({
      productId: product.id,
      name: product.name,
      price: product.price,
      quantity: 1,
    });
  }

  const totalItems = session.cart.reduce((s, i) => s + i.quantity, 0);
  const total = session.cart.reduce((s, i) => s + i.price * i.quantity, 0);

  await ctx.reply(
    `✅ <b>${product.name}</b> додано до кошика\n\n` +
      `🛒 Кошик: ${totalItems} товарів · ${total.toFixed(0)}₴`,
    { parse_mode: "HTML" }
  );
}

// ─── Process checkout ───────────────────────────────────────────────
async function processCheckout(
  ctx: Context,
  session: UserSession,
  type: "delivery" | "pickup",
  chatId: number
) {
  if (!session.brandId || !session.branchId || session.cart.length === 0) {
    await ctx.editMessageText("❌ Помилка. Спробуйте /start знову.");
    return;
  }

  const subtotal = session.cart.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );

  // Generate order number
  const count = await db.order.count();
  const orderNumber = `#${(count + 1000).toString()}`;

  // Create the order as "new" (pending)
  const order = await db.order.create({
    data: {
      orderNumber,
      userId: "telegram-user", // No real user account in Telegram flow
      brandId: session.brandId,
      branchId: session.branchId,
      type: type === "delivery" ? "delivery" : "pickup",
      status: "new",
      subtotal,
      total: subtotal,
      note: `tg:${chatId}`, // Tag for Telegram order lookup
      items: {
        create: session.cart.map((item) => ({
          productId: item.productId,
          productName: item.name,
          productPrice: item.price,
          quantity: item.quantity,
          totalPrice: item.price * item.quantity,
        })),
      },
    },
  });

  // Clear cart
  session.cart = [];

  const typeLabel = type === "delivery" ? "🚗 Доставка" : "🏪 Самовивіз";
  const itemLines = order.items
    .map((i) => `  · ${i.productName} × ${i.quantity} — ${i.totalPrice.toFixed(0)}₴`)
    .join("\n");

  await ctx.editMessageText(
    `🎉 <b>Замовлення створено!</b>\n\n` +
      `${typeLabel}\n` +
      `📍 Філіал: ${session.branchName}\n` +
      `🔢 Номер: <b>${order.orderNumber}</b>\n\n` +
      `📦 Товари:\n${itemLines}\n\n` +
      `💰 <b>Разом: ${order.total.toFixed(0)}₴</b>\n\n` +
      `Статус замовлення можна перевірити через /orders`,
    { parse_mode: "HTML" }
  );
}

// ─── Start ──────────────────────────────────────────────────────────
console.log(`🤖 Telegram bot mini-service starting on port 3004...`);
console.log(`   Using database: file:../../db/custom.db`);

bot.catch((err) => {
  console.error("❌ Bot error:", err);
});

bot.start({
  onStart: () => {
    console.log("✅ Bot started and polling for updates");
  },
});