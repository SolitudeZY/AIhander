import path from 'path';
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import reactRefresh from '@vitejs/plugin-react-refresh'

// https://vitejs.dev/config/
export default defineConfig({
   root: './client/',
   plugins: [react({})],
   // plugins: [reactRefresh({})],
   resolve: {
      alias: [
         {
            find: '$utils', replacement: path.join('/src/utils'),
         },
         {
            find: '$components', replacement: path.join('/src/components'),
         },
         // 针对以 ~/[包名称]开头的，替换为 node_modules/@[包名称]
         {
            find: /^(~)(?!\/)(.+)/, replacement: path.join('node_modules/$2'),
         },
      ],
   },
   cors: true,
   server: {
      hmr: {
         protocol: 'ws',
         host: 'localhost'
      },
      middlewareMode: 'html',
   },
   css:{
      preprocessorOptions:{
         scss:{
            api:"modern-compiler"
         }
      }
   }
})
