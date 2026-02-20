import { defineConfig } from 'vite'
import tailwindcss from '@tailwindcss/vite'
import vue from '@vitejs/plugin-vue'
import svgLoader from 'vite-svg-loader'

// https://vite.dev/config/
export default defineConfig({
  base: '/Heartopia_PixelTool/', 
  plugins: [
    vue(),
    tailwindcss(),
    svgLoader(),
  ],
})