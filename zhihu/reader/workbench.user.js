// ==UserScript==
// @name         知乎小助手 · 极简工作台
// @namespace    http://tampermonkey.net/
// @version      2026.10.15.1
// @description  将页面改为极简工作台风格，保留独立搜索，隐藏网站导航和侧栏，并折叠正文图片。
// @homepageURL  https://github.com/kaokei/userscripts
// @supportURL   https://github.com/kaokei/userscripts/issues
// @updateURL    https://raw.githubusercontent.com/kaokei/userscripts/main/zhihu/reader/workbench.user.js
// @downloadURL  https://raw.githubusercontent.com/kaokei/userscripts/main/zhihu/reader/workbench.user.js
// @match        *://*.zhihu.com/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=zhihu.com
// @run-at       document-start
// @grant        GM_addStyle
// @noframes
// ==/UserScript==

(function () {
    'use strict';

    const imageControlSelector = 'details[data-zhihu-helper-image]';
    const foldedImageSelector = 'img[data-zhihu-helper-folded]';
    const imageControls = new WeakMap();
    const pendingRoots = new Set();
    let pendingTimer = null;

    // 保留原生搜索组件及其交互，只让搜索表单在顶部独立显示。
    GM_addStyle(`
        .AppHeader:not(:has(.SearchBar)),
        #root div:has(> header.AppHeader):not(:has(.SearchBar)),
        #root div:has(> header.AppHeader) + div:empty:has(+ main.App-main),
        #root header.AppHeader + div:empty:has(+ main.App-main),
        .CornerButtonsGroup,
        .CornerButtons {
            display: none !important;
        }
        #root div:has(> header.AppHeader):has(.SearchBar) {
            display: block !important;
            height: 0 !important;
            min-height: 0 !important;
            pointer-events: none !important;
        }
        .AppHeader:has(.SearchBar) {
            display: block !important;
            height: 0 !important;
            min-height: 0 !important;
            padding: 0 !important;
            border: 0 !important;
            background: transparent !important;
            box-shadow: none !important;
            overflow: visible !important;
        }
        .AppHeader:has(.SearchBar),
        .AppHeader:has(.SearchBar) * {
            visibility: hidden !important;
            pointer-events: none !important;
        }
        .AppHeader .SearchBar {
            position: fixed !important;
            top: 12px !important;
            left: 50% !important;
            right: auto !important;
            transform: translateX(-50%) !important;
            width: min(640px, calc(100vw - 32px)) !important;
            height: 38px !important;
            margin: 0 !important;
            z-index: 100 !important;
        }
        .AppHeader .SearchBar > :not(.SearchBar-tool) {
            display: none !important;
        }
        .AppHeader .SearchBar .SearchBar-tool {
            width: 100% !important;
            height: 100% !important;
            margin: 0 !important;
            overflow: visible !important;
        }
        .AppHeader .SearchBar .SearchBar-input {
            width: 100% !important;
            max-width: none !important;
            margin: 0 !important;
            box-sizing: border-box !important;
        }
        .AppHeader .SearchBar .SearchBar-tool,
        .AppHeader .SearchBar .SearchBar-tool * {
            visibility: visible !important;
            pointer-events: auto !important;
        }
        #root:has(header.AppHeader .SearchBar) main.App-main {
            padding-top: 62px !important;
        }
        .Topstory-container {
            justify-content: center !important;
        }
        [data-za-detail-view-path-module="RightSideBar"],
        .WriteArea.Card {
            display: none !important;
        }
        details summary {
            cursor: pointer;
        }
        .RichContent img[data-zhihu-helper-folded] {
            display: none !important;
        }
        .RichContent details[data-zhihu-helper-image][open] + img[data-zhihu-helper-folded] {
            display: block !important;
        }

        /* 使用系统无衬线字体和浅灰配色，把信息流整理为紧凑的工作台。 */
        :root {
            --reader-background: #f2f4f7;
            --reader-paper: #ffffff;
            --reader-text: #252a34;
            --reader-muted: #737c8c;
            --reader-line: #e3e7ed;
            --reader-accent: #505c70;
            --reader-font: -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
            --MapBrand01: #505c70 !important;
            --MapText01: #252a34 !important;
            --MapText02: #737c8c !important;
            --MapText02A: #737c8c !important;
            --MapBG01: #ffffff !important;
            --MapBG02: #f2f4f7 !important;
            color-scheme: light !important;
        }
        html,
        body {
            background: var(--reader-background) !important;
            color: var(--reader-text) !important;
        }
        body,
        #root main,
        #root .RichContent,
        #root .RichContent-inner,
        #root .RichText {
            font-family: var(--reader-font) !important;
            font-size: 14px !important;
            line-height: 1.7 !important;
            color: var(--reader-text) !important;
        }
        body::before {
            content: "";
            position: fixed;
            inset: 0 0 auto;
            height: 62px;
            background: var(--reader-background);
            border-bottom: 1px solid var(--reader-line);
            z-index: 90;
            pointer-events: none;
        }
        #root .Topstory-container,
        #root .Question-main,
        #root .QuestionPage,
        #root .Search-container {
            width: min(1040px, calc(100vw - 40px)) !important;
            max-width: 1040px !important;
            margin: 18px auto 36px !important;
            padding: 24px 32px !important;
            box-sizing: border-box !important;
            background: var(--reader-paper) !important;
            border: 1px solid var(--reader-line) !important;
            border-radius: 6px !important;
            box-shadow: none !important;
        }
        #root .Topstory-mainColumn,
        #root .Question-mainColumn,
        #root .SearchMain {
            width: 100% !important;
            max-width: none !important;
            flex: 1 !important;
            margin: 0 !important;
        }
        #root .Search-container > :not(.SearchMain) {
            display: none !important;
        }
        #root .SearchTabs {
            position: relative !important;
            width: min(1040px, calc(100vw - 40px)) !important;
            margin: 12px auto 0 !important;
            background: transparent !important;
            border: 0 !important;
            box-shadow: none !important;
        }
        #root .SearchTabs-inner {
            width: 100% !important;
            padding: 0 !important;
        }
        #root .SearchTabs .Tabs-link {
            font-family: var(--reader-font) !important;
            font-size: 12px !important;
            color: var(--reader-muted) !important;
        }
        #root .SearchTabs .is-active {
            color: var(--reader-accent) !important;
            border-color: var(--reader-accent) !important;
        }
        #root .Topstory-mainColumnCard,
        #root main .Card,
        #root .Question-main .Card,
        #root .QuestionHeader,
        #root .QuestionHeader-footer {
            background: transparent !important;
            border-radius: 0 !important;
            box-shadow: none !important;
        }
        #root .TopstoryItem,
        #root .Question-main .List-item,
        #root .QuestionPage .List-item {
            padding: 18px 0 !important;
            margin: 0 !important;
            border: 0 !important;
            border-bottom: 1px solid var(--reader-line) !important;
        }
        #root .TopstoryItem:first-child {
            padding-top: 0 !important;
        }
        #root .TopstoryItem .Feed,
        #root .TopstoryItem .ContentItem {
            padding: 0 !important;
        }
        #root .ContentItem-title,
        #root .ContentItem-title a,
        #root .QuestionHeader-title,
        #root .RichText h1,
        #root .RichText h2 {
            font-family: var(--reader-font) !important;
            color: var(--reader-text) !important;
            font-size: 18px !important;
            line-height: 1.5 !important;
            font-weight: 600 !important;
        }
        #root .ContentItem-title {
            margin: 0 0 8px !important;
        }
        #root .RichContent a,
        #root .ContentItem-more,
        #root .ContentItem-time {
            color: var(--reader-accent) !important;
        }
        #root .ContentItem-meta,
        #root .AuthorInfo,
        #root .AuthorInfo-name,
        #root .AuthorInfo-name a,
        #root .AuthorInfo-detail,
        #root .ContentItem-time {
            font-family: var(--reader-font) !important;
            font-size: 12px !important;
            color: var(--reader-muted) !important;
        }
        #root .AuthorInfo-avatarWrapper,
        #root .AuthorInfo-avatar,
        #root .AuthorInfo-badge,
        #root .Question-sideColumn,
        #root .QuestionPage .QuestionHeader-side {
            display: none !important;
        }
        #root .QuestionPage div:has(#QuestionAnswers-answers),
        #root .QuestionPage #QuestionAnswers-answers,
        #root .QuestionPage .QuestionHeader,
        #root .QuestionPage .QuestionHeader-content,
        #root .QuestionPage .QuestionHeader-main,
        #root .QuestionPage .QuestionHeader-footer > div {
            width: 100% !important;
            min-width: 0 !important;
            max-width: none !important;
            margin-left: 0 !important;
            margin-right: 0 !important;
            padding-left: 0 !important;
            padding-right: 0 !important;
            box-sizing: border-box !important;
        }
        #root .QuestionPage .Tag,
        #root .QuestionPage .Tag-content,
        #root .QuestionPage .Tag a,
        #root .QuestionPage .QuestionHeader-footer .Button {
            color: var(--reader-accent) !important;
            background: transparent !important;
            border-color: var(--reader-line) !important;
            border-radius: 2px !important;
            font-family: var(--reader-font) !important;
            font-size: 12px !important;
            box-shadow: none !important;
        }
        #root .QuestionPage .QuestionHeader-footer .Button--withLabel svg,
        #root .QuestionPage .QuestionHeader-footer .QuestionButton-icon {
            display: none !important;
        }
        #root .QuestionPage .QuestionHeader-footer .Button {
            padding: 4px 10px !important;
            white-space: nowrap !important;
            flex-shrink: 0 !important;
        }
        #root .QuestionPage .QuestionHeader-main > div,
        #root .QuestionPage .QuestionRichText {
            width: 100% !important;
            min-width: 0 !important;
            max-width: 100% !important;
            box-sizing: border-box !important;
            overflow-wrap: anywhere !important;
        }
        #root .QuestionPage .QuestionRichText--video > div:last-child {
            flex: 1 1 0% !important;
            width: auto !important;
            min-width: 0 !important;
        }
        #root .ContentItem-actions,
        #root .RichContent-actions {
            position: static !important;
            background: transparent !important;
            box-shadow: none !important;
            border: 0 !important;
            padding: 6px 0 0 !important;
            margin-top: 8px !important;
            opacity: 0.65 !important;
            transition: opacity 160ms ease;
        }
        #root .ContentItem-actions:hover,
        #root .ContentItem-actions:focus-within {
            opacity: 1 !important;
        }
        #root .ContentItem-actions .Button,
        #root .Button.FollowButton,
        #root .Button.VoteButton {
            font-family: var(--reader-font) !important;
            font-size: 12px !important;
            color: var(--reader-muted) !important;
            background: transparent !important;
            border: 0 !important;
            border-radius: 2px !important;
            box-shadow: none !important;
        }
        #root .ContentItem-actions .Button--withLabel svg,
        #root .ContentItem-actions .VoteButton svg {
            display: none !important;
        }
        #root .ContentItem-actions .VoteButton--down::before {
            content: "−";
        }
        #root .ContentItem-actions .Button:hover,
        #root .Button.FollowButton:hover {
            color: var(--reader-text) !important;
            background: #f2f4f7 !important;
        }
        #root .RichContent details {
            margin: 10px 0 !important;
            padding: 6px 10px !important;
            background: #f7f8fa !important;
            border: 1px solid var(--reader-line) !important;
            border-radius: 2px !important;
        }
        #root .RichContent details summary {
            color: var(--reader-muted) !important;
            font-family: var(--reader-font) !important;
            font-size: 12px !important;
        }
        #root .RichContent details summary b {
            font-weight: normal !important;
        }
        /* 收紧首页封面占位，展开时恢复图片宽度，图片仍留在原父节点。 */
        #root .RichContent-cover:has(details[data-zhihu-helper-image]) {
            width: 88px !important;
            height: auto !important;
            margin-right: 16px !important;
            overflow: visible !important;
        }
        #root .RichContent-cover:has(details[data-zhihu-helper-image][open]) {
            width: 190px !important;
        }
        #root .RichContent-cover:has(details[data-zhihu-helper-image])::after {
            display: none !important;
        }
        #root .RichContent-cover-inner:has(> details[data-zhihu-helper-image]) {
            position: static !important;
            width: 100% !important;
            height: auto !important;
            overflow: visible !important;
        }
        #root .RichContent-cover details[data-zhihu-helper-image] {
            margin: 0 !important;
        }
        #root .RichContent-cover img[data-zhihu-helper-folded] {
            position: static !important;
            width: 100% !important;
            height: auto !important;
            max-width: 100% !important;
        }
        .AppHeader .SearchBar::before {
            content: "工作台";
            position: absolute;
            right: calc(100% + 24px);
            top: 8px;
            font-family: var(--reader-font);
            font-size: 13px;
            font-weight: 600;
            letter-spacing: 0.02em;
            color: var(--reader-text);
            white-space: nowrap;
            visibility: visible !important;
        }
        .AppHeader .SearchBar .SearchBar-input {
            background: var(--reader-paper) !important;
            border: 1px solid var(--reader-line) !important;
            border-radius: 5px !important;
            box-shadow: none !important;
        }
        .AppHeader .SearchBar .SearchBar-input:focus-within {
            border-color: var(--reader-accent) !important;
            box-shadow: 0 0 0 2px rgba(80, 92, 112, 0.08) !important;
        }
        .AppHeader .SearchBar input {
            background: transparent !important;
            color: var(--reader-text) !important;
            font-family: var(--reader-font) !important;
            font-size: 13px !important;
        }
        .AppHeader .SearchBar input::placeholder {
            color: var(--reader-muted) !important;
        }
        .AppHeader .SearchBar .SearchBar-searchButton,
        .AppHeader .SearchBar .SearchBar-searchIcon {
            background: transparent !important;
            color: var(--reader-accent) !important;
            border-color: var(--reader-line) !important;
            border-radius: 0 !important;
            box-shadow: none !important;
        }
        @media (max-width: 780px) {
            .AppHeader .SearchBar::before {
                display: none !important;
            }
            #root .Topstory-container,
            #root .Question-main,
            #root .QuestionPage,
            #root .Search-container {
                width: calc(100vw - 24px) !important;
                margin-top: 12px !important;
                padding: 18px 16px !important;
            }
            #root .ContentItem-title,
            #root .ContentItem-title a {
                font-size: 17px !important;
            }
        }
    `);

    function updateSearchPlaceholder() {
        document.querySelectorAll('.AppHeader .SearchBar-tool input').forEach((input) => {
            if (input.getAttribute('placeholder') !== '搜索内容…') {
                input.setAttribute('placeholder', '搜索内容…');
            }
        });
    }

    function updateFavicon() {
        // 处理所有网站图标，以及单页切换后重新写入的图标。
        document.querySelectorAll('link[rel~="icon" i]').forEach((icon) => {
            if (icon.getAttribute('href') !== 'data:,') {
                icon.setAttribute('href', 'data:,');
            }
        });
        // 中性标签页标题避免继续显示站点名称和未读消息标记。
        if (document.title !== '工作台') {
            document.title = '工作台';
        }
    }

    function stopImageControlClick(event) {
        event.stopPropagation();
    }

    function foldImages(root) {
        const images = root.matches('img') ? [root] : root.querySelectorAll('img');
        for (const image of images) {
            // 保留行内表情和已有折叠区域，避免重复或嵌套折叠。
            if (!image.isConnected || !image.closest('.RichContent') || image.closest('details')) {
                continue;
            }
            const previousControl = image.previousElementSibling;
            const existingControl = imageControls.get(image)
                || (image.matches(foldedImageSelector) && previousControl?.matches(imageControlSelector) ? previousControl : null);
            if (existingControl) {
                // 接管旧控件时补齐事件处理，避免封面点击触发网站展开整个回答。
                existingControl.querySelector('summary')?.addEventListener('click', stopImageControlClick);
                // 网站可以正常移动图片；只调整由脚本创建的折叠控件。
                if (image.previousElementSibling !== existingControl) {
                    image.before(existingControl);
                }
                imageControls.set(image, existingControl);
                continue;
            }
            if (getComputedStyle(image).display !== 'block') {
                continue;
            }

            const details = document.createElement('details');
            details.setAttribute('data-zhihu-helper-image', '');
            const summary = document.createElement('summary');
            summary.addEventListener('click', stopImageControlClick);
            const label = document.createElement('b');
            label.textContent = '图片';
            summary.appendChild(label);
            details.appendChild(summary);

            // 图片留在原父节点，避免破坏网站页面切换时的 DOM 删除操作。
            image.setAttribute('data-zhihu-helper-folded', '');
            image.before(details);
            imageControls.set(image, details);
        }
    }

    function cleanRemovedImages(root) {
        if (!(root instanceof Element)) {
            return;
        }
        const images = root.matches(foldedImageSelector) ? [root] : root.querySelectorAll(foldedImageSelector);
        for (const image of images) {
            if (!image.isConnected) {
                imageControls.get(image)?.remove();
                imageControls.delete(image);
                image.removeAttribute('data-zhihu-helper-folded');
            }
        }
    }

    function upgradeImageControls() {
        // 兼容此前由本脚本创建的包裹控件，把图片恢复到原父节点。
        document.querySelectorAll('.RichContent details[data-zhihu-helper-image] > img').forEach((image) => {
            const control = image.parentElement;
            image.setAttribute('data-zhihu-helper-folded', '');
            control.after(image);
            imageControls.set(image, control);
        });
    }

    function queueImages(root) {
        if (!(root instanceof Element) || !root.isConnected || root.closest(imageControlSelector)) {
            return;
        }
        pendingRoots.add(root.closest('.RichContent') || root);

        // 固定窗口内集中处理，不反复延后，避免持续更新导致图片一直未折叠。
        if (pendingTimer !== null) {
            return;
        }
        pendingTimer = setTimeout(() => {
            const roots = Array.from(pendingRoots);
            pendingRoots.clear();
            pendingTimer = null;
            for (const changedRoot of roots) {
                if (changedRoot.isConnected) {
                    foldImages(changedRoot);
                }
            }
        }, 100);
    }

    function init() {
        updateFavicon();
        updateSearchPlaceholder();
        upgradeImageControls();
        // 主动处理初始内容，无需等待页面发生 DOM 更新。
        foldImages(document.body);

        const imageObserver = new MutationObserver((mutations) => {
            for (const mutation of mutations) {
                if (mutation.type === 'childList') {
                    mutation.addedNodes.forEach(queueImages);
                    mutation.removedNodes.forEach(cleanRemovedImages);
                    if (Array.from(mutation.removedNodes).some((node) => node instanceof Element && node.matches(imageControlSelector))) {
                        queueImages(mutation.target);
                    }
                } else {
                    queueImages(mutation.target);
                }
            }
            updateSearchPlaceholder();
        });
        imageObserver.observe(document.body, {
            childList: true,
            subtree: true,
            attributes: true,
            attributeFilter: ['class', 'style', 'placeholder'],
        });

        // 图片加载后可能才具备正文图片的块级样式。
        document.addEventListener('load', (event) => {
            if (event.target instanceof HTMLImageElement) {
                queueImages(event.target);
            }
        }, true);

        if (document.head) {
            const faviconObserver = new MutationObserver(updateFavicon);
            faviconObserver.observe(document.head, {
                childList: true,
                subtree: true,
                characterData: true,
                attributes: true,
                attributeFilter: ['href', 'rel'],
            });
        }
    }

    // 兼容页面开始时执行，以及文档加载完成后手动运行的情况。
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init, { once: true });
    } else {
        init();
    }
})();
