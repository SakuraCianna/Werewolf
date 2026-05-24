# AI 狼人杀

一个本地运行的 React AI 狼人杀观战项目。目标是让用户选择 6-12 人局后，坐在电脑前观看多位 AI 玩家围绕身份、人设、规则和局势进行发言、推理、投票和夜间行动。

当前版本已经可以从大厅开局并完整推进一局。用户选择 6-12 人后，系统会随机抽取人物设定、分配身份，并按夜晚行动、白天发言、投票放逐、胜负判断和赛后复盘完成整局体验。

## 当前进度

已经完成：

- React + TypeScript + Vite 前端项目
- 大厅选择 6-12 人并开始本局
- 6-12 人角色配置
- 可编辑的人物设定 Markdown
- 可编辑的狼人杀规则 Markdown
- OpenAI-compatible 与 Anthropic/Claude 风格 LLM 适配器
- DeepSeek 驱动的夜晚行动、白天发言、投票与赛后评分
- LLM 失败时的本地规则兜底
- 事件时间线与回溯能力
- 圆桌观战 UI、右侧消息流、视角切换按钮
- GSAP 圆桌与消息动画
- 上帝视角身份总览
- 自动推进、暂停、回退一步、回到上阶段
- 赛后评分展示与返回大厅清理

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

1. 增加页面内模型配置面板，减少手动改 `.env`。
2. 增强夜晚行动 prompt，让每个神职的策略更像真人。
3. 增加对局速度设置和更细的回溯入口。
4. 增加局后完整时间线导出，但默认仍不持久保存。
