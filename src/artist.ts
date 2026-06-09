import { toggleFavorite, updateButtonState } from "./toggleFav"
import { getFavorites } from "./storage"

function createBtnWorkPage(className: string, title?: string): HTMLElement {
    const wrapper = document.createElement("span")
    wrapper.style = "padding: 0.13em 0.26em; display: inline-flex; align-items: center; justify-content: center; background-color: var(--border); border-top-left-radius: .3em; border-bottom-left-radius: .3em;"
    const el = document.createElement("i")
    el.className = className
    if (title) el.setAttribute("title", title)
    ;(el as HTMLElement).style.cursor = "pointer"
    wrapper.appendChild(el)
    return wrapper
}

function createBtnArtistPage(className: string, title?: string): HTMLElement {
    const wrapper = document.createElement("span")
    wrapper.style = "padding: 0.13em 0.26em; margin-right: 0.13em; display: inline-flex; align-items: center; justify-content: center; background-color: var(--border); border-radius: .3em; vertical-align: middle;"
    const el = document.createElement("i")
    el.className = className
    if (title) el.setAttribute("title", title)
    ;(el as HTMLElement).style.cursor = "pointer"
    ;(el as HTMLElement).style.lineHeight = "inherit"
    ;(el as HTMLElement).style.margin = "0"
    wrapper.appendChild(el)
    return wrapper
}

function injectFavBtns2WorkPage() {
    const tagContainers = Array.from(document.querySelectorAll("div.tag-container.field-name:not(.hidden)"))
    const artistContainer = tagContainers.find((el) => el.textContent && el.textContent.includes("Artists:"))
    if (!artistContainer) return

    const artistTagChips = Array.from(artistContainer.querySelectorAll("a.tagchip[href^='/artist/']"))
    for (const artistTagChip of artistTagChips) {
        if ((artistTagChip as HTMLElement).querySelector(".favoriteArtistButton")) continue

        const href = artistTagChip.getAttribute("href")
        const match = href?.match(/\/artist\/([^/?#]+)/)
        const artistName = match ? decodeURIComponent(match[1].replace(/-/g, " ")) : null
        if (!artistName) continue

        const btn = createBtnWorkPage("far fa-heart favoriteArtistButton") as HTMLElement
        btn.dataset.artist = artistName
        const added = getFavorites().includes(artistName)
        updateButtonState(added, btn, artistName)

        btn.addEventListener("click", async (event) => {
            event.preventDefault()
            event.stopPropagation()
            const added = await toggleFavorite(artistName)
            updateButtonState(added, btn, artistName)
        })

        artistTagChip.insertAdjacentElement("afterbegin", btn)
    }
}

function injectFavBtns2ArtistPage() {
    const header = document.querySelector("h1")
    if (!header) return

    if ((header as HTMLElement).querySelector(".favoriteArtistButton")) return

    const match = window.location.pathname.match(/\/artist\/([^/]+)\//)
    const artistName = match ? decodeURIComponent(match[1].replace(/-/g, " ")) : null
    if (!artistName) return

    const btn = createBtnArtistPage("far fa-heart favoriteArtistButton") as HTMLElement
    btn.dataset.artist = artistName
    const added = getFavorites().includes(artistName)
    updateButtonState(added, btn, artistName)

    btn.addEventListener("click", async (event) => {
        event.preventDefault()
        event.stopPropagation()
        const added = await toggleFavorite(artistName)
        updateButtonState(added, btn, artistName)
    })

    header.insertAdjacentElement("afterbegin", btn)
}

/**
 * init artwork page by adding favorite buttons to artist tags
 */
export function initWorkPage() {
    try {
        injectFavBtns2WorkPage()

        if ((window as any).__nArtistsWorkObserver) return

        const observer = new MutationObserver(() => {
            injectFavBtns2WorkPage()
        })

        observer.observe(document.body, {
            childList: true,
            subtree: true,
        })
        ;(window as any).__nArtistsWorkObserver = observer
    } catch (e) {
        console.error("initWorkPage error", e)
    }
}

export function initArtistPage() {
    try {
        injectFavBtns2ArtistPage()

        if ((window as any).__nArtistsArtistObserver) return

        const observer = new MutationObserver(() => {
            injectFavBtns2ArtistPage()
        })

        observer.observe(document.body, {
            childList: true,
            subtree: true,
        })
        ;(window as any).__nArtistsArtistObserver = observer
    } catch (e) {
        console.error("initArtistPage error", e)
    }
}
