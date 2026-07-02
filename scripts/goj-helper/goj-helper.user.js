// ==UserScript==
// @name         GOJ VJudge Cookie Auto Binder
// @namespace    https://www.goj.wiki/
// @version      1.2.0
// @description  在 GOJ 页面左下角添加按钮，自动读取 vjudge.net 的 JSESSIONID 并绑定到 GOJ
// @author       Sleeping_zzz2148
// @match        https://www.goj.wiki/*
// @match        http://www.goj.wiki/*
// @match        https://goj.wiki/*
// @match        http://goj.wiki/*
// @match        https://vjudge.net/*
// @match        http://vjudge.net/*
// @match        https://www.vjudge.net/*
// @match        http://www.vjudge.net/*
// @license      All Rights Reserved
// @homepageURL  https://github.com/Sleepingzzz2148/useful-addons
// @supportURL   https://github.com/Sleepingzzz2148/useful-addons/issues
// @downloadURL  https://github.com/Sleepingzzz2148/useful-addons/releases/latest/download/goj-helper.user.js
// @updateURL    https://github.com/Sleepingzzz2148/useful-addons/releases/latest/download/goj-helper.user.js
// @grant        GM.cookie
// @grant        GM_cookie
// @connect      vjudge.net
// @run-at       document-end
// ==/UserScript==

(function () {
    'use strict';

    const GOJ_HOSTS = new Set([
        'www.goj.wiki',
        'goj.wiki',
    ]);

    const API_BASE = '/coach-api/v2';

    // 脚本可以匹配 vjudge.net 是为了申请 Cookie 权限，
    // 但按钮只在 GOJ 页面显示。
    if (!GOJ_HOSTS.has(location.hostname)) return;

    /***********************
     * UI
     ***********************/
    function createButton() {
        if (document.getElementById('goj-vjudge-auto-bind-btn')) return;

        const btn = document.createElement('button');
        btn.id = 'goj-vjudge-auto-bind-btn';
        btn.textContent = '绑定 VJudge';

        Object.assign(btn.style, {
            position: 'fixed',
            left: '16px',
            bottom: '16px',
            zIndex: '2147483647',
            padding: '9px 14px',
            borderRadius: '999px',
            border: '1px solid rgba(255,255,255,.22)',
            background: 'linear-gradient(135deg, #3b82f6, #06b6d4)',
            color: '#fff',
            fontSize: '13px',
            fontWeight: '700',
            cursor: 'pointer',
            boxShadow: '0 6px 18px rgba(0,0,0,.28)',
        });

        btn.addEventListener('click', autoBind);
        document.body.appendChild(btn);
    }

    function setButtonState(text, disabled = false) {
        const btn = document.getElementById('goj-vjudge-auto-bind-btn');
        if (!btn) return;

        btn.textContent = text;
        btn.disabled = disabled;
        btn.style.opacity = disabled ? '0.72' : '1';
        btn.style.cursor = disabled ? 'not-allowed' : 'pointer';
    }

    function toast(message, type = 'info', timeout = 5000) {
        let box = document.getElementById('goj-vjudge-auto-bind-toast');

        if (!box) {
            box = document.createElement('div');
            box.id = 'goj-vjudge-auto-bind-toast';

            Object.assign(box.style, {
                position: 'fixed',
                left: '16px',
                bottom: '62px',
                zIndex: '2147483647',
                maxWidth: '460px',
                padding: '10px 13px',
                borderRadius: '10px',
                fontSize: '13px',
                lineHeight: '1.55',
                color: '#fff',
                boxShadow: '0 6px 20px rgba(0,0,0,.30)',
                whiteSpace: 'pre-wrap',
            });

            document.body.appendChild(box);
        }

        const colorMap = {
            info: '#2563eb',
            ok: '#16a34a',
            warn: '#d97706',
            bad: '#dc2626',
        };

        box.style.background = colorMap[type] || colorMap.info;
        box.textContent = message;
        box.style.display = 'block';

        clearTimeout(box._timer);
        box._timer = setTimeout(() => {
            box.style.display = 'none';
        }, timeout);
    }

    /***********************
     * 工具
     ***********************/
    function shortValue(v) {
        if (!v) return '';
        if (v.length <= 18) return v;
        return v.slice(0, 8) + '...' + v.slice(-6);
    }

    function cookieAccessHint() {
        return [
            '自动读取失败时请检查 Tampermonkey 设置：',
            '1. 打开 Tampermonkey 设置页；',
            '2. 找到「允许脚本访问 Cookie」；',
            '3. 不要选择「除了 HttpOnly」；',
            '4. 改成「是 / 全部 / 允许 HttpOnly」之类的选项；',
            '5. 保存后关闭页面重新打开。',
        ].join('\n');
    }

    /***********************
     * GOJ 请求
     ***********************/
    async function readJson(response) {
        let data;

        try {
            data = await response.json();
        } catch {
            throw new Error('服务返回非 JSON');
        }

        if (!response.ok || !data || data.ok === false) {
            throw new Error(
                data?.error?.message ||
                data?.message ||
                `请求失败：HTTP ${response.status}`
            );
        }

        return data;
    }

    async function postJson(url, payload) {
        const body = new URLSearchParams();
        body.set('payload', JSON.stringify(payload || {}));

        const res = await fetch(url, {
            method: 'POST',
            credentials: 'same-origin',
            headers: {
                'content-type': 'application/x-www-form-urlencoded;charset=UTF-8',
            },
            body: body.toString(),
        });

        return readJson(res);
    }

    async function postEmpty(url) {
        const res = await fetch(url, {
            method: 'POST',
            credentials: 'same-origin',
        });

        return readJson(res);
    }

    async function getStatus() {
        const res = await fetch(API_BASE + '/vjudge/me/status', {
            credentials: 'same-origin',
        });

        const data = await readJson(res);
        return data.data || {};
    }

    /***********************
     * GM Cookie 兼容封装
     ***********************/
    async function gmListCookies(details) {
        // 新版 Tampermonkey
        if (typeof GM !== 'undefined' && GM.cookie && GM.cookie.list) {
            return await GM.cookie.list(details);
        }

        // 旧版 Tampermonkey
        if (typeof GM_cookie !== 'undefined' && GM_cookie.list) {
            return await new Promise((resolve, reject) => {
                try {
                    GM_cookie.list(details, (cookies, error) => {
                        if (error) reject(new Error(String(error)));
                        else resolve(cookies || []);
                    });
                } catch (err) {
                    reject(err);
                }
            });
        }

        throw new Error(
            '当前 Tampermonkey 不支持 Cookie API。\n\n' +
            '请确认脚本头包含：\n' +
            '// @grant GM.cookie\n' +
            '// @grant GM_cookie'
        );
    }

    async function collectVJudgeJSessionIds() {
        const queries = [
            { url: 'https://vjudge.net/', name: 'JSESSIONID' },
            { url: 'http://vjudge.net/', name: 'JSESSIONID' },
            { url: 'https://www.vjudge.net/', name: 'JSESSIONID' },
            { url: 'http://www.vjudge.net/', name: 'JSESSIONID' },

            // 部分环境支持 domain 查询，作为补充
            { domain: 'vjudge.net', name: 'JSESSIONID' },
            { domain: '.vjudge.net', name: 'JSESSIONID' },
            { domain: 'www.vjudge.net', name: 'JSESSIONID' },
        ];

        const map = new Map();

        for (const q of queries) {
            try {
                const list = await gmListCookies(q);

                console.log('[GOJ VJudge] cookie query:', q, 'count =', list.length);

                for (const c of list || []) {
                    if (c.name !== 'JSESSIONID') continue;

                    const domain = c.domain || '';
                    if (!domain.includes('vjudge.net')) continue;
                    if (!c.value) continue;

                    const key = [
                        c.name,
                        c.value,
                        c.domain,
                        c.path,
                        c.httpOnly,
                        c.secure,
                    ].join('|');

                    map.set(key, c);
                }
            } catch (e) {
                console.warn('[GOJ VJudge] cookie query failed:', q, e);
            }
        }

        const result = Array.from(map.values());

        console.log('[GOJ VJudge] collected JSESSIONID count:', result.length);
        console.table(result.map(c => ({
            value: shortValue(c.value),
            domain: c.domain,
            path: c.path,
            httpOnly: !!c.httpOnly,
            secure: !!c.secure,
            session: !c.expirationDate,
            expirationDate: c.expirationDate || '',
            score: scoreCookie(c),
        })));

        return result;
    }

    /***********************
     * Cookie 选择逻辑
     ***********************/
    function scoreCookie(c) {
        let s = 0;

        const domain = c.domain || '';
        const path = c.path || '';

        // vjudge.net 相关域
        if (domain === '.vjudge.net') s += 100;
        else if (domain === 'vjudge.net') s += 90;
        else if (domain.includes('vjudge.net')) s += 50;

        // VJudge 登录态一般是根路径
        if (path === '/') s += 30;

        // 正确登录会话通常是 HttpOnly
        if (c.httpOnly) s += 50;

        // 你截图里正确那个是会话 Cookie
        if (!c.expirationDate) s += 40;

        // Secure 不是强特征，少量加分
        if (c.secure) s += 5;

        return s;
    }

    async function chooseCookie(candidates) {
        if (!candidates.length) {
            throw new Error(
                '没有读取到 vjudge.net 的 JSESSIONID。\n\n' +
                '请确认你已经登录 https://vjudge.net/。\n\n' +
                cookieAccessHint()
            );
        }

        candidates.sort((a, b) => scoreCookie(b) - scoreCookie(a));

        console.log('[GOJ VJudge] JSESSIONID candidates:', candidates.map(c => ({
            value: shortValue(c.value),
            domain: c.domain,
            path: c.path,
            httpOnly: !!c.httpOnly,
            secure: !!c.secure,
            session: !c.expirationDate,
            expirationDate: c.expirationDate || '',
            score: scoreCookie(c),
        })));

        if (candidates.length === 1) {
            return candidates[0];
        }

        // 如果第一名明显领先，直接选
        if (scoreCookie(candidates[0]) >= scoreCookie(candidates[1]) + 30) {
            return candidates[0];
        }

        // 多个 JSESSIONID 分不清时，让用户手动选一次
        const text = candidates.map((c, i) => {
            return [
                `${i + 1}. ${shortValue(c.value)}`,
                `domain=${c.domain || '-'}`,
                `path=${c.path || '-'}`,
                `HttpOnly=${!!c.httpOnly}`,
                `Secure=${!!c.secure}`,
                `Session=${!c.expirationDate}`,
                `score=${scoreCookie(c)}`,
            ].join(' | ');
        }).join('\n');

        const input = prompt(
            '检测到多个 VJudge JSESSIONID，请输入要使用的编号。\n\n' +
            '一般请选择 HttpOnly=true 且 Session=true 的那个。\n\n' +
            text,
            '1'
        );

        const id = Number(input);

        if (!Number.isInteger(id) || id < 1 || id > candidates.length) {
            throw new Error('选择编号无效，已取消绑定。');
        }

        return candidates[id - 1];
    }

    function parseManualJSessionId(input) {
        const s = String(input || '').trim();

        if (!s) return '';

        // 支持：
        // JSESSIONID=xxxx
        // foo=1; JSESSIONID=xxxx; bar=2
        const m = s.match(/(?:^|;\s*)JSESSIONID=([^;\s]+)/);

        if (m) return m[1];

        // 也支持只粘贴值
        return s;
    }

    async function getVJudgeJSessionId() {
        let candidates = [];

        try {
            candidates = await collectVJudgeJSessionIds();
        } catch (e) {
            console.warn('[GOJ VJudge] collect cookies failed:', e);
        }

        if (!candidates.length) {
            const manual = prompt(
                '自动读取 VJudge JSESSIONID 失败。\n\n' +
                '可能原因：Tampermonkey 没有权限读取 HttpOnly Cookie。\n\n' +
                cookieAccessHint() +
                '\n\n' +
                '你也可以手动输入：\n' +
                '打开 F12 → 应用/Application → Cookies → https://vjudge.net\n' +
                '复制 HttpOnly=true 且 Expires=会话 的 JSESSIONID 值。\n\n' +
                '请粘贴 JSESSIONID 值，或粘贴 JSESSIONID=xxxx：'
            );

            const value = parseManualJSessionId(manual);

            if (!value) {
                throw new Error('没有输入 JSESSIONID。');
            }

            return value;
        }

        const chosen = await chooseCookie(candidates);
        return chosen.value;
    }

    /***********************
     * 主流程
     ***********************/
    async function autoBind() {
        try {
            setButtonState('读取中...', true);
            toast('正在读取 vjudge.net 的 JSESSIONID...', 'info', 2000);

            const jsessionid = await getVJudgeJSessionId();
            const cookie = `JSESSIONID=${jsessionid}`;

            console.log('[GOJ VJudge] selected JSESSIONID:', shortValue(jsessionid));

            setButtonState('保存中...', true);
            toast('已读取 Cookie，正在提交到 GOJ...', 'info', 2000);

            await postJson(API_BASE + '/vjudge/me/credential/save', { cookie });

            setButtonState('校验中...', true);
            toast('保存成功，正在校验有效性...', 'info', 2000);

            await postEmpty(API_BASE + '/vjudge/me/credential/check');

            const status = await getStatus();
            const credential = status.credential || {};

            if (credential.status === 'valid') {
                toast('绑定成功，VJudge 会话有效。', 'ok', 5000);
            } else {
                const msg = [
                    '绑定完成，但状态不是 valid。',
                    `当前状态：${credential.status || '-'}`,
                    credential.lastErrorSummary ? `错误：${credential.lastErrorSummary}` : '',
                    '',
                    '如果校验失败，请确认选择的是 HttpOnly=true 且 Expires=会话 的 JSESSIONID。',
                ].filter(Boolean).join('\n');

                toast(msg, 'warn', 9000);
            }

            setButtonState('绑定 VJudge', false);
        } catch (err) {
            console.error('[GOJ VJudge Auto Binder] Error:', err);

            toast(
                '绑定失败：' + err.message + '\n\n' +
                '如果你确认已经登录 VJudge，请重点检查：\n' +
                'Tampermonkey 设置(注意配置模式选择高级) → 允许脚本访问 Cookie → 不要选「除了 HttpOnly」。',
                'bad',
                12000
            );

            setButtonState('绑定 VJudge', false);
        }
    }

    createButton();
})();