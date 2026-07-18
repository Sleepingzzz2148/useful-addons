// ==UserScript==
// @name         GOJ Hydro OI 查分式成绩展示页
// @namespace    https://www.goj.wiki/
// @version      2.2.0
// @description  GOJ/Hydro 比赛结束后以 OI 查分式流程展示成绩：先逐题分数，再总分排名
// @author       Sleepingzzz2148
// @match        https://www.goj.wiki/d/*/contest/*
// @match        http://www.goj.wiki/d/*/contest/*
// @match        https://goj.wiki/d/*/contest/*
// @match        http://goj.wiki/d/*/contest/*
// @license      All Rights Reserved
// @homepageURL  https://github.com/Sleepingzzz2148/useful-addons
// @supportURL   https://github.com/Sleepingzzz2148/useful-addons/issues
// @downloadURL  https://github.com/Sleepingzzz2148/useful-addons/releases/latest/download/goj-score-display.user.js
// @updateURL    https://github.com/Sleepingzzz2148/useful-addons/releases/latest/download/goj-score-display.user.js
// @grant        none
// @run-at       document-idle
// ==/UserScript==

/*
 * Copyright (c) 2026 Sleeping_zzz
 *
 * All rights reserved.
 *
 * This project and its userscripts are provided for personal use only.
 *
 * You may:
 * - install and use the userscripts for personal use;
 * - report bugs or suggest improvements;
 * - share the original GitHub repository link.
 *
 * You may not:
 * - modify and redistribute;
 * - reupload to other platforms;
 * - remove author attribution;
 * - use for commercial purposes;
 * - republish under a different name.
 */

(function () {
    'use strict';

    /************************************************************
     * 配置区
     ************************************************************/

    // 是否检测到“已结束”后自动弹出
    const AUTO_SHOW_WHEN_ENDED = false;

    // 是否显示右下角按钮
    const SHOW_FLOAT_BUTTON = true;

    // 只想在某个比赛生效就填比赛 ID
    // 例如：const ONLY_CONTEST_ID = '69f60f3db56d3952f3110018';
    // 留空表示所有比赛页面生效
    const ONLY_CONTEST_ID = '';

    // OI 一般每题满分 100
    const DEFAULT_MAX_SCORE = 100;

    // 快捷键 Ctrl + Alt + R
    const HOTKEY_KEY = 'r';

    /************************************************************
     * 基础信息
     ************************************************************/

    const contestInfo = getContestInfoFromUrl();

    if (!contestInfo) return;

    if (ONLY_CONTEST_ID && contestInfo.contestId !== ONLY_CONTEST_ID) return;

    let showing = false;

    /************************************************************
     * 样式
     ************************************************************/

    function injectStyle() {
        if (document.getElementById('goj-result-page-style-v22')) return;

        const style = document.createElement('style');
        style.id = 'goj-result-page-style-v22';

        style.textContent = `
            #goj-result-overlay-v2 {
                position: fixed;
                inset: 0;
                z-index: 2147483647;
                overflow: auto;
                color: #fff;
                background:
                    radial-gradient(circle at 10% 10%, rgba(56, 189, 248, 0.35), transparent 28%),
                    radial-gradient(circle at 88% 18%, rgba(244, 114, 182, 0.28), transparent 28%),
                    radial-gradient(circle at 50% 92%, rgba(34, 197, 94, 0.18), transparent 32%),
                    linear-gradient(135deg, #020617, #111827 48%, #1e1b4b);
                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto,
                             "Helvetica Neue", Arial, "Noto Sans SC", "Microsoft YaHei", sans-serif;
                animation: gojResultOverlayIn .45s ease forwards;
            }

            #goj-result-overlay-v2 * {
                box-sizing: border-box;
            }

            .goj-result-shell-v2 {
                width: min(1050px, calc(100vw - 32px));
                min-height: 100vh;
                margin: 0 auto;
                padding: 54px 0 80px;
                display: flex;
                align-items: center;
                justify-content: center;
            }

            .goj-result-card-v2 {
                width: 100%;
                border-radius: 32px;
                padding: 38px;
                background: rgba(15, 23, 42, 0.76);
                border: 1px solid rgba(255, 255, 255, 0.16);
                backdrop-filter: blur(22px);
                -webkit-backdrop-filter: blur(22px);
                box-shadow:
                    0 30px 120px rgba(0, 0, 0, .5),
                    inset 0 1px 0 rgba(255, 255, 255, .1);
                animation: gojResultCardIn .65s cubic-bezier(.18,.89,.32,1.25) forwards;
            }

            .goj-result-close-v2 {
                position: fixed;
                right: 24px;
                top: 22px;
                z-index: 2147483647;
                border: 1px solid rgba(255,255,255,.24);
                border-radius: 999px;
                padding: 10px 17px;
                color: #fff;
                background: rgba(255,255,255,.13);
                cursor: pointer;
                font-size: 14px;
                backdrop-filter: blur(14px);
                transition: .2s ease;
            }

            .goj-result-close-v2:hover {
                transform: scale(1.05);
                background: rgba(255,255,255,.24);
            }

            .goj-result-header-v2 {
                text-align: center;
                margin-bottom: 34px;
                opacity: 0;
                transform: translateY(18px);
                animation: gojBlockUp .7s ease forwards .15s;
            }

            .goj-result-kicker-v2 {
                display: inline-flex;
                align-items: center;
                gap: 8px;
                margin-bottom: 14px;
                padding: 7px 14px;
                border-radius: 999px;
                background: rgba(59, 130, 246, .16);
                border: 1px solid rgba(147, 197, 253, .25);
                color: #bfdbfe;
                font-weight: 700;
                font-size: 14px;
            }

            .goj-result-title-v2 {
                margin: 0;
                font-size: clamp(34px, 6vw, 70px);
                font-weight: 1000;
                letter-spacing: .04em;
                line-height: 1.15;
                background: linear-gradient(90deg, #fff, #93c5fd, #f9a8d4, #fde68a, #fff);
                background-size: 320% auto;
                -webkit-background-clip: text;
                background-clip: text;
                color: transparent;
                animation: gojTextShine 3.2s linear infinite;
            }

            .goj-result-user-v2 {
                margin-top: 18px;
                font-size: clamp(18px, 2.5vw, 28px);
                color: rgba(255,255,255,.82);
            }

            .goj-result-user-v2 strong {
                color: #e0f2fe;
                font-weight: 900;
            }

            .goj-result-stats-v2 {
                display: grid;
                grid-template-columns: repeat(3, 1fr);
                gap: 18px;
                margin-bottom: 28px;
            }

            .goj-final-stats-v2 {
                margin-top: 34px;
            }

            .goj-stat-v2 {
                opacity: 0;
                transform: translateY(18px) scale(.97);
                border-radius: 24px;
                padding: 24px 18px;
                text-align: center;
                background: rgba(255,255,255,.08);
                border: 1px solid rgba(255,255,255,.13);
                animation: gojBlockUp .65s ease forwards;
            }

            .goj-stat-label-v2 {
                color: rgba(255,255,255,.6);
                font-size: 14px;
                margin-bottom: 8px;
            }

            .goj-stat-value-v2 {
                font-size: clamp(30px, 5vw, 54px);
                font-weight: 1000;
                color: #fff;
            }

            .goj-total-score-v2 {
                color: #fef08a;
                text-shadow: 0 0 30px rgba(250, 204, 21, .22);
            }

            .goj-rank-value-v2 {
                color: #fde68a;
            }

            .goj-level-badge-v2 {
                display: inline-flex;
                align-items: center;
                justify-content: center;
                width: 66px;
                height: 66px;
                border-radius: 20px;
                font-size: 38px;
                font-weight: 1000;
                color: #111827;
                background: linear-gradient(135deg, #facc15, #fb7185);
                box-shadow: 0 12px 38px rgba(250, 204, 21, .28);
            }

            .goj-problem-list-v2 {
                display: flex;
                flex-direction: column;
                gap: 15px;
                margin-top: 22px;
            }

            .goj-problem-item-v2 {
                opacity: 0;
                transform: translateY(24px);
                display: grid;
                grid-template-columns: 76px 1fr 180px 132px;
                gap: 18px;
                align-items: center;
                padding: 19px 22px;
                border-radius: 22px;
                background: rgba(255,255,255,.075);
                border: 1px solid rgba(255,255,255,.12);
                animation: gojProblemIn .58s ease forwards;
            }

            .goj-problem-letter-v2 {
                width: 52px;
                height: 52px;
                display: flex;
                align-items: center;
                justify-content: center;
                border-radius: 17px;
                font-size: 26px;
                font-weight: 1000;
                color: #bfdbfe;
                background: rgba(59, 130, 246, .18);
                border: 1px solid rgba(147, 197, 253, .35);
            }

            .goj-problem-name-v2 {
                font-size: 19px;
                font-weight: 850;
                color: rgba(255,255,255,.95);
                overflow: hidden;
                text-overflow: ellipsis;
                white-space: nowrap;
            }

            .goj-problem-status-v2 {
                margin-top: 5px;
                font-size: 13px;
                color: rgba(255,255,255,.58);
            }

            .goj-bar-wrap-v2 {
                height: 13px;
                border-radius: 999px;
                overflow: hidden;
                background: rgba(255,255,255,.13);
            }

            .goj-bar-v2 {
                width: 0;
                height: 100%;
                border-radius: 999px;
                background: linear-gradient(90deg, #22c55e, #84cc16, #facc15);
                animation: gojBarGrowV2 .95s ease forwards;
            }

            .goj-score-v2 {
                text-align: right;
                font-size: 26px;
                font-weight: 1000;
            }

            .goj-score-v2 small {
                font-size: 14px;
                color: rgba(255,255,255,.52);
                font-weight: 700;
            }

            .goj-score-perfect-v2 {
                color: #4ade80;
            }

            .goj-score-partial-v2 {
                color: #facc15;
            }

            .goj-score-zero-v2 {
                color: #fb7185;
            }

            .goj-summary-v2 {
                opacity: 0;
                transform: translateY(22px);
                margin-top: 30px;
                padding: 26px 28px;
                border-radius: 24px;
                background: linear-gradient(135deg, rgba(59,130,246,.18), rgba(236,72,153,.16));
                border: 1px solid rgba(255,255,255,.15);
                animation: gojBlockUp .75s ease forwards;
            }

            .goj-summary-title-v2 {
                font-size: 23px;
                font-weight: 1000;
                margin-bottom: 10px;
            }

            .goj-summary-text-v2 {
                font-size: 17px;
                line-height: 1.8;
                color: rgba(255,255,255,.84);
            }

            .goj-result-tip-v2 {
                margin-top: 22px;
                text-align: center;
                color: rgba(255,255,255,.48);
                font-size: 14px;
            }

            #goj-result-float-btn-v2 {
                position: fixed;
                right: 24px;
                bottom: 28px;
                z-index: 99999;
                border: none;
                border-radius: 999px;
                padding: 12px 18px;
                color: white;
                cursor: pointer;
                font-weight: 800;
                background: linear-gradient(135deg, #2563eb, #db2777);
                box-shadow: 0 12px 34px rgba(37,99,235,.35);
                transition: .2s ease;
            }

            #goj-result-float-btn-v2:hover {
                transform: translateY(-2px) scale(1.04);
            }

            .goj-loading-v2 {
                text-align: center;
                padding: 80px 20px;
                font-size: 24px;
                font-weight: 900;
                color: rgba(255,255,255,.85);
            }

            @media (max-width: 800px) {
                .goj-result-card-v2 {
                    padding: 28px 18px;
                }

                .goj-result-stats-v2 {
                    grid-template-columns: 1fr;
                }

                .goj-problem-item-v2 {
                    grid-template-columns: 58px 1fr;
                }

                .goj-bar-wrap-v2,
                .goj-score-v2 {
                    grid-column: 2;
                }

                .goj-score-v2 {
                    text-align: left;
                }
            }

            @keyframes gojResultOverlayIn {
                from { opacity: 0; }
                to { opacity: 1; }
            }

            @keyframes gojResultOverlayOut {
                from { opacity: 1; }
                to { opacity: 0; }
            }

            @keyframes gojResultCardIn {
                from {
                    opacity: 0;
                    transform: scale(.94) translateY(24px);
                }
                to {
                    opacity: 1;
                    transform: scale(1) translateY(0);
                }
            }

            @keyframes gojBlockUp {
                to {
                    opacity: 1;
                    transform: translateY(0) scale(1);
                }
            }

            @keyframes gojProblemIn {
                to {
                    opacity: 1;
                    transform: translateY(0);
                }
            }

            @keyframes gojBarGrowV2 {
                from { width: 0; }
                to { width: var(--target-width); }
            }

            @keyframes gojTextShine {
                from { background-position: 0% center; }
                to { background-position: 320% center; }
            }
        `;

        document.head.appendChild(style);
    }

    /************************************************************
     * 工具函数
     ************************************************************/

    function getContestInfoFromUrl() {
        const match = location.pathname.match(/^\/d\/([^/]+)\/contest\/([^/]+)/);
        if (!match) return null;

        return {
            domainId: match[1],
            contestId: match[2],
            basePath: `/d/${match[1]}/contest/${match[2]}`,
            scoreboardPath: `/d/${match[1]}/contest/${match[2]}/scoreboard`,
            problemsPath: `/d/${match[1]}/contest/${match[2]}/problems`
        };
    }

    function cleanText(text) {
        return String(text || '').replace(/\s+/g, ' ').trim();
    }

    function parseNumber(text) {
        const match = cleanText(text).match(/-?\d+(\.\d+)?/);
        return match ? Number(match[0]) : 0;
    }

    function escapeHtml(str) {
        return String(str)
            .replaceAll('&', '&amp;')
            .replaceAll('<', '&lt;')
            .replaceAll('>', '&gt;')
            .replaceAll('"', '&quot;')
            .replaceAll("'", '&#039;');
    }

    function formatNumber(num) {
        const n = Number(num);
        if (Number.isNaN(n)) return String(num);
        return Number.isInteger(n) ? String(n) : n.toFixed(1);
    }

    function getCurrentUid(doc = document) {
        const navUser = doc.querySelector('.nav__list--secondary a[href*="/user/"]');
        if (navUser) {
            const m = navUser.getAttribute('href')?.match(/\/user\/(\d+)/);
            if (m) return m[1];
        }

        const anyUser = doc.querySelector('a[href*="/user/"]');
        if (anyUser) {
            const m = anyUser.getAttribute('href')?.match(/\/user\/(\d+)/);
            if (m) return m[1];
        }

        return '';
    }

    function getCurrentUsername(doc = document) {
        const navUser = doc.querySelector('.nav__list--secondary .user-profile-link span[class*="uname--"]');
        if (navUser) return cleanText(navUser.innerText);

        const user = doc.querySelector('.nav__list--secondary a[href*="/user/"]');
        if (user) return cleanText(user.innerText).replace('expand_more', '').trim();

        return '当前用户';
    }

    function getContestTitle(doc = document) {
        try {
            const scripts = Array.from(doc.querySelectorAll('script'));
            for (const script of scripts) {
                const text = script.textContent || '';
                const m = text.match(/window\.UiContextNew\s*=\s*'([^']+)'/);
                if (m) {
                    const jsonText = m[1]
                        .replace(/\\u([0-9a-fA-F]{4})/g, (_, code) => String.fromCharCode(parseInt(code, 16)))
                        .replace(/\\"/g, '"')
                        .replace(/\\\\/g, '\\');

                    const obj = JSON.parse(jsonText);
                    if (obj?.tdoc?.title) return obj.tdoc.title;
                }
            }
        } catch (e) {}

        const link = Array.from(doc.querySelectorAll('a.nav__item'))
            .find(a =>
                a.href.includes(contestInfo.basePath) &&
                !a.href.includes('/problems') &&
                !a.href.includes('/scoreboard')
            );

        if (link) return cleanText(link.innerText);

        const side = doc.querySelector('.contest-sidebar__bg h1');
        if (side) return cleanText(side.innerText);

        return '模拟赛';
    }

    function getAttendCount(doc = document) {
        const dts = Array.from(doc.querySelectorAll('dt'));
        for (const dt of dts) {
            if (cleanText(dt.innerText) === '参赛人数') {
                const dd = dt.nextElementSibling;
                if (dd) return parseNumber(dd.innerText);
            }
        }

        return '?';
    }

    function isContestEnded(doc = document) {
        return cleanText(doc.body.innerText).includes('已结束');
    }

    async function loadDocumentByPath(path) {
        const res = await fetch(path, {
            credentials: 'include',
            cache: 'no-store'
        });

        const html = await res.text();

        console.log('[GOJ Result] fetch', path, res.status);

        return new DOMParser().parseFromString(html, 'text/html');
    }

    /************************************************************
     * 成绩读取
     ************************************************************/

    async function extractResult() {
        const contestTitle = getContestTitle(document);
        const uid = getCurrentUid(document);
        const username = getCurrentUsername(document);
        const attendCount = getAttendCount(document);

        let scoreboardDoc = null;

        if (location.pathname.endsWith('/scoreboard')) {
            scoreboardDoc = document;
        } else {
            try {
                scoreboardDoc = await loadDocumentByPath(contestInfo.scoreboardPath);
            } catch (e) {
                console.warn('[GOJ Result] scoreboard fetch failed', e);
            }
        }

        if (scoreboardDoc) {
            const fromScoreboard = extractFromScoreboard(scoreboardDoc, {
                contestTitle,
                uid,
                username,
                attendCount
            });

            if (fromScoreboard) return fromScoreboard;
        }

        console.warn('[GOJ Result] fallback to problems page');

        return extractFromProblemsPage(document, {
            contestTitle,
            uid,
            username,
            attendCount
        });
    }

    function extractFromScoreboard(doc, base) {
        const allTables = Array.from(doc.querySelectorAll('table.data-table'));

        const headerTable = allTables.find(table => {
            return table.querySelector('th.col--rank') &&
                   table.querySelector('th.col--user') &&
                   table.querySelector('th.col--total_score') &&
                   table.querySelector('th.col--problem');
        });

        const bodyTable = allTables.find(table => {
            return table.querySelector('td.col--rank') &&
                   table.querySelector('td.col--user') &&
                   table.querySelector('td.col--total_score') &&
                   table.querySelector('td.col--problem');
        });

        if (!headerTable || !bodyTable) {
            console.warn('[GOJ Result] scoreboard tables not found');
            return null;
        }

        const problemHeaders = Array.from(headerTable.querySelectorAll('th.col--problem'));

        const problemMeta = problemHeaders.map((th, index) => {
            const a = th.querySelector('a');
            const raw = cleanText(a ? a.innerText : th.innerText);
            const labelMatch = raw.match(/[A-Z]/);
            const label = labelMatch ? labelMatch[0] : String.fromCharCode(65 + index);
            const title = a?.getAttribute('data-tooltip') || `第 ${label} 题`;

            return {
                label,
                title
            };
        });

        const rows = Array.from(bodyTable.querySelectorAll('tbody tr'));

        let userRow = null;

        if (base.uid) {
            userRow = rows.find(row => {
                return row.querySelector(`button.user--${base.uid}`) ||
                       row.querySelector(`[data-uid="${base.uid}"]`) ||
                       row.querySelector(`a[href$="/user/${base.uid}"]`);
            });
        }

        if (!userRow && base.username) {
            userRow = rows.find(row => {
                const name = cleanText(row.querySelector('.col--user')?.innerText);
                return name.includes(base.username);
            });
        }

        if (!userRow) {
            userRow = rows.find(row => row.classList.contains('star-highlight'));
        }

        if (!userRow) {
            console.warn('[GOJ Result] current user row not found');
            return null;
        }

        const rank = cleanText(userRow.querySelector('.col--rank')?.innerText || '?');
        const totalScore = parseNumber(userRow.querySelector('.col--total_score')?.innerText || '0');

        const usernameInRow =
            cleanText(userRow.querySelector('.col--user span[class*="uname--"]')?.innerText) ||
            base.username;

        const problemCells = Array.from(userRow.querySelectorAll('td.col--problem'));

        const problems = problemCells.map((td, index) => {
            const meta = problemMeta[index] || {
                label: String.fromCharCode(65 + index),
                title: `第 ${String.fromCharCode(65 + index)} 题`
            };

            const score = extractOfficialScoreFromProblemCell(td);

            return {
                label: meta.label,
                title: meta.title,
                score,
                maxScore: DEFAULT_MAX_SCORE,
                status: getStatusByScore(score, DEFAULT_MAX_SCORE)
            };
        });

        return {
            contestTitle: base.contestTitle,
            username: usernameInRow,
            uid: base.uid,
            rank,
            attendCount: base.attendCount,
            totalScore,
            problems
        };
    }

    function extractOfficialScoreFromProblemCell(td) {
        const text = cleanText(td.innerText);

        if (!text || text === '-') return 0;

        // OI 正式成绩取斜杠前面的第一个分数
        // 例如：61 / 100，正式成绩为 61，后面的 100 是补题成绩
        const beforeSlash = text.split('/')[0];

        return parseNumber(beforeSlash);
    }

    function extractFromProblemsPage(doc, base) {
        const problemRows = Array.from(doc.querySelectorAll('.section__table-container table.data-table tbody tr'))
            .filter(row => row.querySelector('td.col--problem'));

        const problems = [];

        for (const row of problemRows) {
            const problemCell = row.querySelector('td.col--problem');
            const statusCell = row.querySelector('td.col--status:not(.col--correction)');

            if (!problemCell || !statusCell) continue;

            const link = problemCell.querySelector('a[href*="/p/"]');
            if (!link) continue;

            const b = link.querySelector('b');
            const label = cleanText(b?.innerText || String.fromCharCode(65 + problems.length));

            let title = cleanText(link.innerText);
            title = title.replace(label, '').trim();

            const score = parseNumber(statusCell.innerText);

            problems.push({
                label,
                title: title || `第 ${label} 题`,
                score,
                maxScore: DEFAULT_MAX_SCORE,
                status: getStatusByScore(score, DEFAULT_MAX_SCORE)
            });
        }

        const totalScore = problems.reduce((sum, p) => sum + p.score, 0);

        return {
            contestTitle: base.contestTitle,
            username: base.username,
            uid: base.uid,
            rank: '?',
            attendCount: base.attendCount,
            totalScore,
            problems
        };
    }

    function getStatusByScore(score, maxScore) {
        if (score >= maxScore) return 'Accepted / 满分';
        if (score > 0) return '部分分';
        return '未得分';
    }

    function getScoreClass(score, maxScore) {
        if (score >= maxScore) return 'goj-score-perfect-v2';
        if (score > 0) return 'goj-score-partial-v2';
        return 'goj-score-zero-v2';
    }

    function getSummary(result) {
        const maxTotal = result.problems.reduce((sum, p) => sum + p.maxScore, 0) || 1;
        const rate = result.totalScore / maxTotal;

        const ac = result.problems.filter(p => p.score >= p.maxScore).length;
        const partial = result.problems.filter(p => p.score > 0 && p.score < p.maxScore).length;
        const zero = result.problems.filter(p => p.score <= 0).length;

        let level = 'D';
        let comment = '不要气馁，赛后补题才是进步的关键。';

        if (rate >= 0.95) {
            level = 'S';
            comment = '太强了！这场发挥非常稳，已经接近 AK 级别。';
        } else if (rate >= 0.8) {
            level = 'A';
            comment = '表现优秀，大部分题目都处理得很好。';
        } else if (rate >= 0.6) {
            level = 'B';
            comment = '发挥不错，继续复盘失分题会有明显提升。';
        } else if (rate >= 0.3) {
            level = 'C';
            comment = '有一定收获，建议重点补齐薄弱题型。';
        }

        const rankText = result.rank && result.rank !== '?'
            ? `最终排名第 ${result.rank}${result.attendCount && result.attendCount !== '?' ? ` / ${result.attendCount}` : ''}。`
            : `当前页面未读取到排名。`;

        return {
            level,
            text: `${rankText}${comment} 本场共 ${result.problems.length} 题，满分 ${ac} 题，部分分 ${partial} 题，未得分 ${zero} 题。`
        };
    }

    /************************************************************
     * 展示页面
     ************************************************************/

    async function showResultPage() {
        if (showing) return;
        showing = true;

        injectStyle();

        const overlay = document.createElement('div');
        overlay.id = 'goj-result-overlay-v2';

        overlay.innerHTML = `
            <button class="goj-result-close-v2">关闭</button>
            <div class="goj-result-shell-v2">
                <div class="goj-result-card-v2">
                    <div class="goj-loading-v2">正在连接查分系统...</div>
                </div>
            </div>
        `;

        document.body.appendChild(overlay);

        const closeBtn = overlay.querySelector('.goj-result-close-v2');

        function close() {
            overlay.style.animation = 'gojResultOverlayOut .35s ease forwards';
            setTimeout(() => {
                overlay.remove();
                showing = false;
            }, 350);
        }

        closeBtn.addEventListener('click', close);

        const escHandler = e => {
            if (e.key === 'Escape') {
                close();
                document.removeEventListener('keydown', escHandler);
            }
        };

        document.addEventListener('keydown', escHandler);

        try {
            const result = await extractResult();

            console.log('[GOJ Result] final result:', result);

            const summary = getSummary(result);

            renderResult(overlay, result, summary);
        } catch (err) {
            console.error('[GOJ Result Page]', err);

            overlay.querySelector('.goj-result-card-v2').innerHTML = `
                <div class="goj-loading-v2">
                    读取成绩失败<br>
                    <div style="font-size:15px;margin-top:14px;color:rgba(255,255,255,.62);">
                        ${escapeHtml(err.message || String(err))}
                    </div>
                </div>
            `;
        }
    }

    function renderResult(overlay, result, summary) {
        const card = overlay.querySelector('.goj-result-card-v2');

        card.innerHTML = `
            <div class="goj-result-header-v2">
                <div class="goj-result-kicker-v2">赛后查分现场</div>
                <h1 class="goj-result-title-v2">${escapeHtml(result.contestTitle)}</h1>
                <div class="goj-result-user-v2">
                    参赛选手：<strong>${escapeHtml(result.username)}</strong>
                </div>
            </div>

            <div class="goj-problem-list-v2"></div>

            <div class="goj-result-stats-v2 goj-final-stats-v2">
                <div class="goj-stat-v2">
                    <div class="goj-stat-label-v2">最终总分</div>
                    <div class="goj-stat-value-v2 goj-total-score-v2">${escapeHtml(formatNumber(result.totalScore))}</div>
                </div>

                <div class="goj-stat-v2">
                    <div class="goj-stat-label-v2">最终排名</div>
                    <div class="goj-stat-value-v2 goj-rank-value-v2">#${escapeHtml(result.rank)}</div>
                </div>

                <div class="goj-stat-v2">
                    <div class="goj-stat-label-v2">查分评级</div>
                    <div class="goj-level-badge-v2">${escapeHtml(summary.level)}</div>
                </div>
            </div>

            <div class="goj-summary-v2">
                <div class="goj-summary-title-v2">总结</div>
                <div class="goj-summary-text-v2">${escapeHtml(summary.text)}</div>
            </div>

            <div class="goj-result-tip-v2">
                按 Esc 关闭，按 Ctrl + Alt + R 可再次打开
            </div>
        `;

        const list = card.querySelector('.goj-problem-list-v2');

        /**
         * OI 查分节奏：
         * 先 A、B、C、D 逐题出现；
         * 所有题目出完后，再揭晓总分和排名。
         */
        const firstProblemDelay = 1.15;
        const problemInterval = 1.05;

        result.problems.forEach((p, index) => {
            const percent = p.maxScore > 0
                ? Math.max(0, Math.min(100, p.score / p.maxScore * 100))
                : 0;

            const delay = firstProblemDelay + index * problemInterval;
            const scoreClass = getScoreClass(p.score, p.maxScore);

            const item = document.createElement('div');
            item.className = 'goj-problem-item-v2';
            item.style.animationDelay = `${delay}s`;

            item.innerHTML = `
                <div class="goj-problem-letter-v2">${escapeHtml(p.label)}</div>

                <div>
                    <div class="goj-problem-name-v2">${escapeHtml(p.title)}</div>
                    <div class="goj-problem-status-v2">${escapeHtml(p.status)}</div>
                </div>

                <div class="goj-bar-wrap-v2">
                    <div class="goj-bar-v2"
                         style="--target-width:${percent}%; animation-delay:${delay + 0.18}s;"></div>
                </div>

                <div class="goj-score-v2 ${scoreClass}">
                    ${escapeHtml(formatNumber(p.score))}
                    <small>/ ${escapeHtml(formatNumber(p.maxScore))}</small>
                </div>
            `;

            list.appendChild(item);
        });

        /**
         * 最后一题出现后，故意停顿一下，再揭晓最终信息。
         */
        const finalStatsDelay = firstProblemDelay + result.problems.length * problemInterval + 0.85;

        const stats = Array.from(card.querySelectorAll('.goj-final-stats-v2 .goj-stat-v2'));

        stats.forEach((stat, index) => {
            stat.style.animationDelay = `${finalStatsDelay + index * 0.38}s`;
        });

        const summaryBox = card.querySelector('.goj-summary-v2');
        summaryBox.style.animationDelay = `${finalStatsDelay + 1.55}s`;
    }

    /************************************************************
     * 触发
     ************************************************************/

    document.addEventListener('keydown', e => {
        if (e.ctrlKey && e.altKey && e.key.toLowerCase() === HOTKEY_KEY) {
            e.preventDefault();
            showResultPage();
        }
    });

    if (SHOW_FLOAT_BUTTON) {
        injectStyle();

        if (!document.getElementById('goj-result-float-btn-v2')) {
            const btn = document.createElement('button');
            btn.id = 'goj-result-float-btn-v2';
            btn.textContent = '展示成绩';
            btn.addEventListener('click', showResultPage);
            document.body.appendChild(btn);
        }
    }

    if (AUTO_SHOW_WHEN_ENDED) {
        let autoShown = false;

        setInterval(() => {
            if (!autoShown && isContestEnded(document)) {
                autoShown = true;
                showResultPage();
            }
        }, 3000);
    }

})();