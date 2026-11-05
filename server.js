const path = require('node:path')
const http = require('node:http')
const express = require('express')
const { Server } = require('socket.io')

const app = express()
const server = http.createServer(app)
const io = new Server(server)
const port = process.env.PORT || 3000

app.use(express.static(path.join(__dirname, 'public')))

const players = new Map()

const monsters = Object.fromEntries(
  Array.from({ length: 20 }, (_, index) => {
    const id = `mob_${index}`
    return [id, {
      id,
      name: 'Poring',
      x: Math.floor(Math.random() * 3000) + 500,
      y: Math.floor(Math.random() * 3000) + 500,
      hp: 50,
      maxHp: 50,
    }]
  }),
)

setInterval(() => {
  Object.values(monsters).forEach((monster) => {
    monster.x = Math.max(80, Math.min(3920, monster.x + (Math.random() - 0.5) * 60))
    monster.y = Math.max(80, Math.min(3920, monster.y + (Math.random() - 0.5) * 60))
    io.emit('monsterMoved', monster)
  })
}, 2000)

io.on('connection', (socket) => {
  const player = { id: socket.id, name: `นักผจญภัย ${players.size + 1}`, x: 480, y: 360, color: '#e8b86d' }
  players.set(socket.id, player)
  socket.emit('world:state', Object.fromEntries(players))
  socket.emit('currentMonsters', monsters)
  socket.broadcast.emit('player:joined', player)

  socket.on('player:update', (position) => {
    const current = players.get(socket.id)
    if (!current) return
    current.x = Number(position.x) || current.x
    current.y = Number(position.y) || current.y
    socket.broadcast.emit('player:updated', current)
  })

  const broadcastAttack = () => {
    const current = players.get(socket.id)
    if (!current) return
    socket.broadcast.emit('playerAttacked', {
      playerId: socket.id,
      x: current.x,
      y: current.y,
    })
    socket.broadcast.emit('player:attacked', {
      playerId: socket.id,
      x: current.x,
      y: current.y,
    })
  }

  socket.on('player:attack', broadcastAttack)
  socket.on('playerAttack', broadcastAttack)

  socket.on('player:name', (name) => {
    const current = players.get(socket.id)
    if (!current || typeof name !== 'string') return
    current.name = name.trim().slice(0, 24) || current.name
    io.emit('player:updated', current)
  })

  socket.on('disconnect', () => {
    players.delete(socket.id)
    socket.broadcast.emit('player:left', socket.id)
  })
})

server.listen(port, () => console.log(`Metung RPG server listening on port ${port}`))
