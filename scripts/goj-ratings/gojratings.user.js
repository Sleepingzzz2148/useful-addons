// ==UserScript==
// @name         GOJ AtCoder Rating
// @namespace    https://www.goj.wiki/
// @version      1.1.1
// @description  在 GOJ 比赛榜单和用户页显示本地 AtCoder 风格 rating、performance、rating 曲线与批量导入工具
// @author       Sleeping_zzz2148
// @match        https://www.goj.wiki/*
// @match        http://www.goj.wiki/*
// @match        https://goj.wiki/*
// @match        http://goj.wiki/*
// @license      All Rights Reserved
// @homepageURL  https://github.com/Sleepingzzz2148/useful-addons
// @supportURL   https://github.com/Sleepingzzz2148/useful-addons/issues
// @downloadURL  https://github.com/Sleepingzzz2148/useful-addons/releases/latest/download/gojratings.user.js
// @updateURL    https://github.com/Sleepingzzz2148/useful-addons/releases/latest/download/gojratings.user.js
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
 * You may not, without explicit written permission from the author:
 * - copy and redistribute the userscripts;
 * - modify and publish modified versions;
 * - remove or alter copyright notices;
 * - publish the userscripts on other platforms;
 * - sell, rent, sublicense, or use the userscripts for commercial purposes.
 *
 * For permission requests, please contact the author.
 */

(function () {
    'use strict';

    /**
     * GOJ AtCoder Rating userscript.
     *
     * Built-in console API:
     *   window.GOJAtCoderRating.exportData()
     *   window.GOJAtCoderRating.importData(jsonOrObject)
     *   window.GOJAtCoderRating.recalculate()
     *   window.GOJAtCoderRating.reset()
     *
     * Data is stored only in localStorage under key goj_atcoder_rating_db_v1.
     */

    const STORAGE_KEY = 'goj_atcoder_rating_db_v1';
    const DB_VERSION = 1;
    const CENTER = 1000;
    const RATED_BOUND = 3999;
    const PERF_LOW = -10000;
    const PERF_HIGH = 10000;
    const SCRIPT_PREFIX = 'goj-acr';
    const LOG_PREFIX = '[GOJ AtCoder Rating]';

    const state = {
        applying: false,
        scheduled: false,
        cssInjected: false,
        observer: null,
        batchAdding: false,
    };

    function warn(...args) { console.warn(LOG_PREFIX, ...args); }
    function error(...args) { console.error(LOG_PREFIX, ...args); }

    function isFiniteNumber(x) { return typeof x === 'number' && Number.isFinite(x); }
    function clampFinite(x, fallback) { return isFiniteNumber(x) ? x : fallback; }
    function roundInt(x, fallback = 0) { return Math.round(clampFinite(x, fallback)); }
    function text(el) { return (el && el.textContent ? el.textContent : '').trim(); }

    function defaultDb() {
        return { version: DB_VERSION, contests: {}, records: {}, userStates: {} };
    }

    function normalizeDb(raw) {
        const db = raw && typeof raw === 'object' ? raw : defaultDb();
        if (!db.version) db.version = DB_VERSION;
        if (!db.contests || typeof db.contests !== 'object') db.contests = {};
        if (!db.records || typeof db.records !== 'object') db.records = {};
        if (!db.userStates || typeof db.userStates !== 'object') db.userStates = {};
        return db;
    }

    function loadDb() {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (!raw) return defaultDb();
            return normalizeDb(JSON.parse(raw));
        } catch (e) {
            error('Failed to load localStorage database.', e);
            return defaultDb();
        }
    }

    function saveDb(db) {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(normalizeDb(db)));
            return true;
        } catch (e) {
            error('Failed to save localStorage database.', e);
            return false;
        }
    }

    function resetDb() {
        const db = defaultDb();
        saveDb(db);
        scheduleApply();
        return db;
    }

    function safeDate(ts) {
        const n = Number(ts);
        if (Number.isFinite(n) && n > 0) return n;
        return Date.now();
    }

    function parseNumber(s, fallback = 0) {
        if (s == null) return fallback;
        const m = String(s).replace(/,/g, '').match(/-?\d+(?:\.\d+)?/);
        if (!m) return fallback;
        const n = Number(m[0]);
        return Number.isFinite(n) ? n : fallback;
    }

    function parseRank(s, fallback) {
        const n = parseNumber(s, NaN);
        return Number.isFinite(n) ? n : fallback;
    }

    function cssRatingClass(rating) {
        const r = Number(rating) || 0;
        if (r >= 2800) return 'red';
        if (r >= 2400) return 'orange';
        if (r >= 2000) return 'yellow';
        if (r >= 1600) return 'blue';
        if (r >= 1200) return 'cyan';
        if (r >= 800) return 'green';
        if (r >= 400) return 'brown';
        return 'gray';
    }

    function injectCss() {
        if (state.cssInjected || document.getElementById(`${SCRIPT_PREFIX}-style`)) return;
        const style = document.createElement('style');
        style.id = `${SCRIPT_PREFIX}-style`;
        style.textContent = `
            .${SCRIPT_PREFIX}-badge{display:inline-block;margin-left:.35em;padding:.05em .35em;border-radius:.35em;font-size:12px;line-height:1.35;font-weight:700;color:#fff;vertical-align:middle}.${SCRIPT_PREFIX}-badge.gray{background:#808080}.${SCRIPT_PREFIX}-badge.brown{background:#8c6239}.${SCRIPT_PREFIX}-badge.green{background:#3b8b3b}.${SCRIPT_PREFIX}-badge.cyan{background:#00a3a3}.${SCRIPT_PREFIX}-badge.blue{background:#3157d5}.${SCRIPT_PREFIX}-badge.yellow{background:#b59b00}.${SCRIPT_PREFIX}-badge.orange{background:#f08200}.${SCRIPT_PREFIX}-badge.red{background:#d32f2f}
                        .section__table-container{overflow-x:auto}table.data-table,table.section__table-header{table-layout:auto;width:max-content;min-width:100%}table.data-table td.col--user,table.section__table-header th.col--user{min-width:18em;max-width:none;white-space:nowrap}.col--${SCRIPT_PREFIX}-delta{white-space:nowrap;text-align:right;min-width:9.5em}.col--${SCRIPT_PREFIX}-perf{white-space:nowrap;text-align:right;min-width:6em}.${SCRIPT_PREFIX}-chart{margin:0 0 1em 0}.${SCRIPT_PREFIX}-chart .section__body{padding:1em}.${SCRIPT_PREFIX}-chart-toolbar{display:flex;align-items:center;gap:.6em;margin:.35em 0 1.4em 0;flex-wrap:wrap;color:#9aa4b2;font-size:13px}.${SCRIPT_PREFIX}-chart-toolbar input[type="range"]{width:220px;max-width:100%}.${SCRIPT_PREFIX}-chart-viewport{position:relative;overflow-x:auto;overflow-y:visible;padding-bottom:.25em}.${SCRIPT_PREFIX}-chart svg{display:block;max-width:none;height:auto;background:#252b32;border-radius:2px}.${SCRIPT_PREFIX}-chart-empty{color:#888}.${SCRIPT_PREFIX}-axis{stroke:rgba(255,255,255,.62);stroke-width:1}.${SCRIPT_PREFIX}-line{fill:none;stroke:#d6d6d6;stroke-width:2}.${SCRIPT_PREFIX}-dot{stroke:#fff;stroke-width:1;cursor:pointer}.${SCRIPT_PREFIX}-hit{fill:transparent;stroke:transparent;cursor:pointer}.${SCRIPT_PREFIX}-grid{stroke:rgba(255,255,255,.42);stroke-width:1}.${SCRIPT_PREFIX}-band{stroke:none;opacity:.52}.${SCRIPT_PREFIX}-band.gray{fill:#7f7f7f}.${SCRIPT_PREFIX}-band.brown{fill:#8c6239}.${SCRIPT_PREFIX}-band.green{fill:#1f7a3d}.${SCRIPT_PREFIX}-band.cyan{fill:#1e8a8a}.${SCRIPT_PREFIX}-band.blue{fill:#242a8f}.${SCRIPT_PREFIX}-band.yellow{fill:#808a1e}.${SCRIPT_PREFIX}-band.orange{fill:#c8751a}.${SCRIPT_PREFIX}-band.red{fill:#b03a3a}.${SCRIPT_PREFIX}-chart-label{font-size:12px;fill:#c8d1dc}.${SCRIPT_PREFIX}-tooltip{position:absolute;z-index:10;display:none;min-width:180px;max-width:280px;padding:.55em .7em;border-radius:4px;background:rgba(17,24,39,.95);box-shadow:0 6px 18px rgba(0,0,0,.32);color:#f4f7fb;font-size:12px;line-height:1.45;pointer-events:none;white-space:normal}.${SCRIPT_PREFIX}-tooltip strong{display:block;margin-bottom:.25em;color:#fff}.${SCRIPT_PREFIX}-tooltip .${SCRIPT_PREFIX}-delta-pos{color:#59c36a}.${SCRIPT_PREFIX}-tooltip .${SCRIPT_PREFIX}-delta-neg{color:#ff6b7a}
                        .${SCRIPT_PREFIX}-delta-pos{color:#22863a;font-weight:700}.${SCRIPT_PREFIX}-delta-neg{color:#cb2431;font-weight:700}.${SCRIPT_PREFIX}-delta-zero{color:#666}.${SCRIPT_PREFIX}-unrated{color:#888;font-style:italic}
                        .${SCRIPT_PREFIX}-batch-bar{margin:0 0 .75em 0;padding:.75em 1em;border:1px solid rgba(255,255,255,.12);border-radius:4px;background:rgba(255,255,255,.04);display:flex;gap:.75em;align-items:center;flex-wrap:wrap}.${SCRIPT_PREFIX}-batch-status{color:#9aa4b2;font-size:13px}.${SCRIPT_PREFIX}-batch-status.error{color:#cb2431}.${SCRIPT_PREFIX}-batch-status.success{color:#22863a}.${SCRIPT_PREFIX}-batch-bar .button[disabled]{opacity:.62;cursor:not-allowed}

    `;
        style.textContent += `
            .${SCRIPT_PREFIX}-line.${SCRIPT_PREFIX}-line-main{stroke:#d6d6d6}.${SCRIPT_PREFIX}-line.${SCRIPT_PREFIX}-line-compare{stroke:#4ea1ff;stroke-dasharray:5 4}.${SCRIPT_PREFIX}-dot.${SCRIPT_PREFIX}-dot-compare{stroke:#4ea1ff;stroke-width:2}.${SCRIPT_PREFIX}-h2h-input{width:10em;max-width:42vw;padding:.2em .35em;border:1px solid rgba(255,255,255,.22);border-radius:3px;background:#1f252b;color:#dce5ef}.${SCRIPT_PREFIX}-h2h-input:disabled{opacity:.55}.${SCRIPT_PREFIX}-chart-legend{display:inline-flex;align-items:center;gap:.35em}.${SCRIPT_PREFIX}-chart-legend::before{content:"";display:inline-block;width:1.8em;height:0;border-top:2px solid currentColor}.${SCRIPT_PREFIX}-chart-legend-main{color:#d6d6d6}.${SCRIPT_PREFIX}-chart-legend-compare{color:#4ea1ff}.${SCRIPT_PREFIX}-chart-legend-compare::before{border-top-style:dashed}
            .${SCRIPT_PREFIX}-chart-title-row{display:flex;align-items:center;gap:.6em;flex-wrap:wrap}.${SCRIPT_PREFIX}-rank-btn{font-size:12px;line-height:1.35;padding:.25em .65em}.${SCRIPT_PREFIX}-rank-modal{position:fixed;inset:0;z-index:99999;display:none;align-items:center;justify-content:center;background:rgba(0,0,0,.55);padding:1.5em}.${SCRIPT_PREFIX}-rank-modal.is-open{display:flex}.${SCRIPT_PREFIX}-rank-dialog{width:min(760px,96vw);max-height:86vh;display:flex;flex-direction:column;border:1px solid rgba(255,255,255,.16);border-radius:6px;background:#252b32;box-shadow:0 18px 52px rgba(0,0,0,.45);color:#dce5ef}.${SCRIPT_PREFIX}-rank-header{display:flex;align-items:center;justify-content:space-between;gap:1em;padding:.85em 1em;border-bottom:1px solid rgba(255,255,255,.12)}.${SCRIPT_PREFIX}-rank-header h2{margin:0;font-size:18px}.${SCRIPT_PREFIX}-rank-close{border:0;background:transparent;color:#dce5ef;font-size:24px;line-height:1;cursor:pointer}.${SCRIPT_PREFIX}-rank-filter{display:flex;align-items:center;gap:.65em;flex-wrap:wrap;padding:.75em 1em;border-bottom:1px solid rgba(255,255,255,.1);color:#9aa4b2;font-size:13px}.${SCRIPT_PREFIX}-rank-filter label{display:inline-flex;align-items:center;gap:.3em}.${SCRIPT_PREFIX}-rank-filter input{width:5.5em;padding:.2em .35em;border:1px solid rgba(255,255,255,.22);border-radius:3px;background:#1f252b;color:#dce5ef}.${SCRIPT_PREFIX}-rank-filter-summary{margin-left:auto}.${SCRIPT_PREFIX}-rank-body{overflow:auto;padding:0 1em 1em}.${SCRIPT_PREFIX}-rank-table{width:100%;border-collapse:collapse}.${SCRIPT_PREFIX}-rank-table th,.${SCRIPT_PREFIX}-rank-table td{padding:.55em .45em;border-bottom:1px solid rgba(255,255,255,.08);text-align:left}.${SCRIPT_PREFIX}-rank-table th{position:sticky;top:0;background:#252b32;z-index:1}.${SCRIPT_PREFIX}-rank-table td:nth-child(1),.${SCRIPT_PREFIX}-rank-table td:nth-child(3),.${SCRIPT_PREFIX}-rank-table th:nth-child(1),.${SCRIPT_PREFIX}-rank-table th:nth-child(3){text-align:right}.${SCRIPT_PREFIX}-rank-empty{padding:1.25em 0;color:#9aa4b2}
        `;
        document.documentElement.appendChild(style);
        state.cssInjected = true;
    }

    function contestIdFromLocation() {
        const m = location.pathname.match(/\/contest\/([^/]+)/);
        return m ? decodeURIComponent(m[1]) : '';
    }

    function userIdFromLocation() {
        const m = location.pathname.match(/\/user\/([^/?#]+)/);
        return m ? decodeURIComponent(m[1]) : '';
    }

    function findGhostButton() {
        const links = Array.from(document.querySelectorAll('a.button[href*="/scoreboard/ghost"]'));
        return links[0] || Array.from(document.querySelectorAll('a.button')).find(a => /导出为\s*Ghost|Ghost/i.test(text(a))) || null;
    }

    function getContestName(doc = document, fallbackContestId = '') {
        const selectors = ['.section__title h1', '.section__title', 'h1', '.contest-title'];
        for (const sel of selectors) {
            const t = text(doc.querySelector(sel));
            if (t) return t;
        }
        const title = (doc.title || '').replace(/\s*-\s*(GOJ|Genisis Online Judge).*$/i, '').trim();
        return title || fallbackContestId || contestIdFromLocation() || 'GOJ Contest';
    }

    function parseJsonMaybe(raw) {
        if (!raw) return null;
        if (typeof raw === 'object') return raw;
        try { return JSON.parse(String(raw)); }
        catch (e) { return null; }
    }

    function parseHydroContext(doc = document) {
        const contexts = [];
        if (doc === document) contexts.push(parseJsonMaybe(window.UiContext), parseJsonMaybe(window.UiContextNew));
        for (const script of Array.from(doc.querySelectorAll('script'))) {
            const content = script.textContent || '';
            for (const name of ['UiContext', 'UiContextNew']) {
                const m = content.match(new RegExp(`window\\.${name}\\s*=\\s*(['"])(.*?)\\1\\s*;`, 's'));
                if (m) contexts.push(parseJsonMaybe(m[2]));
            }
        }
        return contexts.filter(Boolean).find(ctx => ctx.tdoc || ctx.tsdoc) || null;
    }

    function timestampFromElement(el) {
        if (!el) return NaN;
        for (const attr of ['data-timestamp', 'datetime']) {
            const raw = el.getAttribute(attr);
            if (!raw) continue;
            let n = Number(raw);
            if (!Number.isFinite(n)) continue;
            if (n < 1e11) n *= 1000;
            if (n > 946684800000) return n;
        }
        return Date.parse(el.getAttribute('data-tooltip') || el.getAttribute('title') || text(el));
    }

    function findLabeledTime(doc, label) {
        const dts = Array.from(doc.querySelectorAll('dt'));
        for (const dt of dts) {
            if (!text(dt).includes(label)) continue;
            const dd = dt.nextElementSibling;
            const value = timestampFromElement(dd && (dd.querySelector('time,[data-timestamp],[datetime],.time') || dd));
            if (Number.isFinite(value)) return value;
        }
        const tags = Array.from(doc.querySelectorAll('.problem__tag-item'));
        for (const tag of tags) {
            if (!text(tag).includes(label)) continue;
            const value = timestampFromElement(tag.querySelector('time,[data-timestamp],[datetime],.time') || tag);
            if (Number.isFinite(value)) return value;
        }
        return NaN;
    }

    function getContestTimes(doc = document) {
        const uiContext = parseHydroContext(doc);
        const tdoc = uiContext && uiContext.tdoc;
        const tsdoc = uiContext && uiContext.tsdoc;
        const startCandidates = [
            findLabeledTime(doc, '开始'),
            Date.parse(tsdoc && tsdoc.startAt),
            Date.parse(tdoc && tdoc.beginAt),
        ].filter(Number.isFinite);
        const endCandidates = [
            findLabeledTime(doc, '结束'),
            Date.parse(tdoc && tdoc.endAt),
        ].filter(Number.isFinite);
        if (!endCandidates.length) {
            for (const el of Array.from(doc.querySelectorAll('time,[data-timestamp],[datetime],.time'))) {
                const value = timestampFromElement(el);
                if (Number.isFinite(value)) endCandidates.push(value);
            }
        }
        return {
            startTime: startCandidates.length ? Math.min(...startCandidates) : NaN,
            endTime: endCandidates.length ? Math.max(...endCandidates) : NaN,
        };
    }

    function getContestStartTime() {
        const times = getContestTimes(document);
        return Number.isFinite(times.startTime) ? times.startTime : Date.now();
    }

    function getContestEndTime() {
        const times = getContestTimes(document);
        return Number.isFinite(times.endTime) ? times.endTime : Date.now();
    }

    function contestIdFromUrl(url) {
        const m = String(url || '').match(/\/contest\/([^/?#]+)/);
        return m ? decodeURIComponent(m[1]) : '';
    }

    function contestDetailUrl(url = location.href) {
        const u = new URL(url, location.href);
        u.pathname = u.pathname.replace(/\/scoreboard\/?$/, '');
        u.search = '';
        u.hash = '';
        return u.href;
    }

    function contestScoreboardUrl(url) {
        const detail = new URL(contestDetailUrl(url), location.href);
        detail.pathname = detail.pathname.replace(/\/?$/, '/scoreboard');
        detail.search = '';
        detail.hash = '';
        return detail.href;
    }

    async function fetchHtmlDocument(url) {
        const res = await fetch(url, { credentials: 'same-origin' });
        if (!res.ok) throw new Error(`${url}: HTTP ${res.status}`);
        return new DOMParser().parseFromString(await res.text(), 'text/html');
    }

    async function enrichContestTimesFromDetail(contest, url = location.href) {
        if (!contest || Number.isFinite(contest.startTime)) return contest;
        try {
            const doc = await fetchHtmlDocument(contestDetailUrl(url));
            const times = getContestTimes(doc);
            if (Number.isFinite(times.startTime)) contest.startTime = times.startTime;
            if (Number.isFinite(times.endTime)) contest.endTime = times.endTime;
        } catch (e) {
            warn('Failed to fetch contest detail time; fallback to scoreboard time.', e);
        }
        return contest;
    }

    function scoreboardTables(doc = document) {
        const fragment = doc.querySelector('[data-fragment-id="scoreboard"]') || doc;
        const header = fragment.querySelector('table.section__table-header') || doc.querySelector('table.section__table-header');
        const body = fragment.querySelector('.section__table-container table.data-table') || Array.from(fragment.querySelectorAll('table.data-table')).find(t => t.tBodies && t.tBodies[0] && !t.classList.contains('section__table-header'));
        return { fragment, header, body };
    }

    function getUserInfoFromRow(row) {
        const userCell = row.querySelector('td.col--user');
        if (!userCell) return null;
        const link = userCell.querySelector('a[href*="/user/"]');
        const dataUid = userCell.querySelector('[data-uid]');
        const href = link ? link.getAttribute('href') || '' : '';
        const m = href.match(/\/user\/([^/?#]+)/);
        const userId = m ? decodeURIComponent(m[1]) : (dataUid ? dataUid.getAttribute('data-uid') : '');
        if (!userId) return null;
        const username = text(link) || text(userCell).replace(/^★?/, '').trim() || userId;
        return { userId, username };
    }

    function parseScoreboardDocument(doc, url) {
        const contestId = contestIdFromUrl(url) || contestIdFromLocation();
        if (!contestId) throw new Error('Cannot parse contestId from URL.');
        const { body } = scoreboardTables(doc);
        if (!body || !body.tBodies[0]) throw new Error('Cannot find scoreboard body table.');
        const rows = Array.from(body.tBodies[0].rows || []);
        const participants = [];
        for (let i = 0; i < rows.length; i++) {
            const row = rows[i];
            const info = getUserInfoFromRow(row);
            if (!info) {
                warn('Skip scoreboard row without userId.', row);
                continue;
            }
            const rankCell = row.querySelector('td.col--rank') || row.cells[0];
            const scoreCell = row.querySelector('td.col--total_score');
            const rank = parseRank(text(rankCell), i + 1);
            const score = parseNumber(text(scoreCell), 0);
            participants.push({ ...info, rank, actualRank: i + 1, score });
        }
        assignAverageRanks(participants);
        const times = getContestTimes(doc);
        return {
            contestId,
            contestName: getContestName(doc, contestId),
            startTime: times.startTime,
            endTime: times.endTime,
            participants,
            ratedAt: Date.now(),
        };
    }

    function parseCurrentScoreboard() {
        const contest = parseScoreboardDocument(document, location.href);
        contest.startTime = safeDate(getContestStartTime());
        contest.endTime = safeDate(getContestEndTime());
        return contest;
    }

    async function fetchContestRatedFromUrl(url) {
        const scoreboardUrl = contestScoreboardUrl(url);
        const scoreDoc = await fetchHtmlDocument(scoreboardUrl);
        const contest = parseScoreboardDocument(scoreDoc, scoreboardUrl);
        if (!Number.isFinite(contest.startTime)) {
            try {
                const detailDoc = await fetchHtmlDocument(contestDetailUrl(url));
                const times = getContestTimes(detailDoc);
                if (Number.isFinite(times.startTime)) contest.startTime = times.startTime;
                if (Number.isFinite(times.endTime)) contest.endTime = times.endTime;
                const detailName = getContestName(detailDoc, contest.contestId);
                if (detailName) contest.contestName = detailName;
            } catch (e) {
                warn('Failed to fetch contest detail during batch add.', url, e);
            }
        }
        contest.startTime = safeDate(contest.startTime || contest.endTime);
        contest.endTime = safeDate(contest.endTime || contest.startTime);
        return contest;
    }

    function assignAverageRanks(participants) {
        const sorted = participants.slice().sort((a, b) => {
            if (b.score !== a.score) return b.score - a.score;
            if (a.rank !== b.rank) return a.rank - b.rank;
            return a.actualRank - b.actualRank;
        });
        let i = 0;
        while (i < sorted.length) {
            let j = i + 1;
            while (j < sorted.length && (sorted[j].score === sorted[i].score || sorted[j].rank === sorted[i].rank)) j++;
            const avgByPosition = (i + 1 + j) / 2;
            const avgByRank = sorted.slice(i, j).reduce((s, p) => s + (Number.isFinite(p.rank) ? p.rank : p.actualRank), 0) / (j - i);
            const avg = Number.isFinite(avgByRank) ? avgByRank : avgByPosition;
            for (let k = i; k < j; k++) sorted[k].rank = avg;
            i = j;
        }
    }

    function F(n) {
        let sum081 = 0;
        let sum09 = 0;
        for (let i = 1; i <= n; i++) {
            sum081 += Math.pow(0.81, i);
            sum09 += Math.pow(0.9, i);
        }
        return Math.sqrt(sum081) / sum09;
    }

    const F_INF = Math.sqrt(0.81 / (1 - 0.81)) / (0.9 / (1 - 0.9));
    const F_1 = F(1);

    function f(n) {
        if (n <= 0) return 0;
        return (F(n) - F_INF) / (F_1 - F_INF) * 1200;
    }

    function g(x) { return Math.pow(2, x / 800); }
    function gInv(y) { return 800 * Math.log2(y); }

    function calculateRating(rperfs) {
        if (!Array.isArray(rperfs) || rperfs.length === 0) return 0;
        const recentFirst = rperfs.slice().reverse();
        let num = 0;
        let den = 0;
        for (let idx = 0; idx < recentFirst.length; idx++) {
            const w = Math.pow(0.9, idx + 1);
            num += g(Number(recentFirst[idx]) || 0) * w;
            den += w;
        }
        if (!(num > 0) || !(den > 0)) return 0;
        return Math.max(0, roundInt(gInv(num / den) - f(rperfs.length), 0));
    }

    function calculateAPerf(historyRPerfs) {
        if (!historyRPerfs || historyRPerfs.length === 0) return CENTER;
        let num = 0;
        let den = 0;
        const recentFirst = historyRPerfs.slice().reverse();
        for (let i = 0; i < recentFirst.length; i++) {
            const w = Math.pow(0.9, i + 1);
            num += (Number(recentFirst[i]) || 0) * w;
            den += w;
        }
        const value = den > 0 ? num / den : CENTER;
        return clampFinite(value, CENTER);
    }

    function expectedRankAt(x, aPerfs) {
        let sum = 0;
        for (const ap of aPerfs) sum += 1 / (1 + Math.pow(6, (x - ap) / 400));
        return sum;
    }

    function calculatePerformance(rank, aPerfs, isFirstContest) {
        let target = Number(rank) - 0.5;
        if (!Number.isFinite(target)) target = 0.5;
        target = Math.max(0.5, target);
        let lo = PERF_LOW;
        let hi = PERF_HIGH;
        for (let it = 0; it < 80; it++) {
            const mid = (lo + hi) / 2;
            const e = expectedRankAt(mid, aPerfs);
            if (e > target) lo = mid;
            else hi = mid;
        }
        let perf = (lo + hi) / 2;
        if (isFirstContest) perf = (perf - CENTER) * 1.5 + CENTER;
        const rperf = Math.min(perf, RATED_BOUND + 400);
        return roundInt(rperf, CENTER);
    }

    function contestRatingTime(contest) {
        return safeDate(contest && (contest.endTime || contest.startTime));
    }

    function recalculateDb(inputDb) {
        const db = normalizeDb(inputDb || loadDb());
        db.records = {};
        db.userStates = {};
        const userHistories = {};
        const contests = Object.values(db.contests || {}).filter(c => c && c.contestId && Array.isArray(c.participants));
        contests.sort((a, b) => contestRatingTime(a) - contestRatingTime(b) || String(a.contestId).localeCompare(String(b.contestId)));

        for (const contest of contests) {
            assignAverageRanks(contest.participants);
            const participantAPerfs = contest.participants.map(p => calculateAPerf((userHistories[p.userId] || []).map(r => r.performance)));
            for (let idx = 0; idx < contest.participants.length; idx++) {
                const p = contest.participants[idx];
                const history = userHistories[p.userId] || [];
                const oldRating = history.length ? history[history.length - 1].newRating : 0;
                const performance = calculatePerformance(p.rank, participantAPerfs, history.length === 0);
                const nextRPerfs = history.map(r => r.performance).concat([performance]);
                const newRating = calculateRating(nextRPerfs);
                const record = {
                    contestId: contest.contestId,
                    contestName: contest.contestName || contest.contestId,
                    time: contestRatingTime(contest),
                    userId: String(p.userId),
                    username: p.username || String(p.userId),
                    rank: clampFinite(Number(p.rank), p.actualRank || idx + 1),
                    actualRank: p.actualRank || idx + 1,
                    score: clampFinite(Number(p.score), 0),
                    oldRating,
                    performance,
                    newRating,
                    delta: newRating - oldRating,
                    contestIndexBefore: history.length,
                    contestIndexAfter: history.length + 1,
                };
                if (p.penalty != null) record.penalty = p.penalty;
                db.records[`${contest.contestId}:${p.userId}`] = record;
                if (!userHistories[p.userId]) userHistories[p.userId] = [];
                userHistories[p.userId].push(record);
                db.userStates[p.userId] = {
                    userId: String(p.userId),
                    username: record.username,
                    rating: record.newRating,
                    contests: record.contestIndexAfter,
                    lastContestId: record.contestId,
                    lastTime: record.time,
                    rperfs: nextRPerfs.slice(),
                };
            }
        }
        db.version = DB_VERSION;
        return db;
    }

    async function addCurrentContestRated() {
        try {
            const contest = await enrichContestTimesFromDetail(parseCurrentScoreboard(), location.href);
            const db = loadDb();
            db.contests[contest.contestId] = contest;
            const next = recalculateDb(db);
            if (saveDb(next)) scheduleApply();
        } catch (e) {
            error('Failed to rate current contest.', e);
            alert(`rated 失败：${e.message || e}`);
        }
    }

    function removeCurrentContestRated() {
        const contestId = contestIdFromLocation();
        if (!contestId) return;
        const db = loadDb();
        delete db.contests[contestId];
        const next = recalculateDb(db);
        if (saveDb(next)) scheduleApply();
    }

    function formatDelta(delta) {
        const d = Number(delta) || 0;
        if (d > 0) return `+${d}`;
        return String(d);
    }

    function deltaClass(delta) {
        const d = Number(delta) || 0;
        if (d > 0) return `${SCRIPT_PREFIX}-delta-pos`;
        if (d < 0) return `${SCRIPT_PREFIX}-delta-neg`;
        return `${SCRIPT_PREFIX}-delta-zero`;
    }

    function makeBadge(rating) {
        const span = document.createElement('span');
        span.className = `${SCRIPT_PREFIX}-badge ${cssRatingClass(rating)}`;
        span.dataset.gojAcrBadge = '1';
        span.textContent = String(roundInt(rating, 0));
        span.title = `GOJ local rating: ${span.textContent}`;
        return span;
    }

    function injectScoreboardButtons(db) {
        const ghost = findGhostButton();
        if (!ghost || document.querySelector(`.${SCRIPT_PREFIX}-btn`)) return;
        const contestId = contestIdFromLocation();
        const rated = Boolean(contestId && db.contests[contestId]);
        const rateBtn = document.createElement('a');
        rateBtn.href = 'javascript:;';
        rateBtn.className = `button ${SCRIPT_PREFIX}-btn ${SCRIPT_PREFIX}-rated`;
        rateBtn.textContent = rated ? '重新 rated' : 'rated';
        rateBtn.addEventListener('click', addCurrentContestRated);
        ghost.insertAdjacentElement('afterend', rateBtn);
        const undoBtn = document.createElement('a');
        undoBtn.href = 'javascript:;';
        undoBtn.className = `button ${SCRIPT_PREFIX}-btn ${SCRIPT_PREFIX}-undo`;
        undoBtn.textContent = '撤销 rated';
        undoBtn.style.display = rated ? '' : 'none';
        undoBtn.addEventListener('click', removeCurrentContestRated);
        rateBtn.insertAdjacentElement('afterend', undoBtn);
    }

    function insertColAtEnd(row, className, html) {
        if (!row || row.querySelector(`.${className}`)) return;
        const cell = document.createElement(row.parentElement && row.parentElement.tagName === 'THEAD' ? 'th' : 'td');
        cell.className = className;
        cell.innerHTML = html;
        row.appendChild(cell);
    }


    function injectScoreboardColumns(db) {
        const { header, body } = scoreboardTables();
        if (!body || !body.tBodies[0]) return;
        if (header && header.tHead && header.tHead.rows[0]) {
            insertColAtEnd(header.tHead.rows[0], `col--${SCRIPT_PREFIX}-delta`, 'rating Δ');
            insertColAtEnd(header.tHead.rows[0], `col--${SCRIPT_PREFIX}-perf`, 'performance');
            const cg = header.querySelector('colgroup');
            if (cg && !cg.querySelector(`col.${SCRIPT_PREFIX}-delta-col`)) {
                const c1 = document.createElement('col'); c1.className = `${SCRIPT_PREFIX}-delta-col col--${SCRIPT_PREFIX}-delta`;
                const c2 = document.createElement('col'); c2.className = `${SCRIPT_PREFIX}-perf-col col--${SCRIPT_PREFIX}-perf`;
                cg.append(c1, c2);
            }
        }
        const bodyCg = body.querySelector('colgroup');
        if (bodyCg && !bodyCg.querySelector(`col.${SCRIPT_PREFIX}-delta-col`)) {
            const c1 = document.createElement('col'); c1.className = `${SCRIPT_PREFIX}-delta-col col--${SCRIPT_PREFIX}-delta`;
            const c2 = document.createElement('col'); c2.className = `${SCRIPT_PREFIX}-perf-col col--${SCRIPT_PREFIX}-perf`;
            bodyCg.append(c1, c2);
        }

        const contestId = contestIdFromLocation();
        for (const row of Array.from(body.tBodies[0].rows)) {
            const info = getUserInfoFromRow(row);
            const userCell = row.querySelector('td.col--user');
            if (info && userCell) {
                const oldBadge = userCell.querySelector(`[data-goj-acr-badge="1"]`);
                if (oldBadge) oldBadge.remove();
                const rating = db.userStates[info.userId] ? db.userStates[info.userId].rating : 0;
                if (db.userStates[info.userId]) {
                    const anchor = userCell.querySelector('a.user-profile-name') || userCell.querySelector('a[href*="/user/"]') || userCell;
                    anchor.insertAdjacentElement('afterend', makeBadge(rating));
                }
            }
            if (!row.querySelector(`.col--${SCRIPT_PREFIX}-delta`)) insertColAtEnd(row, `col--${SCRIPT_PREFIX}-delta`, '');
            if (!row.querySelector(`.col--${SCRIPT_PREFIX}-perf`)) insertColAtEnd(row, `col--${SCRIPT_PREFIX}-perf`, '');
            const deltaCell = row.querySelector(`.col--${SCRIPT_PREFIX}-delta`);
            const perfCell = row.querySelector(`.col--${SCRIPT_PREFIX}-perf`);
            const rec = info && contestId ? db.records[`${contestId}:${info.userId}`] : null;
            if (rec) {
                deltaCell.className = `col--${SCRIPT_PREFIX}-delta ${deltaClass(rec.delta)}`;
                deltaCell.textContent = `${rec.oldRating} → ${rec.newRating} (${formatDelta(rec.delta)})`;
                deltaCell.title = `rank ${rec.rank}, score ${rec.score}`;
                perfCell.className = `col--${SCRIPT_PREFIX}-perf`;
                perfCell.textContent = String(rec.performance);
            } else {
                deltaCell.className = `col--${SCRIPT_PREFIX}-delta ${SCRIPT_PREFIX}-unrated`;
                deltaCell.textContent = 'unrated';
                perfCell.className = `col--${SCRIPT_PREFIX}-perf ${SCRIPT_PREFIX}-unrated`;
                perfCell.textContent = '';
            }
        }
    }

    function userRecords(db, userId) {
        return Object.values(db.records || {}).filter(r => String(r.userId) === String(userId)).sort((a, b) => (a.time || 0) - (b.time || 0));
    }

    function userUrl(userId) {
        return `/user/${encodeURIComponent(String(userId))}`;
    }

    function ratingLeaderboard(db, filters = {}) {
        const now = Date.now();
        const recentDays = Math.max(0, Number(filters.recentDays) || 0);
        const minContests = Math.max(0, Math.floor(Number(filters.minContests) || 0));
        const minLastTime = recentDays > 0 ? now - recentDays * 24 * 60 * 60 * 1000 : 0;
        return Object.values(db.userStates || {})
            .filter(u => u && u.userId && Number.isFinite(Number(u.rating)))
            .map(u => ({
                userId: String(u.userId),
                username: u.username || String(u.userId),
                rating: roundInt(Number(u.rating), 0),
                contests: Number(u.contests) || 0,
                lastTime: Number(u.lastTime) || 0,
            }))
            .filter(u => u.contests >= minContests && (!minLastTime || u.lastTime >= minLastTime))
            .sort((a, b) => b.rating - a.rating || b.contests - a.contests || a.username.localeCompare(b.username) || a.userId.localeCompare(b.userId));
    }

    function readLeaderboardFilters(modal) {
        return {
            recentDays: Math.max(0, Number(modal.querySelector(`.${SCRIPT_PREFIX}-rank-recent-days`)?.value) || 0),
            minContests: Math.max(0, Math.floor(Number(modal.querySelector(`.${SCRIPT_PREFIX}-rank-min-contests`)?.value) || 0)),
        };
    }

    function ensureLeaderboardModal(db) {
        let modal = document.getElementById(`${SCRIPT_PREFIX}-rank-modal`);
        if (!modal) {
            modal = document.createElement('div');
            modal.id = `${SCRIPT_PREFIX}-rank-modal`;
            modal.className = `${SCRIPT_PREFIX}-rank-modal`;
            modal.innerHTML = `<div class="${SCRIPT_PREFIX}-rank-dialog" role="dialog" aria-modal="true" aria-labelledby="${SCRIPT_PREFIX}-rank-title"><div class="${SCRIPT_PREFIX}-rank-header"><h2 id="${SCRIPT_PREFIX}-rank-title">GOJ Rating 排行榜</h2><button type="button" class="${SCRIPT_PREFIX}-rank-close" aria-label="关闭排行榜">×</button></div><div class="${SCRIPT_PREFIX}-rank-filter"><label>最近 <input type="number" min="0" step="1" value="365" class="${SCRIPT_PREFIX}-rank-recent-days"> 天内有统计比赛</label><label>比赛数量 ≥ <input type="number" min="0" step="1" value="1" class="${SCRIPT_PREFIX}-rank-min-contests"></label><button type="button" class="button ${SCRIPT_PREFIX}-rank-apply">筛选</button><span class="${SCRIPT_PREFIX}-rank-filter-summary"></span></div><div class="${SCRIPT_PREFIX}-rank-body"></div></div>`;
            document.body.appendChild(modal);
            const close = () => modal.classList.remove('is-open');
            modal.querySelector(`.${SCRIPT_PREFIX}-rank-close`).addEventListener('click', close);
            modal.addEventListener('click', event => {
                if (event.target === modal) close();
            });
            document.addEventListener('keydown', event => {
                if (event.key === 'Escape' && modal.classList.contains('is-open')) close();
            });
            modal.querySelector(`.${SCRIPT_PREFIX}-rank-apply`).addEventListener('click', () => renderLeaderboard(modal, loadDb()));
            for (const input of Array.from(modal.querySelectorAll(`.${SCRIPT_PREFIX}-rank-recent-days, .${SCRIPT_PREFIX}-rank-min-contests`))) {
                input.addEventListener('keydown', event => {
                    if (event.key === 'Enter') renderLeaderboard(modal, loadDb());
                });
            }
        }
        renderLeaderboard(modal, db);
        return modal;
    }

    function renderLeaderboard(modal, db) {
        const body = modal.querySelector(`.${SCRIPT_PREFIX}-rank-body`);
        const summary = modal.querySelector(`.${SCRIPT_PREFIX}-rank-filter-summary`);
        const filters = readLeaderboardFilters(modal);
        const rows = ratingLeaderboard(db, filters);
        if (summary) {
            const timeText = filters.recentDays > 0 ? `最近 ${filters.recentDays} 天内有统计比赛` : '不限最近比赛时间';
            summary.textContent = `${timeText}，比赛数量 ≥ ${filters.minContests}，共 ${rows.length} 人`;
        }
        if (!rows.length) {
            body.innerHTML = `<div class="${SCRIPT_PREFIX}-rank-empty">暂无符合条件的 rating 数据</div>`;
            return;
        }
        const table = document.createElement('table');
        table.className = `${SCRIPT_PREFIX}-rank-table`;
        table.innerHTML = '<thead><tr><th>排名</th><th>用户名</th><th>rating</th></tr></thead><tbody></tbody>';
        const tbody = table.tBodies[0];
        let rank = 0;
        let prevRating = null;
        rows.forEach((row, index) => {
            if (row.rating !== prevRating) {
                rank = index + 1;
                prevRating = row.rating;
            }
            const tr = document.createElement('tr');
            const rankTd = document.createElement('td');
            rankTd.textContent = String(rank);
            const userTd = document.createElement('td');
            const link = document.createElement('a');
            link.href = userUrl(row.userId);
            link.textContent = row.username;
            link.title = `打开 ${row.username} 的主页`;
            userTd.appendChild(link);
            const ratingTd = document.createElement('td');
            ratingTd.appendChild(makeBadge(row.rating));
            tr.append(rankTd, userTd, ratingTd);
            tbody.appendChild(tr);
        });
        body.replaceChildren(table);
    }

    function showLeaderboard(db) {
        const modal = ensureLeaderboardModal(db);
        modal.classList.add('is-open');
    }

    function ratingBands(maxR) {
        const thresholds = [
            { from: 0, to: 400, className: 'gray' },
            { from: 400, to: 800, className: 'brown' },
            { from: 800, to: 1200, className: 'green' },
            { from: 1200, to: 1600, className: 'cyan' },
            { from: 1600, to: 2000, className: 'blue' },
            { from: 2000, to: 2400, className: 'yellow' },
            { from: 2400, to: 2800, className: 'orange' },
            { from: 2800, to: Infinity, className: 'red' },
        ];
        return thresholds.map(band => ({ ...band, to: Math.min(band.to, maxR) })).filter(band => band.from < maxR && band.to > 0);
    }

    function makeSvgChart(records, zoom = 1, compareRecords = []) {
        const height = 260;
        const pad = { l: 48, r: 18, t: 20, b: 36 };
        const compareEnabled = Array.isArray(compareRecords) && compareRecords.length > 0;
        const allRecords = records.concat(compareEnabled ? compareRecords : []);
        const allTimes = allRecords.map(r => Number(r.time) || 0).filter(t => t > 0);
        const minTime = allTimes.length ? Math.min(...allTimes) : 0;
        const maxTime = allTimes.length ? Math.max(...allTimes) : minTime;
        const timeSpan = Math.max(1, maxTime - minTime);
        const pointCountForWidth = compareEnabled ? Math.max(records.length, compareRecords.length, 7) : Math.max(records.length, 7);
        const pointGap = 12 * zoom;
        const width = Math.round(pad.l + pad.r + Math.max(6, pointCountForWidth - 1) * pointGap);
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
        svg.setAttribute('width', String(width));
        svg.setAttribute('height', String(height));
        svg.setAttribute('role', 'img');
        svg.setAttribute('aria-label', 'GOJ local rating chart');
        const ratings = allRecords.map(r => Number(r.newRating) || 0);
        const minR = Math.max(0, Math.floor((Math.min(...ratings, 0) - 100) / 100) * 100);
        const maxR = Math.max(400, Math.ceil((Math.max(...ratings, CENTER) + 100) / 100) * 100);
        const xByIndex = (series, i) => series.length <= 1 ? (pad.l + width - pad.r) / 2 : pad.l + (width - pad.l - pad.r) * i / (series.length - 1);
        const xByTime = r => maxTime === minTime ? (pad.l + width - pad.r) / 2 : pad.l + (width - pad.l - pad.r) * ((Number(r.time) || minTime) - minTime) / timeSpan;
        const xOf = (series, i) => compareEnabled ? xByTime(series[i]) : xByIndex(series, i);
        const yOf = r => height - pad.b - (height - pad.t - pad.b) * (r - minR) / Math.max(1, maxR - minR);
        function el(name, attrs, children) {
            const n = document.createElementNS('http://www.w3.org/2000/svg', name);
            for (const [k, v] of Object.entries(attrs || {})) n.setAttribute(k, String(v));
            for (const c of children || []) n.appendChild(c);
            return n;
        }
        for (const band of ratingBands(maxR)) {
            const bandTop = Math.min(maxR, band.to);
            const bandBottom = Math.max(minR, band.from);
            if (bandTop <= minR || bandBottom >= maxR) continue;
            const yTop = yOf(bandTop);
            const yBottom = yOf(bandBottom);
            svg.appendChild(el('rect', {
                x: pad.l,
                y: yTop,
                width: width - pad.l - pad.r,
                height: Math.max(0, yBottom - yTop),
                class: `${SCRIPT_PREFIX}-band ${band.className}`,
            }));
        }
        for (let r = Math.ceil(minR / 400) * 400; r <= maxR; r += 400) {
            const y = yOf(r);
            svg.appendChild(el('line', { x1: pad.l, y1: y, x2: width - pad.r, y2: y, class: `${SCRIPT_PREFIX}-grid` }));
            const label = el('text', { x: 8, y: y + 4, class: `${SCRIPT_PREFIX}-chart-label` });
            label.textContent = String(r);
            svg.appendChild(label);
        }
        if (compareEnabled) {
            const tickTimes = [minTime, maxTime].filter((t, i, arr) => t > 0 && arr.indexOf(t) === i);
            for (const t of tickTimes) {
                const x = xByTime({ time: t });
                svg.appendChild(el('line', { x1: x, y1: height - pad.b, x2: x, y2: height - pad.b + 5, class: `${SCRIPT_PREFIX}-axis` }));
                const label = el('text', { x: Math.max(4, Math.min(width - 86, x - 30)), y: height - 10, class: `${SCRIPT_PREFIX}-chart-label` });
                label.textContent = new Date(t).toLocaleDateString();
                svg.appendChild(label);
            }
        }
        svg.appendChild(el('line', { x1: pad.l, y1: pad.t, x2: pad.l, y2: height - pad.b, class: `${SCRIPT_PREFIX}-axis` }));
        svg.appendChild(el('line', { x1: pad.l, y1: height - pad.b, x2: width - pad.r, y2: height - pad.b, class: `${SCRIPT_PREFIX}-axis` }));
        const drawSeries = (series, seriesName, lineClass, dotClass) => {
            if (!series.length) return;
            const d = series.map((r, i) => `${i ? 'L' : 'M'}${xOf(series, i).toFixed(2)},${yOf(r.newRating).toFixed(2)}`).join(' ');
            svg.appendChild(el('path', { d, class: `${SCRIPT_PREFIX}-line ${lineClass}` }));
            series.forEach((r, i) => {
                const x = xOf(series, i);
                const y = yOf(r.newRating);
                const dot = el('circle', { cx: x, cy: y, r: 4, class: `${SCRIPT_PREFIX}-dot ${dotClass} ${cssRatingClass(r.newRating)}` });
                dot.setAttribute('fill', seriesName === 'compare' ? '#4ea1ff' : chartPointColor(r.newRating));
                dot.dataset.series = seriesName;
                dot.dataset.index = String(i);
                svg.appendChild(dot);
                const hit = el('circle', { cx: x, cy: y, r: 12, class: `${SCRIPT_PREFIX}-hit` });
                hit.dataset.series = seriesName;
                hit.dataset.index = String(i);
                svg.appendChild(hit);
            });
        };
        drawSeries(records, 'main', `${SCRIPT_PREFIX}-line-main`, `${SCRIPT_PREFIX}-dot-main`);
        if (compareEnabled) drawSeries(compareRecords, 'compare', `${SCRIPT_PREFIX}-line-compare`, `${SCRIPT_PREFIX}-dot-compare`);
        return svg;
    }

    function formatChartTooltip(record) {
        const delta = formatDelta(record.delta);
        const deltaCls = deltaClass(record.delta);
        return `<strong>${escapeHtml(record.contestName || record.contestId)}</strong>`
            + `<div>${escapeHtml(new Date(record.time).toLocaleString())}</div>`
            + `<div>rating：${roundInt(record.oldRating, 0)} → ${roundInt(record.newRating, 0)} <span class="${deltaCls}">(${escapeHtml(delta)})</span></div>`
            + `<div>performance：${roundInt(record.performance, 0)}</div>`
            + `<div>rank：${roundInt(record.rank, 0)}，score：${escapeHtml(record.score)}</div>`;
    }

    function escapeHtml(value) {
        const map = {};
        map['&'] = String.fromCharCode(38, 97, 109, 112, 59);
        map['<'] = String.fromCharCode(38, 108, 116, 59);
        map['>'] = String.fromCharCode(38, 103, 116, 59);
        map['"'] = String.fromCharCode(38, 113, 117, 111, 116, 59);
        map["'"] = String.fromCharCode(38, 35, 51, 57, 59);
        return String(value == null ? '' : value).replace(/[&<>"']/g, ch => map[ch]);
    }

    function chartPointColor(rating) {
        const colors = {
            gray: '#808080',
            brown: '#8c6239',
            green: '#3b8b3b',
            cyan: '#00a3a3',
            blue: '#3157d5',
            yellow: '#b59b00',
            orange: '#f08200',
            red: '#d32f2f',
        };
        return colors[cssRatingClass(rating)] || colors.gray;
    }

    function findRecentActivityContestList() {
        const activeTabs = Array.from(document.querySelectorAll('.section__tab-main.active, .section__tab-main'));
        for (const tab of activeTabs) {
            const links = Array.from(tab.querySelectorAll('a[href*="/contest/"]')).filter(a => contestIdFromUrl(a.href));
            if (links.length >= 2 && /最近活动|contest-type--/.test(`${text(tab)} ${links.map(a => a.className).join(' ')}`)) {
                const ul = links[0].closest('ul');
                if (ul) return ul;
            }
        }
        return null;
    }

    function recentActivityContestUrls() {
        const list = findRecentActivityContestList();
        if (!list) return [];
        const seen = new Set();
        const urls = [];
        for (const a of Array.from(list.querySelectorAll('a[href*="/contest/"]'))) {
            const id = contestIdFromUrl(a.href);
            if (!id || seen.has(id)) continue;
            seen.add(id);
            urls.push(contestDetailUrl(a.href));
        }
        return urls;
    }

    async function addRecentActivityContests(statusEl, btn) {
        if (state.batchAdding) return;
        const urls = recentActivityContestUrls();
        if (!urls.length) {
            if (statusEl) {
                statusEl.className = `${SCRIPT_PREFIX}-batch-status error`;
                statusEl.textContent = '未找到最近活动中的比赛列表';
            }
            return;
        }
        state.batchAdding = true;
        if (btn) btn.setAttribute('disabled', 'disabled');
        const db = loadDb();
        let ok = 0;
        const failed = [];
        try {
            for (let i = 0; i < urls.length; i++) {
                const url = urls[i];
                if (statusEl) {
                    statusEl.className = `${SCRIPT_PREFIX}-batch-status`;
                    statusEl.textContent = `正在添加 ${i + 1}/${urls.length}：${contestIdFromUrl(url)}`;
                }
                try {
                    const contest = await fetchContestRatedFromUrl(url);
                    db.contests[contest.contestId] = contest;
                    ok++;
                } catch (e) {
                    failed.push({ url, error: e });
                    warn('Failed to add contest during batch add.', url, e);
                }
            }
            const next = recalculateDb(db);
            if (saveDb(next)) scheduleApply();
            if (statusEl) {
                statusEl.className = `${SCRIPT_PREFIX}-batch-status ${failed.length ? 'error' : 'success'}`;
                statusEl.textContent = failed.length ? `完成：成功 ${ok} 场，失败 ${failed.length} 场` : `完成：已添加并重算 ${ok} 场比赛`;
            }
        } finally {
            state.batchAdding = false;
            if (btn) btn.removeAttribute('disabled');
        }
    }

    function injectRecentActivityBatchButton() {
        const list = findRecentActivityContestList();
        if (!list || document.getElementById(`${SCRIPT_PREFIX}-batch-bar`)) return;
        const bar = document.createElement('div');
        bar.id = `${SCRIPT_PREFIX}-batch-bar`;
        bar.className = `${SCRIPT_PREFIX}-batch-bar`;
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'button';
        btn.textContent = '一键添加';
        btn.title = '抓取最近活动列表中所有比赛的 scoreboard，并写入本地 GOJ Rating 数据';
        const status = document.createElement('span');
        status.className = `${SCRIPT_PREFIX}-batch-status`;
        status.textContent = `将添加 ${recentActivityContestUrls().length} 场比赛`;
        btn.addEventListener('click', () => addRecentActivityContests(status, btn));
        bar.append(btn, status);
        list.insertAdjacentElement('beforebegin', bar);
    }

    function injectUserChart(db) {
        const userId = userIdFromLocation();
        if (!userId) return;
        const section = document.querySelector('.profile-header') ? document.querySelector('.profile-header').closest('.section') : document.querySelector('.profile-content')?.closest('.section');
        if (!section) return;
        let box = document.getElementById(`${SCRIPT_PREFIX}-user-chart`);
        if (!box) {
            box = document.createElement('div');
            box.id = `${SCRIPT_PREFIX}-user-chart`;
            box.className = `section visible ${SCRIPT_PREFIX}-chart`;
            const profileContent = document.querySelector('.profile-content');
            if (profileContent) profileContent.insertAdjacentElement('beforebegin', box);
            else section.insertAdjacentElement('afterend', box);
        }
        const records = userRecords(db, userId);
        const allRecordsSig = Object.values(db.records || {}).map(r => `${r.contestId}:${r.userId}:${r.time}:${r.oldRating}:${r.newRating}:${r.performance}:${r.rank}:${r.score}`).sort().join('|');
        if (box.dataset.recordsSig === allRecordsSig && box.querySelector(`.${SCRIPT_PREFIX}-chart-viewport`)) return;
        box.dataset.recordsSig = allRecordsSig;
        box.innerHTML = '<div class="section__header"><div class="section__title goj-acr-chart-title-row"><button type="button" class="button goj-acr-rank-btn">显示排行榜</button><h1>GOJ Rating</h1></div></div><div class="section__body"></div>';
        const rankBtn = box.querySelector(`.${SCRIPT_PREFIX}-rank-btn`);
        if (rankBtn) rankBtn.addEventListener('click', () => showLeaderboard(loadDb()));
        const body = box.querySelector('.section__body');
        if (!records.length) {
            const p = document.createElement('p');
            p.className = `${SCRIPT_PREFIX}-chart-empty`;
            p.textContent = '暂无 rating 记录';
            body.appendChild(p);
            return;
        }
        const latest = records[records.length - 1];
        const summary = document.createElement('p');
        summary.innerHTML = `当前 rating：<strong>${latest.newRating}</strong>，rated 比赛：<strong>${records.length}</strong>`;
        body.appendChild(summary);
        const toolbar = document.createElement('div');
        toolbar.className = `${SCRIPT_PREFIX}-chart-toolbar`;
        const zoomLabel = document.createElement('span');
        zoomLabel.textContent = '横向缩放';
        const zoomInput = document.createElement('input');
        zoomInput.type = 'range';
        zoomInput.min = '1';
        zoomInput.max = '4';
        zoomInput.step = '0.25';
        zoomInput.value = box.dataset.zoom || '1';
        const zoomValue = document.createElement('span');
        const h2hLabel = document.createElement('label');
        h2hLabel.style.display = 'inline-flex';
        h2hLabel.style.alignItems = 'center';
        h2hLabel.style.gap = '.3em';
        const h2hToggle = document.createElement('input');
        h2hToggle.type = 'checkbox';
        h2hToggle.checked = box.dataset.h2hEnabled === '1';
        const h2hText = document.createElement('span');
        h2hText.textContent = 'head-to-head';
        h2hLabel.append(h2hToggle, h2hText);
        const h2hInput = document.createElement('input');
        h2hInput.type = 'text';
        h2hInput.className = `${SCRIPT_PREFIX}-h2h-input`;
        h2hInput.placeholder = '对比用户 ID';
        h2hInput.value = box.dataset.h2hUser || '';
        h2hInput.disabled = !h2hToggle.checked;
        const h2hStatus = document.createElement('span');
        h2hStatus.className = `${SCRIPT_PREFIX}-batch-status`;
        const mainLegend = document.createElement('span');
        mainLegend.className = `${SCRIPT_PREFIX}-chart-legend ${SCRIPT_PREFIX}-chart-legend-main`;
        mainLegend.textContent = userId;
        const compareLegend = document.createElement('span');
        compareLegend.className = `${SCRIPT_PREFIX}-chart-legend ${SCRIPT_PREFIX}-chart-legend-compare`;
        const viewport = document.createElement('div');
        viewport.className = `${SCRIPT_PREFIX}-chart-viewport`;
        const tooltip = document.createElement('div');
        tooltip.className = `${SCRIPT_PREFIX}-tooltip`;
        viewport.appendChild(tooltip);

        const renderChart = () => {
            const zoom = Number(zoomInput.value) || 1;
            const compareUserId = h2hInput.value.trim();
            const compareEnabled = h2hToggle.checked && compareUserId && compareUserId !== userId;
            const compareRecords = compareEnabled ? userRecords(db, compareUserId) : [];
            box.dataset.zoom = String(zoom);
            box.dataset.h2hEnabled = h2hToggle.checked ? '1' : '0';
            box.dataset.h2hUser = compareUserId;
            zoomValue.textContent = `${zoom.toFixed(2).replace(/\.00$/, '')}×`;
            h2hInput.disabled = !h2hToggle.checked;
            compareLegend.textContent = compareEnabled && compareRecords.length ? compareUserId : '';
            compareLegend.style.display = compareEnabled && compareRecords.length ? 'inline-flex' : 'none';
            h2hStatus.textContent = compareEnabled ? (compareRecords.length ? `已按时间对齐对比 ${compareRecords.length} 条记录` : '未找到该用户 rating 记录') : '';
            h2hStatus.className = `${SCRIPT_PREFIX}-batch-status${compareEnabled && !compareRecords.length ? ' error' : ''}`;
            Array.from(viewport.querySelectorAll('svg')).forEach(svg => svg.remove());
            const svg = makeSvgChart(records, zoom, compareRecords);
            const showTooltip = (event, seriesName, index) => {
                const source = seriesName === 'compare' ? compareRecords : records;
                const record = source[Number(index)];
                if (!record) return;
                const name = seriesName === 'compare' ? compareUserId : userId;
                tooltip.innerHTML = `<div><strong>${escapeHtml(name)}</strong></div>` + formatChartTooltip(record);
                tooltip.style.display = 'block';
                const viewportRect = viewport.getBoundingClientRect();
                const tooltipRect = tooltip.getBoundingClientRect();
                let left = event.clientX - viewportRect.left + viewport.scrollLeft + 12;
                let top = event.clientY - viewportRect.top + viewport.scrollTop + 12;
                const maxLeft = viewport.scrollLeft + viewport.clientWidth - tooltipRect.width - 8;
                if (left > maxLeft) left = event.clientX - viewportRect.left + viewport.scrollLeft - tooltipRect.width - 12;
                tooltip.style.left = `${Math.max(viewport.scrollLeft + 4, left)}px`;
                tooltip.style.top = `${Math.max(4, top)}px`;
            };
            svg.addEventListener('mousemove', event => {
                const target = event.target.closest && event.target.closest(`.${SCRIPT_PREFIX}-dot, .${SCRIPT_PREFIX}-hit`);
                if (!target || !svg.contains(target)) {
                    tooltip.style.display = 'none';
                    return;
                }
                showTooltip(event, target.dataset.series || 'main', target.dataset.index);
            });
            viewport.addEventListener('mouseleave', () => { tooltip.style.display = 'none'; });
            viewport.appendChild(svg);
        };
        zoomInput.addEventListener('input', renderChart);
        h2hToggle.addEventListener('change', renderChart);
        h2hInput.addEventListener('input', renderChart);
        toolbar.append(zoomLabel, zoomInput, zoomValue, h2hLabel, h2hInput, h2hStatus, mainLegend, compareLegend);
        body.appendChild(toolbar);
        body.appendChild(viewport);
        renderChart();
    }

    function isScoreboardPage() {
        return /\/contest\/[^/]+\/scoreboard\/?$/.test(location.pathname)
            && Boolean(document.querySelector('[data-fragment-id="scoreboard"], table.section__table-header, a[href*="/scoreboard/ghost"]'));
    }


    function isUserPage() {
        return /\/user\/[^/?#]+/.test(location.pathname) && Boolean(document.querySelector('.profile-header,.profile-content'));
    }

    function applyEnhancements() {
        if (state.applying) return;
        state.applying = true;
        try {
            injectCss();
            const db = loadDb();
            if (isScoreboardPage()) {
                injectScoreboardButtons(db);
                injectScoreboardColumns(db);
            }
            if (isUserPage()) {
                injectUserChart(db);
                injectRecentActivityBatchButton();
            }
        } catch (e) {
            error('Failed to apply page enhancements.', e);
        } finally {
            state.applying = false;
        }
    }

    function scheduleApply() {
        if (state.scheduled) return;
        state.scheduled = true;
        setTimeout(() => {
            state.scheduled = false;
            applyEnhancements();
        }, 120);
    }

    function setupObserver() {
        if (state.observer) return;
        state.observer = new MutationObserver(mutations => {
            const hasExternalAddedNodes = mutations.some(m => Array.from(m.addedNodes || []).some(node => {
                if (node.nodeType !== Node.ELEMENT_NODE) return false;
                const el = node;
                return !el.closest || !el.closest(`#${SCRIPT_PREFIX}-user-chart, #${SCRIPT_PREFIX}-batch-bar, #${SCRIPT_PREFIX}-rank-modal`);
            }));
            if (hasExternalAddedNodes) scheduleApply();
        });
        state.observer.observe(document.documentElement, { childList: true, subtree: true });
        setInterval(scheduleApply, 2500);
    }

    window.GOJAtCoderRating = {
        constants: { CENTER, RATED_BOUND, PERF_LOW, PERF_HIGH, STORAGE_KEY },
        exportData() { return JSON.parse(JSON.stringify(loadDb())); },
        importData(data) {
            const parsed = typeof data === 'string' ? JSON.parse(data) : data;
            const next = recalculateDb(normalizeDb(parsed));
            saveDb(next);
            scheduleApply();
            return next;
        },
        recalculate() {
            const next = recalculateDb(loadDb());
            saveDb(next);
            scheduleApply();
            return next;
        },
        reset: resetDb,
        parseCurrentScoreboard,
        fetchContestRatedFromUrl,
    };

    setupObserver();
    applyEnhancements();
})();
