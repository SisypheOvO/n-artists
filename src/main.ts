import { initWorkPage, initArtistPage } from "./artist"
import { initFavoritesPage } from "./favoritesPage"

function smallCSSInject() {
    if (document.getElementById("favorites-search-style")) return
    const style = document.createElement("style")
    style.id = "favorites-search-style"
    style.textContent = `
    #favorites-search {
    display: inline-flex;
}`
    document.head.appendChild(style)
}

function runRoute() {
    const url = window.location.href
    const reg_url_1 = /https:\/\/nhentai\.net\/g\/[0-9]*\/$/
    const reg_url_2 = /https:\/\/nhentai\.net\/user\/favorites$/
    const reg_url_3 = /https:\/\/nhentai\.net\/artist\/[^/]+\/$/
    if (reg_url_1.test(url)) {
        initWorkPage()
    } else if (reg_url_2.test(url)) {
        smallCSSInject()
        initFavoritesPage()
    } else if (reg_url_3.test(url)) {
        initArtistPage()
    }
}

function installRouteWatcher() {
    if ((window as any).__nArtistsRouteWatcherInstalled) return

    const runAndRemember = () => {
        runRoute()
    }

    const wrapHistoryMethod = (methodName: "pushState" | "replaceState") => {
        const original = history[methodName]
        history[methodName] = function (...args) {
            const result = original.apply(history, args as never)
            window.dispatchEvent(new Event("n-artists:locationchange"))
            return result
        } as History[typeof methodName]
    }

    wrapHistoryMethod("pushState")
    wrapHistoryMethod("replaceState")

    window.addEventListener("popstate", runAndRemember)
    window.addEventListener("hashchange", runAndRemember)
    window.addEventListener("n-artists:locationchange", runAndRemember as EventListener)
    ;(window as any).__nArtistsRouteWatcherInstalled = true
}

installRouteWatcher()
runRoute()
