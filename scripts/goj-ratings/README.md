# GOJ AtCoder Rating

在 GOJ 比赛榜单和用户页显示本地 AtCoder 风格 rating、performance、题目难度、rating 曲线、排行榜与 head-to-head 对比。

> 脚本文件：[`gojratings.user.js`](./gojratings.user.js)

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
9. 提供控制台 API 用于导出、导入、重算、重置本地数据与查询题目难度。

所有数据只保存在浏览器本地 `localStorage` 中，不会上传到作者服务器。

---

## 安装

请先安装油猴脚本管理器：

- [Tampermonkey](https://www.tampermonkey.net/)
- 或 [Violentmonkey](https://violentmonkey.github.io/)

然后点击安装：

[安装 gojratings.user.js](https://github.com/Sleepingzzz2148/useful-addons/releases/latest/download/gojratings.user.js)

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
window.GOJAtCoderRating.recalculate()
window.GOJAtCoderRating.reset()
window.GOJAtCoderRating.getProblemDifficulty(contestId, problemId)
window.GOJAtCoderRating.recalculateProblemDifficulties()
```

用途：

| API | 说明 |
|---|---|
| `exportData()` | 导出当前浏览器中的本地 rating、比赛记录和题目难度数据 |
| `importData(jsonOrObject)` | 导入 JSON 字符串或对象，并自动重算 rating 和题目难度 |
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

### 如何备份或迁移数据？

在浏览器开发者工具控制台中执行：

```js
window.GOJAtCoderRating.exportData()
```

复制返回的数据后，在另一个浏览器或环境中执行：

```js
window.GOJAtCoderRating.importData(data)
```

其中 `data` 可以是导出的对象，也可以是 JSON 字符串。

---

### 计算结果是 GOJ 官方 rating 吗？

不是。

这是脚本在本地计算的 AtCoder 风格 rating，仅用于个人参考，不代表 GOJ 官方数据。

---

## 版本

当前版本：

```text
v1.1.3
```

主要功能：

- 本地维护 GOJ AtCoder 风格 rating 数据；
- 在比赛榜单展示 rating、rating Δ 和 performance；
- 根据本地已统计数据估算并展示题目难度；
- 在用户页展示 rating 曲线，并支持横向缩放；
- 支持 head-to-head 对比两个用户的 rating 走势；
- 支持本地 GOJ Rating 排行榜和筛选；
- 支持从最近活动批量添加比赛；
- 支持导出、导入、重算、重置和查询题目难度。

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
