var Game;
var Render;

var SCALE = 15;
var PLAYERS = 3;
if (SCALE < 5 || SCALE =="" || !parseInt(SCALE)) SCALE = 15;
var BOARD_DIMENSIONS = {
    c:3*SCALE,
    r:2*SCALE
};

function init() {
    var SEED = new Date().getTime();

    // Import / Generate game data
    var GameData = new GenGameData(BOARD_DIMENSIONS,PLAYERS,SEED);

    // Start the game
    Game = new GameController(GameData);
    
    // TableRender();
    Render = new Renderer();
    Render.init.all();
}

function reinit() {
    Render.two.clear();

    var SEED = new Date().getTime();

    // Import / Generate game data
    var GameData = new GenGameData(BOARD_DIMENSIONS,PLAYERS,SEED);

    // Start the game
    Game = new GameController(GameData);



    Render.reinit();
}

init();