import { getFavorites, saveFavorites, getThumbnails, saveThumbnails } from "./storage"
import { fetchArtistThumbnail } from "./api"

export async function toggleFavorite(artistName: string): Promise<boolean> {
    try {
        const favs = getFavorites()
        const thumbs = getThumbnails()
        const idx = favs.indexOf(artistName)
        let added = false
        if (idx === -1) {
            favs.push(artistName)
            added = true
            // async fetch thumbnail and persist
            fetchArtistThumbnail(artistName)
                .then((url) => {
                    if (url) {
                        thumbs.set(artistName, url)
                        saveThumbnails(thumbs)
                    }
                })
                .catch((e) => console.warn("thumbnail fetch failed", e))
        } else {
            favs.splice(idx, 1)
            thumbs.delete(artistName)
            saveThumbnails(thumbs)
        }
        saveFavorites(favs)
        return added
    } catch (e) {
        console.error("toggleFavorite error", e)
        return false
    }
}

export function updateButtonState(added: boolean, btn: HTMLElement, artistName: string) {
    btn.classList.toggle("is-favorite", added)
    const icon = btn.querySelector("i")
    if (!icon) return
    if (added) {
        icon.classList.remove("far")
        icon.classList.add("fa")
        icon.style.color = "var(--accent)"
    } else {
        icon.classList.remove("fa")
        icon.classList.add("far")
        icon.style.removeProperty("color")
    }
}
