# AI 狼人杀

一个本地运行的 React AI 狼人杀观战项目。目标是让用户选择 6-12 人局后，坐在电脑前观看多位 AI 玩家围绕身份、人设、规则和局势进行发言、推理、投票和夜间行动。

当前版本已经搭好观战房间界面和核心模块骨架，但还不是完整可自动跑完一局的成品。

## 当前进度

已经完成：

- React + TypeScript + Vite 前端项目
- 6-12 人角色配置
- 可编辑的人物设定 Markdown
- 可编辑的狼人杀规则 Markdown
- OpenAI-compatible 与 Anthropic/Claude 风格 LLM 适配器
- AI 玩家发言 prompt 构建
- 事件时间线与回溯底层能力
- 圆桌观战 UI、右侧消息流、视角切换按钮
- GSAP 圆桌与消息动画
- 赛后评分数据结构与展示组件

还没完成：

- 大厅选择人数
- 自动抽取人设并开局
- AI 玩家完整夜晚/白天流程推进
- 投票、放逐、胜负判断完整串联
- 真实调用 LLM 跑完整对局

## 本地运行

```powershell
npm install
npm run dev
```

浏览器打开 Vite 输出的本地地址即可。

## DeepSeek 测试配置

项目根目录下创建或编辑 `.env`：

```text
VITE_LLM_PROVIDER=openai-compatible

VITE_OPENAI_API_KEY=你的 DeepSeek API Key
VITE_OPENAI_BASE_URL=https://api.deepseek.com
VITE_OPENAI_MODEL=deepseek-v4-flash
VITE_OPENAI_API_STYLE=chat
```

DeepSeek V4 的 OpenAI-compatible Base URL 仍是 `https://api.deepseek.com`。如果之后要走 DeepSeek 的 Anthropic-compatible 格式，再把 provider 改成 `anthropic`，并使用 `https://api.deepseek.com/anthropic`。

注意：这是纯前端本地项目，`VITE_` 开头的环境变量会进入浏览器代码。只建议个人本地测试，不建议公开部署或把真实 Key 提交到仓库。

## 修改人物设定

人物设定放在：

```text
public/personas/
```

新增人物时：

1. 新建一个 `.md` 文件。
2. 在 `public/personas/index.json` 里加入这个文件名。

## 修改规则

规则总纲在：

```text
public/rules/werewolf-rules.md
```

后续前端规则引擎和 AI prompt 都会围绕这个文件继续完善。

## 常用命令

```powershell
npm run dev
npm run typecheck
npm run build
npm run preview
```

## 下一步开发

建议下一阶段先做：

1. 大厅页：选择 6-12 人并开始游戏。
2. 游戏状态接线：用真实 `createGame` 替换当前预览数据。
3. LLM 配置面板：允许用户在页面里选择 DeepSeek/OpenAI-compatible/Claude。
4. 自动流程推进：先实现一轮白天发言，再接夜晚行动。
