# GOJ Hydro OI 查分式成绩展示页

在 GOJ/Hydro 比赛结束后，以 OI 查分式流程展示成绩：先逐题分数，再总分排名。

> 脚本文件：[`goj-score-display.user.js`](./goj-score-display.user.js)

---

## 功能简介

本脚本用于在 GOJ/Hydro 比赛页面中展示更适合查分的成绩页。

安装后，脚本会提供以下能力：

1. 在比赛页面中生成查分式成绩展示层；
2. 先按题目逐题展示每个选手的得分；
3. 再展示总分与排名信息；
4. 支持右下角浮动按钮手动打开成绩页；
5. 支持快捷键 `Ctrl + Alt + R` 重新显示成绩页；
6. 可通过配置限制只在指定比赛生效。

---

## 安装

请先安装油猴脚本管理器：

- [Tampermonkey](https://www.tampermonkey.net/)
- 或 [Violentmonkey](https://violentmonkey.github.io/)

然后点击安装：

[安装 goj-score-display.user.js](https://github.com/Sleepingzzz2148/useful-addons/releases/latest/download/goj-score-display.user.js)

---

## 使用方法

1. 打开 GOJ 或 Hydro 的比赛页面；
2. 比赛结束后，脚本会按照查分式流程展示成绩；
3. 如果未自动弹出，可以点击右下角按钮；
4. 也可以按 `Ctrl + Alt + R` 重新打开展示页。

---

## 适用网站

脚本匹配以下网站：

```js
https://www.goj.wiki/d/*/contest/*
http://www.goj.wiki/d/*/contest/*
https://goj.wiki/d/*/contest/*
http://goj.wiki/d/*/contest/*
```

---

## 权限说明

本脚本不申请特殊油猴权限：

```js
// @grant        none
```

脚本仅在比赛页面运行，不会向作者服务器上传数据。

---

## 配置项

脚本顶部提供了几个可调配置：

- `AUTO_SHOW_WHEN_ENDED`：检测到比赛结束后自动弹出；
- `SHOW_FLOAT_BUTTON`：是否显示右下角按钮；
- `ONLY_CONTEST_ID`：只在指定比赛中生效；
- `DEFAULT_MAX_SCORE`：每题默认满分；
- `HOTKEY_KEY`：快捷键按键。

如需修改行为，请直接编辑脚本文件顶部的配置区。
