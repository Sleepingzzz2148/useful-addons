# GOJ VJudge Cookie Auto Binder

在 GOJ 页面左下角添加「绑定 VJudge」按钮，自动读取 VJudge 的 `JSESSIONID`，并绑定到 GOJ。

> 脚本文件：[`goj-helper.user.js`](./goj-helper.user.js)

---

## 功能简介

本脚本用于简化 GOJ 绑定 VJudge Cookie 的流程。

安装后，在 GOJ 页面左下角会出现按钮：

```text
绑定 VJudge
```

点击后，脚本会：

1. 尝试读取 `vjudge.net` 的 `JSESSIONID`；
2. 自动提交到 GOJ 的 VJudge 绑定接口；
3. 调用 GOJ 校验接口检查绑定是否有效；
4. 在页面左下角显示绑定结果。

---

## 安装

请先安装油猴脚本管理器：

- [Tampermonkey](https://www.tampermonkey.net/)
- 或 [Violentmonkey](https://violentmonkey.github.io/)

然后点击安装：

[安装 goj-helper.user.js](https://github.com/Sleepingzzz2148/useful-addons/releases/latest/download/goj-helper.user.js)

---

## 使用方法

1. 登录 [VJudge](https://vjudge.net/)。
2. 打开 [GOJ](https://www.goj.wiki/)。
3. 点击页面左下角的：

   ```text
   绑定 VJudge
   ```

4. 等待脚本自动读取 Cookie 并绑定。
5. 如果成功，会显示：

   ```text
   绑定成功，VJudge 会话有效。
   ```

---

## 适用网站

脚本匹配以下网站：

```js
https://www.goj.wiki/*
http://www.goj.wiki/*
https://goj.wiki/*
http://goj.wiki/*
https://vjudge.net/*
http://vjudge.net/*
https://www.vjudge.net/*
http://www.vjudge.net/*
```

注意：

- 按钮只会显示在 GOJ 页面；
- 匹配 VJudge 是为了申请读取 VJudge Cookie 的权限。

---

## 权限说明

本脚本使用以下权限：

```js
// @grant        GM.cookie
// @grant        GM_cookie
// @connect      vjudge.net
```

用途：

| 权限 | 说明 |
|---|---|
| `GM.cookie` | 新版 Tampermonkey 的 Cookie API |
| `GM_cookie` | 旧版 Tampermonkey 的 Cookie API |
| `@connect vjudge.net` | 允许脚本访问 VJudge 相关 Cookie |

本脚本会读取：

```text
vjudge.net 的 JSESSIONID
```

读取到的 Cookie 会提交到 GOJ 的接口：

```text
/coach-api/v2/vjudge/me/credential/save
```

本脚本不会将 Cookie 上传到作者服务器。

---

## 常见问题

### 自动读取 Cookie 失败怎么办？

请检查 Tampermonkey 设置：

1. 打开 Tampermonkey 设置页；
2. 将配置模式改成「高级」；
3. 找到「允许脚本访问 Cookie」；
4. 不要选择「除了 HttpOnly」；
5. 改成「是 / 全部 / 允许 HttpOnly」之类的选项；
6. 保存后重新打开 GOJ 页面。

---

### 为什么需要允许读取 HttpOnly Cookie？

VJudge 的登录状态通常保存在 `JSESSIONID` 中。

有些情况下，这个 Cookie 是 `HttpOnly`，普通网页 JS 无法读取，需要 Tampermonkey 提供的 Cookie API。

如果不允许读取 HttpOnly Cookie，脚本可能无法自动获取 VJudge 登录态。

---

### 检测到多个 JSESSIONID 怎么办？

脚本会自动给候选 Cookie 打分。

一般应选择满足这些特征的 Cookie：

```text
domain 包含 vjudge.net
path = /
HttpOnly = true
Session = true
```

如果脚本无法自动判断，会弹窗让你手动选择。

---

### 绑定失败怎么办？

可以尝试：

1. 确认已经登录 VJudge；
2. 重新打开 GOJ 页面；
3. 检查 Tampermonkey 是否允许读取 HttpOnly Cookie；
4. 清理 VJudge Cookie 后重新登录；
5. 手动输入正确的 `JSESSIONID`。

手动查找方法：

```text
F12 -> Application / 应用 -> Cookies -> https://vjudge.net
```

找到：

```text
JSESSIONID
```

优先选择：

```text
HttpOnly = true
Expires = Session / 会话
```

---

## 版本

当前版本：

```text
v1.2.0
```

主要功能：

- 自动读取 VJudge `JSESSIONID`；
- 支持新版 `GM.cookie`；
- 支持旧版 `GM_cookie`；
- 支持多个 Cookie 候选项自动选择；
- 支持读取失败时手动输入；
- 支持绑定结果提示。

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