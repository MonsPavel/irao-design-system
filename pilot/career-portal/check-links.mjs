#!/usr/bin/env node
/**
 * pilot/career-portal/check-links.mjs — гейт мёртвых внутренних ссылок
 * пилота career-portal (T15.9).
 *
 * Детерминированный, без сети (Implementation requirements T15.9 п.1):
 * обходит страницы dist (рекурсивно, *.html), парсит атрибуты href и падает
 * (exit 1), если внутренняя ссылка (*.html) ведёт на файл, которого нет
 * в dist. Вне поверхности гейта: внешние URL (http/https/protocol-relative),
 * якоря (#…), mailto:, tel: и href не-.html (css/шрифты/js — не ссылки
 * страниц). ?query и #якорь срезаются до имени файла: vacancies.html?page=2
 * резолвится в vacancies.html (мок-пагинация клона, T15.5).
 *
 * Логика — чистая функция collectDeadLinks(distDir) (юнит-пин —
 * tests/unit/pilot-link-gate.test.js); CLI — тонкая обёртка. Запуск:
 *
 *   node pilot/career-portal/check-links.mjs            # dist по умолчанию
 *   node pilot/career-portal/check-links.mjs --dist <p> # другой dist
 *
 * Тот же гейт выполняет compare.mjs до браузерного прогона (Scope T15.9:
 * «подключить в тот же запуск, что и compare») — мёртвая ссылка останавливает
 * compare до траты минут на скриншоты. Решение о включении гейта в CI ДС —
 * отдельное решение владельца (Testing requirements T15.9).
 *
 * Выход: 0 — гейт пройден (0 DEAD); 1 — есть DEAD, dist не существует
 * или не содержит страниц (список причин в stdout/stderr).
 */
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, isAbsolute, join, relative, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const PILOT_DIR = dirname(fileURLToPath(import.meta.url));

/** Все *.html под dist (рекурсивно), пути с «/» — POSIX-вид, сортировка —
 *  детерминизм результата независимо от порядка обхода каталога. */
function htmlPages(distDir) {
  const pages = [];
  const walk = (dir) => {
    for (const entry of readdirSync(dir).sort()) {
      const full = join(dir, entry);
      if (statSync(full).isDirectory()) {
        walk(full);
      } else if (entry.toLowerCase().endsWith('.html')) {
        pages.push(full);
      }
    }
  };
  walk(distDir);
  return pages.sort();
}

/** Внутренняя *.html-ссылка? Внешние/якоря/почта/телефон и не-html href —
 *  нет (Implementation requirements T15.9 п.1). Схемы — без регистра
 *  (HTTP:// — внешний, T15.9-бэклог: без i-флага распознавался как
 *  внутренний). */
const isInternalHtmlHref = (href) =>
  !href.startsWith('#') &&
  !/^(mailto|tel):/i.test(href) &&
  !/^(https?:)?\/\//i.test(href) &&
  /\.html(?:[?#]|$)/i.test(href);

/**
 * Собирает мёртвые внутренние ссылки dist.
 *
 * @param {string} distDir каталог dist пилота
 * @returns {{checked: string[], links: number, dead: Array<{page: string,
 *   href: string, target: string}>}} checked — страницы (относительные
 *   POSIX-пути, отсортированы); links — число проверенных внутренних
 *   *.html-ссылок; dead — ссылки на несуществующие файлы (page — источник,
 *   href — атрибут как в разметке, target — ожидаемый файл от dist).
 */
export function collectDeadLinks(distDir) {
  const dead = [];
  let links = 0;
  const checked = [];
  for (const page of htmlPages(distDir)) {
    checked.push(relative(distDir, page).replaceAll('\\', '/'));
    for (const [, href] of readFileSync(page, 'utf8').matchAll(/href=["']([^"']+)["']/g)) {
      if (!isInternalHtmlHref(href)) continue;
      links += 1;
      // Абсолютный внутренний href («/vacancies.html») резолвится от КОРНЯ
      // dist, а не от корня ФС (T15.9-бэклог: resolve(dirname(page), …) для
      // ведущего «/» давал ложный DEAD — latent, таких href сейчас нет,
      // grep 0; фикс снимает ловушку).
      const clean = href.split(/[?#]/)[0];
      const targetAbs = isAbsolute(clean)
        ? resolve(distDir, `.${clean}`)
        : resolve(dirname(page), clean);
      if (!existsSync(targetAbs)) {
        dead.push({
          page: relative(distDir, page).replaceAll('\\', '/'),
          href,
          target: relative(distDir, targetAbs).replaceAll('\\', '/'),
        });
      }
    }
  }
  return { checked, links, dead };
}

/** CLI-обёртка: выполняется только при прямом запуске файла. */
const invokedDirectly =
  process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href;

if (invokedDirectly) {
  const argv = process.argv.slice(2);
  const distIndex = argv.indexOf('--dist');
  const distEqual = argv.find((arg) => arg.startsWith('--dist='));
  const distArg = distIndex !== -1 ? argv[distIndex + 1] : distEqual?.slice('--dist='.length);
  if (distIndex !== -1 && !distArg) {
    console.error('аргумент --dist без пути (доступен: --dist <путь-к-dist> | --dist=<путь>)');
    process.exit(1);
  }
  // Неизвестные позиционные аргументы — ошибка, не молчаливый игнор
  // (T15.9-бэклог: «node check-links.mjs другой-dist» давал зелёный
  // прогон не по тому каталогу).
  const stray = argv.filter((arg) => arg !== '--dist' && !arg.startsWith('--dist='));
  if (distIndex !== -1 && distArg) stray.splice(stray.indexOf(distArg), 1);
  if (stray.length > 0) {
    console.error(
      `неизвестные аргументы: ${stray.join(' ')} — доступен --dist <путь-к-dist> | --dist=<путь>`,
    );
    process.exit(1);
  }
  const dist = distArg
    ? isAbsolute(distArg)
      ? distArg
      : resolve(distArg)
    : join(PILOT_DIR, 'dist');

  if (!existsSync(dist)) {
    console.error(
      `dist не найден: ${dist} — сначала соберите пилот: node pilot/career-portal/build.mjs`,
    );
    process.exit(1);
  }

  const { checked, links, dead } = collectDeadLinks(dist);
  if (checked.length === 0) {
    console.error(`в ${dist} нет страниц *.html — сначала соберите пилот`);
    process.exit(1);
  }
  if (dead.length > 0) {
    console.error(`Гейт ссылок: ${dead.length} DEAD — цели не существуют в dist:`);
    for (const { page, href, target } of dead) {
      console.error(`  ${page} → ${href} (ожидался ${target})`);
    }
    process.exit(1);
  }
  console.log(
    `Гейт ссылок: ${checked.length} страниц, ${links} внутренних ссылок, 0 DEAD — ${dist}`,
  );
}
