# Contributing

## Ветки
| Тип | Формат | Пример |
|-----|--------|--------|
| Feature | `feat/<name>` | `feat/checkout` |
| Bugfix | `fix/<name>` | `fix/cart-total` |
| Docs | `docs/<name>` | `docs/api-guide` |

## Процесс
1. `git checkout -b feat/name`
2. Внести изменения
3. `bun run lint`
4. Обновить CHANGELOG.md
5. `git push origin feat/name`

## Конвенция коммитов
`<type>: <description>` — feat, fix, refactor, docs, chore