/**
 * Logger — pino wrapper
 */
import pino from 'pino'

export function createLogger(level = 'info') {
  const isDev = process.env.NODE_ENV !== 'production'

  return pino({
    level,
    ...(isDev ? {
      transport: {
        target: 'pino-pretty',
        options: { colorize: true, translateTime: 'SYS:HH:MM:ss.l' }
      }
    } : {}),
    formatters: {
      level(label) { return { level: label } }
    },
    serializers: {
      err: pino.stdSerializers.err,
      req: (req) => ({ method: req.method, url: req.url })
    }
  })
}
