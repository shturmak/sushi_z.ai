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

  // ─── BRANDS ────────────────────────────────────
  const brandSushi = await prisma.brand.create({
    data: {
      name: 'Суші Мастер',
      slug: 'sushi-master',
      primaryColor: '#e11d48',
      secondaryColor: '#fff1f2',
      accentColor: '#fda4af',
      slogan: 'Смак Японії у вашому домі',
      description: 'Мережа японських ресторанів з найсвіжішими інгредієнтами та авторськими рецептами.',
      isActive: true,
    },
  });

  const brandPizza = await prisma.brand.create({
    data: {
      name: 'Піца Наполі',
      slug: 'pizza-napoli',
      primaryColor: '#ea580c',
      secondaryColor: '#fff7ed',
      accentColor: '#fdba74',
      slogan: 'Справжня італійська піца',
      description: 'Італійська піцерія з дров\'яною піччю та автентичними рецептами з Неаполя.',
      isActive: true,
    },
  });

  const brandBurger = await prisma.brand.create({
    data: {
      name: 'Бургер Лаб',
      slug: 'burger-lab',
      primaryColor: '#ca8a04',
      secondaryColor: '#fefce8',
      accentColor: '#fde047',
      slogan: 'Експерименти зі смаком',
      description: 'Крафтові бургери з м\'ясом преміум-класу та незвичайними соусами власного виробництва.',
      isActive: true,
    },
  });

  console.log('  ✅ Brands created:', brandSushi.name, brandPizza.name, brandBurger.name);

  // ─── USERS ─────────────────────────────────────
  const superAdmin = await prisma.user.create({
    data: {
      email: 'super@sushichain.ua',
      passwordHash: 'hashed_-1861353340_8',
      firstName: 'Супер',
      lastName: 'Адмін',
      role: 'super_admin',
      isActive: true,
    },
  });

  const adminSushi = await prisma.user.create({
    data: {
      email: 'admin@sushi-master.ua',
      passwordHash: 'hashed_-1861353340_8',
      firstName: 'Олексій',
      lastName: 'Шеф',
      role: 'admin',
      brandId: brandSushi.id,
      isActive: true,
    },
  });

  const adminPizza = await prisma.user.create({
    data: {
      email: 'admin@pizza-napoli.ua',
      passwordHash: 'hashed_-1861353340_8',
      firstName: 'Марко',
      lastName: 'Піцайоло',
      role: 'admin',
      brandId: brandPizza.id,
      isActive: true,
    },
  });

  const adminBurger = await prisma.user.create({
    data: {
      email: 'admin@burger-lab.ua',
      passwordHash: 'hashed_-1861353340_8',
      firstName: 'Денис',
      lastName: 'Грильмайстер',
      role: 'admin',
      brandId: brandBurger.id,
      isActive: true,
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
      isActive: true,
    },
  });

  console.log('  ✅ Users created: super_admin + 3 brand admins + 1 customer');

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

  // ─── BRANCHES ──────────────────────────────────
  const sushiBranch1 = await prisma.branch.create({
    data: {
      brandId: brandSushi.id,
      name: 'Суші Мастер Центр',
      slug: 'center',
      address: 'вул. Хрещатик, 22, Київ',
      phone: '+380441234567',
      email: 'center@sushi-master.ua',
      latitude: 50.4501,
      longitude: 30.5234,
      isOpen: true,
      workSchedule: WORK_SCHEDULE,
      description: 'Флагманське заведення в самому центрі Києва з панорамним видом.',
      sortOrder: 1,
    },
  });

  const sushiBranch2 = await prisma.branch.create({
    data: {
      brandId: brandSushi.id,
      name: 'Суші Мастер Оболонь',
      slug: 'obolon',
      address: 'вул. Героя Сталіна, 10, Київ',
      phone: '+380449876543',
      email: 'obolon@sushi-master.ua',
      latitude: 50.5035,
      longitude: 30.5026,
      isOpen: true,
      workSchedule: WORK_SCHEDULE,
      description: 'Затишна локація на Оболоні з дитячим куточком.',
      sortOrder: 2,
    },
  });

  const pizzaBranch1 = await prisma.branch.create({
    data: {
      brandId: brandPizza.id,
      name: 'Піца Наполі Дніпровська',
      slug: 'dniprovska',
      address: 'пр-т Бажана, 15, Київ',
      phone: '+380443345678',
      email: 'dniprovska@pizza-napoli.ua',
      latitude: 50.4487,
      longitude: 30.6199,
      isOpen: true,
      workSchedule: WORK_SCHEDULE,
      description: 'Затишна піцерія на Дніпровській набережній з літньою терасою.',
      sortOrder: 1,
    },
  });

  const burgerBranch1 = await prisma.branch.create({
    data: {
      brandId: brandBurger.id,
      name: 'Бургер Лаб Печерськ',
      slug: 'pechersk',
      address: 'вул. Артема, 40, Київ',
      phone: '+380444556677',
      email: 'pechersk@burger-lab.ua',
      latitude: 50.4316,
      longitude: 30.5371,
      isOpen: true,
      workSchedule: WORK_SCHEDULE,
      description: 'Перший лабораторний бургерний на Печерську.',
      sortOrder: 1,
    },
  });

  const burgerBranch2 = await prisma.branch.create({
    data: {
      brandId: brandBurger.id,
      name: 'Бургер Лаб Теремки',
      slug: 'teremky',
      address: 'вул. Академіка Глушкова, 9, Київ',
      phone: '+380445567788',
      email: 'teremky@burger-lab.ua',
      latitude: 50.3872,
      longitude: 30.4708,
      isOpen: true,
      workSchedule: WORK_SCHEDULE,
      description: 'Бургерна лабораторія біля метро Теремки.',
      sortOrder: 2,
    },
  });

  console.log('  ✅ Branches created: 2 sushi, 1 pizza, 2 burger');

  // ─── DELIVERY ZONES ────────────────────────────
  await prisma.deliveryZone.createMany({
    data: [
      {
        branchId: sushiBranch1.id,
        name: 'Центр',
        description: 'Весь центр Києва в межах Окружної дороги',
        minOrder: 200,
        deliveryFee: 50,
        estimatedMinutes: 30,
        isActive: true,
      },
      {
        branchId: sushiBranch1.id,
        name: 'Далекий центр',
        description: 'Лівий берег, Голосіїво, Відрадний',
        minOrder: 400,
        deliveryFee: 80,
        estimatedMinutes: 45,
        isActive: true,
      },
      {
        branchId: sushiBranch2.id,
        name: 'Оболонь та Пріорка',
        description: 'Оболонь, Пріорка, Нивки',
        minOrder: 250,
        deliveryFee: 40,
        estimatedMinutes: 25,
        isActive: true,
      },
      {
        branchId: pizzaBranch1.id,
        name: 'Дніпровський район',
        description: 'Дніпровський та прилеглі райони',
        minOrder: 250,
        deliveryFee: 45,
        estimatedMinutes: 35,
        isActive: true,
      },
      {
        branchId: burgerBranch1.id,
        name: 'Печерськ та центр',
        description: 'Печерськ, Липки, Клов',
        minOrder: 200,
        deliveryFee: 40,
        estimatedMinutes: 30,
        isActive: true,
      },
      {
        branchId: burgerBranch2.id,
        name: 'Теремки та Голосіїво',
        description: 'Теремки, Голосіїво, Відрадний',
        minOrder: 200,
        deliveryFee: 35,
        estimatedMinutes: 25,
        isActive: true,
      },
    ],
  });

  // ─── CATEGORIES (Sushi Master) ─────────────────
  const sushiCats = await Promise.all([
    prisma.category.create({
      data: {
        brandId: brandSushi.id,
        branchId: sushiBranch1.id,
        name: 'Роли',
        slug: 'rolls',
        description: 'Найкращі роли міста',
        sortOrder: 1,
      },
    }),
    prisma.category.create({
      data: {
        brandId: brandSushi.id,
        branchId: sushiBranch1.id,
        name: 'Сети',
        slug: 'sets',
        description: 'Комплексні обіди та сети',
        sortOrder: 2,
      },
    }),
    prisma.category.create({
      data: {
        brandId: brandSushi.id,
        branchId: sushiBranch1.id,
        name: 'Суші',
        slug: 'sushi',
        description: 'Класичні та фірмові суші',
        sortOrder: 3,
      },
    }),
    prisma.category.create({
      data: {
        brandId: brandSushi.id,
        branchId: sushiBranch1.id,
        name: 'Гарячі страви',
        slug: 'hot-dishes',
        description: 'Рамен, темпура, вок',
        sortOrder: 4,
      },
    }),
    prisma.category.create({
      data: {
        brandId: brandSushi.id,
        name: 'Напої',
        slug: 'drinks',
        description: 'Чай, лимонад, саке',
        sortOrder: 5,
      },
    }),
    prisma.category.create({
      data: {
        brandId: brandSushi.id,
        name: 'Десерти',
        slug: 'desserts',
        description: 'Моті, тирамісу, морозиво',
        sortOrder: 6,
      },
    }),
  ]);

  // ─── CATEGORIES (Pizza Napoli) ─────────────────
  const pizzaCats = await Promise.all([
    prisma.category.create({
      data: {
        brandId: brandPizza.id,
        name: 'Класична піца',
        slug: 'classic-pizza',
        description: 'Традиційні італійські рецепти',
        sortOrder: 1,
      },
    }),
    prisma.category.create({
      data: {
        brandId: brandPizza.id,
        name: 'Авторська піца',
        slug: 'author-pizza',
        description: 'Ексклюзивні рецепти нашого шефа',
        sortOrder: 2,
      },
    }),
    prisma.category.create({
      data: {
        brandId: brandPizza.id,
        name: 'Паста',
        slug: 'pasta',
        description: 'Свіжонаготовлена паста щодня',
        sortOrder: 3,
      },
    }),
    prisma.category.create({
      data: {
        brandId: brandPizza.id,
        name: 'Салати',
        slug: 'salads',
        description: 'Свіжі італійські салати',
        sortOrder: 4,
      },
    }),
    prisma.category.create({
      data: {
        brandId: brandPizza.id,
        name: 'Напої',
        slug: 'pizza-drinks',
        description: 'Лимонади, чай, кава',
        sortOrder: 5,
      },
    }),
  ]);

  // ─── CATEGORIES (Burger Lab) ───────────────────
  const burgerCats = await Promise.all([
    prisma.category.create({
      data: {
        brandId: brandBurger.id,
        name: 'Класичні бургери',
        slug: 'classic-burgers',
        description: 'Перевірені класичні комбінації',
        sortOrder: 1,
      },
    }),
    prisma.category.create({
      data: {
        brandId: brandBurger.id,
        name: 'Авторські бургери',
        slug: 'author-burgers',
        description: 'Унікальні рецепти нашої лабораторії',
        sortOrder: 2,
      },
    }),
    prisma.category.create({
      data: {
        brandId: brandBurger.id,
        name: 'Снеки та картопля',
        slug: 'sides',
        description: 'Картопля фрі, цибулеві кільця, нагетси',
        sortOrder: 3,
      },
    }),
    prisma.category.create({
      data: {
        brandId: brandBurger.id,
        name: 'Напої',
        slug: 'burger-drinks',
        description: 'Мілкшейки, лимонади, крафтове пиво',
        sortOrder: 4,
      },
    }),
  ]);

  console.log('  ✅ Categories created');

  // ─── PRODUCTS (Sushi Master) ───────────────────
  const sushiProducts = await prisma.product.createManyAndReturn({
    data: [
      // Роли
      {
        brandId: brandSushi.id,
        categoryId: sushiCats[0].id,
        branchId: sushiBranch1.id,
        name: 'Філадельфія класика',
        slug: 'philadelphia-classic',
        description: 'Лосось, крем-сир, авокадо, огірок',
        price: 189,
        weight: '220г',
        calories: 380,
        sortOrder: 1,
      },
      {
        brandId: brandSushi.id,
        categoryId: sushiCats[0].id,
        branchId: sushiBranch1.id,
        name: 'Каліфорнія',
        slug: 'california',
        description: 'Краб, авокадо, огірок, ікра Тобіко',
        price: 169,
        weight: '200г',
        calories: 320,
        sortOrder: 2,
      },
      {
        brandId: brandSushi.id,
        categoryId: sushiCats[0].id,
        branchId: sushiBranch1.id,
        name: 'Дракон',
        slug: 'dragon-roll',
        description: 'Вугор, авокадо, огірок, унагі соус, ікра',
        price: 289,
        weight: '280г',
        calories: 420,
        sortOrder: 3,
      },
      {
        brandId: brandSushi.id,
        categoryId: sushiCats[0].id,
        name: 'Темпура рол з креветкою',
        slug: 'tempura-shrimp-roll',
        description: 'Креветка темпура, авокадо, соус Спайсі',
        price: 219,
        weight: '240г',
        calories: 410,
        sortOrder: 4,
      },
      // Сети
      {
        brandId: brandSushi.id,
        categoryId: sushiCats[1].id,
        name: 'Сет «Сімейний»',
        slug: 'set-family',
        description: '24 роли: Філадельфія x2, Каліфорнія x2, Дракон, Темпура, Креветка',
        price: 899,
        weight: '1.2 кг',
        calories: 2200,
        sortOrder: 1,
      },
      {
        brandId: brandSushi.id,
        categoryId: sushiCats[1].id,
        name: 'Сет «Преміум»',
        slug: 'set-premium',
        description: '36 роли: з лососем, вугром, креветкою, ікрою',
        price: 1399,
        weight: '1.8 кг',
        calories: 3400,
        sortOrder: 2,
      },
      // Суші
      {
        brandId: brandSushi.id,
        categoryId: sushiCats[2].id,
        branchId: sushiBranch1.id,
        name: 'Суші з лососем (2 шт)',
        slug: 'sushi-salmon',
        description: 'Свіжий лосось, рис, норі',
        price: 89,
        weight: '80г',
        calories: 150,
        sortOrder: 1,
      },
      {
        brandId: brandSushi.id,
        categoryId: sushiCats[2].id,
        name: 'Суші з вугрем (2 шт)',
        slug: 'sushi-eel',
        description: 'Вугор унагі, рис, норі, соус',
        price: 119,
        weight: '80г',
        calories: 180,
        sortOrder: 2,
      },
      // Гарячі страви
      {
        brandId: brandSushi.id,
        categoryId: sushiCats[3].id,
        name: 'Рамен з свининою',
        slug: 'ramen-pork',
        description: 'Бульйон тонкоцу, свинина чашу, яйце, норі, зелень',
        price: 249,
        weight: '450 мл',
        calories: 520,
        sortOrder: 1,
      },
      {
        brandId: brandSushi.id,
        categoryId: sushiCats[3].id,
        name: 'Вок з куркою',
        slug: 'wok-chicken',
        description: 'Курка, овочі, локшина удон, соус теріякі',
        price: 199,
        weight: '350г',
        calories: 480,
        sortOrder: 2,
      },
    ],
  });

  // ─── PRODUCTS (Pizza Napoli) ───────────────────
  const pizzaProducts = await prisma.product.createManyAndReturn({
    data: [
      {
        brandId: brandPizza.id,
        categoryId: pizzaCats[0].id,
        name: 'Маргарита',
        slug: 'margherita',
        description: 'Томатний соус, моцарела, базилік, оливкова олія',
        price: 179,
        weight: '400г',
        calories: 850,
        sortOrder: 1,
      },
      {
        brandId: brandPizza.id,
        categoryId: pizzaCats[0].id,
        name: 'Пепероні',
        slug: 'pepperoni',
        description: 'Томатний соус, моцарела, пепероні, орегано',
        price: 219,
        weight: '450г',
        calories: 950,
        sortOrder: 2,
      },
      {
        brandId: brandPizza.id,
        categoryId: pizzaCats[0].id,
        name: 'Чотири сири',
        slug: 'quattro-formaggi',
        description: 'Моцарела, горгонзола, пармезан, рікотта',
        price: 259,
        weight: '420г',
        calories: 1020,
        sortOrder: 3,
      },
      {
        brandId: brandPizza.id,
        categoryId: pizzaCats[1].id,
        name: 'Піца «Наполі»',
        slug: 'napoli-special',
        description: 'Томатний соус, моцарела, прошуто, рукола, пармезан',
        price: 299,
        weight: '480г',
        calories: 1100,
        sortOrder: 1,
      },
      {
        brandId: brandPizza.id,
        categoryId: pizzaCats[1].id,
        name: 'Піца з морепродуктами',
        slug: 'seafood-pizza',
        description: 'Креветки, кальмари, мідії, часниковий соус, моцарела',
        price: 329,
        weight: '460г',
        calories: 980,
        sortOrder: 2,
      },
      {
        brandId: brandPizza.id,
        categoryId: pizzaCats[2].id,
        name: 'Карбонара',
        slug: 'carbonara',
        description: 'Спагеті, гуанчале, пармезан, яйце, чорний перець',
        price: 189,
        weight: '300г',
        calories: 720,
        sortOrder: 1,
      },
      {
        brandId: brandPizza.id,
        categoryId: pizzaCats[2].id,
        name: 'Болоньєзе',
        slug: 'bolognese',
        description: 'Тальятелле, м\'ясний рагу з яловичини, томати, пармезан',
        price: 175,
        weight: '320г',
        calories: 680,
        sortOrder: 2,
      },
      {
        brandId: brandPizza.id,
        categoryId: pizzaCats[3].id,
        name: 'Цезар з куркою',
        slug: 'caesar-chicken',
        description: 'Романо, курка гриль, пармезан, крутони, соус Цезар',
        price: 159,
        weight: '250г',
        calories: 380,
        sortOrder: 1,
      },
      {
        brandId: brandPizza.id,
        categoryId: pizzaCats[4].id,
        name: 'Лимонад «Сицилія»',
        slug: 'sicily-lemonade',
        description: 'Лимон, м\'ята, цукровий сироп, лід',
        price: 65,
        weight: '350 мл',
        calories: 120,
        sortOrder: 1,
      },
      {
        brandId: brandPizza.id,
        categoryId: pizzaCats[4].id,
        name: 'Еспресо',
        slug: 'espresso',
        description: 'Подвійний еспресо з арабіки',
        price: 45,
        weight: '60 мл',
        calories: 10,
        sortOrder: 2,
      },
    ],
  });

  // ─── PRODUCTS (Burger Lab) ─────────────────────
  const burgerProducts = await prisma.product.createManyAndReturn({
    data: [
      {
        brandId: brandBurger.id,
        categoryId: burgerCats[0].id,
        name: 'Класичний Чізбургер',
        slug: 'classic-cheeseburger',
        description: 'Яловича котлета 150г, чеддер, мариновані огірки, цибуля, кетчуп, гірчиця',
        price: 159,
        weight: '280г',
        calories: 650,
        sortOrder: 1,
      },
      {
        brandId: brandBurger.id,
        categoryId: burgerCats[0].id,
        name: 'Двойний Бургер',
        slug: 'double-burger',
        description: 'Дві яловичі котлети по 120г, подвійний чеддер, салат, томати',
        price: 219,
        weight: '380г',
        calories: 920,
        sortOrder: 2,
      },
      {
        brandId: brandBurger.id,
        categoryId: burgerCats[0].id,
        name: 'Чікен Бургер',
        slug: 'chicken-burger',
        description: 'Куряча котлета гриль, салат, томати, соус ранч',
        price: 149,
        weight: '260г',
        calories: 520,
        sortOrder: 3,
      },
      {
        brandId: brandBurger.id,
        categoryId: burgerCats[1].id,
        name: 'Бургер «Димний Лаборант»',
        slug: 'smoky-lab',
        description: 'Котлета з копченою яловичиною, бекон, карамелізована цибуля, соус BBQ, гауда',
        price: 249,
        weight: '350г',
        calories: 880,
        sortOrder: 1,
      },
      {
        brandId: brandBurger.id,
        categoryId: burgerCats[1].id,
        name: 'Бургер «Грибний Експеримент»',
        slug: 'mushroom-experiment',
        description: 'Яловича котлета, шитаке, печериці, трюфельний соус, швейцарський сир',
        price: 269,
        weight: '320г',
        calories: 780,
        sortOrder: 2,
      },
      {
        brandId: brandBurger.id,
        categoryId: burgerCats[1].id,
        name: 'Бургер «Тутті Фрутті»',
        slug: 'tutti-frutti-burger',
        description: 'Куряча котлета, бекон, ананас, соус теріякі, рукола',
        price: 199,
        weight: '300г',
        calories: 620,
        sortOrder: 3,
      },
      {
        brandId: brandBurger.id,
        categoryId: burgerCats[2].id,
        name: 'Картопля фрі',
        slug: 'french-fries',
        description: 'Хрустка картопля фрі з морською сіллю',
        price: 69,
        weight: '150г',
        calories: 380,
        sortOrder: 1,
      },
      {
        brandId: brandBurger.id,
        categoryId: burgerCats[2].id,
        name: 'Цибулеві кільця',
        slug: 'onion-rings',
        description: 'Хрусткі цибулеві кільця в паніровці з соусом',
        price: 79,
        weight: '120г',
        calories: 350,
        sortOrder: 2,
      },
      {
        brandId: brandBurger.id,
        categoryId: burgerCats[3].id,
        name: 'Мілкшейк ванільний',
        slug: 'vanilla-milkshake',
        description: 'Ванільне морозиво, молоко, збиті вершки',
        price: 89,
        weight: '400 мл',
        calories: 480,
        sortOrder: 1,
      },
      {
        brandId: brandBurger.id,
        categoryId: burgerCats[3].id,
        name: 'Крафтовий лимонад',
        slug: 'craft-lemonade',
        description: 'Лимон, лайм, м\'ята, коричневий цукор',
        price: 59,
        weight: '350 мл',
        calories: 110,
        sortOrder: 2,
      },
    ],
  });

  console.log('  ✅ Products created:', sushiProducts.length, '+', pizzaProducts.length, '+', burgerProducts.length);

  // ─── PROMOTIONS ────────────────────────────────
  const sushiPromo1 = await prisma.promotion.create({
    data: {
      brandId: brandSushi.id,
      code: 'SUSHI20',
      name: 'Перше замовлення -20%',
      description: 'Знижка 20% на перше замовлення в Суші Мастер',
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
      brandId: brandSushi.id,
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
      brandId: brandPizza.id,
      code: 'PIZZA100',
      name: '100₴ знижка на піцу',
      description: 'Знижка 100₴ на замовлення від 400₴',
      type: 'fixed',
      value: 100,
      minOrder: 400,
      startDate: new Date('2024-03-01'),
      endDate: new Date('2027-03-01'),
      status: 'active',
    },
  });

  await prisma.promotion.create({
    data: {
      brandId: brandPizza.id,
      code: 'PASTA15',
      name: '-15% на пасту',
      description: 'Знижка 15% на всі пасти',
      type: 'percentage',
      value: 15,
      minOrder: 150,
      maxUses: 200,
      usedCount: 67,
      startDate: new Date('2024-05-01'),
      endDate: new Date('2027-05-31'),
      status: 'active',
    },
  });

  await prisma.promotion.create({
    data: {
      brandId: brandBurger.id,
      code: 'BURGER50',
      name: '50₴ на перший бургер',
      description: 'Знижка 50₴ на перше замовлення',
      type: 'fixed',
      value: 50,
      minOrder: 200,
      maxUses: 300,
      usedCount: 89,
      startDate: new Date('2024-01-15'),
      endDate: new Date('2027-01-15'),
      status: 'active',
    },
  });

  await prisma.promotion.create({
    data: {
      brandId: brandBurger.id,
      name: 'Подвійні бургери безкоштовна доставка',
      description: 'Безкоштовна доставка на подвійні бургери',
      type: 'free_delivery',
      value: 0,
      minOrder: 350,
      startDate: new Date('2024-04-01'),
      endDate: new Date('2027-04-30'),
      status: 'active',
    },
  });

  console.log('  ✅ Promotions created: 2 per brand');

  // ─── LOYALTY ACCOUNTS ──────────────────────────
  const loyaltySushi = await prisma.loyaltyAccount.create({
    data: {
      userId: customer.id,
      brandId: brandSushi.id,
      balance: 350,
      lifetime: 2450,
      tier: 'silver',
    },
  });

  const loyaltyPizza = await prisma.loyaltyAccount.create({
    data: {
      userId: customer.id,
      brandId: brandPizza.id,
      balance: 120,
      lifetime: 120,
      tier: 'bronze',
    },
  });

  console.log('  ✅ Loyalty accounts created');

  // ─── SAMPLE COMPLETED ORDER (Sushi Master) ────
  const order1 = await prisma.order.create({
    data: {
      orderNumber: '#1001',
      userId: customer.id,
      brandId: brandSushi.id,
      branchId: sushiBranch1.id,
      type: OrderType.delivery,
      status: OrderStatus.completed,
      addressSnapshot: JSON.stringify({ street: 'вул. Хрещатик', building: '22', apartment: '15' }),
      deliveryFee: 50,
      subtotal: 189 + 169 + 59,
      discount: 83.4,
      total: 189 + 169 + 59 - 83.4 + 50,
      note: 'Дзвонити двічі',
      promotionId: sushiPromo1.id,
      promotionCode: 'SUSHI20',
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
        productId: sushiProducts[0].id,
        productName: sushiProducts[0].name,
        productPrice: sushiProducts[0].price,
        quantity: 1,
        totalPrice: sushiProducts[0].price,
      },
      {
        orderId: order1.id,
        productId: sushiProducts[1].id,
        productName: sushiProducts[1].name,
        productPrice: sushiProducts[1].price,
        quantity: 1,
        totalPrice: sushiProducts[1].price,
      },
      {
        orderId: order1.id,
        productId: sushiProducts[4].id,
        productName: sushiProducts[4].name,
        productPrice: sushiProducts[4].price,
        quantity: 1,
        totalPrice: sushiProducts[4].price,
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

  // ─── LOYALTY TRANSACTIONS ──────────────────────
  await prisma.loyaltyTransaction.createMany({
    data: [
      {
        accountId: loyaltySushi.id,
        type: 'earned',
        amount: 100,
        balanceAfter: 100,
        description: 'Бонуси за замовлення #1001',
        relatedOrderId: order1.id,
        createdAt: new Date(Date.now() - 3600000),
      },
      {
        accountId: loyaltySushi.id,
        type: 'earned',
        amount: 250,
        balanceAfter: 350,
        description: 'Бонуси за попередні замовлення (коефіцієнт Silver)',
        createdAt: new Date(Date.now() - 7200000),
      },
      {
        accountId: loyaltyPizza.id,
        type: 'earned',
        amount: 120,
        balanceAfter: 120,
        description: 'Бонуси за замовлення в Піца Наполі',
        createdAt: new Date(Date.now() - 86400000),
      },
    ],
  });

  // ─── CART for customer (sushi-master) ─────────
  await prisma.cart.create({
    data: {
      userId: customer.id,
      brandId: brandSushi.id,
      branchId: sushiBranch1.id,
    },
  });

  console.log('  ✅ Sample order, loyalty transactions, cart created');
  console.log('');
  console.log('🎉 Seed completed successfully!');
  console.log(`  Super Admin: ${superAdmin.email} / 12345678`);
  console.log(`  Brand Admins: ${adminSushi.email}, ${adminPizza.email}, ${adminBurger.email}`);
  console.log(`  Customer: ${customer.email} / 12345678`);
  console.log(`  Brands: ${brandSushi.name} (${brandSushi.slug}), ${brandPizza.name} (${brandPizza.slug}), ${brandBurger.name} (${brandBurger.slug})`);
}

seed()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());