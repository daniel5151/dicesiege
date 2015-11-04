var debug = true;

// Global vars
var stage;
var board;

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
    var hexW = Math.sqrt(3)/2 * 2 * hexsize;
    var hexH =          (3)/4 * 2 * hexsize;

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
}

var Debug = {
    GridText:function(row, col, hexsize) {
        // calculate hex dims based on size
        var hexW = Math.sqrt(3)/2 * 2 * hexsize;
        var hexH =          (3)/4 * 2 * hexsize;

        // set co-ordinates of hex on canvas
                          var y = row * hexH;
        if (row % 2 == 0) var x = col * hexW;
        else              var x = col * hexW + 1/2* hexW;

        this.text = new createjs.Text(row + ", " + col, hexsize/2 + "px Arial", "black");

        this.text.x            = board.offset.x + x - hexsize/2;  // yeah, i'm referencing board. dill with it
        this.text.y            = board.offset.y + y + hexsize/8;
        this.text.textBaseline = "alphabetic";
    }
}

function Board(prefs) {
    this.dims    = prefs.dims;
    this.hexsize = prefs.hexsize;
    this.offset  = prefs.offset;
    
    this.centerOffset = function () {
        this.offset = {
            x:(stage.canvas.width  - (this.dims.w - 0.5) * Math.sqrt(3)/2 * 2 * this.hexsize) / 2,
            y:(stage.canvas.height - (this.dims.h - 0.5) *          (3)/4 * 2 * this.hexsize) / 2
        };
        this.mapContainer.x = this.offset.x;
        this.mapContainer.y = this.offset.y;
    }

    this.init = function () {
        // scale grid to screen
        this.hexsize = this.hexsize || 
            Math.floor( Math.min(stage.canvas.width, stage.canvas.height) / Math.min(this.dims.w, this.dims.h) ) / 2;

        this.mapContainer = new createjs.Container();

        // center the grid on the board
        this.centerOffset();

        // draw the grid
        stage.addChild(this.mapContainer);

        this.mapObjects = [];
        for (var row = 0; row < this.dims.h; row++) {
            this.mapObjects.push([]);
            for (var col = 0; col < this.dims.w; col++) {
                this.mapObjects[row][col] = new Hex(row, col, this.hexsize);
                this.mapContainer.addChild(this.mapObjects[row][col].shape);
            }       
        }

        //----------------- DEBUG
            if (debug) {
                this.debugContainer = new createjs.Container();
                stage.addChild(this.debugContainer)

                this.debugObjects = [];
                for (var row = 0; row < this.dims.h; row++) {
                    this.debugObjects.push([]);
                    for (var col = 0; col < this.dims.w; col++) {
                        this.debugObjects[row][col] = new Debug.GridText(row, col, this.hexsize);

                        this.debugContainer.addChild(this.debugObjects[row][col].text);
                    }       
                }
            }
        //------------- END DEBUG

        stage.update();
    }

    this.resize = function (newsize){
        // remove all children so we can repopulate the scene.
        stage.removeAllChildren();

        // set new hex size
        this.hexsize = 
            (newsize == "towindow")
                ? Math.floor( Math.min(stage.canvas.width, stage.canvas.height) / Math.min(board.dims.w, board.dims.h) ) / 2
                : newsize
        ;

        // reinit board
        this.init();
    }
}

function init() {
    //Create stage object - our root level container
    stage = new createjs.Stage("c");
    stage.canvas.width = window.innerWidth;
    stage.canvas.height = window.innerHeight;
    
    // Call the function to craete the hex grid
    board = new Board(board_prefs);
    board.init();

    // resize means we have to rescale everything
    window.addEventListener('resize', function(e){
        stage.canvas.width = window.innerWidth;
        stage.canvas.height = window.innerHeight;      
        board.resize("towindow");
    }, false);
}

window.onload = init;