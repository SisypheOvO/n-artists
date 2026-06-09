import typescript from '@rollup/plugin-typescript';

export default {
    input: 'src/main.ts',
    output: {
        file: 'dist/n-artists.user.js',
        format: 'iife',
        banner: `// ==UserScript==
// @name         n-artists
// @namespace    URL
// @version      0.1.0
// @description  Userscript to favourite nhentai artists
// @icon         https://nhentai.net/favicon.png
// @author       Sisyphus
// @license      MIT
// @homepage     https://github.com/SisypheOvO
// @match        https://nhentai.net/*
// @run-at       document-end
// @grant        none
// @downloadURL https://raw.githubusercontent.com/SisypheOvO/n-artists/main/dist/n-artists.user.js
// @updateURL https://raw.githubusercontent.com/SisypheOvO/n-artists/main/dist/n-artists.user.js
// ==/UserScript==

`,
    },
    plugins: [
        typescript({
            tsconfig: './tsconfig.json'
        })
    ]
};