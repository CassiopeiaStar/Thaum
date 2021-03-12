


export class ComponentsBag {

    constructor() {
        for (let comp of componentsList) {
            //TODO change this back to 0
            this[comp] = 0;

        }
    }


    addRand() {
        let new_item = ROT.RNG.getItem(componentsList);
        this[new_item] += 1;

        return new_item;
    }

    tryCombination(c1,c2) {
        if (c1 === c2) {
            return "You cannot combine two of the same item";
        }
        if (!componentsList[c1] || !componentsList[c2]) {
            return "You must choose two items";
        }


    }
}

export const componentsList = [
    "rose petal",
    "glass shard",
    "string",
    "moth wing",
    "hand mirror",
    "candle",
]

export const spellFactory = {
    craft: (c1,c2) => {
        console.log("C1: "+c1);
        console.log("C2: "+c2);
        let v = compValue[c1] + compValue[c2];
        console.log("value: "+v);
        return spellValue[v];
    }
}

const compValue= {
    ["rose petal"]:  1,
    ["glass shard"]: 2,
    ["string"]:      4,
    ["moth wing"]:   8,
    ["hand mirror"]: 16,
    ["candle"]:      32,
};

const spellValue= {
    [3]: "healing",
    [5]: "fireball",
    [6]: "ice ray",
    [9]: "irradiate",
    [10]:"freeze",
    [12]:"teleport",
    [17]:"conjure flame",
    [18]:"ice sprite",
    [20]:"befriend",
    [24]:"polymorph",
    [33]:"flash",
    [34]:"slow",
    [36]:"confusion",
    [40]:"ghost form",
    [48]:"drain",
};

export const spellList = [

    ///////////// beginner spell
    "magic missile",

    "healing",
    "fireball",
    "ice ray",

    //////////// Moth wing spells
    "freeze",
    "irradiate",
    "teleport",

    //////////// hand mirror spells
    "conjure flame",
    "ice sprite",
    "befriend",
    "polymorph",

    //////////// candle spells
    "flash",
    "slow",
    "confusion",
    "ghost form",
    "drain",
]
