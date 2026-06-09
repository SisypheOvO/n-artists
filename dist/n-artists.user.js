// ==UserScript==
// @name         n-artists
// @namespace    URL
// @version      0.1.0
// @description  Userscript to favourite nhentai artists
// @icon         https://nhentai.net/favicon.png
// @author       Sisyphus
// @license      MIT
// @homepage     https://github.com/SisypheOvO
// @match        https://nhentai.net/*
// @run-at       document-end
// @grant        none
// @downloadURL https://raw.githubusercontent.com/SisypheOvO/n-artists/main/dist/n-artists.user.js
// @updateURL https://raw.githubusercontent.com/SisypheOvO/n-artists/main/dist/n-artists.user.js
// ==/UserScript==


(function () {
    'use strict';

    const FAVORITES_KEY = "favoriteArtists";
    const THUMBS_KEY = "artistsThumbnail";
    function replacer(_key, value) {
        if (value instanceof Map) {
            return { dataType: "Map", value: Array.from(value.entries()) };
        }
        return value;
    }
    function reviver(_key, value) {
        if (typeof value === "object" && value !== null && value.dataType === "Map") {
            return new Map(value.value);
        }
        return value;
    }
    function getFavorites() {
        try {
            return JSON.parse(localStorage.getItem(FAVORITES_KEY) || "[]");
        }
        catch (e) {
            console.error("getFavorites parse error", e);
            return [];
        }
    }
    function saveFavorites(list) {
        localStorage.setItem(FAVORITES_KEY, JSON.stringify(list));
    }
    function getThumbnails() {
        try {
            const raw = localStorage.getItem(THUMBS_KEY);
            if (!raw)
                return new Map();
            return JSON.parse(raw, reviver);
        }
        catch (e) {
            console.error("getThumbnails parse error", e);
            return new Map();
        }
    }
    function saveThumbnails(map) {
        localStorage.setItem(THUMBS_KEY, JSON.stringify(map, replacer));
    }

    const MAX_CONCURRENCY = 3;
    let activeRequests = 0;
    const requestQueue = [];
    function acquireSlot() {
        return new Promise((resolve) => {
            if (activeRequests < MAX_CONCURRENCY) {
                activeRequests++;
                resolve();
            }
            else {
                requestQueue.push(() => {
                    activeRequests++;
                    resolve();
                });
            }
        });
    }
    function releaseSlot() {
        activeRequests--;
        const next = requestQueue.shift();
        if (next)
            next();
    }
    async function fetchWithTimeout(input, init, timeout = 8000) {
        const controller = new AbortController();
        const id = setTimeout(() => controller.abort(), timeout);
        try {
            const resp = await fetch(input, { ...(init || {}), signal: controller.signal });
            return resp;
        }
        finally {
            clearTimeout(id);
        }
    }
    async function fetchArtistThumbnail(artistName) {
        await acquireSlot();
        try {
            const slug = artistName.replace(/\s/g, "-");
            const resp = await fetchWithTimeout(`https://nhentai.net/artist/${slug}/popular`, { credentials: "include" }, 8000);
            if (!resp.ok)
                return null;
            const text = await resp.text();
            const rgx = /https:\/\/t[0-9]{1}\.nhentai\.net\/galleries\/[0-9]{1,8}\/thumb\.jpg/;
            const m = text.match(rgx);
            return m ? m[0] : null;
        }
        catch (e) {
            if (e?.name === "AbortError") {
                console.warn("fetchArtistThumbnail aborted (timeout) for", artistName);
            }
            else {
                console.error("fetchArtistThumbnail error", e);
            }
            return null;
        }
        finally {
            releaseSlot();
        }
    }

    async function toggleFavorite(artistName) {
        try {
            const favs = getFavorites();
            const thumbs = getThumbnails();
            const idx = favs.indexOf(artistName);
            let added = false;
            if (idx === -1) {
                favs.push(artistName);
                added = true;
                // async fetch thumbnail and persist
                fetchArtistThumbnail(artistName)
                    .then((url) => {
                    if (url) {
                        thumbs.set(artistName, url);
                        saveThumbnails(thumbs);
                    }
                })
                    .catch((e) => console.warn("thumbnail fetch failed", e));
            }
            else {
                favs.splice(idx, 1);
                thumbs.delete(artistName);
                saveThumbnails(thumbs);
            }
            saveFavorites(favs);
            return added;
        }
        catch (e) {
            console.error("toggleFavorite error", e);
            return false;
        }
    }
    function updateButtonState(added, btn, artistName) {
        btn.classList.toggle("is-favorite", added);
        const icon = btn.querySelector("i");
        if (!icon)
            return;
        if (added) {
            icon.classList.remove("far");
            icon.classList.add("fa");
            icon.style.color = "var(--accent)";
        }
        else {
            icon.classList.remove("fa");
            icon.classList.add("far");
            icon.style.removeProperty("color");
        }
    }

    function createBtnWorkPage(className, title) {
        const wrapper = document.createElement("span");
        wrapper.style = "padding: 0.13em 0.26em; display: inline-flex; align-items: center; justify-content: center; background-color: var(--border); border-top-left-radius: .3em; border-bottom-left-radius: .3em;";
        const el = document.createElement("i");
        el.className = className;
        el.style.cursor = "pointer";
        wrapper.appendChild(el);
        return wrapper;
    }
    function createBtnArtistPage(className, title) {
        const wrapper = document.createElement("span");
        wrapper.style = "padding: 0.13em 0.26em; margin-right: 0.13em; display: inline-flex; align-items: center; justify-content: center; background-color: var(--border); border-radius: .3em; vertical-align: middle;";
        const el = document.createElement("i");
        el.className = className;
        el.style.cursor = "pointer";
        el.style.lineHeight = "inherit";
        el.style.margin = "0";
        wrapper.appendChild(el);
        return wrapper;
    }
    function injectFavBtns2WorkPage() {
        const tagContainers = Array.from(document.querySelectorAll("div.tag-container.field-name:not(.hidden)"));
        const artistContainer = tagContainers.find((el) => el.textContent && el.textContent.includes("Artists:"));
        if (!artistContainer)
            return;
        const artistTagChips = Array.from(artistContainer.querySelectorAll("a.tagchip[href^='/artist/']"));
        for (const artistTagChip of artistTagChips) {
            if (artistTagChip.querySelector(".favoriteArtistButton"))
                continue;
            const href = artistTagChip.getAttribute("href");
            const match = href?.match(/\/artist\/([^/?#]+)/);
            const artistName = match ? decodeURIComponent(match[1].replace(/-/g, " ")) : null;
            if (!artistName)
                continue;
            const btn = createBtnWorkPage("far fa-heart favoriteArtistButton");
            btn.dataset.artist = artistName;
            const added = getFavorites().includes(artistName);
            updateButtonState(added, btn);
            btn.addEventListener("click", async (event) => {
                event.preventDefault();
                event.stopPropagation();
                const added = await toggleFavorite(artistName);
                updateButtonState(added, btn);
            });
            artistTagChip.insertAdjacentElement("afterbegin", btn);
        }
    }
    function injectFavBtns2ArtistPage() {
        const header = document.querySelector("h1");
        if (!header)
            return;
        if (header.querySelector(".favoriteArtistButton"))
            return;
        const match = window.location.pathname.match(/\/artist\/([^/]+)\//);
        const artistName = match ? decodeURIComponent(match[1].replace(/-/g, " ")) : null;
        if (!artistName)
            return;
        const btn = createBtnArtistPage("far fa-heart favoriteArtistButton");
        btn.dataset.artist = artistName;
        const added = getFavorites().includes(artistName);
        updateButtonState(added, btn);
        btn.addEventListener("click", async (event) => {
            event.preventDefault();
            event.stopPropagation();
            const added = await toggleFavorite(artistName);
            updateButtonState(added, btn);
        });
        header.insertAdjacentElement("afterbegin", btn);
    }
    /**
     * init artwork page by adding favorite buttons to artist tags
     */
    function initWorkPage() {
        try {
            injectFavBtns2WorkPage();
            if (window.__nArtistsWorkObserver)
                return;
            const observer = new MutationObserver(() => {
                injectFavBtns2WorkPage();
            });
            observer.observe(document.body, {
                childList: true,
                subtree: true,
            });
            window.__nArtistsWorkObserver = observer;
        }
        catch (e) {
            console.error("initWorkPage error", e);
        }
    }
    function initArtistPage() {
        try {
            injectFavBtns2ArtistPage();
            if (window.__nArtistsArtistObserver)
                return;
            const observer = new MutationObserver(() => {
                injectFavBtns2ArtistPage();
            });
            observer.observe(document.body, {
                childList: true,
                subtree: true,
            });
            window.__nArtistsArtistObserver = observer;
        }
        catch (e) {
            console.error("initArtistPage error", e);
        }
    }

    let originalFavoritesHtml = null;
    let showingFavoriteArtists = false;
    function getFavoritesWorkspace() {
        return document.getElementById("favcontainer");
    }
    function updateDisplayButtonLabel(button) {
        button.textContent = showingFavoriteArtists ? "Show Favorite Doujins" : "Show Favorite Artists";
        button.setAttribute("aria-pressed", showingFavoriteArtists ? "true" : "false");
    }
    function renderFavorites(container) {
        const favs = getFavorites();
        const thumbs = getThumbnails();
        container.innerHTML = "";
        for (const artist of favs) {
            const thumb = thumbs.get(artist) || "";
            const root = document.createElement("div");
            root.className = "gallery-favorite";
            root.setAttribute("artist-name", artist);
            const gallery = document.createElement("div");
            gallery.className = "gallery";
            gallery.style = "margin-bottom: 4px;";
            const link = document.createElement("a");
            link.className = "cover";
            link.href = `/artist/${artist.replace(/\s/g, "-")}/`;
            const img = document.createElement("img");
            img.width = 250;
            img.height = 353;
            if (thumb)
                img.src = thumb;
            img.alt = artist;
            img.style = "position: relative; object-fit: cover; width: 100%; height: 100%;";
            const caption = document.createElement("div");
            caption.className = "caption";
            caption.textContent = artist;
            caption.style = "position: relative;";
            link.appendChild(img);
            link.appendChild(caption);
            link.style = "display: inline-flex; padding: 0; margin: 0; flex-direction: column; align-items: center;";
            gallery.appendChild(link);
            root.appendChild(gallery);
            container.appendChild(root);
        }
    }
    function showFavoriteArtists(button) {
        const workspace = getFavoritesWorkspace();
        if (!workspace)
            return;
        if (originalFavoritesHtml === null) {
            originalFavoritesHtml = workspace.innerHTML;
        }
        renderFavorites(workspace);
        showingFavoriteArtists = true;
        if (button)
            updateDisplayButtonLabel(button);
    }
    function showFavoriteArtworks(button) {
        const workspace = getFavoritesWorkspace();
        if (!workspace)
            return;
        if (originalFavoritesHtml !== null) {
            workspace.innerHTML = originalFavoritesHtml;
        }
        showingFavoriteArtists = false;
        if (button)
            updateDisplayButtonLabel(button);
    }
    function injectDisplayButtonStyle() {
        if (document.getElementById("favorites-display-button-style"))
            return;
        const style = document.createElement("style");
        style.id = "favorites-display-button-style";
        style.textContent = `
    #displayFavoriteArtists {
        margin-left: 0.5em;
        background-color: var(--border);
        transition: background-color 0.2s ease;
    }

    #displayFavoriteArtists:hover {
        background-color: var(--accent-hover);
    }
`;
        document.head.appendChild(style);
    }
    function injectDisplayButton() {
        const element = document.getElementById("favorites-random-button");
        if (!element)
            return;
        if (document.getElementById("displayFavoriteArtists"))
            return;
        const displayButton = document.createElement("button");
        displayButton.id = "displayFavoriteArtists";
        displayButton.className = "btn";
        displayButton.type = "button";
        updateDisplayButtonLabel(displayButton);
        element.parentNode?.insertBefore(displayButton, element.nextSibling || null);
        displayButton.addEventListener("click", () => {
            if (showingFavoriteArtists) {
                showFavoriteArtworks(displayButton);
            }
            else {
                showFavoriteArtists(displayButton);
            }
        });
    }
    function initFavoritesPage() {
        try {
            injectDisplayButtonStyle();
            injectDisplayButton();
            if (window.__nArtistsFavoritesObserver)
                return;
            const observer = new MutationObserver(() => {
                injectDisplayButton();
            });
            observer.observe(document.body, {
                childList: true,
                subtree: true,
            });
            window.__nArtistsFavoritesObserver = observer;
        }
        catch (e) {
            console.error("initFavoritesPage error", e);
        }
    }

    function smallCSSInject() {
        if (document.getElementById("favorites-search-style"))
            return;
        const style = document.createElement("style");
        style.id = "favorites-search-style";
        style.textContent = `
    #favorites-search {
    display: inline-flex;
}`;
        document.head.appendChild(style);
    }
    function runRoute() {
        const url = window.location.href;
        const reg_url_1 = /https:\/\/nhentai\.net\/g\/[0-9]*\/$/;
        const reg_url_2 = /https:\/\/nhentai\.net\/user\/favorites$/;
        const reg_url_3 = /https:\/\/nhentai\.net\/artist\/[^/]+\/$/;
        if (reg_url_1.test(url)) {
            initWorkPage();
        }
        else if (reg_url_2.test(url)) {
            smallCSSInject();
            initFavoritesPage();
        }
        else if (reg_url_3.test(url)) {
            initArtistPage();
        }
    }
    function installRouteWatcher() {
        if (window.__nArtistsRouteWatcherInstalled)
            return;
        const runAndRemember = () => {
            runRoute();
        };
        const wrapHistoryMethod = (methodName) => {
            const original = history[methodName];
            history[methodName] = function (...args) {
                const result = original.apply(history, args);
                window.dispatchEvent(new Event("n-artists:locationchange"));
                return result;
            };
        };
        wrapHistoryMethod("pushState");
        wrapHistoryMethod("replaceState");
        window.addEventListener("popstate", runAndRemember);
        window.addEventListener("hashchange", runAndRemember);
        window.addEventListener("n-artists:locationchange", runAndRemember);
        window.__nArtistsRouteWatcherInstalled = true;
    }
    installRouteWatcher();
    runRoute();

})();
