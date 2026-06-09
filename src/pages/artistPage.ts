import { toggleFavorite, updateButtonState } from "@/toggling/toggleFav"
import { getFavorites } from "@/storage"

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
