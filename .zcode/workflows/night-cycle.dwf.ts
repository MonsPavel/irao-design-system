/* zcode-workflow
description: "Ночной AFK-конвейер irao-ui (аналог health-log night-cycle):
  берёт задачи из docs/ui-system/STATUS.md по зависимостям из файлов задач;
  для каждой — ветка от main, TDD-реализация, УСИЛЕННОЕ ревью (severity-модель
  ecc code-reviewer: critical/high всегда блокируют и правятся, до 3 раундов),
  независимая приёмка по Acceptance Criteria/DoD, gate (validate-backlog +
  npm lint/test:unit, когда настроены), мердж --no-ff в main и push.
  Неблокирующие medium/low замечания собираются в docs/process/nightly/BACKLOG.md.
  Окно 18:00–04:00: последняя задача не берётся позже 04:00 (cutoffHour=4,
  решение 05.10 — окно ужато с 05:30), начатая доделывается. Утренний предел
  08:00–12:00. force=true — без лимитов времени. Сбой на задаче блокирует
  только её — ночь продолжается."
whenToUse: "Вечерний запуск на ночь из корня репозитория irao-design-system:
  «Запусти workflow night-cycle до 04:00». Днём — только с force=true. Требует
  чистого рабочего дерева (незакоммиченные .zcode/ игнорируются) и запущенной
  машины без сна."
args:
  cutoffHour:
    type: number
    description: "Локальный час, после которого конвейер не начинает новые задачи
      (4 = последняя задача не берётся позже 04:00 — решение 05.10; начатая
      задача спокойно доводится до конца). Окно запуска: после 18:00 или до
      cutoffHour."
    required: false
    default: 4
  force:
    type: boolean
    description: "true — игнорировать проверки времени (ночное окно 18:00–05:30
      и утренний предел 08:00–12:00): запуск в любое время, остановка по
      исчерпанию реестра, лимиту задач или вручную."
    required: false
    default: false
*/
interface ImplResult {
  /** "done" — ветка готова к ревью; "blocked" — продолжать честно невозможно. */
  status: "done" | "blocked";
  /** Два-три предложения: что сделано, какие неизбежные сопутствующие правки. */
  summary: string;
  /** Короткие хэши коммитов на ветке. */
  commits: string[];
  /** Чем проверялось: команды и их итог. */
  tests: string;
  /** Причина блокировки (заполняется при status="blocked"). */
  blockedReason: string;
}
interface ReviewIssue {
  /** critical/high — блокирующие, правятся всегда; medium/low — только в бэклог ночи. */
  severity: "critical" | "high" | "medium" | "low";
  /** Файл и строка: "src/x.css:42". */
  where: string;
  /** Что не так — одна фраза, с доказательством (цитата). */
  what: string;
  /** Конкретный фикс одной фразой. */
  fix: string;
}
interface ReviewResult {
  /** "fix" — есть critical или high; "approve" — блокирующих замечаний нет. */
  verdict: "approve" | "fix";
  /** Все находки, включая неблокирующие medium/low (конвейер унесёт их в бэклог). */
  issues: ReviewIssue[];
  /** Количество critical+high. */
  blocking: number;
}
interface VerifyResult {
  /** "pass" — все критерии подтверждены доказательствами; "fail" — есть непокрытые. */
  verdict: "pass" | "fail";
  /** Пункт критерия → чем подтверждён (команда/вывод/файл:строки). */
  evidence: string[];
  /** Неподтверждённые критерии (при fail). */
  failures: string[];
}
interface GitOutcome {
  /** true — последовательность выполнена полностью. */
  ok: boolean;
  /** Короткий хэш merge-коммита или пусто. */
  commit: string;
  /** true — push в origin прошёл. */
  pushed: boolean;
}
interface TaskOutcome {
  taskId: string;
  status: "done" | "blocked";
  rounds: number;
  note: string;
}
interface TaskMeta { id: string; title: string; file: string; deps: string[] }
interface LedgerRow { id: string; status: string }
interface BacklogEntry { taskId: string; issue: ReviewIssue }
interface Finding {
  where: string;
  what: string;
  evidence: string;
  status: "verified" | "unconfirmed";
  severity: "low" | "medium" | "high";
}
interface WorkflowReport {
  conclusion: string;
  findings: Finding[];
  verified: string[];
  notCovered: string[];
}

// cutoff 4 (решение 05.10: окно ужато с 5.5/05:30 — последняя задача не берётся позже 04:00).
const cutoffHour = typeof args.cutoffHour === "number" ? args.cutoffHour : 4;
const force = args.force === true;
// Утренний предел («марафон останавливается к утру», паттерн health-log):
// в 08:00–12:00 новые задачи не стартуют, начатая доделывается; force обходит.
const morningStopHour = 8;
// Усиление фазы ревью (поручение пользователя 05.10): critical/high правятся
// всегда — лимит раундов правок поднят с 2 (health-log) до 3.
const maxReviewRounds = 3;

artifact.board("progress", {
  title: "Ход ночного цикла",
  key: "taskId",
  status: "status",
  columns: ["done", "blocked"],
  cardTitle: "taskId",
  detail: [{ field: "rounds", label: "Раунды правок" }, { field: "note", label: "Заметка" }],
});

const IMPL_SYSTEM = [
  "Ты — frontend-инженер UI-системы irao-ui (нативный CSS/JS без runtime-зависимостей, БЭМ namespace ui-, токены --ui-* двумя слоями; Windows, Git Bash).",
  "Работай строго по TDD: сначала падающий тест (Vitest/Playwright — когда инфраструктура задачи уже существует), затем минимальная реализация, затем рефакторинг; если тестовой инфраструктуры ещё нет — зафиксируй сценарии из «Testing requirements» задачи и проверь их фактически; коммит после каждого осмысленного шага, сообщения — conventional commits на русском.",
  "Спецификация задачи самодостаточна: ## Scope / ## Out of scope — объём, ## Implementation requirements — требования, ## Technical considerations — ограничения, ## Testing requirements — тесты, ## Acceptance Criteria и ## Definition of Done — приёмка. Архитектура — docs/02-architecture.md, решения — docs/adr/.",
  "Правила: держись ## Scope и не трогай чужие задачи; не изменяй docs/ui-system/STATUS.md и файлы задач; не мерджи, не пуши, не переключайся на main; минимальные неизбежные сопутствующие правки описывай в summary.",
  "Инварианты (их нарушение — HIGH на ревью): hex только в tokens/primitives.css; !important только в a11y/vi.css; box-sizing на корне каждого компонента (ADR-0002); глобальная политика фокуса ADR-0001; mobile-first min-width только из шкалы брейкпоинтов; значения одобренного дизайна career-portal не менять (отклонение — design-decision владельца дизайна); D:/repositories/career-portal — read-only референс.",
  "Если npm-инструменты ещё не настроены — работай в рамках существующей инфраструктуры (docs/статика), проверки — node tools/validate-backlog.mjs и сценарии задачи; не создавай новую инфраструктуру вне ## Scope.",
  "Перед завершением прогони доступные проверки (node tools/validate-backlog.mjs; npm run lint и npm run test:unit, если скрипты есть) и запиши итог в tests.",
  "Если продолжать честно невозможно (сеть, окружение, противоречие в спеке) — закоммить сделанное на ветке и верни status=blocked с конкретной причиной; не выдумывай проходное решение и не имитируй успех.",
  "Сомневаешься в трактовке спеки — прими разумное толкование в её духе и опиши его в summary.",
].join(" ");

const REVIEW_SYSTEM = [
  "Ты — строгий независимый code-ревьюер по модели агента ecc code-reviewer: этот код ты не писал; bugs and security first, затем поведение, затем стиль.",
  "Ревьюешь диф ветки против main на соответствие спецификации задачи. Не редактируй ни одного файла и не переключай ветки; читать код и спеку и запускать точечные команды можно, полный gate не гоняй — его после тебя прогоняет конвейер.",
  "Рубрика severity (каждая находка обязана иметь severity, файл:строку, доказательство-цитату и конкретный фикс; расплывчатые пункты и вкусовщина — не находки):",
  "CRITICAL — секреты в коде; инъекции; небезопасные eval/innerHTML с данными; скрытый breaking-change API компонентов (классы/токены/HTML-паттерны) без major; поломка обязательных гейтов.",
  "HIGH — логические баги, null/race, сломанные контракты модулей, необработанные внешние вызовы; проектные инварианты: ADR-0001 (фокус) и ADR-0002 (box-sizing), hex вне tokens/primitives.css, !important вне a11y/vi.css, потеря no-JS деградации, регрессия пунктов ## Accessibility Requirements задачи, рассинхрон доки и кода.",
  "MEDIUM — недостающие тесты для новой логики; перф-ловушки; мелкие a11y-пробелы вне AC.",
  "LOW — нейминг, nits, опциональные рефакторинги.",
  "Перед репортом проверь каждую находку — false positives недопустимы. verdict=\"fix\" ставь ТОЛЬКО когда есть хотя бы одна critical или high; medium/low не блокируют — просто включи их в issues (конвейер перенесёт в бэклог). Approve подтверждай ссылками на конкретные места кода. Проверить честно не можешь — скажи прямо в issues, не имитируй проверку.",
].join(" ");

const VERIFY_SYSTEM = [
  "Ты — независимый приёмщик: код писали и ревьюили без тебя.",
  "Работаешь на ветке задачи; не редактируй файлы и не переключай ветки.",
  "Проверь: (1) каждый пункт ## Acceptance Criteria задачи — по чекбоксам, с доказательством: команда и вывод, файл и строки, либо честное «не подтверждено»; (2) ## Definition of Done — пункты, зависящие от кода (lint/tests гонит конвейер — не дублируй полный suite); (3) ## Out of scope — в дифе нет лишнего; (4) тесты из ## Testing requirements существуют и запускаются (точечно).",
  "verdict=fail, если хотя бы один критерий не подтверждён: недоказанное — не подтверждено. В evidence компактно, но конкретно.",
  "Критерий физически невозможно проверить (нет браузера/сети/инструменты задачи ещё не созданы) — включи в failures с пометкой почему; не засчитывай по-доброму.",
].join(" ");

const INTEGRATOR_SYSTEM = [
  "Ты — релиз-инженер конвейера: выполняешь точные последовательности git-команд, без самодеятельности и без правок кода.",
  "Мердж задачи: (1) на ветке задачи обнови в docs/ui-system/STATUS.md только её строку (статус, примечание); (2) коммит лиджера; (3) git checkout main и git merge --no-ff <ветка>; (4) git push origin main — если push не прошёл (сеть/ssh/нет origin), это не сбой: продолжай и верни pushed=false; (5) git branch -d <ветка>.",
  "Блокировка: на main обнови только строку задачи (статус blocked, причина в примечании), коммит, push origin main best-effort; затем git push origin <ветка> best-effort, чтобы наработки сохранились.",
  "При конфликте мерджа (возникнуть не должен): git merge --abort и верни ok=false с описанием. Ничего сверх указанного не делай.",
].join(" ");

const STATUS_FILE = "docs/ui-system/STATUS.md";

function parseLedger(text: string): LedgerRow[] {
  const rows: LedgerRow[] = [];
  for (const m of text.matchAll(/^\| (T\d+\.\d+) \| ([a-z-]+)/gm)) {
    rows.push({ id: m[1], status: m[2] });
  }
  return rows;
}

function depsFromTaskText(text: string): string[] {
  const part = text.split("## Dependencies")[1];
  if (part === undefined) return [];
  const section = part.split("\n## ")[0];
  return [...new Set(section.match(/T\d+\.\d+/g) ?? [])];
}

async function buildMeta(): Promise<Map<string, TaskMeta>> {
  const titles = await files.grep("^# TASK T", "docs/ui-system/epics/EPIC-*/T*.md");
  const entries = await Promise.all(
    titles.map(async (t) => {
      const idM = t.path.match(/T\d+\.\d+/);
      if (idM === null) return null;
      const text = await files.read(t.path);
      const meta: TaskMeta = {
        id: idM[0],
        title: t.text.replace(/^#\s*TASK\s*T[\d.]+\s*[—-]\s*/, "").trim(),
        file: t.path,
        deps: depsFromTaskText(text),
      };
      return meta;
    }),
  );
  const map = new Map<string, TaskMeta>();
  for (const e of entries) if (e !== null && !map.has(e.id)) map.set(e.id, e);
  return map;
}

function inWindow(hour: number): boolean {
  return hour >= 18 || hour < cutoffHour;
}

async function localHour(): Promise<number | null> {
  try {
    const r = await world.run("node", ["-e", "console.log(new Date().getHours() + new Date().getMinutes() / 60)"]);
    if (r.exitCode === 0) {
      const v = parseFloat(r.stdout.trim());
      if (!Number.isNaN(v)) return v;
    }
  } catch {
    // node недоступен — пробуем PowerShell
  }
  try {
    const p = await world.run("powershell", ["-NoProfile", "-Command", "(Get-Date).Hour + (Get-Date).Minute / 60"]);
    if (p.exitCode === 0) {
      const v = parseFloat(p.stdout.trim());
      if (!Number.isNaN(v)) return v;
    }
  } catch {
    // часы недоступны совсем
  }
  return null;
}

async function runGate(): Promise<{ ok: boolean; details: string }> {
  const parts: string[] = [];
  // Валидатор — node-скрипт: спавн bash на Windows вне Git Bash уходил в WSL-релей и падал.
  const v = await world.run("node", ["tools/validate-backlog.mjs"], { timeoutMs: 120000 });
  if (v.exitCode !== 0) return { ok: false, details: "validate-backlog упал:\n" + (v.stdout + v.stderr).slice(0, 2000) };
  parts.push("validate-backlog зелёный");
  // npm-шаги — только когда инфраструктура задачи T1.2/T1.6 уже создана.
  try {
    const pjText = await files.read("package.json");
    const scripts = (JSON.parse(pjText) as { scripts?: Record<string, string> }).scripts ?? {};
    if (typeof scripts["test:unit"] === "string") {
      const t = await world.run("cmd", ["/c", "npm", "run", "test:unit"], { timeoutMs: 1200000 });
      if (t.exitCode !== 0) return { ok: false, details: "npm run test:unit упал:\n" + (t.stdout + t.stderr).slice(0, 2000) };
      parts.push("npm run test:unit зелёный");
    }
    if (typeof scripts["lint"] === "string") {
      const l = await world.run("cmd", ["/c", "npm", "run", "lint"], { timeoutMs: 600000 });
      if (l.exitCode !== 0) return { ok: false, details: "npm run lint упал:\n" + (l.stdout + l.stderr).slice(0, 2000) };
      parts.push("npm run lint зелёный");
    }
  } catch {
    parts.push("package.json ещё нет — npm-шаги gate пропущены (до T1.1/T1.2/T1.6)");
  }
  return { ok: true, details: parts.join("; ") };
}

function stopReport(conclusion: string, findings: Finding[], notCovered: string[]): WorkflowReport {
  return { conclusion, findings, verified: [], notCovered };
}

phase("Готовим репозиторий к ночному циклу");
const checkout = await world.run("git", ["checkout", "main"]);
if (checkout.exitCode !== 0) {
  return stopReport(
    "Ночной цикл не запущен: не удалось переключиться на main (" + checkout.stderr.slice(0, 200) + ").",
    [],
    ["весь реестр задач — цикл не стартовал"],
  );
}
const pull = await world.run("git", ["pull", "origin", "main"]);
if (pull.exitCode !== 0) log("git pull не прошёл (" + pull.stderr.split("\n")[0] + ") — продолжаю на локальном main, push будет best-effort.");
const status = await world.run("git", ["status", "--porcelain"]);
const dirty = status.stdout.split("\n").map((s) => s.trim()).filter((s) => s !== "" && !s.startsWith("?? .zcode"));
if (dirty.length > 0) {
  return stopReport(
    "Ночной цикл не запущен: рабочее дерево не чистое (" + dirty.slice(0, 5).join("; ") + ").",
    [],
    ["весь реестр задач — цикл не стартовал"],
  );
}
const ledgerText = await files.read(STATUS_FILE);
const initialRows = parseLedger(ledgerText);
const meta = await buildMeta();
const initialDone = initialRows.filter((r) => r.status === "done").length;
const orphaned = initialRows.filter((r) => r.status === "in-progress").map((r) => r.id);
log(`Реестр: задач ${initialRows.length}, уже сделано ${initialDone}. План на ночь — по порядку зависимостей.`);
if (orphaned.length > 0) {
  log("Внимание: задачи в статусе in-progress от прерванного прогона пропускаются: " + orphaned.join(", "));
}

const outcomes: TaskOutcome[] = [];
const nightBacklog: BacklogEntry[] = [];
let stopReason = "достигнут лимит задач на прогон (40)";

for (let i = 0; i < 40; i++) {
  phase("Проверяем время и выбираем задачу");
  const hour = await localHour();
  if (hour === null) {
    stopReason = "не удалось определить локальное время — остановка ради гарантии дедлайна";
    break;
  }
  if (!force && !inWindow(hour)) {
    log(`Локальное время ~${hour.toFixed(1)} ч — вне ночного окна (18:00–${cutoffHour}:00). Новые задачи не начинаю.`);
    stopReason = "время вышло за ночное окно";
    break;
  }
  if (!force && hour >= morningStopHour && hour < 12) {
    log(`Локальное время ~${hour.toFixed(1)} ч — утренний предел (${morningStopHour}:00): новые задачи не начинаю, начатая доделывается.`);
    stopReason = "утро: достигнут утренний предел";
    break;
  }
  const freshRows = parseLedger(await files.read(STATUS_FILE));
  const doneIds = new Set(freshRows.filter((r) => r.status === "done").map((r) => r.id));
  let sel: TaskMeta | null = null;
  for (const row of freshRows) {
    if (row.status !== "todo") continue;
    const m = meta.get(row.id);
    if (m === undefined) continue;
    if (m.deps.every((d) => doneIds.has(d))) {
      sel = m;
      break;
    }
  }
  if (sel === null) {
    log("Подходящих задач больше нет: всё выполнено или заблокировано по зависимостям.");
    stopReason = "реестр исчерпан";
    break;
  }
  log(`Задача ${sel.id}: ${sel.title}`);
  const branch = "task/" + sel.id;
  const integrator = agent("Интегратор " + sel.id, { system: INTEGRATOR_SYSTEM });
  let blocked = "";
  let rounds = 0;
  try {
    phase("Реализуем задачу по TDD");
    const impl = agent("Реализатор " + sel.id, { system: IMPL_SYSTEM });
    const implRes = await impl.ask<ImplResult>(
      `Задача ${sel.id}: ${sel.title}.\n` +
      `Спецификация: ${sel.file} — прочитай целиком перед началом.\n` +
      `Ветка: создай ${branch} от main (если ветка уже существует — это остаток прерванного прогона: удали её git branch -D и создай заново от main).\n` +
      `Работай строго по TDD в рамках ## Scope. Верни итог.`,
    );
    if (implRes.status === "blocked") blocked = implRes.blockedReason;

    if (blocked === "") {
      phase("Ревьюим ветку и правим critical/high");
      const rev = agent("Ревьюер " + sel.id, { system: REVIEW_SYSTEM });
      let review = await rev.ask<ReviewResult>(
        `Проанализируй ветку ${branch} (диф против main) для задачи ${sel.id}. Спецификация: ${sel.file}.\n` +
        `Отчёт реализатора: ${implRes.summary}\n` +
        `Верни вердикт и все находки по рубрике severity (critical/high/medium/low; каждая — файл:строка, доказательство, конкретный фикс).`,
      );
      for (const iss of review.issues) {
        if (iss.severity === "medium" || iss.severity === "low") nightBacklog.push({ taskId: sel.id, issue: iss });
      }
      // Усиление (поручение 05.10): critical и high правятся ВСЕГДА — до 3 раундов.
      while (review.verdict === "fix" && rounds < maxReviewRounds && blocked === "") {
        rounds++;
        const blockingList = review.issues
          .filter((x) => x.severity === "critical" || x.severity === "high")
          .map((x) => `[${x.severity}] ${x.where}: ${x.what} → фикс: ${x.fix}`)
          .join("\n");
        const fixRes = await impl.ask<ImplResult>(
          `Ревью ветки ${branch} вернуло блокирующие замечания (critical/high — исправить ВСЕ обязательно; по TDD: сначала тест, воспроизводящий замечание, где применимо), закоммить на ветке и верни итог.\nЗамечания:\n${blockingList}`,
        );
        if (fixRes.status === "blocked") {
          blocked = "реализатор не смог завершить правки по ревью: " + fixRes.blockedReason;
          break;
        }
        review = await rev.ask<ReviewResult>(
          `Реализатор внёс правки (раунд ${rounds} из ${maxReviewRounds}). Проверь ветку ${branch} снова: устранены ли все critical/high. Верни вердикт и находки.`,
        );
        for (const iss of review.issues) {
          if (iss.severity === "medium" || iss.severity === "low") nightBacklog.push({ taskId: sel.id, issue: iss });
        }
      }
      if (blocked === "" && review.verdict === "fix") {
        blocked = "не прошло усиленное ревью после " + maxReviewRounds + " раундов (остались critical/high): " +
          review.issues.filter((x) => x.severity === "critical" || x.severity === "high").slice(0, 2).map((x) => x.where + ": " + x.what).join("; ");
      }

      if (blocked === "") {
        phase("Принимаем задачу независимо");
        const ver = agent("Приёмщик " + sel.id, { system: VERIFY_SYSTEM });
        let verdict = await ver.ask<VerifyResult>(
          `Прими задачу ${sel.id} на ветке ${branch}. Спецификация: ${sel.file}.\n` +
          `Пройди ## Acceptance Criteria и ## Definition of Done по пунктам с доказательствами. Верни вердикт.`,
        );
        let gate = await runGate();
        let verifyRounds = 0;
        while (verifyRounds < 1 && blocked === "") {
          if (verdict.verdict === "pass" && gate.ok) break;
          verifyRounds++;
          const failureText =
            (verdict.verdict === "fail" ? "Критерии приёмки не подтверждены:\n- " + verdict.failures.slice(0, 5).join("\n- ") : "") +
            (gate.ok ? "" : (verdict.verdict === "fail" ? "\n" : "") + "Gate-проверки:\n" + gate.details);
          const fixRes = await impl.ask<ImplResult>(
            `Приёмка задачи ${sel.id} не прошла. Исправь на ветке ${branch} по TDD, закоммить и верни итог.\n${failureText}`,
          );
          if (fixRes.status === "blocked") {
            blocked = "правки по приёмке не завершены: " + fixRes.blockedReason;
            break;
          }
          verdict = await ver.ask<VerifyResult>(
            `Реализатор исправил замечания приёмки (задача ${sel.id}, ветка ${branch}). Перепроверь проваленные пункты и смежные. Верни вердикт.`,
          );
          gate = await runGate();
        }
        if (blocked === "" && !(verdict.verdict === "pass" && gate.ok)) {
          blocked = verdict.verdict === "fail"
            ? "приёмка не пройдена: " + verdict.failures.slice(0, 2).join("; ")
            : "gate не прошёл: " + gate.details.slice(0, 200);
        }
      }
    }

    if (blocked !== "") {
      phase("Фиксируем блокировку");
      const shortReason = blocked.slice(0, 250);
      const mb = await integrator.ask<GitOutcome>(
        `Задача ${sel.id} («${sel.title}») заблокирована конвейером и НЕ мержится. На main:\n` +
        `1) обнови в ${STATUS_FILE} только её строку: статус blocked, в примечании краткая причина;\n` +
        `2) коммит "chore(ledger): ${sel.id} blocked";\n` +
        `3) git push origin main (best-effort);\n` +
        `4) git push origin ${branch} (best-effort), чтобы сохранить наработки.\nВерни результат.`,
      );
      const oc: TaskOutcome = { taskId: sel.id, status: "blocked", rounds, note: shortReason + (mb.pushed ? "" : " (push не прошёл)") };
      outcomes.push(oc);
      report(oc, "progress");
      log(`${sel.id}: заблокирована — ${shortReason}`);
    } else {
      phase("Мерджим в main и обновляем лиджер");
      const mg = await integrator.ask<GitOutcome>(
        `Задача ${sel.id} («${sel.title}») принята. Проведи мердж:\n` +
        `1) на ветке ${branch} обнови в ${STATUS_FILE} только её строку: статус done, примечание «смержена»;\n` +
        `2) коммит "chore(ledger): ${sel.id} done";\n` +
        `3) git checkout main, затем git merge --no-ff ${branch} -m "${sel.id}: ${sel.title}";\n` +
        `4) git push origin main (если не прошёл — не сбой, верни pushed=false);\n` +
        `5) git branch -d ${branch}.\nВерни результат.`,
      );
      const oc: TaskOutcome = {
        taskId: sel.id,
        status: "done",
        rounds,
        note: mg.pushed ? "смержена в main, push ok" : "смержена в main, push не прошёл (осталась локально)",
      };
      outcomes.push(oc);
      report(oc, "progress");
      log(`${sel.id}: смержена в main.`);
    }
  } catch (err) {
    phase("Фиксируем сбой задачи");
    const reason = "технический сбой конвейера: " + String(err).slice(0, 200);
    try {
      const rescue = agent("Аварийный " + sel.id, { system: INTEGRATOR_SYSTEM });
      await rescue.ask<GitOutcome>(
        `Задача ${sel.id} («${sel.title}») упала с техническим сбоем на середине конвейера. Приведи репозиторий в порядок и пометь задачу blocked:\n` +
        `1) если в рабочем дереве есть незакоммиченные изменения — закоммить их на текущую ветку ${branch} сообщением "wip: частичная реализация до сбоя";\n` +
        `2) git checkout main;\n` +
        `3) обнови в ${STATUS_FILE} только её строку: статус blocked, примечание — причина сбоя;\n` +
        `4) коммит "chore(ledger): ${sel.id} blocked";\n` +
        `5) git push origin main (best-effort);\n` +
        `6) git push origin ${branch} (best-effort).\nВерни результат.`,
      );
    } catch {
      log(`${sel.id}: лиджер после сбоя обновить не удалось — блокировка зафиксирована только в отчёте прогона.`);
    }
    const oc: TaskOutcome = { taskId: sel.id, status: "blocked", rounds, note: reason };
    outcomes.push(oc);
    report(oc, "progress");
  }
}

if (nightBacklog.length > 0) {
  phase("Фиксируем бэклог замечаний");
  const scribe = agent("Писарь бэклога", {
    system: "Ты — писарь конвейера: оформляешь файлы отчётности, не трогая кода. Выполняй указанную запись точно.",
  });
  const backlogLines = nightBacklog
    .map((b) => `- [${b.issue.severity}] ${b.taskId} · ${b.issue.where}: ${b.issue.what} → ${b.issue.fix}`)
    .join("\n");
  await scribe.ask<string>(
    `Дополни файл docs/process/nightly/BACKLOG.md (создай каталог и файл при отсутствии; шапка: "# BACKLOG — неблокирующие замечания ночного цикла (medium/low)"),` +
    `добавив в конец строки:\n${backlogLines}\n` +
    `Закоммить на main одним коммитом "chore(nightly): backlog +N" и сделай git push origin main (best-effort). Верни "ok".`,
  );
}

phase("Подводим итоги ночи");
const recent = await world.run("git", ["log", "--oneline", "-10"]);
const finalRows = parseLedger(await files.read(STATUS_FILE));
const doneTotal = finalRows.filter((r) => r.status === "done").length;
const blockedTotal = finalRows.filter((r) => r.status === "blocked").length;
const remaining = finalRows.filter((r) => r.status === "todo").length;
const doneNow = outcomes.filter((o) => o.status === "done");
const blockedNow = outcomes.filter((o) => o.status === "blocked");

const lines: string[] = [];
lines.push("# Итоги ночного цикла", "");
lines.push(`За прогон: выполнено ${doneNow.length}, заблокировано ${blockedNow.length}. Причина остановки: ${stopReason}.`);
lines.push(`Реестр: done ${doneTotal}, blocked ${blockedTotal}, todo ${remaining} из ${finalRows.length}.`, "");
if (outcomes.length > 0) {
  lines.push("| Задача | Итог | Раунды правок по ревью | Примечание |", "|---|---|---|---|");
  for (const o of outcomes) lines.push(`| ${o.taskId} | ${o.status} | ${o.rounds} | ${o.note} |`);
  lines.push("");
}
if (nightBacklog.length > 0) {
  lines.push("### Неблокирующие замечания (→ docs/process/nightly/BACKLOG.md)", "");
  for (const b of nightBacklog) lines.push(`- [${b.issue.severity}] ${b.taskId} · ${b.issue.where}: ${b.issue.what}`);
  lines.push("");
}
lines.push("### Последние коммиты main", "", "```", recent.stdout.trim(), "```", "");
lines.push("### Как проверялось", "",
  "- Каждая задача: усиленное независимое ревью (severity-модель ecc code-reviewer) — critical/high блокируют мердж и правятся всегда (до " + maxReviewRounds + " раундов).",
  "- Каждая задача: независимая приёмка по ## Acceptance Criteria / ## Definition of Done с доказательствами.",
  "- Gate перед мерджем: node tools/validate-backlog.mjs + npm run lint/test:unit (когда настроены).",
  "- Мердж --no-ff в main, push после каждой задачи (мог не пройти — помечено в примечаниях).", "");
await artifact.markdown("night-report", lines.join("\n"), {
  title: "Итоги ночного цикла",
  description: `Сделано ${doneNow.length}, заблокировано ${blockedNow.length}, осталось ${remaining}.`,
  primary: true,
});

const findings: Finding[] = [];
for (const o of blockedNow) {
  findings.push({
    where: "task/" + o.taskId,
    what: "Задача заблокирована конвейером: " + o.note,
    evidence: o.note,
    status: "verified",
    severity: "medium",
  });
}
for (const b of nightBacklog) {
  findings.push({
    where: b.taskId + " · " + b.issue.where,
    what: b.issue.what,
    evidence: "ревью ветки; фикс: " + b.issue.fix,
    status: "verified",
    severity: b.issue.severity === "medium" ? "medium" : "low",
  });
}
for (const id of orphaned) {
  findings.push({
    where: id,
    what: "Задача осталась in-progress от прерванного прогона и была пропущена",
    evidence: "строка in-progress в " + STATUS_FILE,
    status: "unconfirmed",
    severity: "low",
  });
}
const idList = (arr: TaskOutcome[]) => (arr.length === 0 ? "—" : arr.map((o) => o.taskId).join(", "));
const result: WorkflowReport = {
  conclusion:
    `Прогон завершён (${stopReason}). Выполнено: ${doneNow.length} (${idList(doneNow)}). ` +
    `Заблокировано: ${blockedNow.length} (${idList(blockedNow)}). ` +
    `Всего по реестру: done ${doneTotal} из ${finalRows.length}, осталось ${remaining}. ` +
    `Неблокирующих замечаний в бэклог: ${nightBacklog.length}.`,
  findings,
  verified: [
    "каждую ветку ревьюил независимый ревьюер с severity-моделью ecc (critical/high блокируют и правятся всегда, до " + maxReviewRounds + " раундов)",
    "каждую задачу принимал независимый приёмщик по Acceptance Criteria/Definition of Done",
    "gate validate-backlog (node; + npm lint/test:unit, когда настроены) выполнялся конвейером перед каждым мерджем",
    "после каждого мерджа — push origin main (при сбоях сети помечено в примечаниях)",
  ],
  notCovered: [
    "e2e/Playwright и визуальная регрессия не входят в ночной gate — их включает T1.4/T1.5 по плану",
    remaining > 0 ? `не тронуты ${remaining} задач реестра (следующие прогоны)` : "реестр исчерпан",
    blockedNow.length > 0 ? "заблокированные ветки сохранены локально и запушены, но не влиты" : "",
  ].filter((s) => s !== ""),
};
return result;
