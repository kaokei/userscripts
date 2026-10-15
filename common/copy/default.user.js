// ==UserScript==
// @name         Copying Lifted 网页强力复制
// @version      1.0.5
// @description  临时解除网页的复制、选取和右键限制，适用于所有网站。
// @author       TAOTAO1919
// @match        *://*/*
// @icon         https://cdn.jsdelivr.net/gh/kaokei/static-cdn/icon/peach.svg
// @grant        none
// @license      MIT
// @namespace    https://greasyfork.org/users/1495458
// @homepageURL  https://github.com/kaokei/userscripts
// @supportURL   https://github.com/kaokei/userscripts/issues
// @downloadURL  https://raw.githubusercontent.com/kaokei/userscripts/main/common/copy/default.user.js
// @updateURL    https://raw.githubusercontent.com/kaokei/userscripts/main/common/copy/default.user.js
// ==/UserScript==
// @develop      https://wiki.greasespot.net/Metadata_Block
// @example      https://sfbook.com/scales.htm
// @example      https://www.ratzillacosme.com/blog/global-beauty-marketing-cultural-clash/
// @example      https://www.zhihu.com/question/1910463767457792735/answer/1929126549698873125
// @example      https://www.jianshu.com/p/3f540c02a4b9
// @example      https://blog.csdn.net/hgl868/article/details/45095153

(function () {
    "use strict";

    const block = e => e.stopImmediatePropagation();
    const events = ['copy', 'cut', 'keydown', 'contextmenu', 'mousedown', 'mousemove', 'selectstart', 'paste'];
    function preventDom(d) {
        events.forEach(ev => {
            d.addEventListener(ev, block, true);
        });
    }

    // 清除文档和body元素的事件监听器
    const doc = document;
    const bd = doc.body;
    preventDom(doc);
    preventDom(bd);
    preventDom(window);

    // 清除body上的事件处理函数
    bd.onselectstart = null;
    bd.oncopy = null;
    bd.oncut = null;
    bd.onpaste = null;
    bd.onkeydown = null;
    bd.oncontextmenu = null;
    bd.onmousemove = null;
    bd.onmouseup = null;
    bd.onmousedown = null;
    bd.ondragstart = null;

    // 清除document上的事件处理函数
    const docWrapper = doc.wrappedJSObject || doc;
    docWrapper.onselectstart = null;
    docWrapper.oncopy = null;
    docWrapper.oncut = null;
    docWrapper.onpaste = null;
    docWrapper.onkeydown = null;
    docWrapper.oncontextmenu = null;
    docWrapper.onmousemove = null;
    docWrapper.onmouseup = null;
    docWrapper.onmousedown = null;
    docWrapper.ondragstart = null;

    // 遍历所有DOM元素清除事件限制
    const allElements = document.querySelectorAll('*');
    for (const element of allElements) {
        const elWrapper = element.wrappedJSObject || element;
        elWrapper.onselectstart = null;
        elWrapper.oncopy = null;
        elWrapper.oncut = null;
        elWrapper.onpaste = null;
        elWrapper.onkeydown = null;
        elWrapper.oncontextmenu = null;
        elWrapper.onmousemove = null;
        elWrapper.onmouseup = null;
        elWrapper.onmousedown = null;
        elWrapper.ondragstart = null;
        preventDom(elWrapper);
    }

    // 添加CSS强制启用文本选择
    const head = doc.head || doc.getElementsByTagName('head')[0];
    if (head) {
        const style = document.createElement('style');
        style.textContent = `
            html, * {
                user-select: auto !important;
                -webkit-user-select: auto !important;
                -moz-user-select: auto !important;
                -ms-user-select: auto !important;
            }
            *::selection {
                background-color: #409EFF !important;
                color: #ffffff !important;
                text-shadow: none !important;
            }
        `;
        head.appendChild(style);
    }

    // 劫持getComputedStyle
    const originalGetComputedStyle = window.getComputedStyle;
    window.getComputedStyle = function(element, pseudoElement) {
        const result = originalGetComputedStyle(element, pseudoElement);

        // 创建虚拟样式对象
        const proxy = new Proxy(result, {
            get(target, property) {
                if (property === 'userSelect' || property === 'webkitUserSelect' || property === 'mozUserSelect' || property === 'msUserSelect' ) {
                    return 'none'; // 始终返回"none"欺骗检测
                }
                return Reflect.get(target, property);
            }
        });

        return proxy;
    };
})();
