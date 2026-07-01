# Ветка `main` — всегда рабочая версия.
# Все изменения — через feature-ветки.

## Правила ветвления

| Тип ветки | Формат | Пример |
|-----------|--------|--------|
| Feature | `feat/<название>` | `feat/homepage` |
| Bugfix | `fix/<название>` | `fix/cart-total` |
| Refactor | `refactor/<название>` | `refactor/auth-middleware` |
| Docs | `docs/<название>` | `docs/api-guide` |
| Release | `release/v<версия>` | `release/v0.3.0` |

## Процесс работы

1. Создать ветку от `main`: `git checkout -b feat/название`
2. Внести изменения, коммитить: `git commit -m "feat: описание"`
3. Обновить `CHANGELOG.md` (добавить запись в конец Unscheduled)
4. Запушить: `git push origin feat/название`
5. Создать Pull Request → Code Review → Merge в `main`

## Конвенция коммитов

```
<тип>: <краткое описание>

<опционально: подробности>
```

Типы: `feat`, `fix`, `refactor`, `docs`, `chore`, `style`, `perf`, `test`

Примеры:
- `feat: каталог меню с фильтрами по категориям`
- `fix: некорректный подсчёт итога корзины при скидке`
- `refactor: вынести API-вызовы в отдельный хук`