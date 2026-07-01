export const storefrontBrand = {
  name: 'Суші Мастер',
  slogan: 'Смак Японії вдома',
  primaryColor: '#e11d48',
  logoUrl: null,
};

export const storefrontCategories = [
  { id: 'c1', name: 'Роли', slug: 'rolls', sortOrder: 1 },
  { id: 'c2', name: 'Сети', slug: 'sets', sortOrder: 2 },
  { id: 'c3', name: 'Суші', slug: 'sushi', sortOrder: 3 },
  { id: 'c4', name: 'Гарячі страви', slug: 'hot-dishes', sortOrder: 4 },
  { id: 'c5', name: 'Напої', slug: 'drinks', sortOrder: 5 },
  { id: 'c6', name: 'Десерти', slug: 'desserts', sortOrder: 6 },
];

export const storefrontProducts = [
  { id: 'p1', categoryId: 'c1', name: 'Філадельфія класична', description: 'Лосось, крем-сир, огірок, авокадо', price: 219, weight: '240г', isAvailable: true },
  { id: 'p2', categoryId: 'c1', name: 'Каліфорнія з креветкою', description: 'Креветка, авокадо, огірок, ікра Tobiko', price: 249, weight: '220г', isAvailable: true },
  { id: 'p3', categoryId: 'c1', name: 'Дракон рол', description: 'Вугор, авокадо, огірок, унагі соус', price: 329, weight: '280г', isAvailable: true },
  { id: 'p4', categoryId: 'c1', name: 'Рол з тунцем', description: 'Тунець, авокадо, крем-сир', price: 279, weight: '230г', isAvailable: true },
  { id: 'p5', categoryId: 'c1', name: 'Темпура рол', description: 'Креветка в темпурі, соус теріякі', price: 289, weight: '250г', isAvailable: true },
  { id: 'p6', categoryId: 'c2', name: 'Сет «Філадельфія»', description: '32 шматочки: Філадельфія, з манго, з лососем', price: 699, weight: '900г', isAvailable: true },
  { id: 'p7', categoryId: 'c2', name: 'Сет «Мікс»', description: '40 шматочків: найпопулярніші роли та суші', price: 899, weight: '1200г', isAvailable: true },
  { id: 'p8', categoryId: 'c2', name: 'Сет «Токіо»', description: '28 шматочків: авторські роли шефа', price: 749, weight: '800г', isAvailable: true },
  { id: 'p9', categoryId: 'c3', name: 'Нігірі лосось (8 шт)', description: '8 шматочків нігірі зі свіжого лососю', price: 249, weight: '160г', isAvailable: true },
  { id: 'p10', categoryId: 'c3', name: 'Гункан з вугром', description: 'Вугор, унагі соус, кунжут', price: 189, weight: '80г', isAvailable: false },
  { id: 'p11', categoryId: 'c3', name: 'Нігірі з креветкою (8 шт)', description: '8 шматочків нігірі з тигровою креветкою', price: 269, weight: '160г', isAvailable: true },
  { id: 'p12', categoryId: 'c4', name: 'Темпура з креветкою', description: 'Креветки в темпурі, соус теріякі', price: 289, weight: '200г', isAvailable: true },
  { id: 'p13', categoryId: 'c4', name: 'Гаряче унагі', description: 'Унагі на рисі з унагі соусом', price: 319, weight: '220г', isAvailable: true },
  { id: 'p14', categoryId: 'c5', name: 'Зелений чай (Матча)', description: 'Японський зелений чай матча', price: 69, weight: '300 мл', isAvailable: true },
  { id: 'p15', categoryId: 'c5', name: 'Лимонад домашній', description: 'Лимон, м\'ята, цукор', price: 79, weight: '400 мл', isAvailable: true },
  { id: 'p16', categoryId: 'c5', name: 'Сок апельсиновий', description: 'Свіжовижатий апельсиновий сік', price: 65, weight: '250 мл', isAvailable: true },
  { id: 'p17', categoryId: 'c6', name: 'Мочі', description: 'Японський рисовий десерт (3 шт)', price: 99, weight: '90г', isAvailable: true },
  { id: 'p18', categoryId: 'c6', name: 'Чізкейк японський', description: 'Ніжний японський чізкейк', price: 129, weight: '150г', isAvailable: true },
];