# Welcome to your Lovable project

docs/USER_GUIDE.md — подробное руководство пользователя по всем ролям (Клиент, Оператор, Литейщик, Администратор), жизненному циклу заказа и работе с STL-файлами.

docs/BUILD_AND_DEPLOY.md — документация по сборке, развёртыванию, переменным окружения, структуре проекта, базе данных и устранению неполадок.

Dockerfile — двухэтапная сборка (Node.js → Nginx) для минимального продакшен-образа.

docker-compose.yml — запуск одной командой docker compose up -d --build.

nginx.conf — конфигурация с gzip, кешированием ассетов и SPA fallback.

.dockerignore — исключение node_modules и ненужных файлов из образа.
