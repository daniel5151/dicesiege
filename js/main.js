// Global vars
var stage;
var board;

var board_dimensions = {w:50,h:30};

var debug = {
    mode:'province',
    // all code here is sphagetti
    // bring your forks and tread softly
    GridText:function(row, col, hexsize) {
        // calculate hex dims based on size
        var hexW = Math.sqrt(3)/2 * 2 * hexsize;
        var hexH =          (3)/4 * 2 * hexsize;

        // set co-ordinates of hex on canvas
                          var y = row * hexH;
        if (row % 2 == 0) var x = col * hexW;
        else              var x = col * hexW + 1/2* hexW;

        if (debug.mode === 'cords'   ) this.text = new createjs.Text(row + ", " + col, hexsize/2 + "px Arial", "black");
        if (debug.mode === 'province') this.text = new createjs.Text(renderObjects.map[row][col].province, hexsize/2 + "px Arial", "black");

        var offset = render.board.get.offset();

        this.text.x            = offset.x + x - hexsize/2;
        this.text.y            = offset.y + y + hexsize/8;
        this.text.textBaseline = "alphabetic";

        this.set = {};
        var self = this;
        this.recalc = function () {
            var offset = render.board.get.offset()

            // calculate hex dims based on size
            var hexW = Math.sqrt(3)/2 * 2 * renderPrefs.board.hexsize;
            var hexH =          (3)/4 * 2 * renderPrefs.board.hexsize;

            // set co-ordinates of hex on canvas
                              var y = row * hexH;
            if (row % 2 == 0) var x = col * hexW;
            else              var x = col * hexW + 1/2* hexW;

            self.text.x = offset.x + x - renderPrefs.board.hexsize/2;
            self.text.y = offset.y + y + renderPrefs.board.hexsize/8;

            self.text.font = renderPrefs.board.hexsize/2 + "px Arial";
        };
    },
    log:function(message) {
        if (debug.mode) console.log(message);
    }
}


function Hex (props) {
    var self = this;

    // create createJS shape
    this.shape = new createjs.Shape;

    // props has the following keys:
    
    // row          - row in map
    // col          - column in map

    // hexsize      - size of hex

    // province this hex belongs to

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

        // calculate co-ordinates of edges
        this.edges = [
            { y:this.shape.y - (this.hexH / 2), x:this.shape.x - (this.hexW / 2) }, // upper left
            { y:this.shape.y - (this.hexH / 2), x:this.shape.x + (this.hexW / 2) }, // upper right
            { y:this.shape.y                  , x:this.shape.x + (this.hexW / 2) }, // middle right
            { y:this.shape.y + (this.hexH / 2), x:this.shape.x + (this.hexW / 2) }, // lower right
            { y:this.shape.y + (this.hexH / 2), x:this.shape.x - (this.hexW / 2) }, // lower left
            { y:this.shape.y                  , x:this.shape.x - (this.hexW / 2) }, // middle left
        ];
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
}

/*
* ---------------------------------------- BOARD ---------------------------------------------
* 
* This constructs an object that handles map rendering
* 
* Passable Arguments
* ------------------
* Req | Type       | Name              | Description
* ----| ---------- | ----------------- | -----------------------------------------------------
*   ! |            | prefs             | - Object containing all properties of board
*   ! | {Map}      |    map            |   - Object containing map (as specified in Map)
*
*   ! | {int}      |    hexsize        |   - Radius of hexagons to be rendered
*     | {bool}     |    scalable       |   - Allow sacling the board to full canvas
*     |            |    offset         |   - Object with x-y offset from top left of canvas
*     | {int}      |        x          |     - x offset
*     | {int}      |        y          |     - y offset
*   ! | {colors[]} |    pallette       |   - How to color each players territorry 
* 
* 
* Properties
* ------------------
* Type       | Name              | Description
* ---------- | ----------------- | -----------------------------------------------------------
* {Map}      | map               | - Object containing map (as specified in Map)
*
* {int}      | hexsize           | - Radius of hexagons to be rendered
* {bool}     | scalable          | - Allow sacling the board to full canvas
*
* {Hex[][]}  | mapObjects        | - 2D array with references to rendered Hexes
* {createJS} | mapContainer      | - CreateJS Container of all Hexes
* 
* 
* Methods
* ----------------
* Return Type | Name          | Description
* ----------- | ------------- | ----------------
* {void}      | init          | initialize board
*             |               |
* {void}      | resize        | resize board
* {void}      | set.offset    | set xy offset
* {void}      | set.palette   | set palette
* {x:x,y:y}   | get.offset    | retrieve offset
*
*/


// ---------------------------------- renderPrefs --------------------------------------- //
//                                                                                        //
// Decription: Holds or points to all variables necessary to render objects on screen.    //
//             Some variables are required to be set before calling render.XXX.init(),    //
//             with those variables having a Y or N in the Req column.                    //
//                                                                                        //
// Expected Properties                                                                    //
// -------------------                                                                    //
// Req | Type      | Name         | Description                                           //
// --- | --------- | ------------ | ----------------------------------------------------- //
//  Y  |           | board        | - Contains all variables required to render the board //
//  N  | {Map}     |     map      |   - Map object as generated by Map()                  //
//  N  | {int}     |     hexsize  |   - Radius of hexagonal tiles                         //
//  N  | {bool}    |     scalable |   - [Dis]allow board to scale to the  size of the     //
//     |           |              |     canvas                                            //
//  Y  | {color[]} |     palette  |   - How to color each players territory               //
//  N  |           |     offset   |   - Object with x-y offset from top left of canvas    //
//  Y  | {int}     |         x    |     - x offset                                        //
//  Y  | {int}     |         y    |     - y offset                                        //
//     |           |              |                                                       //
var renderPrefs = {};
renderPrefs.board = {
    // map:"somemap"
    // hexsize:10,
    // offset:{x:10,y:10},
    scalable:true,
    palette:['blue','brown','green'],
};

// ---------------------------------- renderObjects ----------------------------------- //
// Description: Holds the arrays and pointers to all of the createJS objects for easy   //
//              access and modification. This object should never be manually populated //
//              in the source, i.e: the only thing populating this should be            //
//              render.XXX.init()s                                                      //
//                                                                                      //
// Expected properties                                                                  //
// -------------------                                                                  //
// Type      | Name | Description                                                       //
// --------  | ---- | ----------------------------------------------------------------- //
// {Hex[][]} | map  | - Contains 2D pointer array to all the instances of Hex() that    //
//           |      |   comprise the rendered board.                                    //
//           |      |                                                                   //
var renderObjects = {};

// --------------------------------- renderContainers --------------------------------- //
// Description: Holds the pointers to all of the createJS containers for easy access    //
//              and modification. Again, This object should never be manually populated //
//              in the source, i.e: the only thing populating this should be            //
//              render.XXX.init()s                                                      //
//                                                                                      //
// Expected properties                                                                  //
// -------------------                                                                  //
// Type                 | Name | Description                                            //
// -------------------- | ---- | ------------------------------------------------------ //
// {createJS.Container} | map  | - Contains 2D pointer array to all the instances of    //
//                      |      |   Hex() that comprise the rendered board.              //
//                      |      |                                                        //
var renderContainers = {};

// -------------------------------------- render -------------------------------------- //
// Description: Global container for rendering methods of renderable structures         //
//                                                                                      //
// Object Structurekey: "value",                                                        //
//    - Each renderable should have a self titled propery containing an its rendering   //
//      methods                                                                         //
//    - Renderables whose rendering properties may be modified must have the            //
//      subproperty `.set` containing methods in the format `.prop(val)` such that the  //
//      method changes the renderable's `prop` property to `val`                        //
//        - Directly modifying renderable's properties should not be done               //
//    - Renderables may have methods under the subproperty `.get` in the format         //
//      `.prop()` such that the method return the property `prop` of the Renderables    //
//    - Auxillary methods used by core methods under renderables must be declared under //
//      the renderable namespace                                                        //
//                                                                                      //
var render = {};

render.board = {};
render.board.init = function (map) {
    // make a new createJS conatiner for the map-tiles
    renderContainers.map = new createjs.Container();
    // add the map contiane to the scene
    stage.addChild(renderContainers.map);

    // remember what map we are rendering
    renderPrefs.board.map = map;

    // if there is no given hexsize, fallback to scaling
    if (!renderPrefs.board.hexsize) {
        renderPrefs.board.hexsize = Math.floor(
            Math.min(
                stage.canvas.width  / renderPrefs.board.map.dims.w,
                stage.canvas.height / renderPrefs.board.map.dims.h
            ) / 1.75
        )
    }

    // if there is no given offset, fallback to center positioning
    if (!renderPrefs.board.offset) render.board.set.offset('center');

    // Generate a colormap from a given map and pallete
    var colormap = [];
    for (var row = 0; row < renderPrefs.board.map.dims.h; row++) {
        colormap.push([]);
        for (var col = 0; col < renderPrefs.board.map.dims.w; col++) {
            colormap[row][col] = renderPrefs.board.palette[renderPrefs.board.map.tileMap[row][col].owner];
        }
    }

    // populate the mapObjects container with hexes, and keep track of the hexes in mapObjects
    renderObjects.map = [];
    for (var row = 0; row < renderPrefs.board.map.dims.h; row++) {
        renderObjects.map.push([]);
        for (var col = 0; col < renderPrefs.board.map.dims.w; col++) {
            renderObjects.map[row][col] = new Hex({
                row:row,
                col:col,
                hexsize:renderPrefs.board.hexsize,
                renderprefs:{
                    fillColor: colormap[row][col]
                },
                province: renderPrefs.board.map.tileMap[row][col].province
            });
            renderContainers.map.addChild(renderObjects.map[row][col].shape);
        }       
    }

    stage.update();
}
render.board.resize = function (canvasW, canvasH, hexsize){
    stage.canvas.width = canvasW;
    stage.canvas.height = canvasH;

    render.board.set.offset('center');

    if (hexsize === 'towindow') {
        if (renderPrefs.board.scalable)
            renderPrefs.board.hexsize = Math.floor(
                Math.min(
                    stage.canvas.width  / renderPrefs.board.map.dims.w,
                    stage.canvas.height / renderPrefs.board.map.dims.h
                ) / 1.75
            );
    } else renderPrefs.board.hexsize = hexsize;

    for (var row = 0; row < renderPrefs.board.map.dims.h; row++) {
        for (var col = 0; col < renderPrefs.board.map.dims.w; col++) {
                            renderObjects.map  [row][col].set.hexsize(renderPrefs.board.hexsize);
            if (debug.mode) renderObjects.debug[row][col].recalc();                        //----------- DEBUG
        }       
    }

    stage.update();
}

render.board.set = {};
render.board.set.offset = function (offset) {
    if (offset == 'center') {
        renderContainers.map.x = (stage.canvas.width  - (renderPrefs.board.map.dims.w - 0.5) * Math.sqrt(3)/2 * 2 * renderPrefs.board.hexsize) / 2;
        renderContainers.map.y = (stage.canvas.height - (renderPrefs.board.map.dims.h - 0.5) *          (3)/4 * 2 * renderPrefs.board.hexsize) / 2;
        
    } else {
        renderContainers.map.x = offset.x
        renderContainers.map.y = offset.y
    }
}
render.board.set.color = function (palette) {
    for (var row = 0; row < renderPrefs.board.map.dims.h; row++) {
        for (var col = 0; col < renderPrefs.board.map.dims.w; col++) {
            renderObjects.map[row][col].set.fillColor(
                renderPrefs.board.palette[renderPrefs.board.map[row][col].owner]
            );
        }       
    }
}

render.board.get = {};
render.board.get.offset = function () {
    return {
        x:renderContainers.map.x,
        y:renderContainers.map.y
    }
}

function Map(dims, players, seed) {
    this.dims = dims;

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

        // check if there are any more provinces left to fill, and if not, break.
        var emptycount = dims.h*dims.w;
        for (var row = 0; row < dims.h; row++) {
            for (var col = 0; col < dims.w; col++) {
                if (map[row][col] !== -1) emptycount-=1;
            }
        }
        if (emptycount == 0) break;
        debug.log(emptycount);
    }

    this.nProvinces = provinceID-1;
    this.tileMap = map;
}

function init() {
    //Create stage object - our root level container
    stage = new createjs.Stage("c");
    stage.canvas.width = window.innerWidth;
    stage.canvas.height = window.innerHeight;
    
    // generate map
    var map = new Map(board_dimensions,2);

    // Call the function to create the hex grid
    render.board.init(map);

    // resize means we have to rescale everything
    window.addEventListener('resize', function(e){    
        render.board.resize(window.innerWidth, window.innerHeight, 'towindow');
    }, false);

    // Display Debug statistics
    if (debug.mode) {
        renderContainers.debug = new createjs.Container();
        stage.addChild(renderContainers.debug)

        renderObjects.debug = [];
        for (var row = 0; row < renderPrefs.board.map.dims.h; row++) {
            renderObjects.debug.push([]);
            for (var col = 0; col < renderPrefs.board.map.dims.w; col++) {
                renderObjects.debug[row][col] = new debug.GridText(row, col, renderPrefs.board.hexsize);
                renderContainers.debug.addChild(renderObjects.debug[row][col].text);

                if (debug.mode === 'province') renderObjects.map[row][col].set.fillColor("rgba("
                    +0
                    +","+Math.floor(255*(row/renderPrefs.board.map.dims.h))
                    +","+Math.floor(255*(col/renderPrefs.board.map.dims.w))
                    +","+(renderObjects.map[row][col].province/renderPrefs.board.map.nProvinces)
                +")");
            }       
        }
        stage.update();
    }
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

function debugLog(message) { if (debug.mode) console.log(message); }