import {Entity} from './entity.js';
// import {myColors} from './colors.js';

export class Player extends Entity {
    constructor(x,y) {
        super(x,y,'@','#fff');

        this.health = 9;
        this.maxHealth = 9;
        this.ghostForm = false;
    }

    async act(game) {
        let gameData = game.data;

        gameData.awaitingPlayerAction = true;
        let waiting = true;
        let stateChange = null;

        while (waiting) {
            console.log("Awaiting player action");
            let k = await readKey();
            
            if (keyMap[k.code]){
                stateChange = await keyMap[k.code](game);

                
                waiting = false;
            } else if (game.data.spells.slots[k.key]) {

                stateChange = await game.data.spells.castKey(game,k.key);

                waiting = false;
            }
        }

        return Promise.resolve(stateChange);
    }

    tryMove(x,y,gameData) {
        let dest_x = this.x + x;
        let dest_y = this.y + y;

        let blocked = false;


        if (!this.ghostForm) {
            if (gameData.map.isBlocking(dest_x,dest_y)) {
                blocked = true;
            }
        } else {
            if( dest_x <= 0 || dest_y <=0 || dest_x > 9 || dest_y > 9 ) {
                blocked = true;
            }
        }

        if(gameData.map.isExit(dest_x,dest_y)) {
            this.ghostForm = false;
            return "newLevel";
        }

        // check if you are going to wizard punch
        for(let enemy of gameData.enemies) {
            if( enemy.isBlocking(dest_x,dest_y) ) {

                enemy.damage(gameData,1,'punch');
                gameData.awaitingPlayerAction = false;
                blocked = true;
            }
        }



        if(!blocked) {
            this.x = dest_x;
            this.y = dest_y;
            gameData.awaitingPlayerAction = false;
        }


    }

    wait(gameData) {
        gameData.msgs.push("You wait a turn");
        gameData.awaitingPlayerAction = false;

    }

    damage(ammount) {
        this.health -= ammount;
        // console.log("You have "+this.health+" health remaining!");
    }

    isMaxHealth() {
        return this.health >= this.maxHealth;
    }

    heal(ammount,gameData) {
        if (this.isMaxHealth()) {
            gameData.msgs.push("You are already at max health");
        } else {
            this.health += ammount;
            this.health = Math.min(this.maxHealth,this.health);
            gameData.msgs.push("You heal slightly");
        }
    }
}

const readKey = () => new Promise(resolve => window.addEventListener('keydown', resolve, {once:true}));

let keyMap = {
    'KeyH': (game) => { return game.data.player.tryMove(-1,0,game.data) },
    'Numpad4': (game) => { return game.data.player.tryMove(-1,0,game.data) },
    // 'a': (data) => { data.player.tryMove(-1,0,data) },
    'KeyJ': (game) => { return game.data.player.tryMove(0,1,game.data) },
    'Numpad2': (game) => { return game.data.player.tryMove(0,1,game.data) },
    // 's': (data) => { data.player.tryMove(0,1,data) },
    'KeyK': (game) => { return game.data.player.tryMove(0,-1,game.data) },
    'Numpad8': (game) => { return game.data.player.tryMove(0,-1,game.data) },
    // 'w': (data) => { data.player.tryMove(0,-1,data) },
    'KeyL': (game) => { return game.data.player.tryMove(1,0,game.data) },
    'Numpad6': (game) => { return game.data.player.tryMove(1,0,game.data) },
    // 'd': (data) => { data.player.tryMove(1,0,data) },

    'KeyY': (game) => { return game.data.player.tryMove(-1,-1,game.data) },
    'Numpad7': (game) => { return game.data.player.tryMove(-1,-1,game.data) },
    'KeyU': (game) => { return game.data.player.tryMove( 1,-1,game.data) },
    'Numpad9': (game) => { return game.data.player.tryMove( 1,-1,game.data) },
    'KeyB': (game) => { return game.data.player.tryMove(-1, 1,game.data) },
    'Numpad1': (game) => { return game.data.player.tryMove(-1, 1,game.data) },
    'KeyN': (game) => { return game.data.player.tryMove( 1, 1,game.data) },
    'Numpad3': (game) => { return game.data.player.tryMove( 1, 1,game.data) },

    'KeyC': (_game) => { return "craftingMenu"},
    //debug stuff
    'KeyV': (game) => { game.spellCompToggle = !game.spellCompToggle; return null;},

    'Period': (game) => { return game.data.player.wait(game.data); },
    'Numpad5': (game) => { return game.data.player.wait(game.data); },

    'KeyP': (game) => {
        game.data.player.health = 9;
    }
    // this is some weird spaghetti shit but whatever
    // 'KeyQ': async (game) => {
    //     await game.data.spells.castKey(game,'q');
    // },
    // 'KeyW': async (game) => {
    //     await game.data.spells.castKey(game,'w');
    // }

}
