import type {
  Branch,
  Brand,
  Category,
  Product,
  Order,
  Promotion,
  Analytics,
} from './admin-types';

// ──────────────────────────────────────────────────────
//  Mock Data for Admin Panel
//  (mirrors API response format: { success: true, data: ... })
// ──────────────────────────────────────────────────────

export const mockBrands: Brand[] = [
  { id: 'cmr2mtf930000rpf9udtpi81i', name: 'Суші Мастер', slug: 'sushi-master', logoUrl: null, primaryColor: '#e11d48', secondaryColor: '#f43f5e', accentColor: '#fbbf24', heroBannerUrl: null, promoBannerUrls: null, description: 'Мережа суші-ресторанів у Києві', slogan: 'Смак Японії вдома', isActive: true, branchCount: 2, productCount: 19, orderCount: 1247, createdAt: '2024-01-15T10:00:00.000Z', updatedAt: '2024-06-01T12:00:00.000Z' },
  { id: 'cmr2mtf980001rpf926lieyzz', name: 'Суши Токіо', slug: 'sushi-tokyo', logoUrl: null, primaryColor: '#0f766e', secondaryColor: '#14b8a6', accentColor: '#f59e0b', heroBannerUrl: null, promoBannerUrls: null, description: 'Авторські роли та суши у Львові', slogan: 'Токіо на вашому столі', isActive: true, branchCount: 1, productCount: 8, orderCount: 432, createdAt: '2024-03-01T10:00:00.000Z', updatedAt: '2024-06-01T12:00:00.000Z' },
];

export const mockBranches: Branch[] = [
  {
    id: 'br1',
    name: 'Суші Мастер — Хрещатик',
    slug: 'sushi-master-khreshchatyk',
    address: 'вул. Хрещатик 22, Київ',
    phone: '+380 44 123-45-67',
    email: 'khreshchatyk@sushimaster.ua',
    latitude: 50.4501,
    longitude: 30.5234,
    isOpen: true,
    workSchedule: JSON.stringify({ mon: '10:00-22:00', tue: '10:00-22:00', wed: '10:00-22:00', thu: '10:00-22:00', fri: '10:00-23:00', sat: '10:00-23:00', sun: '11:00-21:00' }),
    description: 'Флагманський филиал в центрі Києва',
    imageUrl: null,
    sortOrder: 1,
    createdAt: '2024-01-15T10:00:00.000Z',
    updatedAt: '2024-06-01T12:00:00.000Z',
    _count: { orders: 1247, categories: 8 },
  },
  {
    id: 'br2',
    name: 'Суші Мастер — Оболонь',
    slug: 'sushi-master-obolon',
    address: 'вул. Героїв Сталінграду 12, Київ',
    phone: '+380 44 987-65-43',
    email: 'obolon@sushimaster.ua',
    latitude: 50.4751,
    longitude: 30.5034,
    isOpen: true,
    workSchedule: JSON.stringify({ mon: '10:00-22:00', tue: '10:00-22:00', wed: '10:00-22:00', thu: '10:00-22:00', fri: '10:00-23:00', sat: '10:00-23:00', sun: '11:00-21:00' }),
    description: 'Затишний филиал на Оболоні',
    imageUrl: null,
    sortOrder: 2,
    createdAt: '2024-03-01T10:00:00.000Z',
    updatedAt: '2024-06-01T12:00:00.000Z',
    _count: { orders: 863, categories: 6 },
  },
  {
    id: 'br3',
    name: 'Суші Мастер — Львів',
    slug: 'sushi-master-lviv',
    address: 'площа Ринок 8, Львів',
    phone: '+380 32 222-33-44',
    email: 'lviv@sushimaster.ua',
    latitude: 49.8417,
    longitude: 24.0317,
    isOpen: false,
    workSchedule: null,
    description: 'Филиал у Львові (поки закритий на ремонт)',
    imageUrl: null,
    sortOrder: 3,
    createdAt: '2024-05-10T10:00:00.000Z',
    updatedAt: '2024-06-15T08:00:00.000Z',
    _count: { orders: 120, categories: 4 },
  },
];

export const mockCategories: Category[] = [
  { id: 'cat1', branchId: null, name: 'Роли', slug: 'rolls', description: 'Різноманітні роли', imageUrl: null, sortOrder: 1, isActive: true, createdAt: '2024-01-15T10:00:00.000Z', updatedAt: '2024-01-15T10:00:00.000Z', _count: { products: 8 } },
  { id: 'cat2', branchId: null, name: 'Сети', slug: 'sets', description: 'Комплексні набори', imageUrl: null, sortOrder: 2, isActive: true, createdAt: '2024-01-15T10:00:00.000Z', updatedAt: '2024-01-15T10:00:00.000Z', _count: { products: 5 } },
  { id: 'cat3', branchId: null, name: 'Суші', slug: 'sushi', description: 'Класичні нігірі та гункани', imageUrl: null, sortOrder: 3, isActive: true, createdAt: '2024-01-15T10:00:00.000Z', updatedAt: '2024-01-15T10:00:00.000Z', _count: { products: 6 } },
  { id: 'cat4', branchId: null, name: 'Гарячі страви', slug: 'hot-dishes', description: 'Гарячі закуски та страви', imageUrl: null, sortOrder: 4, isActive: true, createdAt: '2024-01-15T10:00:00.000Z', updatedAt: '2024-01-15T10:00:00.000Z', _count: { products: 4 } },
  { id: 'cat5', branchId: null, name: 'Напої', slug: 'drinks', description: 'Напої до замовлення', imageUrl: null, sortOrder: 5, isActive: true, createdAt: '2024-01-15T10:00:00.000Z', updatedAt: '2024-01-15T10:00:00.000Z', _count: { products: 5 } },
  { id: 'cat6', branchId: null, name: 'Десерти', slug: 'desserts', description: 'Солодощі', imageUrl: null, sortOrder: 6, isActive: true, createdAt: '2024-01-15T10:00:00.000Z', updatedAt: '2024-01-15T10:00:00.000Z', _count: { products: 3 } },
];

export const mockProducts: Product[] = [
  {
    id: 'p1', categoryId: 'cat1', branchId: null, name: 'Філадельфія класична', slug: 'philadelphia-classic',
    description: 'Лосось, крем-сир, огірок, авокадо', imageUrl: null, price: 219, weight: '240г', calories: 380,
    isAvailable: true, sortOrder: 1, createdAt: '2024-01-15T10:00:00.000Z', updatedAt: '2024-01-15T10:00:00.000Z',
    category: { name: 'Роли' },
    optionGroups: [
      { id: 'og1', productId: 'p1', name: 'Розмір', isRequired: true, maxChoices: 1, sortOrder: 1, options: [
        { id: 'o1', groupId: 'og1', name: 'Стандарт', priceDelta: 0, sortOrder: 1 },
        { id: 'o2', groupId: 'og1', name: 'Великий (+120г)', priceDelta: 89, sortOrder: 2 },
      ]},
      { id: 'og2', productId: 'p1', name: 'Додатки', isRequired: false, maxChoices: 3, sortOrder: 2, options: [
        { id: 'o3', groupId: 'og2', name: 'Соєвий соус', priceDelta: 0, sortOrder: 1 },
        { id: 'o4', groupId: 'og2', name: 'Імбир', priceDelta: 0, sortOrder: 2 },
        { id: 'o5', groupId: 'og2', name: 'Васабі', priceDelta: 0, sortOrder: 3 },
      ]},
    ],
  },
  {
    id: 'p2', categoryId: 'cat1', branchId: null, name: 'Каліфорнія з креветкою', slug: 'california-shrimp',
    description: 'Креветка, авокадо, огірок, ікра Tobiko', imageUrl: null, price: 249, weight: '220г', calories: 310,
    isAvailable: true, sortOrder: 2, createdAt: '2024-01-15T10:00:00.000Z', updatedAt: '2024-01-15T10:00:00.000Z',
    category: { name: 'Роли' },
    optionGroups: [],
  },
  {
    id: 'p3', categoryId: 'cat1', branchId: null, name: 'Дракон рол', slug: 'dragon-roll',
    description: 'Вугор, авокадо, огірок, унагі соус, кунжут', imageUrl: null, price: 329, weight: '280г', calories: 450,
    isAvailable: true, sortOrder: 3, createdAt: '2024-01-15T10:00:00.000Z', updatedAt: '2024-01-15T10:00:00.000Z',
    category: { name: 'Роли' },
    optionGroups: [],
  },
  {
    id: 'p4', categoryId: 'cat1', branchId: null, name: 'Рол з тунцем', slug: 'tuna-roll',
    description: 'Тунець, авокадо, крем-сир', imageUrl: null, price: 279, weight: '230г', calories: 350,
    isAvailable: true, sortOrder: 4, createdAt: '2024-01-15T10:00:00.000Z', updatedAt: '2024-01-15T10:00:00.000Z',
    category: { name: 'Роли' },
    optionGroups: [],
  },
  {
    id: 'p5', categoryId: 'cat2', branchId: null, name: 'Сет «Філадельфія»', slug: 'set-philadelphia',
    description: '32 шматочки: Філадельфія, Філадельфія з манго, Філадельфія з лососем', imageUrl: null, price: 699, weight: '900г', calories: 1400,
    isAvailable: true, sortOrder: 1, createdAt: '2024-01-15T10:00:00.000Z', updatedAt: '2024-01-15T10:00:00.000Z',
    category: { name: 'Сети' },
    optionGroups: [],
  },
  {
    id: 'p6', categoryId: 'cat2', branchId: null, name: 'Сет «Мікс»', slug: 'set-mix',
    description: '40 шматочків: найпопулярніші роли та суші', imageUrl: null, price: 899, weight: '1200г', calories: 1800,
    isAvailable: true, sortOrder: 2, createdAt: '2024-01-15T10:00:00.000Z', updatedAt: '2024-01-15T10:00:00.000Z',
    category: { name: 'Сети' },
    optionGroups: [],
  },
  {
    id: 'p7', categoryId: 'cat3', branchId: null, name: 'Нігірі лосось (8 шт)', slug: 'nigiri-salmon',
    description: '8 шматочків нігірі зі свіжого лососю', imageUrl: null, price: 249, weight: '160г', calories: 260,
    isAvailable: true, sortOrder: 1, createdAt: '2024-01-15T10:00:00.000Z', updatedAt: '2024-01-15T10:00:00.000Z',
    category: { name: 'Суші' },
    optionGroups: [],
  },
  {
    id: 'p8', categoryId: 'cat3', branchId: null, name: 'Гункан з вугром', slug: 'gunkan-eel',
    description: 'Вугор, унагі соус, кунжут', imageUrl: null, price: 189, weight: '80г', calories: 190,
    isAvailable: false, sortOrder: 2, createdAt: '2024-01-15T10:00:00.000Z', updatedAt: '2024-03-01T10:00:00.000Z',
    category: { name: 'Суші' },
    optionGroups: [],
  },
  {
    id: 'p9', categoryId: 'cat4', branchId: null, name: 'Темпура з креветкою', slug: 'shrimp-tempura',
    description: 'Креветки в темпурі, соус теріякі', imageUrl: null, price: 289, weight: '200г', calories: 420,
    isAvailable: true, sortOrder: 1, createdAt: '2024-01-15T10:00:00.000Z', updatedAt: '2024-01-15T10:00:00.000Z',
    category: { name: 'Гарячі страви' },
    optionGroups: [],
  },
  {
    id: 'p10', categoryId: 'cat5', branchId: null, name: 'Зелений чай (Матча)', slug: 'matcha-tea',
    description: 'Японський зелений чай матча', imageUrl: null, price: 69, weight: '300 мл', calories: 5,
    isAvailable: true, sortOrder: 1, createdAt: '2024-01-15T10:00:00.000Z', updatedAt: '2024-01-15T10:00:00.000Z',
    category: { name: 'Напої' },
    optionGroups: [],
  },
  {
    id: 'p11', categoryId: 'cat5', branchId: null, name: 'Лимонад домашній', slug: 'homemade-lemonade',
    description: 'Лимон, м\'ята, цукор', imageUrl: null, price: 79, weight: '400 мл', calories: 120,
    isAvailable: true, sortOrder: 2, createdAt: '2024-01-15T10:00:00.000Z', updatedAt: '2024-01-15T10:00:00.000Z',
    category: { name: 'Напої' },
    optionGroups: [],
  },
  {
    id: 'p12', categoryId: 'cat6', branchId: null, name: 'Мочі', slug: 'mochi',
    description: 'Японський рисовий десерт (3 шт)', imageUrl: null, price: 99, weight: '90г', calories: 210,
    isAvailable: true, sortOrder: 1, createdAt: '2024-01-15T10:00:00.000Z', updatedAt: '2024-01-15T10:00:00.000Z',
    category: { name: 'Десерти' },
    optionGroups: [],
  },
];

const makeOrder = (id: string, num: string, status: Order['status'], branchId: string, total: number, type: Order['type'], hoursAgo: number, method: Order['payments'][0]['method']): Order => ({
  id,
  orderNumber: num,
  userId: 'u1',
  branchId,
  type,
  status,
  addressSnapshot: type === 'delivery' ? JSON.stringify({ street: 'вул. Шевченка 45', building: '12', apartment: '87', comment: 'Домофон 45К' }) : null,
  deliveryFee: type === 'delivery' ? 59 : 0,
  subtotal: Math.round(total * 0.95),
  discount: Math.round(total * 0.05),
  total,
  note: null,
  promotionId: null,
  promotionCode: total > 500 ? 'WELCOME20' : null,
  bonusUsed: 0,
  estimatedMinutes: type === 'delivery' ? 45 : 25,
  confirmedAt: ['confirmed', 'cooking', 'ready', 'delivering', 'completed'].includes(status) ? new Date(Date.now() - hoursAgo * 3600000 + 300000).toISOString() : null,
  cookingAt: ['cooking', 'ready', 'delivering', 'completed'].includes(status) ? new Date(Date.now() - hoursAgo * 3600000 + 900000).toISOString() : null,
  readyAt: ['ready', 'delivering', 'completed'].includes(status) ? new Date(Date.now() - hoursAgo * 3600000 + 1800000).toISOString() : null,
  deliveringAt: ['delivering', 'completed'].includes(status) ? new Date(Date.now() - hoursAgo * 3600000 + 2400000).toISOString() : null,
  completedAt: status === 'completed' ? new Date(Date.now() - hoursAgo * 3600000 + 3000000).toISOString() : null,
  cancelledAt: status === 'cancelled' ? new Date(Date.now() - hoursAgo * 3600000 + 600000).toISOString() : null,
  createdAt: new Date(Date.now() - hoursAgo * 3600000).toISOString(),
  updatedAt: new Date(Date.now() - hoursAgo * 3600000 + 300000).toISOString(),
  user: { firstName: 'Олександр', lastName: 'Коваленко', phone: '+380 67 111-22-33', email: 'alex@mail.ua' },
  branch: { name: branchId === 'br1' ? 'Суші Мастер — Хрещатик' : 'Суші Мастер — Оболонь', address: branchId === 'br1' ? 'вул. Хрещатик 22' : 'вул. Героїв Сталінграду 12' },
  items: [
    { id: 'oi1', orderId: id, productId: 'p1', productName: 'Філадельфія класична', productPrice: 219, quantity: 2, selectedOptions: JSON.stringify([{ name: 'Великий (+120г)', priceDelta: 89 }]), totalPrice: 616, createdAt: new Date().toISOString() },
    { id: 'oi2', orderId: id, productId: 'p10', productName: 'Зелений чай (Матча)', productPrice: 69, quantity: 1, selectedOptions: null, totalPrice: 69, createdAt: new Date().toISOString() },
  ],
  payments: [{ method, status: status === 'completed' ? 'succeeded' as const : 'pending' as const }],
});

export const mockOrders: Order[] = [
  makeOrder('ord1', '#1052', 'completed', 'br1', 745, 'delivery', 2, 'card'),
  makeOrder('ord2', '#1051', 'delivering', 'br1', 1289, 'delivery', 1, 'card'),
  makeOrder('ord3', '#1050', 'cooking', 'br2', 539, 'pickup', 0.5, 'cash'),
  makeOrder('ord4', '#1049', 'confirmed', 'br1', 329, 'delivery', 0.3, 'card'),
  makeOrder('ord5', '#1048', 'new', 'br2', 219, 'delivery', 0.1, 'cash'),
  makeOrder('ord6', '#1047', 'ready', 'br1', 899, 'pickup', 0.7, 'bonus'),
  makeOrder('ord7', '#1046', 'cancelled', 'br2', 449, 'delivery', 4, 'card'),
  makeOrder('ord8', '#1045', 'cooking', 'br1', 678, 'delivery', 0.2, 'card'),
  makeOrder('ord9', '#1044', 'completed', 'br2', 1120, 'delivery', 6, 'cash'),
  makeOrder('ord10', '#1043', 'new', 'br1', 349, 'pickup', 0.05, 'card'),
  makeOrder('ord11', '#1042', 'completed', 'br1', 959, 'delivery', 12, 'card'),
  makeOrder('ord12', '#1041', 'completed', 'br2', 567, 'pickup', 24, 'cash'),
];

export const mockPromotions: Promotion[] = [
  {
    id: 'pr1', code: 'WELCOME20', name: 'Привітальний бонус -20%', description: 'Знижка 20% на перше замовлення',
    type: 'percentage', value: 20, minOrder: 300, maxUses: 1000, usedCount: 342,
    startDate: '2024-01-01T00:00:00.000Z', endDate: '2025-12-31T23:59:59.000Z', status: 'active',
    createdAt: '2024-01-01T00:00:00.000Z', updatedAt: '2024-06-15T10:00:00.000Z',
  },
  {
    id: 'pr2', code: 'FREEDELIVERY', name: 'Безкоштовна доставка', description: 'Безкоштовна доставка при замовленні від 500₴',
    type: 'free_delivery', value: 0, minOrder: 500, maxUses: 5000, usedCount: 1287,
    startDate: '2024-01-01T00:00:00.000Z', endDate: '2025-12-31T23:59:59.000Z', status: 'active',
    createdAt: '2024-01-01T00:00:00.000Z', updatedAt: '2024-06-15T10:00:00.000Z',
  },
  {
    id: 'pr3', code: 'SUSHI100', name: 'Знижка 100₴ на сити', description: 'Знижка 100₴ на будь-який сет',
    type: 'fixed', value: 100, minOrder: 600, maxUses: 500, usedCount: 89,
    startDate: '2024-06-01T00:00:00.000Z', endDate: '2024-08-31T23:59:59.000Z', status: 'active',
    createdAt: '2024-05-28T00:00:00.000Z', updatedAt: '2024-06-15T10:00:00.000Z',
  },
  {
    id: 'pr4', code: null, name: 'Бонус +200 балів', description: 'Автоматичне нарахування 200 бонусних балів при замовленні від 800₴',
    type: 'bonus', value: 200, minOrder: 800, maxUses: null, usedCount: 456,
    startDate: '2024-03-01T00:00:00.000Z', endDate: '2024-12-31T23:59:59.000Z', status: 'active',
    createdAt: '2024-02-25T00:00:00.000Z', updatedAt: '2024-06-15T10:00:00.000Z',
  },
  {
    id: 'pr5', code: 'SUMMER15', name: 'Літня знижка -15%', description: 'Літня акція: знижка 15% на все меню',
    type: 'percentage', value: 15, minOrder: 0, maxUses: 2000, usedCount: 0,
    startDate: '2024-06-01T00:00:00.000Z', endDate: '2024-08-31T23:59:59.000Z', status: 'inactive',
    createdAt: '2024-05-20T00:00:00.000Z', updatedAt: '2024-06-15T10:00:00.000Z',
  },
];

// Analytics with extra chart data
const today = new Date();
const daysAgo = (d: number) => {
  const date = new Date(today);
  date.setDate(date.getDate() - d);
  return date.toISOString().split('T')[0];
};

export const mockAnalytics: Analytics = {
  orders: { today: 47, week: 312, month: 1347 },
  revenue: { today: 28450, week: 187600, month: 812300 },
  statusDistribution: [
    { status: 'completed', count: 856 },
    { status: 'new', count: 124 },
    { status: 'cooking', count: 89 },
    { status: 'confirmed', count: 67 },
    { status: 'delivering', count: 45 },
    { status: 'ready', count: 34 },
    { status: 'cancelled', count: 132 },
  ],
  topProducts: [
    { name: 'Філадельфія класична', quantity: 2340, revenue: 512960 },
    { name: 'Сет «Мікс»', quantity: 890, revenue: 800110 },
    { name: 'Каліфорнія з креветкою', quantity: 1560, revenue: 388440 },
    { name: 'Нігірі лосось', quantity: 1230, revenue: 306270 },
    { name: 'Дракон рол', quantity: 780, revenue: 256620 },
  ],
  recentOrders: mockOrders.slice(0, 5),
  ordersByDay: Array.from({ length: 14 }, (_, i) => ({
    date: daysAgo(13 - i),
    count: Math.floor(30 + Math.random() * 40),
    revenue: Math.floor(15000 + Math.random() * 25000),
  })),
  revenueByCategory: [
    { category: 'Роли', revenue: 342000 },
    { category: 'Сети', revenue: 268000 },
    { category: 'Суші', revenue: 145000 },
    { category: 'Гарячі страви', revenue: 42000 },
    { category: 'Напої', revenue: 10300 },
    { category: 'Десерти', revenue: 5000 },
  ],
};