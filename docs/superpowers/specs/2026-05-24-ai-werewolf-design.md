# AI 狼人杀项目设计

日期：2026-05-24

## 1. 项目定位

本项目是一个本地运行的 AI 狼人杀观战游戏。用户 fork 项目后在本机启动前端应用，配置一局 6-12 人游戏，然后作为看客观看多位 AI 玩家按照狼人杀规则进行发言、推理、投票和夜间行动。

用户不是玩家，不参与发言，也不能输入提示词影响 AI 思考。用户可以控制开始、暂停、继续、回溯和视角切换。

第一版目标是完成一个可完整跑完一局的本地纯前端项目，重点放在：

- AI 玩家能基于身份、人设、局势和记忆自主行动。
- 用户能以桌游房间视角观看整局游戏。
- 对局支持事件级和阶段级回溯。
- 赛后由 AI 对每位玩家进行表演、逻辑和游戏操作评分。

## 2. 技术边界

项目采用 React + TypeScript + Vite。第一版不做数据库、账号系统、云端部署、自建后端服务或多人联机。

LLM API Key 只通过 `.env.local` 配置，不提供应用内填写入口。仓库提交 `.env.example`，不提交真实密钥。

需要支持两类 LLM 接口：

- OpenAI-compatible：优先兼容常见 `/v1/chat/completions` 风格接口，并为后续接入 OpenAI Responses API 预留适配器空间。
- Anthropic Claude：使用 Anthropic Messages API 风格。

已确认的技术资料：

- OpenAI 官方文档强调 API Key 不应暴露在浏览器客户端代码中。因此本项目必须在 README 中明确标注：这是个人本地项目，`.env.local` 注入到前端后仍属于本机可见配置，不适合公开部署或给不可信用户使用。
- Anthropic API 请求需要 `x-api-key`、`anthropic-version` 和 JSON content type。第一版实现时需要实际验证浏览器直连是否受 CORS 限制。如果官方端点阻止浏览器直连，则不得偷偷加后端代理；应先暂停并让用户决定是否接受“本地极薄代理”或改用支持浏览器调用的兼容服务。
- GSAP 可通过 npm 安装，并可在 React 中使用 `useGSAP`/context 类方式管理动画清理。

## 3. 推荐目录结构

```text
Werewolf/
  docs/
    superpowers/
      specs/
        2026-05-24-ai-werewolf-design.md
    architecture.md
  public/
    personas/
      lin-che.md
      ye-lan.md
      xia-mian.md
      gu-heng.md
    rules/
      werewolf-rules.md
  src/
    app/
      App.tsx
      App.css
    assets/
    components/
      room/
      status-feed/
      settlement/
      controls/
    content/
      loadMarkdownAssets.ts
    game/
      engine/
      roles/
      timeline/
      rollback/
      settlement/
      types.ts
    llm/
      adapters/
        openaiCompatible.ts
        anthropicClaude.ts
      prompts/
      types.ts
    motion/
      roomAnimations.ts
      messageAnimations.ts
    test/
  .env.example
  package.json
  README.md
```

中文内容资产放在 `public/personas/` 和 `public/rules/`，文件编码统一 UTF-8。

## 4. 内容资产

### 4.1 人物设定

`public/personas/` 下放置多份 Markdown 文件。开局时系统从可用人物设定中随机抽取与人数相同的角色，绑定到 AI 玩家。

实现时通过 `public/personas/index.json` 枚举可加载的人设 Markdown 文件；新增人设需要同步更新该 manifest。

每份人物设定建议包含：

- 姓名
- 说话风格
- 推理习惯
- 情绪稳定度
- 攻击性或防御性倾向
- 撒谎风格
- 容易犯的错误
- 作为狼人时的策略倾向
- 作为好人时的策略倾向

玩家在 UI 中只显示名字，不显示 01/02 这类代号作为主标识。

### 4.2 规则总纲

`public/rules/werewolf-rules.md` 是游戏规则总纲。它是 LLM prompt 的公共规则来源，也是前端规则引擎实现的文字依据。

第一版人数配置固定为：

```text
6人局：
2狼人 + 3村民 + 预言家

7人局：
2狼人 + 3村民 + 预言家 + 女巫

8人局：
2狼人 + 4村民 + 预言家 + 女巫

9人局：
3狼人 + 3村民 + 预言家 + 女巫 + 猎人

10人局：
3狼人 + 4村民 + 预言家 + 女巫 + 猎人

11人局：
3狼人 + 4村民 + 预言家 + 女巫 + 猎人 + 守卫

12人局：
4狼人 + 4村民 + 预言家 + 女巫 + 猎人 + 守卫
```

第一版角色范围：

- 狼人：夜晚共同选择袭击目标。
- 村民：无夜间技能，白天通过发言和投票找狼。
- 预言家：每晚查验一名玩家阵营。
- 女巫：拥有一次解药和一次毒药，按规则决定是否使用。
- 猎人：死亡时按规则决定是否开枪带走一人。
- 守卫：每晚选择一名玩家保护。

## 5. 游戏流程

游戏由前端状态机驱动，不由 LLM 自由决定阶段流转。

基础阶段：

```text
大厅配置
-> 随机人设与身份
-> 第一夜
-> 夜间行动结算
-> 第一天发言
-> 投票放逐
-> 胜负判断
-> 下一夜 / 结算页
```

夜间行动由规则引擎决定可行动角色，再逐个调用对应 AI 或执行本地逻辑：

- 狼人选择袭击目标。
- 预言家选择查验目标。
- 女巫决定是否救人或毒人。
- 守卫选择保护目标。

白天行动：

- 存活玩家按顺序发言。
- 发言必须是一人称原话，不生成第三人称摘要。
- 投票阶段每位存活玩家生成投票目标和简短理由。
- 规则引擎统计票数并执行放逐。

## 6. LLM 设计

游戏内部只依赖统一接口：

```ts
interface LlmClient {
  generateAction(request: LlmActionRequest): Promise<LlmActionResponse>;
}
```

适配器负责把统一请求转换为具体供应商 API：

- `OpenAICompatibleAdapter`
- `AnthropicClaudeAdapter`

推荐 `.env.example`：

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

每次 AI 行动 prompt 至少包含：

- 规则总纲
- 当前玩家人设
- 当前玩家真实身份
- 当前公开局势
- 当前玩家可见私有信息
- 当前玩家历史记忆
- 当前阶段要求
- 输出 JSON schema

LLM 输出必须经过解析和校验。若输出不合法，应进行一次自动修复请求或回退到安全默认行为，并在游戏消息中记录模型异常。

## 7. 记忆与公平性

每位 AI 玩家拥有独立私有记忆。私有记忆只包含该玩家按身份与阶段应当知道的信息。

观众视角不显示真实身份、狼人夜间信息、查验结果、私有推理摘要。上帝视角可显示这些信息。

用户不能输入任何会影响 AI 思考的提示词。回溯只能让指定行动重新生成，不能附加用户指导。

## 8. 回溯设计

采用事件时间线 + 关键 checkpoint。

核心对象：

```text
GameEvent：单个游戏事件，例如发言、投票、袭击、救人、保护、查验、死亡。
Checkpoint：关键阶段前的完整状态快照，例如夜晚开始、白天开始、投票开始。
Timeline：当前对局事件序列。
```

支持回溯到：

- 上一次 AI 发言前。
- 上一次 AI 行动前。
- 上一个夜晚开始。
- 上一个白天开始。
- 上一次投票开始。

回溯后恢复 checkpoint 或事件前状态，重新生成后续行动，并覆盖旧历史。第一版不保留多分支时间线。

## 9. 对局生命周期与存储

第一版不持久保存完整对局。

对局过程中的事件、发言、快照、玩家私有记忆和评审输入只存在 React 运行时状态中。不得写入 `localStorage`、`IndexedDB` 或本地文件。

游戏结束后进入结算页，此时可以继续在内存中保留完整对局内容用于复盘展示和 AI 评分。用户点击“返回大厅”或“开始新局”时，必须清空：

- 完整事件时间线
- 所有 checkpoint
- 所有 AI 私有记忆
- 完整对话记录
- 赛后评分报告

## 10. 赛后评分

游戏结束后调用一次赛后评审 AI。评审 AI 使用完整对局内容生成结算报告。

每位玩家评分项：

- 表演评分：人设稳定性、说服力、伪装能力、节目效果。
- 逻辑评分：推理链条、矛盾识别、站边依据、判断准确性。
- 游戏操作评分：投票、查验、救人、毒人、袭击、守卫等决策质量。

结算页展示：

- 胜负结果
- 所有玩家真实身份
- 存活/死亡情况
- 完整对局时间线
- 每位玩家三项评分
- 每位玩家完整评价
- MVP、最佳表演、最佳逻辑、关键失误等标签
- AI 总评审复盘

## 11. UI 设计

主界面采用桌游房间感。

硬性布局约束：

- 页面固定为浏览器视口高度。
- 不产生页面级上下滚动。
- 主界面左右分区比例为 5:2。
- 左侧为圆桌与玩家座位区。
- 右侧为游戏消息区。
- 右侧消息列表可以在面板内部滚动。

玩家展示：

- 只显示玩家名字，不显示 01/02 编号。
- 当前发言玩家座位高亮。
- 死亡玩家座位灰化或降低透明度。
- 观众视角隐藏身份。
- 上帝视角显示真实身份和必要私有信息。

视角切换：

- 顶部提供按钮切换观众视角和上帝视角。
- `Space` 作为隐藏快捷键保留，但 UI 不提示。
- 当焦点在输入框、按钮或可编辑区域时，空格不得触发全局视角切换。

消息表达：

- 阶段标题使用中文，不使用 `D2`、`N2`、`V1` 等缩写。
- 发言标题格式：`第二天 · 叶岚发言`。
- 发言内容必须是第一人称原话。
- 不使用“顾衡声称自己查验了 02”这类第三人称摘要。
- 状态消息也统一使用玩家名字，不使用玩家 A/B 或编号。

消息颜色：

- 杀害、死亡、放逐类：`#db3444`
- 女巫救人、起死回生类：`#45db34`
- 守卫保护类：`#f6e94d`
- 发言类：白色

## 12. 动画设计

项目加入 GSAP 动画，避免界面过于干燥。动画应增强局势变化感，不喧宾夺主。

建议动效：

- 开局时座位依次入场。
- 当前发言玩家座位轻微高亮或呼吸。
- 新消息从右侧消息区淡入并轻微上移。
- 杀害消息出现时短暂红色闪烁。
- 女巫救人消息出现时绿色光效。
- 守卫保护消息出现时黄色护盾感高亮。
- 视角切换时身份信息平滑翻转或淡入。
- 回溯时事件时间线做反向收束动画。
- 结算页评分卡片依次出现。

实现时优先封装 `motion/` 工具，不把复杂动画逻辑散落在业务组件中。React 组件卸载时必须清理动画上下文。

## 13. 测试与验证

第一版至少需要：

- 角色配置表单元测试：6-12 人配置正确。
- 胜负判断测试：狼人胜利、好人胜利、边界人数。
- 时间线与 checkpoint 测试：回溯后状态正确。
- LLM 输出解析测试：合法 JSON、非法 JSON、缺字段。
- 赛后评分 schema 测试。
- UI 基础测试：主布局无页面级滚动、右侧消息内部滚动、视角按钮存在。
- Playwright 视觉检查：最大化浏览器下圆桌不溢出、右侧消息可读、玩家名字不重叠。

## 14. 不做范围

第一版不做：

- 在线部署
- 用户账号
- 数据库
- 对局历史自动保存
- 多人联机
- 语音发言
- 自定义 prompt 输入
- 多分支时间线保存
- 复杂扩展职业，例如白痴、骑士、摄梦人、狼美人

## 15. 主要风险

### 浏览器直连 LLM API

纯前端项目会把 `VITE_` 环境变量注入客户端代码。即使项目只在本地使用，API Key 仍然可以被本机浏览器代码看到。这不适合公开部署。

此外，官方 API 端点可能因为 CORS 或安全策略阻止浏览器直连。第一版实现前必须先做最小 API 连通性验证。若官方 OpenAI 或 Anthropic 直连不可行，需要用户确认是否接受本地极薄代理或改用可浏览器调用的兼容服务。

### AI 行为稳定性

AI 可能输出不合规 JSON、违反规则、暴露不该知道的信息或生成第三人称摘要。必须通过 schema、重试和规则引擎约束降低风险。

### 回溯复杂度

回溯会影响事件、玩家记忆、死亡状态、技能使用次数和后续行动。必须先实现稳定的事件模型和 checkpoint，再做复杂 UI。

## 16. 参考资料

- OpenAI API Authentication: https://platform.openai.com/docs/api-reference/authentication
- OpenAI Responses API: https://platform.openai.com/docs/api-reference/responses
- Anthropic API Overview: https://docs.anthropic.com/en/api/overview
- Anthropic Messages API examples: https://docs.anthropic.com/en/api/messages-examples
- GSAP Installation: https://gsap.com/docs/v3/Installation/
- GSAP context / React useGSAP: https://gsap.com/docs/v3/GSAP/gsap.context()/
