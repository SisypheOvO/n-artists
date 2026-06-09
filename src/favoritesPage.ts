import { getFavorites, getThumbnails } from "./storage"

function renderFavorites(container: HTMLElement) {
    const favs = getFavorites()
    const thumbs = getThumbnails()
    container.innerHTML = ""
    for (const artist of favs) {
        const thumb = thumbs.get(artist) || ""
        const root = document.createElement("div")
        root.className = "gallery-favorite"
        root.setAttribute("artist-name", artist)

        const gallery = document.createElement("div")
        gallery.className = "gallery"
        gallery.style = "margin-bottom: 4px;"

        const link = document.createElement("a")
        link.className = "cover"
        link.href = `/artist/${artist.replace(/\s/g, "-")}/`

        const img = document.createElement("img")
        img.width = 250
        img.height = 353
        if (thumb) img.src = thumb
        img.alt = artist
        img.style = "position: relative; object-fit: cover; width: 100%; height: 100%;"

        const caption = document.createElement("div")
        caption.className = "caption"
        caption.textContent = artist
        caption.style = "position: relative;"

        link.appendChild(img)
        link.appendChild(caption)
        link.style = "display: inline-flex; padding: 0; margin: 0; flex-direction: column; align-items: center;"
        gallery.appendChild(link)
        root.appendChild(gallery)
        container.appendChild(root)
    }
}

function injectDisplayButtonStyle() {
    if (document.getElementById("favorites-display-button-style")) return
    const style = document.createElement("style")
    style.id = "favorites-display-button-style"
    style.textContent = `
    #displayFavoriteArtists {
        margin-left: 0.5em;
        background-color: var(--border);
        transition: background-color 0.2s ease;
    }

    #displayFavoriteArtists:hover {
        background-color: var(--accent-hover);
    }
`
    document.head.appendChild(style)
}

function injectDisplayButton() {
    const element = document.getElementById("favorites-random-button")
    if (!element) return

    if (document.getElementById("displayFavoriteArtists")) return

    const displayButton = document.createElement("button")
    displayButton.id = "displayFavoriteArtists"
    displayButton.className = "btn"
    displayButton.type = "button"
    displayButton.textContent = "Favorite Artists ?"
    element.parentNode?.insertBefore(displayButton, element.nextSibling || null)
    displayButton.addEventListener("click", () => {
        const workspace = document.getElementById("favcontainer")
        if (!workspace) return
        renderFavorites(workspace)
    })
}

export function initFavoritesPage() {
    try {
        injectDisplayButtonStyle()
        injectDisplayButton()

        if ((window as any).__nArtistsFavoritesObserver) return

        const observer = new MutationObserver(() => {
            injectDisplayButton()
        })

        observer.observe(document.body, {
            childList: true,
            subtree: true,
        })
        ;(window as any).__nArtistsFavoritesObserver = observer
    } catch (e) {
        console.error("initFavoritesPage error", e)
    }
}
