# irao-design-system

**irao-ui** — UI-система для сайтов группы на Bitrix: нативный CSS/JS без
runtime-зависимостей, БЭМ-неймспейс `ui-`, токены `--ui-*` в два слоя
(примитивы → семантика). Архитектура —
[docs/02-architecture.md](docs/02-architecture.md), решения —
[docs/adr/](docs/adr/), правила работы — [CONTRIBUTING.md](CONTRIBUTING.md).

## Quickstart: подключение за 5 минут

На сайте Node не нужен — только копирование файлов и четыре строки в
`header.php` (полный гайд с проверками —
[bitrix/quickstart.md](bitrix/quickstart.md)):

1. Скачайте артефакт релиза `dist/` (или соберите раз на dev-машине:
   `npm run build`) и скопируйте содержимое на сайт в `/local/ui/0.1.0/` —
   имя папки = точная версия; копия read-only (ADR-0006/0007).
2. Добавьте в `header.php` (источник —
   [bitrix/snippets/header-php.snippet.php](bitrix/snippets/header-php.snippet.php),
   там же preload шрифтов и skip-link):

   ```php
   const UI_VERSION = '0.1.0';
   $asset = \Bitrix\Main\Page\Asset::getInstance();
   $asset->addCss('/local/ui/' . UI_VERSION . '/ui-core.min.css');
   $asset->addCss('/local/ui/' . UI_VERSION . '/ui-vi.min.css');
   $asset->addJs('/local/ui/' . UI_VERSION . '/ui.min.js', true);
   ```

3. Скопируйте кнопку из доки (компонент `ui-button`) — работает.
4. Пройдите [чек-лист первого подключения](bitrix/first-connect-checklist.md)
   (9 legacy-констрейнтов).

Дальше — гайды внедрения: [bitrix/quickstart.md](bitrix/quickstart.md),
[bitrix/integration-guide.md](bitrix/integration-guide.md) (каскад, темы,
токены, JSON-данные, серверные ошибки форм, миграция, обновление версии),
[bitrix/bitrix-30-minutes.md](bitrix/bitrix-30-minutes.md) (страница со
списком и формой за полчаса).

## Разработка

```text
npm run build      # dist/ (поставка) + showcase/dist/ (полигон)
npm run serve      # статик-сервер полигона, порт 8080
npm run lint       # stylelint + eslint + prettier + html-validate
npm run test:unit  # Vitest
npm test           # сборка + Playwright (chromium) + axe
```

Единый источник правды — полигон `showcase/dist/`: по тем же страницам
работают Playwright-тесты и читают доку интеграторы
(02-architecture §7). Стенды и доки компонентов — showcase/README.md;
каталог сниппетов интеграции — bitrix/snippets/README.md.
