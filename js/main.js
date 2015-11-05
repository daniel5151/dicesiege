var debug = true;

// Global vars
var stage;
var board;

// Board preferences
var board_prefs = {
    dims:{
        h:15,
        w:20
    },
    // hexsize:25
}

function Hex (props) {
    var self = this;

    // create createJS shape
    this.shape = new createjs.Shape;

    // props has the following keys:
    
    // row          - row in map
    // col          - column in map

    // hexsize      - size of hex

    // renderprefs - a object containing:
    //   * strokeColor  - color of stroke
    //   * fillType     - if solid, then use fillColor, if gradient, use gradient
    //   * fillColor    - solid color for fill
    //   * fillGradient - array of properties to be .apply() to .beginLinearGradientFill

    // Co-ordinates on grid are saved for later reference
    this.row     = props.row;
    this.col     = props.col;

    this.recalcSizeAndPos = function (hexsize) {
        // calculate hex dims based on size
        this.hexW = Math.sqrt(3)/2 * 2 * hexsize;
        this.hexH =          (3)/4 * 2 * hexsize;

        // get co-ordinates of hex on canvas based on size and pos on grid
                               this.shape.y = this.row * this.hexH;
        if (this.row % 2 == 0) this.shape.x = this.col * this.hexW;
        else                   this.shape.x = this.col * this.hexW + 1/2* this.hexW;
    }

    this.recalcSizeAndPos(props.hexsize);

    // get command references so we can modify shape props on the fly
    this.render = {};
    
    //---1---
    this.render
        .beginStroke = this.shape.graphics.beginStroke(
            (props.renderprefs.strokeColor || "#aaa")
        ).command;
    //---2---
    this.render
        .beginLinearGradientFill = this.shape.graphics.beginLinearGradientFill(
            ["#eee","#fafafa"],
            [0, 1], 0, -20, 0, +30
        ).command;
    //---3---
    this.render
        .drawPolyStar = this.shape.graphics.drawPolyStar(
            0,0,
            props.hexsize,
            6,0,30
    ).command;
    //---wrapping up code---
    this.shape.graphics
        .endStroke()
        .endFill();
    
    // make helper function to change props
    this.set = {};
    this.get = {};

    this.set.strokeColor = function (color)   {        self.render.beginStroke.style = color; }
    this.get.strokeColor = function ()        { return self.render.beginStroke.style;         }
    this.set.hexsize     = function (hexsize) { 
        self.render.drawPolyStar.radius = hexsize;
        self.recalcSizeAndPos(hexsize)
    }
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

        this.set = {};
        var self = this;
        this.recalc = function () {
            // calculate hex dims based on size
            var hexW = Math.sqrt(3)/2 * 2 * board.hexsize;
            var hexH =          (3)/4 * 2 * board.hexsize;

            // set co-ordinates of hex on canvas
                              var y = row * hexH;
            if (row % 2 == 0) var x = col * hexW;
            else              var x = col * hexW + 1/2* hexW;

            self.text.x = board.offset.x + x - board.hexsize/2;
            self.text.y = board.offset.y + y + board.hexsize/8;

            self.text.font = board.hexsize/2 + "px Arial";
        };
    }
}

function Board(prefs) {
    this.dims     = prefs.dims;
    this.hexsize  = prefs.hexsize;
    this.offset   = prefs.offset;
    this.scalable = (prefs.hexsize)?false:true;
    
    this.centerOffset = function () {
        this.offset = {
            x:(stage.canvas.width  - (this.dims.w - 0.5) * Math.sqrt(3)/2 * 2 * this.hexsize) / 2,
            y:(stage.canvas.height - (this.dims.h - 0.5) *          (3)/4 * 2 * this.hexsize) / 2
        };
        this.mapContainer.x = this.offset.x;
        this.mapContainer.y = this.offset.y;
    }

    this.init = function () {
        // possibly scale grid to screen
        this.hexsize = 
            this.hexsize
            ||
            Math.floor(
                Math.min(
                    stage.canvas.width  / this.dims.w,
                    stage.canvas.height / this.dims.h
                ) / 1.75
            );

        // make a new createJS conatiner for the map-tiles
        this.mapContainer = new createjs.Container();

        // center the grid on the board
        this.centerOffset();

        // Now, we can actually draw the grid
        // add the map contiane to the scene
        stage.addChild(this.mapContainer);

        // populate the container, and keep track of tiles in mapObjects
        this.mapObjects = [];
        for (var row = 0; row < this.dims.h; row++) {
            this.mapObjects.push([]);
            for (var col = 0; col < this.dims.w; col++) {
                this.mapObjects[row][col] = new Hex({
                    row:row,
                    col:col,
                    hexsize:this.hexsize,
                    renderprefs:{
                        strokeColor:"blue"
                    }
                });
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

    this.resize = function (canvasW, canvasH, hexsize){
        stage.canvas.width = canvasW;
        stage.canvas.height = canvasH;

        this.centerOffset();

        if (hexsize === 'towindow') {
            if (this.scalable)
                this.hexsize = Math.floor(
                    Math.min(
                        stage.canvas.width  / this.dims.w,
                        stage.canvas.height / this.dims.h
                    ) / 1.75
                );
        } else                  this.hexsize = hexsize;

        for (var row = 0; row < this.dims.h; row++) {
            for (var col = 0; col < this.dims.w; col++) {
                           this.mapObjects  [row][col].set.hexsize(this.hexsize);
                if (debug) this.debugObjects[row][col].recalc();
            }       
        }

        stage.update();
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
        board.resize(window.innerWidth, window.innerHeight, 'towindow');
    }, false);
}

window.onload = init;