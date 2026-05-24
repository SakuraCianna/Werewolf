# AI Werewolf MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a local React AI狼人杀观战 MVP where the user selects 6-12 players, watches AI players run a full game, can switch views, rollback timeline checkpoints, and see an AI-generated post-game review.

**Architecture:** The app is a pure frontend Vite application. The game is driven by a deterministic TypeScript engine with an event timeline and checkpoints; LLM adapters only generate player decisions and text. Markdown rules/personas are static content assets loaded at runtime from `public/`, while React components render a fixed-height 5:2 table-room UI.

**Tech Stack:** React, TypeScript, Vite, Vitest, React Testing Library, Playwright, GSAP, PowerShell-safe npm scripts.

---

## Scope Notes

This plan implements the approved spec as one MVP because the subsystems are tightly coupled: the UI needs engine events, rollback needs checkpoints, and LLM prompts need rules/personas. The plan still keeps tasks independently verifiable and commit-sized.

Current repository note: `E:\CodeHome\Werewolf` was not a Git repository during planning. Task 1 initializes Git before code work so later tasks can follow the user's commit workflow.

## File Structure Map

- `package.json`: npm scripts and dependencies.
- `index.html`: Vite app entry HTML.
- `src/main.tsx`: React mount entry.
- `src/app/App.tsx`: top-level app state machine wiring.
- `src/app/App.css`: global layout variables and fixed viewport base styles.
- `src/game/types.ts`: shared role, player, event, checkpoint, phase, and settlement types.
- `src/game/roles/roleConfig.ts`: 6-12 player role table.
- `src/game/roles/roleConfig.test.ts`: role table tests.
- `src/content/loadMarkdownAssets.ts`: fetches rule Markdown and persona Markdown from `public/`.
- `src/content/loadMarkdownAssets.test.ts`: fetch mock tests.
- `public/personas/index.json`: manifest listing persona Markdown files.
- `public/personas/*.md`: editable AI persona files.
- `public/rules/werewolf-rules.md`: editable rule source.
- `src/game/setup/createGame.ts`: creates a new game from selected player count, personas, and role config.
- `src/game/setup/createGame.test.ts`: setup tests.
- `src/game/timeline/timeline.ts`: event append, checkpoint creation, rollback helpers.
- `src/game/timeline/timeline.test.ts`: timeline and rollback tests.
- `src/llm/types.ts`: provider config and normalized action request/response types.
- `src/llm/adapters/openaiCompatible.ts`: OpenAI-compatible adapter.
- `src/llm/adapters/anthropicClaude.ts`: Anthropic Messages adapter.
- `src/llm/adapters/llmAdapters.test.ts`: fetch-level adapter tests.
- `src/llm/prompts/buildPlayerPrompt.ts`: prompt builder for AI player actions.
- `src/llm/prompts/buildJudgePrompt.ts`: prompt builder for post-game judging.
- `src/llm/parseLlmJson.ts`: schema-minded JSON extraction and validation helpers.
- `src/game/engine/gameEngine.ts`: deterministic phase progression and integration with `LlmClient`.
- `src/game/engine/gameEngine.test.ts`: engine tests with a fake LLM.
- `src/components/room/RoomView.tsx`: left table and seats.
- `src/components/status-feed/StatusFeed.tsx`: right message feed.
- `src/components/controls/GameControls.tsx`: start, pause, view switch, rollback controls.
- `src/components/settlement/SettlementView.tsx`: post-game review page.
- `src/motion/roomAnimations.ts`: GSAP helpers for seats and view switch.
- `src/motion/messageAnimations.ts`: GSAP helpers for status messages.
- `src/test/setup.ts`: Vitest DOM setup.
- `tests/e2e/room-layout.spec.ts`: Playwright layout and no-page-scroll checks.
- `README.md`: setup, env config, editing rules/personas, and local-only security notes.
- `.env.example`: provider configuration template.

---

### Task 1: Project Bootstrap And Git Baseline

**Files:**
- Create: `package.json`
- Create: `index.html`
- Create: `src/main.tsx`
- Create: `src/app/App.tsx`
- Create: `src/app/App.css`
- Create: `src/test/setup.ts`
- Create: `vite.config.ts`
- Create: `vitest.config.ts`
- Create: `playwright.config.ts`
- Create: `tsconfig.json`
- Create: `tsconfig.node.json`
- Create: `.gitignore`
- Create: `.env.example`

- [ ] **Step 1: Initialize Git repository**

Run:

```powershell
git status --short --branch
```

Expected: `fatal: not a git repository`.

Run:

```powershell
git init
```

Expected: `Initialized empty Git repository`.

- [ ] **Step 2: Create npm project metadata**

Create `package.json` with:

```json
{
  "name": "ai-werewolf",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "preview": "vite preview",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:e2e": "playwright test",
    "typecheck": "tsc -b"
  },
  "dependencies": {
    "@gsap/react": "latest",
    "gsap": "latest",
    "react": "latest",
    "react-dom": "latest"
  },
  "devDependencies": {
    "@playwright/test": "latest",
    "@testing-library/jest-dom": "latest",
    "@testing-library/react": "latest",
    "@types/react": "latest",
    "@types/react-dom": "latest",
    "@vitejs/plugin-react": "latest",
    "typescript": "latest",
    "vite": "latest",
    "vitest": "latest"
  }
}
```

- [ ] **Step 3: Install dependencies**

Run:

```powershell
npm install
```

Expected: `node_modules` and `package-lock.json` are created.

- [ ] **Step 4: Add TypeScript and Vite config**

Create `tsconfig.json`:

```json
{
  "files": [],
  "references": [
    { "path": "./tsconfig.node.json" },
    { "path": "./tsconfig.app.json" }
  ]
}
```

Create `tsconfig.app.json`:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "useDefineForClassFields": true,
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "allowJs": false,
    "skipLibCheck": true,
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true,
    "strict": true,
    "forceConsistentCasingInFileNames": true,
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "types": ["vitest/globals", "@testing-library/jest-dom"]
  },
  "include": ["src"]
}
```

Create `tsconfig.node.json`:

```json
{
  "compilerOptions": {
    "composite": true,
    "skipLibCheck": true,
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "allowSyntheticDefaultImports": true,
    "strict": true
  },
  "include": ["vite.config.ts", "vitest.config.ts", "playwright.config.ts"]
}
```

Create `vite.config.ts`:

```ts
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react()],
});
```

Create `vitest.config.ts`:

```ts
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/test/setup.ts',
  },
});
```

Create `playwright.config.ts`:

```ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  use: {
    baseURL: 'http://127.0.0.1:5173',
    trace: 'on-first-retry',
  },
  webServer: {
    command: 'npm run dev -- --host 127.0.0.1',
    url: 'http://127.0.0.1:5173',
    reuseExistingServer: true,
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
});
```

- [ ] **Step 5: Add React entry files**

Create `index.html`:

```html
<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>AI 狼人杀</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

Create `src/main.tsx`:

```tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './app/App';
import './app/App.css';

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
```

Create `src/app/App.tsx`:

```tsx
export function App() {
  return (
    <main className="app-shell">
      <section className="lobby-panel">
        <h1>AI 狼人杀</h1>
        <p>选择 6-12 人后开始一局 AI 狼人杀观战。</p>
      </section>
    </main>
  );
}
```

Create `src/app/App.css`:

```css
:root {
  color: #ffffff;
  background: #12141c;
  font-family: "Microsoft YaHei", "Segoe UI", system-ui, sans-serif;
  font-synthesis: none;
  text-rendering: optimizeLegibility;
}

* {
  box-sizing: border-box;
}

html,
body,
#root {
  width: 100%;
  height: 100%;
  margin: 0;
  overflow: hidden;
}

button {
  font: inherit;
}

.app-shell {
  width: 100vw;
  height: 100vh;
  display: grid;
  place-items: center;
  background: #12141c;
}

.lobby-panel {
  width: min(460px, calc(100vw - 32px));
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 8px;
  padding: 24px;
  background: rgba(255, 255, 255, 0.06);
}
```

Create `src/test/setup.ts`:

```ts
import '@testing-library/jest-dom/vitest';
```

- [ ] **Step 6: Add env and ignore files**

Create `.env.example`:

```text
VITE_LLM_PROVIDER=openai-compatible

VITE_OPENAI_API_KEY=
VITE_OPENAI_BASE_URL=https://api.openai.com
VITE_OPENAI_MODEL=
VITE_OPENAI_API_STYLE=chat

VITE_ANTHROPIC_API_KEY=
VITE_ANTHROPIC_BASE_URL=https://api.anthropic.com
VITE_ANTHROPIC_MODEL=
VITE_ANTHROPIC_VERSION=2023-06-01
```

Create `.gitignore`:

```gitignore
node_modules/
dist/
coverage/
playwright-report/
test-results/
.env
.env.local
.env.*.local
.superpowers/
```

- [ ] **Step 7: Verify scaffold**

Run:

```powershell
npm run typecheck
npm run test
npm run build
```

Expected: all commands exit with code `0`.

- [ ] **Step 8: Commit**

Run:

```powershell
git status --short
git add package.json package-lock.json index.html src vite.config.ts vitest.config.ts playwright.config.ts tsconfig.json tsconfig.app.json tsconfig.node.json .env.example .gitignore
git commit -m "初始化 React 狼人杀项目"
```

Expected: commit succeeds.

---

### Task 2: Role Config And Core Types

**Files:**
- Create: `src/game/types.ts`
- Create: `src/game/roles/roleConfig.ts`
- Create: `src/game/roles/roleConfig.test.ts`

- [ ] **Step 1: Write failing role config tests**

Create `src/game/roles/roleConfig.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { getRoleConfig } from './roleConfig';

const expected = {
  6: { werewolf: 2, villager: 3, seer: 1 },
  7: { werewolf: 2, villager: 3, seer: 1, witch: 1 },
  8: { werewolf: 2, villager: 4, seer: 1, witch: 1 },
  9: { werewolf: 3, villager: 3, seer: 1, witch: 1, hunter: 1 },
  10: { werewolf: 3, villager: 4, seer: 1, witch: 1, hunter: 1 },
  11: { werewolf: 3, villager: 4, seer: 1, witch: 1, hunter: 1, guard: 1 },
  12: { werewolf: 4, villager: 4, seer: 1, witch: 1, hunter: 1, guard: 1 },
} as const;

describe('getRoleConfig', () => {
  it.each(Object.entries(expected))('returns exact role counts for %s players', (count, roles) => {
    const config = getRoleConfig(Number(count));
    expect(config.roles).toEqual(roles);
    expect(Object.values(config.roles).reduce((sum, value) => sum + value, 0)).toBe(Number(count));
  });

  it('rejects player counts below 6', () => {
    expect(() => getRoleConfig(5)).toThrow('Player count must be between 6 and 12');
  });

  it('rejects player counts above 12', () => {
    expect(() => getRoleConfig(13)).toThrow('Player count must be between 6 and 12');
  });
});
```

- [ ] **Step 2: Run test to verify failure**

Run:

```powershell
npm run test -- src/game/roles/roleConfig.test.ts
```

Expected: FAIL because `roleConfig.ts` does not exist.

- [ ] **Step 3: Add shared types**

Create `src/game/types.ts`:

```ts
export type Role = 'werewolf' | 'villager' | 'seer' | 'witch' | 'hunter' | 'guard';

export type Camp = 'werewolf' | 'good';

export type GamePhase =
  | 'lobby'
  | 'setup'
  | 'night'
  | 'night-result'
  | 'day-discussion'
  | 'vote'
  | 'exile-result'
  | 'settlement';

export type ViewMode = 'audience' | 'god';

export type PlayerStatus = 'alive' | 'dead';

export type EventKind =
  | 'speech'
  | 'kill'
  | 'revive'
  | 'protect'
  | 'inspect'
  | 'vote'
  | 'exile'
  | 'phase'
  | 'system';

export interface RoleConfig {
  playerCount: number;
  roles: Partial<Record<Role, number>>;
}

export interface Persona {
  id: string;
  name: string;
  markdown: string;
}

export interface Player {
  id: string;
  name: string;
  personaId: string;
  role: Role;
  camp: Camp;
  status: PlayerStatus;
  privateMemory: string[];
}

export interface GameEvent {
  id: string;
  kind: EventKind;
  phase: GamePhase;
  day: number;
  title: string;
  content: string;
  playerId?: string;
  targetId?: string;
  colorToken: 'speech' | 'kill' | 'revive' | 'protect' | 'neutral';
  createdAt: number;
}

export interface GameCheckpoint {
  id: string;
  label: string;
  phase: GamePhase;
  day: number;
  eventIndex: number;
  state: GameStateSnapshot;
}

export interface GameStateSnapshot {
  phase: GamePhase;
  day: number;
  players: Player[];
  events: GameEvent[];
}

export interface GameState extends GameStateSnapshot {
  playerCount: number;
  viewMode: ViewMode;
  checkpoints: GameCheckpoint[];
  rulesMarkdown: string;
}
```

- [ ] **Step 4: Add role config implementation**

Create `src/game/roles/roleConfig.ts`:

```ts
import type { RoleConfig } from '../types';

const ROLE_CONFIGS: Record<number, RoleConfig> = {
  6: { playerCount: 6, roles: { werewolf: 2, villager: 3, seer: 1 } },
  7: { playerCount: 7, roles: { werewolf: 2, villager: 3, seer: 1, witch: 1 } },
  8: { playerCount: 8, roles: { werewolf: 2, villager: 4, seer: 1, witch: 1 } },
  9: { playerCount: 9, roles: { werewolf: 3, villager: 3, seer: 1, witch: 1, hunter: 1 } },
  10: { playerCount: 10, roles: { werewolf: 3, villager: 4, seer: 1, witch: 1, hunter: 1 } },
  11: { playerCount: 11, roles: { werewolf: 3, villager: 4, seer: 1, witch: 1, hunter: 1, guard: 1 } },
  12: { playerCount: 12, roles: { werewolf: 4, villager: 4, seer: 1, witch: 1, hunter: 1, guard: 1 } },
};

export function getRoleConfig(playerCount: number): RoleConfig {
  const config = ROLE_CONFIGS[playerCount];
  if (!config) {
    throw new Error('Player count must be between 6 and 12');
  }
  return {
    playerCount: config.playerCount,
    roles: { ...config.roles },
  };
}
```

- [ ] **Step 5: Verify tests**

Run:

```powershell
npm run test -- src/game/roles/roleConfig.test.ts
npm run typecheck
```

Expected: PASS.

- [ ] **Step 6: Commit**

Run:

```powershell
git add src/game
git commit -m "添加狼人杀角色配置"
```

Expected: commit succeeds.

---

### Task 3: Markdown Rule And Persona Assets

**Files:**
- Create: `public/personas/index.json`
- Create: `public/personas/lin-che.md`
- Create: `public/personas/xia-mian.md`
- Create: `public/personas/gu-heng.md`
- Create: `public/personas/ye-lan.md`
- Create: `public/personas/qi-ye.md`
- Create: `public/personas/wen-xu.md`
- Create: `public/personas/shen-heng.md`
- Create: `public/personas/xu-zhao.md`
- Create: `public/personas/wen-xi.md`
- Create: `public/personas/su-ning.md`
- Create: `public/personas/jiang-wan.md`
- Create: `public/personas/lu-sen.md`
- Create: `public/rules/werewolf-rules.md`
- Create: `src/content/loadMarkdownAssets.ts`
- Create: `src/content/loadMarkdownAssets.test.ts`

- [ ] **Step 1: Write failing loader tests**

Create `src/content/loadMarkdownAssets.test.ts`:

```ts
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { loadPersonas, loadRulesMarkdown } from './loadMarkdownAssets';

describe('loadMarkdownAssets', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('loads rules markdown from public rules path', async () => {
    vi.stubGlobal('fetch', vi.fn(async (url: string) => ({
      ok: true,
      text: async () => `rules from ${url}`,
    })));

    await expect(loadRulesMarkdown()).resolves.toBe('rules from /rules/werewolf-rules.md');
  });

  it('loads persona manifest and markdown files', async () => {
    vi.stubGlobal('fetch', vi.fn(async (url: string) => {
      if (url === '/personas/index.json') {
        return {
          ok: true,
          json: async () => ({ files: ['lin-che.md', 'xia-mian.md'] }),
        };
      }
      return {
        ok: true,
        text: async () => `# ${url.includes('lin') ? '林澈' : '夏眠'}\n\n说话风格：冷静。`,
      };
    }));

    const personas = await loadPersonas();
    expect(personas).toHaveLength(2);
    expect(personas[0]).toMatchObject({ id: 'lin-che', name: '林澈' });
    expect(personas[1]).toMatchObject({ id: 'xia-mian', name: '夏眠' });
  });

  it('throws a readable error when a file cannot load', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: false, status: 404 })));

    await expect(loadRulesMarkdown()).rejects.toThrow('Failed to load /rules/werewolf-rules.md: 404');
  });
});
```

- [ ] **Step 2: Run test to verify failure**

Run:

```powershell
npm run test -- src/content/loadMarkdownAssets.test.ts
```

Expected: FAIL because `loadMarkdownAssets.ts` does not exist.

- [ ] **Step 3: Implement Markdown loader**

Create `src/content/loadMarkdownAssets.ts`:

```ts
import type { Persona } from '../game/types';

interface PersonaManifest {
  files: string[];
}

async function fetchText(path: string): Promise<string> {
  const response = await fetch(path);
  if (!response.ok) {
    throw new Error(`Failed to load ${path}: ${response.status}`);
  }
  return response.text();
}

function extractPersonaName(markdown: string, fallback: string): string {
  const firstHeading = markdown.match(/^#\s+(.+)$/m);
  return firstHeading?.[1]?.trim() || fallback;
}

function fileToPersonaId(file: string): string {
  return file.replace(/\.md$/i, '');
}

export async function loadRulesMarkdown(): Promise<string> {
  return fetchText('/rules/werewolf-rules.md');
}

export async function loadPersonas(): Promise<Persona[]> {
  const manifestResponse = await fetch('/personas/index.json');
  if (!manifestResponse.ok) {
    throw new Error(`Failed to load /personas/index.json: ${manifestResponse.status}`);
  }

  const manifest = (await manifestResponse.json()) as PersonaManifest;
  return Promise.all(
    manifest.files.map(async (file) => {
      const markdown = await fetchText(`/personas/${file}`);
      return {
        id: fileToPersonaId(file),
        name: extractPersonaName(markdown, fileToPersonaId(file)),
        markdown,
      };
    }),
  );
}
```

- [ ] **Step 4: Add persona manifest**

Create `public/personas/index.json`:

```json
{
  "files": [
    "lin-che.md",
    "xia-mian.md",
    "gu-heng.md",
    "ye-lan.md",
    "qi-ye.md",
    "wen-xu.md",
    "shen-heng.md",
    "xu-zhao.md",
    "wen-xi.md",
    "su-ning.md",
    "jiang-wan.md",
    "lu-sen.md"
  ]
}
```

- [ ] **Step 5: Add sample persona files**

Create `public/personas/lin-che.md`:

```markdown
# 林澈

说话风格：冷静、克制，喜欢先复盘票型再下判断。

推理习惯：重视发言前后矛盾，倾向把怀疑分成高、中、低三个层级。

情绪稳定度：高。

攻击性：中等，只有证据积累后才会强推。

撒谎风格：作为狼人时会混入真实推理，避免全程硬编。

容易犯的错误：过度相信票型，偶尔低估情绪型玩家的随机性。
```

Create the remaining eleven persona files with the same headings and unique names:

```markdown
# 夏眠

说话风格：直觉强、语速快，喜欢直接点名怀疑对象。

推理习惯：重视发言情绪和临场反应。

情绪稳定度：中。

攻击性：高。

撒谎风格：作为狼人时会主动制造对立面。

容易犯的错误：容易把强势发言误判为狼人压迫。
```

```markdown
# 顾衡

说话风格：逻辑化，喜欢列出一二三点。

推理习惯：重视身份收益和行动动机。

情绪稳定度：高。

攻击性：中。

撒谎风格：作为狼人时会伪装成分析型好人。

容易犯的错误：表达太完整时容易显得像准备好的稿子。
```

```markdown
# 叶岚

说话风格：简洁尖锐，常用反问压迫对方解释。

推理习惯：重视谁在转移焦点。

情绪稳定度：中高。

攻击性：高。

撒谎风格：作为狼人时会抓住真漏洞扩大攻击。

容易犯的错误：容易因为进攻性过强被反打。
```

```markdown
# 祁野

说话风格：轻松、带一点玩笑，但关键判断会明确。

推理习惯：重视站边变化和跟票行为。

情绪稳定度：中高。

攻击性：中。

撒谎风格：作为狼人时会用松弛感降低威胁。

容易犯的错误：过于轻松时会被认为不认真。
```

```markdown
# 温序

说话风格：温和，习惯先承认不确定性。

推理习惯：重视多轮信息的交叉验证。

情绪稳定度：高。

攻击性：低。

撒谎风格：作为狼人时会减少主动出击。

容易犯的错误：发言过软，容易被强势玩家带走票。
```

```markdown
# 沈珩

说话风格：谨慎，喜欢要求别人补充细节。

推理习惯：重视夜晚死亡和白天票型的关系。

情绪稳定度：高。

攻击性：中低。

撒谎风格：作为狼人时会尽量少暴露立场。

容易犯的错误：信息不足时容易拖延决策。
```

```markdown
# 许照

说话风格：直接，喜欢给结论。

推理习惯：重视谁的行为最不符合身份收益。

情绪稳定度：中。

攻击性：高。

撒谎风格：作为狼人时会提前构建替罪目标。

容易犯的错误：结论太早，容易被新信息反噬。
```

```markdown
# 闻溪

说话风格：细腻，喜欢引用别人原话。

推理习惯：重视措辞变化和态度转折。

情绪稳定度：中高。

攻击性：中。

撒谎风格：作为狼人时会模仿好人的犹豫。

容易犯的错误：容易把话术差异看得过重。
```

```markdown
# 苏宁

说话风格：稳重，先听后说。

推理习惯：重视被多数人忽略的边缘位。

情绪稳定度：高。

攻击性：低。

撒谎风格：作为狼人时会尽量让自己处在第二焦点。

容易犯的错误：存在感不足时会被归为划水。
```

```markdown
# 江晚

说话风格：有感染力，擅长把复杂局势讲成简单判断。

推理习惯：重视团队站边和发言动机。

情绪稳定度：中。

攻击性：中高。

撒谎风格：作为狼人时会用共情争取信任。

容易犯的错误：说服力强但证据链有时不够扎实。
```

```markdown
# 陆森

说话风格：沉稳偏冷，发言短但重点明确。

推理习惯：重视谁从混乱中获益。

情绪稳定度：高。

攻击性：中。

撒谎风格：作为狼人时会故意保留部分真实怀疑。

容易犯的错误：过于简短时容易被误解为藏信息。
```

- [ ] **Step 6: Add rules Markdown**

Create `public/rules/werewolf-rules.md` with the exact role table and role rules from `docs/superpowers/specs/2026-05-24-ai-werewolf-design.md` sections 4.2 and 5.

- [ ] **Step 7: Verify**

Run:

```powershell
npm run test -- src/content/loadMarkdownAssets.test.ts
npm run typecheck
```

Expected: PASS.

- [ ] **Step 8: Commit**

Run:

```powershell
git add public src/content
git commit -m "添加规则与人物设定资源"
```

Expected: commit succeeds.

---

### Task 4: Game Setup

**Files:**
- Create: `src/game/setup/createGame.ts`
- Create: `src/game/setup/createGame.test.ts`

- [ ] **Step 1: Write failing setup tests**

Create `src/game/setup/createGame.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import type { Persona } from '../types';
import { createGame } from './createGame';

function personas(count: number): Persona[] {
  return Array.from({ length: count }, (_, index) => ({
    id: `persona-${index + 1}`,
    name: `玩家${index + 1}`,
    markdown: `# 玩家${index + 1}`,
  }));
}

describe('createGame', () => {
  it('creates players with names, roles, camps, and alive status', () => {
    const game = createGame({
      playerCount: 6,
      personas: personas(12),
      rulesMarkdown: '# rules',
      seed: 7,
    });

    expect(game.players).toHaveLength(6);
    expect(game.players.every((player) => player.status === 'alive')).toBe(true);
    expect(game.players.filter((player) => player.role === 'werewolf')).toHaveLength(2);
    expect(game.players.filter((player) => player.camp === 'good')).toHaveLength(4);
    expect(game.viewMode).toBe('audience');
    expect(game.events[0].title).toBe('游戏开始');
  });

  it('requires enough personas for the selected player count', () => {
    expect(() =>
      createGame({
        playerCount: 12,
        personas: personas(6),
        rulesMarkdown: '# rules',
        seed: 1,
      }),
    ).toThrow('Need at least 12 personas');
  });
});
```

- [ ] **Step 2: Run test to verify failure**

Run:

```powershell
npm run test -- src/game/setup/createGame.test.ts
```

Expected: FAIL because `createGame.ts` does not exist.

- [ ] **Step 3: Implement deterministic setup**

Create `src/game/setup/createGame.ts`:

```ts
import { getRoleConfig } from '../roles/roleConfig';
import type { Camp, GameState, Persona, Player, Role } from '../types';

interface CreateGameInput {
  playerCount: number;
  personas: Persona[];
  rulesMarkdown: string;
  seed: number;
}

function campForRole(role: Role): Camp {
  return role === 'werewolf' ? 'werewolf' : 'good';
}

function seededRandom(seed: number): () => number {
  let value = seed;
  return () => {
    value = (value * 9301 + 49297) % 233280;
    return value / 233280;
  };
}

function shuffle<T>(items: T[], seed: number): T[] {
  const random = seededRandom(seed);
  const copy = [...items];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [copy[index], copy[swapIndex]] = [copy[swapIndex], copy[index]];
  }
  return copy;
}

function expandRoles(playerCount: number): Role[] {
  const config = getRoleConfig(playerCount);
  return Object.entries(config.roles).flatMap(([role, count]) =>
    Array.from({ length: count ?? 0 }, () => role as Role),
  );
}

export function createGame(input: CreateGameInput): GameState {
  if (input.personas.length < input.playerCount) {
    throw new Error(`Need at least ${input.playerCount} personas`);
  }

  const selectedPersonas = shuffle(input.personas, input.seed).slice(0, input.playerCount);
  const roles = shuffle(expandRoles(input.playerCount), input.seed + 1);

  const players: Player[] = selectedPersonas.map((persona, index) => {
    const role = roles[index];
    return {
      id: persona.id,
      name: persona.name,
      personaId: persona.id,
      role,
      camp: campForRole(role),
      status: 'alive',
      privateMemory: [],
    };
  });

  return {
    playerCount: input.playerCount,
    viewMode: 'audience',
    phase: 'setup',
    day: 1,
    players,
    checkpoints: [],
    rulesMarkdown: input.rulesMarkdown,
    events: [
      {
        id: 'event-start',
        kind: 'system',
        phase: 'setup',
        day: 1,
        title: '游戏开始',
        content: `${input.playerCount} 人局已经创建。`,
        colorToken: 'neutral',
        createdAt: Date.now(),
      },
    ],
  };
}
```

- [ ] **Step 4: Verify**

Run:

```powershell
npm run test -- src/game/setup/createGame.test.ts
npm run typecheck
```

Expected: PASS.

- [ ] **Step 5: Commit**

Run:

```powershell
git add src/game/setup
git commit -m "实现游戏开局初始化"
```

Expected: commit succeeds.

---

### Task 5: Timeline And Rollback

**Files:**
- Create: `src/game/timeline/timeline.ts`
- Create: `src/game/timeline/timeline.test.ts`

- [ ] **Step 1: Write failing timeline tests**

Create `src/game/timeline/timeline.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import type { GameState } from '../types';
import { appendEvent, createCheckpoint, rollbackToCheckpoint } from './timeline';

const baseState: GameState = {
  playerCount: 6,
  viewMode: 'audience',
  phase: 'night',
  day: 1,
  players: [],
  checkpoints: [],
  rulesMarkdown: '# rules',
  events: [],
};

describe('timeline', () => {
  it('appends event immutably', () => {
    const next = appendEvent(baseState, {
      kind: 'speech',
      title: '第一天 · 林澈发言',
      content: '我先听大家发言。',
      colorToken: 'speech',
    });

    expect(baseState.events).toHaveLength(0);
    expect(next.events).toHaveLength(1);
    expect(next.events[0].title).toBe('第一天 · 林澈发言');
  });

  it('creates checkpoint and rollback restores prior state', () => {
    const withEvent = appendEvent(baseState, {
      kind: 'phase',
      title: '第一夜开始',
      content: '夜幕降临。',
      colorToken: 'neutral',
    });
    const withCheckpoint = createCheckpoint(withEvent, '第一夜开始');
    const afterSpeech = appendEvent(withCheckpoint, {
      kind: 'speech',
      title: '第一天 · 夏眠发言',
      content: '我怀疑林澈。',
      colorToken: 'speech',
    });

    const restored = rollbackToCheckpoint(afterSpeech, withCheckpoint.checkpoints[0].id);
    expect(restored.events).toHaveLength(1);
    expect(restored.phase).toBe('night');
    expect(restored.checkpoints).toHaveLength(1);
  });
});
```

- [ ] **Step 2: Run test to verify failure**

Run:

```powershell
npm run test -- src/game/timeline/timeline.test.ts
```

Expected: FAIL because `timeline.ts` does not exist.

- [ ] **Step 3: Implement timeline helpers**

Create `src/game/timeline/timeline.ts`:

```ts
import type { EventKind, GameEvent, GameState } from '../types';

interface AppendEventInput {
  kind: EventKind;
  title: string;
  content: string;
  colorToken: GameEvent['colorToken'];
  playerId?: string;
  targetId?: string;
}

function cloneStateForCheckpoint(state: GameState) {
  return {
    phase: state.phase,
    day: state.day,
    players: structuredClone(state.players),
    events: structuredClone(state.events),
  };
}

export function appendEvent(state: GameState, input: AppendEventInput): GameState {
  const event: GameEvent = {
    id: crypto.randomUUID(),
    phase: state.phase,
    day: state.day,
    createdAt: Date.now(),
    ...input,
  };

  return {
    ...state,
    events: [...state.events, event],
  };
}

export function createCheckpoint(state: GameState, label: string): GameState {
  return {
    ...state,
    checkpoints: [
      ...state.checkpoints,
      {
        id: crypto.randomUUID(),
        label,
        phase: state.phase,
        day: state.day,
        eventIndex: state.events.length,
        state: cloneStateForCheckpoint(state),
      },
    ],
  };
}

export function rollbackToCheckpoint(state: GameState, checkpointId: string): GameState {
  const checkpoint = state.checkpoints.find((item) => item.id === checkpointId);
  if (!checkpoint) {
    throw new Error(`Checkpoint not found: ${checkpointId}`);
  }

  return {
    ...state,
    phase: checkpoint.state.phase,
    day: checkpoint.state.day,
    players: structuredClone(checkpoint.state.players),
    events: structuredClone(checkpoint.state.events),
    checkpoints: state.checkpoints.filter((item) => item.eventIndex <= checkpoint.eventIndex),
  };
}
```

- [ ] **Step 4: Verify**

Run:

```powershell
npm run test -- src/game/timeline/timeline.test.ts
npm run typecheck
```

Expected: PASS.

- [ ] **Step 5: Commit**

Run:

```powershell
git add src/game/timeline
git commit -m "实现事件时间线与回溯"
```

Expected: commit succeeds.

---

### Task 6: LLM Types, JSON Parser, And Adapters

**Files:**
- Create: `src/llm/types.ts`
- Create: `src/llm/parseLlmJson.ts`
- Create: `src/llm/adapters/openaiCompatible.ts`
- Create: `src/llm/adapters/anthropicClaude.ts`
- Create: `src/llm/adapters/llmAdapters.test.ts`

- [ ] **Step 1: Write failing adapter tests**

Create `src/llm/adapters/llmAdapters.test.ts`:

```ts
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AnthropicClaudeAdapter } from './anthropicClaude';
import { OpenAICompatibleAdapter } from './openaiCompatible';

const request = {
  system: '规则',
  user: '请发言',
  temperature: 0.7,
};

describe('LLM adapters', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('calls OpenAI-compatible chat completions', async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      json: async () => ({ choices: [{ message: { content: '{"speech":"我先发言。"}' } }] }),
    }));
    vi.stubGlobal('fetch', fetchMock);

    const adapter = new OpenAICompatibleAdapter({
      apiKey: 'key',
      baseUrl: 'https://example.test',
      model: 'model-a',
    });

    await expect(adapter.generate(request)).resolves.toEqual({ speech: '我先发言。' });
    expect(fetchMock).toHaveBeenCalledWith(
      'https://example.test/v1/chat/completions',
      expect.objectContaining({ method: 'POST' }),
    );
  });

  it('calls Anthropic Messages API style endpoint', async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      json: async () => ({ content: [{ type: 'text', text: '{"speech":"我会继续听。"}' }] }),
    }));
    vi.stubGlobal('fetch', fetchMock);

    const adapter = new AnthropicClaudeAdapter({
      apiKey: 'key',
      baseUrl: 'https://anthropic.test',
      model: 'claude-test',
      anthropicVersion: '2023-06-01',
    });

    await expect(adapter.generate(request)).resolves.toEqual({ speech: '我会继续听。' });
    expect(fetchMock).toHaveBeenCalledWith(
      'https://anthropic.test/v1/messages',
      expect.objectContaining({ method: 'POST' }),
    );
  });
});
```

- [ ] **Step 2: Run test to verify failure**

Run:

```powershell
npm run test -- src/llm/adapters/llmAdapters.test.ts
```

Expected: FAIL because adapter files do not exist.

- [ ] **Step 3: Add LLM shared types and parser**

Create `src/llm/types.ts`:

```ts
export interface LlmGenerateRequest {
  system: string;
  user: string;
  temperature: number;
}

export interface LlmClient {
  generate(request: LlmGenerateRequest): Promise<Record<string, unknown>>;
}

export interface OpenAICompatibleConfig {
  apiKey: string;
  baseUrl: string;
  model: string;
}

export interface AnthropicClaudeConfig {
  apiKey: string;
  baseUrl: string;
  model: string;
  anthropicVersion: string;
}
```

Create `src/llm/parseLlmJson.ts`:

```ts
export function parseLlmJson(text: string): Record<string, unknown> {
  const trimmed = text.trim();
  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/);
  const jsonText = fenced ? fenced[1] : trimmed;

  const parsed = JSON.parse(jsonText) as unknown;
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('LLM response must be a JSON object');
  }
  return parsed as Record<string, unknown>;
}
```

- [ ] **Step 4: Add OpenAI-compatible adapter**

Create `src/llm/adapters/openaiCompatible.ts`:

```ts
import { parseLlmJson } from '../parseLlmJson';
import type { LlmClient, LlmGenerateRequest, OpenAICompatibleConfig } from '../types';

export class OpenAICompatibleAdapter implements LlmClient {
  constructor(private readonly config: OpenAICompatibleConfig) {}

  async generate(request: LlmGenerateRequest): Promise<Record<string, unknown>> {
    const response = await fetch(`${this.config.baseUrl.replace(/\/$/, '')}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.config.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: this.config.model,
        temperature: request.temperature,
        messages: [
          { role: 'system', content: request.system },
          { role: 'user', content: request.user },
        ],
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI-compatible request failed: ${response.status}`);
    }

    const data = (await response.json()) as { choices?: Array<{ message?: { content?: string } }> };
    const content = data.choices?.[0]?.message?.content;
    if (!content) {
      throw new Error('OpenAI-compatible response did not include message content');
    }
    return parseLlmJson(content);
  }
}
```

- [ ] **Step 5: Add Anthropic adapter**

Create `src/llm/adapters/anthropicClaude.ts`:

```ts
import { parseLlmJson } from '../parseLlmJson';
import type { AnthropicClaudeConfig, LlmClient, LlmGenerateRequest } from '../types';

export class AnthropicClaudeAdapter implements LlmClient {
  constructor(private readonly config: AnthropicClaudeConfig) {}

  async generate(request: LlmGenerateRequest): Promise<Record<string, unknown>> {
    const response = await fetch(`${this.config.baseUrl.replace(/\/$/, '')}/v1/messages`, {
      method: 'POST',
      headers: {
        'x-api-key': this.config.apiKey,
        'anthropic-version': this.config.anthropicVersion,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: this.config.model,
        max_tokens: 1024,
        temperature: request.temperature,
        system: request.system,
        messages: [{ role: 'user', content: request.user }],
      }),
    });

    if (!response.ok) {
      throw new Error(`Anthropic request failed: ${response.status}`);
    }

    const data = (await response.json()) as { content?: Array<{ type: string; text?: string }> };
    const text = data.content?.find((block) => block.type === 'text')?.text;
    if (!text) {
      throw new Error('Anthropic response did not include text content');
    }
    return parseLlmJson(text);
  }
}
```

- [ ] **Step 6: Verify**

Run:

```powershell
npm run test -- src/llm/adapters/llmAdapters.test.ts
npm run typecheck
```

Expected: PASS.

- [ ] **Step 7: Commit**

Run:

```powershell
git add src/llm
git commit -m "添加 LLM 适配器"
```

Expected: commit succeeds.

---

### Task 7: Prompt Builders And Fake Engine Flow

**Files:**
- Create: `src/llm/prompts/buildPlayerPrompt.ts`
- Create: `src/llm/prompts/buildJudgePrompt.ts`
- Create: `src/game/engine/gameEngine.ts`
- Create: `src/game/engine/gameEngine.test.ts`

- [ ] **Step 1: Write failing engine test with fake LLM**

Create `src/game/engine/gameEngine.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { createGame } from '../setup/createGame';
import type { Persona } from '../types';
import type { LlmClient } from '../../llm/types';
import { runOneSpeech } from './gameEngine';

const fakeLlm: LlmClient = {
  async generate() {
    return { speech: '我先听完大家的发言，再判断谁在转移焦点。' };
  },
};

const personas: Persona[] = Array.from({ length: 6 }, (_, index) => ({
  id: `p${index}`,
  name: `玩家${index + 1}`,
  markdown: `# 玩家${index + 1}`,
}));

describe('gameEngine', () => {
  it('adds first-person speech event for a player', async () => {
    const game = createGame({ playerCount: 6, personas, rulesMarkdown: '# rules', seed: 1 });
    const next = await runOneSpeech(game, game.players[0].id, fakeLlm);

    expect(next.events.at(-1)).toMatchObject({
      kind: 'speech',
      title: '第一天 · 玩家1发言',
      content: '我先听完大家的发言，再判断谁在转移焦点。',
      colorToken: 'speech',
    });
  });
});
```

- [ ] **Step 2: Run test to verify failure**

Run:

```powershell
npm run test -- src/game/engine/gameEngine.test.ts
```

Expected: FAIL because `gameEngine.ts` does not exist.

- [ ] **Step 3: Add prompt builders**

Create `src/llm/prompts/buildPlayerPrompt.ts`:

```ts
import type { GameState, Player } from '../../game/types';

export function buildPlayerSpeechPrompt(state: GameState, player: Player) {
  return {
    system: [
      '你正在扮演一名狼人杀 AI 玩家。',
      '你必须遵守规则总纲和你的角色信息。',
      '你必须用第一人称发言。',
      '你不能泄露自己按当前视角不该知道的信息。',
      '你必须只输出 JSON 对象，格式为 {"speech":"你的第一人称发言"}。',
    ].join('\n'),
    user: [
      `规则总纲：\n${state.rulesMarkdown}`,
      `你的名字：${player.name}`,
      `你的身份：${player.role}`,
      `你的私有记忆：${player.privateMemory.join('\n') || '暂无'}`,
      `当前阶段：第 ${state.day} 天发言阶段`,
      `公开事件：${state.events.map((event) => `${event.title}：${event.content}`).join('\n')}`,
    ].join('\n\n'),
    temperature: 0.7,
  };
}
```

Create `src/llm/prompts/buildJudgePrompt.ts`:

```ts
import type { GameState } from '../../game/types';

export function buildJudgePrompt(state: GameState) {
  return {
    system: [
      '你是 AI 狼人杀赛后评审。',
      '你需要按表演评分、逻辑评分、游戏操作评分评价每位玩家。',
      '你必须只输出 JSON 对象。',
    ].join('\n'),
    user: [
      `完整事件：${state.events.map((event) => `${event.title}：${event.content}`).join('\n')}`,
      `玩家：${state.players.map((player) => `${player.name} ${player.role} ${player.status}`).join('\n')}`,
      '输出格式：{"players":[{"playerName":"林澈","performance":8,"logic":7,"operation":8,"comment":"评价","tags":["标签"]}],"summary":"总评"}',
    ].join('\n\n'),
    temperature: 0.4,
  };
}
```

- [ ] **Step 4: Add engine speech implementation**

Create `src/game/engine/gameEngine.ts`:

```ts
import type { LlmClient } from '../../llm/types';
import { buildPlayerSpeechPrompt } from '../../llm/prompts/buildPlayerPrompt';
import { appendEvent } from '../timeline/timeline';
import type { GameState } from '../types';

function dayLabel(day: number): string {
  return `第${day === 1 ? '一' : day === 2 ? '二' : day}天`;
}

export async function runOneSpeech(
  state: GameState,
  playerId: string,
  llm: LlmClient,
): Promise<GameState> {
  const player = state.players.find((item) => item.id === playerId);
  if (!player) {
    throw new Error(`Player not found: ${playerId}`);
  }

  const response = await llm.generate(buildPlayerSpeechPrompt(state, player));
  const speech = response.speech;
  if (typeof speech !== 'string' || speech.trim().length === 0) {
    throw new Error('LLM speech response must include a non-empty speech string');
  }

  return appendEvent(
    { ...state, phase: 'day-discussion' },
    {
      kind: 'speech',
      title: `${dayLabel(state.day)} · ${player.name}发言`,
      content: speech.trim(),
      colorToken: 'speech',
      playerId: player.id,
    },
  );
}
```

- [ ] **Step 5: Verify**

Run:

```powershell
npm run test -- src/game/engine/gameEngine.test.ts
npm run typecheck
```

Expected: PASS.

- [ ] **Step 6: Commit**

Run:

```powershell
git add src/llm/prompts src/game/engine
git commit -m "实现 AI 发言引擎"
```

Expected: commit succeeds.

---

### Task 8: Room UI And Status Feed

**Files:**
- Create: `src/components/room/RoomView.tsx`
- Create: `src/components/status-feed/StatusFeed.tsx`
- Create: `src/components/controls/GameControls.tsx`
- Modify: `src/app/App.tsx`
- Modify: `src/app/App.css`
- Create: `src/app/App.test.tsx`

- [ ] **Step 1: Write failing UI test**

Create `src/app/App.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { App } from './App';

describe('App', () => {
  it('renders fixed room layout with view switch button and status feed', () => {
    render(<App />);
    expect(screen.getByRole('button', { name: '切换到上帝视角' })).toBeInTheDocument();
    expect(screen.getByLabelText('圆桌座位区')).toBeInTheDocument();
    expect(screen.getByLabelText('游戏消息状态区')).toBeInTheDocument();
    expect(screen.getByText('第二天 · 叶岚发言')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify failure**

Run:

```powershell
npm run test -- src/app/App.test.tsx
```

Expected: FAIL because components are not implemented.

- [ ] **Step 3: Add controls component**

Create `src/components/controls/GameControls.tsx`:

```tsx
import type { ViewMode } from '../../game/types';

interface GameControlsProps {
  viewMode: ViewMode;
  onToggleView: () => void;
}

export function GameControls({ viewMode, onToggleView }: GameControlsProps) {
  return (
    <button className="view-button" type="button" onClick={onToggleView}>
      {viewMode === 'audience' ? '切换到上帝视角' : '切换到观众视角'}
    </button>
  );
}
```

- [ ] **Step 4: Add room component**

Create `src/components/room/RoomView.tsx`:

```tsx
import type { Player } from '../../game/types';

interface RoomViewProps {
  players: Player[];
  speakingPlayerId?: string;
}

export function RoomView({ players, speakingPlayerId }: RoomViewProps) {
  const step = 360 / Math.max(players.length, 1);

  return (
    <section className="table-area" aria-label="圆桌座位区">
      <div className="round-table" aria-hidden="true">
        <div className="table-center">
          <div>
            <strong>第二天</strong>
            <span>{players.find((player) => player.id === speakingPlayerId)?.name ?? '等待发言'}发言中</span>
          </div>
        </div>
      </div>

      {players.map((player, index) => (
        <div
          className={[
            'seat',
            player.id === speakingPlayerId ? 'speaking' : '',
            player.status === 'dead' ? 'dead' : '',
          ].join(' ')}
          key={player.id}
          style={{ '--angle': `${index * step}deg` } as React.CSSProperties}
        >
          <div className="seat-name">{player.name}</div>
          <div className="seat-status">{player.status === 'alive' ? '存活' : '死亡'}</div>
        </div>
      ))}
    </section>
  );
}
```

- [ ] **Step 5: Add status feed component**

Create `src/components/status-feed/StatusFeed.tsx`:

```tsx
import type { GameEvent } from '../../game/types';

interface StatusFeedProps {
  events: GameEvent[];
}

export function StatusFeed({ events }: StatusFeedProps) {
  return (
    <aside className="status-area" aria-label="游戏消息状态区">
      <header className="status-header">
        <h2>游戏消息</h2>
        <p>右侧记录公开发言和局内状态变化，消息列表在面板内部滚动。</p>
      </header>
      <div className="message-list">
        {events.map((event) => (
          <article className={`message ${event.colorToken}`} key={event.id}>
            <span className="time">{event.title}</span>
            {event.content}
          </article>
        ))}
      </div>
    </aside>
  );
}
```

- [ ] **Step 6: Wire App with static preview state**

Modify `src/app/App.tsx`:

```tsx
import { useCallback, useEffect, useState } from 'react';
import { GameControls } from '../components/controls/GameControls';
import { RoomView } from '../components/room/RoomView';
import { StatusFeed } from '../components/status-feed/StatusFeed';
import type { GameEvent, Player, ViewMode } from '../game/types';

const previewPlayers: Player[] = [
  { id: 'lin-che', name: '林澈', personaId: 'lin-che', role: 'villager', camp: 'good', status: 'alive', privateMemory: [] },
  { id: 'xia-mian', name: '夏眠', personaId: 'xia-mian', role: 'werewolf', camp: 'werewolf', status: 'alive', privateMemory: [] },
  { id: 'gu-heng', name: '顾衡', personaId: 'gu-heng', role: 'seer', camp: 'good', status: 'dead', privateMemory: [] },
  { id: 'ye-lan', name: '叶岚', personaId: 'ye-lan', role: 'villager', camp: 'good', status: 'alive', privateMemory: [] },
  { id: 'qi-ye', name: '祁野', personaId: 'qi-ye', role: 'werewolf', camp: 'werewolf', status: 'alive', privateMemory: [] },
  { id: 'wen-xu', name: '温序', personaId: 'wen-xu', role: 'witch', camp: 'good', status: 'alive', privateMemory: [] },
  { id: 'shen-heng', name: '沈珩', personaId: 'shen-heng', role: 'hunter', camp: 'good', status: 'alive', privateMemory: [] },
  { id: 'xu-zhao', name: '许照', personaId: 'xu-zhao', role: 'villager', camp: 'good', status: 'alive', privateMemory: [] },
  { id: 'wen-xi', name: '闻溪', personaId: 'wen-xi', role: 'villager', camp: 'good', status: 'alive', privateMemory: [] },
];

const previewEvents: GameEvent[] = [
  { id: 'e1', kind: 'speech', phase: 'day-discussion', day: 2, title: '第二天 · 叶岚发言', content: '我不认同夏眠刚才的逻辑。他一直在把票型问题推给祁野。', colorToken: 'speech', playerId: 'ye-lan', createdAt: 1 },
  { id: 'e2', kind: 'kill', phase: 'night', day: 2, title: '第二夜 · 狼人袭击', content: '狼人杀死了顾衡。', colorToken: 'kill', targetId: 'gu-heng', createdAt: 2 },
  { id: 'e3', kind: 'revive', phase: 'night', day: 2, title: '第二夜 · 女巫救人', content: '女巫使用解药，顾衡起死回生。', colorToken: 'revive', targetId: 'gu-heng', createdAt: 3 },
  { id: 'e4', kind: 'protect', phase: 'night', day: 2, title: '第二夜 · 守卫保护', content: '守卫保护了夏眠。', colorToken: 'protect', targetId: 'xia-mian', createdAt: 4 },
];

export function App() {
  const [viewMode, setViewMode] = useState<ViewMode>('audience');
  const toggleView = useCallback(() => {
    setViewMode((current) => (current === 'audience' ? 'god' : 'audience'));
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (event.code !== 'Space' || target?.closest('button,input,textarea,[contenteditable="true"]')) {
        return;
      }
      event.preventDefault();
      toggleView();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [toggleView]);

  return (
    <main className="game-layout" data-view-mode={viewMode}>
      <section className="game-main">
        <header className="top-bar">
          <div className="game-title">
            <strong>AI 狼人杀</strong>
            <span>第二天 · 发言阶段 · 9 人局</span>
          </div>
          <GameControls viewMode={viewMode} onToggleView={toggleView} />
        </header>
        <RoomView players={previewPlayers} speakingPlayerId="ye-lan" />
      </section>
      <StatusFeed events={previewEvents} />
    </main>
  );
}
```

- [ ] **Step 7: Replace CSS with approved layout**

Replace `src/app/App.css` with:

```css
:root {
  color: #ffffff;
  background: #12141c;
  font-family: "Microsoft YaHei", "Segoe UI", system-ui, sans-serif;
  font-synthesis: none;
  text-rendering: optimizeLegibility;
}

* {
  box-sizing: border-box;
}

html,
body,
#root {
  width: 100%;
  height: 100%;
  margin: 0;
  overflow: hidden;
}

button {
  font: inherit;
}

.game-layout {
  width: 100vw;
  height: 100vh;
  display: grid;
  grid-template-columns: 5fr 2fr;
  overflow: hidden;
  background: #12141c;
}

.game-main {
  position: relative;
  min-width: 0;
  height: 100vh;
  overflow: hidden;
}

.table-area {
  position: relative;
  min-width: 0;
  height: 100vh;
  overflow: hidden;
  background:
    radial-gradient(circle at 50% 42%, rgba(245, 211, 147, 0.16), transparent 28%),
    radial-gradient(circle at 50% 46%, rgba(0, 0, 0, 0.08), transparent 48%),
    linear-gradient(135deg, #191b27 0%, #25283a 45%, #171922 100%);
}

.top-bar {
  position: absolute;
  left: 28px;
  top: 22px;
  right: 28px;
  height: 46px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  z-index: 3;
}

.game-title {
  display: flex;
  align-items: baseline;
  gap: 14px;
  min-width: 0;
}

.game-title strong {
  font-size: 22px;
  letter-spacing: 0;
}

.game-title span {
  color: rgba(255, 255, 255, 0.74);
  font-size: 13px;
  white-space: nowrap;
}

.view-button {
  appearance: none;
  border: 1px solid rgba(255, 255, 255, 0.18);
  border-radius: 8px;
  padding: 9px 13px;
  color: rgba(255, 255, 255, 0.88);
  background: rgba(255, 255, 255, 0.07);
  font-size: 13px;
  cursor: pointer;
}

.view-button:hover {
  background: rgba(255, 255, 255, 0.12);
}

.round-table {
  position: absolute;
  left: 50%;
  top: 54%;
  width: min(42vw, 58vh);
  aspect-ratio: 1;
  transform: translate(-50%, -50%);
  border-radius: 50%;
  background:
    radial-gradient(circle at 50% 50%, #9a7145 0 29%, #745236 30% 55%, #3b2a20 56% 70%, #211915 71%);
  box-shadow:
    0 32px 70px rgba(0, 0, 0, 0.38),
    inset 0 0 0 10px rgba(255, 255, 255, 0.05),
    inset 0 0 42px rgba(0, 0, 0, 0.3);
}

.table-center {
  position: absolute;
  inset: 31%;
  border-radius: 50%;
  display: grid;
  place-items: center;
  text-align: center;
  color: rgba(255, 255, 255, 0.84);
  background: rgba(20, 17, 14, 0.38);
  border: 1px solid rgba(255, 255, 255, 0.12);
}

.table-center strong {
  display: block;
  font-size: clamp(18px, 2vw, 30px);
  margin-bottom: 8px;
  letter-spacing: 0;
}

.table-center span {
  font-size: clamp(11px, 1vw, 14px);
  color: rgba(255, 255, 255, 0.66);
}

.seat {
  position: absolute;
  left: 50%;
  top: 54%;
  width: clamp(68px, 5.4vw, 88px);
  height: clamp(68px, 5.4vw, 88px);
  transform:
    rotate(var(--angle))
    translate(calc(min(25vw, 34vh) * -1))
    rotate(calc(var(--angle) * -1))
    translate(-50%, -50%);
  border-radius: 50%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  background: linear-gradient(145deg, #f0d9ae, #c89d65);
  color: #261b12;
  border: 4px solid rgba(255, 255, 255, 0.76);
  box-shadow:
    0 12px 24px rgba(0, 0, 0, 0.36),
    inset 0 0 0 1px rgba(255, 255, 255, 0.5);
}

.seat.speaking {
  outline: 4px solid #ffffff;
  outline-offset: 5px;
}

.seat.dead {
  filter: grayscale(0.78);
  opacity: 0.62;
}

.seat-name {
  max-width: 82%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: clamp(14px, 1.16vw, 18px);
  font-weight: 800;
  line-height: 1.05;
}

.seat-status {
  font-size: 10px;
  color: rgba(38, 27, 18, 0.72);
}

.status-area {
  min-width: 320px;
  height: 100vh;
  display: grid;
  grid-template-rows: auto 1fr;
  overflow: hidden;
  background: #181b24;
  border-left: 1px solid rgba(255, 255, 255, 0.1);
}

.status-header {
  padding: 20px 22px 16px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.status-header h2 {
  margin: 0 0 8px;
  font-size: 20px;
  letter-spacing: 0;
}

.status-header p {
  margin: 0;
  color: rgba(255, 255, 255, 0.64);
  font-size: 13px;
  line-height: 1.5;
}

.message-list {
  min-height: 0;
  overflow-y: auto;
  padding: 16px 18px 20px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  scrollbar-width: thin;
}

.message {
  border-radius: 8px;
  padding: 12px 13px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  background: rgba(255, 255, 255, 0.06);
  font-size: 14px;
  line-height: 1.5;
}

.message .time {
  display: block;
  margin-bottom: 5px;
  color: rgba(255, 255, 255, 0.48);
  font-size: 11px;
}

.message.kill {
  color: #db3444;
  border-color: rgba(219, 52, 68, 0.42);
  background: rgba(219, 52, 68, 0.1);
}

.message.revive {
  color: #45db34;
  border-color: rgba(69, 219, 52, 0.42);
  background: rgba(69, 219, 52, 0.1);
}

.message.protect {
  color: #f6e94d;
  border-color: rgba(246, 233, 77, 0.44);
  background: rgba(246, 233, 77, 0.1);
}

.message.speech {
  color: #ffffff;
  border-color: rgba(255, 255, 255, 0.18);
  background: rgba(255, 255, 255, 0.07);
}

@media (max-width: 1100px) {
  .game-layout {
    grid-template-columns: minmax(0, 5fr) minmax(280px, 2fr);
  }

  .round-table {
    width: min(46vw, 52vh);
  }

  .seat {
    width: clamp(62px, 6vw, 78px);
    height: clamp(62px, 6vw, 78px);
    transform:
      rotate(var(--angle))
      translate(calc(min(28vw, 31vh) * -1))
      rotate(calc(var(--angle) * -1))
      translate(-50%, -50%);
  }
}
```

- [ ] **Step 8: Verify**

Run:

```powershell
npm run test -- src/app/App.test.tsx
npm run typecheck
```

Expected: PASS.

- [ ] **Step 9: Commit**

Run:

```powershell
git add src/app src/components
git commit -m "实现圆桌观战主界面"
```

Expected: commit succeeds.

---

### Task 9: GSAP Motion Layer

**Files:**
- Create: `src/motion/roomAnimations.ts`
- Create: `src/motion/messageAnimations.ts`
- Modify: `src/components/room/RoomView.tsx`
- Modify: `src/components/status-feed/StatusFeed.tsx`

- [ ] **Step 1: Add room animation helpers**

Create `src/motion/roomAnimations.ts`:

```ts
import gsap from 'gsap';

export function animateSeatsIn(elements: Element[]) {
  return gsap.fromTo(
    elements,
    { autoAlpha: 0, scale: 0.82 },
    { autoAlpha: 1, scale: 1, duration: 0.36, stagger: 0.04, ease: 'power2.out' },
  );
}

export function animateSpeakingSeat(element: Element | null) {
  if (!element) return undefined;
  return gsap.to(element, {
    scale: 1.06,
    duration: 0.9,
    repeat: -1,
    yoyo: true,
    ease: 'sine.inOut',
  });
}
```

- [ ] **Step 2: Add message animation helpers**

Create `src/motion/messageAnimations.ts`:

```ts
import gsap from 'gsap';
import type { GameEvent } from '../game/types';

export function animateMessageIn(element: Element, colorToken: GameEvent['colorToken']) {
  const timeline = gsap.timeline();
  timeline.fromTo(element, { autoAlpha: 0, y: 10 }, { autoAlpha: 1, y: 0, duration: 0.24 });

  if (colorToken === 'kill') {
    timeline.fromTo(element, { boxShadow: '0 0 0 rgba(219, 52, 68, 0)' }, { boxShadow: '0 0 22px rgba(219, 52, 68, 0.35)', duration: 0.18, yoyo: true, repeat: 1 }, 0);
  }
  if (colorToken === 'revive') {
    timeline.fromTo(element, { boxShadow: '0 0 0 rgba(69, 219, 52, 0)' }, { boxShadow: '0 0 22px rgba(69, 219, 52, 0.32)', duration: 0.22, yoyo: true, repeat: 1 }, 0);
  }
  if (colorToken === 'protect') {
    timeline.fromTo(element, { boxShadow: '0 0 0 rgba(246, 233, 77, 0)' }, { boxShadow: '0 0 22px rgba(246, 233, 77, 0.28)', duration: 0.22, yoyo: true, repeat: 1 }, 0);
  }

  return timeline;
}
```

- [ ] **Step 3: Wire GSAP in RoomView**

Modify `src/components/room/RoomView.tsx` to use refs and clean animations:

```tsx
import { useGSAP } from '@gsap/react';
import { useRef } from 'react';
import { animateSeatsIn, animateSpeakingSeat } from '../../motion/roomAnimations';
import type { Player } from '../../game/types';

interface RoomViewProps {
  players: Player[];
  speakingPlayerId?: string;
}

export function RoomView({ players, speakingPlayerId }: RoomViewProps) {
  const rootRef = useRef<HTMLElement>(null);
  const step = 360 / Math.max(players.length, 1);

  useGSAP(
    () => {
      const seats = Array.from(rootRef.current?.querySelectorAll('.seat') ?? []);
      const enterTween = animateSeatsIn(seats);
      const speakingTween = animateSpeakingSeat(rootRef.current?.querySelector('.seat.speaking') ?? null);
      return () => {
        enterTween.kill();
        speakingTween?.kill();
      };
    },
    { scope: rootRef, dependencies: [players.length, speakingPlayerId] },
  );

  return (
    <section className="table-area" aria-label="圆桌座位区" ref={rootRef}>
      <div className="round-table" aria-hidden="true">
        <div className="table-center">
          <div>
            <strong>第二天</strong>
            <span>{players.find((player) => player.id === speakingPlayerId)?.name ?? '等待发言'}发言中</span>
          </div>
        </div>
      </div>
      {players.map((player, index) => (
        <div className={['seat', player.id === speakingPlayerId ? 'speaking' : '', player.status === 'dead' ? 'dead' : ''].join(' ')} key={player.id} style={{ '--angle': `${index * step}deg` } as React.CSSProperties}>
          <div className="seat-name">{player.name}</div>
          <div className="seat-status">{player.status === 'alive' ? '存活' : '死亡'}</div>
        </div>
      ))}
    </section>
  );
}
```

- [ ] **Step 4: Wire GSAP in StatusFeed**

Modify `src/components/status-feed/StatusFeed.tsx`:

```tsx
import { useGSAP } from '@gsap/react';
import { useRef } from 'react';
import type { GameEvent } from '../../game/types';
import { animateMessageIn } from '../../motion/messageAnimations';

interface StatusFeedProps {
  events: GameEvent[];
}

export function StatusFeed({ events }: StatusFeedProps) {
  const listRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const last = listRef.current?.lastElementChild;
      if (!last || events.length === 0) return;
      const animation = animateMessageIn(last, events.at(-1)?.colorToken ?? 'neutral');
      return () => animation?.kill();
    },
    { scope: listRef, dependencies: [events.length] },
  );

  return (
    <aside className="status-area" aria-label="游戏消息状态区">
      <header className="status-header">
        <h2>游戏消息</h2>
        <p>右侧记录公开发言和局内状态变化，消息列表在面板内部滚动。</p>
      </header>
      <div className="message-list" ref={listRef}>
        {events.map((event) => (
          <article className={`message ${event.colorToken}`} key={event.id}>
            <span className="time">{event.title}</span>
            {event.content}
          </article>
        ))}
      </div>
    </aside>
  );
}
```

- [ ] **Step 5: Verify**

Run:

```powershell
npm run test -- src/app/App.test.tsx
npm run typecheck
```

Expected: PASS.

- [ ] **Step 6: Commit**

Run:

```powershell
git add src/motion src/components
git commit -m "添加圆桌与消息动画"
```

Expected: commit succeeds.

---

### Task 10: Settlement Review And Cleanup

**Files:**
- Create: `src/game/settlement/settlement.ts`
- Create: `src/game/settlement/settlement.test.ts`
- Create: `src/components/settlement/SettlementView.tsx`
- Modify: `src/app/App.tsx`

- [ ] **Step 1: Write failing settlement tests**

Create `src/game/settlement/settlement.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { normalizeSettlementReport } from './settlement';

describe('normalizeSettlementReport', () => {
  it('normalizes judge JSON into stable report shape', () => {
    const report = normalizeSettlementReport({
      players: [
        {
          playerName: '叶岚',
          performance: 8,
          logic: 7,
          operation: 6,
          comment: '进攻性强，但投票略急。',
          tags: ['最佳表演'],
        },
      ],
      summary: '好人阵营获胜。',
    });

    expect(report.players[0].scores).toEqual({ performance: 8, logic: 7, operation: 6 });
    expect(report.summary).toBe('好人阵营获胜。');
  });

  it('rejects missing player reviews', () => {
    expect(() => normalizeSettlementReport({ summary: 'empty' })).toThrow('Settlement report must include players');
  });
});
```

- [ ] **Step 2: Run test to verify failure**

Run:

```powershell
npm run test -- src/game/settlement/settlement.test.ts
```

Expected: FAIL because `settlement.ts` does not exist.

- [ ] **Step 3: Implement settlement normalization**

Create `src/game/settlement/settlement.ts`:

```ts
export interface PlayerReview {
  playerName: string;
  scores: {
    performance: number;
    logic: number;
    operation: number;
  };
  comment: string;
  tags: string[];
}

export interface SettlementReport {
  players: PlayerReview[];
  summary: string;
}

function score(value: unknown): number {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    throw new Error('Settlement scores must be numbers');
  }
  return Math.max(0, Math.min(10, value));
}

export function normalizeSettlementReport(raw: Record<string, unknown>): SettlementReport {
  if (!Array.isArray(raw.players)) {
    throw new Error('Settlement report must include players');
  }

  return {
    summary: typeof raw.summary === 'string' ? raw.summary : '本局暂无总评。',
    players: raw.players.map((item) => {
      const record = item as Record<string, unknown>;
      return {
        playerName: String(record.playerName),
        scores: {
          performance: score(record.performance),
          logic: score(record.logic),
          operation: score(record.operation),
        },
        comment: typeof record.comment === 'string' ? record.comment : '暂无评价。',
        tags: Array.isArray(record.tags) ? record.tags.map(String) : [],
      };
    }),
  };
}
```

- [ ] **Step 4: Add settlement component**

Create `src/components/settlement/SettlementView.tsx`:

```tsx
import type { SettlementReport } from '../../game/settlement/settlement';

interface SettlementViewProps {
  report: SettlementReport;
  onReturnLobby: () => void;
}

export function SettlementView({ report, onReturnLobby }: SettlementViewProps) {
  return (
    <main className="settlement-page">
      <header className="settlement-header">
        <h1>赛后复盘</h1>
        <button type="button" onClick={onReturnLobby}>返回大厅</button>
      </header>
      <p>{report.summary}</p>
      <section className="settlement-grid">
        {report.players.map((player) => (
          <article className="settlement-card" key={player.playerName}>
            <h2>{player.playerName}</h2>
            <p>表演评分：{player.scores.performance}/10</p>
            <p>逻辑评分：{player.scores.logic}/10</p>
            <p>游戏操作评分：{player.scores.operation}/10</p>
            <p>{player.comment}</p>
            <p>{player.tags.join('、')}</p>
          </article>
        ))}
      </section>
    </main>
  );
}
```

- [ ] **Step 5: Add cleanup behavior in App**

Modify `src/app/App.tsx` to introduce explicit runtime state:

```tsx
import type { SettlementReport } from '../game/settlement/settlement';
import type { GameState } from '../game/types';

const [gameState, setGameState] = useState<GameState | null>(null);
const [settlementReport, setSettlementReport] = useState<SettlementReport | null>(null);
```

Add the reset function:

```tsx
function resetToLobby() {
  setViewMode('audience');
  setGameState(null);
  setSettlementReport(null);
}
```

Render settlement before the room when a report exists:

```tsx
if (settlementReport) {
  return <SettlementView report={settlementReport} onReturnLobby={resetToLobby} />;
}
```

When the game creates or updates events, store them only inside `gameState`. Do not write `gameState`, event history, checkpoints, private memories, or `settlementReport` to `localStorage`, `IndexedDB`, or files.

- [ ] **Step 6: Verify**

Run:

```powershell
npm run test -- src/game/settlement/settlement.test.ts
npm run test -- src/app/App.test.tsx
npm run typecheck
```

Expected: PASS.

- [ ] **Step 7: Commit**

Run:

```powershell
git add src/game/settlement src/components/settlement src/app
git commit -m "添加赛后评分与清理流程"
```

Expected: commit succeeds.

---

### Task 11: Playwright Layout Verification And README

**Files:**
- Create: `tests/e2e/room-layout.spec.ts`
- Create: `README.md`
- Modify: `docs/superpowers/specs/2026-05-24-ai-werewolf-design.md`

- [ ] **Step 1: Install Playwright browser**

Run:

```powershell
npx playwright install chromium
```

Expected: Chromium browser is installed for Playwright.

- [ ] **Step 2: Add layout e2e test**

Create `tests/e2e/room-layout.spec.ts`:

```ts
import { expect, test } from '@playwright/test';

test('room layout stays within viewport and uses internal status scrolling', async ({ page }) => {
  await page.setViewportSize({ width: 1920, height: 1080 });
  await page.goto('/');

  await expect(page.getByLabel('圆桌座位区')).toBeVisible();
  await expect(page.getByLabel('游戏消息状态区')).toBeVisible();
  await expect(page.getByRole('button', { name: '切换到上帝视角' })).toBeVisible();

  const pageOverflow = await page.evaluate(() => ({
    body: document.body.scrollHeight,
    viewport: window.innerHeight,
    htmlOverflow: getComputedStyle(document.documentElement).overflow,
    bodyOverflow: getComputedStyle(document.body).overflow,
  }));

  expect(pageOverflow.body).toBeLessThanOrEqual(pageOverflow.viewport);
  expect(pageOverflow.htmlOverflow).toBe('hidden');
  expect(pageOverflow.bodyOverflow).toBe('hidden');

  const grid = await page.locator('.game-layout').evaluate((element) => {
    const style = getComputedStyle(element);
    return style.gridTemplateColumns;
  });
  expect(grid).not.toBe('');
});
```

- [ ] **Step 3: Add README**

Create `README.md`:

```markdown
# AI 狼人杀

本项目是一个本地运行的 AI 狼人杀观战游戏。用户选择 6-12 人后，观看多位 AI 玩家按照规则发言、推理、投票和行动。

## 本地运行

```powershell
npm install
Copy-Item .env.example .env.local
npm run dev
```

在 `.env.local` 中填写模型配置。

## 模型配置

支持 `openai-compatible` 和 `anthropic` 两类接口。API Key 会被 Vite 注入到本地浏览器代码中，因此本项目只适合个人本地使用，不适合公开部署。

## 修改人物设定

人物设定在 `public/personas/`。新增人物时，创建新的 `.md` 文件，并把文件名加入 `public/personas/index.json`。

## 修改规则

规则总纲在 `public/rules/werewolf-rules.md`。前端规则引擎和 LLM prompt 都以该文件为文字依据。

## 检查

```powershell
npm run typecheck
npm run test
npm run build
npm run test:e2e
```
```

- [ ] **Step 4: Update spec asset path note**

Modify `docs/superpowers/specs/2026-05-24-ai-werewolf-design.md` section 4 to mention:

```markdown
实现时通过 `public/personas/index.json` 枚举可加载的人设 Markdown 文件；新增人设需要同步更新该 manifest。
```

- [ ] **Step 5: Verify all checks**

Run:

```powershell
npm run typecheck
npm run test
npm run build
npm run test:e2e
```

Expected: all commands exit with code `0`.

- [ ] **Step 6: Commit**

Run:

```powershell
git add README.md tests docs
git commit -m "补充端到端验证与项目说明"
```

Expected: commit succeeds.

---

## Final Verification Before Handoff

- [ ] Run:

```powershell
git status --short --branch
npm run typecheck
npm run test
npm run build
npm run test:e2e
```

Expected:

- `git status` shows a clean working tree.
- TypeScript passes.
- Vitest passes.
- Vite build passes.
- Playwright passes in Chromium.

- [ ] Start dev server:

```powershell
npm run dev
```

Expected:

- Local URL prints, usually `http://localhost:5173/`.
- Main page displays fixed-height 5:2 room layout.
- Left side shows circular table and named seats.
- Right side shows colored game messages.
- View button toggles between audience and god labels.
- Pressing `Space` outside buttons toggles view without visible shortcut text.

## Official References

- Vite Getting Started: https://vite.dev/guide/
- Vite React plugin: https://github.com/vitejs/vite-plugin-react
- Vitest Getting Started: https://vitest.dev/guide/
- Playwright Getting Started: https://playwright.dev/docs/intro
- GSAP Installation: https://gsap.com/docs/v3/Installation/
- GSAP React: https://gsap.com/resources/React/
- OpenAI API Authentication: https://platform.openai.com/docs/api-reference/authentication
- Anthropic API Overview: https://docs.anthropic.com/en/api/overview
