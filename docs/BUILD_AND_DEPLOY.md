# JewelCraft ERP — Сборка и развёртывание

## Содержание

1. [Требования](#требования)
2. [Локальная разработка](#локальная-разработка)
3. [Сборка для продакшена](#сборка-для-продакшена)
4. [Развёртывание через Docker](#развёртывание-через-docker)
5. [Переменные окружения](#переменные-окружения)
6. [Структура проекта](#структура-проекта)
7. [База данных](#база-данных)
8. [Хранилище файлов](#хранилище-файлов)
9. [Тестирование](#тестирование)
10. [Устранение неполадок](#устранение-неполадок)

---

## Требования

### Для локальной разработки

- **Node.js** >= 18.x
- **npm** >= 9.x (или **bun** >= 1.x)
- Аккаунт Supabase (или Lovable Cloud)

### Для Docker-развёртывания

- **Docker** >= 20.x
- **Docker Compose** >= 2.x

---

## Локальная разработка

### 1. Клонирование репозитория

```bash
git clone <url-репозитория>
cd jewelcraft-erp
```

### 2. Установка зависимостей

```bash
npm install
# или
bun install
```

### 3. Настройка переменных окружения

Создайте файл `.env` в корне проекта:

```env
VITE_SUPABASE_URL=https://<project-ref>.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=eyJ...ваш-anon-ключ...
VITE_SUPABASE_PROJECT_ID=<project-ref>
```

### 4. Запуск dev-сервера

```bash
npm run dev
```

Приложение будет доступно по адресу `http://localhost:8080`.

### 5. Запуск с горячей перезагрузкой

Vite автоматически поддерживает HMR (Hot Module Replacement). Изменения в коде применяются мгновенно без полной перезагрузки страницы.

---

## Сборка для продакшена

```bash
npm run build
```

Результат сборки будет в директории `dist/`. Это статические файлы (HTML, JS, CSS), готовые к обслуживанию любым веб-сервером.

### Предпросмотр сборки

```bash
npm run preview
```

---

## Развёртывание через Docker

### Быстрый старт

```bash
# Сборка и запуск
docker compose up -d --build

# Приложение доступно на http://localhost:8080
```

### Пересборка после изменений

```bash
docker compose up -d --build
```

### Остановка

```bash
docker compose down
```

### Просмотр логов

```bash
docker compose logs -f
```

### Кастомный порт

Измените порт в `docker-compose.yml`:

```yaml
ports:
  - "3000:80"  # Доступ на порту 3000
```

### Production-развёртывание с HTTPS

Для продакшена рекомендуется использовать обратный прокси (Nginx, Traefik, Caddy) перед контейнером для терминации SSL/TLS.

Пример с Traefik (добавьте labels в `docker-compose.yml`):

```yaml
services:
  app:
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.jewelcraft.rule=Host(`erp.example.com`)"
      - "traefik.http.routers.jewelcraft.tls.certresolver=letsencrypt"
```

---

## Переменные окружения

| Переменная | Обязательная | Описание |
|-----------|:------------:|----------|
| `VITE_SUPABASE_URL` | ✅ | URL проекта Supabase |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | ✅ | Публичный (anon) ключ Supabase |
| `VITE_SUPABASE_PROJECT_ID` | ❌ | ID проекта Supabase |

> **Важно:** Переменные с префиксом `VITE_` вкомпилируются в клиентский код при сборке. Не используйте приватные ключи с этим префиксом.

### Передача переменных при Docker-сборке

```bash
docker compose build \
  --build-arg VITE_SUPABASE_URL=https://xxx.supabase.co \
  --build-arg VITE_SUPABASE_PUBLISHABLE_KEY=eyJ...
```

Или создайте файл `.env` и Docker Compose подхватит его автоматически.

---

## Структура проекта

```
├── docs/                    # Документация
│   ├── USER_GUIDE.md        # Руководство пользователя
│   └── BUILD_AND_DEPLOY.md  # Сборка и развёртывание
├── public/                  # Статические ресурсы
├── src/
│   ├── components/          # React-компоненты
│   │   ├── ui/              # shadcn/ui компоненты
│   │   ├── AppLayout.tsx    # Общий layout приложения
│   │   ├── NavLink.tsx      # Навигационная ссылка
│   │   ├── OrderCard.tsx    # Карточка заказа
│   │   └── STLViewer.tsx    # 3D-просмотр STL-файлов
│   ├── contexts/
│   │   └── AuthContext.tsx  # Контекст аутентификации
│   ├── hooks/               # Пользовательские хуки
│   ├── integrations/
│   │   └── supabase/        # Клиент и типы Supabase
│   ├── lib/
│   │   ├── orderStatuses.ts # Статусы заказов
│   │   └── utils.ts         # Утилиты
│   ├── pages/
│   │   ├── AuthPage.tsx     # Страница авторизации
│   │   ├── Dashboard.tsx    # Дашборд
│   │   ├── CreateOrder.tsx  # Создание заказа
│   │   ├── OrderDetail.tsx  # Детали заказа
│   │   ├── AdminOrders.tsx  # Таблица заказов (админ)
│   │   └── AdminUsers.tsx   # Управление пользователями
│   ├── App.tsx              # Корневой компонент
│   ├── main.tsx             # Точка входа
│   └── index.css            # Глобальные стили и токены
├── supabase/
│   ├── config.toml          # Конфигурация Supabase
│   └── migrations/          # SQL-миграции
├── Dockerfile               # Docker-образ
├── docker-compose.yml       # Docker Compose
├── nginx.conf               # Конфигурация Nginx
├── vite.config.ts           # Конфигурация Vite
├── tailwind.config.ts       # Конфигурация Tailwind CSS
└── package.json             # Зависимости и скрипты
```

---

## База данных

### Таблицы

| Таблица | Описание |
|---------|----------|
| `profiles` | Профили пользователей (user_id, full_name, email, phone) |
| `user_roles` | Роли пользователей (user_id, role: admin/operator/caster/client) |
| `orders` | Заказы (title, description, status, client_id, operator_id, caster_id, work_type, tariff, gallery_folder) |
| `order_files` | Файлы заказов (order_id, file_name, file_path, file_size) |

### Функции базы данных

| Функция | Описание |
|---------|----------|
| `has_role(user_id, role)` | Проверка наличия роли у пользователя |
| `get_user_role(user_id)` | Получение роли пользователя |
| `handle_new_user()` | Триггер: создание профиля и роли при регистрации |
| `update_updated_at_column()` | Триггер: обновление поля updated_at |

### Миграции

Миграции хранятся в `supabase/migrations/` и применяются автоматически при развёртывании через Lovable Cloud.

При самостоятельном развёртывании используйте Supabase CLI:

```bash
npx supabase db push
```

### Создание первого администратора

После развёртывания необходимо создать первого администратора через SQL:

```sql
-- Найти user_id зарегистрированного пользователя
SELECT user_id, email FROM profiles;

-- Обновить роль на admin
UPDATE user_roles 
SET role = 'admin' 
WHERE user_id = '<user-id>';
```

---

## Хранилище файлов

STL-файлы хранятся в бакете `stl-files` в Supabase Storage.

Структура путей: `{user_id}/{order_id}/{timestamp}_{filename}`

Бакет приватный — доступ только для аутентифицированных пользователей через RLS-политики.

---

## Тестирование

### Запуск unit-тестов

```bash
npm run test
```

### Запуск тестов в watch-режиме

```bash
npm run test:watch
```

### E2E тесты (Playwright)

```bash
npx playwright test
```

---

## Устранение неполадок

### Приложение не загружается (белый экран)

1. Проверьте консоль браузера (F12 → Console).
2. Убедитесь, что переменные окружения `VITE_SUPABASE_URL` и `VITE_SUPABASE_PUBLISHABLE_KEY` заданы корректно.
3. Очистите кеш Vite: `rm -rf node_modules/.vite && npm run dev`.

### Ошибка загрузки файлов

- Проверьте, что бакет `stl-files` существует в Supabase Storage.
- Убедитесь, что RLS-политики на бакет разрешают загрузку.

### Ошибка «Cannot read properties of undefined (reading 'S')»

Это ошибка совместимости 3D-библиотек. Решение:
```bash
rm -rf node_modules/.vite
npm run dev
```

### Заказы не отображаются

- Проверьте RLS-политики на таблицу `orders`.
- Убедитесь, что пользователь аутентифицирован.
- Supabase ограничивает выборку 1000 строками по умолчанию.