export type Thumbnails = Map<string, string>

const FAVORITES_KEY = "favoriteArtists"
const THUMBS_KEY = "artistsThumbnail"

export function replacer(_key: any, value: any) {
    if (value instanceof Map) {
        return { dataType: "Map", value: Array.from(value.entries()) }
    }
    return value
}

export function reviver(_key: any, value: any) {
    if (typeof value === "object" && value !== null && value.dataType === "Map") {
        return new Map(value.value)
    }
    return value
}

export function getFavorites(): string[] {
    try {
        return JSON.parse(localStorage.getItem(FAVORITES_KEY) || "[]")
    } catch (e) {
        console.error("getFavorites parse error", e)
        return []
    }
}

export function saveFavorites(list: string[]) {
    localStorage.setItem(FAVORITES_KEY, JSON.stringify(list))
}

export function getThumbnails(): Thumbnails {
    try {
        const raw = localStorage.getItem(THUMBS_KEY)
        if (!raw) return new Map()
        return JSON.parse(raw, reviver) as Thumbnails
    } catch (e) {
        console.error("getThumbnails parse error", e)
        return new Map()
    }
}

export function saveThumbnails(map: Thumbnails) {
    localStorage.setItem(THUMBS_KEY, JSON.stringify(map, replacer))
}
