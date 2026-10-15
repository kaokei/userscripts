// ==UserScript==
// @name         知乎小助手 · 文档阅读
// @namespace    http://tampermonkey.net/
// @version      2026.10.15.1
// @description  将页面改为无边界暖灰文档阅读风格，保留独立搜索，隐藏网站导航和侧栏，并折叠正文图片。
// @homepageURL  https://github.com/kaokei/userscripts
// @supportURL   https://github.com/kaokei/userscripts/issues
// @updateURL    https://raw.githubusercontent.com/kaokei/userscripts/main/zhihu/reader/document.user.js
// @downloadURL  https://raw.githubusercontent.com/kaokei/userscripts/main/zhihu/reader/document.user.js
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
            width: min(520px, calc(100vw - 32px)) !important;
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
        .Button.FollowButton,
        .Button.VoteButton {
            color: gray !important;
            background: rgba(0, 0, 0, 0.06) !important;
            border-radius: 20px !important;
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

        /* 使用本机字体和暖灰配色，把信息流整理为连续的文档版面。 */
        :root {
            --reader-background: #e9e6df;
            --reader-paper: var(--reader-background);
            --reader-text: #3f3b34;
            --reader-muted: #847b6d;
            --reader-line: #dcd6ca;
            --reader-accent: #75634b;
            --MapBrand01: #75634b !important;
            --MapText01: #3f3b34 !important;
            --MapText02: #847b6d !important;
            --MapText02A: #847b6d !important;
            --MapBG01: var(--reader-background) !important;
            --MapBG02: #e9e6df !important;
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
            font-family: Georgia, "Songti SC", "STSong", serif !important;
            font-size: 17px !important;
            line-height: 1.95 !important;
            color: var(--reader-text) !important;
        }
        body::before {
            content: "";
            position: fixed;
            inset: 0 0 auto;
            height: 62px;
            background: var(--reader-background);
            border-bottom: 0;
            z-index: 90;
            pointer-events: none;
        }
        #root .Topstory-container,
        #root .Question-main,
        #root .QuestionPage,
        #root .Search-container {
            width: min(860px, calc(100vw - 40px)) !important;
            max-width: 860px !important;
            margin: 28px auto 56px !important;
            padding: 44px 52px !important;
            box-sizing: border-box !important;
            background: var(--reader-paper) !important;
            border: 0 !important;
            border-radius: 0 !important;
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
            width: min(860px, calc(100vw - 40px)) !important;
            margin: 16px auto 0 !important;
            background: transparent !important;
            border: 0 !important;
            box-shadow: none !important;
        }
        #root .SearchTabs-inner {
            width: 100% !important;
            padding: 0 !important;
        }
        #root .SearchTabs .Tabs-link {
            font-family: -apple-system, BlinkMacSystemFont, sans-serif !important;
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
            border: 0 !important;
            border-radius: 0 !important;
            box-shadow: none !important;
        }
        #root .TopstoryItem,
        #root .Question-main .List-item,
        #root .QuestionPage .List-item {
            padding: 30px 0 !important;
            margin: 0 !important;
            border: 0 !important;
        }
        /* 消除网站原有的伪元素分隔线，让条目通过留白自然分隔。 */
        #root .TopstoryItem::before,
        #root .TopstoryItem::after,
        #root .Question-main .List-item::after,
        #root .QuestionPage .List-item::after,
        #root .SearchMain .List-item::after {
            display: none !important;
        }
        #root main .List-header {
            background: transparent !important;
            border: 0 !important;
            box-shadow: none !important;
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
            font-family: Georgia, "Songti SC", "STSong", serif !important;
            color: var(--reader-text) !important;
            font-size: 23px !important;
            line-height: 1.65 !important;
            font-weight: 600 !important;
        }
        #root .ContentItem-title {
            margin: 0 0 14px !important;
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
            font-family: -apple-system, BlinkMacSystemFont, sans-serif !important;
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
            font-family: -apple-system, BlinkMacSystemFont, sans-serif !important;
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
            padding: 10px 0 0 !important;
            margin-top: 14px !important;
            opacity: 0.4 !important;
            transition: opacity 160ms ease;
        }
        #root .ContentItem-actions:hover,
        #root .ContentItem-actions:focus-within {
            opacity: 1 !important;
        }
        #root .ContentItem-actions .Button,
        #root .Button.FollowButton {
            font-family: -apple-system, BlinkMacSystemFont, sans-serif !important;
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
        /* 明确标注反对按钮，避免被误认为分隔线，并恢复选中反馈。 */
        #root .ContentItem-actions .VoteButton--down {
            width: auto !important;
            min-width: 48px !important;
            white-space: nowrap !important;
        }
        #root .ContentItem-actions .VoteButton--down::before {
            content: "反对";
        }
        #root .ContentItem-actions .VoteButton--down.is-active::before {
            content: "已反对";
        }
        #root .ContentItem-actions .VoteButton.is-active,
        #root .ContentItem-actions .VoteButton.is-active:hover {
            color: var(--reader-accent) !important;
            background: rgba(117, 99, 75, 0.12) !important;
            font-weight: 600 !important;
        }
        #root .ContentItem-actions .Button:hover,
        #root .Button.FollowButton:hover {
            color: var(--reader-text) !important;
            background: rgba(117, 99, 75, 0.06) !important;
        }
        #root .RichContent details {
            margin: 16px 0 !important;
            padding: 10px 14px !important;
            background: transparent !important;
            border: 0 !important;
            border-radius: 0 !important;
        }
        #root .RichContent details summary {
            color: var(--reader-muted) !important;
            font-size: 14px !important;
        }
        #root .RichContent details summary b {
            font-weight: normal !important;
        }
        /* 折叠封面也融入底色，消除原封面容器的背景和边框遮罩。 */
        #root .RichContent-cover:has(details[data-zhihu-helper-image]),
        #root .RichContent-cover-inner:has(> details[data-zhihu-helper-image]) {
            background: transparent !important;
            box-shadow: none !important;
        }
        #root .RichContent-cover:has(details[data-zhihu-helper-image])::after {
            display: none !important;
        }
        .AppHeader .SearchBar::before {
            content: "阅读笔记";
            position: absolute;
            right: calc(100% + 24px);
            top: 7px;
            font-family: Georgia, "Songti SC", serif;
            font-size: 14px;
            letter-spacing: 0.12em;
            color: var(--reader-muted);
            white-space: nowrap;
            visibility: visible !important;
        }
        .AppHeader .SearchBar .SearchBar-input {
            background: var(--reader-paper) !important;
            border: 1px solid var(--reader-line) !important;
            border-radius: 3px !important;
            box-shadow: none !important;
        }
        .AppHeader .SearchBar .SearchBar-input:focus-within {
            border-color: var(--reader-accent) !important;
            box-shadow: 0 0 0 2px rgba(117, 99, 75, 0.08) !important;
        }
        .AppHeader .SearchBar input {
            background: transparent !important;
            color: var(--reader-text) !important;
            font-family: -apple-system, BlinkMacSystemFont, sans-serif !important;
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
                margin-top: 16px !important;
                padding: 24px 22px !important;
            }
            #root .ContentItem-title,
            #root .ContentItem-title a {
                font-size: 20px !important;
            }
        }
    `);

    function updateSearchPlaceholder() {
        document.querySelectorAll('.AppHeader .SearchBar-tool input').forEach((input) => {
            if (input.getAttribute('placeholder') !== '检索笔记…') {
                input.setAttribute('placeholder', '检索笔记…');
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
        if (document.title !== '阅读笔记') {
            document.title = '阅读笔记';
        }
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
            summary.addEventListener('click', (event) => event.stopPropagation());
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
