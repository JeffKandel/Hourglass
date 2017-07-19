import Phaser from 'phaser'
import store from '../store.js'


export default class extends Phaser.State {

    init() {
        this.menuConfig = {
            startY: 260,
            startX: 30
        }
        this.game.add.image(0, 0, 'gameOver')

        this.optionCount = 1

        this.instructionText = this.game.make.text(this.game.world.centerX, 100, "Collect coins, and get the key to advance to the next level. Press down to shoot your opponent back in time -- but beware! It costs 3 coins!", {
            fill: '#1dc4ff',
            align: 'center',
            wordWrap: true,
            wordWrapWidth: 450,
            stroke: 'rgba(200,200,200,0.5)'
        })
        this.instructionText.anchor.set(0.5, 0)

        this.startText = this.game.add.text(
            this.game.world.centerX,
            this.menuConfig.startY + 150,
            'Awaiting player two...', {
                fill: '#1dc4ff',
                stroke: 'rgba(200,200,200,0.5)'
            }
        );

        this.startText.anchor.set(.5, 1)
        this.startText.inputEnabled = true;


        this.startText.events.onInputOver.add(function(target) {
            target.setStyle({
                fill: '#FEFFD5',
                stroke: 'rgba(200,200,200,0.5)'
            });
        });
        this.startText.events.onInputOut.add(function(target) {
            target.setStyle({
                fill: '#1dc4ff',
                stroke: 'rgba(200,200,200,0.5)'
            });
        });

    }


    allowStart() {
        this.startText.setText('Start game!')
        this.startText.events.onInputUp.addOnce(this.startGame,this);
    }

    startGame() {
        this.game.state.start("Game")
    }

    forbidStart() {
        this.startText.setText('Awaiting player two...')
    }


    update() {
        if (true || store.getState().twoPlayersBool) {
            this.allowStart()
        } else {
            this.forbidStart()
        }
    }

    create() {
        this.game.stage.disableVisibilityChange = true
        this.game.add.existing(this.instructionText)
        this.game.add.existing(this.startText)
    }
}
