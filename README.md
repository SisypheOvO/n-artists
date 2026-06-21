# n-artists

![License](https://img.shields.io/badge/license-MIT-green.svg)

A userscript to favorite nhentai artists. It should work on `/g/.../`, `/artist/` and `/favorites/` pages. The list of favorite artists is always stored in LocalStorage.

## Demo

Artist Page:

![Demo](assets/artist-page.png)

Artwork Page:

![Demo](assets/artwork-page.png)

Favorites Page:

![Demo](assets/favorites-page.png)

## Features

Aside from the main functionality, it also

- Allows importing and exporting favorite artists as a list txt file.
- Allows searching artists in the favorites page by name.
- Allows sorting artists in the favorites page by name or by the fav date.
- ~~Allow storing the list to Google Drive to use the list across devices and avoid losing it (for example, when your browser data is cleared).~~ Not implemented yet, but will be in the future.

## Installation

1. Install a userscript manager like [Tampermonkey](https://www.tampermonkey.net/) or [Greasemonkey](https://www.greasespot.net/)
2. Install the userscript:
   - [Raw File Link](https://raw.githubusercontent.com/SisypheOvO/n-artists/main/dist/n-artists.user.js)
3. Visit any nhentai page to see it in action. You are all set then.
4. make sure to turn on AutoUpdate in your userscript manager to get the latest updates.

## Development

```bash
npm i # install dependencies
npm run build # build the userscript
```
