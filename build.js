#!/usr/bin/env node

import { build } from 'vite'
import { fileURLToPath } from 'url'
import { dirname, resolve } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

async function buildApp() {
  try {
    console.log('Starting Vite build...')
    
    await build({
      configFile: resolve(__dirname, 'vite.config.ts'),
      mode: 'production'
    })
    
    console.log('Build completed successfully!')
  } catch (error) {
    console.error('Build failed:', error)
    process.exit(1)
  }
}

buildApp()