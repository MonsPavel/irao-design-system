# Пилот: клон career-portal на компонентах irao-ui

Пилотный перенос реального сайта [career-portal](https://github.com/MonsPavel/career-portal)
(https://monspavel.github.io/career-portal/) на компоненты дизайн-системы —
инструмент проверки полноты системы на живом сайте: где компоненты дают
другой визуал, а каких сущностей не хватает вовсе.

- **[REPORT.md](REPORT.md)** — отчёт о сравнении оригинала и клона;
- **[PLAN.md](PLAN.md)** — приоритизированный план доработок ДС по итогам.

## Состав

```
pilot/career-portal/
├── build.mjs        # сборка 16 страниц клона из data/*.json на ui-компонентах
├── compare.mjs      # сравнение с оригиналом: скриншоты + DOM-метрики
├── pilot.css        # стили ЗОНЫ САЙТА (cp-*): блоки без аналога в ДС
├── pilot.js         # скрипты зоны сайта (карусель, попап, мок-формы)
├── data/*.json      # мок-данные (байт-в-байт копия data/ оригинала)
├── dist/            # сборка (gitignored): страницы + рантайм ДС + ассеты
└── compare-output/  # артефакты сравнения (gitignored): PNG обеих версий,
                     #   compare.json с метриками, viewer.html (пары side-by-side)
```

## Сборка

```bash
npm run build                                   # dist/ ДС (если ещё не собран)
node pilot/career-portal/build.mjs              # дефолт: ассеты из ../career-portal-clone-ref
node pilot/career-portal/build.mjs --ref <путь> # ассеты из другого чекаута оригинала
npm run serve                                   # → http://127.0.0.1:8080/pilot/career-portal/dist/
```

Ассеты (23 МБ картинок) копируются из эталонного чекаута career-portal и в git
не попадают; мок-данные `data/` — в репозитории.

## Сравнение с оригиналом

```bash
npm run serve &                                 # пилот должен быть доступен локально
node pilot/career-portal/compare.mjs            # ~3 мин: 16 страниц × 2 версии
```

Продукт: `compare-output/viewer.html` (скриншоты парами),
`compare-output/compare.json` (метрики: высоты документов/блоков,
computed-стилы probe-пар «класс оригинала → ui-компонент»).

## Страницы клона

`index` (все блоки главной), `vacancies` (фильтры + строки + пагинация),
`vacancy` (детальная + модалка отклика), `vacancy-apply` (форма целиком),
`internships`/`practices` (табы + карточки + таймлайн + FAQ), `education`,
`events`, `media`, `career-track`, `companies`, `404`.

Не пересобраны (раунд 2, 21.10 — план пересборки в
[EPIC-15](../../docs/ui-system/epics/EPIC-15-pilot-completeness/README.md)):
генеративные карточки 12 вакансий (типаж одинаков), главная варианта 2;
(event|event-apply|events-search|internship|internship-apply|article|
company|education-catalog) — 8 типовых страниц, 4 из них сейчас
мёртвые ссылки из собранных страниц (детали — REPORT §7).

## Правила пилота

- Разметка — только ui-компоненты ДС и base-роли; копировать классы оригинала
  нельзя (иначе теряется предмет сравнения).
- Сайт-зона (`cp-*`) пишется на токенах `--ui-*`, стиль discipline как у
  patterns/ (без hex вне color-mix-тинт-комментариев, mobile-first нарушения
  оговорены директивой).
- Отличия визуала ui-компонентов от оригинала НЕ подгоняются стилями пилота —
  они фиксируются в REPORT.md как вход для PLAN.md.
