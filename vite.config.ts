import { defineConfig, normalizePath } from 'vite'
import react from '@vitejs/plugin-react'
import path, { relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import anymatch from 'anymatch'
import { lstatSync } from 'node:fs'

// The list of files to watch (using glob patterns)
const watchList = [
  '.',
  'src/**/*',
  '@types/**/*?(.d).ts',
  'public/**/*',
  '!.env.example',
  '.env?(.*)',
  './*.html',
  './vite.config.ts'
]

// Map the watch list into a directory list (removing duplicated ones)
const directories = Array.from(
  new Set(watchList.map((item) => path.dirname(item)))
)
const toIgnore = []
const toWatch = []

watchList.forEach((item) => {
  if (item.match(/^!/)) {
    toIgnore.push(item.slice(1))
  } else {
    toWatch.push(item)
  }
})

// https://vitejs.dev/config/
export default defineConfig({
  server: {
    watch: {
      // Uses an anonymous function to determine if a file should be ignored
      ignored: (file: string) => {
        // Computes the relative path as the file arg is the full pathname
        const relativePath = relative(
          resolve(fileURLToPath(import.meta.url), '..'),
          file
        )
        // 'normalize' the relative path. In pratice, this means replacing backslashes with forward slashes
        const normalizedPath = normalizePath(relativePath)

        // Load the file stats to check if it's a directory
        const stat = lstatSync(file, { throwIfNoEntry: false })

        /**
         * If the files is a directory, will are going
         * to ignore only the files that are not in the directories list.
         * This is important because chokidar will not watch any file in the
         * watch list if it is ignoring its directory.
         **/
        if (stat !== undefined && stat.isDirectory()) {
          return !directories.some((directory) =>
            anymatch(directory, normalizedPath)
          )
        }

        const willIgnore = toIgnore.some((item) =>
          anymatch(item, normalizedPath)
        )
        const willWatch = toWatch.some((item) => anymatch(item, normalizedPath))

        return willIgnore || !willWatch
      }
    }
  },
  plugins: [react()]
})
