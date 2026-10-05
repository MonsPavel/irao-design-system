#!/usr/bin/env node
/**
 * `npm run serve` — локальный статик-сервер для showcase и dist (задача T1.3).
 *
 * Корень — корень репозитория: сгенерированный showcase доступен на
 * /showcase/dist/, собранный дистрибутив — на /dist/. Относительные ссылки
 * стендов (../../dist/…) разрешаются без дополнительной обвязки, и base URL
 * Playwright-харнесса (T1.4) указывает сюда же.
 *
 * Без кэширования (идея serve.py career-portal): правки исходников видны после
 * rebuild без борьбы с кэшем браузера.
 *
 * Зависимостей нет — только node:http (ADR-0005, анти-overengineering).
 */
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { dirname, join, normalize, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
// 8088 занят serve.py career-portal на машинах разработчиков — дефолт 8080.
const PORT = Number(process.env.PORT) || 8080;

const MIME = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.ico': 'image/x-icon',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.txt': 'text/plain; charset=utf-8',
  '.webp': 'image/webp',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
};

/** "/" и "/showcase" — на сгенерированный индекс showcase. */
function resolvePath(urlPath) {
  const pathname = decodeURIComponent(new URL(urlPath, 'http://localhost').pathname);
  if (pathname === '/' || pathname === '/showcase') {
    return join(ROOT, 'showcase', 'dist', 'index.html');
  }
  return join(ROOT, normalize(pathname));
}

const server = createServer(async (request, response) => {
  try {
    const filePath = resolvePath(request.url ?? '/');
    // Защита от выхода за корень репозитория (../-обход).
    if (!filePath.startsWith(ROOT + sep)) {
      response.writeHead(403).end('Forbidden');
      return;
    }
    const info = await stat(filePath).catch(() => null);
    const target = info && info.isDirectory() ? join(filePath, 'index.html') : filePath;
    const content = await readFile(target);
    response.writeHead(200, {
      'content-type':
        MIME[target.slice(target.lastIndexOf('.')).toLowerCase()] ?? 'application/octet-stream',
      'cache-control': 'no-cache, no-store, must-revalidate',
    });
    response.end(content);
  } catch {
    response.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
    response.end('404 Not Found');
  }
});

server.on('error', (error) => {
  console.error(`serve: ${error.message}`);
  if (/** @type {NodeJS.ErrnoException} */ (error).code === 'EADDRINUSE') {
    console.error(`Порт ${PORT} занят — запустите на другом: PORT=<порт> npm run serve`);
  }
  process.exit(1);
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`showcase: http://127.0.0.1:${PORT}/ (корень репозитория, без кэша; Ctrl+C — стоп)`);
});
