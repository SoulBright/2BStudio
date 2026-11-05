# Мини-CRM «Объекты и задачи»

React + TypeScript + Supabase. Постановщик ведёт объекты и задачи, исполнитель работает по своим задачам. Права и переходы статусов проверяются в Postgres (RLS + RPC), не только в UI.

## Стек

- React 19, Vite, TypeScript, React Router
- Supabase Auth + Postgres (RLS, функция смены статуса)
- Один общий CSS, без UI-kit

## Быстрый старт

1. Скопируйте `.env.example` → `.env` и заполните:

```env
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
```

Используйте **Publishable** key. Secret / `service_role` в фронт и в Git не кладите.

2. Установите зависимости и запустите:

```bash
npm install
npm run dev
```

3. Сборка:

```bash
npm run build
npm run preview
```

## База (Supabase)

Миграции лежат в `supabase/migrations/` — выполнять по порядку в **SQL Editor**:

1. `0001_schema.sql` — таблицы, триггеры
2. `0002_rls.sql` — политики доступа
3. `0003_status_transition.sql` — `transition_task_status`
4. `0004_allow_history_cascade_on_task_delete.sql` — каскадное удаление истории вместе с задачей

Затем:

1. **Authentication → Sign In / Providers**  
   - выключить **Allow new users to sign up**  
   - лучше выключить **Confirm email** (для тестовых учёток)
2. **Authentication → Users → Create user** — создать тестовых пользователей вручную
3. Выполнить `supabase/seed.sql` (подставьте email, если отличаются)

### Тестовые доступы (демо)

| Роль | Email | Пароль |
|------|-------|--------|
| Постановщик | `manager@example.com` | `Manager123!` |
| Исполнитель | `executor1@example.com` | `Executor123!` |
| Исполнитель | `executor2@example.com` | `Executor456!` |

## Экраны

- `/login` — вход
- `/objects` — список объектов
- `/objects/:id` — карточка объекта и задачи
- `/tasks/:id` — задача, действия, история
- `/my-tasks` — мои задачи (у постановщика — все задачи)

## Безопасность (кратко)

- Открытая регистрация выключена
- RLS: исполнитель видит только свои задачи и связанные объекты
- Статус меняется только через `transition_task_status`
- Историю нельзя менять/удалять отдельным запросом с клиента
- В репозитории нет secret-ключей

Подробнее для непрограммиста: [`docs/for-manager.md`](docs/for-manager.md)  
Решения и допущения: [`docs/decisions.md`](docs/decisions.md)

## Деплой на Vercel

1. Залейте репозиторий на GitHub
2. [vercel.com](https://vercel.com) → Import project
3. Framework: Vite. Build: `npm run build`, Output: `dist`
4. Environment Variables:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_PUBLISHABLE_KEY`
5. Deploy
6. В Supabase → **Authentication → URL Configuration** добавьте URL сайта в **Site URL** и **Redirect URLs**

После деплоя проверьте вход всеми тремя учётками.
