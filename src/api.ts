const MAX_CONCURRENCY = 3
let activeRequests = 0
const requestQueue: Array<() => void> = []

function acquireSlot(): Promise<void> {
    return new Promise((resolve) => {
        if (activeRequests < MAX_CONCURRENCY) {
            activeRequests++
            resolve()
        } else {
            requestQueue.push(() => {
                activeRequests++
                resolve()
            })
        }
    })
}

function releaseSlot() {
    activeRequests--
    const next = requestQueue.shift()
    if (next) next()
}

async function fetchWithTimeout(input: RequestInfo, init?: RequestInit, timeout = 8000): Promise<Response> {
    const controller = new AbortController()
    const id = setTimeout(() => controller.abort(), timeout)
    try {
        const resp = await fetch(input, { ...(init || {}), signal: controller.signal })
        return resp
    } finally {
        clearTimeout(id)
    }
}

export async function fetchArtistThumbnail(artistName: string): Promise<string | null> {
    await acquireSlot()
    try {
        const slug = artistName.replace(/\s/g, "-")
        const resp = await fetchWithTimeout(`https://nhentai.net/artist/${slug}/popular`, { credentials: "include" }, 8000)
        if (!resp.ok) return null
        const text = await resp.text()
        const rgx = /https:\/\/t[0-9]{1}\.nhentai\.net\/galleries\/[0-9]{1,8}\/thumb\.jpg/
        const m = text.match(rgx)
        return m ? m[0] : null
    } catch (e) {
        if ((e as any)?.name === "AbortError") {
            console.warn("fetchArtistThumbnail aborted (timeout) for", artistName)
        } else {
            console.error("fetchArtistThumbnail error", e)
        }
        return null
    } finally {
        releaseSlot()
    }
}
