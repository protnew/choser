/**
 * Real-time Collaboration WebSocket for Choser EDP
 *
 * Features:
 *  - Room-based collaboration per table (tableId)
 *  - Presence (join/leave events, user list)
 *  - Cursor sharing
 *  - Cell edit sync (broadcast to all others in room)
 *  - Heartbeat (ping/pong every 30s)
 */

import { WebSocketServer } from 'ws'
import { Hono } from 'hono'

// ─── State ──────────────────────────────────────────────
const rooms = new Map()       // tableId -> Map<userId, { ws, userName, heartbeat }>
const userCursors = new Map() // userId -> { tableId, x, y }

export const collabRoutes = new Hono()

// ─── REST Endpoints ─────────────────────────────────────

// GET /collab/status — health / diagnostics
collabRoutes.get('/collab/status', (c) => {
  const roomSummary = []
  for (const [tableId, users] of rooms) {
    roomSummary.push({
      tableId,
      users: Array.from(users.values()).map(u => ({ userId: u.userId, userName: u.userName }))
    })
  }
  return c.json({
    status: 'ok',
    activeRooms: rooms.size,
    totalCursors: userCursors.size,
    rooms: roomSummary
  })
})

// GET /collab/rooms/:tableId/users — who is in a room
collabRoutes.get('/collab/rooms/:tableId/users', (c) => {
  const tableId = c.req.param('tableId')
  const users = rooms.get(tableId)
  if (!users) return c.json({ tableId, users: [] })
  return c.json({
    tableId,
    users: Array.from(users.values()).map(u => ({ userId: u.userId, userName: u.userName }))
  })
})

// POST /collab/broadcast/:tableId — broadcast an edit via REST (fallback)
collabRoutes.post('/collab/broadcast/:tableId', async (c) => {
  const tableId = c.req.param('tableId')
  const body = await c.req.json()
  broadcastToRoom(tableId, null, { type: 'cell_edit', tableId, ...body })
  return c.json({ ok: true, recipients: getRoomSize(tableId) })
})

// ─── WebSocket Setup ────────────────────────────────────

let wss = null

/**
 * Attach a WebSocket upgrade handler to the HTTP server.
 * Call this once after server.listen().
 */
export function initCollaborationWebSocket(server) {
  wss = new WebSocketServer({ noServer: true })

  // Intercept HTTP upgrade requests for /collab/ws
  server.on('upgrade', (request, socket, head) => {
    const url = new URL(request.url, `http://${request.headers.host || 'localhost'}`)
    if (url.pathname === '/collab/ws' || url.pathname === '/v1/collab/ws') {
      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit('connection', ws, request, url)
      })
    }
    // Let other upgrade requests pass through (don't destroy)
  })

  wss.on('connection', (ws, request, url) => {
    const tableId = url.searchParams.get('tableId')
    const userId = url.searchParams.get('userId')
    const userName = url.searchParams.get('userName') || 'Anonymous'

    if (!tableId || !userId) {
      ws.close(4001, 'Missing tableId or userId')
      return
    }

    // Join room
    joinRoom(tableId, userId, userName, ws)

    // Send current user list to the joining user
    const roomUsers = rooms.get(tableId)
    const usersList = Array.from(roomUsers.values()).map(u => ({
      userId: u.userId, userName: u.userName
    }))
    sendMessage(ws, { type: 'users', users: usersList })

    // Broadcast user_joined to everyone else
    broadcastToRoom(tableId, userId, {
      type: 'user_joined', userId, userName
    })

    // Heartbeat timer
    const heartbeatInterval = setInterval(() => {
      if (ws.readyState === ws.OPEN) {
        sendMessage(ws, { type: 'ping' })
      }
    }, 30000)

    // Store heartbeat ref on ws for cleanup
    ws._heartbeatInterval = heartbeatInterval
    ws._tableId = tableId
    ws._userId = userId

    // Message handler
    ws.on('message', (raw) => {
      try {
        const msg = JSON.parse(raw.toString())
        handleMessage(tableId, userId, userName, ws, msg)
      } catch (e) {
        // Ignore malformed JSON
      }
    })

    // Close handler
    ws.on('close', () => {
      leaveRoom(tableId, userId)
      clearInterval(heartbeatInterval)
      broadcastToRoom(tableId, null, {
        type: 'user_left', userId
      })
      userCursors.delete(userId)
    })

    ws.on('error', () => {
      leaveRoom(tableId, userId)
      clearInterval(heartbeatInterval)
    })
  })

  return wss
}

// ─── Room Management ────────────────────────────────────

function joinRoom(tableId, userId, userName, ws) {
  if (!rooms.has(tableId)) {
    rooms.set(tableId, new Map())
  }
  const room = rooms.get(tableId)

  // If user already in room (reconnect), clean up old connection
  if (room.has(userId)) {
    const existing = room.get(userId)
    try { existing.ws.close(4000, 'Replaced by new connection') } catch {}
    clearInterval(existing.ws._heartbeatInterval)
  }

  room.set(userId, { ws, userId, userName })
}

function leaveRoom(tableId, userId) {
  const room = rooms.get(tableId)
  if (!room) return
  room.delete(userId)
  if (room.size === 0) {
    rooms.delete(tableId)
  }
}

function getRoomSize(tableId) {
  const room = rooms.get(tableId)
  return room ? room.size : 0
}

// ─── Message Handling ───────────────────────────────────

function handleMessage(tableId, userId, userName, ws, msg) {
  switch (msg.type) {
    case 'pong':
      // Heartbeat response — nothing to do
      break

    case 'cursor':
      userCursors.set(userId, { tableId, x: msg.x, y: msg.y })
      broadcastToRoom(tableId, userId, {
        type: 'cursor', userId, x: msg.x, y: msg.y
      })
      break

    case 'cell_edit':
      broadcastToRoom(tableId, userId, {
        type: 'cell_edit',
        tableId,
        row: msg.row,
        col: msg.col,
        value: msg.value,
        userId
      })
      break

    case 'cell_select':
      broadcastToRoom(tableId, userId, {
        type: 'cell_select',
        row: msg.row,
        col: msg.col,
        userId
      })
      break

    case 'join':
      // Re-join or explicit join message — already handled on connection
      break

    default:
      // Unknown message type — ignore
      break
  }
}

// ─── Broadcasting ───────────────────────────────────────

function broadcastToRoom(tableId, excludeUserId, message) {
  const room = rooms.get(tableId)
  if (!room) return

  const payload = JSON.stringify(message)
  for (const [uid, entry] of room) {
    if (uid === excludeUserId) continue
    if (entry.ws.readyState === 1) { // OPEN
      entry.ws.send(payload)
    }
  }
}

function sendMessage(ws, message) {
  if (ws.readyState === 1) {
    ws.send(JSON.stringify(message))
  }
}

// ─── Cleanup on Shutdown ────────────────────────────────

export function closeAllConnections() {
  for (const [tableId, room] of rooms) {
    for (const [userId, entry] of room) {
      try {
        clearInterval(entry.ws._heartbeatInterval)
        entry.ws.close(1001, 'Server shutting down')
      } catch {}
    }
  }
  rooms.clear()
  userCursors.clear()
  if (wss) wss.close()
}
