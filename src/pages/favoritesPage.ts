import { getFavorites, getThumbnails, saveFavorites, saveThumbnails } from "@/storage"
import { fetchArtistThumbnail } from "@/api"

let showingFavoriteArtists = false
let lastFavoritesRouteKey: string | null = null
let importInputEl: HTMLInputElement | null = null

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

function getFavoriteArtistsTxt(): string {
    const favorites = getFavorites()
    const thumbs = getThumbnails()
    return favorites
        .map((artist) => {
            const thumbnail = thumbs.get(artist) || ""
            return `${artist}\t${thumbnail}`
        })
        .join("\n")
}

function downloadTxtFile(filename: string, content: string) {
    const blob = new Blob([content], { type: "text/plain;charset=utf-8" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = filename
    document.body.appendChild(link)
    link.click()
    link.remove()
    URL.revokeObjectURL(url)
}

function formatTimestamp(date: Date): string {
    const pad = (value: number) => String(value).padStart(2, "0")
    return `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}-${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`
}

function parseFavoriteArtistsTxt(text: string): { artists: string[]; thumbnails: Map<string, string> } {
    const seen = new Set<string>()
    const artists: string[] = []
    const thumbnails = new Map<string, string>()

    for (const rawLine of text.split(/\r?\n/)) {
        const line = rawLine.trim()
        if (!line) continue

        const [artistPart, thumbnailPart = ""] = line.split("\t")
        const artist = artistPart.trim()
        if (!artist) continue
        if (seen.has(artist)) continue
        seen.add(artist)
        artists.push(artist)

        const thumbnail = thumbnailPart.trim()
        if (thumbnail) {
            thumbnails.set(artist, thumbnail)
        }
    }

    return { artists, thumbnails }
}

function getDiffSummary(currentList: string[], importedList: string[]) {
    const currentSet = new Set(currentList)
    const importedSet = new Set(importedList)

    const added = importedList.filter((artist) => !currentSet.has(artist))
    const removed = currentList.filter((artist) => !importedSet.has(artist))

    return { added, removed }
}

function isLargeImportDiff(currentCount: number, addedCount: number, removedCount: number): boolean {
    const threshold = Math.max(10, Math.ceil(currentCount * 0.2))
    return addedCount >= threshold || removedCount >= threshold
}

function formatArtistSample(list: string[], limit = 5): string {
    if (list.length === 0) return "(none)"
    return list.slice(0, limit).join(", ") + (list.length > limit ? ` ... (+${list.length - limit})` : "")
}

function confirmImportReplacement(currentList: string[], importedList: string[]): boolean {
    const { added, removed } = getDiffSummary(currentList, importedList)
    const largeDiff = isLargeImportDiff(currentList.length, added.length, removed.length)
    const warning = largeDiff ? "\n\nWarning: the difference is large. Replacing the current list is irreversible. You may want to back up first." : ""

    const message = ["Review the import file before continuing.", `Current artists: ${currentList.length}`, `Imported artists: ${importedList.length}`, `To be added: ${added.length}`, `To be removed: ${removed.length}`, `Added sample: ${formatArtistSample(added)}`, `Removed sample: ${formatArtistSample(removed)}`, warning, "", "Continue import and overwrite the current list?"].join("\n")

    return window.confirm(message)
}

function refreshFavoriteArtistsView() {
    if (!showingFavoriteArtists) return
    const panel = getArtistsPanel()
    if (!panel) return
    renderFavorites(panel)
}

async function importFavoriteArtistsFile(file: File) {
    const text = await file.text()
    const { artists, thumbnails } = parseFavoriteArtistsTxt(text)
    const currentFavorites = getFavorites()

    if (!confirmImportReplacement(currentFavorites, artists)) {
        return
    }

    const existingThumbnails = getThumbnails()
    const nextThumbnails = new Map<string, string>(existingThumbnails)

    for (const artist of artists) {
        const parsedThumbnail = thumbnails.get(artist)
        if (parsedThumbnail) {
            nextThumbnails.set(artist, parsedThumbnail)
            continue
        }

        const existingThumbnail = existingThumbnails.get(artist)
        if (existingThumbnail) {
            nextThumbnails.set(artist, existingThumbnail)
            continue
        }

        try {
            const fetchedThumbnail = await fetchArtistThumbnail(artist)
            if (fetchedThumbnail) {
                nextThumbnails.set(artist, fetchedThumbnail)
            }
        } catch (e) {
            console.warn("fetch thumbnail during import failed", artist, e)
        }
    }

    saveFavorites(artists)
    saveThumbnails(nextThumbnails)
    refreshFavoriteArtistsView()
}

function getArtistsPanel(): HTMLElement | null {
    return document.getElementById("favorite-artists-panel")
}

function setArtworkPaginationVisible(visible: boolean) {
    const isMobile = window.matchMedia("(max-width: 599px)").matches
    const activeSelector = isMobile ? "mobile-pagination" : "desktop-pagination"
    console.log("Setting artwork pagination visible?", visible, "activeSelector", activeSelector)
    for (const pagination of document.querySelectorAll(".pagination")) {
        const paginationElement = pagination as HTMLElement
        console.log("Pagination element", paginationElement, "activeSelector", activeSelector)
        const isActivePagination = paginationElement.classList.contains(activeSelector)
        console.log("Is active pagination?", isActivePagination)
        paginationElement.style.display = visible && isActivePagination ? "block" : "none"
        console.log("Set pagination display to", paginationElement.style.display)
    }
}

function showFavoriteArtists(button?: HTMLButtonElement) {
    const workspace = getFavoritesWorkspace()
    if (!workspace) return

    let panel = getArtistsPanel()
    if (!panel) {
        panel = document.createElement("div")
        panel.id = "favorite-artists-panel"
        panel.className = "container"
        panel.style = "margin-top: 0.75em; padding: 10px 10px 40px;"
        workspace.insertAdjacentElement("beforebegin", panel)
    }

    workspace.style.display = "none"
    setArtworkPaginationVisible(false)
    panel.style.display = "block"
    renderFavorites(panel)
    showingFavoriteArtists = true
    if (button) updateDisplayButtonLabel(button)
}

function showFavoriteArtworks(button?: HTMLButtonElement) {
    const workspace = getFavoritesWorkspace()
    if (!workspace) return

    const panel = getArtistsPanel()
    if (panel) panel.remove()
    workspace.style.display = "block"
    setArtworkPaginationVisible(true)
    showingFavoriteArtists = false
    if (button) updateDisplayButtonLabel(button)
}

function syncFavoritesRouteState() {
    const currentRouteKey = `${window.location.pathname}${window.location.search}`
    if (lastFavoritesRouteKey !== currentRouteKey) {
        lastFavoritesRouteKey = currentRouteKey
        showingFavoriteArtists = false
        const panel = getArtistsPanel()
        if (panel) panel.remove()
        const workspace = getFavoritesWorkspace()
        if (workspace) workspace.style.display = "block"
        setArtworkPaginationVisible(true)
    }
}

function injectDisplayButtonStyle() {
    if (document.getElementById("favorites-display-button-style")) return
    const style = document.createElement("style")
    style.id = "favorites-display-button-style"
    style.textContent = `
    #displayFavoriteArtists, #exportFavoriteArtists, #importFavoriteArtists {
        margin-left: 0.5em;
        background-color: var(--border);
        transition: background-color 0.2s ease;
    }

    #displayFavoriteArtists:hover, #exportFavoriteArtists:hover, #importFavoriteArtists:hover {
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

    const exportButton = document.createElement("button")
    exportButton.id = "exportFavoriteArtists"
    exportButton.className = "btn"
    exportButton.type = "button"
    exportButton.textContent = "Export Artists TXT"
    exportButton.style.marginLeft = "0.5em"
    exportButton.addEventListener("click", () => {
        downloadTxtFile(`favorite-artists-${formatTimestamp(new Date())}.txt`, `${getFavoriteArtistsTxt()}\n`)
    })

    const importButton = document.createElement("button")
    importButton.id = "importFavoriteArtists"
    importButton.className = "btn"
    importButton.type = "button"
    importButton.textContent = "Import Artists TXT"
    importButton.style.marginLeft = "0.5em"
    importButton.addEventListener("click", () => {
        importInputEl?.click()
    })

    if (!importInputEl) {
        importInputEl = document.createElement("input")
        importInputEl.type = "file"
        importInputEl.accept = ".txt,text/plain"
        importInputEl.hidden = true
        importInputEl.addEventListener("change", async () => {
            const file = importInputEl?.files?.[0]
            if (!file) return
            try {
                await importFavoriteArtistsFile(file)
            } catch (e) {
                console.error("importFavoriteArtistsFile error", e)
            } finally {
                if (importInputEl) importInputEl.value = ""
            }
        })
        document.body.appendChild(importInputEl)
    }

    element.insertAdjacentElement("afterend", importButton)
    element.insertAdjacentElement("afterend", exportButton)
}

export function initFavoritesPage() {
    try {
        injectDisplayButtonStyle()
        syncFavoritesRouteState()
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
