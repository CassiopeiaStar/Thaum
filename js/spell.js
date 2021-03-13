import {myColors} from './colors.js';
import {FlameCloud} from './flamecloud.js';
import {enemyFactory} from './enemy.js';


export class SpellsSystem {
    constructor() {
        this.slots = {
            ['q']: 'magic missile',
            ['w']: 'fireball',
            ['e']: 'irradiate',
            ['r']: 'ice ray',
            ['a']: 'freeze',
            ['s']: '(empty)',
            ['d']: '(empty)',
            ['f']: '(empty)',
        }

        this.isExhausted = {};

        this.list = {
            ['magic missile']: {
                cast: async function(game) {
                    let target = function(key,highlighting) {
                        let line = lineToBlocked(game,key);

                        highlightArray(highlighting,line,myColors['white']);
                        let selection = line.pop();
                        return selection;
                    };

                    let spell = function(selection) {
                        let enemy = getEnemyAt(game,...selection);
                        if(enemy) {
                            enemy.damage(game.data,1);
                            game.data.msgs.push("You hit the "+enemy.name+" with the magic missile.");
                        } else {
                            game.data.msgs.push("You hit a wall with the magic missile");
                        }
                    };

                    return await castInDirection(game,'magic missile',target,spell);
                }
            },
            ['healing']: {
                cast: async function(game) {
                    if (game.data.player.isMaxHealth()) {
                        game.data.msgs.push("There is no reason to heal, you are already at max health");
                        return false;
                    }
                    game.data.msgs.push("Cast healing on yourself?");
                    game.drawGame({});
                    while(true) {
                        let k = await readKey();
                        if (k.code === "Escape") {

                            game.data.msgs.push("Okay...nevermind");
                            game.drawGame({});
                            return false;
                        }
                        if(k.code === "Enter" || k.code === "Space") {
                            game.data.player.heal(2,game.data);
                            game.data.awaitingPlayerAction = false;
                            game.drawGame({});
                            return true;
                        }

                    }

                }
            },
            ['fireball']: {
                cast: async function(game) {
                    let targetingFunction = function(key,highlighting) {
                        let line = lineToBlocked(game,key);
                        let destination = line[line.length-1];
                        let explosion = neighbors(...destination);
                        explosion.push(destination);

                        highlightArray(highlighting,line,myColors['white']);
                        highlightArray(highlighting,explosion,myColors['red']);

                        let selection = explosion;
                        return selection;
                    };

                    let spellFunction = function(selection) {
                        for (let tile of selection) {
                            let enemy = getEnemyAt(game,...tile);
                            if (enemy) {
                                let confirmedDamage = enemy.damage(game.data,2,"fire");
                                if (confirmedDamage) {
                                    game.data.msgs.push("The "+enemy.name+" is hit by the explosion");
                                } else {
                                    game.data.msgs.push("The "+enemy.name+" resists the fire damage.");
                                }
                            }
                            if(tile[0] === game.data.player.x && tile[1] === game.data.player.y) {
                                game.data.player.damage(1);
                                game.data.msgs.push("You are caught in the explosion");
                            }
                        }

                    };

                    return await castInDirection(game,'fireball',targetingFunction,spellFunction);


                }
            },
            ['ice ray']: {
                cast: async function(game) {
                    let t = function(key,hl) {
                        let line = lineToWall(game,key);
                        highlightArray(hl,line,myColors['white']);
                        return line;
                    };
                    let s = function(selection) {

                        for (let tile of selection) {
                            let enemy = getEnemyAt(game,...tile);
                            if (enemy) {
                                let confirmedDamage = enemy.damage(game.data,2,"ice");
                                if (confirmedDamage) {
                                    game.data.msgs.push("The "+enemy.name+" is seared by the ice ray");
                                } else {
                                    game.data.msgs.push("The "+enemy.name+" resists the ice damage.");
                                }
                            }
                        }
                    };
                    return await castInDirection(game,'ice ray',t,s);
                }
            },
            ['irradiate']:{
                cast: async function(game) {
                    let t = function(hl) {
                        let pos = [game.data.player.x,game.data.player.y];
                        let n = neighbors(...pos);
                        highlightArray(hl,n,myColors['red']);
                        return n;
                    };
                    let s = function(selection) {
                        for (let tile of selection) {
                            let enemy = getEnemyAt(game,...tile);
                            if (enemy) {
                                let confirmedDamage = enemy.damage(game.data,2,"fire");
                                if (confirmedDamage) {
                                    game.data.msgs.push("The "+enemy.name+" is scorched by the radiation.");
                                } else {
                                    game.data.msgs.push("The "+enemy.name+" resists the fire damage.");
                                }
                            }
                        }
                    };
                    return await castWithConfirmation(game,'irradiate',t,s);
                }
            },
            ['freeze']:{
                cast: async function(game) {
                    let t = function(key,hl) {
                        let target_pos = [game.data.player.x+dir[key][0],game.data.player.y+dir[key][1]];

                        highlightArray(hl,[target_pos],myColors['white']);
                        return target_pos;
                    }
                    let s = function(selection) {
                        let enemy = getEnemyAt(game,...selection);
                        if (enemy) {
                            if(enemy.freeze(game)) {
                                game.data.msgs.push("The "+enemy.name+" freezes in place");
                            } else {
                                game.data.msgs.push("The "+enemy.name+" resists the freezing touch")
                            }
                        }
                    }
                    return await castInDirection(game,'freeze',t,s);
                }
            },
            ['teleport']:{
                cast: async function(game) {
                    let t = function(key,hl) {
                        let line = lineToWall(game,key);

                        while(line.length > 0) {
                            let tile = line.pop();
                            let enemy = getEnemyAt(game,...tile);
                            if (!enemy) {
                                highlightArray(hl,[tile],myColors['white']);
                                return tile;
                            }
                        }
                        return null;
                    }
                    let s = function(selection) {

                        game.data.player.x = selection[0];
                        game.data.player.y = selection[1];
                        game.data.msgs.push("Your surroudings suddenly seem different");
                    }
                    return await castInDirection(game,'teleport',t,s);
                }

            },
            // TODO fix conjure flame
            ['conjure flame']:{
                cast: async function(game) {
                    let t = function(key,hl,selection) {
                        let target = [1,1];
                        if (selection !== null) {
                            target = [selection[0]+dir[key][0],selection[1]+dir[key][1]];
                        } else {
                            target = [game.data.player.x+dir[key][0],game.data.player.y+dir[key][1]];
                        }
                        //check if new target is outside the level and reset
                        if(target[0] <= 0 || target[1] <=0 || target[0] > 9 || target[1] > 9) {
                            target = selection;
                        }
                        highlightArray(hl,[target],myColors['white']);
                        return target;

                    }
                    let s = function(selection) {
                        let flamecloud = new FlameCloud(selection[0],selection[1]);

                        // this is a total fucking hack, but I dont know another way
                        // to get this to be next in the scheduler. I'm not even sure if
                        // it works as expected
                        game.scheduler.add(flamecloud,true);
                        let flame = game.scheduler._queue._events.heap.pop();
                        game.scheduler._queue._events.heap.unshift(flame);



                        game.data.clouds.push(flamecloud);

                        game.data.msgs.push("You conjure a flame");
                    }
                    return await castWithSmiteTargeting(game,'conjure flame',t,s);
                }
            },
            ['ice sprite']:{
                cast: async function(game) {
                    let t = function(_key,_hl) {
                        let n = neighbors(game.data.player.x,game.data.player.y);
                        ROT.RNG.shuffle(n);
                        while (n.length > 0) {
                            let tile = n.pop();
                            if( !game.isBlocked(...tile) ) {
                               return tile;
                            }
                        }
                    }
                    let s = function(selection) {
                        if (selection) {
                            let sprite = enemyFactory["Ice Sprite"](...selection);
                            sprite.isFriendly = true;

                            // This is a hack, I'm not even sure if it works as expected
                            game.scheduler.add(sprite,true);
                            let spriteSchedule = game.scheduler._queue._events.heap.pop();
                            game.scheduler._queue._events.heap.unshift(spriteSchedule);
                            // console.log(game.scheduler._queue._events.heap);

                            game.data.enemies.push(sprite);
                            game.data.msgs.push("You summon a friendly Ice Sprite");
                        } else {
                            game.data.msgs.push("There is no room to summon an Ice Sprite");
                        }
                    }
                    return await castWithConfirmation(game,'ice sprite',t,s);
                }
            },
            ['befriend']:{
                cast: async function(game) {
                    let t = function(key,hl) {
                        let line = lineToBlocked(game,key);

                        highlightArray(hl,line,myColors['white']);
                        let selection = line.pop();
                        return selection;
                    }
                    let s = function(selection) {
                        let enemy = getEnemyAt(game,...selection);
                        if(enemy) {
                            enemy.befriendedForTurns = 5;
                            game.data.msgs.push("The "+enemy.name+" looks at you lovingly");
                        } else {
                            game.data.msgs.push("The wall looks at you lovingly");
                        }
                    }
                    return await castInDirection(game,'befriend',t,s);
                }

            },
            ['polymorph']:{
                cast: async function(game) {
                    let t = function(key,hl) {
                        let line = lineToBlocked(game,key);

                        highlightArray(hl,line,myColors['white']);
                        let selection = line.pop();
                        return selection;
                    }
                    let s = function(selection) {
                        let enemy = getEnemyAt(game,...selection);
                        if(enemy) {
                            let deadName  = enemy.name;
                            enemy.polymorph();

                            game.data.msgs.push("The "+deadName+" transforms into a "+enemy.name);
                        } else {
                            game.data.msgs.push("The wall shivers for a moment");
                        }
                    }
                    return await castInDirection(game,'polymorph',t,s);

                }

            },

            ['flash']:{
                cast: async function(game) {

                    let t = function(_key,_hl) {
                        let selection = [];
                        for (let enemy of game.data.enemies) {
                            //might change this to only los?
                            selection.push(enemy);
                        }
                        return selection;
                    }
                    let s = function(selection) {
                        for (let enemy of selection) {
                            enemy.stunnedForTurns+=3;
                            game.data.msgs.push("The "+enemy.name+" is stunned");
                        }
                    }
                    return await castWithConfirmation(game,'flash',t,s);
                }
            },
            ['slow']:{
                cast: async function(game) {
                    let t = function(key,hl) {
                        let line = lineToBlocked(game,key);

                        highlightArray(hl,line,myColors['white']);
                        let selection = line.pop();
                        return selection;
                    }
                    let s = function(selection) {
                        let enemy = getEnemyAt(game,...selection);
                        if(enemy) {
                            enemy.isSlowed = true;

                            game.data.msgs.push("The "+enemy.name+" moves in slow motion");
                        } else {
                            game.data.msgs.push("The wall moves even slower than before");
                        }
                    }
                    return await castInDirection(game,'slow',t,s);

                }

            },
            ['confusion']:{
                cast: async function(game) {
                    let t = function(key,hl) {
                        let line = lineToBlocked(game,key);
                        let destination = line[line.length-1];
                        let explosion = neighbors(...destination);
                        explosion.push(destination);

                        highlightArray(hl,line,myColors['white']);
                        highlightArray(hl,explosion,myColors['red']);

                        let selection = explosion;
                        return selection;
                    }
                    let s = function(selection) {
                        for (let tile of selection) {
                            let enemy = getEnemyAt(game,...tile);

                            if (enemy) {
                                enemy.confusedForTurns += 5;
                                game.data.msgs.push("The "+enemy.name+"'s eyes glaze over.");
                            }
                        }
                    }
                    return await castInDirection(game,'confusion',t,s);
                }
            },
            ['ghost form']:{
                cast: async function(game) {

                    let t = function(_key,_hl) {
                    }
                    let s = function(_selection) {
                        game.data.player.ghostForm=true;
                        game.data.msgs.push("Your skin fades to transparent. You feel you can now pass through walls");
                    }
                    return await castWithConfirmation(game,'ghost form',t,s);
                }
            },
            ['drain']:{
                cast: async function(game) {
                    let t = function(key,hl) {
                        let target_pos = [game.data.player.x+dir[key][0],game.data.player.y+dir[key][1]];

                        highlightArray(hl,[target_pos],myColors['white']);
                        return target_pos;
                    }
                    let s = function(selection) {
                        let enemy = getEnemyAt(game,...selection);
                        if (enemy) {
                            enemy.damage(game.data,1,"drain");
                            game.data.player.heal(1,game.data);
                            game.data.msgs.push("You drain life from the "+enemy.name);
                        }
                    }
                    return await castInDirection(game,'drain',t,s);
                }
            },
        }
    }

    async castKey(game,key) {
        let name = this.slots[key];
        let spell = this.list[name];
        let exhausted = this.isExhausted[key];
        if (exhausted) {
            game.data.msgs.push("That spell is exhausted. You can cast it again in the next room.");
        } else if(spell) {
            let casted = await spell.cast(game);
            if (casted) {
                this.isExhausted[key] = true;
            }
        }

    }
    refresh() {
        this.isExhausted = {};
    }

}

const readKey = () => new Promise(resolve => window.addEventListener('keydown', resolve, {once:true}));

const dir = {
    y:[-1,-1],
    u:[ 1,-1],
    h:[-1, 0],
    j:[ 0, 1],
    k:[ 0,-1],
    l:[ 1, 0],
    b:[-1, 1],
    n:[ 1, 1],
}
const numpadConverter = {
    Numpad1: 'b',
    Numpad2: 'j',
    Numpad3: 'n',
    Numpad4: 'h',
    Numpad6: 'l',
    Numpad7: 'y',
    Numpad8: 'k',
    Numpad9: 'u',
}

function highlightArray(highlighting,tiles,color) {
    for (let tile of tiles) {
        highlighting[tile[0]+','+tile[1]] = color;
    }
}

function lineToBlocked(game,key) {

    let d = dir[key];

    let pos = [game.data.player.x+d[0],game.data.player.y+d[1]];
    let list = [];
    while ( !game.isBlocked(pos[0],pos[1]) ) {
        let p = [...pos];
        list.push(p);

        pos[0] += d[0];
        pos[1] += d[1];
    }
    list.push(pos);
    return list;
}

function lineToWall(game,key) {
    let d = dir[key];

    let pos = [game.data.player.x+d[0],game.data.player.y+d[1]];
    let list = [];
    while ( !game.data.map.isBlocking(pos[0],pos[1]) ) {
        let p = [...pos];
        list.push(p);

        pos[0] += d[0];
        pos[1] += d[1];
    }
    return list;

}

function getEnemyAt(game,x,y) {
    for (let enemy of game.data.enemies) {
        if (enemy.x === x && enemy.y === y) {
            return enemy;
        }
    }
}

function neighbors(x,y) {
    let list = [];
    for (let d of Object.values(dir)) {
        list.push([x+d[0],y+d[1]]);
    }
    return list;
}

async function castInDirection(game,name,targetingFunction,spellFunction) {
    let casted = false;
    game.data.msgs.push("Cast "+name+" in which direction? (press direction then Space/Enter to confirm; Esc to cancel)");
    game.drawGame({});
    let selection = null;
    while(true) {
        let highlighting = {};
        let k = await readKey();
        if( k.code === "Escape" ) {
            game.data.msgs.push("Okay...nevermind");
            break;
        }
        if (selection !== null && (k.key === "Enter" || k.code === "Space")) {

            game.data.awaitingPlayerAction = false;
            spellFunction(selection);
            casted = true;
            break;

        }
        let key = k.key;
        if (numpadConverter[k.code]) {
            key = numpadConverter[k.code];
        }
        // console.log(key);

        if(dir[key]) {
            selection = targetingFunction(key,highlighting);

        } else {
            selection = null;
        }
        game.drawGame(highlighting);
    }
    return casted;
}

async function castWithConfirmation(game,name,targetingFunction,spellFunction) {
    let casted = false;
    game.data.msgs.push("Cast "+name+"? (Space/Enter to confirm; Esc to cancel)");
    let highlighting = {};
    let selection = targetingFunction(highlighting);
    while(true) {
        game.drawGame(highlighting);
        let k = await readKey();
        if( k.code === "Escape" ) {
            game.data.msgs.push("Okay...nevermind");
            break;
        }
        if (k.key === "Enter" || k.code === "Space") {
            game.data.awaitingPlayerAction = false;
            spellFunction(selection);
            casted = true;
            break;

        }
    }
    return casted;
}

async function castWithSmiteTargeting(game,name,targetingFunction,spellFunction) {
    let casted = false;
    game.data.msgs.push("Cast "+name+" where? (press direction to change location then Space/Enter to confirm; Esc to cancel)");
    game.drawGame({});
    let selection = null;
    while(true) {
        let highlighting = {};
        let k = await readKey();
        if( k.code === "Escape" ) {
            game.data.msgs.push("Okay...nevermind");
            break;
        }
        if (selection !== null && (k.key === "Enter" || k.code === "Space")) {

            game.data.awaitingPlayerAction = false;
            spellFunction(selection);
            casted = true;
            break;

        }
        let key = k.key;
        if (numpadConverter[k.code]) {
            key = numpadConverter[k.code];
        }
        // console.log(key);
        if(dir[key]) {
            selection = targetingFunction(key,highlighting,selection);

        } else {
            selection = null;
        }
        game.drawGame(highlighting);
    }
    return casted;
}
