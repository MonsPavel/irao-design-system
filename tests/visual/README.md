# tests/visual/

Скриншот-эталоны: `__screenshots__/<spec>/<name>--<viewport>.png`
(375/768/1440 — шкала `VIEWPORTS` харнесса). Коммитятся.

Создаются **только** в окружении создания (ADR-0004): `npm run test:docker`
(официальный образ `mcr.microsoft.com/playwright:vX-jammy`, пин — рядом с
версией Playwright в package.json) или CI-джоба `update-snapshots` (T1.5,
fallback). Локальные host-прогоны эталоны не пишут и не сравниваются:
`shot()` вне контейнера — no-op (гейт `IRAO_SNAPSHOTS=1`). Порог сравнения
нулевой — контейнер-паритет даёт бинарное совпадение, любой дифф значим.
