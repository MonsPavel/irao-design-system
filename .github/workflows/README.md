# CI-конвейер irao-ui

GitHub Actions (решение Phase 0). Схема гейтов — [02-architecture §10](../../docs/02-architecture.md)
и [06-implementation-plan §7](../../docs/06-implementation-plan.md); визуальная политика —
[ADR-0004](../../docs/adr/0004-visual-baselines-container.md). Структура воркфлоу проверяется
`npm run test:workflows` (`tools/validate-workflows.mjs`) — на каждый PR шагом в гейте lint
и в ночном контуре.

## Воркфлоу

| Файл | Триггер | Что делает |
|---|---|---|
| `ci.yml` (CI) | PR в main, push в main, вручную | обязательные гейты + advisory-visual |
| `pages.yml` (Pages) | CI завершился на main, вручную | деплой `showcase/dist` на GitHub Pages |
| `release.yml` (Release) | тег `v*`, вручную | каркас: dist-zip + матрица браузеров (боевой режим — T12.1) |
| `update-snapshots.yml` (Update snapshots) | вручную | fallback-обновление скриншот-эталонов ботом (ADR-0004) |
| `nightly.yml` (Nightly cycle) | cron 03:00, вручную | валидация backlog/контраст/unit + матрица chromium/firefox/webkit |

## Обязательные гейты PR (mandatory)

Каждый — отдельный чек, блокирует merge (после включения branch protection, см. ниже):

| Чек (имя job'ы) | Шаги |
|---|---|
| `Lint (stylelint / eslint / prettier)` | `validate-workflows` + `lint:css` + `lint:js` + `lint:format` |
| `HTML-validate (паттерны и стенды)` | `lint:html` |
| `Unit (vitest)` | `test:unit` |
| `Build (dist + showcase)` | `build` + dist-zip артефакт `dist-zip` |
| `E2E + axe (chromium, контейнер)` | Playwright chromium без `IRAO_SNAPSHOTS`: поведение + axe; эталоны не сравниваются |

Все браузерные джобы — в пиннутом образе `mcr.microsoft.com/playwright:v1.63.0-jammy`
(тот же, что локальный `npm run test:docker`; пин — `package.json → iraoUi.playwrightImage`,
совпадение с каждым воркфлоу проверяет валидатор). Кэш npm — во всех джобах
(`setup-node → cache: npm`). Кэш Playwright-браузеров не нужен: браузеры предустановлены
в образе, runner-уровневых браузерных шагов нет; если появится такая джоба —
`actions/cache` на `~/.cache/ms-playwright` + `npx playwright install`.

## Advisory-visual (до v1.0, ADR-0004)

Чек `Visual regression (advisory, ADR-0004)` в `ci.yml`:

- `continue-on-error: true` стоит ТОЛЬКО на шаге прогона (`id: visual`) — дифы
  собираются следующими шагами; на джобе флага НЕТ: GitHub даёт упавшей джобе
  check-run `conclusion=success`, и именованный чек выглядел бы зелёным при
  любом расхождении (ревью T1.5 high, community #77915/#15452, SO 62045967);
- шаг прогона с `IRAO_SNAPSHOTS=1` сравнивает эталоны (chromium, порог нулевой);
- дифы (`*-diff.png/*-actual.png/*-expected.png`) + HTML-отчёт — артефакт `visual-diffs`,
  прикладываются всегда (`if: always()`);
- при расхождении финальный шаг красит джобу по `steps.visual.outcome`: чек И
  прогон красные; merge не блокируется — чек не включён в required checks до
  v1.0 («игнорировать красное» не приучаем);
- следствие на main: расхождение эталонов = красный CI = Pages не задеплоится,
  пока эталоны не обновлены (`test:docker -- --update-snapshots` или
  `update-snapshots.yml`) — осознанное поведение, расхождение обязано быть
  разобрано.

Обновление эталонов: локально `npm run test:docker -- --update-snapshots` (обычный коммит)
или fallback — `update-snapshots.yml` (ручной запуск, бот-ветка `bot/update-snapshots-<run>`
+ PR; sha256 эталонов — в Job Summary и артефакте `snapshots` для сверки с локальным
контейнером, [tests/visual/README.md](../../tests/visual/README.md)).

С Iteration 10 (заморозка набора перед v1.0) visual становится mandatory с ревью диффов
(ADR-0004; включение — в релизном чек-листе T12.1).

## Pages и Release

- **Pages**: деплой только после зелёного CI на main (`workflow_run` с guard-условием
  `workflow_run.conclusion == 'success'`); сборка полигона + `.nojekyll`.
- **Release** (каркас): на тег `v*` — dist-zip артефакт `dist-<тег>` + полный матричный
  прогон chromium/firefox/webkit (chromium сверяет эталоны). GitHub Release / changelog /
  шрифто-зом и VI-smoke — T12.1.

## Branch protection (после первого зелёного прогона)

Требуются права администратора (на 2026-10-06 у владельца есть: `gh api repos/{owner}/{repo}`
→ `permissions.admin: true`). Включать ТОЛЬКО после первого зелёного прогона CI на PR —
имена чеков должны совпасть с реальными (иначе PR блокируется навечно):

1. Открыть демо-PR, дождаться зелёного прогона, скопировать точные имена чеков из PR-чеков.
2. Settings → Branches → Add rule для `main`: Require a pull request, Require status checks.
3. Обязательные (минимум по спеке T1.5): `Lint (stylelint / eslint / prettier)`,
   `Build (dist + showcase)`, `Unit (vitest)`, `E2E + axe (chromium, контейнер)`;
   рекомендуется добавить и `HTML-validate (паттерны и стенды)` (06 §7 считает его mandatory).
4. НЕ включать `Visual regression (advisory, ADR-0004)` до v1.0 — он advisory по
   ADR-0004: до Iteration 10 эталоны обновляются массово, и required-чек при
   каждом осознанном изменении блокировал бы merge до обновления эталонов.
5. Альтернатива через API: `gh api repos/MonsPavel/irao-design-system/branches/main/protection -X PUT ...`
   с `required_status_checks.contexts` из п. 3.

## Контроль конфигурации

`npm run test:workflows` — структурная валидация: контракты гейтов, advisory-механика,
пин образа === package.json, allowlist first-party actions (`actions/*`), существование
вызываемых npm-скриптов, кэш npm, таймауты. Изменения в `.github/workflows/` коммитить
вместе с зелёным валидатором — он же гоняется гейтом lint на каждый PR.
