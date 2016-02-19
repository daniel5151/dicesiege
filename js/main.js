var Game;
var Render;

function init() {
    var SEED = new Date().getTime();
    var SCALE = 15;
    var PLAYERS = 3;
    if (SCALE < 5 || SCALE =="" || !parseInt(SCALE)) SCALE = 15;
    
    var BOARD_DIMENSIONS = {
        w:3*SCALE,
        h:2*SCALE
    };

    // Import / Generate game data
    var GameData = new GenGameData(BOARD_DIMENSIONS,PLAYERS,SEED);

    // Start the game
    Game = new GameController(GameData);
    
    // TableRender();
    Render = new Renderer(Game);
}

function reinit() {
    Render.two.clear();
    Render.two.renderer.domElement.outerHTML = "";
    init();
}

init();