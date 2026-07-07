// ==UserScript==
// @name         GOJ Training Helper
// @name:zh-CN   GOJ Hydro 训练总成绩排名 - 动态屏蔽与动画
// @namespace    https://www.goj.wiki/
// @version      5.0.0
// @description  Summarize GOJ Hydro training chapter scoreboards into an animated overall ranking with dynamic chapter exclusion.
// @description:zh-CN 支持点击屏蔽训练专题，动态重算总分，并通过 FLIP 实现平滑滚动重排动画。
// @author       mine2307
// @license      All Rights Reserved
// @copyright    2026 mine2307
// @homepageURL  https://github.com/Sleepingzzz2148/useful-addons/tree/main/scripts/goj-training-helper
// @supportURL   https://github.com/Sleepingzzz2148/useful-addons/issues
// @match        http://www.goj.wiki/d/*/training/*
// @match        https://www.goj.wiki/d/*/training/*
// @grant        none
// ==/UserScript==

(function () {
    'use strict';

    const path = location.pathname;
    if (path.includes('/scoreboard/')) return;

    const match = path.match(/^\/d\/([^/]+)\/training\/([^/]+)/);
    if (!match) return;

    const domainId = match[1];
    const trainingId = match[2];

    let showing = false;

    /************************************************************
     * 新增状态：屏蔽集合 & 排名上下文
     ************************************************************/
    let blockedChapters = new Set();
    let rankingState = {
        users: [],
        chapters: [],
        overlay: null,
        previousTotals: new Map() // uid -> lastActiveTotal，用于数字动画
    };

    /************************************************************
     * 样式（新增屏蔽相关样式）
     ************************************************************/
    function injectStyle() {
        if (document.getElementById('goj-rank-style-v50')) return;

        const style = document.createElement('style');
        style.id = 'goj-rank-style-v50';
        style.textContent = `
            #goj-rank-overlay-v50 {
                position: fixed; inset: 0; z-index: 2147483647;
                overflow: auto; color: #fff;
                background:
                    radial-gradient(circle at 10% 10%, rgba(56, 189, 248, 0.35), transparent 28%),
                    radial-gradient(circle at 88% 18%, rgba(244, 114, 182, 0.28), transparent 28%),
                    linear-gradient(135deg, #020617, #111827 48%, #1e1b4b);
                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Noto Sans SC", sans-serif;
                animation: gojOverlayIn .45s ease forwards;
            }
            #goj-rank-overlay-v50 * { box-sizing: border-box; }
            .goj-rank-shell-v50 {
                width: min(1280px, calc(100vw - 32px));
                min-height: 100vh; margin: 0 auto;
                padding: 54px 0 80px;
                display: flex; align-items: center; justify-content: center;
            }
            .goj-rank-card-v50 {
                width: 100%; border-radius: 32px; padding: 38px;
                background: rgba(15, 23, 42, 0.76);
                border: 1px solid rgba(255, 255, 255, 0.16);
                backdrop-filter: blur(22px);
                box-shadow: 0 30px 120px rgba(0, 0, 0, .5);
                animation: gojCardIn .65s cubic-bezier(.18,.89,.32,1.25) forwards;
            }
            .goj-rank-close-v50 {
                position: fixed; right: 24px; top: 22px; z-index: 2147483647;
                border: 1px solid rgba(255,255,255,.24); border-radius: 999px;
                padding: 10px 17px; color: #fff; background: rgba(255,255,255,.13);
                cursor: pointer; font-size: 14px; backdrop-filter: blur(14px);
            }
            .goj-rank-close-v50:hover { transform: scale(1.05); background: rgba(255,255,255,.24); }
            .goj-rank-header-v50 {
                text-align: center; margin-bottom: 20px;
                opacity: 0; transform: translateY(18px);
                animation: gojBlockUp .7s ease forwards .15s;
            }
            .goj-rank-title-v50 {
                margin: 0; font-size: clamp(30px, 5vw, 50px); font-weight: 1000;
                background: linear-gradient(90deg, #fff, #93c5fd, #f9a8d4, #fde68a, #fff);
                background-size: 320% auto; -webkit-background-clip: text;
                color: transparent; animation: gojTextShine 3.2s linear infinite;
            }
            .goj-rank-subtitle-v50 {
                margin-top: 12px; font-size: 16px; color: rgba(255,255,255,.6);
            }

            /* 新增：屏蔽状态栏 */
            .goj-blocked-bar-v50 {
                margin: 18px auto 0;
                padding: 12px 18px;
                max-width: 900px;
                background: rgba(239, 68, 68, 0.08);
                border: 1px solid rgba(239, 68, 68, 0.3);
                border-radius: 14px;
                display: flex; align-items: center; gap: 12px;
                flex-wrap: wrap;
                font-size: 13px;
                color: rgba(255,255,255,.85);
                animation: gojBlockUp .5s ease forwards;
            }
            .goj-blocked-bar-v50.empty {
                background: rgba(74, 222, 128, 0.08);
                border-color: rgba(74, 222, 128, 0.3);
            }
            .goj-blocked-label-v50 {
                font-weight: 700; color: #fca5a5;
                display: flex; align-items: center; gap: 6px;
            }
            .goj-blocked-bar-v50.empty .goj-blocked-label-v50 { color: #86efac; }
            .goj-blocked-tag-v50 {
                display: inline-flex; align-items: center; gap: 6px;
                padding: 4px 10px;
                background: rgba(239, 68, 68, 0.2);
                border: 1px solid rgba(239, 68, 68, 0.4);
                border-radius: 999px;
                font-size: 12px;
                cursor: pointer;
                transition: all .25s ease;
            }
            .goj-blocked-tag-v50:hover {
                background: rgba(239, 68, 68, 0.4);
                transform: translateY(-1px);
            }
            .goj-blocked-tag-v50 .x {
                font-weight: 900; color: #fecaca;
            }
            .goj-reset-btn-v50 {
                margin-left: auto;
                padding: 5px 12px;
                background: rgba(255,255,255,.1);
                border: 1px solid rgba(255,255,255,.2);
                border-radius: 999px;
                color: #fff;
                font-size: 12px;
                cursor: pointer;
                transition: all .25s ease;
            }
            .goj-reset-btn-v50:hover {
                background: rgba(255,255,255,.2);
                transform: translateY(-1px);
            }

            .goj-table-wrap-v50 {
                overflow-x: auto; border-radius: 20px;
                background: rgba(0,0,0,0.2); border: 1px solid rgba(255,255,255,0.1);
                margin-top: 20px;
                position: relative;
            }
            .goj-rank-table-v50 {
                width: 100%; border-collapse: separate; border-spacing: 0;
                color: #fff; font-size: 13px;
                min-width: 900px;
            }
            .goj-rank-table-v50 th, .goj-rank-table-v50 td {
                padding: 12px 14px; text-align: center;
                border-bottom: 1px solid rgba(255, 255, 255, 0.08);
            }
            .goj-rank-table-v50 th {
                background: rgba(255, 255, 255, 0.05); color: #bfdbfe;
                font-weight: 700; position: sticky; top: 0;
                white-space: nowrap;
                z-index: 2;
            }
            /* 新增：可点击的专题列头 */
            .goj-chapter-th-v50 {
                cursor: pointer;
                transition: all .25s ease;
                position: relative;
                user-select: none;
            }
            .goj-chapter-th-v50:hover {
                background: rgba(96, 165, 250, 0.2) !important;
                color: #fff !important;
            }
            .goj-chapter-th-v50::after {
                content: '⊘';
                position: absolute;
                top: 4px; right: 6px;
                font-size: 10px;
                color: rgba(255,255,255,.3);
                opacity: 0;
                transition: opacity .25s ease;
            }
            .goj-chapter-th-v50:hover::after { opacity: 1; }

            /* 新增：被屏蔽的列样式 */
            .goj-col-blocked-v50 {
                background: repeating-linear-gradient(
                    45deg,
                    rgba(239, 68, 68, 0.05),
                    rgba(239, 68, 68, 0.05) 6px,
                    rgba(239, 68, 68, 0.12) 6px,
                    rgba(239, 68, 68, 0.12) 12px
                ) !important;
                color: rgba(255,255,255,0.35) !important;
                text-decoration: line-through;
                text-decoration-color: rgba(239, 68, 68, 0.6);
            }
            .goj-col-blocked-v50::after {
                content: '🚫' !important;
                opacity: 1 !important;
                color: #fca5a5 !important;
                font-size: 12px !important;
            }
            .goj-cell-blocked-v50 {
                background: repeating-linear-gradient(
                    45deg,
                    rgba(239, 68, 68, 0.03),
                    rgba(239, 68, 68, 0.03) 6px,
                    rgba(239, 68, 68, 0.08) 6px,
                    rgba(239, 68, 68, 0.08) 12px
                ) !important;
                color: rgba(255,255,255,0.25) !important;
                text-decoration: line-through;
                text-decoration-color: rgba(239, 68, 68, 0.4);
            }

            .goj-rank-table-v50 tbody tr {
                transition: background .25s ease;
                will-change: transform;
            }
            .goj-rank-table-v50 tbody tr:hover { background: rgba(255, 255, 255, 0.05); }
            .goj-rank-table-v50 .col-rank {
                font-weight: 900; color: #fde68a; width: 60px;
                transition: color .4s ease;
            }
            .goj-rank-table-v50 .col-user { text-align: left; font-weight: 600; min-width: 120px; }
            .goj-rank-table-v50 .col-total {
                font-weight: 800; color: #4ade80;
                transition: color .4s ease;
                font-variant-numeric: tabular-nums;
            }
            .goj-rank-table-v50 .medal-gold { background: rgba(250, 204, 21, 0.15); }
            .goj-rank-table-v50 .medal-silver { background: rgba(192, 192, 192, 0.15); }
            .goj-rank-table-v50 .medal-bronze { background: rgba(205, 127, 50, 0.15); }

            /* 排名上升/下降指示 */
            .rank-up-v50 { color: #4ade80 !important; }
            .rank-down-v50 { color: #fb7185 !important; }
            .rank-same-v50 { color: #fde68a !important; }

            #goj-rank-btn-v50 {
                position: fixed; right: 24px; top: 70px; z-index: 9999;
                border: none; border-radius: 999px; padding: 12px 20px;
                color: white; cursor: pointer; font-weight: 800;
                background: linear-gradient(135deg, #2563eb, #db2777);
                box-shadow: 0 12px 34px rgba(37,99,235,.35);
            }
            #goj-rank-btn-v50:hover { transform: translateY(-2px); }
            #goj-rank-btn-v50:disabled { opacity: 0.7; cursor: wait; }

            @keyframes gojOverlayIn { from { opacity: 0; } to { opacity: 1; } }
            @keyframes gojCardIn { from { opacity: 0; transform: scale(.94) translateY(24px); } to { opacity: 1; transform: scale(1); } }
            @keyframes gojBlockUp { to { opacity: 1; transform: translateY(0); } }
            @keyframes gojTextShine { to { background-position: 320% center; } }
            @keyframes gojRowFlash {
                0% { background: rgba(96, 165, 250, 0.3); }
                100% { background: transparent; }
            }
            .goj-row-flash-v50 { animation: gojRowFlash .8s ease; }
        `;
        document.head.appendChild(style);
    }

    /************************************************************
     * 从 DOM 提取章节信息（保持不变）
     ************************************************************/
    function extractChaptersFromDOM() {
        const chapters = [];
        const chapterMap = new Map();

        const headers = document.querySelectorAll('h2, h3, h4');
        headers.forEach((header) => {
            const text = header.textContent.trim();
            const chapterMatch = text.match(/章节\s*(\d+)[\s:：]*(.+)?/i) ||
                                text.match(/专题\s*(\d+)[\s:：]*(.+)?/i);

            if (chapterMatch) {
                const index = chapterMatch[1];
                let title = chapterMatch[2] ? `章节${index}: ${chapterMatch[2].trim()}` : text;
                if (!chapterMap.has(index)) {
                    chapterMap.set(index, title.replace(/\s+/g, ' ').trim());
                }
            }
        });

        const sbLinks = document.querySelectorAll('a[href*="/scoreboard/"]');
        sbLinks.forEach((link) => {
            const href = link.href;
            const indexMatch = href.match(/\/scoreboard\/(\d+)/);

            if (indexMatch) {
                const index = indexMatch[1];
                let title = chapterMap.get(index) || `专题${index}`;

                if (!chapters.find(c => c._id === index)) {
                    chapters.push({ _id: index, title, url: href });
                }
            }
        });

        chapters.sort((a, b) => parseInt(a._id) - parseInt(b._id));
        return chapters;
    }

    /************************************************************
     * 获取 Scoreboard JSON 数据（保持不变）
     ************************************************************/
    async function fetchScoreboardJson(nid, url) {
        try {
            const res = await fetch(url, {
                credentials: 'include',
                headers: { 'Accept': 'application/json' }
            });
            if (!res.ok) return null;
            return await res.json();
        } catch (err) {
            console.error(`[GOJ Rank] 专题 ${nid} 获取失败:`, err);
            return null;
        }
    }

    /************************************************************
     * 解析单元格数据（保持不变）
     ************************************************************/
    function parseCellData(cell) {
        const result = {
            isUser: false, isTotalScore: false, isProblem: false,
            uid: null, uname: null, score: 0, acCount: 0, raw: cell
        };

        if (cell.type === 'user' || cell.type === 'user_detail') {
            result.isUser = true;
            result.uid = cell.raw || cell.value || cell.uid;
            result.uname = cell.value || cell.uname || 'Unknown';
        } else if (cell.type === 'total_score' || cell.type === 'total') {
            result.isTotalScore = true;
            result.score = parseFloat(cell.value) || parseFloat(cell.raw) || 0;
        } else if (cell.type === 'problem' || cell.type === 'problem_detail' ||
                   cell.type === 'problem_score' || cell.type === 'cell' ||
                   (cell.type === 'record' && cell.value)) {
            result.isProblem = true;
            let scoreText = cell.value || cell.raw || cell.score || '0';
            let score = 0;
            if (typeof scoreText === 'object') {
                score = parseFloat(scoreText.score) || 0;
            } else {
                const parts = scoreText.toString().split('/');
                score = parseFloat(parts[0]) || 0;
            }
            if (score > 0 && score <= 1) score = score * 100;
            result.score = score;
            result.acCount = score;
        }
        return result;
    }

    /************************************************************
     * 整合数据（保持不变）
     ************************************************************/
    async function aggregateData(chapters) {
        const userMap = new Map();

        for (const chapter of chapters) {
            const nid = chapter._id;
            const title = chapter.title;
            const data = await fetchScoreboardJson(nid, chapter.url);

            if (data && data.rows) {
                for (let i = 1; i < data.rows.length; i++) {
                    const row = data.rows[i];
                    let uid = null, uname = 'Unknown', totalScore = 0, acCount = 0;

                    for (let j = 0; j < row.length; j++) {
                        const parsed = parseCellData(row[j]);
                        if (parsed.isUser) {
                            uid = parsed.uid;
                            uname = parsed.uname || data.udict?.[parsed.uid]?.uname || uname;
                        } else if (parsed.isTotalScore) {
                            totalScore = parsed.score;
                        } else if (parsed.isProblem) {
                            acCount += parsed.acCount;
                        }
                    }

                    if (uid) {
                        if (!userMap.has(uid)) {
                            userMap.set(uid, { uid, uname, totalAC: 0, totalScore: 0, chapters: {} });
                        }
                        const user = userMap.get(uid);
                        user.totalAC += acCount;
                        user.totalScore += totalScore;
                        user.chapters[nid] = { title, acCount, totalScore };
                    }
                }
            }
        }

        return Array.from(userMap.values()).sort((a, b) => {
            if (b.totalAC !== a.totalAC) return b.totalAC - a.totalAC;
            return b.totalScore - a.totalScore;
        });
    }

    /************************************************************
     * 新增：计算"有效"用户列表（排除被屏蔽专题）
     ************************************************************/
    function computeActiveUsers() {
        const { users, chapters } = rankingState;
        return users.map(user => {
            let activeTotal = 0;
            const activeChapters = {};
            chapters.forEach(ch => {
                const data = user.chapters[ch._id];
                if (data) {
                    if (!blockedChapters.has(ch._id)) {
                        activeTotal += data.acCount;
                        activeChapters[ch._id] = data.acCount;
                    } else {
                        activeChapters[ch._id] = null; // 标记为被屏蔽
                    }
                }
            });
            return {
                ...user,
                activeTotal,
                activeChapters
            };
        }).sort((a, b) => {
            if (b.activeTotal !== a.activeTotal) return b.activeTotal - a.activeTotal;
            return b.totalScore - a.totalScore;
        });
    }

    /************************************************************
     * 新增：数字递增/递减动画
     ************************************************************/
    function animateNumber(element, from, to, duration = 600) {
        if (from === to) {
            element.textContent = Math.round(to);
            return;
        }
        const start = performance.now();
        const diff = to - from;

        function update(now) {
            const elapsed = now - start;
            const progress = Math.min(elapsed / duration, 1);
            // easeOutCubic
            const eased = 1 - Math.pow(1 - progress, 3);
            const current = Math.round(from + diff * eased);
            element.textContent = current;
            if (progress < 1) requestAnimationFrame(update);
        }
        requestAnimationFrame(update);
    }

    /************************************************************
     * 新增：FLIP 动画 - 让行平滑滑动到新位置
     ************************************************************/
    function flipAnimate(tbody, oldPositions) {
        const rows = tbody.querySelectorAll('tr[data-uid]');
        rows.forEach(tr => {
            const uid = tr.dataset.uid;
            const oldRect = oldPositions.get(uid);
            if (!oldRect) {
                // 新出现的行：从左侧淡入
                tr.style.opacity = '0';
                tr.style.transform = 'translateX(-30px)';
                requestAnimationFrame(() => {
                    tr.style.transition = 'opacity .5s ease, transform .5s cubic-bezier(.25,.46,.45,.94)';
                    tr.style.opacity = '1';
                    tr.style.transform = '';
                    setTimeout(() => { tr.style.transition = ''; }, 550);
                });
                return;
            }
            const newRect = tr.getBoundingClientRect();
            const dy = oldRect.top - newRect.top;
            const dx = oldRect.left - newRect.left;
            if (Math.abs(dy) < 0.5 && Math.abs(dx) < 0.5) return;

            // Invert: 先把元素"放回"旧位置
            tr.style.transform = `translate(${dx}px, ${dy}px)`;
            tr.style.transition = 'none';

            // Play: 下一帧动画到新位置
            requestAnimationFrame(() => {
                tr.style.transition = 'transform .6s cubic-bezier(.25,.46,.45,.94)';
                tr.style.transform = '';
                const onEnd = () => {
                    tr.style.transition = '';
                    tr.removeEventListener('transitionend', onEnd);
                };
                tr.addEventListener('transitionend', onEnd);
            });
        });
    }

    /************************************************************
     * 新增：切换专题屏蔽状态
     ************************************************************/
    function toggleChapter(chapterId) {
        if (blockedChapters.has(chapterId)) {
            blockedChapters.delete(chapterId);
        } else {
            // 不能把所有专题都屏蔽掉
            if (blockedChapters.size >= rankingState.chapters.length - 1) {
                flashMessage('⚠️ 至少保留一个专题');
                return;
            }
            blockedChapters.add(chapterId);
        }
        rerenderWithAnimation();
    }

    function resetBlocked() {
        blockedChapters.clear();
        rerenderWithAnimation();
    }

    function flashMessage(msg) {
        const card = rankingState.overlay?.querySelector('.goj-rank-card-v50');
        if (!card) return;
        const toast = document.createElement('div');
        toast.textContent = msg;
        toast.style.cssText = `
            position: absolute; top: 20px; left: 50%;
            transform: translateX(-50%);
            padding: 10px 20px;
            background: rgba(239, 68, 68, 0.9);
            color: #fff; border-radius: 999px;
            font-size: 14px; font-weight: 600;
            z-index: 10;
            animation: gojBlockUp .3s ease forwards;
        `;
        card.style.position = 'relative';
        card.appendChild(toast);
        setTimeout(() => {
            toast.style.transition = 'opacity .3s';
            toast.style.opacity = '0';
            setTimeout(() => toast.remove(), 300);
        }, 1500);
    }

    /************************************************************
     * 核心：带 FLIP 动画的重新渲染
     ************************************************************/
    function rerenderWithAnimation() {
        const card = rankingState.overlay?.querySelector('.goj-rank-card-v50');
        if (!card) return;

        const tbody = card.querySelector('tbody');
        const oldPositions = new Map();
        const oldTotals = new Map();

        // 1. First：记录旧位置与旧分数
        if (tbody) {
            tbody.querySelectorAll('tr[data-uid]').forEach(tr => {
                oldPositions.set(tr.dataset.uid, tr.getBoundingClientRect());
                const totalEl = tr.querySelector('.col-total[data-role="active"]');
                if (totalEl) {
                    oldTotals.set(tr.dataset.uid, parseFloat(totalEl.dataset.value) || 0);
                }
            });
        }

        // 2. 重新渲染内容
        const activeUsers = computeActiveUsers();
        const { chapters } = rankingState;

        // 更新屏蔽状态栏
        const blockedBar = card.querySelector('.goj-blocked-bar-v50');
        if (blockedBar) blockedBar.replaceWith(buildBlockedBar());

        // 更新表格
        const tableWrap = card.querySelector('.goj-table-wrap-v50');
        if (tableWrap) tableWrap.replaceWith(buildTable(activeUsers, chapters));

        // 3. Last + Invert + Play
        const newTbody = card.querySelector('tbody');
        if (newTbody) {
            flipAnimate(newTbody, oldPositions);

            // 数字动画
            newTbody.querySelectorAll('tr[data-uid]').forEach(tr => {
                const uid = tr.dataset.uid;
                const totalEl = tr.querySelector('.col-total[data-role="active"]');
                if (totalEl) {
                    const newVal = parseFloat(totalEl.dataset.value) || 0;
                    const oldVal = oldTotals.get(uid) ?? 0;
                    animateNumber(totalEl, oldVal, newVal, 600);
                }
            });
        }

        // 更新副标题
        const subtitle = card.querySelector('.goj-rank-subtitle-v50');
        if (subtitle) {
            const activeCount = chapters.length - blockedChapters.size;
            subtitle.textContent = `有效专题 ${activeCount}/${chapters.length} · ${activeUsers.length} 位参与者`;
        }
    }

    /************************************************************
     * 构建屏蔽状态栏
     ************************************************************/
    function buildBlockedBar() {
        const { chapters } = rankingState;
        const bar = document.createElement('div');
        bar.className = 'goj-blocked-bar-v50' + (blockedChapters.size === 0 ? ' empty' : '');

        const label = document.createElement('span');
        label.className = 'goj-blocked-label-v50';
        label.innerHTML = blockedChapters.size === 0
            ? '✅ <span>全部专题生效中（点击列头可屏蔽）</span>'
            : `🚫 <span>已屏蔽 ${blockedChapters.size}/${chapters.length} 个专题</span>`;
        bar.appendChild(label);

        blockedChapters.forEach(cid => {
            const ch = chapters.find(c => c._id === cid);
            if (!ch) return;
            const tag = document.createElement('span');
            tag.className = 'goj-blocked-tag-v50';
            tag.title = '点击取消屏蔽';
            tag.innerHTML = `<span>${ch.title.length > 12 ? ch.title.substring(0, 12) + '...' : ch.title}</span><span class="x">×</span>`;
            tag.addEventListener('click', () => toggleChapter(cid));
            bar.appendChild(tag);
        });

        if (blockedChapters.size > 0) {
            const resetBtn = document.createElement('button');
            resetBtn.className = 'goj-reset-btn-v50';
            resetBtn.textContent = '↺ 全部重置';
            resetBtn.addEventListener('click', resetBlocked);
            bar.appendChild(resetBtn);
        }

        return bar;
    }

    /************************************************************
     * 构建表格 HTML
     ************************************************************/
    function buildTable(activeUsers, chapters) {
        const wrap = document.createElement('div');
        wrap.className = 'goj-table-wrap-v50';

        let headerHtml = `<tr>
            <th class="col-rank">#</th>
            <th class="col-user">用户</th>
            <th class="col-total" title="排除被屏蔽专题后的有效总分">有效总分</th>
            <th class="col-total" style="color:#facc15" title="系统原始总分">原始总分</th>`;

        chapters.forEach(ch => {
            const isBlocked = blockedChapters.has(ch._id);
            const shortTitle = ch.title.length > 12 ? ch.title.substring(0, 12) + '...' : ch.title;
            headerHtml += `<th class="goj-chapter-th-v50 ${isBlocked ? 'goj-col-blocked-v50' : ''}"
                               data-chapter-id="${ch._id}"
                               title="${isBlocked ? '点击取消屏蔽: ' : '点击屏蔽: '}${ch.title}">
                               ${shortTitle}
                           </th>`;
        });
        headerHtml += `</tr>`;

        let bodyHtml = '';
        activeUsers.forEach((user, idx) => {
            const rank = idx + 1;
            const medalClass = rank === 1 ? 'medal-gold' : rank === 2 ? 'medal-silver' : rank === 3 ? 'medal-bronze' : '';

            bodyHtml += `<tr class="${medalClass}" data-uid="${user.uid}">
                <td class="col-rank">${rank <= 3 ? ['🥇','🥈','🥉'][rank-1] : rank}</td>
                <td class="col-user">${user.uname}</td>
                <td class="col-total" data-role="active" data-value="${user.activeTotal}">${Math.round(user.activeTotal)}</td>
                <td class="col-total" style="color:#facc15">${user.totalScore}</td>`;

            chapters.forEach(ch => {
                const isBlocked = blockedChapters.has(ch._id);
                const score = user.activeChapters[ch._id];
                if (isBlocked) {
                    bodyHtml += `<td class="goj-cell-blocked-v50">屏蔽</td>`;
                } else if (score != null && score > 0) {
                    bodyHtml += `<td style="color:#4ade80;font-weight:bold">${Math.round(score)}</td>`;
                } else {
                    bodyHtml += `<td style="color:rgba(255,255,255,0.3)">-</td>`;
                }
            });

            bodyHtml += `</tr>`;
        });

        wrap.innerHTML = `
            <table class="goj-rank-table-v50">
                <thead>${headerHtml}</thead>
                <tbody>${bodyHtml}</tbody>
            </table>
        `;

        // 绑定列头点击事件
        wrap.querySelectorAll('.goj-chapter-th-v50').forEach(th => {
            th.addEventListener('click', () => {
                const cid = th.dataset.chapterId;
                toggleChapter(cid);
            });
        });

        return wrap;
    }

    /************************************************************
     * 显示排名（入口）
     ************************************************************/
    async function showRanking() {
        if (showing) return;
        showing = true;
        injectStyle();

        const overlay = document.createElement('div');
        overlay.id = 'goj-rank-overlay-v50';
        overlay.innerHTML = `
            <button class="goj-rank-close-v50">关闭</button>
            <div class="goj-rank-shell-v50">
                <div class="goj-rank-card-v50">
                    <div class="goj-rank-header-v50">
                        <h1 class="goj-rank-title-v50">🏆 训练总排名</h1>
                        <div class="goj-rank-subtitle-v50">正在加载数据...</div>
                    </div>
                    <div class="goj-loading-v50" style="text-align:center;padding:60px 20px;color:rgba(255,255,255,.8)">
                        <div style="font-size:30px;margin-bottom:15px">⏳</div>
                        正在获取各专题成绩...
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(overlay);
        rankingState.overlay = overlay;

        const close = () => {
            overlay.style.animation = 'gojOverlayIn .3s ease reverse forwards';
            setTimeout(() => {
                overlay.remove();
                rankingState.overlay = null;
            }, 300);
            showing = false;
            // 不清空屏蔽状态，下次打开保留
        };

        overlay.querySelector('.goj-rank-close-v50').addEventListener('click', close);
        document.addEventListener('keydown', e => { if (e.key === 'Escape' && showing) close(); }, { once: true });

        try {
            const chapters = extractChaptersFromDOM();
            if (chapters.length === 0) throw new Error('未找到任何章节信息');

            const users = await aggregateData(chapters);
            if (users.length === 0) throw new Error('未获取到任何用户数据');

            rankingState.users = users;
            rankingState.chapters = chapters;

            const card = overlay.querySelector('.goj-rank-card-v50');
            const activeUsers = computeActiveUsers();

            // 更新副标题
            const subtitle = card.querySelector('.goj-rank-subtitle-v50');
            const activeCount = chapters.length - blockedChapters.size;
            subtitle.textContent = `有效专题 ${activeCount}/${chapters.length} · ${activeUsers.length} 位参与者`;

            // 移除 loading
            const loading = card.querySelector('.goj-loading-v50');
            if (loading) loading.remove();

            // 插入屏蔽栏 + 表格
            card.appendChild(buildBlockedBar());
            card.appendChild(buildTable(activeUsers, chapters));

            // 初始化 previousTotals
            activeUsers.forEach(u => rankingState.previousTotals.set(u.uid, u.activeTotal));

        } catch (err) {
            console.error('[GOJ Rank]', err);
            const loading = overlay.querySelector('.goj-loading-v50');
            if (loading) {
                loading.innerHTML = `
                    <div style="color: #fb7185; font-size: 20px;">❌ 读取失败</div>
                    <div style="margin-top: 15px; color: rgba(255,255,255,.7);">${err.message}</div>
                `;
            }
        }
    }

    /************************************************************
     * 初始化
     ************************************************************/
    function init() {
        injectStyle();
        if (document.getElementById('goj-rank-btn-v50')) return;

        const btn = document.createElement('button');
        btn.id = 'goj-rank-btn-v50';
        btn.textContent = '📊 总排名';
        btn.addEventListener('click', async () => {
            btn.disabled = true;
            btn.textContent = '⏳ 加载中...';
            await showRanking();
            btn.disabled = false;
            btn.textContent = '📊 总排名';
        });

        document.body.appendChild(btn);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();