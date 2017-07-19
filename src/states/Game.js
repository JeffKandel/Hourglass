/* globals __DEV__ */
import Phaser from 'phaser'
import Hero from '../sprites/hero'
import Spider from '../sprites/spider'
import Player from '../sprites/player'
import throttle from 'lodash.throttle'
import store from '../store'
import {setKeyHolderId} from '../reducer'

export default class extends Phaser.State {
  init() {
    this.playerMap = {}
    this.game.renderer.renderSession.roundPixels = true

    this.keys = this.game.input.keyboard.addKeys({
      left: Phaser.KeyCode.LEFT,
      right: Phaser.KeyCode.RIGHT,
      up: Phaser.KeyCode.UP,
      down: Phaser.KeyCode.DOWN
    })

    this.keys.up.onDown.add(function() {
      let didJump = this.hero.jump()
      if (didJump) {
        this.sfx.jump.play('', 0, .01)
      }
    }, this)

    this.keys.down.onDown.add(function() {
      if (this.hero.coinPickupCount >= 3) {
        socket.emit('hourglass')
        this._handleKey()
        this.hero.coinPickupCount -= 3
      }
    },this)

  }
  preload() {}

  create() {
    // create sound entities
    this.sfx = {
      jump: this.game.add.audio('sfx:jump'),
      coin: this.game.add.audio('sfx:coin'),
      stomp: this.game.add.audio('sfx:stomp'),
      key: this.game.add.audio('sfx:key'),
      door: this.game.add.audio('sfx:door'),
      background: this.game.add.audio('sfx:background')
    }

    this.sfx.background.loopFull(1)


    // create level
    this.game.add.image(0, 0, 'background')
    this._loadLevel(this.game.cache.getJSON('level:1'))

    // create hudå with scoreboards)
    this._createHud()

    this.game.add.existing(this.hero)

    // socket.getAllPlayers(this.hero)
  }

  render() {
    // if (__DEV__) {
    //   this.game.debug.spriteInfo(this.hero, 32, 32)
    // }
  }

  addNewPlayer(playerData) {
    let player = this.playerMap[playerData.id]
    if (!player) {
      let newPlayer = new Player({
        socketId: playerData.id,
        game: this.game,
        x: playerData.x,
        y: playerData.y,
        asset: 'player'
      })

      this.playerMap[playerData.id] = this.game.add.existing(newPlayer)
    }
  }

  moveOtherPlayer(playerData) {
    let player = this.playerMap[playerData.id]
    player.x = playerData.x
    player.y = playerData.y
  }

  moveHero(heroData) {
    this.hero.x = heroData.x
    this.hero.y = heroData.y
  }

  removePlayer(id) {
    this.playerMap[id].kill()
  }

  _loadLevel(data) {
    // create all the groups/layers that we need
    this.bgDecoration = this.game.add.group()
    this.platforms = this.game.add.group()
    this.coins = this.game.add.group()
    this.spiders = this.game.add.group()
    this.enemyWalls = this.game.add.group()
    this.enemyWalls.visible = false

    // spawn all platforms
    data.platforms.forEach(this._spawnPlatform, this)
      // spawn hero and enemies
    this._spawnCharacters({ hero: data.hero, spiders: data.spiders })
      // spawn important objects
    data.coins.forEach(this._spawnCoin, this)
    this._spawnDoor(data.door.x, data.door.y)
    this._spawnKey(data.key.x, data.key.y)

    // enable gravity
    const GRAVITY = 1200
    this.game.physics.arcade.gravity.y = GRAVITY
  }

  _spawnPlatform(platform) {
    let sprite = this.platforms.create(
      platform.x, platform.y, platform.image)

    this.game.physics.enable(sprite)
    sprite.body.allowGravity = false
    sprite.body.immovable = true
  }


  _spawnCharacters(data) {
    // spawn spiders
    data.spiders.forEach(function(spider) {
        let sprite = new Spider({
          game: this.game,
          x: spider.x,
          y: spider.y,
          asset: 'spider'
        })
      },
      this)

    // spawn hero
    this.hero = new Hero({
      socketId: socket.id,
      game: this.game,
      x: Math.floor(Math.random() * 200),
      y: 525,
      asset: 'hero'
    })



    this.playerMap[this.hero.socketId] = this.hero


  }

  _spawnCoin(coin) {
    let sprite = this.coins.create(coin.x, coin.y, 'coin')
    sprite.anchor.set(0.5, 0.5)

    this.game.physics.enable(sprite)
    sprite.body.allowGravity = false

    sprite.animations.add('rotate', [0, 1, 2, 1], 6, true) // 6fps, looped
    sprite.animations.play('rotate')
  }

  _spawnDoor(x, y) {
    this.door = this.bgDecoration.create(x, y, 'door')
    this.door.anchor.setTo(0.5, 1)
    this.game.physics.enable(this.door)
    this.door.body.allowGravity = false
  }

  _spawnKey(x, y) {
    this.gameKey = this.bgDecoration.create(x, y, 'key')
    this.gameKey.anchor.set(0.5, 0.5)
      // enable physics to detect collisions, so the hero can pick the key up
    this.game.physics.enable(this.gameKey)
    this.gameKey.body.allowGravity = false
      // add a small 'up & down' animation via a tween
    this.gameKey.y -= 3
    this.game.add.tween(this.gameKey)
      .to({ y: this.gameKey.y + 6 }, 800, Phaser.Easing.Sinusoidal.InOut)
      .yoyo(true)
      .loop()
      .start()
  }


  _onHeroVsCoin(hero, coin) {
    this.sfx.coin.play('', 0, .01)
    coin.kill()
    hero.coinPickupCount++
  }



  _onHeroVsEnemy(hero, enemy) {
    if (hero.body.velocity.y > 0) { // kill enemies when hero is falling
      hero.bounce()
      enemy.die()
      this.sfx.stomp.play('', 0, .01)
    } else { // game over -> restart the game
      this.sfx.stomp.play('', 0, .01)
      this.game.state.restart()
    }
  }

  _onHeroVsKey(hero, key) {
    this.sfx.key.play('', 0, .01)
    store.dispatch(setKeyHolderId(this.hero.socketId))
    key.kill()
    hero.hasKey = true
  }

  _onHeroVsDoor(hero, door) {
    this.sfx.door.play('', 0, .01)
    this.endGame()
  }

  _createHud() {
    const NUMBERS_STR = '0123456789X ';
    this.coinFont = this.game.add.retroFont('font:numbers', 20, 26,
      NUMBERS_STR);

    this.gameKeyIcon = this.game.make.image(0, 19, 'icon:key');
    this.gameKeyIcon.anchor.set(0, 0.5);

    let coinIcon = this.game.make.image(this.gameKeyIcon.width + 7, 0, 'icon:coin');
    let coinScoreImg = this.game.make.image(coinIcon.x + coinIcon.width,
      coinIcon.height / 2, this.coinFont);
    coinScoreImg.anchor.set(0, 0.5);

    this.hud = this.game.add.group();
    this.hud.add(coinIcon);
    this.hud.add(coinScoreImg);
    this.hud.add(this.gameKeyIcon);
    this.hud.position.set(10, 10);
  }

  endGame() {
    socket.emit('gameover', this.hero.coinPickupCount);
  }

  update() {
    this._handleCollisions()
    this._handleInput()

    this.coinFont.text = `x${this.hero.coinPickupCount}`;
    this.gameKeyIcon.frame = this.hero.hasKey ? 1 : 0
  }


  _handleCollisions() {
    this.game.physics.arcade.collide(this.spiders, this.platforms)
    this.game.physics.arcade.collide(this.spiders, this.enemyWalls)
    this.game.physics.arcade.collide(this.hero, this.platforms)
    this.game.physics.arcade.overlap(this.hero, this.coins, this._onHeroVsCoin,
      null, this)
    this.game.physics.arcade.overlap(this.hero, this.spiders,
      this._onHeroVsEnemy, null, this)
    this.game.physics.arcade.overlap(this.hero, this.gameKey, this._onHeroVsKey,
      null, this)
    this.game.physics.arcade.overlap(this.hero, this.door, this._onHeroVsDoor,
      // ignore if there is no key or the player is on air
      function(hero, door) {
        return hero.hasKey && hero.body.touching.down
      }, this)

    const players = Object.keys(this.playerMap)
    if (players.length) {
      players.forEach((playerId) => {
        let player = this.playerMap[playerId]
        this.game.physics.arcade.collide(player, this.platforms)
        this.game.physics.arcade.collide(this.hero, player)
        this.game.physics.arcade.overlap(player, this.coins, this._onHeroVsCoin, null, this)
        this.game.physics.arcade.overlap(player, this.gameKey, this._onHeroVsKey, null, this)

      })
    }

  }

  _handleInput() {
    if (this.keys.left.isDown) { // move hero left
      this.hero.move(-1)
    } else if (this.keys.right.isDown) { // move hero right
      this.hero.move(1)
    } else { // stop
      this.hero.move(0)
    }
  }

  _handleKey(){
    if(!this.gameKey.alive && store.getState().keyHolderId !== this.hero.socketId){
      this._spawnKey(903, 105)
      this.hero.hasKey = false
    }
  }

}
