/**
 * Tables API — thin router mounting read + write routes
 */
import { Hono } from 'hono'
import { tablesReadRoutes } from './tablesRead.js'
import { tablesWriteRoutes } from './tablesWrite.js'

export const tablesRoutes = new Hono()
tablesRoutes.route('/', tablesReadRoutes)
tablesRoutes.route('/', tablesWriteRoutes)
