# Graphify 项目接入

本项目接入 [Graphify](https://github.com/Graphify-Labs/graphify)，用于查询前端、游戏状态、场景、音效和服务端之间的代码关系。当前验证版本为 **0.9.40**（Python 包名为 `graphifyy`，命令为 `graphify`）。

## 安装

当前机器已通过 uv 安装 Graphify CLI，本项目复用该命令。技能与规则安装在当前仓库的 `.codex/skills/graphify/` 和 `AGENTS.md`。

其他开发机器先准备 Python 3.10+ 和 uv，再安装相同版本的 CLI：

```sh
uv tool install graphifyy==0.9.40
graphify --version
```

在项目根目录运行以下命令，安装项目技能并生成当前机器的 hook 配置：

```sh
npm run graphify:install
npm run graphify:build
```

`graphify:install` 使用官方的 `graphify install --project --platform codex`，不修改用户级助手配置。技能随仓库提交；生成的 `.codex/hooks.json` 含本机 CLI 绝对路径，因此由每台机器自行生成，不提交。

## 日常使用

```sh
# 构建代码关系图、结构报告和交互图
npm run graphify:build

# 按符号或问题查询；代码符号名通常最准确
npm run graphify:query -- "createGameStore playSound"
graphify explain "InventoryPanel"
graphify path "createGameStore" "playSound"

# 修改代码后增量更新
npm run graphify:update
```

在 Codex 后续对话中也可使用 `$graphify` 调用项目技能。`AGENTS.md` 提供先查询关系图、修改代码后更新的项目规则。

输出位于：

- `graphify-out/graph.json`：可查询的代码关系图。
- `graphify-out/GRAPH_REPORT.md`：模块与核心节点报告。
- `graphify-out/graph.html`：交互图，可在浏览器打开。

这些文件和缓存均为本地生成物，已加入 `.gitignore`；新克隆仓库后运行 `npm run graphify:build` 即可重建。

## 索引范围

默认构建使用 `--code-only`，在本地解析代码；报告生成使用 `--no-label`，保留自动分组编号，不调用模型命名。无需额外 API key。它描述静态代码关系，不包含文档语义推断，也不能代替测试或运行时调用追踪。Zustand 对象内的 `startCooking` 等 action 可能归入外层 `createGameStore` 节点，可从该节点定位到源文件。CSS 和纯数据 JSON 不一定产生图节点。

`.graphifyignore` 排除了依赖、构建产物、下载的声音素材、图片、助手配置、研究数据、环境变量文件及订单数据。可在此文件中维护索引范围。

上游技能还支持文档、图片等语义提取；这不属于本项目默认的代码索引命令。
