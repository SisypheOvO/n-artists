import { getFavorites, getThumbnails } from "./storage"

let originalFavoritesHtml: string | null = null
let showingFavoriteArtists = false

function getFavoritesWorkspace(): HTMLElement | null {
    return document.getElementById("favcontainer")
}

function updateDisplayButtonLabel(button: HTMLButtonElement) {
    button.textContent = showingFavoriteArtists ? "Show Favorite Doujins" : "Show Favorite Artists"
    button.setAttribute("aria-pressed", showingFavoriteArtists ? "true" : "false")
}

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

function showFavoriteArtists(button?: HTMLButtonElement) {
    const workspace = getFavoritesWorkspace()
    if (!workspace) return

    if (originalFavoritesHtml === null) {
        originalFavoritesHtml = workspace.innerHTML
    }

    renderFavorites(workspace)
    showingFavoriteArtists = true
    if (button) updateDisplayButtonLabel(button)
}

function showFavoriteArtworks(button?: HTMLButtonElement) {
    const workspace = getFavoritesWorkspace()
    if (!workspace) return

    if (originalFavoritesHtml !== null) {
        workspace.innerHTML = originalFavoritesHtml
    }
    showingFavoriteArtists = false
    if (button) updateDisplayButtonLabel(button)
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
    updateDisplayButtonLabel(displayButton)
    element.parentNode?.insertBefore(displayButton, element.nextSibling || null)
    displayButton.addEventListener("click", () => {
        if (showingFavoriteArtists) {
            showFavoriteArtworks(displayButton)
        } else {
            showFavoriteArtists(displayButton)
        }
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
