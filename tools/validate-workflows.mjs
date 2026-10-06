#!/usr/bin/env node
/**
 * `npm run test:workflows` — структурная валидация CI-конвейера (задача T1.5).
 *
 * Зачем: `.github/` в .prettierignore, eslint/prettier YAML воркфлоу не видят —
 * без этого валидатора синтаксис и структура конвейера никем не проверяются
 * до реального прогона GitHub Actions. Скрипт — исполняемая спецификация
 * контрактов T1.5 (TDD-тест конвейера):
 *   - обязательные PR-гейты: lint, html-validate, unit, build, e2e+axe;
 *   - visual regression — advisory: отдельный чек с continue-on-error,
 *     диф-артефакты, обязательные гейты зелёные независимо от него (ADR-0004);
 *   - update-snapshots — fallback-обновление эталонов ботом (ADR-0004);
 *   - pages — деплой showcase из main только после зелёного CI;
 *   - release — каркас матрицы + dist-артефакт (боевой режим — T12.1);
 *   - nightly — матрица chromium/firefox/webkit;
 *   - контейнерный паритет: пин образа в каждой браузерной джобе ===
 *     package.json iraoUi.playwrightImage (тот же образ, что test:docker);
 *   - кэш npm во всех джобах с npm ci (браузеры уже в образе — кэш
 *     Playwright-браузеров не нужен, см. .github/workflows/README.md);
 *   - все `uses:` — из allowlist first-party actions (supply-chain);
 *   - каждый `npm run <script>` из шагов существует в package.json.
 *
 * YAML: собственный строгий парсер подмножества (без внешних пакетов —
 * конвенция tools/, как tools/validate-backlog.mjs). Всё, что парсер не
 * понимает (якоря, теги, многострочные plain-скаляры, fold-скаляры), — ошибка
 * валидации: в воркфлоу эти конструкции не используются.
 *
 * Выход: отчёт в stdout + код 0 (чисто) / 1 (есть проблемы).
 */
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const workflowsDir = join(root, '.github', 'workflows');

/** @type {string[]} */
const problems = [];
const problem = (file, msg) => problems.push(`${file}: ${msg}`);

// ---------------------------------------------------------------------------
// Строгий YAML-парсер подмножества (структуры GitHub Actions workflow-файлов)
// ---------------------------------------------------------------------------

/**
 * Убрать комментарий вне кавычек: '#' — комментарий, только если стоит в
 * начале строки или после пробела (YAML-правило) и не внутри кавычек.
 */
function stripComment(line) {
  let inSingle = false;
  let inDouble = false;
  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (ch === "'" && !inDouble) inSingle = !inSingle;
    else if (ch === '"' && !inSingle) inDouble = !inDouble;
    else if (ch === '#' && !inSingle && !inDouble) {
      if (i === 0 || line[i - 1] === ' ' || line[i - 1] === '\t') return line.slice(0, i);
    }
  }
  return line;
}

/** Скаляр: кавычки → строка, true/false → boolean, null/~/пусто → null, число → number, иначе строка. */
function parseScalar(raw) {
  const s = raw.trim();
  if (s === '') return null;
  if (s.length >= 2 && s.startsWith("'") && s.endsWith("'"))
    return s.slice(1, -1).replaceAll("''", "'");
  if (s.length >= 2 && s.startsWith('"') && s.endsWith('"')) {
    try {
      return JSON.parse(s);
    } catch {
      return s.slice(1, -1);
    }
  }
  if (s === 'true') return true;
  if (s === 'false') return false;
  if (s === 'null' || s === '~') return null;
  if (/^[+-]?\d+$/.test(s)) return Number(s);
  if (/^[+-]?\d*\.\d+$/.test(s)) return Number(s);
  return s;
}

/** Разбить содержимое flow-коллекции [a, b] / {k: v} по запятым верхнего уровня. */
function splitFlow(body) {
  const parts = [];
  let depth = 0;
  let inSingle = false;
  let inDouble = false;
  let current = '';
  for (const ch of body) {
    if (ch === "'" && !inDouble) inSingle = !inSingle;
    else if (ch === '"' && !inSingle) inDouble = !inDouble;
    else if (!inSingle && !inDouble) {
      if (ch === '[' || ch === '{') depth += 1;
      else if (ch === ']' || ch === '}') depth -= 1;
      else if (ch === ',' && depth === 0) {
        parts.push(current);
        current = '';
        continue;
      }
    }
    current += ch;
  }
  if (current.trim() !== '' || parts.length > 0) parts.push(current);
  return parts.map((p) => p.trim()).filter((p) => p !== '');
}

/** Flow-последовательность [a, b] или flow-отображение {k: v, ...} (одноуровневые). */
function parseFlow(raw) {
  const s = raw.trim();
  if (s.startsWith('[')) {
    if (!s.endsWith(']')) throw new Error(`flow-последовательность без закрывающей ]: «${s}»`);
    return splitFlow(s.slice(1, -1)).map((item) => parseFlowItem(item));
  }
  if (s.startsWith('{')) {
    if (!s.endsWith('}')) throw new Error(`flow-отображение без закрывающей }: «${s}»`);
    const map = {};
    for (const item of splitFlow(s.slice(1, -1))) {
      const [k, v] = splitFlowKey(item);
      map[k] = parseFlowItem(v);
    }
    return map;
  }
  return parseFlowItem(s);
}

/** Элемент flow-коллекции: скаляр или вложенная одноуровневая flow-коллекция. */
function parseFlowItem(raw) {
  const s = raw.trim();
  if (s.startsWith('[') || s.startsWith('{')) return parseFlow(s);
  return parseScalar(s);
}

/** Разделить «ключ: значение» внутри flow-отображения (первое «: » вне кавычек). */
function splitFlowKey(item) {
  let inSingle = false;
  let inDouble = false;
  for (let i = 0; i < item.length; i += 1) {
    const ch = item[i];
    if (ch === "'" && !inDouble) inSingle = !inSingle;
    else if (ch === '"' && !inSingle) inDouble = !inDouble;
    else if (
      ch === ':' &&
      !inSingle &&
      !inDouble &&
      (item[i + 1] === ' ' || i === item.length - 1)
    ) {
      return [item.slice(0, i).trim(), item.slice(i + 1).trim()];
    }
  }
  throw new Error(`элемент flow-отображения без «ключ: значение»: «${item}»`);
}

/** Разобрать «ключ: значение» строки блочного отображения. Возвращает null, если строка — не ключ. */
function parseKeyLine(text) {
  let inSingle = false;
  let inDouble = false;
  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    if (ch === "'" && !inDouble) inSingle = !inSingle;
    else if (ch === '"' && !inSingle) inDouble = !inDouble;
    else if (ch === ':' && !inSingle && !inDouble) {
      const rest = text.slice(i + 1);
      if (rest === '' || rest.startsWith(' ') || rest.startsWith('\t')) {
        return [text.slice(0, i).trim(), rest.trim()];
      }
    }
  }
  return null;
}

class Parser {
  constructor(text, file) {
    this.file = file;
    /** @type {{ n: number; raw: string }[]} */
    this.lines = text.split(/\r?\n/).map((raw, i) => ({ n: i + 1, raw }));
    this.pos = 0;
  }

  fail(n, msg) {
    throw new Error(`${this.file}:${n}: ${msg}`);
  }

  /** Индентация строки с учётом срезанного комментария; null — строка пустая/комментарий/документ-маркер. */
  view(line) {
    const stripped = stripComment(line.raw);
    const trimmed = stripped.trim();
    if (trimmed === '' || trimmed === '---' || trimmed === '...') return null;
    const indent = stripped.length - stripped.trimStart().length;
    if (stripped.trimStart().startsWith('\t')) this.fail(line.n, 'табы в отступах запрещены YAML');
    return { n: line.n, indent, text: trimmed };
  }

  /** Пропустить пустые строки; вернуть view следующей значимой строки или null. */
  peek() {
    while (this.pos < this.lines.length) {
      const v = this.view(this.lines[this.pos]);
      if (v) return v;
      this.pos += 1;
    }
    return null;
  }

  parseDocument() {
    const v = this.peek();
    if (!v) this.fail(1, 'пустой YAML-документ');
    const node = this.parseNode(v.indent);
    const tail = this.peek();
    if (tail) this.fail(tail.n, `неожиданный контент после корневого узла: «${tail.text}»`);
    return node;
  }

  /** Узел блока с отступом indent: отображение, последовательность или скаляр. */
  parseNode(indent) {
    const v = this.peek();
    if (!v || v.indent < indent)
      this.fail(v ? v.n : this.lines.length, `пустой блок (отступ ${indent})`);
    if (v.text.startsWith('- ') || v.text === '-') return this.parseSequence(v.indent);
    if (parseKeyLine(v.text)) return this.parseMapping(v.indent);
    return parseFlow(v.text);
  }

  parseMapping(indent) {
    /** @type {Record<string, unknown>} */
    const map = {};
    for (;;) {
      const v = this.peek();
      if (!v || v.indent < indent) return map;
      if (v.indent > indent)
        this.fail(v.n, `отступ ${v.indent} не соответствует уровню отображения ${indent}`);
      if (v.text.startsWith('- '))
        this.fail(
          v.n,
          'элемент последовательности внутри отображения на том же отступе не поддержан',
        );
      const kv = parseKeyLine(v.text);
      if (!kv) this.fail(v.n, `строка не является «ключ: значение»: «${v.text}»`);
      const [keyRaw, rest] = kv;
      if (keyRaw.includes('&') || keyRaw.startsWith('!!'))
        this.fail(v.n, 'якоря/теги YAML не поддержаны');
      const key = parseScalar(keyRaw);
      if (typeof key !== 'string') this.fail(v.n, `ключ не строка: «${keyRaw}»`);
      if (key in map) this.fail(v.n, `дублирующийся ключ «${key}»`);
      this.pos += 1;
      map[key] = rest === '' ? this.parseNested(indent) : this.parseInlineValue(rest, v.n);
    }
  }

  /** Значение ключа с пустым rest: вложенный блок глубже ИЛИ последовательность на том же отступе. */
  parseNested(parentIndent) {
    const v = this.peek();
    if (!v || v.indent <= parentIndent) {
      if (v && v.indent === parentIndent && (v.text.startsWith('- ') || v.text === '-')) {
        return this.parseSequence(v.indent);
      }
      return null;
    }
    return this.parseNode(v.indent);
  }

  parseInlineValue(rest, n) {
    if (rest === '|' || rest === '|-') return this.parseBlockScalar(rest);
    if (rest === '>' || rest === '>-' || rest.startsWith('>-') || rest.startsWith('>')) {
      this.fail(n, 'fold-скаляры (>) не поддержаны — используйте блочный «|»');
    }
    if (rest.startsWith('[') || rest.startsWith('{')) return parseFlow(rest);
    return parseScalar(rest);
  }

  parseBlockScalar(style) {
    const header = this.lines[this.pos - 1];
    const parts = [];
    let bodyIndent = -1;
    for (;;) {
      if (this.pos >= this.lines.length) break;
      const raw = this.lines[this.pos].raw;
      const stripped = stripComment(raw);
      if (stripped.trim() === '') {
        parts.push('');
        this.pos += 1;
        continue;
      }
      const indent = raw.length - raw.trimStart().length;
      if (indent <= header.raw.length - header.raw.trimStart().length) break;
      if (bodyIndent === -1) bodyIndent = indent;
      if (indent < bodyIndent)
        this.fail(this.lines[this.pos].n, 'отступ тела блочного скаляра меньше первого');
      parts.push(raw.slice(bodyIndent));
      this.pos += 1;
    }
    while (parts.length > 0 && parts[parts.length - 1] === '') parts.pop();
    if (style === '|') parts.push('');
    return parts.join('\n');
  }

  parseSequence(indent) {
    /** @type {unknown[]} */
    const items = [];
    for (;;) {
      const v = this.peek();
      if (!v || v.indent < indent) return items;
      if (v.indent > indent)
        this.fail(v.n, `отступ ${v.indent} не соответствует уровню последовательности ${indent}`);
      if (!(v.text.startsWith('- ') || v.text === '-')) {
        this.fail(v.n, `ожидался элемент последовательности «- …», получено: «${v.text}»`);
      }
      const body = v.text === '-' ? '' : v.text.slice(2);
      const itemIndent = v.indent + 2;
      if (body === '') {
        this.pos += 1;
        const nested = this.peek();
        items.push(nested && nested.indent > v.indent ? this.parseNode(nested.indent) : null);
        continue;
      }
      const kv = parseKeyLine(body);
      if (kv) {
        // Компактное отображение в элементе последовательности («- name: x»,
        // продолжение — ключи на отступе itemIndent): подменяем строку на
        // строку с виртуальным отступом и разбираем как обычное отображение.
        this.lines.splice(this.pos, 1, { n: v.n, raw: ' '.repeat(itemIndent) + body });
        items.push(this.parseMapping(itemIndent));
        continue;
      }
      this.pos += 1;
      items.push(this.parseInlineValue(body, v.n));
    }
  }
}

function parseYaml(text, file) {
  const parser = new Parser(text, file);
  return parser.parseDocument();
}

// ---------------------------------------------------------------------------
// Контракты воркфлоу
// ---------------------------------------------------------------------------

const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
const PINNED_IMAGE = pkg.iraoUi?.playwrightImage;
const REQUIRED_WORKFLOWS = [
  'ci.yml',
  'pages.yml',
  'release.yml',
  'update-snapshots.yml',
  'nightly.yml',
];

/** Allowlist first-party actions (supply-chain; сторонние — через решение владельца). */
const ACTION_ALLOWLIST = new Set([
  'actions/checkout@v4',
  'actions/setup-node@v4',
  'actions/upload-artifact@v4',
  'actions/download-artifact@v4',
  'actions/configure-pages@v5',
  'actions/upload-pages-artifact@v3',
  'actions/deploy-pages@v4',
]);

const BROWSERS = ['chromium', 'firefox', 'webkit'];

function get(obj, path, file, what) {
  let cur = obj;
  for (const key of path.split('.')) {
    if (cur === null || typeof cur !== 'object' || !(key in cur)) {
      problem(file, `нет ${what} (${path})`);
      return undefined;
    }
    cur = cur[key];
  }
  return cur;
}

function jobEnvVars(job) {
  const vars = new Set(Object.keys(job?.env ?? {}));
  for (const step of job?.steps ?? []) {
    for (const k of Object.keys(step?.env ?? {})) vars.add(k);
  }
  return vars;
}

function runSteps(job) {
  return (job?.steps ?? []).filter((s) => typeof s?.run === 'string').map((s) => s.run);
}

function anyRunContains(job, needle) {
  return runSteps(job).some((r) => r.includes(needle));
}

function hasStepUsing(job, uses) {
  return (job?.steps ?? []).some((s) => typeof s?.uses === 'string' && s.uses === uses);
}

function checkCommon(name, doc) {
  for (const jobName of Object.keys(get(doc, 'jobs', name, 'jobs') ?? {})) {
    const job = doc.jobs[jobName];
    if (typeof job !== 'object' || job === null || Array.isArray(job)) {
      problem(name, `джоба ${jobName} — не отображение`);
      continue;
    }
    if (!job['runs-on']) problem(name, `джоба ${jobName}: нет runs-on`);
    if (typeof job['timeout-minutes'] !== 'number')
      problem(name, `джоба ${jobName}: нет timeout-minutes (бюджет прогона)`);
    if (typeof job.steps !== 'object' || !Array.isArray(job.steps))
      problem(name, `джоба ${jobName}: нет steps`);
    if (job.container) {
      const image = typeof job.container === 'string' ? job.container : job.container.image;
      if (image !== PINNED_IMAGE) {
        problem(
          name,
          `джоба ${jobName}: контейнер «${image}» !== пин package.json iraoUi.playwrightImage «${PINNED_IMAGE}» (ADR-0004)`,
        );
      }
    }
    for (const step of job.steps ?? []) {
      if (typeof step?.uses === 'string' && !ACTION_ALLOWLIST.has(step.uses)) {
        problem(name, `джоба ${jobName}: action «${step.uses}» вне allowlist first-party`);
      }
      for (const m of String(step?.run ?? '').matchAll(/npm run ([a-z0-9:.-]+)/g)) {
        if (typeof pkg.scripts?.[m[1]] !== 'string')
          problem(name, `джоба ${jobName}: шаг вызывает несуществующий скрипт npm run ${m[1]}`);
      }
    }
    for (const step of job.steps ?? []) {
      if (step?.uses === 'actions/setup-node@v4') {
        const with_ = step.with ?? {};
        if (with_['node-version'] !== 24 && with_['node-version'] !== '24') {
          problem(
            name,
            `джоба ${jobName}: setup-node node-version «${with_['node-version']}» !== 24 (engines package.json)`,
          );
        }
        if (with_.cache !== 'npm') problem(name, `джоба ${jobName}: setup-node без cache: npm`);
      }
    }
    if (anyRunContains(job, 'npm ci') && !hasStepUsing(job, 'actions/setup-node@v4')) {
      problem(name, `джоба ${jobName}: npm ci без setup-node (нет кэша npm — требование T1.5)`);
    }
  }
}

function checkCi(name, doc) {
  if (doc.name !== 'CI')
    problem(name, `name «${doc.name}» !== «CI» (на него ссылается pages.yml workflow_run)`);
  const on = doc.on ?? {};
  const prBranches = get(on, 'pull_request.branches', name, 'on.pull_request.branches') ?? [];
  if (!prBranches.includes('main')) problem(name, 'on.pull_request.branches не содержит main');
  const pushBranches = get(on, 'push.branches', name, 'on.push.branches') ?? [];
  if (!pushBranches.includes('main'))
    problem(name, 'on.push.branches не содержит main (сигнал зелёного CI для pages.yml)');
  if (!('workflow_dispatch' in on)) problem(name, 'нет on.workflow_dispatch');
  if (get(doc, 'permissions.contents', name, 'permissions.contents') !== 'read') {
    problem(
      name,
      'permissions.contents обязан быть read (запись репозитория — только update-snapshots.yml)',
    );
  }
  if (!get(doc, 'concurrency.group', name, 'concurrency.group'))
    problem(name, 'нет concurrency.group (отмена устаревших прогонов PR)');

  const jobs = get(doc, 'jobs', name, 'jobs') ?? {};
  const expected = ['lint', 'html-validate', 'unit', 'build', 'e2e', 'visual'];
  for (const j of expected) if (!(j in jobs)) problem(name, `нет обязательной джобы ${j}`);
  for (const j of Object.keys(jobs))
    if (!expected.includes(j)) problem(name, `неожиданная джоба ${j} (контракт гейтов — 06 §7)`);

  // lint: stylelint + eslint + prettier (+ self-проверка воркфлоу)
  if (jobs.lint) {
    for (const script of ['npm run lint:css', 'npm run lint:js', 'npm run lint:format']) {
      if (!anyRunContains(jobs.lint, script)) problem(name, `lint: нет шага ${script}`);
    }
    if (!anyRunContains(jobs.lint, 'tools/validate-workflows.mjs')) {
      problem(
        name,
        'lint: нет self-шага node tools/validate-workflows.mjs (конвейер проверяет свою конфигурацию на каждый PR)',
      );
    }
  }

  // html-validate — отдельный обязательный гейт (06 §7)
  if (jobs['html-validate'] && !anyRunContains(jobs['html-validate'], 'npm run lint:html')) {
    problem(name, 'html-validate: нет шага npm run lint:html');
  }

  // unit — отдельный обязательный гейт
  if (jobs.unit && !anyRunContains(jobs.unit, 'npm run test:unit')) {
    problem(name, 'unit: нет шага npm run test:unit');
  }

  // build — отдельный обязательный гейт + dist-zip артефакт PR
  if (jobs.build) {
    if (!anyRunContains(jobs.build, 'npm run build'))
      problem(name, 'build: нет шага npm run build');
    if (!anyRunContains(jobs.build, 'zip '))
      problem(name, 'build: нет zip dist-артефакта (артефакт PR — требование T1.5)');
    const upload = (jobs.build.steps ?? []).find((s) => s?.uses === 'actions/upload-artifact@v4');
    if (!upload) problem(name, 'build: нет upload-artifact dist-zip');
    else if (upload.with?.['if-no-files-found'] !== 'error') {
      problem(
        name,
        'build: upload-artifact без if-no-files-found: error (артефакт обязан существовать)',
      );
    }
  }

  // e2e + axe — mandatory, контейнер, БЕЗ IRAO_SNAPSHOTS (эталоны не сравниваются)
  if (jobs.e2e) {
    const needs = jobs.e2e.needs ?? [];
    if (!needs.includes('build'))
      problem(name, 'e2e: needs не содержит build (порядок build → e2e)');
    if (!jobs.e2e.container)
      problem(name, 'e2e: нет container (ADR-0004 — браузерные джобы в пиннутом образе)');
    if (!anyRunContains(jobs.e2e, 'npx playwright test --project=chromium')) {
      problem(name, 'e2e: нет шага npx playwright test --project=chromium');
    }
    if (jobEnvVars(jobs.e2e).has('IRAO_SNAPSHOTS')) {
      problem(
        name,
        'e2e: IRAO_SNAPSHOTS задан — mandatory-гейт не должен трогать эталоны (сравнение — только advisory visual)',
      );
    }
  }

  // visual — advisory: continue-on-error на джобе и step'е, диф-артефакты, красный чек при расхождении
  if (jobs.visual) {
    if (jobs.visual['continue-on-error'] !== true) {
      problem(
        name,
        'visual: нет continue-on-error: true на джобе (run обязан оставаться зелёным, ADR-0004)',
      );
    }
    const needs = jobs.visual.needs ?? [];
    if (!needs.includes('build')) problem(name, 'visual: needs не содержит build');
    if (!jobs.visual.container)
      problem(name, 'visual: нет container (паритет эталонов с test:docker, ADR-0004)');
    const visualStep = (jobs.visual.steps ?? []).find((s) => s?.id === 'visual');
    if (!visualStep) problem(name, 'visual: нет step id: visual');
    else {
      if (visualStep['continue-on-error'] !== true) {
        problem(
          name,
          'visual: step visual без continue-on-error: true (последующие шаги собирают дифы)',
        );
      }
      if (visualStep.env?.IRAO_SNAPSHOTS !== '1') {
        problem(
          name,
          "visual: env IRAO_SNAPSHOTS !== '1' (сравнение/запись эталонов — гейт харнесса)",
        );
      }
      if (!String(visualStep.run ?? '').includes('--project=chromium')) {
        problem(name, 'visual: прогон не ограничен chromium (эталоны пишет только он, ADR-0004)');
      }
    }
    const diffUpload = (jobs.visual.steps ?? []).find(
      (s) =>
        s?.uses === 'actions/upload-artifact@v4' &&
        String(s.with?.path ?? '').includes('-diff.png'),
    );
    if (!diffUpload)
      problem(name, 'visual: нет артефакта визуальных дифов (test-results *-diff.png)');
    else if (diffUpload.if !== 'always()') {
      problem(name, 'visual: артефакт дифов без if: always() (дифы нужны и при красном step)');
    }
    const reFail = (jobs.visual.steps ?? []).some(
      (s) =>
        String(s?.if ?? '').includes('steps.visual.outcome') &&
        anyRunContains({ steps: [s] }, 'exit 1'),
    );
    if (!reFail) {
      problem(
        name,
        'visual: нет финального шага, красящего джобу по steps.visual.outcome (именованный чек должен отражать расхождение)',
      );
    }
  }
}

function checkUpdateSnapshots(name, doc) {
  const on = doc.on ?? {};
  if (!('workflow_dispatch' in on))
    problem(name, 'нет on.workflow_dispatch (ручной fallback, ADR-0004)');
  const triggerKeys = Object.keys(on);
  if (triggerKeys.length !== 1)
    problem(
      name,
      `ожидается единственный триггер workflow_dispatch, найдено: ${triggerKeys.join(', ')}`,
    );
  if (get(doc, 'permissions.contents', name, 'permissions.contents') !== 'read') {
    problem(
      name,
      'permissions.contents на уровне workflow обязан быть read (write — только у джобы коммита)',
    );
  }
  const jobs = get(doc, 'jobs', name, 'jobs') ?? {};
  const snapshots = jobs.snapshots;
  if (!snapshots) {
    problem(name, 'нет джобы snapshots');
  } else {
    if (!snapshots.container)
      problem(name, 'snapshots: нет container (паритет эталонов, ADR-0004)');
    if (!anyRunContains(snapshots, '--update-snapshots'))
      problem(name, 'snapshots: нет --update-snapshots');
    if (!anyRunContains(snapshots, '--project=chromium'))
      problem(name, 'snapshots: эталоны пишет только chromium-проект (ADR-0004)');
    if (!runSteps(snapshots).some((r) => r.includes('sha256sum'))) {
      problem(
        name,
        'snapshots: нет sha256sum в summary (контроль бинарного паритета с npm run test:docker — AC T1.5)',
      );
    }
    const upload = (snapshots.steps ?? []).find((s) => s?.uses === 'actions/upload-artifact@v4');
    if (!upload)
      problem(name, 'snapshots: нет артефакта эталонов (протокол сверки tests/visual/README.md)');
    else if (upload.with?.['if-no-files-found'] !== 'error') {
      problem(name, 'snapshots: артефакт эталонов без if-no-files-found: error');
    }
  }
  const commit = jobs.commit;
  if (!commit) {
    problem(name, 'нет джобы commit (бот-коммит)');
  } else {
    const perms = commit.permissions ?? {};
    if (perms.contents !== 'write') problem(name, 'commit: permissions.contents !== write');
    if (!runSteps(commit).some((r) => r.includes('irao-ui-bot')))
      problem(name, 'commit: коммит не от бота irao-ui-bot');
    if (!runSteps(commit).some((r) => r.includes('git push')))
      problem(name, 'commit: нет git push');
    if (!runSteps(commit).some((r) => r.includes('gh pr create')))
      problem(name, 'commit: нет gh pr create (fallback для машин без контейнера)');
  }
}

function checkPages(name, doc) {
  const on = doc.on ?? {};
  const wr = on.workflow_run;
  if (!wr || typeof wr !== 'object') {
    problem(
      name,
      'нет on.workflow_run (деплой только после зелёного CI — технические требования T1.5)',
    );
  } else {
    if (!(wr.workflows ?? []).includes('CI'))
      problem(name, 'workflow_run.workflows не содержит CI');
    if (!(wr.types ?? []).includes('completed'))
      problem(name, 'workflow_run.types не содержит completed');
    if (!(wr.branches ?? []).includes('main'))
      problem(name, 'workflow_run.branches не содержит main');
  }
  if (!('workflow_dispatch' in on)) problem(name, 'нет on.workflow_dispatch');
  const perms = doc.permissions ?? {};
  if (perms.pages !== 'write' || perms['id-token'] !== 'write')
    problem(name, 'permissions pages: write / id-token: write обязательны для deploy-pages');
  const jobs = get(doc, 'jobs', name, 'jobs') ?? {};
  const deploy = Object.values(jobs)[0];
  if (!deploy) {
    problem(name, 'нет джобы деплоя');
  } else {
    const guard = String(deploy.if ?? '');
    if (!guard.includes('workflow_run.conclusion')) {
      problem(name, 'деплой: нет guard-условия github.event.workflow_run.conclusion == success');
    }
    if (get(deploy, 'environment.name', name, 'environment.name') !== 'github-pages') {
      problem(name, 'environment.name !== github-pages');
    }
    if (!hasStepUsing(deploy, 'actions/upload-pages-artifact@v3'))
      problem(name, 'нет upload-pages-artifact');
    if (!hasStepUsing(deploy, 'actions/deploy-pages@v4')) problem(name, 'нет deploy-pages');
    const upload = (deploy.steps ?? []).find((s) => s?.uses === 'actions/upload-pages-artifact@v3');
    if (upload && upload.with?.path !== 'showcase/dist')
      problem(name, 'upload-pages-artifact path !== showcase/dist');
    if (!anyRunContains(deploy, 'npm run build')) problem(name, 'деплой: нет сборки npm run build');
    if (!anyRunContains(deploy, '.nojekyll'))
      problem(name, 'деплой: нет .nojekyll (GitHub Pages без Jekyll-обработки)');
  }
}

function checkRelease(name, doc) {
  const on = doc.on ?? {};
  const tags = get(on, 'push.tags', name, 'on.push.tags') ?? [];
  if (!tags.includes('v*')) problem(name, "on.push.tags не содержит 'v*'");
  if (!('workflow_dispatch' in on)) problem(name, 'нет on.workflow_dispatch');
  const jobs = get(doc, 'jobs', name, 'jobs') ?? {};
  const buildDist = Object.keys(jobs).find((j) =>
    jobs[j]?.steps?.some((s) => String(s?.run ?? '').includes('zip ')),
  );
  if (!buildDist) problem(name, 'нет джобы сборки dist-zip артефакта');
  const matrixJob = Object.values(jobs).find((j) => j?.strategy?.matrix);
  if (!matrixJob) {
    problem(name, 'нет джобы с матрицей (каркас T12.1 — матрица + артефакты)');
  } else {
    const browsers = matrixJob.strategy.matrix.browser ?? [];
    for (const b of BROWSERS) if (!browsers.includes(b)) problem(name, `матрица release без ${b}`);
    if (matrixJob.strategy['fail-fast'] !== false)
      problem(
        name,
        'матрица release: fail-fast обязан быть false (один браузер не роняет остальные)',
      );
    if (!matrixJob.container) problem(name, 'матрица release: нет container (ADR-0004)');
    if (!matrixJob.needs) problem(name, 'матрица release: нет needs (порядок build → матрица)');
  }
}

function checkNightly(name, doc) {
  const on = doc.on ?? {};
  if (!on.schedule) problem(name, 'нет on.schedule (ночной контур)');
  if (!('workflow_dispatch' in on)) problem(name, 'нет on.workflow_dispatch');
  const jobs = get(doc, 'jobs', name, 'jobs') ?? {};
  const matrixJob = Object.values(jobs).find((j) => j?.strategy?.matrix);
  if (!matrixJob) {
    problem(name, 'нет матричной джобы (T1.5: матрица chromium/firefox/webkit)');
  } else {
    const browsers = matrixJob.strategy.matrix.browser ?? [];
    for (const b of BROWSERS) if (!browsers.includes(b)) problem(name, `матрица nightly без ${b}`);
    if (matrixJob.strategy['fail-fast'] !== false)
      problem(name, 'матрица nightly: fail-fast обязан быть false');
    if (!matrixJob.container) problem(name, 'матрица nightly: нет container (ADR-0004)');
    if (!runSteps(matrixJob).some((r) => r.includes('npx playwright test'))) {
      problem(name, 'матрица nightly: нет прогона npx playwright test');
    }
    if (jobEnvVars(matrixJob).has('IRAO_SNAPSHOTS')) {
      problem(
        name,
        'матрица nightly: IRAO_SNAPSHOTS задан — ночь эталоны не пишет и не сравнивает',
      );
    }
  }
}

// ---------------------------------------------------------------------------
// Запуск
// ---------------------------------------------------------------------------

if (!PINNED_IMAGE || !/:v\d+\.\d+\.\d+-jammy$/.test(PINNED_IMAGE)) {
  console.error(
    `validate-workflows: в package.json нет корректного пина iraoUi.playwrightImage (${PINNED_IMAGE})`,
  );
  process.exit(1);
}

console.log('== WORKFLOWS ==');
if (!existsSync(workflowsDir)) {
  console.error('validate-workflows: каталог .github/workflows не найден');
  process.exit(1);
}
const files = readdirSync(workflowsDir)
  .filter((f) => f.endsWith('.yml'))
  .sort();
console.log(`found: ${files.join(', ') || '— (пусто)'}`);

for (const f of REQUIRED_WORKFLOWS) {
  if (!files.includes(f)) problem(f, 'файл не найден (контракт T1.5)');
}

/** @type {Map<string, object>} */
const docs = new Map();
for (const f of files) {
  const full = join(workflowsDir, f);
  try {
    docs.set(f, parseYaml(readFileSync(full, 'utf8'), f));
    console.log(`parsed: ${f}`);
  } catch (err) {
    problem(f, `YAML: ${err.message}`);
  }
}

if (docs.has('ci.yml')) checkCommon('ci.yml', docs.get('ci.yml'));
if (docs.has('pages.yml')) checkCommon('pages.yml', docs.get('pages.yml'));
if (docs.has('release.yml')) checkCommon('release.yml', docs.get('release.yml'));
if (docs.has('update-snapshots.yml'))
  checkCommon('update-snapshots.yml', docs.get('update-snapshots.yml'));
if (docs.has('nightly.yml')) checkCommon('nightly.yml', docs.get('nightly.yml'));
if (docs.has('ci.yml')) checkCi('ci.yml', docs.get('ci.yml'));
if (docs.has('update-snapshots.yml'))
  checkUpdateSnapshots('update-snapshots.yml', docs.get('update-snapshots.yml'));
if (docs.has('pages.yml')) checkPages('pages.yml', docs.get('pages.yml'));
if (docs.has('release.yml')) checkRelease('release.yml', docs.get('release.yml'));
if (docs.has('nightly.yml')) checkNightly('nightly.yml', docs.get('nightly.yml'));

console.log('== SUMMARY ==');
if (problems.length === 0) {
  console.log(`workflows: ${files.length} — контракты T1.5 выполнены`);
  process.exit(0);
}
for (const p of problems) console.log(`PROBLEM: ${p}`);
console.log(`problems: ${problems.length}`);
process.exit(1);
