/**
 * Admin API — thin router mounting core + analytics + decision routes
 */
import { Hono } from 'hono'
import { adminCoreRoutes } from './adminCore.js'
import { adminAnalyticsRoutes } from './adminAnalytics.js'
import { adminDecisionRoutes } from './adminDecision.js'

export const adminRoutes = new Hono()

// Mount all routes
adminRoutes.route('/', adminCoreRoutes)
adminRoutes.route('/', adminAnalyticsRoutes)
adminRoutes.route('/', adminDecisionRoutes)

export default adminRoutes
