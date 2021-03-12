import {Player} from './player.js';
import {Map} from './map.js';
import {enemyFactory} from './enemy.js';
import {myColors} from './colors.js';
import {ComponentsBag,spellFactory,componentsList} from './components.js';
import {SpellsSystem} from './spell.js';

class Game {
    constructor() {
        this.display = new ROT.Display({
            width:50,
            height:25,
            fontSize: 24,
            bg: myColors['black'],
            fg: myColors['white'],
        });
        document.getElementById("gameContainer").appendChild(this.display.getContainer());
        this.spellCompToggle = true;
        this.winner = false;


    }

    async run() {
        while(true) {
            this.setGame();
            await this.startMenu();
            await this.gameLoop();
            if (this.winner) {
                await this.win();
            } else {
                await this.gameOver();
            }
        }

    }

    async gameLoop() {
        let actor = this.scheduler.next();
            while(true) {
                this.drawGame({});

                if(!this.data.awaitingPlayerAction) {
                    actor = this.scheduler.next();
                }
                if(!actor) {break;};
                let stateChanges = await actor.act(this);
                stateChanges && console.log("State Change: "+stateChanges);
                if( stateChanges === "newLevel" ) {
                    this.data.difficulty +=1;
                    if (this.data.difficulty <= 20) {
                        this.newLevel();
                    } else {
                        this.winner = true;
                        break;
                    }

                }
                if( stateChanges === "gameOver" ) {break;}
                if( stateChanges === "craftingMenu" ) {
                    let spellName = await this.craftingMenu();
                    console.log("spellName: "+spellName);
                    if (spellName !== undefined) {await this.spellAssignMenu(spellName)};
                }

                this.clearDeadEnemies();
                this.clearTimedoutClouds();
                if (!this.data.currentLevelCleared && this.isAllDead()) {
                    let new_component = this.data.cBag.addRand();

                    this.data.msgs.push("The final monster drops a "+new_component+
                                        ". You pick it up and add it to your bag. (press c to open the bag)");

                    this.data.currentLevelCleared = true;
                }

                if(this.isPlayerDead()) {
                    this.data.msgs.push("You have died");
                    break;
                }
            }

    }

    drawGame(highlighting) {
        this.display.clear();
        this.display.drawText(2,12,"Level: "+this.data.difficulty);
        this.drawMap(1,1,highlighting)
        this.drawHUD(13,1);
        this.drawMessages(1,14,48,10);
        if (this.spellCompToggle) {
            this.drawSpells(28,1);
        } else {
            this.drawComponents(28,1);
        }
    }

    drawMap(x,y,highlighting) {
        // any bacground highlighting needs to be defined prior to drawing characters
        // trying to change the background color after a character is drawn will
        // overwright the character

        if (this.data.clouds) {
            for (let cloud of this.data.clouds) {
                cloud.draw(this.display,x,y,highlighting);
            }
        }


        this.data.map.draw(this.display,x,y,highlighting);
        this.data.player.draw(this.display,x,y,highlighting);
        for( let enemy of this.data.enemies ) {
            enemy.draw(this.display,x,y,highlighting);
        }
    }

    //
    drawHUD(x,y) {
        this.display.drawText(x,y,"Player Health");
        this.display.draw(x,y+1,'[',myColors['white']);
        this.display.draw(x+10,y+1, ']',myColors['white']);
        for( let i = 0; i < this.data.player.health; i++ ) {
            this.display.draw(x+1+i,y+1,'*',myColors['green']);
        }

        this.display.drawText(x,y+3,"Enemy Health");
        for(let i = 0; i < Math.min(9,this.data.enemies.length); i++) {
            let enemy = this.data.enemies[i];
            enemy.drawHealthBar(x,y+4+i,this.display);

            if(enemy.isFrozen) {
                this.display.draw(x+6,y+4+i,'F',myColors['blue']);
            }
            if(enemy.isFriendlyOrBefriended()) {
                this.display.draw(x+7,y+4+i,'F',myColors['red']);
            }
            if(enemy.isSlowed) {
                this.display.draw(x+8,y+4+i,'S',myColors['lpurple']);
            }
            if(enemy.confusedForTurns > 0) {
                this.display.draw(x+9,y+4+i,'C',myColors['green']);
            }
            if(enemy.stunnedForTurns > 0) {
                this.display.draw(x+10,y+4+i,'S',myColors['yellow']);
            }

        }
    }

    drawComponents(x,y) {
        this.display.drawText(x,y,"Components Bag");
        let i = 1;
        for (let comp of componentsList) {
            this.display.drawText(x,y+i,comp);
            // this.display.draw(x+12,y+i,':');
            this.display.drawText(x+12,y+i,':'+this.data.cBag[comp]);
            i++;
        }
    }
    drawSpells(x,y) {
        this.display.drawText(x,y,"Key: Spells");
        let i = 1;
        for (let key of Object.keys(this.data.spells.slots)) {
            let str = "[ ]: "+this.data.spells.slots[key];
            let color = myColors['white'];
            if (this.data.spells.isExhausted[key] || this.data.spells.slots[key] === "(empty)") {
                str = "%c{"+myColors['purple']+"}"+str+"%c{}";
                color = myColors['purple']
            }
            this.display.drawText(x,y+i,str);
            this.display.draw(x+1,y+i,key,color);
            i++;
        }
    }

    drawMessages(x,y,width,height) {
        let maxH = y + height;
        let currenty = y;
        let color = ROT.Color.fromString(myColors['white']);
        for (let i = this.data.msgs.length-1; i >= 0;i--)  {
            let msg = this.data.msgs[i];

            let msg_color = "%c{"+ROT.Color.toRGB(color)+"}"+msg+"%c{}";

            let msg_height = this.display.drawText(x,currenty,msg_color,width);
            currenty += msg_height;

            if(currenty > maxH) {break;};

            color = ROT.Color.interpolate(color,ROT.Color.fromString(myColors['black']),0.2);
        }
    }


    async startMenu() {
        let colorTiles = (tiles,color) => {
            for (let tile of tiles) {
                this.display.draw(...tile,null,null,color);
            }
        }
        while(true) {
            //draw startMenu;
            this.display.clear();
            // this.display.drawText(1,5,"Welcome to Thaum");

            let t = [[2,1],[3,1],[4,1],[5,1],[6,1],[4,2],[4,3],[4,4],[4,5],[4,6]];
            colorTiles(t,myColors['white']);

            let h = [[7,3],[7,4],[7,5],[7,6],[9,3],[9,4],[9,5],[9,6],[8,5]];
            colorTiles(h,myColors['gray']);

            let a = [[11,4],[11,5],[11,6],[13,4],[13,5],[13,6],[12,5],[12,3]];
            colorTiles(a,myColors['gray']);

            let u = [[15,3],[15,4],[15,5],[18,3],[18,4],[18,5],[16,6],[17,6]];
            colorTiles(u,myColors['gray']);

            let m = [[20,3],[20,4],[20,5],[20,6],[24,3],[24,4],[24,5],[24,6],[21,4],[23,4],[22,5]];
            colorTiles(m,myColors['gray']);

            // this.display.drawText(3,8,"Can you craft the spells you need to complete the trials?")
            this.display.drawText(3,11,"press Enter to begin",25);
            this.display.drawText(3,14,"press i for a brief introduction");
            this.display.drawText(3,15,"press t for a brief tutorial");
            this.display.drawText(3,16,"press ? for a list of controls");

            let k = await readKey();
            if(k.key === 'i') {
                await this.intro();
            }
            if(k.key === 't') {
                await this.tutorial();
            }
            if(k.key === '?') {
                await this.controls();
            }
            if(k.code === "Enter") {
                break;
            }

        }
    }

    async intro() {
        let messages = [
            "You are a fledgeling Thaumaturge who has set out on a trial to fufill your dream "+
            "to become the greatest wizard the world has ever known. ",

            "The Chambers of Magic before you hold great secrets and great dangers. "+
            "There are few who venture into these chambers, and even fewer that return, "+
            "but all who emerge do so with an unquestionably deep understanding of the magical arts.",

            "You have learned but one spell, the magic missle, "+
            "and believe the Chambers of Magic should be a quick "+
            "way to learn more and achieve greatness...",
        ];
        let index = 0;
        while(true) {
            this.display.clear();
            if (index < messages.length) {
                this.display.drawText(10,1,messages[index], 20);
            } else {
                break;
            }

            let k = await readKey();
            index++;
        }
    }

    async tutorial() {
        let messages = [
            "The Chambers of Magic are a series of rooms. "+
            "Each room has monsters represented by letters (R,K,G,O,etc.), "+
            "walls represented by a hash # "+
            "and an entrance and exit represented by < and > respectively. ",

            "You can leave the floor by walking onto the > at any time. "+
            "But if you do not kill all the monsters you will not get the spell components. "+
            "You may need to wiegh your life against the pursuit of knowledge.",

            "The player is represented by the @ symbol. "+
            "The player can be controlled with traditional roguelike vi-keys or the number pad. "+
            "For example press 7 to move diagonally up and to the left or 6 to move to the right. "+
            "You can wait with the period key or the 5 key on the numberpad. "+
            "Attacking is simply done by walking into a monster.",

            "Upon clearing a room, the last monster will drop a spell component. "+
            "You can combine two different spell components in the crafting menu to create a spell. "+
            "Each combination creates a different spell.",

            "After crafting a spell, you will be able to assign it to one of the spellcasting keys "+
            "(q,w,e,r,a,s,d,and f)."+
            "After assigning it, you will be able to use the spell by pressing that key. "+
            "You start with one spell, the magic missile, assigned to q."
        ];
        let index = 0;
        while(true) {
            this.display.clear();
            if (index < messages.length) {
                this.display.drawText(1,1,messages[index], 30);
            } else {
                break;
            }

            let k = await readKey();
            index++;
        }
    }

    async controls() {
        this.display.clear();
        this.display.drawText(1,1,"Movement:");
        this.display.drawText(1,2,"vi-keys:");
        this.display.drawText(4,3," y k u");
        this.display.drawText(5,4,"  \\|/");
        this.display.drawText(4,5," h-.-l");
        this.display.drawText(5,6,"  /|\\");
        this.display.drawText(4,7," b j n");

        this.display.drawText(13,2,"numberpad:");
        this.display.drawText(16,3," 7 8 9");
        this.display.drawText(17,4,"  \\|/");
        this.display.drawText(16,5," 4-5-6");
        this.display.drawText(17,6,"  /|\\");
        this.display.drawText(16,7," 1 2 3");

        this.display.drawText(1,9,"Wait a turn: Period or 5")

        this.display.drawText(1,10,"Components bag and crafting menu: c");
        this.display.drawText(1,11,"Toggle components/spell display:  v");
        this.display.drawText(1,12,"Cast spells: q,w,e,r,a,s,d, and f");
        // this.display.drawText(1,13,"View controls: ?");

        await readKey();
    }

    async gameOver() {
        //draw startMenu;
        this.display.clear();
        this.display.drawText(1,5,"Game Over!");
        this.display.drawText(1,8,"You made it to level "+this.data.difficulty,25);
        this.display.drawText(1,13,"press any key to restart the game",25);
        await readKey();
    }

    async win() {
        this.display.clear();
        this.display.drawText(1,5,"As you open the final chamber door, you see the light burst in from the other side. "+
                             "You have made it of the Chambers of Magic alive! "+
                             "With your new found powers over the arcane, you set out. "+
                              "Look out world, there is a new wizard in town.");
        await readKey();
    }

    async craftingMenu() {
        let selection = [];
        let msg = 'Select two spell componenets';
        const updateMsg= function() {
            if (selection.length === 2) {
                // console.log("updating msg");
                // TODO add known spells?
                msg = "Craft a spell using a "+componentsList[selection[0]-1]+" and a "+componentsList[selection[1]-1]+"?";

            } else {
                msg = 'Select two spell components';
            }
        };
        while (true) {
            //draw menu
            this.display.clear();
            this.display.drawText(1,1,"Select two different components to synthesize");
            this.display.drawText(1,2,"by pressing the corresponding number");
            this.display.drawText(1,3,"Press enter or space to confirm the selection");
            this.display.drawText(1,4,"Press escape to exit the crafting menu");
            this.display.drawText(1,15,msg);

            let x = 1;
            let y = 6;
            let i = 1;
            for (let comp of componentsList) {
                let str = '['+i+'] '+comp;
                // console.log('Selection: '+selection);
                // console.log('i: '+i);
                // console.log(selection.includes(parseInt(i)));
                if (selection.includes(i)) {
                    // console.log('coloring');
                    str = '%c{'+myColors['lpurple']+'}'+str+'%c{}';
                }
                this.display.drawText(x,y+i,str);
                // this.display.draw(x+12,y+i,':');
                this.display.drawText(x+16,y+i,':'+this.data.cBag[comp]);
                i++;
            }

            let k = await readKey();

            if (k.code === "Escape" || k.code === "KeyC") {
                break;
            }

            if (k.code === "Enter" || k.code === "Space") {
                if (selection.length === 2) {
                    let c1 = componentsList[selection[0]-1];
                    let c2 = componentsList[selection[1]-1];
                    this.data.cBag[c1]--;
                    this.data.cBag[c2]--;

                    console.log("C1: "+c1);
                    console.log("C2: "+c2);
                    console.log(spellFactory.craft(c1,c2));
                    return spellFactory.craft(c1,c2)
                } else {
                    msg = "You need to slect two spell components first."+
                        " Otherwise you can press escape to exit.";
                }
            }


            let key_int = parseInt(k.key);

            if (key_int >= 1 && key_int < i) {
                if (selection.includes(key_int)) {
                    if (selection[0] === key_int) {
                        selection.shift();
                        updateMsg();
                    } else {
                        selection.pop();
                        updateMsg();
                    }
                } else {
                    if (this.data.cBag[componentsList[key_int-1]] > 0) {
                        selection.push(key_int);
                        updateMsg();

                    } else {
                        msg = "You don't have any "+componentsList[key_int-1]+"s";
                    }
                }
            }

            while (selection.length > 2) {
                selection.shift();
                updateMsg();
            }
        }
    }

    async spellAssignMenu(spell) {
        let msg = '';
        while(true) {
            this.display.clear();
            this.display.drawText(1,1,"You crafted the "+spell+" spell!");
            this.display.drawText(1,2,"Select a spell slot to assign it to");
            this.display.drawText(1,3,"Or press escape to forget the spell");
            this.display.drawText(1,15,msg);

            let keys = Object.keys(this.data.spells.slots);
            let i = 0;
            for (let key of keys) {
                let str = "["+key+"] "+this.data.spells.slots[key];
                this.display.drawText(1,5+i,str);
                i++;
            }

            let k = await readKey();
            if (k.code === "Escape") {
                break;
            }
            if (keys.includes(k.key)) {
                this.display.drawText(1,15,"Are you sure you want to assign "+
                                      spell+" to the "+k.key+
                                      " key and overwright any previous spells assigned there?"+
                                      " Press Space or Enter to confirm.");

                let confirmation = await readKey();

                if (confirmation.code === "Enter" || confirmation.code === "Space") {
                    this.data.spells.slots[k.key] = spell;
                    break;
                } else {
                    msg = '';
                }
            } else {
                console.log(k.key);
            }
        }
    }

    setGame() {
        this.data = {};
        this.data.awaitingPlayerAction = true;
        this.data.msgs = ["As you step through the door, it closes shut tight behind you. There is only one way out... forward."];
        this.scheduler = new ROT.Scheduler.Simple();

        this.data.difficulty = 1;

        this.data.player = new Player(5,5);
        this.data.map = new Map(11,11);

        this.data.cBag = new ComponentsBag();
        this.data.spells = new SpellsSystem();

        this.winner = false;
        this.newLevel();
    }

    newLevel() {
        console.log("Creating new level");
        this.scheduler.clear();

        let playerStart = this.data.map.newLevel();
        this.data.player.x = playerStart.x;
        this.data.player.y = playerStart.y;
        this.scheduler.add(this.data.player,true);

        this.data.spells.refresh();

        this.data.enemies = [];
        this.populateWithEnemies(this.data.difficulty);
        this.data.currentLevelCleared = false;

        this.data.clouds = [];
    }

    populateWithEnemies(difficulty) {
        const sumDifficulty = () => {
            let sum = 0;
            for (let enemy of this.data.enemies) {
                sum += enemy.difficulty;
            }
            return sum;
        };

        while (difficulty > sumDifficulty()) {
            let sizeOfMonster = Math.min(4,difficulty-sumDifficulty());

            let loc = this.getEmptyTile();
            let new_guy = enemyFactory[sizeOfMonster](loc.x,loc.y);
            this.scheduler.add(new_guy,true);
            this.data.enemies.push(new_guy);
        }
    }

    getEmptyTile() {
        //try 10 times
        for( let t = 0; t < 10; t++) {
            //two random numbers between 1 and 9 inclusive
            let x = Math.floor(Math.random() * 9) + 1;
            let y = Math.floor(Math.random() * 9) + 1;

            if (!this.isBlocked(x,y)) {
                console.log("Returning empty tile after "+(t+1)+" tries");
                return {x,y};
            }
        }
    }

    isBlocked(x,y) {
        let blocked = false;
        if (this.data.map.isBlocking(x,y)) {blocked = true};

        if (this.data.player.isBlocking(x,y) ) {blocked = true};

        for( let enemy of this.data.enemies ) {
            if( enemy.isBlocking(x,y) ) {blocked = true};
        }
        return blocked;
    }

    clearDeadEnemies() {
        this.data.enemies = this.data.enemies.filter(enemy => {
            if(enemy.isDead()) {
                this.data.msgs.push("The "+enemy.name+" dies!");
                this.scheduler.remove(enemy);
            }
            return !enemy.isDead();
        });
    }

    clearTimedoutClouds() {
        this.data.clouds = this.data.clouds.filter(cloud => {
            if(cloud.timer < 0) {
                this.data.msgs.push("The cloud fades");
                this.scheduler.remove(cloud);
            }
            return !(cloud.timer < 0);
        });
    }

    isAllDead() {
        return this.data.enemies.length === 0;
    }

    isPlayerDead() {
        return this.data.player.health <=0;
    }


}

const readKey = () => new Promise(resolve => window.addEventListener('keydown', resolve, {once:true}));


let game = new Game();
game.run();

export {game};
