# MegaMine 8.9.6.0 — Private Blob Media Fix

Исправлена загрузка изображений и видео для Vercel Blob Store в режиме Private.

- загрузка больше не запрашивает public access у private store;
- новые файлы сохраняются с private access;
- изображения во вкладках, новостях, районах и ссылках открываются через `/api/media`;
- прямые Blob URL автоматически проксируются через сервер;
- устранена ошибка `Cannot use public access on a private store`.
