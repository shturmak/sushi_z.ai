import { PrismaClient, OrderStatus, OrderType, PaymentMethod, PaymentStatus, PromotionType } from '@prisma/client';

const prisma = new PrismaClient();

const WORK_SCHEDULE = JSON.stringify({
  mon: '10:00-22:00',
  tue: '10:00-22:00',
  wed: '10:00-22:00',
  thu: '10:00-22:00',
  fri: '10:00-23:00',
  sat: '10:00-23:00',
  sun: '11:00-21:00',
});

async function seed() {
  console.log('🌱 Seeding database...');

  // ─── USERS ─────────────────────────────────────
  const admin = await prisma.user.create({
    data: {
      phone: '+380991234567',
      email: 'admin@sushichain.ua',
      passwordHash: 'hashed_-1861353340_8',
      firstName: 'Олексій',
      lastName: 'Шеф',
      role: 'admin',
    },
  });

  const customer = await prisma.user.create({
    data: {
      phone: '+380507654321',
      email: 'customer@example.com',
      passwordHash: 'hashed_-1861353340_8',
      firstName: 'Марія',
      lastName: 'Коваленко',
      role: 'customer',
    },
  });

  // ─── LOYALTY ──────────────────────────────────
  await prisma.loyaltyAccount.create({
    data: {
      userId: customer.id,
      balance: 350,
      lifetime: 2450,
      tier: 'silver',
    },
  });

  // ─── ADDRESSES ─────────────────────────────────
  await prisma.userAddress.createMany({
    data: [
      {
        userId: customer.id,
        label: 'Дім',
        street: 'вул. Хрещатик',
        building: '22',
        apartment: '15',
        floor: '4',
        entrance: '2',
        isDefault: true,
        latitude: 50.4501,
        longitude: 30.5234,
      },
      {
        userId: customer.id,
        label: 'Робота',
        street: 'булв. Шевченка',
        building: '5',
        apartment: '201',
        isDefault: false,
        latitude: 50.4547,
        longitude: 30.5238,
      },
    ],
  });

  // ─── BRANCHES ─────────────────────────────────
  const branch1 = await prisma.branch.create({
    data: {
      name: 'СушіМастер Центр',
      slug: 'center',
      address: 'вул. Хрещатик, 22, Київ',
      phone: '+380441234567',
      email: 'center@sushichain.ua',
      latitude: 50.4501,
      longitude: 30.5234,
      isOpen: true,
      workSchedule: WORK_SCHEDULE,
      description: 'Флагманське заведення в самому центрі Києва. Панорамний вид, лаунж-зона.',
      sortOrder: 1,
    },
  });

  const branch2 = await prisma.branch.create({
    data: {
      name: 'СушіМастер Оболонь',
      slug: 'obolon',
      address: 'вул. Героя Сталіна, 10, Київ',
      phone: '+380449876543',
      email: 'obolon@sushichain.ua',
      latitude: 50.5035,
      longitude: 30.5026,
      isOpen: true,
      workSchedule: WORK_SCHEDULE,
      description: 'Затишна локація на Оболоні з дитячим куточком.',
      sortOrder: 2,
    },
  });

  // ─── DELIVERY ZONES ───────────────────────────
  await prisma.deliveryZone.createMany({
    data: [
      {
        branchId: branch1.id,
        name: 'Центр',
        description: 'Весь центр Києва в межах Окружної дороги',
        minOrder: 200,
        deliveryFee: 50,
        estimatedMinutes: 30,
        isActive: true,
      },
      {
        branchId: branch1.id,
        name: 'Далекий центр',
        description: 'Лівий берег, Голосіїво, Відрадний',
        minOrder: 400,
        deliveryFee: 80,
        estimatedMinutes: 45,
        isActive: true,
      },
      {
        branchId: branch2.id,
        name: 'Оболонь та Пріорка',
        description: 'Оболонь, Пріорка, Нивки',
        minOrder: 250,
        deliveryFee: 40,
        estimatedMinutes: 25,
        isActive: true,
      },
    ],
  });

  // ─── CATEGORIES ───────────────────────────────
  const categories = await Promise.all([
    prisma.category.create({ data: { branchId: branch1.id, name: 'Роли', slug: 'rolls', description: 'Найкращі роли міста', sortOrder: 1 } }),
    prisma.category.create({ data: { branchId: branch1.id, name: 'Сети', slug: 'sets', description: 'Комплексні обіди та сети', sortOrder: 2 } }),
    prisma.category.create({ data: { branchId: branch1.id, name: 'Суші', slug: 'sushi', description: 'Класичні та фірмові суші', sortOrder: 3 } }),
    prisma.category.create({ data: { branchId: branch1.id, name: 'Гарячі страви', slug: 'hot', description: 'Рамен, темпура, вок', sortOrder: 4 } }),
    prisma.category.create({ data: { branchId: branch1.id, name: 'Напої', slug: 'drinks', description: 'Чай, лимонад, саке', sortOrder: 5 } }),
    prisma.category.create({ data: { branchId: branch1.id, name: 'Десерти', slug: 'desserts', description: 'Моті, тирамісу, морозиво', sortOrder: 6 } }),
  ]);

  // ─── PRODUCTS ─────────────────────────────────
  type ProductInput = {
    categoryId: string;
    name: string;
    slug: string;
    description: string;
    price: number;
    weight: string;
    calories?: number;
    sortOrder: number;
    options?: { name: string; isRequired: boolean; maxChoices: number; opts: { name: string; priceDelta: number }[] }[];
  };

  const productsData: ProductInput[] = [
    // Роли
    {
      categoryId: categories[0].id, name: 'Філадельфія класика', slug: 'philadelphia-classic',
      description: 'Лосось, крем-сир, авокадо, огірок', price: 189, weight: '220г', calories: 380, sortOrder: 1,
      options: [{ name: 'Розмір', isRequired: true, maxChoices: 1, opts: [{ name: 'Стандарт (8 шт)', priceDelta: 0 }, { name: 'Великий (12 шт) +70₴', priceDelta: 70 }] }],
    },
    {
      categoryId: categories[0].id, name: 'Каліфорнія', slug: 'california',
      description: 'Краб, авокадо, огірок, ікра Тобіко', price: 169, weight: '200г', calories: 320, sortOrder: 2,
      options: [{ name: 'Розмір', isRequired: true, maxChoices: 1, opts: [{ name: 'Стандарт (8 шт)', priceDelta: 0 }, { name: 'Великий (12 шт) +60₴', priceDelta: 60 }] }],
    },
    {
      categoryId: categories[0].id, name: 'Дракон', slug: 'dragon-roll',
      description: 'Вугор, авокадо, огірок, унагі соус, ікра', price: 289, weight: '280г', calories: 420, sortOrder: 3,
    },
    {
      categoryId: categories[0].id, name: 'Темпура рол з креветкою', slug: 'tempura-shrimp',
      description: 'Креветка темпура, авокадо, соус Спайсі', price: 219, weight: '240г', calories: 410, sortOrder: 4,
    },
    {
      categoryId: categories[0].id, name: 'Рол з лососем та манго', slug: 'salmon-mango',
      description: "Лосось, манго, крем-сир, м'ята", price: 209, weight: '210г', calories: 340, sortOrder: 5,
    },
    // Сети
    {
      categoryId: categories[1].id, name: 'Сет «Сімейний»', slug: 'set-family',
      description: '24 роли: Філадельфія x2, Каліфорнія x2, Дракон, Темпура, Креветка', price: 899, weight: '1.2 кг', calories: 2200, sortOrder: 1,
    },
    {
      categoryId: categories[1].id, name: 'Сет «Преміум»', slug: 'set-premium',
      description: '36 роли: з лососем, вугром, креветкою, ікрою', price: 1399, weight: '1.8 кг', calories: 3400, sortOrder: 2,
    },
    {
      categoryId: categories[1].id, name: 'Сет «Для двох»', slug: 'set-couple',
      description: '16 ролів + 8 суші + 2 напої', price: 599, weight: '800г', calories: 1600, sortOrder: 3,
    },
    // Суші
    {
      categoryId: categories[2].id, name: 'Суші з лососем (2 шт)', slug: 'sushi-salmon',
      description: 'Свіжий лосось, рис, норі', price: 89, weight: '80г', calories: 150, sortOrder: 1,
    },
    {
      categoryId: categories[2].id, name: 'Суші з вугрем (2 шт)', slug: 'sushi-eel',
      description: 'Вугор унагі, рис, норі, соус', price: 119, weight: '80г', calories: 180, sortOrder: 2,
    },
    {
      categoryId: categories[2].id, name: 'Гункан з ікрою (2 шт)', slug: 'gunkan-caviar',
      description: 'Ікра Тобіко, авокадо, рис', price: 109, weight: '60г', calories: 120, sortOrder: 3,
    },
    // Гарячі
    {
      categoryId: categories[3].id, name: 'Рамен з свининою', slug: 'ramen-pork',
      description: 'Бульйон тонкоцу, свинина чашу, яйце, норі, зелень', price: 249, weight: '450 мл', calories: 520, sortOrder: 1,
      options: [{ name: 'Добавка', isRequired: false, maxChoices: 2, opts: [{ name: 'Яйце +15₴', priceDelta: 15 }, { name: 'Креветка +35₴', priceDelta: 35 }, { name: 'Екстра норі +10₴', priceDelta: 10 }] }],
    },
    {
      categoryId: categories[3].id, name: 'Вок з куркою', slug: 'wok-chicken',
      description: 'Курка, овочі, локшина удон, соус теріякі', price: 199, weight: '350г', calories: 480, sortOrder: 2,
    },
    {
      categoryId: categories[3].id, name: 'Темпура набір', slug: 'tempura-set',
      description: 'Креветка, кабачок, батат у хрусткій темпурі', price: 229, weight: '250г', calories: 380, sortOrder: 3,
    },
    // Напої
    {
      categoryId: categories[4].id, name: 'Лимонад домашній', slug: 'lemonade',
      description: "Лимон, м'ята, цукор, іній", price: 59, weight: '300 мл', calories: 90, sortOrder: 1,
      options: [{ name: 'Смак', isRequired: true, maxChoices: 1, opts: [{ name: 'Класичний', priceDelta: 0 }, { name: 'Ягідний', priceDelta: 10 }, { name: 'Імбирний', priceDelta: 10 }] }],
    },
    {
      categoryId: categories[4].id, name: 'Зелений чай', slug: 'green-tea',
      description: 'Японський сенча', price: 39, weight: '200 мл', calories: 5, sortOrder: 2,
    },
    {
      categoryId: categories[4].id, name: 'Саке «Саяма»', slug: 'sake',
      description: 'Японське саке, сухе', price: 189, weight: '180 мл', calories: 240, sortOrder: 3,
    },
    // Десерти
    {
      categoryId: categories[5].id, name: 'Моті з полуницею', slug: 'mochi-strawberry',
      description: '3 шт., японський рисовий десерт', price: 119, weight: '120г', calories: 250, sortOrder: 1,
    },
    {
      categoryId: categories[5].id, name: 'Тирамісу', slug: 'tiramisu',
      description: 'Класичний італійський десерт', price: 149, weight: '150г', calories: 380, sortOrder: 2,
    },
  ];

  for (const p of productsData) {
    const product = await prisma.product.create({
      data: {
        categoryId: p.categoryId,
        branchId: branch1.id,
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

  // ─── PROMOTIONS ───────────────────────────────
  const promoWelcome = await prisma.promotion.create({
    data: {
      code: 'WELCOME20',
      name: 'Перший замовлення -20%',
      description: 'Знижка 20% на перше замовлення',
      type: 'percentage',
      value: 20,
      minOrder: 300,
      maxUses: 1000,
      usedCount: 45,
      startDate: new Date('2024-01-01'),
      endDate: new Date('2027-12-31'),
      status: 'active',
    },
  });

  await prisma.promotion.create({
    data: {
      code: 'FREEDELIVERY',
      name: 'Безкоштовна доставка',
      description: 'Безкоштовна доставка при замовленні від 500₴',
      type: 'free_delivery',
      value: 0,
      minOrder: 500,
      maxUses: 500,
      usedCount: 123,
      startDate: new Date('2024-06-01'),
      endDate: new Date('2027-06-30'),
      status: 'active',
    },
  });

  await prisma.promotion.create({
    data: {
      code: 'SUSHI100',
      name: '100₴ знижка',
      description: 'Знижка 100₴ на замовлення від 600₴',
      type: 'fixed',
      value: 100,
      minOrder: 600,
      startDate: new Date('2024-03-01'),
      endDate: new Date('2027-03-01'),
      status: 'active',
    },
  });

  // ─── SAMPLE ORDERS ───────────────────────────
  const products = await prisma.product.findMany({ take: 20 });

  const order1 = await prisma.order.create({
    data: {
      orderNumber: '#1001',
      userId: customer.id,
      branchId: branch1.id,
      type: OrderType.delivery,
      status: OrderStatus.completed,
      addressSnapshot: JSON.stringify({ street: 'вул. Хрещатик', building: '22', apartment: '15' }),
      deliveryFee: 50,
      subtotal: 189 + 169 + 59,
      discount: 83.4,
      total: 189 + 169 + 59 - 83.4 + 50,
      note: 'Дзвонити двічі',
      promotionId: promoWelcome.id,
      promotionCode: 'WELCOME20',
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
        orderId: order1.id,
        productId: products[0].id,
        productName: products[0].name,
        productPrice: products[0].price,
        quantity: 1,
        totalPrice: products[0].price,
      },
      {
        orderId: order1.id,
        productId: products[1].id,
        productName: products[1].name,
        productPrice: products[1].price,
        quantity: 1,
        totalPrice: products[1].price,
      },
      {
        orderId: order1.id,
        productId: products[12].id,
        productName: products[12].name,
        productPrice: products[12].price,
        quantity: 1,
        totalPrice: products[12].price,
      },
    ],
  });

  await prisma.payment.create({
    data: {
      orderId: order1.id,
      method: PaymentMethod.card,
      status: PaymentStatus.succeeded,
      amount: order1.total,
      providerTxId: 'txn_demo_001',
    },
  });

  // Second order - in progress
  const order2 = await prisma.order.create({
    data: {
      orderNumber: '#1002',
      userId: customer.id,
      branchId: branch1.id,
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
      orderId: order2.id,
      productId: products[5].id,
      productName: products[5].name,
      productPrice: products[5].price,
      quantity: 1,
      totalPrice: products[5].price,
    },
  });

  await prisma.payment.create({
    data: {
      orderId: order2.id,
      method: PaymentMethod.cash,
      status: PaymentStatus.pending,
      amount: order2.total,
    },
  });

  // Third order - new
  const order3 = await prisma.order.create({
    data: {
      orderNumber: '#1003',
      userId: customer.id,
      branchId: branch1.id,
      type: OrderType.delivery,
      status: OrderStatus.new,
      addressSnapshot: JSON.stringify({ street: 'булв. Шевченка', building: '5', apartment: '201' }),
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
        orderId: order3.id,
        productId: products[2].id,
        productName: products[2].name,
        productPrice: products[2].price,
        quantity: 1,
        totalPrice: products[2].price,
      },
      {
        orderId: order3.id,
        productId: products[12].id,
        productName: products[12].name,
        productPrice: products[12].price,
        quantity: 1,
        totalPrice: products[12].price,
      },
    ],
  });

  // ─── LOYALTY TRANSACTIONS ─────────────────────
  const loyalty = await prisma.loyaltyAccount.findUnique({ where: { userId: customer.id } });
  if (loyalty) {
    await prisma.loyaltyTransaction.createMany({
      data: [
        {
          accountId: loyalty.id,
          type: 'earned',
          amount: 100,
          balanceAfter: 100,
          description: 'Бонуси за замовлення #1001',
          relatedOrderId: order1.id,
          createdAt: new Date(Date.now() - 3600000),
        },
        {
          accountId: loyalty.id,
          type: 'earned',
          amount: 250,
          balanceAfter: 350,
          description: 'Бонуси за замовлення #1002 (покращений коефіцієнт Silver)',
          relatedOrderId: order2.id,
          createdAt: new Date(Date.now() - 300000),
        },
      ],
    });
  }

  // ─── CART for customer ────────────────────────
  const cart = await prisma.cart.create({
    data: {
      userId: customer.id,
      branchId: branch1.id,
    },
  });

  await prisma.cartItem.create({
    data: {
      cartId: cart.id,
      productId: products[0].id,
      quantity: 2,
      totalPrice: products[0].price * 2,
    },
  });

  console.log('✅ Seed completed!');
  console.log(`  Admin: ${admin.email} / 12345678`);
  console.log(`  Customer: ${customer.email} / 12345678`);
  console.log(`  Branches: ${branch1.name}, ${branch2.name}`);
}

seed()
  .catch(console.error)
  .finally(() => prisma.$disconnect());