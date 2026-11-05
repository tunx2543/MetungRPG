const socket = io()
const players = new Map()
let localPlayer
let playerName = 'นักผจญภัย'

const colors = { ink: '#eaf0df', muted: '#a8b7a2', panel: '#10251f', accent: '#e8b86d', gold: '#f5d48b' }

class ForestScene extends Phaser.Scene {
  constructor() { super('ForestScene') }
  preload() { this.load.tilemapTiledJSON('map', '/assets/map.json') }
  create() {
    this.cameras.main.setBackgroundColor('#183b31')
    this.map = this.make.tilemap({ key: 'map' })
    this.drawWorld()
    this.keys = this.input.keyboard.addKeys('W,A,S,D,UP,LEFT,DOWN,RIGHT')
    this.createHud()
    this.createLocalPlayer()
    socket.on('world:state', (state) => Object.values(state).forEach((player) => this.upsertPlayer(player)))
    socket.on('player:joined', (player) => this.upsertPlayer(player))
    socket.on('player:updated', (player) => this.upsertPlayer(player))
    socket.on('player:left', (id) => this.removePlayer(id))
    socket.on('connect', () => this.setConnection(true))
    socket.on('disconnect', () => this.setConnection(false))
  }
  drawWorld() {
    const g = this.add.graphics()
    g.fillStyle(0x183b31).fillRect(0, 0, 960, 640)
    for (let y = 24; y < 640; y += 48) for (let x = 24; x < 960; x += 48) {
      g.fillStyle(((x + y) / 48) % 2 ? 0x1c4537 : 0x1a4033).fillCircle(x, y, 19)
      g.lineStyle(1, 0x2b5844, 0.32).strokeCircle(x, y, 18)
    }
    const path = this.add.graphics()
    path.fillStyle(0x8f7957, 0.8).fillRoundedRect(65, 278, 830, 84, 32)
    path.fillStyle(0xb59a6a, 0.18).fillRoundedRect(65, 293, 830, 54, 24)
    this.add.text(480, 190, 'ป่าหมอกนิรันดร์', { fontFamily: 'Kanit', fontSize: '34px', color: colors.gold, stroke: '#183b31', strokeThickness: 8 }).setOrigin(0.5).setAlpha(0.9)
    this.add.text(480, 224, 'ดินแดนแห่งคำสัญญาและความลับ', { fontFamily: 'Prompt', fontSize: '14px', color: colors.ink }).setOrigin(0.5).setAlpha(0.65)
    this.add.text(108, 322, 'หมู่บ้านเมถุน', { fontFamily: 'Kanit', fontSize: '16px', color: '#f7e6bd' }).setOrigin(0.5).setRotation(-0.08)
    this.add.text(842, 322, 'หุบเขาหมอก', { fontFamily: 'Kanit', fontSize: '16px', color: '#f7e6bd' }).setOrigin(0.5).setRotation(0.08)
  }
  createLocalPlayer() {
    localPlayer = this.add.container(480, 320).setDepth(10)
    const body = this.add.graphics().fillStyle(0xe8b86d).fillCircle(0, 0, 18).fillStyle(0x315c4a).fillCircle(0, 3, 11)
    const label = this.add.text(0, -34, playerName, { fontFamily: 'Prompt', fontSize: '12px', color: colors.ink, backgroundColor: '#10251fcc', padding: { x: 6, y: 3 } }).setOrigin(0.5)
    localPlayer.add([body, label])
    this.input.keyboard.on('keydown-N', () => this.rename())
  }
  createHud() {
    const panel = this.add.graphics().fillStyle(0x10251f, 0.94).fillRoundedRect(24, 24, 236, 118, 16).lineStyle(1, 0x55745d, 0.7).strokeRoundedRect(24, 24, 236, 118, 16)
    this.add.text(45, 43, 'นักผจญภัย', { fontFamily: 'Kanit', fontSize: '16px', color: colors.accent })
    this.nameText = this.add.text(45, 69, playerName, { fontFamily: 'Prompt', fontSize: '19px', color: colors.ink })
    this.add.text(45, 103, 'พลังชีวิต', { fontFamily: 'Prompt', fontSize: '12px', color: colors.muted })
    this.add.graphics().fillStyle(0x29473c).fillRoundedRect(102, 106, 126, 10, 5).fillStyle(0xc96b59).fillRoundedRect(102, 106, 100, 10, 5)
    this.add.text(210, 99, '80/100', { fontFamily: 'Prompt', fontSize: '11px', color: colors.ink }).setOrigin(0, 0)
    const quest = this.add.graphics().fillStyle(0x10251f, 0.9).fillRoundedRect(680, 24, 256, 86, 16).lineStyle(1, 0x55745d, 0.7).strokeRoundedRect(680, 24, 256, 86, 16)
    this.add.text(704, 42, 'ภารกิจปัจจุบัน', { fontFamily: 'Kanit', fontSize: '14px', color: colors.accent })
    this.add.text(704, 67, 'ตามหาแสงแรกในป่าหมอก', { fontFamily: 'Prompt', fontSize: '14px', color: colors.ink })
    this.add.text(704, 89, 'ความคืบหน้า  0 / 1', { fontFamily: 'Prompt', fontSize: '11px', color: colors.muted })
  }
  update() {
    if (!localPlayer) return
    const speed = 3
    let dx = 0, dy = 0
    if (this.keys.A.isDown || this.keys.LEFT.isDown) dx -= speed
    if (this.keys.D.isDown || this.keys.RIGHT.isDown) dx += speed
    if (this.keys.W.isDown || this.keys.UP.isDown) dy -= speed
    if (this.keys.S.isDown || this.keys.DOWN.isDown) dy += speed
    if (dx || dy) { localPlayer.x = Phaser.Math.Clamp(localPlayer.x + dx, 35, 925); localPlayer.y = Phaser.Math.Clamp(localPlayer.y + dy, 150, 580); socket.volatile.emit('player:update', { x: localPlayer.x, y: localPlayer.y }) }
  }
  upsertPlayer(player) {
    if (player.id === socket.id) return
    let avatar = players.get(player.id)
    if (!avatar) { avatar = this.add.container(player.x, player.y).setDepth(9); avatar.add(this.add.graphics().fillStyle(0x88b7a1).fillCircle(0, 0, 16)); avatar.add(this.add.text(0, -31, player.name, { fontFamily: 'Prompt', fontSize: '11px', color: colors.ink, backgroundColor: '#10251fcc', padding: { x: 5, y: 2 } }).setOrigin(0.5)); players.set(player.id, avatar) }
    avatar.x = player.x; avatar.y = player.y; avatar.list[1].setText(player.name)
    document.querySelector('#online-count').textContent = `${players.size + 1} ผู้เล่นออนไลน์`
  }
  removePlayer(id) { players.get(id)?.destroy(); players.delete(id); document.querySelector('#online-count').textContent = `${players.size + 1} ผู้เล่นออนไลน์` }
  setConnection(connected) { document.querySelector('#online-count').textContent = connected ? `${players.size + 1} ผู้เล่นออนไลน์` : 'ออฟไลน์' }
  rename() { const next = window.prompt('ตั้งชื่อฮีโร่ของคุณ', playerName); if (next?.trim()) { playerName = next.trim().slice(0, 24); this.nameText.setText(playerName); localPlayer.list[1].setText(playerName); socket.emit('player:name', playerName) } }
}

new Phaser.Game({ type: Phaser.AUTO, parent: 'game-container', width: 960, height: 640, scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH }, scene: ForestScene, render: { antialias: true }, callbacks: { postBoot: (game) => { game.canvas.setAttribute('aria-label', 'แผนที่เกมป่าหมอกนิรันดร์') } } })
