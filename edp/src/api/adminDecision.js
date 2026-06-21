/**
 * Admin Decision API — thin router
 */
import { Hono } from 'hono'
import { adminAiVsHumanRoutes } from './adminAiVsHuman.js'
import { adminSensitivityRoutes } from './adminSensitivity.js'

export const adminDecisionRoutes = new Hono()
adminDecisionRoutes.route('/', adminAiVsHumanRoutes)
adminDecisionRoutes.route('/', adminSensitivityRoutes)
