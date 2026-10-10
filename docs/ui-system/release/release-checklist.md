# Релизный чек-лист irao-ui

Чек-лист владельца релиза (задача [T12.1](../epics/EPIC-12-release/T12.1-release-pipeline.md)):
что должно быть зелёным до пуша тега и какие операции выполняются вручную.
Конвейер тега автоматизирован в [.github/workflows/release.yml](../../../.github/workflows/release.yml)
(гейты → матрица → VI-smoke → dist-zip → GitHub Release); здесь — предусловия,
ручные smoke и операционные шаги, которые автоматизация не делает.

Политики: ADR-0004 (visual-эталоны: контейнер-паритет, advisory→mandatory),
ADR-0006 (доставка — копия версии на сайт, без npm/composer), ADR-0007 (semver,
N−1, CHANGELOG Keep a Changelog). Ведение CHANGELOG и deprecation-механика —
[T12.2](../epics/EPIC-12-release/T12.2-versioning-policy.md).

## 1. Предусловия тега (до `git tag`)

- [ ] Версия `package.json` = тегу (бамп — релизным коммитом; автобампа нет,
      Out of scope T12.2). Проверка локально:
      `node tools/release-gate.mjs --tag vX.Y.Z` → `RESULT: гейт пройден`.
- [ ] CHANGELOG.md содержит запись тега: заголовок `## [vX.Y.Z] — дата`
      (Keep a Changelog, категории Added/Changed/Fixed/Deprecated/Removed —
      формат T12.2). Без записи конвейер красный (ADR-0007) — это ожидаемое
      поведение, а не дефект: до появления CHANGELOG.md (T12.2) тег честно
      заблокирован гейтом.
- [ ] Пометки «с версии X» в сниппетах/гайдах обновлены (контракт T10.3).

## 2. Конвейер тега (release.yml) — все джобы зелёные

- [ ] **gates** — changelog-гейт (запись тега + версия = тегу) и протокол
      скринридеров: `node tests/a11y/protocol-gate.mjs` → exit 0 (T9.2:
      релиз обязан получать exit 0; до подписания ручного прогона — честный
      красный).
- [ ] **matrix** — chromium/firefox/webkit зелёные, включая релизный гейт
      масштабирования T3.6 (zoom 200% — chromium, 32px-база — все браузеры);
      chromium сверил эталоны с нулевым порогом — релизная точка визуально
      чистая (ADR-0004).
- [ ] **vi-smoke** — VI-включение/темы/персистентность (ui-vi.spec.js) и
      axe-обход всех страниц полигона (stands-sweep, T9.1/T9.2).
- [ ] **build-dist** — zip-артефакт прошёл проверку структуры
      [02-architecture §6.1](../../02-architecture.md): `ui-core.min.css`,
      `ui-vi.min.css`, `ui.min.js`, `fonts/`, `themes/` + баннер
      `irao-ui v<версия>` = тег (T1.3).
- [ ] **release** — GitHub Release создан: артефакт
      `irao-ui-dist-vX.Y.Z.zip` + release notes = запись CHANGELOG тега.

## 3. Nightly — 7 дней подряд зелёная (AC EPIC-12)

- [ ] Последние **7 прогонов** [nightly.yml](../../../.github/workflows/nightly.yml)
      (validate / workflows / contrast / unit / e2e-matrix / visual) — зелёные.
- [ ] Красные ночи за период закрыты по
      [протоколу ночного ревью](../../process/nightly-review-protocol.md);
      счётчик 7 дней отсчитывается заново после последней красной ночи.

## 4. Эталоны актуальны (ADR-0004)

- [ ] Advisory-visual ночных прогонов зелёные — деградации main нет.
- [ ] Если дифы были: разобраны (осознанное обновление —
      `npm run test:docker -- --update-snapshots`, обычный коммит; либо
      ADR-исключение) и sha256-сверка с эталонами CI пройдена
      ([tests/visual/README.md](../../../tests/visual/README.md)).
- [ ] Смена версии Playwright = смена образа = перегенерация всех эталонов
      до релиза (upgrade-чек-лист ADR-0004).

## 5. Ручной smoke перед публикацией

- [ ] Скринридер-протокол подписан (T9.2:
      [screen-reader-protocol.md](../a11y/screen-reader-protocol.md) — матрица
      NVDA + VoiceOver заполнена, §6 подписан) — автоматический гейт джобы
      gates повторяет эту проверку.
- [ ] Incognito-сценарий quickstart на артефакте релиза: скачать
      `irao-ui-dist-vX.Y.Z.zip` из Release, подключить на чистой странице по
      [02-architecture §6.2](../../02-architecture.md) (или
      [quickstart](../../../bitrix/quickstart.md)) — кнопка VI, компонент,
      форма работают; баннер подключённого файла = версия релиза.

## 6. Операция «включение mandatory visual» — последний шаг перед v1.0

Перевод visual-гейта из advisory в mandatory — операционное действие релизного
пайплайна ([ADR-0004](../../adr/0004-visual-baselines-container.md), фаза
«С заморозки компонентного набора (Iteration 10)»). Выполняется **после**
закрытия пунктов 1–5 и **до** пуша тега v1.0.0:

1. Убедиться, что эталоны зелёные в контейнере (`npm run test:docker`) —
   иначе первый же PR заблокируется дифом.
2. Коммитом в `ci.yml` переименовать чек: `Visual regression (advisory,
   ADR-0004)` → `Visual regression (mandatory, ADR-0004)` (механику джобы
   не менять: continue-on-error на шаге, диф-артефакты, краска по outcome —
   с включением в required checks это и есть mandatory с ревью диффов).
   Контракт валидатора не привязан к имени джобы; строки пинов
   `tests/unit/` при переименовании не затрагиваются.
3. Settings → Branches → Branch protection rules (main) → Require status
   checks → добавить чек **«Visual regression (mandatory, ADR-0004)»** в
   required checks (имя чека = имя job'ы).
4. Контроль включения: PR с осознанным визуальным изменением обязан нести
   обновлённые эталоны (`test:docker -- --update-snapshots` + диф в PR);
   PR с расхождением и без обновления — **заблокирован**. Проверить на
   пробном PR и снять пробный коммит.
5. Зафиксировать включение в журнале ниже (дата, SHA коммита переименования).

Откат операции (если mandatory заблокировал разработку массово ложными дифами):
убрать чек из required checks тем же путём, причина — строкой в журнале;
дифы чинить по ADR-0004, повторное включение — по пунктам выше.

## 7. Приёмка конвейера и публикация v1.0.0

- [ ] **Приёмочный демо-тег (AC1 T12.1 — закрывается только по факту прогона):**
      первый тег после появления CHANGELOG.md (T12.2) проходит
      release.yml зелёным end-to-end: джобы gates/matrix/vi-smoke/build-dist/release
      зелёные, zip-артефакт корректен (структура §6.1 + баннер = тег),
      GitHub Release создан с артефактом `irao-ui-dist-vX.Y.Z.zip` и release
      notes из CHANGELOG. Локальные репетиции (CLI-гейты на фикстурах,
      zip-проверка структуры, прогон vi-smoke-спеков) — не замена живого
      прогона: теговые гейты и публикация Release исполняются в GitHub
      Actions впервые только на этом теге.
- [ ] Все пункты 1–6 закрыты; mandatory visual включён.
- [ ] `git tag v1.0.0 && git push origin v1.0.0` → конвейер зелёный,
      Release опубликован.
- [ ] Пост-релиз: сайты подключают копию артефакта `/local/ui/1.0.0/`
      (ADR-0006); следующая политика поддержки N−1 — T12.2/README.

## Журнал релизов и операций

| Дата | Тег | Конвейер (release.yml) | Release | Примечание |
| --- | --- | --- | --- | --- |
| — | — | — | — | v1.0.0 ожидает: приёмочный демо-тег после T12.2 (AC1, §7), CHANGELOG (T12.2), подпись протокола T9.2, 7 зелёных ночей, включение mandatory visual (§6) |
