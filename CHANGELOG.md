# Changelog

Все заметные изменения irao-ui документируются в этом файле.

Формат — [Keep a Changelog](https://keepachangelog.com/ru/1.1.0/),
версионирование — [SemVer](https://semver.org/lang/ru/) (политика — ADR-0007,
рабочая практика — T12.2).

## [v0.1.0] — 2026-10-10

Первый предрелиз дизайн-системы irao-ui (линия 0.x): полный кодовый стек
компонентов, доступность и релизный конвейер.

### Added

- Токены: primitives + semantic-слой, темы, контраст-гейт AA, брейкпоинты (T2.1–T2.6);
- База: шрифты/reset, политика фокуса, типографика, layout, skip-link, zoom-гейты (T3.1–T3.6);
- Примитивы: link, button, tag/badge, card, alert, image/figure, breadcrumbs, empty/error (T4.1–T4.8);
- Формы: field, select/checkbox/radio, file, layout, валидация, контракт серверных ошибок (T5.1–T5.6, MVP-код);
- Навигация и интерактив: dropdown, tabs, pagination, accordion, native dialog/modal (T6.1–T6.4, T7.1–T7.2);
- Сложные компоненты и паттерны: select, таблицы, loader, паттерны страниц (T7.3–T7.6, T8.1–T8.3);
- Доступность: VI-модуль по ГОСТ Р 52872, a11y-hardening, протокол скринридеров (T9.1–T9.2);
- Документация: шаблон док-страниц, доки всех компонентов, quickstart и гайды внедрения, CONTRIBUTING, ADR (T10.1–T10.4);
- Инфраструктура: сборка dist + showcase, CI-гейт, Playwright-харнесс и visual-эталоны, vitest, сниппеты Bitrix и legacy-констрейнты (T1.1–T1.6, T11.1);
- Релизный конвейер: тег → матрица браузеров → smoke → dist-zip → GitHub Release (T12.1).
