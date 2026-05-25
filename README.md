# AI 狼人杀

一个本地运行的 React AI 狼人杀观战项目。用户只需要选择 6-12 人局，就可以观看多位 AI 玩家围绕身份、人设、规则和局势进行夜晚行动、白天发言、投票放逐和赛后复盘。

项目是纯前端应用，不包含数据库和后端服务。规则、人物设定、LLM 配置都面向个人本地使用，方便 fork 后自己修改。

## 已实现功能

- React + TypeScript + Vite 前端项目
- 6-12 人局开局与角色分配
- 可编辑人物设定 Markdown
- 可编辑狼人杀规则 Markdown
- OpenAI-compatible 接口适配
- Anthropic/Claude 风格接口适配
- 狼人、预言家、女巫、守卫、猎人、村民等角色流程
- 夜晚行动、白天发言、投票、胜负判断、赛后评分
- 观众视角与上帝视角切换
- 夜晚公开日志隐藏玩家身份，只展示职业行动
- 对局速度设置：慢速、标准、快速
- 回退一步、回到上阶段、指定节点回溯
- GSAP 动画与圆桌观战 UI
- 赛后完整时间线导出
- 游戏结束或返回大厅后不持久保存日志和 AI 记忆

## 本地运行

```powershell
npm install
npm run dev
```

默认开发地址：

```text
http://localhost:5173/
```

常用命令：

```powershell
npm run dev
npm run typecheck
npm run build
npm run preview
```

## LLM 配置

复制 `.env.example` 为 `.env`，然后填入你自己的模型服务配置。

本项目不强制使用 DeepSeek。只要服务兼容以下两类接口之一即可：

- OpenAI-compatible Chat Completions
- Anthropic/Claude Messages

### OpenAI-compatible 示例

适用于 DeepSeek、OpenRouter、硅基流动、本地兼容网关等 OpenAI 格式服务。

```text
VITE_LLM_PROVIDER=openai-compatible
VITE_OPENAI_API_KEY=你的 API Key
VITE_OPENAI_BASE_URL=https://api.example.com
VITE_OPENAI_MODEL=your-model-name
```

如果使用 DeepSeek，可以这样填：

```text
VITE_LLM_PROVIDER=openai-compatible
VITE_OPENAI_API_KEY=你的 DeepSeek API Key
VITE_OPENAI_BASE_URL=https://api.deepseek.com
VITE_OPENAI_MODEL=deepseek-v4-flash
```

### Anthropic/Claude 风格示例

适用于 Anthropic 官方接口，或提供 Claude Messages 兼容格式的服务。

```text
VITE_LLM_PROVIDER=anthropic
VITE_ANTHROPIC_API_KEY=你的 API Key
VITE_ANTHROPIC_BASE_URL=https://api.anthropic.com
VITE_ANTHROPIC_MODEL=claude-sonnet-4-5
VITE_ANTHROPIC_VERSION=2023-06-01
```

注意：这是纯前端本地项目，所有 `VITE_` 开头的环境变量都会进入浏览器代码。只建议个人本地使用，不要把真实 Key 提交到仓库，也不建议直接公开部署。

## 修改人物设定

人物设定放在：

```text
public/personas/
```

新增人物时：

1. 新建一个 `.md` 文件。
2. 在 `public/personas/index.json` 里加入这个文件名。

系统会从人物设定中随机抽取本局玩家。

## 修改规则

规则总纲在：

```text
public/rules/werewolf-rules.md
```

你可以直接修改这个文件来调整游戏规则。AI 玩家行动、发言和判断都会围绕这份规则总纲进行。

## 当前角色配置

```text
6人局：2狼人 + 3村民 + 预言家
7人局：2狼人 + 3村民 + 预言家 + 女巫
8人局：2狼人 + 4村民 + 预言家 + 女巫
9人局：3狼人 + 3村民 + 预言家 + 女巫 + 猎人
10人局：3狼人 + 4村民 + 预言家 + 女巫 + 猎人
11人局：3狼人 + 4村民 + 预言家 + 女巫 + 猎人 + 守卫
12人局：4狼人 + 4村民 + 预言家 + 女巫 + 猎人 + 守卫
```

## 设计边界

- 用户是观众，不直接输入提示词操控 AI 玩家。
- 用户可以回溯到上一步或指定节点，让 AI 重新推进。
- LLM 不可用、额度耗尽或返回格式错误时，游戏会停止并在前端提示，不使用本地假决策兜底。
- 赛后可以导出完整时间线，但默认不持久保存对局日志和 AI 记忆。
