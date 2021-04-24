import {Entity} from './entity.js';
import {myColors} from './colors.js';

export class FlameCloud extends Entity {
    constructor(x,y) {
        super(x,y,'*',myColors['red'])
        this.timer = 8;
    }

    async act(game) {
        if (this.timer > 0) {
            for( let enemy of game.data.enemies ) {
                if(this.x === enemy.x && this.y === enemy.y) {
                    let confirmedDamage = enemy.damage(game.data,1,"fire");

                    if (confirmedDamage) {
                        game.data.msgs.push("The "+enemy.name+" is burned by the flame cloud");
                    } else {
                        game.data.msgs.push("The "+enemy.name+" resists the fire damage");
                    }
                }
            }
            if( this.x === game.data.player.x && this.y === game.data.player.y ) {
                game.data.player.damage(1);
                game.data.msgs.push("You are burned by the flame cloud");
            }
        }
        this.timer--;
    }

    draw(display,x,y,highlighting) {
        highlighting[(x+this.x-1)+','+(y+this.y-1)] = this.color;
    }
}
