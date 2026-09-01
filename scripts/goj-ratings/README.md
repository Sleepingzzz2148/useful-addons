# GOJ AtCoder Rating

在 GOJ 比赛榜单和用户页显示本地 AtCoder 风格 rating、performance、题目难度、rating 曲线、排行榜与 head-to-head 对比。

> 脚本文件：[`goj-ratings.user.js`](./goj-ratings.user.js)

---

## 功能简介

本脚本用于在 GOJ 上本地维护一套 AtCoder 风格 rating 数据。

安装后，脚本会在 GOJ 页面中提供以下能力：

1. 在比赛榜单中显示用户当前 rating；
2. 在比赛榜单中追加 `rating Δ` 和 `performance` 列；
3. 根据已统计比赛的选手表现估算并展示题目难度；
4. 支持将当前比赛加入本地 rated 记录并自动重算；
5. 在用户页显示 rating 曲线、当前 rating 和 rated 比赛数量；
6. 支持用户 rating 排行榜，并可按最近参赛时间和比赛数量筛选；
7. 支持在用户页 rating 曲线中开启 head-to-head，对比两个用户的 rating 走势；
8. 支持从用户最近活动中批量添加比赛；
9. 支持在用户页导出比赛数据包，并在另一环境中追加比赛原始数据；
10. 提供控制台 API 用于整库备份恢复、比赛包导出追加、重算、重置本地数据与查询题目难度。

所有数据只保存在浏览器本地 `localStorage` 中，不会上传到作者服务器。

---

## 安装

请先安装油猴脚本管理器：

- [Tampermonkey](https://www.tampermonkey.net/)
- 或 [Violentmonkey](https://violentmonkey.github.io/)

然后点击安装：

[安装 goj-ratings.user.js](https://github.com/Sleepingzzz2148/useful-addons/releases/latest/download/goj-ratings.user.js)

---

## 使用方法

### 添加单场比赛

1. 打开 [GOJ](https://www.goj.wiki/) 的比赛榜单页面；
2. 使用脚本注入的本地 rating 操作入口添加当前比赛；
3. 脚本会解析榜单排名、得分、比赛时间等信息；
4. 添加成功后自动重算所有本地 rating 记录；
5. 榜单中会显示用户 rating、rating 变化和 performance。

---

### 查看用户 rating 曲线

1. 打开 GOJ 用户页；
2. 脚本会在用户页插入 rating 曲线区域；
3. 可以查看当前 rating、rated 比赛数量和每场比赛的 rating 变化；
4. 可以调整横向缩放查看较长历史；
5. 可以开启 head-to-head，并输入另一个用户 ID，对比两个用户按时间对齐后的 rating 走势。

---

### 导出或追加比赛数据包

1. 打开任意 GOJ 用户页，在 `GOJ Rating` 区域点击“导出比赛数据包”；
2. 浏览器会下载本地数据库中的全部比赛原始数据，不限于当前主页用户参加的比赛；
3. 在另一浏览器或环境的任意 GOJ 用户页点击“追加比赛包”，选择该 JSON 文件；
4. 追加只写入本地尚不存在的比赛，已有 `contestId` 一律跳过，不会覆盖本地比赛；
5. 重复的比赛会自动去重；若同一 `contestId` 的内容与本地不同，脚本会提示冲突并保留本地数据；
6. 仅在成功追加新比赛且本地数据库保存成功后，脚本才会使用全部本地比赛重算并提示成功。

用户没有参加的比赛不会直接成为该用户的 rating 记录，但会更新其他参赛者当时的历史表现。这些参赛者之后与该用户同场时，其历史表现会参与 performance 计算，因此背景比赛可能间接改变该用户后续场次的 rating。个人曲线中的“该用户参赛”只统计该用户实际参赛场次；“本地数据库比赛”才是参与全局重算的比赛总数。

比赛数据包不包含 `records`、`userStates`、`problemDifficulties` 等派生数据，导入后会根据全部本地比赛重新计算。包必须是当前支持的格式和版本，且每项比赛至少包含 `participants` 数组；结构不完整、JSON 无效、读取失败或保存失败都会明确提示错误，不会报告为成功追加。如果数据包中的比赛 ID 在本地已全部存在，即使个人曲线的参赛场数小于数据包场数，也不会重复载入这些比赛。

---

### 查看 GOJ Rating 排行榜

1. 打开任意 GOJ 用户页；
2. 在脚本插入的 GOJ Rating 区域点击“显示排行榜”；
3. 可以按“最近 N 天内有统计比赛”和“比赛数量 ≥ N”筛选本地 rating 数据。

排行榜基于当前浏览器本地保存的数据生成，不代表 GOJ 官方排名。

---

### 查看题目难度

1. 将包含对应题目的比赛加入本地 rated 记录；
2. 脚本重算后会根据参赛选手的历史 APerf 和题目得分估算题目难度；
3. 在比赛榜单的题目表头中显示题目难度徽章。

题目难度同样只基于本地已导入比赛数据，样本不足时可能不稳定。

---

### 批量添加最近活动比赛

在用户页最近活动中，如果脚本能识别到比赛列表，会显示批量添加工具。

点击后，脚本会依次读取最近活动中的比赛榜单，并加入本地 rated 记录。

---

## 适用网站

脚本匹配以下网站：

```js
https://www.goj.wiki/*
http://www.goj.wiki/*
https://goj.wiki/*
http://goj.wiki/*
```

---

## 权限说明

本脚本不申请特殊油猴权限：

```js
// @grant        none
```

脚本会使用浏览器同源 `fetch` 读取 GOJ 页面内容，并将 rating、比赛记录和题目难度数据保存到当前浏览器的 `localStorage`：

```text
goj_atcoder_rating_db_v1
```

本脚本不会将本地 rating 数据上传到作者服务器。

---

## 控制台 API

脚本会暴露以下控制台 API：

```js
window.GOJAtCoderRating.exportData()
window.GOJAtCoderRating.importData(jsonOrObject)
window.GOJAtCoderRating.exportContestPackage()
window.GOJAtCoderRating.appendContestPackage(jsonOrObject)
window.GOJAtCoderRating.recalculate()
window.GOJAtCoderRating.reset()
window.GOJAtCoderRating.getProblemDifficulty(contestId, problemId)
window.GOJAtCoderRating.recalculateProblemDifficulties()
```

用途：

| API | 说明 |
|---|---|
| `exportData()` | 导出完整本地数据库，用于整库备份 |
| `importData(jsonOrObject)` | 导入完整数据库并替换当前本地数据，然后自动重算 rating 和题目难度 |
| `exportContestPackage()` | 导出仅包含原始 `contests` 的比赛数据包 |
| `appendContestPackage(jsonOrObject)` | 校验后追加比赛数据包；已有 `contestId` 不覆盖，返回 `added`、`skipped`、`conflicts`、`total` 统计信息 |
| `recalculate()` | 重新计算当前本地数据库中的所有 rating 和题目难度 |
| `reset()` | 清空本地 rating 数据并重置数据库 |
| `getProblemDifficulty(contestId, problemId)` | 查询指定比赛、指定题目的本地难度估算结果 |
| `recalculateProblemDifficulties()` | 重新计算题目难度并返回题目难度表 |

---

## 常见问题

### rating 数据保存在哪里？

保存在当前浏览器、当前 GOJ 域名下的 `localStorage` 中，键名为：

```text
goj_atcoder_rating_db_v1
```

更换浏览器、清理网站数据或切换域名可能导致看不到原来的本地 rating 数据。

---

### 数据会上传到服务器吗？

不会。

脚本只会读取 GOJ 页面、解析榜单，并把 rating、比赛记录和题目难度计算结果保存在本地浏览器中。

---

### 如何备份、恢复或迁移比赛？

**整库备份与恢复**：在浏览器开发者工具控制台中执行：

```js
window.GOJAtCoderRating.exportData()
```

复制返回的数据后，在另一个浏览器或环境中执行：

```js
window.GOJAtCoderRating.importData(data)
```

这是整库替换操作，会用导入数据替换当前本地数据库；`data` 可以是导出的对象，也可以是 JSON 字符串。

**只迁移并追加比赛**：优先在用户页使用“导出比赛数据包”和“追加比赛包”按钮。也可以在控制台中执行：

```js
const contestPackage = window.GOJAtCoderRating.exportContestPackage()
window.GOJAtCoderRating.appendContestPackage(contestPackage)
```

比赛包仅包含原始比赛数据。追加时按标准化后的 `contestId` 去重，已有比赛不会被覆盖；若已有比赛内容不同，会返回冲突统计并保留本地版本。导入会校验包格式、版本以及每项比赛的 `participants` 数组；校验、文件读取或本地保存失败时会抛出错误并提示失败。只有新增比赛并保存成功时才会重算 rating 和题目难度。

---

### 计算结果是 GOJ 官方 rating 吗？

不是。

这是脚本在本地计算的 AtCoder 风格 rating，仅用于个人参考，不代表 GOJ 官方数据。

---

## 版本

当前版本：

```text
v1.1.4
```

主要功能：

- 本地维护 GOJ AtCoder 风格 rating 数据；
- 在比赛榜单展示 rating、rating Δ 和 performance；
- 根据本地已统计数据估算并展示题目难度；
- 在用户页展示 rating 曲线，并支持横向缩放；
- 支持 head-to-head 对比两个用户的 rating 走势；
- 支持本地 GOJ Rating 排行榜和筛选；
- 支持从最近活动批量添加比赛；
- 支持整库导出、替换导入、比赛数据包导出与不覆盖的追加导入；
- 支持重算、重置和查询题目难度。

---

## License

本脚本不是开源项目。

你可以：

- 个人安装和使用；
- 提交 Issue 反馈问题；
- 分享本仓库原始链接。

未经作者许可，你不可以：

- 修改后发布；
- 搬运到其他平台；
- 删除作者信息；
- 用于商业用途；
- 改名后重新发布。

Copyright © 2026 Sleeping_zzz2148. All rights reserved.
