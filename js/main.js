var debug = true;

// Global vars
var stage;
var board;

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
    //   * EITHER
    //       * fillColor    - solid color for fill
    //       * fillGradient - array of properties to be .apply() to .beginLinearGradientFill

    // Co-ordinates on grid are saved for later reference
    this.row     = props.row;
    this.col     = props.col;

    // what province is this hex in
    this.province = props.province;

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
    this.render = {
        //---1---
        beginStroke: this.shape.graphics.beginStroke(
            (props.renderprefs.strokeColor || "rgba(0,0,0,0)")
        ).command,
        //---2---
        // beginLinearGradientFill: this.shape.graphics.beginLinearGradientFill(
        //     ["#eee","#fafafa"],
        //     [0, 1], 0, -20, 0, +30
        // ).command,
        beginFill: this.shape.graphics.beginFill(
            (props.renderprefs.fillColor
                || 
                "rgb("
                    +150
                    +","+Math.floor(255*(this.row/board.dims.h))
                    +","+Math.floor(255*(this.col/board.dims.w))
                +")")
        ).command,
        //---3---
        drawPolyStar: this.shape.graphics.drawPolyStar(
            0,0,
            props.hexsize+1, // +1 for no outline
            6,0,30
        ).command
    }
    //---wrapping up code---
    this.shape.graphics
        .endStroke()
        .endFill();
    
    // make helper function to change props
    this.set = {};
    this.get = {};

    this.set.strokeColor = function (color)   {        self.render.beginStroke.style = color; }
    this.get.strokeColor = function ()        { return self.render.beginStroke.style;         }
    this.set.fillColor   = function (color)   {        self.render.beginFill.style = color; }
    this.get.fillColor   = function ()        { return self.render.beginFill.style;         }
    this.set.hexsize     = function (hexsize) { 
        self.render.drawPolyStar.radius = hexsize+1;
        self.recalcSizeAndPos(hexsize)
    }

    if (debug) this.set.fillColor("rgb("
                    +175
                    +","+this.province*4
                    +","+this.province*4
                +")");
}

var Debug = {
    GridText:function(row, col, hexsize, mode) {
        // calculate hex dims based on size
        var hexW = Math.sqrt(3)/2 * 2 * hexsize;
        var hexH =          (3)/4 * 2 * hexsize;

        // set co-ordinates of hex on canvas
                          var y = row * hexH;
        if (row % 2 == 0) var x = col * hexW;
        else              var x = col * hexW + 1/2* hexW;

        if (mode === 'cords'   ) this.text = new createjs.Text(row + ", " + col, hexsize/2 + "px Arial", "black");
        if (mode === 'province') this.text = new createjs.Text(board.mapObjects[row][col].province, hexsize/2 + "px Arial", "black");

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
    
    this.colormap = prefs.colormap;

    // make a new createJS conatiner for the map-tiles
    this.mapContainer = new createjs.Container();

    // set offset for map on canvas
    this.mapContainer.x = (prefs.offset)?prefs.offset.x:0;
    this.mapContainer.y = (prefs.offset)?prefs.offset.y:0;

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


        // center the grid on the board
        this.centerOffset();

        // Now, we can actually draw the grid
        // add the map contiane to the scene
        stage.addChild(this.mapContainer);

        // Generate actual colormap from given map and palette
        var hexColor = [];
        for (var row = 0; row < this.dims.h; row++) {
            hexColor.push([]);
            for (var col = 0; col < this.dims.w; col++) {
                hexColor[row][col] = this.colormap.palette[this.colormap.map[row][col].owner];
            }
        }

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
                        fillColor: hexColor[row][col]
                    },
                    province: this.colormap.map[row][col].province
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
                        this.debugObjects[row][col] = new Debug.GridText(row, col, this.hexsize, 'province');

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

    this.recolor = function (colormap) {
        for (var row = 0; row < this.dims.h; row++) {
            for (var col = 0; col < this.dims.w; col++) {
                this.mapObjects[row][col].set.fillColor(
                    colormap.palette[colormap.map[row][col]]
                );
            }       
        }
    }
}

function generateMap(dims, players, seed) {
    // Generate array of -1
    var map = Array.apply(null, Array(dims.h)).map(function(){
        return Array.apply(null, Array(dims.w)).map(Number.prototype.valueOf, -1)
    });

    // generate map using a seed, or random
    seedRandom(seed || Math.random()); 

    // Randomly place seeds for provinces around
    // Yep. This may result in an infinite loop
    // YOLO
    var BUFFER = 2;
    var tiles = [];
    var provinceID = 0;

    for (var i = 0; i < (dims.h*dims.w) / ((players+1)*(BUFFER*BUFFER + BUFFER)); i++) {
        while (true){
            // pick a random point on the board
            var randomR = Math.round(random()*(dims.h-1));
            var randomC = Math.round(random()*(dims.w-1));

            // check if we have visited this piece before, and if so, just continue
            var docontinue = false;
            for (var tile = 0; tile < tiles.length; tile++) {
                if (tiles[tile].row == randomR && tiles[tile].col === randomC) {
                    docontinue = true;
                    break;
                }
            } 
            if (docontinue) continue;
            // this is to mitigate the effect of random landing on seen tiles, and wasting computation time


            // now, check if there is room to place a hex so that it is not squished b/w other hexes
            var areaconflict = false;
            for (var dr = -BUFFER; dr <= BUFFER; dr++) {
                for (var dc = -BUFFER; dc <= BUFFER; dc++) {
                    // check boundary conditions
                    if (randomR + dr < 0 || randomR + dr > dims.h-1) continue;
                    if (randomC + dc < 0 || randomC + dc > dims.w-1) continue;

                    // if there is a tile that is non--1 around a piece, then there is an area conflict.
                    if (map[randomR + dr][randomC + dc] !== -1) {
                        areaconflict = true;
                        break;
                    }
                }
                if (areaconflict) break;
            }

            if (!areaconflict) {
                map[randomR][randomC] = {
                    owner:i % (players+1),
                    province: provinceID++
                };

                tiles.push({
                    row:randomR,
                    col:randomC
                });
                break;
            }
        }
    }

    // DEBUG
        globalTile = [];
        for (var tile in tiles) {
            globalTile[tile] = tiles[tile];
        }
    // END DEBUG

    // grow seeds by iterating
        // var MAX_ITER = 6;
        // while (--MAX_ITER){
    while (true) {
        // clone map
        var oldmap = []
        for (var row = 0; row < dims.h; row++) {
            oldmap.push([]);
            for (var col = 0; col < dims.w; col++) {
                oldmap[row][col] = map[row][col];
            }
        }

        var currtiles = tiles.length;
        for (var i = 0; i < currtiles; i++) {
            
            // check tiles directly next to tile
            for (var dr = -1; dr <= 1; dr++) {
                var range = [0,0];
                if (dr == 0) { 
                    range = [-1,1];
                } else if (tiles[i].row % 2 == 1) { // odd row
                    range = [0,1];
                } else if (tiles[i].row % 2 == 0) { // even row
                    range = [-1,0];
                }
                
                for (var dc = range[0] ; dc <= range[1] ; dc++) {
                    // Check Out of Bounds
                    if (tiles[i].row + dr < 0 || tiles[i].row + dr > dims.h-1) continue;
                    if (tiles[i].col + dc < 0 || tiles[i].col + dc > dims.w-1) continue;

                    // if the surrounding tile is empty, and a tile is lucky,
                    // then the tile gets some more land
                    if (oldmap[tiles[i].row + dr][tiles[i].col + dc] === -1 && random() < 0.25) {
                        map[tiles[i].row + dr][tiles[i].col + dc] = {
                            owner: map[tiles[i].row][tiles[i].col].owner,
                            province: map[tiles[i].row][tiles[i].col].province
                        };
                        
                        tiles.push({
                            row:tiles[i].row + dr,
                            col:tiles[i].col + dc
                        });
                    }
                }
            }
        }

        var emptycount = dims.h*dims.w;
        for (var row = 0; row < dims.h; row++) {
            for (var col = 0; col < dims.w; col++) {
                if (map[row][col] !== -1) emptycount-=1;
            }
        }
        if (emptycount == 0) break;
        console.log(emptycount);
    }


    // var count = 1;
    // while (count > 0) {
    //     // clone map
    //     var oldmap = []
    //     for (var row = 0; row < dims.h; row++) {
    //         oldmap.push([]);
    //         for (var col = 0; col < dims.w; col++) {
    //             oldmap[row][col] = map[row][col];
    //         }
    //     }

    //     count = 0;
    //     for (var row = 0; row < dims.h; row++) {
    //         for (var col = 0; col < dims.w; col++) {
                
    //             if (map[row][col] === -1) {
    //                 count++;
    //                 var surroundingColors = [];
    //                 for (var dr = -2; dr <= 2; dr++) {
    //                     for (var dc = -2; dc <= 2; dc++) {
    //                         if (row + dr < 0 || row + dr > dims.h-1) continue;
    //                         if (col + dc < 0 || col + dc > dims.w-1) continue;

    //                         if (oldmap[row + dr][col + dc] !== -1) {
    //                             var dopush = true;
    //                             for (var i2 = 0; i2 < surroundingColors.length; i2++) {
    //                                 if ( oldmap[row+dr][col+dc] == surroundingColors[i] ) dopush = false;
    //                             }
    //                             if (dopush) surroundingColors.push( oldmap[row+dr][col+dc] )
    //                         }
    //                     }
    //                 }
    //                 if (surroundingColors.length > 0) {
    //                     map[row][col] = surroundingColors[Math.round(Math.random() * (surroundingColors.length-1))];
    //                 }
    //             }

    //         }
    //     }
    // }


    return map;
}
function generateColorMap(map, palette) {
    palette.unshift('blue');
    return {
        map:map,
        palette:palette
    };
}

function init() {
    //Create stage object - our root level container
    stage = new createjs.Stage("c");
    stage.canvas.width = window.innerWidth;
    stage.canvas.height = window.innerHeight;
    
    // generate colormap
    var colormap = generateColorMap(generateMap({h:25,w:50},2), ["brown","green"]);

    // Call the function to create the hex grid
    board = new Board({
        dims:{
            h:25,
            w:50
        },
        colormap:colormap
        // hexsize:25
    });
    board.init();

    // resize means we have to rescale everything
    window.addEventListener('resize', function(e){    
        board.resize(window.innerWidth, window.innerHeight, 'towindow');
    }, false);
}

window.onload = init;

// UTILS
var seed = 1;
function seedRandom(s) { seed = s; }
function random() {
    var x = Math.sin(seed++) * 10000;
    return x - Math.floor(x);
}

function colorsplotch (row,col) {
    for (var dr = -1; dr <= 1; dr++) {
        var range = [0,0];
        if (dr == 0) { 
            range = [-1,1];
        } else if (row % 2 == 1) { // odd row
            range = [0,1];
        } else if (row % 2 == 0) { // even row
            range = [-1,0];
        }
        for (var dc = range[0] ; dc <= range[1] ; dc++) {
            if (row + dr < 0 || row + dr > board.dims.h-1) continue;

            if (col + dc < 0 || col + dc > board.dims.w-1) continue;

            board.mapObjects[row+dr][col+dc].set.fillColor("black");
        }
    }
}