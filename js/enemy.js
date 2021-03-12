import {Entity} from './entity.js';
// import {game} from './game.js';
import {myColors} from './colors.js';


export class Enemy extends Entity {
    constructor(x,y,char,health,difficulty,color,name,resistances) {
        super(x,y,char,color)
        this.name = name;
        this.difficulty = difficulty;
        this.maxHealth = health;
        this.health = health;
        this.isFrozen = false;
        this.isFriendly = false;
        this.befriendedForTurns = 0;
        this.isSlowed = false;
        this.slowSwitch = false;
        this.confusedForTurns = 0;
        this.stunnedForTurns = 0;
        if (resistances) {
            this.resistances = resistances;
        } else {
            this.resistances = [];
        }
    }

    async act(game) {
        if (this.isSlowed) {
            this.slowSwitch = !this.slowSwitch;
            if (this.slowSwitch) {
                return;
            }
        }
        // console.log(this.name+" is befriended: "+this.isFriendlyOrBefriended());

        if (this.isFrozen) {
            //nothing happens
        } else if (this.stunnedForTurns > 0) {
            this.stunnedForTurns--;
        } else if (this.confusedForTurns > 0) {
            //move randomly;
            let dir = ROT.RNG.getItem([[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]]);

            let dest = [this.x + dir[0],this.y + dir[1]];
            let enemy = getEnemyAt(game,dest[0],dest[1]);
            if (enemy) {
                enemy.damage(game.data,1,"physical");
            }
            if (!game.isBlocked(...dest)) {
                this.x = dest[0];
                this.y = dest[1];
            }
            this.confusedForTurns--;
        } else if (this.isFriendlyOrBefriended()) {
            if (this.befriendedForTurns > 0) {
                this.befriendedForTurns--;
                if (this.befriendedForTurns <= 0) {
                    game.data.msgs.push("The "+this.name+" remembers he is not your friend.")
                }
            }
            this.actFriendly(game);
        } else {
            this.actAggresively(game);
        }
    }

    // TODO fix
    actFriendly(game) {
        let path = this.closestEnemyPath(game);
        if(path !== null) {
            if( path.length > 2) {
                this.x = path[1][0];
                this.y = path[1][1];
            } else if (path.length === 2) {
                let enemy = getEnemyAt(game,...path[1]);
                enemy.damage(game.data,1,"physical");
                game.data.msgs.push("The "+this.name+" hits the "+enemy.name);
            }
        } else {
            this.aimlessWander(game);
        }
    }

    // TODO fix
    actAggresively(game) {
        let gameData = game.data;
        let path = this.closestFriendlyPath(game);
        if(path.length > 2) {
            this.x = path[1][0];
            this.y = path[1][1];
        } else if (path.length === 2) {
            let enemy = getEnemyAt(game,...path[1]);
            if (enemy) {
                enemy.damage(game.data,1,"physical");
                gameData.msgs.push("The "+this.name+" hits the "+enemy.name);
            } else {
                gameData.player.damage(1,this.name,gameData);
                gameData.msgs.push("You've been hit by a "+this.name);
            }
        }
    }

    aimlessWander(game) {
            //move randomly;
            let dir = ROT.RNG.getItem([[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]]);

            let dest = [this.x + dir[0],this.y + dir[1]];
            if (!game.isBlocked(...dest)) {
                this.x = dest[0];
                this.y = dest[1];
            }
    }

    drawHealthBar(x,y,display){
        display.draw(x,y,this.char,this.color);
        display.draw(x+1,y,'[',myColors['white']);
        display.draw(x+2+this.maxHealth,y,']',myColors['white']);
        for( let i = 0; i < this.health; i++){
            display.draw(x+2+i,y,'*',this.color);
        }
    }

    damage(gameData,ammount,damageType) {

        if (this.isFrozen) {
            this.isFrozen = false;
            gameData.msgs.push("The "+this.name+" is unfrozen!");
        }

        let resistant = false;
        for (let r of this.resistances) {
            if (damageType && damageType === r) {
                resistant = true;
            }
        }

        if(!resistant) {
            this.health -= ammount;
        } else {
            gameData.msgs.push("The "+this.name+" resists the "+damageType+" damage.");
        }
    }

    polymorph() {

        let newMonster = enemyFactory['all'](1,1);

        this.name = newMonster.name;
        this.color = newMonster.color;
        this.char = newMonster.char;
        this.resistances = newMonster.resistances;

        // we dont want to copy over any of the current status of the monster
        // only the characteristics

        // the damage taken will remain the same, but the current health will
        // increase or decrease with the max
        let damageTaken = this.maxHealth - this.health;
        this.maxHealth = newMonster.maxHealth;
        this.health = this.maxHealth - damageTaken;
    }

    freeze(game) {
        let resistant = false;

        for (let r in this.resistance) {
            if (r === 'ice') {
                resistant = true;
            }
        }

        if(!resistant) {
            this.isFrozen = true;
            return true;
        } else {
            game.data.msgs.push("The "+this.name+" resists freezing.");
            return false;
        }
    }

    isDead() {
        return (this.health <= 0);
    }

    isFriendlyOrBefriended() {

        return (this.isFriendly || this.befriendedForTurns > 0);
    }

    closestEnemyPath(game) {
        let bestPath = null;
        for(let enemy of game.data.enemies) {
            if(enemy && !enemy.equals(this) && !enemy.isFriendlyOrBefriended()) {
                let path = getPath(game,this.x,this.y,enemy.x,enemy.y);
                if (path && (bestPath === null || bestPath.length > path.length)) {
                    bestPath = path;
                }
            }
        }
        return bestPath;
    }

    closestFriendlyPath(game) {
        let bestPath = null;
        //test player path first
        let path = getPath(game,this.x,this.y,game.data.player.x,game.data.player.y);
        if (path && (bestPath === null || bestPath.length > path.length)) {
            bestPath = path;
        }
        for(let enemy of game.data.enemies) {
            if(enemy && !enemy.equals(this) && enemy.isFriendlyOrBefriended()) {
                let path = getPath(game,this.x,this.y,enemy.x,enemy.y);
                if (path && (bestPath === null || bestPath.length > path.length)) {
                    bestPath = path;
                }
            }
        }
        return bestPath;
    }

}

function getPath(game,x1,y1,x2,y2) {
    const pathfindingCallback = function(x,y) {
        if(x1 === x && y1 === y) {return true;};
        if(x2 === x && y2 === y) {return true;};

        return !game.isBlocked(x,y);
    }

    const dijkstra = new ROT.Path.Dijkstra(x2,y2,pathfindingCallback);
    let path = [];
    dijkstra.compute(x1,y1,function(x,y) {
        path.push([x,y]);
    });
    return path;
}

export const enemyFactory = {
    [1]: (x,y) => {
        let name = ROT.RNG.getItem(["Giant Rat"]);
        return enemyFactory[name](x,y);
    },
    [2]: (x,y) => {
        let name = ROT.RNG.getItem(["Giant Rat","Kobold","Fire Bat"]);
        return enemyFactory[name](x,y);
    },
    [3]: (x,y) => {
        let name = ROT.RNG.getItem(["Giant Rat","Kobold","Fire Bat","Simulacrum"]);
        return enemyFactory[name](x,y);
    },
    [4]: (x,y) => {
        let name = ROT.RNG.getItem(["Giant Rat","Kobold","Gnoll","Fire Bat","Simulacrum"]);
        return enemyFactory[name](x,y);
    },
    [5]: (x,y) => {
        let name = ROT.RNG.getItem(["Giant Rat","Kobold","Gnoll","Fire Bat",
                                    "Simulacrum","Ogre","Magma Golumn"]);
        return enemyFactory[name](x,y);
    },
    [6]: (x,y) => {
        let name = ROT.RNG.getItem(["Giant Rat","Kobold","Gnoll","Fire Bat",
                                    "Simulacrum","Ogre","Magma Golumn"]);
        return enemyFactory[name](x,y);
    },
    'all': (x,y) => {
        let name = ROT.RNG.getItem(["Giant Rat","Kobold","Gnoll","Ogre"]);
        return enemyFactory[name](x,y);
    },
    "Giant Rat":    (x,y) => { return new Enemy(x,y,'R',1,1,myColors['brown'],"Giant Rat") },
    "Kobold":       (x,y) => { return new Enemy(x,y,'K',2,2,myColors['blue'],"Kobold") },
    "Gnoll":        (x,y) => { return new Enemy(x,y,'G',3,4,myColors['yellow'],"Gnoll") },
    "Ogre"  :       (x,y) => { return new Enemy(x,y,'O',4,5,myColors['white'],"Ogre") },
    "Fire Bat":     (x,y) => { return new Enemy(x,y,'F',1,2,myColors['red'],"Fire Bat",['fire']) },
    "Simulacrum":   (x,y) => { return new Enemy(x,y,'S',2,3,myColors['blue'],"Simulacrum",['ice']) },
    "Magma Golumn": (x,y) => { return new Enemy(x,y,'M',3,5,myColors['red'],"Magma Golumn",['fire']) },
    "Yeti":         (x,y) => { return new Enemy(x,y,'Y',4,6,myColors['white'],"Yeti",['ice']) },
    "Ice Sprite":   (x,y) => { return new Enemy(x,y,'I',2,3,myColors['white'],"Ice Sprite",['ice']);},
}



function getEnemyAt(game,x,y) {
    for (let enemy of game.data.enemies) {
        if (enemy.x === x && enemy.y === y) {
            return enemy;
        }
    }
}
