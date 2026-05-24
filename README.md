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
