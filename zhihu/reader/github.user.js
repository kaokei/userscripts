// ==UserScript==
// @name         知乎小助手
// @namespace    http://tampermonkey.net/
// @version      2026.10.16.1
// @description  GitHub 风格阅读笔记，点击标题返回首页刷新，保留搜索、图片折叠和原生交互。
// @homepageURL  https://github.com/kaokei/userscripts
// @supportURL   https://github.com/kaokei/userscripts/issues
// @updateURL    https://raw.githubusercontent.com/kaokei/userscripts/main/zhihu/reader/github.user.js
// @downloadURL  https://raw.githubusercontent.com/kaokei/userscripts/main/zhihu/reader/github.user.js
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
    const workspaceId = 'zhihu-reader-workspace';
    const homeUrl = 'https://www.zhihu.com/';
    const trendingPath = '/knowledge-plan/hot-question/hot/0/day';
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
            top: 16px !important;
            left: auto !important;
            right: 32px !important;
            transform: none !important;
            width: min(420px, calc(100vw - 220px)) !important;
            height: 32px !important;
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
            padding-top: 0 !important;
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

        /* 参考 GitHub 的 Primer 配色，呈现仓库标题栏和紧凑的记录列表。 */
        :root {
            --reader-background: #ffffff;
            --reader-paper: var(--reader-background);
            --reader-text: #1f2328;
            --reader-muted: #59636e;
            --reader-line: #d1d9e0;
            --reader-accent: #0969da;
            --reader-font: -apple-system, BlinkMacSystemFont, "Segoe UI", "Noto Sans", "PingFang SC", "Microsoft YaHei", Helvetica, Arial, sans-serif;
            --MapBrand01: #0969da !important;
            --MapText01: #1f2328 !important;
            --MapText02: #59636e !important;
            --MapText02A: #59636e !important;
            --MapBG01: var(--reader-background) !important;
            --MapBG02: #f6f8fa !important;
            color-scheme: light !important;
        }
        /* 统一用户头像为圆形，同时覆盖评论区及根节点之外的弹窗。 */
        .Avatar {
            border-radius: 50% !important;
            object-fit: cover !important;
        }
        html,
        body {
            background: var(--reader-background) !important;
            color: var(--reader-text) !important;
        }
        /* 给独立的固定标题栏预留空间，也适用于没有原生搜索栏的页面。 */
        body { padding-top: 164px !important; }
        body,
        #root main,
        #root .RichContent,
        #root .RichContent-inner,
        #root .RichText {
            font-family: var(--reader-font) !important;
            font-size: 14px !important;
            line-height: 1.65 !important;
            color: var(--reader-text) !important;
        }
        body::before {
            display: none;
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
            width: min(1120px, calc(100vw - 48px)) !important;
            max-width: 1120px !important;
            margin: 24px auto 48px !important;
            padding: 0 !important;
            box-sizing: border-box !important;
            background: var(--reader-paper) !important;
            border: 1px solid var(--reader-line) !important;
            border-radius: 6px !important;
            box-shadow: none !important;
        }
        #root .QuestionPage,
        #root .Question-main {
            padding: 24px !important;
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
            width: min(1120px, calc(100vw - 48px)) !important;
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
            border: 0 !important;
            border-radius: 0 !important;
            box-shadow: none !important;
        }
        #root .TopstoryItem,
        #root .Question-main .List-item,
        #root .QuestionPage .List-item {
            padding: 16px 20px !important;
            margin: 0 !important;
            border: 0 !important;
            border-bottom: 1px solid var(--reader-line) !important;
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
            padding-top: 16px !important;
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
            font-size: 16px !important;
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
            opacity: 0.9 !important;
            transition: opacity 160ms ease;
        }
        #root .ContentItem-actions:hover,
        #root .ContentItem-actions:focus-within {
            opacity: 1 !important;
        }
        #root .ContentItem-actions .Button,
        #root .Button.FollowButton {
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
            background: rgba(9, 105, 218, 0.12) !important;
            font-weight: 600 !important;
        }
        #root .ContentItem-actions .Button:hover,
        #root .Button.FollowButton:hover {
            color: var(--reader-text) !important;
            background: rgba(9, 105, 218, 0.06) !important;
        }
        #root .RichContent details {
            margin: 10px 0 !important;
            padding: 6px 10px !important;
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
        .AppHeader .SearchBar .SearchBar-input {
            display: flex !important;
            align-items: center !important;
            height: 32px !important;
            min-height: 0 !important;
            padding: 0 0 0 12px !important;
            background: #25292e !important;
            border: 1px solid #57606a !important;
            border-radius: 6px !important;
            box-shadow: none !important;
        }
        .AppHeader .SearchBar .SearchBar-input:focus-within {
            border-color: var(--reader-accent) !important;
            box-shadow: 0 0 0 2px rgba(84, 174, 255, 0.35) !important;
        }
        .AppHeader .SearchBar input {
            flex: 1 1 0 !important;
            min-width: 0 !important;
            width: 0 !important;
            height: 30px !important;
            margin: 0 !important;
            padding: 0 !important;
            border: 0 !important;
            outline: none !important;
            box-shadow: none !important;
            line-height: 30px !important;
            background: transparent !important;
            color: #ffffff !important;
            font-family: var(--reader-font) !important;
            font-size: 13px !important;
        }
        .AppHeader .SearchBar input::placeholder {
            color: #c6cdd5 !important;
        }
        .AppHeader .SearchBar .SearchBar-searchButton,
        .AppHeader .SearchBar .SearchBar-searchIcon {
            background: transparent !important;
            color: #c6cdd5 !important;
            border: 0 !important;
            border-radius: 0 !important;
            box-shadow: none !important;
        }
        /* 只保留外层边框，提交按钮完整放在输入框内部。 */
        .AppHeader .SearchBar .SearchBar-searchButton {
            position: static !important;
            transform: none !important;
            display: inline-flex !important;
            align-items: center !important;
            justify-content: center !important;
            flex: 0 0 36px !important;
            width: 36px !important;
            min-width: 0 !important;
            height: 30px !important;
            min-height: 0 !important;
            margin: 0 !important;
            padding: 0 !important;
            line-height: 1 !important;
            border-radius: 0 5px 5px 0 !important;
            box-sizing: border-box !important;
        }
        .AppHeader .SearchBar .SearchBar-searchButton:hover { background: #32383f !important; }
        .AppHeader .SearchBar .SearchBar-searchButton:focus-visible {
            outline: 2px solid #54aeff !important;
            outline-offset: -3px !important;
        }
        /* 独立工具栏放在网站根节点之外，不修改 React 管理的导航节点。 */
        #zhihu-reader-workspace {
            font-family: var(--reader-font);
            color: var(--reader-text);
        }
        .Reader-toolbar {
            position: fixed;
            inset: 0 0 auto;
            height: 64px;
            padding: 0 32px;
            display: flex;
            align-items: center;
            gap: 20px;
            background: #25292e;
            z-index: 90;
            box-sizing: border-box;
        }
        .Reader-home {
            display: inline-flex;
            align-items: center;
            gap: 12px;
            color: #ffffff;
            font-size: 15px;
            font-weight: 600;
            text-decoration: none;
        }
        .Reader-home:hover { color: #c6cdd5; }
        .Reader-home:focus-visible,
        .Reader-tab:focus-visible {
            outline: 2px solid #54aeff;
            outline-offset: 4px;
            border-radius: 4px;
        }
        .Reader-repository {
            position: fixed;
            inset: 64px 0 auto;
            height: 100px;
            padding: 0 32px;
            background: #f6f8fa;
            border-bottom: 1px solid var(--reader-line);
            box-sizing: border-box;
            z-index: 89;
        }
        .Reader-repository-title {
            height: 56px;
            display: flex;
            align-items: center;
            gap: 8px;
            font-size: 18px;
        }
        .Reader-repository-title > svg { color: var(--reader-muted); }
        .Reader-repository-name { color: var(--reader-accent); }
        .Reader-badge {
            border: 1px solid var(--reader-line);
            padding: 1px 7px;
            border-radius: 20px;
            color: var(--reader-muted);
            font-size: 12px;
        }
        .Reader-tabs { display: flex; gap: 8px; height: 44px; overflow-x: auto; scrollbar-width: none; }
        .Reader-tabs::-webkit-scrollbar { display: none; }
        .Reader-tab {
            display: inline-flex;
            flex-shrink: 0;
            align-items: center;
            gap: 8px;
            padding: 0 12px;
            color: var(--reader-text);
            border-bottom: 2px solid transparent;
            font-size: 14px;
            text-decoration: none;
        }
        .Reader-tab:hover { background: #eaeef2; }
        .Reader-tab.is-active { border-bottom-color: #fd8c73; font-weight: 600; }
        .AppHeader:has(.SearchBar) { z-index: 100 !important; }
        .AppHeader .SearchBar::before { content: none !important; display: none !important; }
        .AppHeader .SearchBar .SearchBar-tool svg { color: #c6cdd5 !important; fill: currentColor !important; }
        #root .Topstory-mainColumn .TopstoryItem { border-bottom: 1px solid var(--reader-line) !important; }
        #root .ContentItem-title { position: relative; padding-left: 24px; }
        #root .ContentItem-title::before {
            content: "";
            position: absolute;
            left: 0;
            top: 5px;
            width: 12px;
            height: 12px;
            border: 2px solid #1a7f37;
            border-radius: 50%;
            box-sizing: border-box;
        }
        #root .Topstory-mainColumn .TopstoryItem:last-child { border-bottom: 0 !important; }
        #root .SearchTabs-searchBarContainer,
        #root .SearchTabs-profile { display: none !important; }
        #root .SearchTabs .is-active::after { background: var(--reader-accent) !important; border-color: var(--reader-accent) !important; }
        #root .SearchMain,
        #root .SearchMain * { background: transparent !important; }
        #root .QuestionPage .Select-button,
        .Popover-content,
        .Select-list,
        .Select-option {
            background: #ffffff !important;
            color: var(--reader-text) !important;
            border-color: var(--reader-line) !important;
            font-family: var(--reader-font) !important;
        }
        #root .RichText pre,
        #root .RichText code {
            background: #f6f8fa !important;
            font-family: "SFMono-Regular", Consolas, "Liberation Mono", monospace !important;
            border-radius: 6px;
        }
        #root .RichText blockquote { border-left-color: var(--reader-line) !important; color: var(--reader-muted) !important; }
        /* 清除封面垂直居中的位移，折叠入口与正文处于正常布局中。 */
        #root .RichContent:has(> .RichContent-cover details[data-zhihu-helper-image]) { display: flow-root !important; }
        #root .RichContent-cover:has(details[data-zhihu-helper-image]) {
            position: static !important;
            inset: auto !important;
            transform: none !important;
            width: 88px !important;
            max-width: 100% !important;
            height: auto !important;
            margin: 0 16px 8px 0 !important;
            overflow: visible !important;
        }
        #root .RichContent-cover:has(details[data-zhihu-helper-image][open]) { width: 190px !important; }
        #root .RichContent-cover-inner:has(> details[data-zhihu-helper-image]) {
            position: static !important;
            inset: auto !important;
            transform: none !important;
            width: 100% !important;
            height: auto !important;
            margin: 0 !important;
            overflow: visible !important;
        }
        #root .RichContent-cover details[data-zhihu-helper-image] {
            margin: 0 !important;
            padding: 3px 8px !important;
            background: #f6f8fa !important;
            border: 1px solid var(--reader-line) !important;
            border-radius: 6px !important;
        }
        #root .RichContent-cover img[data-zhihu-helper-folded] {
            width: 100% !important;
            height: auto !important;
            position: static !important;
            transform: none !important;
        }
        #root .RichContent:has(> .RichContent-cover details[data-zhihu-helper-image]) > .ContentItem-actions { clear: both !important; }
        @media (max-width: 780px) {
            .Reader-toolbar,
            .Reader-repository { padding-left: 12px; padding-right: 12px; }
            .Reader-repository-title { font-size: 16px; }
            .Reader-badge { display: none; }
            .Reader-home { gap: 8px; font-size: 14px; }
            .AppHeader .SearchBar { right: 12px !important; width: min(320px, calc(100vw - 180px)) !important; }
            #root .QuestionPage,
            #root .Question-main { padding: 16px !important; }
            .AppHeader .SearchBar::before {
                display: none !important;
            }
            #root .Topstory-container,
            #root .Question-main,
            #root .QuestionPage,
            #root .Search-container {
                width: calc(100vw - 24px) !important;
                margin-top: 16px !important;
                padding: 0 !important;
            }
            #root .ContentItem-title,
            #root .ContentItem-title a {
                font-size: 16px !important;
            }
        }
    `);

    function handleHomeClick(event) {
        // 保留新标签页打开等原生链接行为，普通点击复用知乎 Logo 的处理逻辑。
        if (event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) {
            return;
        }
        const nativeLogo = Array.from(document.querySelectorAll('.AppHeader a[href]')).find((link) => {
            try {
                const url = new URL(link.href);
                return url.hostname === 'www.zhihu.com' && url.pathname === '/'
                    && !link.textContent.trim() && link.querySelector('svg');
            } catch {
                return false;
            }
        });
        event.preventDefault();
        if (nativeLogo) {
            nativeLogo.click();
        } else if (location.hostname === 'www.zhihu.com' && location.pathname === '/' && !location.search) {
            location.reload();
        } else {
            location.assign(homeUrl);
        }
    }

    function ensureWorkspace() {
        if (!document.body) return;
        let workspace = document.getElementById(workspaceId);
        if (!workspace) {
            workspace = document.createElement('div');
            workspace.id = workspaceId;
            // 顶部图形参考 GitHub Octicons，全部内联，不额外加载资源。
            const mark = '<svg aria-hidden="true" viewBox="0 0 24 24" width="32" height="32" fill="currentColor"><path d="M10.226 17.284c-2.965-.36-5.054-2.493-5.054-5.256 0-1.123.404-2.336 1.078-3.144-.292-.741-.247-2.314.09-2.965.898-.112 2.111.36 2.83 1.01.853-.269 1.752-.404 2.853-.404 1.1 0 1.999.135 2.807.382.696-.629 1.932-1.1 2.83-.988.315.606.36 2.179.067 2.942.72.854 1.101 2 1.101 3.167 0 2.763-2.089 4.852-5.098 5.234.763.494 1.28 1.572 1.28 2.807v2.336c0 .674.561 1.056 1.235.786 4.066-1.55 7.255-5.615 7.255-10.646C23.5 6.188 18.334 1 11.978 1 5.62 1 .5 6.188.5 12.545c0 4.986 3.167 9.12 7.435 10.669.606.225 1.19-.18 1.19-.786V20.63a2.9 2.9 0 0 1-1.078.224c-1.483 0-2.359-.808-2.987-2.313-.247-.607-.517-.966-1.034-1.033-.27-.023-.359-.135-.359-.27 0-.27.45-.471.898-.471.652 0 1.213.404 1.797 1.235.45.651.921.943 1.483.943.561 0 .92-.202 1.437-.719.382-.381.674-.718.944-.943"/></svg>';
            const repo = '<svg aria-hidden="true" width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor"><rect x="3" y="1.5" width="10" height="13" rx="1.5"/><path d="M6 1.5v13M8 5h3M8 8h3"/></svg>';
            const issue = '<svg aria-hidden="true" width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor"><circle cx="8" cy="8" r="6"/><circle cx="8" cy="8" r="1" fill="currentColor"/></svg>';
            const activity = '<svg aria-hidden="true" width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor"><path d="M1 8h3l2-5 4 10 2-5h3"/></svg>';
            const trending = '<svg aria-hidden="true" width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor"><path d="m2 12 4-4 3 3 5-7M10 4h4v4"/></svg>';
            workspace.innerHTML = `
                <header class="Reader-toolbar">
                    <a class="Reader-home" href="${homeUrl}" title="返回首页并刷新" aria-label="阅读笔记，返回首页并刷新">${mark}<span>阅读笔记</span></a>
                </header>
                <section class="Reader-repository" aria-label="阅读工作区">
                    <div class="Reader-repository-title">${repo}<span class="Reader-repository-name">reading-notes</span><span>/</span><strong class="Reader-repository-name">workspace</strong><span class="Reader-badge">Notes</span></div>
                    <nav class="Reader-tabs" aria-label="阅读分类">
                        <a class="Reader-tab" data-reader-route="/" href="${homeUrl}" title="阅读推荐记录">${issue}Issues</a>
                        <a class="Reader-tab" data-reader-route="/follow" href="https://www.zhihu.com/follow" title="查看关注内容">${repo}Following</a>
                        <a class="Reader-tab" data-reader-route="/hot" href="https://www.zhihu.com/hot" title="查看热门内容">${activity}Explore</a>
                        <a class="Reader-tab" data-reader-route="${trendingPath}" data-reader-route-prefix="/knowledge-plan/hot-question/" href="https://www.zhihu.com${trendingPath}" title="查看每日热榜" aria-label="Trending，每日热榜">${trending}Trending</a>
                    </nav>
                </section>`;
            workspace.querySelector('.Reader-home').addEventListener('click', handleHomeClick);
            document.body.appendChild(workspace);
        }
        for (const link of workspace.querySelectorAll('[data-reader-route]')) {
            const routePrefix = link.getAttribute('data-reader-route-prefix');
            const active = routePrefix
                ? location.pathname.startsWith(routePrefix)
                : link.getAttribute('data-reader-route') === location.pathname;
            if (link.classList.contains('is-active') !== active) link.classList.toggle('is-active', active);
            if (active && link.getAttribute('aria-current') !== 'page') link.setAttribute('aria-current', 'page');
            if (!active && link.hasAttribute('aria-current')) link.removeAttribute('aria-current');
        }
    }

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
        ensureWorkspace();
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
            ensureWorkspace();
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
