import { handle } from 'hono/cloudflare-pages'
import { createApp } from '../../src/app.js'

// Pages Functions entry point
const app = createApp()

export const onRequest = handle(app)
