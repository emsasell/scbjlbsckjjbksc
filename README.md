# MegaMine — Vercel-ready Minecraft Bedrock project

Готовый Next.js сайт с публичной страницей и защищённой CMS на `/admin`.

## Что есть
- MegaMine дизайн с Minecraft-пиксельной стилистикой, анимациями и плавными переходами.
- Аватар из предоставленного изображения (`public/avatar.jpg`).
- Новости с датой, фото и видео.
- Районы мира.
- Произвольные новые вкладки.
- Ссылки/каналы с названием.
- Удаление и редактирование контента.
- Загрузка изображений через Vercel Blob (до 100 МБ).
- PostgreSQL для постоянного хранения.
- Пароль админки через `ADMIN_PASSWORD`, пароль не хранится в коде.
- `/admin/login` — вход, `/admin` — CMS.

## Версия Minecraft
В интерфейсе указана **Bedrock 26.45** — последний стабильный hotfix на 28 августа 2026 по официальному changelog Mojang/Minecraft Feedback. Preview 26.50.x — тестовая ветка, поэтому она не используется как стабильная версия.

## Деплой на Vercel
1. Создай PostgreSQL базу (например Neon) и получи `DATABASE_URL`.
2. Создай Vercel Blob Store и получи `BLOB_READ_WRITE_TOKEN`.
3. В Vercel → Project → Settings → Environment Variables добавь:
   - `DATABASE_URL`
   - `ADMIN_PASSWORD` — придумай длинный пароль
   - `BLOB_READ_WRITE_TOKEN`
4. Загрузи этот проект в GitHub или импортируй папку в Vercel.
5. После деплоя открой `https://megamine.vercel.app/admin`.

Схема PostgreSQL создаётся автоматически при первом обращении к данным.
