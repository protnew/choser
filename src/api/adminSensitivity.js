/**
 * Admin Sensitivity API — thin router
 */
import { Hono } from 'hono'
import { adminSensitivityCoreRoutes } from './adminSensitivityCore.js'
import { adminInteractiveRoutes } from './adminInteractive.js'

export const adminSensitivityRoutes = new Hono()
adminSensitivityRoutes.route('/', adminSensitivityCoreRoutes)
adminSensitivityRoutes.route('/', adminInteractiveRoutes)
