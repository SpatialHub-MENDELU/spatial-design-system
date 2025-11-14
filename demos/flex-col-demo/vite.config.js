// vite.config.js
import { resolve } from 'path'
import { defineConfig } from 'vite'

export default defineConfig({
    server: {
        port: 8080,
        allowedHosts: true,
    }
})