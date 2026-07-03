// ==UserScript==
// @name         adofai in luogu
// @namespace    http://tampermonkey.net/
// @version      1.2.0
// @description  adofai in luogu
// @author       Sleeping_zzz2148
// @match        https://www.luogu.com.cn/*
// @match        https://www.luogu.com/*
// @grant        none
// @license      All Rights Reserved
// @homepageURL  https://github.com/Sleepingzzz2148/useful-addons
// @supportURL   https://github.com/Sleepingzzz2148/useful-addons/issues
// @downloadURL  https://github.com/Sleepingzzz2148/useful-addons/releases/latest/download/adofai-in-luogu.user.js
// @updateURL    https://github.com/Sleepingzzz2148/useful-addons/releases/latest/download/adofai-in-luogu.user.js
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
const DIFF_ICON_BASE64 = "https://api.tuforums.com/v2/media/image/icon/";
    'use strict';
    function setName(lv, ratio) {
        if (typeof (ratio) == "string" && ratio[ratio.length - 1] == "%") ratio = ratio.substring(ratio, ratio.length - 1) / 100;
        function calclv(l, r) {
            if (ratio > 1) ratio = 1;
            // let tmp = Math.floor((l + (r - l) * Math.pow((1 - ratio), 2)) * 10) / 10;
            let tmp = Math.floor((l + (r - l) * Math.pow((1 - ratio), 2)));
            // if(tmp % 1 == 0)tmp = tmp + 0.1;
            return tmp;
        }
        let s = lv.innerText;
        let lvl = 0;
        // if (s == "暂无评定" || s == "入门" || s == "普及−" || s == "普及/提高−" || s == "普及+/提高" || s == "提高+/省选−" || s == "省选/NOI-" || s == "NOI/NOI+/CTSC" || s.includes("EZ") || s.includes("HD") || s.includes("IN") || s.includes("AT")) {
            let color = lv.style.backgroundColor == "" ? lv.style.color : lv.style.backgroundColor;
            if (color == "rgb(254, 76, 97)"||s.includes("入门")) lvl = calclv(1, 10);
            if (color == "rgb(255, 193, 22)"||s.includes("普及")) lvl = calclv(15, 24);
            if (color == "rgb(19, 194, 194)"||s.includes("提高")) lvl = calclv(29, 38);
            if (color == "rgb(243, 156, 17)"||s.includes("普及−")) lvl = calclv(8, 17);
            if (color == "rgb(83, 196, 26)"||s.includes("普及+/提高-")) lvl = calclv(22, 31);
            if (color == "rgb(52, 152, 219)"||s.includes("提高+/省选−")) lvl=calclv(36, 45);
            if (color == "rgb(156, 61, 207)"||s.includes("省选/NOI−")) lvl=calclv(43, 52);
            if (color == "rgb(14, 29, 105)"||s.includes("NOI/NOI+/CTS")) lvl=calclv(50, 59);
            if (color == "rgb(232, 232, 232)"||s.includes("暂无评定")) lvl = 0;
            // lv.style.fontFamily='Saira';
        // }
        if(lvl != 0 && lv.style.backgroundColor != "" && lv.style.backgroundColor != "rgb(255, 255, 255)")lv.style.color = lv.style.backgroundColor;
        lv.style.backgroundColor = "rgb(255, 255, 255)";
        lv.style.borderColor = "rgb(255, 255, 255)";
        lv.style.fontWeight = "bold";
        if(lvl == 0){
            lvl = 'Qq';
        }else if(1 <= lvl && lvl <= 20){
            lvl = 'P' + String(lvl);
        }else if(21<= lvl && lvl <= 40){
            lvl = 'G' + String(lvl-20);
        }else if(41<= lvl && lvl <= 60){
            lvl = 'U' + String(lvl-40);
        }
        let iconKey = lvl;
        if (typeof(iconKey) == "string") {
            let iconSrc = DIFF_ICON_BASE64 + iconKey;
            // lv.innerText = "";
            let img = lv.getElementsByTagName("img")[0];
            if (!img) {
                img = document.createElement("img");
                let sp = document.createElement("p");
                sp.innerText = "  ";
                lv.appendChild(sp);
                lv.appendChild(img);
            }
            img.src = iconSrc;
            img.alt = iconKey;
            img.style.height = "2.8em";
            img.style.verticalAlign = "middle";
            // if(lv.innerText[lv.innerText.length-1] != ' ')lv.innerText = lv.innerText + "  ";
        }
    }
    setInterval(() => {

        const ap = `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" width="180" height="60" viewBox="0 0 180 60">
  <rect x="1" y="1" width="178" height="58" rx="10" ry="10" fill="#7b2cbf" stroke="#5a189a" stroke-width="2"/>
  <text x="90" y="24" text-anchor="middle" font-size="18" font-family="sans-serif" fill="#ffffff">🎉AC🎉</text>
  <text x="90" y="45" text-anchor="middle" font-size="18" font-family="sans-serif" fill="#ffffff">😎</text>
</svg>`)}`; // clear
        // let ft='Saira';
        // const style = document.createElement('style');
        // style.id = 'global-font-style';
        // style.textContent = `* { font-family: ${ft}, regular; }`;
        // const oldStyle = document.getElementById('global-font-style');
        // if (oldStyle) oldStyle.remove();
        // document.head.appendChild(style);
        if (location.pathname.includes("/problem/")) {
            if (location.pathname.includes("list")) {
                let tmp = document.getElementsByClassName("row");
                // console.log(tmp);
                for (let i=0; i<tmp.length; i++){
                    setName(tmp[i].children[4].children[0].children[0], tmp[i].children[5].children[0].children[0].style.width);
                    tmp[i].style.transform = "translateX(" + -i*10 + ")";
                }
            } else {
                let tmp = document.getElementsByClassName("stat tiled")[0];
                if(tmp==undefined)tmp = document.getElementsByClassName("stat stacked")[0];
                let x = tmp.children[0].children[1].innerText; // 提交
                if (x[x.length - 1] == "k") x = x.substring(0, x.length - 1) * 1000;
                if (x[x.length - 1] == "M") x = x.substring(0, x.length - 1) * 1000000;
                let y = tmp.children[1].children[1].innerText; // 通过
                if (y[y.length - 1] == "k") y = y.substring(0, y.length - 1) * 1000;
                if (y[y.length - 1] == "M") y = y.substring(0, y.length - 1) * 1000000;

                // 定位到题目难度
                let info = document.getElementsByClassName("l-card")[1];
                let lv=0;
                let sc=0;
                let l = info.children.length;
                for(let i = 0; i < l; i++){
                    if(info.children[i].children[0].innerText == "难度") lv = info.children[i].children[1].children[0];
                    if(info.children[i].children[0].innerText == "历史分数") sc = info.children[i].children[1].children[0];
                }
                console.log(lv.style.color);
                setName(lv, y / x);
                if (sc.dataset["phiflag"] != 1) {
                    sc.dataset["phiflag"] = 1;
                    //console.log("This problem is "+sc.style.background);
                    if(sc.style.background == "rgb(82, 196, 26)")sc.innerText = 100;
                    if (!isNaN(Number(sc.innerText))) {
                        //sc.style.fontFamily=ft;
                        if (sc.innerText == 100) {
                            let img = document.createElement("img");
                            img.src = ap;
                            img.style.height = "50px";
                            sc.style.display="none";
                            info.children[info.children.length - 3].children[1].appendChild(img);
                        }
                    }
                    //sc.style.fontFamily=ft;
                }
            }
        }
        if (location.pathname.includes("/training/")) { // 停止维护
            if (location.pathname.includes("list")) {

            } else {
                let tmp = document.getElementsByClassName("row");
                for (let i of tmp) setName(i.children[4].children[0].children[0], i.children[5].children[0].children[0].style.width);
            }
        }
        if (location.pathname.includes("/record/")) {
            if(!location.pathname.includes("list")){
                let tmp = document.getElementsByClassName("swal2-header");
                //console.log(tmp);
                for(let i of tmp){
                    let tp = i.getElementsByClassName("swal2-image");
                    for(let j of tp){
                        j.src=ap;
                    }
                }
            }else{
                let tmp = document.getElementsByClassName("lfe-caption tag status-name");
                for (let i of tmp) {
                    if (i != i.parentNode.children[1]) {
                        /*
                        制作一个替身，来修改显示的内容，但不影响原来的数据
                        */
                        if (i.dataset["phiflag"] != 1) { // flag：0 没有替身 1：有替身
                            i.dataset["phiflag"] = 1;
                            let s2 = document.createElement("span");
                            s2.className = "lfe-caption tag status-name";
                            s2.style.display = "none";
                            //console.log(i.parentNode);
                            i.parentNode.insertBefore(s2, i.parentNode.children[1]);
                        } else {
                            let c = i.parentNode.children[1];
                            c.style.background = i.style.background;
                            c.style.color = "rgb(255, 255, 255)";
                            c.style.fontFamily = i.style.fontFamily;
                            c.style.paddingLeft = "8px";
                            c.style.paddingRight = "8px";
                            if (i.innerText.includes("Accepted")) {
                                c.style.display = "block";
                                c.innerText = "Pure Perfect";
                                c.style.fontFamily=ft;
                                //c.style.background = "hsl(45,90%,71%)";
                                i.style.display = "none";
                            } else if (i.innerText.includes("Compile Error")){
                                c.style.display = "block";
                                c.innerText = "Failed (Compile Error)";
                                //c.style.fontFamily=ft;
                                c.style.background = i.style.background;
                                i.style.display = "none";
                            } else if (i.innerText.includes("Unshown")){
                                c.style.display = "block";
                                c.innerText = "Unshown";
                                //c.style.fontFamily=ft;
                                c.style.background = i.style.background;
                                i.style.display = "none";
                            } else {
                                c.style.display = "none";
                                i.style.display = "block";
                            }
                        }
                    }
                }
            }
        }
        if(location.pathname.includes("/user/")){
            let stamp=document.getElementsByClassName("introduction marked");
            for(let i of stamp){
                i.style.display="";
            }
            let card=document.getElementsByClassName("main");
            for(let i of card){
                if(i.children[0].children[1].innerText=="系统维护，该内容暂不可见。")i=i.children[0].children[1].style.display="none";
            }
            let tmp=document.getElementsByClassName("problem-count");
            let ppWeights = [0, 1, 2, 4, 8, 16, 32, 64];
            let pp = 0;
            for (let i = 0; i < tmp.length && i < ppWeights.length; i++) {
                let score = Number(tmp[i].innerText.substr(0, tmp[i].innerText.length - 1));
                pp += score * ppWeights[i];
            }
            let disp=document.getElementsByClassName("lfe-caption caption");
            for(let i of disp){
                i.innerText="pp = "+parseFloat(pp.toFixed(2));
                //i.style.fontFamily=ft;
            }

            if (location.pathname.includes("/following") || location.pathname.includes("/follower")) {
                let follows = document.getElementsByClassName("follow-container");
                for (let item of follows) {
                    if (item.dataset["ppflag"] == 1) continue;
                    let ppValue = "";
                    let stats = item.getElementsByClassName("field");
                    for (let stat of stats) {
                        let name = stat.getElementsByClassName("stat-text name")[0];
                        let value = stat.getElementsByClassName("stat-text value")[0];
                        if (name && value && name.innerText == "等级分") {
                            ppValue = value.innerText;
                            break;
                        }
                    }
                    let userName = item.getElementsByClassName("luogu-username")[0];
                    if (userName && ppValue) {
                        let tag = document.createElement("span");
                        tag.className = "pp-tag";
                        tag.innerText = " pp=" + ppValue;
                        tag.style.marginLeft = "6px";
                        tag.style.padding = "0 6px";
                        tag.style.borderRadius = "999px";
                        tag.style.background = "rgb(123, 44, 191)";
                        tag.style.color = "rgb(255, 255, 255)";
                        tag.style.fontSize = "0.9em";
                        tag.style.fontWeight = "bold";
                        tag.style.verticalAlign = "middle";
                        userName.appendChild(tag);
                        item.dataset["ppflag"] = 1;
                    }
                }
            }
        }
        if(location.pathname.includes("/discuss/")){
            // location.href=`https://www.luogu.me/${location.pathname.split('/')[2]}`;
        }
    }, 10);
})();
