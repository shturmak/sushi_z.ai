# Суші Мастер — Омниканальная система заказа еды

Full-stack приложение для сети суши-ресторанов в Украине.
Web + Android + iOS через единый REST API.

## Стек

- **Frontend**: Next.js 16, TypeScript, Tailwind CSS 4, shadcn/ui, Recharts
- **Backend**: Next.js Route Handlers, Prisma ORM, JWT (jose)
- **State**: Zustand, TanStack Query
- **DB**: SQLite (→ PostgreSQL в продакшене)
- **Deploy**: Docker + GitHub Actions (план)

## Документация

| Файл | Описание |
|------|----------|
| [ROADMAP.md](./ROADMAP.md) | План разработки с приоритетами |
| [CHANGELOG.md](./CHANGELOG.md) | История изменений |
| [CONTRIBUTING.md](./CONTRIBUTING.md) | Правила ветвления и коммитов |
| [prisma/schema.prisma](./prisma/schema.prisma) | БД-схема (16 моделей) |

## Быстрый старт

```bash
bun install
cp .env.example .env
bun run db:push
bun run prisma db seed
bun run dev
```

## Структура

```
src/
├── app/          # Next.js App Router (страницы + API роуты)
│   ├── admin/    # Админ-панель
│   └── api/      # REST API (30+ эндпоинтов)
├── components/   # React-компоненты
│   ├── admin/    # Админ-специфичные
│   └── ui/       # shadcn/ui
├── domain/       # Бизнес-логика (сервисы)
├── hooks/        # React hooks
└── lib/          # Утилиты, store, типы
```

## Ветки

`main` — стабильная версия. Все изменения через `feat/*`, `fix/*` ветки.
См. [CONTRIBUTING.md](./CONTRIBUTING.md).

## Лицензия

Приватный проект.