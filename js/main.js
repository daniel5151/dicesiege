var map;

function init() {
    var SEED = new Date().getTime();
    var SCALE = 15;
    var PLAYERS = 3;
    if (SCALE < 5 || SCALE =="" || !parseInt(SCALE)) SCALE = 15;
    
    var BOARD_DIMENSIONS = {w:3*SCALE,h:2*SCALE};

    // generate map
    map = new Map(BOARD_DIMENSIONS,PLAYERS,SEED);
    
    // TableRender();
    Render.init();
}

window.onload = init;