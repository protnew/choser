import { createApp } from './app.js'

// Worker entry point (used by wrangler dev via wrangler.toml main = "src/index.js")
const app = createApp()

export default app
