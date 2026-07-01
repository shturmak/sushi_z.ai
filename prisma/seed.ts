import bcrypt from "bcrypt";
import { execSync } from "child_process";
import {
  PrismaClient,
  OrderStatus,
  OrderType,
  PaymentMethod,
  PaymentStatus,
} from "@prisma/client";

const prisma = new PrismaClient();

const WORK_SCHEDULE = JSON.stringify({
  mon: "10:00-22:00",
  tue: "10:00-22:00",
  wed: "10:00-22:00",
  thu: "10:00-22:00",
  fri: "10:00-23:00",
  sat: "10:00-23:00",
  sun: "11:00-21:00",
});

async function seed() {
  console.log("🌱 Seeding database...");

  const passwordHash = await bcrypt.hash("12345678", 10);

  // ─── BRANDS ──────────────────────────────────
  const brand1 = await prisma.brand.create({
    data: {
      name: "Суші Мастер",
      slug: "sushi-master",
      primaryColor: "#e11d48",
      secondaryColor: "#f43f5e",
      accentColor: "#fbbf24",
      description: "Найкращі роли та суші в Києві. Свіжі інгредієнти, авторські рецепти, швидка доставка.",
      slogan: "Смак Японії у вашому домі",
      isActive: true,
    },
  });

  const brand2 = await prisma.brand.create({
    data: {
      name: "Суши Токіо",
      slug: "sushi-tokyo",
      primaryColor: "#0f766e",
      secondaryColor: "#14b8a6",
      accentColor: "#f59e0b",
      description: "Автентична японська кухня у Львові. Традиційні рецепти від шеф-кухаря з Токіо.",
      slogan: "Справжній смак Токіо",
      isActive: true,
    },
  });

  // ─── USERS ───────────────────────────────────
  const superAdmin = await prisma.user.create({
    data: {
      email: "super@platform.ua",
      passwordHash,
      firstName: "Платформа",
      lastName: "Адмін",
      role: "super_admin",
      brandId: null,
    },
  });

  const admin1 = await prisma.user.create({
    data: {
      email: "admin@sushimaster.ua",
      passwordHash,
      firstName: "Олексій",
      lastName: "Шеф",
      phone: "+380991234567",
      role: "admin",
      brandId: brand1.id,
    },
  });

  const admin2 = await prisma.user.create({
    data: {
      email: "admin@sushitokyo.ua",
      passwordHash,
      firstName: "Тарас",
      lastName: "Менеджер",
      phone: "+380667778899",
      role: "admin",
      brandId: brand2.id,
    },
  });

  const customer = await prisma.user.create({
    data: {
      email: "alex@mail.ua",
      passwordHash,
      firstName: "Олександр",
      lastName: "Коваленко",
      phone: "+380507654321",
      role: "customer",
      brandId: null,
    },
  });

  // ─── ADDRESSES ───────────────────────────────
  await prisma.userAddress.createMany({
    data: [
      {
        userId: customer.id,
        label: "Дім",
        street: "вул. Хрещатик",
        building: "22",
        apartment: "15",
        floor: "4",
        entrance: "2",
        isDefault: true,
        latitude: 50.4501,
        longitude: 30.5234,
      },
      {
        userId: customer.id,
        label: "Робота",
        street: "булв. Шевченка",
        building: "5",
        apartment: "201",
        isDefault: false,
        latitude: 50.4547,
        longitude: 30.5238,
      },
    ],
  });

  // ═══════════════════════════════════════════════
  //  BRAND 1 — Суші Мастер (Київ)
  // ═══════════════════════════════════════════════

  const b1_branch1 = await prisma.branch.create({
    data: {
      brandId: brand1.id,
      name: "Суші Мастер — Хрещатик",
      slug: "khreshchatyk",
      address: "вул. Хрещатик, 22, Київ",
      phone: "+380441234567",
      email: "khreshchatyk@sushimaster.ua",
      latitude: 50.4501,
      longitude: 30.5234,
      isOpen: true,
      workSchedule: WORK_SCHEDULE,
      description: "Флагманське заведення в самому центрі Києва. Панорамний вид, лаунж-зона.",
      sortOrder: 1,
    },
  });

  const b1_branch2 = await prisma.branch.create({
    data: {
      brandId: brand1.id,
      name: "Суші Мастер — Оболонь",
      slug: "obolon",
      address: "вул. Героя Сталіна, 10, Київ",
      phone: "+380449876543",
      email: "obolon@sushimaster.ua",
      latitude: 50.5035,
      longitude: 30.5026,
      isOpen: true,
      workSchedule: WORK_SCHEDULE,
      description: "Затишна локація на Оболоні з дитячим куточком.",
      sortOrder: 2,
    },
  });

  // Delivery zones for brand 1
  await prisma.deliveryZone.createMany({
    data: [
      {
        branchId: b1_branch1.id,
        name: "Центр",
        description: "Весь центр Києва в межах Окружної дороги",
        minOrder: 200,
        deliveryFee: 50,
        estimatedMinutes: 30,
        isActive: true,
      },
      {
        branchId: b1_branch1.id,
        name: "Далекий центр",
        description: "Лівий берег, Голосіїво, Відрадний",
        minOrder: 400,
        deliveryFee: 80,
        estimatedMinutes: 45,
        isActive: true,
      },
      {
        branchId: b1_branch2.id,
        name: "Оболонь та Пріорка",
        description: "Оболонь, Пріорка, Нивки",
        minOrder: 250,
        deliveryFee: 40,
        estimatedMinutes: 25,
        isActive: true,
      },
    ],
  });

  // Categories for brand 1
  const b1_cats = await Promise.all([
    prisma.category.create({
      data: {
        brandId: brand1.id,
        name: "Роли",
        slug: "rolls",
        description: "Найкращі роли міста",
        sortOrder: 1,
      },
    }),
    prisma.category.create({
      data: {
        brandId: brand1.id,
        name: "Сети",
        slug: "sets",
        description: "Комплексні обіди та сети",
        sortOrder: 2,
      },
    }),
    prisma.category.create({
      data: {
        brandId: brand1.id,
        name: "Суші",
        slug: "sushi",
        description: "Класичні та фірмові суші",
        sortOrder: 3,
      },
    }),
    prisma.category.create({
      data: {
        brandId: brand1.id,
        name: "Гарячі страви",
        slug: "hot",
        description: "Рамен, темпура, вок",
        sortOrder: 4,
      },
    }),
    prisma.category.create({
      data: {
        brandId: brand1.id,
        name: "Напої",
        slug: "drinks",
        description: "Чай, лимонад, саке",
        sortOrder: 5,
      },
    }),
    prisma.category.create({
      data: {
        brandId: brand1.id,
        name: "Десерти",
        slug: "desserts",
        description: "Моті, тирамісу, морозиво",
        sortOrder: 6,
      },
    }),
  ]);

  // Products for brand 1
  type ProductInput = {
    categoryId: string;
    name: string;
    slug: string;
    description: string;
    price: number;
    weight: string;
    calories?: number;
    sortOrder: number;
    options?: {
      name: string;
      isRequired: boolean;
      maxChoices: number;
      opts: { name: string; priceDelta: number }[];
    }[];
  };

  const b1_productsData: ProductInput[] = [
    // Роли
    {
      categoryId: b1_cats[0].id,
      name: "Філадельфія класика",
      slug: "philadelphia-classic",
      description: "Лосось, крем-сир, авокадо, огірок",
      price: 189,
      weight: "220г",
      calories: 380,
      sortOrder: 1,
      options: [
        {
          name: "Розмір",
          isRequired: true,
          maxChoices: 1,
          opts: [
            { name: "Стандарт (8 шт)", priceDelta: 0 },
            { name: "Великий (12 шт) +70₴", priceDelta: 70 },
          ],
        },
      ],
    },
    {
      categoryId: b1_cats[0].id,
      name: "Каліфорнія",
      slug: "california",
      description: "Краб, авокадо, огірок, ікра Тобіко",
      price: 169,
      weight: "200г",
      calories: 320,
      sortOrder: 2,
      options: [
        {
          name: "Розмір",
          isRequired: true,
          maxChoices: 1,
          opts: [
            { name: "Стандарт (8 шт)", priceDelta: 0 },
            { name: "Великий (12 шт) +60₴", priceDelta: 60 },
          ],
        },
      ],
    },
    {
      categoryId: b1_cats[0].id,
      name: "Дракон",
      slug: "dragon-roll",
      description: "Вугор, авокадо, огірок, унагі соус, ікра",
      price: 289,
      weight: "280г",
      calories: 420,
      sortOrder: 3,
    },
    {
      categoryId: b1_cats[0].id,
      name: "Темпура рол з креветкою",
      slug: "tempura-shrimp",
      description: "Креветка темпура, авокадо, соус Спайсі",
      price: 219,
      weight: "240г",
      calories: 410,
      sortOrder: 4,
    },
    {
      categoryId: b1_cats[0].id,
      name: "Рол з лососем та манго",
      slug: "salmon-mango",
      description: "Лосось, манго, крем-сир, м'ята",
      price: 209,
      weight: "210г",
      calories: 340,
      sortOrder: 5,
    },
    // Сети
    {
      categoryId: b1_cats[1].id,
      name: 'Сет «Сімейний»',
      slug: "set-family",
      description:
        "24 роли: Філадельфія x2, Каліфорнія x2, Дракон, Темпура, Креветка",
      price: 899,
      weight: "1.2 кг",
      calories: 2200,
      sortOrder: 1,
    },
    {
      categoryId: b1_cats[1].id,
      name: 'Сет «Преміум»',
      slug: "set-premium",
      description: "36 роли: з лососем, вугром, креветкою, ікрою",
      price: 1399,
      weight: "1.8 кг",
      calories: 3400,
      sortOrder: 2,
    },
    {
      categoryId: b1_cats[1].id,
      name: 'Сет «Для двох»',
      slug: "set-couple",
      description: "16 ролів + 8 суші + 2 напої",
      price: 599,
      weight: "800г",
      calories: 1600,
      sortOrder: 3,
    },
    // Суші
    {
      categoryId: b1_cats[2].id,
      name: "Суші з лососем (2 шт)",
      slug: "sushi-salmon",
      description: "Свіжий лосось, рис, норі",
      price: 89,
      weight: "80г",
      calories: 150,
      sortOrder: 1,
    },
    {
      categoryId: b1_cats[2].id,
      name: "Суші з вугром (2 шт)",
      slug: "sushi-eel",
      description: "Вугор унагі, рис, норі, соус",
      price: 119,
      weight: "80г",
      calories: 180,
      sortOrder: 2,
    },
    {
      categoryId: b1_cats[2].id,
      name: "Гункан з ікрою (2 шт)",
      slug: "gunkan-caviar",
      description: "Ікра Тобіко, авокадо, рис",
      price: 109,
      weight: "60г",
      calories: 120,
      sortOrder: 3,
    },
    // Гарячі
    {
      categoryId: b1_cats[3].id,
      name: "Рамен з свининою",
      slug: "ramen-pork",
      description: "Бульйон тонкоцу, свинина чашу, яйце, норі, зелень",
      price: 249,
      weight: "450 мл",
      calories: 520,
      sortOrder: 1,
      options: [
        {
          name: "Добавка",
          isRequired: false,
          maxChoices: 2,
          opts: [
            { name: "Яйце +15₴", priceDelta: 15 },
            { name: "Креветка +35₴", priceDelta: 35 },
            { name: "Екстра норі +10₴", priceDelta: 10 },
          ],
        },
      ],
    },
    {
      categoryId: b1_cats[3].id,
      name: "Вок з куркою",
      slug: "wok-chicken",
      description: "Курка, овочі, локшина удон, соус теріякі",
      price: 199,
      weight: "350г",
      calories: 480,
      sortOrder: 2,
    },
    {
      categoryId: b1_cats[3].id,
      name: "Темпура набір",
      slug: "tempura-set",
      description: "Креветка, кабачок, батат у хрусткій темпурі",
      price: 229,
      weight: "250г",
      calories: 380,
      sortOrder: 3,
    },
    // Напої
    {
      categoryId: b1_cats[4].id,
      name: "Лимонад домашній",
      slug: "lemonade",
      description: "Лимон, м'ята, цукор, іній",
      price: 59,
      weight: "300 мл",
      calories: 90,
      sortOrder: 1,
      options: [
        {
          name: "Смак",
          isRequired: true,
          maxChoices: 1,
          opts: [
            { name: "Класичний", priceDelta: 0 },
            { name: "Ягідний", priceDelta: 10 },
            { name: "Імбирний", priceDelta: 10 },
          ],
        },
      ],
    },
    {
      categoryId: b1_cats[4].id,
      name: "Зелений чай",
      slug: "green-tea",
      description: "Японський сенча",
      price: 39,
      weight: "200 мл",
      calories: 5,
      sortOrder: 2,
    },
    {
      categoryId: b1_cats[4].id,
      name: 'Саке «Саяма»',
      slug: "sake",
      description: "Японське саке, сухе",
      price: 189,
      weight: "180 мл",
      calories: 240,
      sortOrder: 3,
    },
    // Десерти
    {
      categoryId: b1_cats[5].id,
      name: "Моті з полуницею",
      slug: "mochi-strawberry",
      description: "3 шт., японський рисовий десерт",
      price: 119,
      weight: "120г",
      calories: 250,
      sortOrder: 1,
    },
    {
      categoryId: b1_cats[5].id,
      name: "Тирамісу",
      slug: "tiramisu",
      description: "Класичний італійський десерт",
      price: 149,
      weight: "150г",
      calories: 380,
      sortOrder: 2,
    },
  ];

  for (const p of b1_productsData) {
    const product = await prisma.product.create({
      data: {
        brandId: brand1.id,
        categoryId: p.categoryId,
        name: p.name,
        slug: p.slug,
        description: p.description,
        price: p.price,
        weight: p.weight,
        calories: p.calories,
        sortOrder: p.sortOrder,
      },
    });

    if (p.options) {
      for (const group of p.options) {
        const optionGroup = await prisma.productOptionGroup.create({
          data: {
            productId: product.id,
            name: group.name,
            isRequired: group.isRequired,
            maxChoices: group.maxChoices,
            sortOrder: 0,
          },
        });
        for (const opt of group.opts) {
          await prisma.productOption.create({
            data: {
              groupId: optionGroup.id,
              name: opt.name,
              priceDelta: opt.priceDelta,
              sortOrder: 0,
            },
          });
        }
      }
    }
  }

  // Promotions for brand 1
  const b1_promo1 = await prisma.promotion.create({
    data: {
      brandId: brand1.id,
      code: "WELCOME20",
      name: "Перший замовлення -20%",
      description: "Знижка 20% на перше замовлення",
      type: "percentage",
      value: 20,
      minOrder: 300,
      maxUses: 1000,
      usedCount: 45,
      startDate: new Date("2024-01-01"),
      endDate: new Date("2027-12-31"),
      status: "active",
    },
  });

  await prisma.promotion.create({
    data: {
      brandId: brand1.id,
      code: "FREEDELIVERY",
      name: "Безкоштовна доставка",
      description: "Безкоштовна доставка при замовленні від 500₴",
      type: "free_delivery",
      value: 0,
      minOrder: 500,
      maxUses: 500,
      usedCount: 123,
      startDate: new Date("2024-06-01"),
      endDate: new Date("2027-06-30"),
      status: "active",
    },
  });

  await prisma.promotion.create({
    data: {
      brandId: brand1.id,
      code: "SUSHI100",
      name: "100₴ знижка",
      description: "Знижка 100₴ на замовлення від 600₴",
      type: "fixed",
      value: 100,
      minOrder: 600,
      startDate: new Date("2024-03-01"),
      endDate: new Date("2027-03-01"),
      status: "active",
    },
  });

  // Loyalty account for customer in brand 1
  const b1_loyalty = await prisma.loyaltyAccount.create({
    data: {
      userId: customer.id,
      brandId: brand1.id,
      balance: 350,
      lifetime: 2450,
      tier: "silver",
    },
  });

  // Sample orders for brand 1
  const b1_allProducts = await prisma.product.findMany({
    where: { brandId: brand1.id },
  });

  const b1_order1 = await prisma.order.create({
    data: {
      orderNumber: "#1001",
      userId: customer.id,
      branchId: b1_branch1.id,
      type: OrderType.delivery,
      status: OrderStatus.completed,
      addressSnapshot: JSON.stringify({
        street: "вул. Хрещатик",
        building: "22",
        apartment: "15",
      }),
      deliveryFee: 50,
      subtotal: 189 + 169 + 59,
      discount: 83.4,
      total: 189 + 169 + 59 - 83.4 + 50,
      note: "Дзвонити двічі",
      promotionId: b1_promo1.id,
      promotionCode: "WELCOME20",
      bonusUsed: 0,
      estimatedMinutes: 30,
      confirmedAt: new Date(Date.now() - 3600000 * 2),
      cookingAt: new Date(Date.now() - 3600000 * 1.5),
      completedAt: new Date(Date.now() - 3600000),
      createdAt: new Date(Date.now() - 3600000 * 2),
    },
  });

  await prisma.orderItem.createMany({
    data: [
      {
        orderId: b1_order1.id,
        productId: b1_allProducts[0].id,
        productName: b1_allProducts[0].name,
        productPrice: b1_allProducts[0].price,
        quantity: 1,
        totalPrice: b1_allProducts[0].price,
      },
      {
        orderId: b1_order1.id,
        productId: b1_allProducts[1].id,
        productName: b1_allProducts[1].name,
        productPrice: b1_allProducts[1].price,
        quantity: 1,
        totalPrice: b1_allProducts[1].price,
      },
      {
        orderId: b1_order1.id,
        productId: b1_allProducts[14].id,
        productName: b1_allProducts[14].name,
        productPrice: b1_allProducts[14].price,
        quantity: 1,
        totalPrice: b1_allProducts[14].price,
      },
    ],
  });

  await prisma.payment.create({
    data: {
      orderId: b1_order1.id,
      method: PaymentMethod.card,
      status: PaymentStatus.succeeded,
      amount: b1_order1.total,
      providerTxId: "txn_demo_001",
    },
  });

  // Order 2 — cooking
  const b1_order2 = await prisma.order.create({
    data: {
      orderNumber: "#1002",
      userId: customer.id,
      branchId: b1_branch1.id,
      type: OrderType.pickup,
      status: OrderStatus.cooking,
      subtotal: 899,
      discount: 0,
      total: 899,
      deliveryFee: 0,
      estimatedMinutes: 25,
      confirmedAt: new Date(Date.now() - 600000),
      cookingAt: new Date(Date.now() - 300000),
      createdAt: new Date(Date.now() - 600000),
    },
  });

  await prisma.orderItem.create({
    data: {
      orderId: b1_order2.id,
      productId: b1_allProducts[5].id,
      productName: b1_allProducts[5].name,
      productPrice: b1_allProducts[5].price,
      quantity: 1,
      totalPrice: b1_allProducts[5].price,
    },
  });

  await prisma.payment.create({
    data: {
      orderId: b1_order2.id,
      method: PaymentMethod.cash,
      status: PaymentStatus.pending,
      amount: b1_order2.total,
    },
  });

  // Order 3 — new
  const b1_order3 = await prisma.order.create({
    data: {
      orderNumber: "#1003",
      userId: customer.id,
      branchId: b1_branch1.id,
      type: OrderType.delivery,
      status: OrderStatus.new,
      addressSnapshot: JSON.stringify({
        street: "булв. Шевченка",
        building: "5",
        apartment: "201",
      }),
      deliveryFee: 50,
      subtotal: 289 + 59,
      discount: 0,
      total: 289 + 59 + 50,
      bonusUsed: 0,
      estimatedMinutes: 35,
      createdAt: new Date(Date.now() - 120000),
    },
  });

  await prisma.orderItem.createMany({
    data: [
      {
        orderId: b1_order3.id,
        productId: b1_allProducts[2].id,
        productName: b1_allProducts[2].name,
        productPrice: b1_allProducts[2].price,
        quantity: 1,
        totalPrice: b1_allProducts[2].price,
      },
      {
        orderId: b1_order3.id,
        productId: b1_allProducts[14].id,
        productName: b1_allProducts[14].name,
        productPrice: b1_allProducts[14].price,
        quantity: 1,
        totalPrice: b1_allProducts[14].price,
      },
    ],
  });

  // Loyalty transactions for brand 1
  await prisma.loyaltyTransaction.createMany({
    data: [
      {
        accountId: b1_loyalty.id,
        type: "earned",
        amount: 100,
        balanceAfter: 100,
        description: "Бонуси за замовлення #1001",
        relatedOrderId: b1_order1.id,
        createdAt: new Date(Date.now() - 3600000),
      },
      {
        accountId: b1_loyalty.id,
        type: "earned",
        amount: 250,
        balanceAfter: 350,
        description:
          "Бонуси за замовлення #1002 (покращений коефіцієнт Silver)",
        relatedOrderId: b1_order2.id,
        createdAt: new Date(Date.now() - 300000),
      },
    ],
  });

  // Cart for customer in brand 1
  const b1_cart = await prisma.cart.create({
    data: {
      userId: customer.id,
      branchId: b1_branch1.id,
    },
  });

  await prisma.cartItem.create({
    data: {
      cartId: b1_cart.id,
      productId: b1_allProducts[0].id,
      quantity: 2,
      totalPrice: b1_allProducts[0].price * 2,
    },
  });

  // ═══════════════════════════════════════════════
  //  BRAND 2 — Суши Токіо (Львів)
  // ═══════════════════════════════════════════════

  const b2_branch1 = await prisma.branch.create({
    data: {
      brandId: brand2.id,
      name: "Суши Токіо — Львів Центр",
      slug: "lviv-center",
      address: "пл. Ринок, 8, Львів",
      phone: "+380321234567",
      email: "lviv@sushitokyo.ua",
      latitude: 49.8417,
      longitude: 24.0317,
      isOpen: true,
      workSchedule: WORK_SCHEDULE,
      description: "Ресторан у самому серці Львова, поруч з площею Ринок.",
      sortOrder: 1,
    },
  });

  // Delivery zones for brand 2
  await prisma.deliveryZone.createMany({
    data: [
      {
        branchId: b2_branch1.id,
        name: "Центр Львова",
        description: "Площа Ринок, проспект Свободи, вул. Галицька",
        minOrder: 250,
        deliveryFee: 45,
        estimatedMinutes: 30,
        isActive: true,
      },
      {
        branchId: b2_branch1.id,
        name: "Ближні райони",
        description: "Сихів, Франківський, Личаків",
        minOrder: 350,
        deliveryFee: 70,
        estimatedMinutes: 45,
        isActive: true,
      },
    ],
  });

  // Categories for brand 2
  const b2_cats = await Promise.all([
    prisma.category.create({
      data: {
        brandId: brand2.id,
        name: "Роли",
        slug: "rolls",
        description: "Авторські роли від шефа",
        sortOrder: 1,
      },
    }),
    prisma.category.create({
      data: {
        brandId: brand2.id,
        name: "Сети",
        slug: "sets",
        description: "Комплексні сети для компанії",
        sortOrder: 2,
      },
    }),
    prisma.category.create({
      data: {
        brandId: brand2.id,
        name: "Напої",
        slug: "drinks",
        description: "Чай, лимонад, японські напої",
        sortOrder: 3,
      },
    }),
    prisma.category.create({
      data: {
        brandId: brand2.id,
        name: "Десерти",
        slug: "desserts",
        description: "Японські солодощі",
        sortOrder: 4,
      },
    }),
  ]);

  // Products for brand 2
  const b2_productsData: ProductInput[] = [
    {
      categoryId: b2_cats[0].id,
      name: "Токіо Рол",
      slug: "tokyo-roll",
      description: "Лосось, вугор, авокадо, ікра масаго",
      price: 259,
      weight: "260г",
      calories: 410,
      sortOrder: 1,
    },
    {
      categoryId: b2_cats[0].id,
      name: "Філадельфія Делюкс",
      slug: "philadelphia-deluxe",
      description: "Подвійний лосось, крем-сир, авокадо",
      price: 229,
      weight: "240г",
      calories: 390,
      sortOrder: 2,
    },
    {
      categoryId: b2_cats[0].id,
      name: "Рол «Самурай»",
      slug: "samurai-roll",
      description: "Креветка, вугор, огірок, соус унагі",
      price: 249,
      weight: "250г",
      calories: 400,
      sortOrder: 3,
    },
    {
      categoryId: b2_cats[1].id,
      name: 'Сет «Токіо Найт»',
      slug: "set-tokyo-night",
      description: "30 ролів: Токіо Рол, Філадельфія Делюкс, Самурай, Калифорнія",
      price: 1199,
      weight: "1.5 кг",
      calories: 2800,
      sortOrder: 1,
    },
    {
      categoryId: b2_cats[1].id,
      name: 'Сет «Львівський»',
      slug: "set-lviv",
      description: "20 ролів + 6 суші + соуси",
      price: 749,
      weight: "900г",
      calories: 1800,
      sortOrder: 2,
    },
    {
      categoryId: b2_cats[2].id,
      name: "Матча Латте",
      slug: "matcha-latte",
      description: "Японський зелений чай матча з молоком",
      price: 69,
      weight: "250 мл",
      calories: 120,
      sortOrder: 1,
    },
    {
      categoryId: b2_cats[2].id,
      name: "Рамуне (японський лимонад)",
      slug: "ramune",
      description: "Класичний газований напій з Японії",
      price: 49,
      weight: "200 мл",
      calories: 80,
      sortOrder: 2,
    },
    {
      categoryId: b2_cats[3].id,
      name: "Моті асорті",
      slug: "mochi-assorti",
      description: "6 шт.: полуниця, манго, шоколад, зелений чай, чорниця, персик",
      price: 189,
      weight: "240г",
      calories: 500,
      sortOrder: 1,
    },
  ];

  for (const p of b2_productsData) {
    await prisma.product.create({
      data: {
        brandId: brand2.id,
        categoryId: p.categoryId,
        name: p.name,
        slug: p.slug,
        description: p.description,
        price: p.price,
        weight: p.weight,
        calories: p.calories,
        sortOrder: p.sortOrder,
      },
    });
  }

  // Promotion for brand 2
  const b2_promo1 = await prisma.promotion.create({
    data: {
      brandId: brand2.id,
      code: "TOKYO10",
      name: "Знижка -10% у Суши Токіо",
      description: "Знижка 10% на будь-яке замовлення",
      type: "percentage",
      value: 10,
      minOrder: 200,
      maxUses: 500,
      usedCount: 12,
      startDate: new Date("2024-06-01"),
      endDate: new Date("2027-06-01"),
      status: "active",
    },
  });

  // Loyalty account for customer in brand 2
  const b2_loyalty = await prisma.loyaltyAccount.create({
    data: {
      userId: customer.id,
      brandId: brand2.id,
      balance: 50,
      lifetime: 50,
      tier: "bronze",
    },
  });

  // Sample order for brand 2
  const b2_allProducts = await prisma.product.findMany({
    where: { brandId: brand2.id },
  });

  const b2_order1 = await prisma.order.create({
    data: {
      orderNumber: "#2001",
      userId: customer.id,
      branchId: b2_branch1.id,
      type: OrderType.delivery,
      status: OrderStatus.completed,
      addressSnapshot: JSON.stringify({
        street: "вул. Галицька",
        building: "14",
        apartment: "3",
      }),
      deliveryFee: 45,
      subtotal: 259 + 229,
      discount: 48.8,
      total: 259 + 229 - 48.8 + 45,
      note: "Без цибулі",
      promotionId: b2_promo1.id,
      promotionCode: "TOKYO10",
      bonusUsed: 0,
      estimatedMinutes: 35,
      confirmedAt: new Date(Date.now() - 7200000),
      cookingAt: new Date(Date.now() - 5400000),
      readyAt: new Date(Date.now() - 3600000),
      deliveringAt: new Date(Date.now() - 1800000),
      completedAt: new Date(Date.now() - 900000),
      createdAt: new Date(Date.now() - 7200000),
    },
  });

  await prisma.orderItem.createMany({
    data: [
      {
        orderId: b2_order1.id,
        productId: b2_allProducts[0].id,
        productName: b2_allProducts[0].name,
        productPrice: b2_allProducts[0].price,
        quantity: 1,
        totalPrice: b2_allProducts[0].price,
      },
      {
        orderId: b2_order1.id,
        productId: b2_allProducts[1].id,
        productName: b2_allProducts[1].name,
        productPrice: b2_allProducts[1].price,
        quantity: 1,
        totalPrice: b2_allProducts[1].price,
      },
    ],
  });

  await prisma.payment.create({
    data: {
      orderId: b2_order1.id,
      method: PaymentMethod.card,
      status: PaymentStatus.succeeded,
      amount: b2_order1.total,
      providerTxId: "txn_tokyo_001",
    },
  });

  // Loyalty transaction for brand 2
  await prisma.loyaltyTransaction.create({
    data: {
      accountId: b2_loyalty.id,
      type: "earned",
      amount: 50,
      balanceAfter: 50,
      description: "Бонуси за замовлення #2001",
      relatedOrderId: b2_order1.id,
      createdAt: new Date(Date.now() - 900000),
    },
  });

  // ─── BRAND COUNTS ────────────────────────────
  await prisma.brandCounts.createMany({
    data: [
      {
        brandId: brand1.id,
        branches: 2,
        products: b1_productsData.length,
        orders: 3,
        users: 1,
      },
      {
        brandId: brand2.id,
        branches: 1,
        products: b2_productsData.length,
        orders: 1,
        users: 1,
      },
    ],
  });

  console.log("✅ Seed completed!");
  console.log(`  Brands:`);
  console.log(`    1. ${brand1.name} (${brand1.slug}) — id: ${brand1.id}`);
  console.log(`    2. ${brand2.name} (${brand2.slug}) — id: ${brand2.id}`);
  console.log(`  Users:`);
  console.log(`    super_admin: ${superAdmin.email}`);
  console.log(`    admin (Суші Мастер): ${admin1.email}`);
  console.log(`    admin (Суши Токіо): ${admin2.email}`);
  console.log(`    customer: ${customer.email}`);
  console.log(`  Products: ${b1_productsData.length} (brand1) + ${b2_productsData.length} (brand2) = ${b1_productsData.length + b2_productsData.length} total`);
}

// Delete DB and push schema before seeding
try {
  execSync("rm -f db/custom.db");
  console.log("🗑️  Removed existing database.");
} catch {}

execSync("npx prisma db push --skip-generate", { stdio: "inherit" });

seed()
  .catch(console.error)
  .finally(() => prisma.$disconnect());