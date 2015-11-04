var debug = true;

// Global vars
var stage;

// Board preferences
var board_prefs = {
    dims:{
        h:10,
        w:10
    },
    // hexsize:40
}

function Hex (row,col,hexsize) {
    // calculate hex dims based on size
    hexW = Math.sqrt(3)/2 * 2 * hexsize;
    hexH =          (3)/4 * 2 * hexsize;

    // create createJS shape
    this.shape = new createjs.Shape;

    // set co-ordinates of hex on canvas
                      this.shape.y = row * hexH;
    if (row % 2 == 0) this.shape.x = col * hexW;
    else              this.shape.x = col * hexW + 1/2* hexW;

    // render shape
    this.shape.graphics
        .beginStroke("#aaa")
        .beginLinearGradientFill(
            ["#eee","#fafafa"],
            [0, 1], 0, -20, 0, +30
        )
        .drawPolyStar(
            0,0,
            hexsize,
            6,0,30
        )
        .endStroke()
        .endFill();

    // grid debug
    if (debug) {
        var text = new createjs.Text(row + ", " + col, hexsize/2 + "px Arial", "black");
            text.x = board.mapContainer.x + this.shape.x - 15;  // yeah, i'm referencing board. dill with it
            text.y = board.mapContainer.y + this.shape.y + 5;
            text.textBaseline = "alphabetic";

        stage.addChild(text)
    }
}

function Board(prefs) {
    this.dims = prefs.dims;

    this.mapContainer = new createjs.Container();

    // scale grid to screen
    prefs.hexsize = prefs.hexsize || Math.floor( Math.min(stage.canvas.width, stage.canvas.height) / prefs.dims.w) / 2;

    // center the grid on the board
    this.mapContainer.x = (stage.canvas.width  - (prefs.dims.w - 0.5) * Math.sqrt(3)/2 * 2 * prefs.hexsize) / 2;
    this.mapContainer.y = (stage.canvas.height - (prefs.dims.h - 0.5) *          (3)/4 * 2 * prefs.hexsize) / 2;

    this.init = function () {
        stage.addChild(this.mapContainer);

        this.mapObjects = [];
        for (var row = 0; row < this.dims.h; row++) {
            this.mapObjects.push([]);
            for (var col = 0; col < this.dims.w; col++) {
                this.mapObjects[row][col] = new Hex(row, col, prefs.hexsize);

                this.mapContainer.addChild(this.mapObjects[row][col].shape);
            }       
        }

        stage.update()
    }
}

var board;

function init() {
    //Create stage object - our root level container
    stage = new createjs.Stage("c");
    stage.canvas.width = window.innerWidth;
    stage.canvas.height = window.innerHeight;

    // stage.enableMouseOver(10);
    
    // Call the function to craete the hex grid
    board = new Board(board_prefs);
    board.init();

    // updaet canvas 24/7, b/c fuck efficiency
    // createjs.Ticker.addEventListener("tick", stage);
}

window.onload = init;