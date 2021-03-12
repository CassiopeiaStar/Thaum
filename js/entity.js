
let id = 0;
export class Entity {
    constructor(x,y,char,color) {
        this.x = x;
        this.y = y;
        this.char = char;
        this.color = color;

        this.id = id;
        id++;
    }

    equals(other) {
        return this.id === other.id;
    }

    draw(display,offset_x,offset_y,highlighting) {
        let key = this.x+','+this.y;
        display.draw(this.x+offset_x,this.y+offset_y,this.char,this.color,highlighting[key]);
    }

    isBlocking(x,y) {
        return this.x === x && this.y === y;
    }
}
