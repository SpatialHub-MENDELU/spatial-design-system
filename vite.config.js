// vite.config.js
import { resolve } from 'path'
import { defineConfig } from 'vite'

export default defineConfig({
    build: {
        lib: {
            // Could also be a dictionary or array of multiple entry points
            entry: resolve(__dirname, 'lib/main.js'),
            name: 'SpatialDesignSystem',
            // the proper extensions will be added
            fileName: 'spatial-design-system'
        },
        rollupOptions: {
            // make sure to externalize deps that shouldn't be bundled
            // into your library
            external: ['aframe'],
            output: {
                format: ['umd'], // ensure that the UMD build is used
                // Provide global variables to use in the UMD build
                // for externalized deps
                globals: {
                    // aframe
                    aframe: 'AFRAME'
                },
                dir: 'umd' // output directory
            },
        }
    }
})