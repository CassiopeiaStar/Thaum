
import {myColors} from './colors.js';


export class Map {
    constructor(w,h) {
        this.width = w;
        this.height = h;
        this.tiles = {};
        this.nextEntrance = '0,5';
    }

    draw(display,offset_x,offset_y,highlighting) {
        for (let key in this.tiles) {
            let parts = key.split(',');
            let x = parseInt(parts[0]);
            let y = parseInt(parts[1]);


            let tile = tileHash[this.tiles[key]];

            display.draw(x+offset_x,y+offset_y,tile.char,tile.color,highlighting[key]);
        }
    }

    getTileProperties(x,y) {
        let key = x+","+y;
        return tileHash[this.tiles[key]];
    }

    isBlocking(x,y) {
        let tile = this.getTileProperties(x,y);
        if (tile) {
            return tile.blocks;
        }
        return true;

    }

    isExit(x,y) {
        return this.tiles[x+","+y] === 3;
    }

    newLevel() {
        let tiles = {};
        let map = new ROT.Map.Arena(this.width,this.height);
        let mapCallback = function( x, y,value) {

            var key = x+","+y;
            tiles[key] = value;
        }
        map.create(mapCallback);

        this.tiles = tiles;

        let playerStart = null;

        // save the location of the entrance for placing the exit later
        let enLoc = 'left';
        //set entrance
        let entrance = this.nextEntrance;
        if (entrance) {
            this.tiles[entrance] = 2;
            let parts = entrance.split(',');
            let x = parseInt(parts[0]);
            let y = parseInt(parts[1]);

            if (x === 0) {
                enLoc = "left";
                playerStart = {x:x+1,y:y};
            }
            if (x === this.width-1) {
                enLoc = "right";
                playerStart = {x:x-1,y:y};
            }
            if (y === 0) {
                enLoc = "top";
                playerStart = {x:x,y:y+1};
            }
            if (y === this.height-1) {
                enLoc = "bottom";
                playerStart = {x:x,y:y-1};
            }
        } else {
            this.tiles['0,'+this.width/2] = 2;

            playerStart = {x:0,y:this.width/2};

        }


        // exit should be on a different wall from the entrance
        // Also, shouldn't be blocked

        let possibleExits = new Array();
        for (let x = 1; x < this.width-1; x++) {
            if( enLoc !== 'top' ) {
                possibleExits.push({key: x+',0', nextEntrance: x+','+(this.height-1), adjacent: x+',1'});
            }
            if( enLoc !== 'bottom' ) {
                possibleExits.push({key: x+','+(this.height-1), nextEntrance: x+',0', adjacent: x+','+(this.height-2)});
            }
        }
        for (let y = 1; y < this.height-1; y++) {
            if( enLoc !== 'left' ) {
                possibleExits.push({key:'0,'+y,nextEntrance: (this.width-1)+','+y, adjacent: '1,'+y });
            }
            if( enLoc !== 'right' ) {
                possibleExits.push({key:(this.width-1)+','+y,nextEntrance: '0,'+y, adjacent: (this.width-2)+','+y});
            }
        }
        let exitLocation = possibleExits[Math.floor(Math.random() * possibleExits.length)];
        // console.log(exitLocation);
        this.tiles[exitLocation.key]= 3;

        this.nextEntrance = exitLocation.nextEntrance;

        let tries = 10;
        while (tries > 0){
            this.fillWithWalls()
            let playerStartKey = playerStart.x+','+playerStart.y;
            console.log(exitLocation.adjacent);
            console.log(this.tiles[exitLocation.adjacent]);
            if ((this.tiles[playerStartKey] === 0) && (this.tiles[exitLocation.adjacent] === 0)) {
                tries = 0
            }
            tries--;

        }

        return playerStart;

    }


    fillWithWalls() {

        let room = ROT.RNG.getItem(rooms9x9).replace(/\s+/g, '');
        // console.log(room);

        let stringIndex = 0;
        for (let y = 1; y < this.height-1; y++) {
            for (let x = 1; x < this.width-1; x++) {
                let character = room[stringIndex];
                if (character === '#') {
                    this.tiles[x+','+y] = 1;
                    stringIndex++;

                }
                else if (character === '.') {
                    this.tiles[x+','+y] = 0;
                    stringIndex++;
                } else {
                    console.log(character);
                }
                // console.log(character);
                // stringIndex++;

            }
        }


        if( ROT.RNG.getPercentage() > 50 ) {
            this.transpose();
        }

        this.rotate(Math.floor(Math.random() * 4));

    }

    transpose() {

        console.log("Transposing level");
        let newTiles = {...this.tiles};

        for (let y = 1; y < this.height-1; y++) {
            for (let x = 1; x < this.width-1; x++) {
                newTiles[y+','+x] = this.tiles[x+','+y];
            }
        }

        this.tiles = newTiles;
    }

    rotate(times) {

        console.log("Rotating level "+times+" times");
        let newTiles = {...this.tiles};
        while (times && times > 0) {

            for (let y = 1; y < this.height-1; y++) {
                for (let x = 1; x < this.width-1; x++) {
                    let key = this.width-y-1+','+x;
                    newTiles[x+','+y] = this.tiles[key];
                }
            }

            times--;
        }

        this.tiles = newTiles;
    }
}



let tileHash = {
    '0': {name: 'floor', char: '.', color:myColors['purple'], blocks: false},
    '1': {name: 'wall', char: '#', color:myColors['white'], blocks: true},
    '2': {name: 'entrance', char: '<', color:myColors['gray'], blocks: true},
    '3': {name: 'exit', char: '>', color:myColors['green'], blocks: true},
}


const rooms9x9 = [
    '.........\
     .........\
     .........\
     .........\
     .........\
     .........\
     .........\
     .........\
     .........',

    '.........\
     .###.###.\
     .........\
     .###.###.\
     .........\
     .###.###.\
     .........\
     .###.###.\
     .........',

    '.........\
     .###.###.\
     .#.....#.\
     .#.....#.\
     .........\
     .#.....#.\
     .#.....#.\
     .###.###.\
     .........',

    '.#.......\
     .#.#####.\
     .#.#...#.\
     .#.#.#.#.\
     .#.#.#.#.\
     .#.###.#.\
     .#.....#.\
     .#######.\
     .........',

    '.#######.\
     ..#####..\
     ...###...\
     ....#....\
     .........\
     ....#....\
     ...###...\
     ..#####..\
     .#######.',

    '.........\
     #######..\
     .........\
     ..#######\
     .........\
     #######..\
     .........\
     ..#######\
     .........',

    '.........\
     .######..\
     ##....##.\
     .......#.\
     .##...##.\
     .#.......\
     .##....##\
     ..######.\
     .........',

    '.#.#.#.#.\
     .........\
     #.#.#.#..\
     .........\
     .#.#.#.#.\
     .........\
     ..#.#.#.#\
     .........\
     .#.#.#.#.',

    '#.......#\
     .#.....#.\
     ..#...#..\
     ...#.#...\
     .........\
     ...#.#...\
     ..#...#..\
     .#.....#.\
     #.......#',

    '....#....\
     .#######.\
     .#.....#.\
     .#.###.#.\
     .#..#..#.\
     .#..#..#.\
     .#..#..#.\
     .##.#.##.\
     ....#....',

    '.........\
     .###.###.\
     .###.###.\
     .###.###.\
     .........\
     .###.###.\
     .###.###.\
     .###.###.\
     .........',

    '###...###\
     ###...###\
     ###...###\
     ....#....\
     ...###...\
     ....#....\
     ###...###\
     ###...###\
     ###...###',

    '........#\
     .##...###\
     ....#####\
     ..####...\
     .........\
     ...####..\
     #####....\
     ###...##.\
     #........',

    '.........\
     ...###...\
     ..##.##..\
     .##......\
     .#..####.\
     .#.....#.\
     .##...##.\
     ..#####..\
     .........',

    '.........\
     .........\
     ....###..\
     ...###...\
     ..###....\
     ....###..\
     ...###...\
     ..###....\
     .........',

    '.........\
     .#######.\
     ..#####..\
     ..#...#..\
     ..#...#..\
     ..#...#..\
     .....##..\
     .#######.\
     .........',

    '.........\
     ######...\
     .....#...\
     ..#......\
     ..#......\
     ..#..####\
     ..#..#...\
     ..#..#...\
     .........',

    '..#......\
     .##......\
     .#...###.\
     .#.......\
     .#.......\
     .#.####..\
     .#.......\
     .#######.\
     .........',

    '.........\
     .###.....\
     ..#...###\
     ....#...#\
     ...###..#\
     .....##..\
     ..#..#...\
     ..##.....\
     .........',



]
