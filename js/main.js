// Global vars
var stage;
var map;

var SCALE = 20;

var BOARD_DIMENSIONS = {w:3*SCALE,h:2*SCALE};
var SEED = undefined;
var PLAYERS = 3;

var debug = {
    mode:{
        province  :false,  // don't use together
        cords     :false,  // don't use together
        colorfull :false,
        log       :true ,
        seed      :true
    },
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

        if (debug.mode.cords) this.text = new createjs.Text(
            row + "," + col,
            hexsize/2.5 + "px Courier", 
            "black"
        );
        if (debug.mode.province) this.text = new createjs.Text(
            map.tileMap[row][col].province, 
            hexsize/2.5 + "px Courier",
            "black"
        );

        var offset = render.board.get.offset();

        this.text.x            = offset.x + x - hexsize/1.5;
        this.text.y            = offset.y + y;
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

            self.text.x = offset.x + x - renderPrefs.board.hexsize/1.5;
            self.text.y = offset.y + y;

            self.text.font = renderPrefs.board.hexsize/2.5 + "px Courier";
        };
    },
    log:function(message) {
        if (debug.mode.log) console.log(message);
    }
}

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
    // hexsize:10,
    // offset:{x:10,y:10},
    scalable:true,
    palette:generatePallete(PLAYERS+1), // random for now
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
render.board.shapes = {};
render.board.shapes.Hex = function (props) {
    var self = this;

    // create createJS shape
    this.shape = new createjs.Shape;

    // Co-ordinates on grid are saved for later reference
    this.row = props.row;
    this.col = props.col;

    this.recalcSizeAndPos = function (hexsize) {
        // calculate hex dims based on size
        this.hexW = Math.sqrt(3)/2 * 2 * hexsize;
        this.hexH =          (3)/4 * 2 * hexsize;

        // get co-ordinates of hex on canvas based on size and pos on grid
                               this.shape.y = this.row * this.hexH;
        if (this.row % 2 == 0) this.shape.x = this.col * this.hexW;
        else                   this.shape.x = this.col * this.hexW + 1/2* this.hexW;

        // calculate co-ordinates of edges
        var edgePoints = [
            { y: - hexsize/2, x: - this.hexW/2}, // upper left
            { y: - hexsize  , x: - 0          }, // top
            { y: - hexsize/2, x: + this.hexW/2}, // upper right
            { y: + hexsize/2, x: + this.hexW/2}, // lower right
            { y: + hexsize  , x: - 0          }, // bottom
            { y: + hexsize/2, x: - this.hexW/2}, // lower left
        ];

        // Edge indexes are for the following border cases:
        // [0] -- up-left
        // [1] -- up-right
        // [2] -- left
        // [3] -- right
        // [4] -- down-left
        // [5] -- down-right

        this.edgeLines = [
            {s:edgePoints[0], e:edgePoints[1]},
            {s:edgePoints[1], e:edgePoints[2]},
            {s:edgePoints[0], e:edgePoints[5]},
            {s:edgePoints[2], e:edgePoints[3]},
            {s:edgePoints[5], e:edgePoints[4]},
            {s:edgePoints[3], e:edgePoints[4]} 
        ];
    }

    this.recalcSizeAndPos(props.hexsize);

    // we save command references so we can change the properies
    // of the createJS object without having to reinitialize
    // the entire rendering queue each time

    // First, we define the commands that render the hexagon.
    // This step is row-col independant, so we just write it as
    // static declaration.
    this.renderCommands = {
        // Render the shape. This is position invariant
        beginFill: this.shape.graphics.beginFill(
                ("rgb("
                    +150
                    +","+Math.floor(255*(this.row/map.dims.h))
                    +","+Math.floor(255*(this.col/map.dims.w))
                +")")
            ).command,
        drawPolyStar: this.shape.graphics.drawPolyStar(
                0,0,
                props.hexsize+1, // +1 for no outline
                6,0,30
            ).command
    }
    this.shape.graphics
        .endFill();

    // Now, we define the commands that render the borders of the
    // province.
    this.renderCommands.borderStrokeStyle = this.shape.graphics.setStrokeStyle(
        Math.floor(props.hexsize/10), 'round'
    ).command
    this.renderCommands.borderStroke = this.shape.graphics.beginStroke(
        ("rgba(0,0,0,1)")
    ).command;

    // add custom colors preferences form initialization
    if (props.colors) {
        for (var prop in props.colors) {
            this.renderCommands[prop].style = props.colors[prop];
        }
    }

    // check tiles directly next to tile
    this.renderCommands.borders = [0,0,0,0,0,0];
    var tileNo = 0;
    for (var dr = -1; dr <= 1; dr++) {
        var range = [0,0];
        if (dr == 0) { 
            range = [-1,1];
        } else if (this.row % 2 == 1) { // odd row
            range = [0,1];
        } else if (this.row % 2 == 0) { // even row
            range = [-1,0];
        }
        for (var dc = range[0] ; dc <= range[1] ; dc++, tileNo++) {
            if (dr == 0 && dc == 0) { tileNo--; continue; }

            // Check if tile is on the outside of the board
            var isOnEdgeOfBoard = 
                (this.row + dr < 0 || this.row + dr > map.dims.h-1
              || this.col + dc < 0 || this.col + dc > map.dims.w-1)
            
            // if we have a OUB situation, we don't want to referece the other tile
            if (!isOnEdgeOfBoard) {
            var isBorderingOtherProvince = 
                (map.tileMap[this.row+dr][this.col+dc].province 
             !== map.tileMap[this.row   ][this.col   ].province)

            if (map.tileMap[this.row   ][this.col   ].owner == 0) continue;
            if (map.tileMap[this.row+dr][this.col+dc].owner == 0) continue;
            }


            if (isOnEdgeOfBoard || isBorderingOtherProvince) {
                this.renderCommands.borders[tileNo]={
                    moveTo:this.shape.graphics.moveTo(
                        this.edgeLines[tileNo].s.x,
                        this.edgeLines[tileNo].s.y
                    ).command,
                    lineTo:this.shape.graphics.lineTo(
                        this.edgeLines[tileNo].e.x,
                        this.edgeLines[tileNo].e.y
                    ).command
                };
            }
        }
    }

    this.shape.graphics
        .endStroke();
    
    // make helper function to change props
    this.set = {};
    this.get = {};

    this.set.strokeColor = function (color)   { self.renderCommands.beginStroke.style = color; }
    this.set.fillColor   = function (color)   { self.renderCommands.beginFill.style = color;   }
    this.set.hexsize     = function (hexsize) { 
        self.recalcSizeAndPos(hexsize)
        self.renderCommands.drawPolyStar.radius = hexsize+1;
        self.renderCommands.borderStrokeStyle.width = Math.floor(hexsize/10);

        for (var border = 0; border < 6; border++) { 
            if (self.renderCommands.borders[border] != 0) {
                self.renderCommands.borders[border].moveTo.x = self.edgeLines[border].s.x;
                self.renderCommands.borders[border].moveTo.y = self.edgeLines[border].s.y;
                self.renderCommands.borders[border].lineTo.x = self.edgeLines[border].e.x;
                self.renderCommands.borders[border].lineTo.y = self.edgeLines[border].e.y;
            }
        }
    }

    this.get.strokeColor = function ()        { return self.renderCommands.beginStroke.style; }
    this.get.fillColor   = function ()        { return self.renderCommands.beginFill.style;   }

    // get clicks
    this.shape.addEventListener("click", function(event) {
        // alert(map.tileMap[self.row][self.col].owner);
        render.board.set.provinceColorByColor(map.tileMap[self.row][self.col].province, getRandomColor());
        stage.update();
    })
}

render.board.init = function (map) {
    // check to see if there is already a board, and if there is, start freshhhh
    if (renderContainers.map) { stage.removeChildAt(0); }

    // make a new createJS conatiner for the map-tiles
    renderContainers.map = new createjs.Container();
    // add the map container to the scene
    stage.addChild(renderContainers.map);

    // if there is no given hexsize, fallback to scaling
    if (!renderPrefs.board.hexsize) {
        renderPrefs.board.hexsize = Math.floor(
            Math.min(
                stage.canvas.width  / map.dims.w,
                stage.canvas.height / map.dims.h
            ) / 1.75
        )
    }

    // if there is no given offset, fallback to center positioning
    if (!renderPrefs.board.offset) render.board.set.offset('center');

    // populate the renderContainers.map container with hexes, and keep track of the hexes in mapObjects
    renderObjects.map = [];
    for (var row = 0; row < map.dims.h; row++) {
        renderObjects.map.push([]);
        for (var col = 0; col < map.dims.w; col++) {
            renderObjects.map[row][col] = new render.board.shapes.Hex({
                row:row,
                col:col,
                hexsize:renderPrefs.board.hexsize,
                // colors:{borderStroke:"green"},
                province: map.tileMap[row][col].province
            });
            renderContainers.map.addChild(renderObjects.map[row][col].shape);
        }       
    }

    for (var i = 0; i < map.provinces.length; i++) {
        render.board.set.provinceColorByOwner(i);
    }

    stage.update();
}

// board setters and getters
render.board.set = {};
// changes boards top-left offset
render.board.set.offset = function (offset) {
    if (offset == 'center') {
        renderContainers.map.x = (
            stage.canvas.width 
            - (map.dims.w - 0.5) * Math.sqrt(3)/2 * 2 * renderPrefs.board.hexsize) / 2;
        renderContainers.map.y = (
            stage.canvas.height 
            - (map.dims.h - 0.5) *          (3)/4 * 2 * renderPrefs.board.hexsize) / 2;
        
    } else {
        renderContainers.map.x = offset.x
        renderContainers.map.y = offset.y
    }
}
// recolors board with new pallete
render.board.set.pallete = function (palette) {
    renderPrefs.board.palette = palette;
    for (var row = 0; row < map.dims.h; row++) {
        for (var col = 0; col < map.dims.w; col++) {
            renderObjects.map[row][col].set.fillColor(
                palette[map.tileMap[row][col].owner]
            );
        }
    }
}
// to be used directly when coloring province pre attack
render.board.set.provinceColorByColor = function (province, color) {
    for (var tile = 0; tile < map.provinces[province].tiles.length; tile++) {
        var row = map.provinces[province].tiles[tile].row;
        var col = map.provinces[province].tiles[tile].col;
        renderObjects.map[row][col].set.fillColor(color);
    }
}
// should be called after province changes hands
render.board.set.provinceColorByOwner = function (province) {
    render.board.set.provinceColorByColor(province, renderPrefs.board.palette[map.provinces[province].owner])
}

render.board.get = {};
render.board.get.offset = function () {
    return {
        x:renderContainers.map.x,
        y:renderContainers.map.y
    }
}

// update functions
render.board.update = {};
// resizes board to screen
render.board.update.resize = function (canvasW, canvasH, hexsize){
    stage.canvas.width = canvasW;
    stage.canvas.height = canvasH;

    render.board.set.offset('center');

    if (hexsize === 'towindow') {
        if (renderPrefs.board.scalable)
            renderPrefs.board.hexsize = Math.floor(
                Math.min(
                    stage.canvas.width  / map.dims.w,
                    stage.canvas.height / map.dims.h
                ) / 1.75
            );
    } else renderPrefs.board.hexsize = hexsize;

    for (var row = 0; row < map.dims.h; row++) {
        for (var col = 0; col < map.dims.w; col++) {
                renderObjects.map[row][col].set.hexsize(renderPrefs.board.hexsize);
            if (debug.mode.cords || debug.mode.province) 
                renderObjects.debug[row][col].recalc();                        //----------- DEBUG
        }       
    }
    stage.update();
}

// What properties should this map have?
// -------------------------------------
// dims - object with w and h
// tileMap - 2d array with each object being a object containing
//      owner of the province
//      province it belongs to
// provinces - object with subproperties pertaining to each province                      
//      each province subobject will have properites
//          tiles - a array of {row:row, col:col} for each tile that is in the porvince
//          bordering - a array of provinces that border this province

function Map(dims, players, seed) {
    this.dims = dims;
    
    this.provinces = [];
    provinceID = 0;
    
    this.tileMap = map;

    // Generate array of -1
    this.tileMap = Array.apply(null, Array(dims.h)).map(function(){
        return Array.apply(null, Array(dims.w)).map(Number.prototype.valueOf, -1)
    });

    // generate map using a seed, or random
    this.seed = (seed!="")?seed:Math.random();
    seedRandom( (parseFloat(this.seed) == this.seed)?parseFloat(this.seed):strToLexNum(this.seed) );

    // Randomly place seeds for provinces around
    // Yep. This may result in an infinite loop
    // YOLO
    var BUFFER = 2;
    var tiles = [];

    debug.log("Begining initial map seeding");
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
                    if (this.tileMap[randomR + dr][randomC + dc] !== -1) {
                        areaconflict = true;
                        break;
                    }
                }
                if (areaconflict) break;
            }

            if (!areaconflict) {
                this.tileMap[randomR][randomC] = {
                    owner:0,                            // we assign owners later on
                    province: provinceID++
                };

                this.provinces.push({
                    tiles:[{
                        row:randomR,
                        col:randomC
                    }],
                    bordering:[],
                    owner:0        // updated later 
                });

                tiles.push({
                    row:randomR,
                    col:randomC
                });
                break;
            }
        }
    }

    // grow seeds by iterating
        // var MAX_ITER = 6;
        // while (--MAX_ITER){
    debug.log("Begining Growth by Iteration");
    while (true) {
        // clone map
        var oldmap = [];
        for (var row = 0; row < dims.h; row++) {
            oldmap.push([]);
            for (var col = 0; col < dims.w; col++) {
                oldmap[row][col] = this.tileMap[row][col];
            }
        }

        // iterate through all tiles until we run out of tiles to fill
        var currtiles = tiles.length;
        for (var i = 0; i < currtiles; i++) {
            if (tiles[i] == 0) continue;

            // for readability
            var row = tiles[i].row;
            var col = tiles[i].col;
            var currTile = this.tileMap[row][col];

            // we want to keep track of how many empty tiles the tile is bordering
            // because if we have no empty borders, then we should stop iterating
            // through this tile
            var numNonEmptyBordering = 0;

            // check tiles directly next to tile
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
                    // do't do unneccesary self comparison
                    if (dr == 0 && dc == 0) continue;

                    // Check Out of Bounds
                    if (row + dr < 0 || row + dr > dims.h-1) continue;
                    if (col + dc < 0 || col + dc > dims.w-1) continue;

                    // for readability 
                    var oldAdjacentTile =       oldmap[row + dr][col + dc];
                    var newAdjacentTile = this.tileMap[row + dr][col + dc];

                    // if the surrounding tile is empty, and a tile is lucky,
                    // then the tile gets some more land
                    if (oldAdjacentTile === -1 && random() < 0.25) {
                        // give land to that adjacent hex
                        this.tileMap[row + dr][col + dc] = {
                            owner: 0,
                            province: this.tileMap[row][col].province
                        };
                        
                        // push to internal tile array, as we now iterate through this tile too
                        tiles.push({
                            row:row + dr,
                            col:col + dc
                        });

                    } else if (oldAdjacentTile !== -1) {
                        numNonEmptyBordering++;
                    }
                }
            }
            // we can remove the tile from the iteration queue if it cannot grow any more
            if (numNonEmptyBordering >= 6) {
                tiles[i] == 0;
            }
        }

        // check if there are any more provinces left to fill, and if not, break.
        var emptycount = dims.h*dims.w;
        for (var row = 0; row < dims.h; row++) {
            for (var col = 0; col < dims.w; col++) {
                if (this.tileMap[row][col] !== -1) emptycount-=1;
            }
        }
        if (emptycount == 0) break;
        debug.log(emptycount);
    }
    // find out what hexes belong to what provinces, and also which provinces border one another
    debug.log("Enumerating Provinces");
    for (var row = 0; row < dims.h; row++) {
        for (var col = 0; col < dims.w; col++) {
            // for readability
            var currTile = this.tileMap[row][col];

            this.provinces[currTile.province].tiles.push({
                row:row,
                col:col
            })

            // check tiles directly next to tile
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
                    // don't do unneccesary self comparison
                    if (dr == 0 && dc == 0) continue;

                    // Check Out of Bounds
                    if (row + dr < 0 || row + dr > dims.h-1) continue;
                    if (col + dc < 0 || col + dc > dims.w-1) continue;

                    // for readability 
                    var adjacentTile = this.tileMap[row + dr][col + dc];

                    if (adjacentTile.province !== currTile.province) {
                        this.provinces[currTile.province].bordering.push(adjacentTile.province);
                        this.provinces[adjacentTile.province].bordering.push(currTile.province);

                        this.provinces[currTile.province].bordering = uniq(
                            this.provinces[currTile.province].bordering
                        );
                        this.provinces[adjacentTile.province].bordering = uniq(
                            this.provinces[adjacentTile.province].bordering
                        );
                    }
                }
            }
        }
    }

    var self = this;

    this.set = {};
    this.set.provinceOwner = function(province, owner) {
        for (var tile = 0; tile < self.provinces[province].tiles.length; tile++) {
            var row = self.provinces[province].tiles[tile].row;
            var col = self.provinces[province].tiles[tile].col;
            self.tileMap[row][col].owner = owner;
        }
    }

    // assign owners to each province making sure there is a continuous landmass
    debug.log("Assigning province owners");
    var totalProvinces = this.provinces.length;

    var playerCounter = 0; // needed to give each player correct ammount of land

    var someProvince = getRandomInt(0,totalProvinces); // get a random start province

    var seenProvinces = [someProvince]; // add that province to the list of seen provinces
    while (seenProvinces.length < totalProvinces*2/3) { // we want to fill up 2/3 of the board
        // get a list of all provinces bordering the currecnt province
        var currentBorderProvinces = this.provinces[someProvince].bordering;

        // for each of the provinces that border out currently province
        for (var i = 0; i < currentBorderProvinces.length; i++) {
            // we make a readbility varialbe of that current province
            var someBorderProvince = currentBorderProvinces[i];

            // check if we have already set it's value
            var doPush = true;
            for (var j = 0; j < seenProvinces.length; j++) {
                if (seenProvinces[j] == someBorderProvince) doPush = false;
            }
            if (doPush  && random() < 0.25) { // if we have not, we push it to the seen array and update it's owner info
                seenProvinces.push(someBorderProvince);
                this.provinces[someBorderProvince].owner = (playerCounter++ % players) + 1;
                this.set.provinceOwner(someBorderProvince, this.provinces[someBorderProvince].owner);
            }
        }

        // we then chose a province from seen-provinces to continue the process untill full
        someProvince = seenProvinces[getRandomInt(0,seenProvinces.length-1)];

        // log % completion
        debug.log(  Math.floor((seenProvinces.length / totalProvinces) / (2/3) * 100)  );
    }
}

function init() {
    //Create stage object - our root level container
    stage = new createjs.Stage("c");
    stage.canvas.width = window.innerWidth;
    stage.canvas.height = window.innerHeight;

    var SEED = prompt("Enter Seed Value (nothing for random): ");
    
    // generate map
    map = new Map(BOARD_DIMENSIONS,PLAYERS,SEED);

    // Call the function to create the hex grid
    render.board.init(map);

    // resize means we have to rescale everything
    window.addEventListener('resize', function(e){    
        render.board.update.resize(window.innerWidth, window.innerHeight, 'towindow');
    }, false);

    // Display Debug statistics
    if (debug.mode) {
        renderContainers.debug = new createjs.Container();
        stage.addChild(renderContainers.debug)

        renderObjects.debug = [];
        for (var row = 0; row < map.dims.h; row++) {
            renderObjects.debug.push([]);
            for (var col = 0; col < map.dims.w; col++) {
                
                if (debug.mode.cords || debug.mode.province) {
                    renderObjects.debug[row][col] = new debug.GridText(row, col, renderPrefs.board.hexsize);
                    renderContainers.debug.addChild(renderObjects.debug[row][col].text);
                }

                if (debug.mode.colorfull && map.tileMap[row][col].owner)
                renderObjects.map[row][col].set.fillColor("rgba("
                    +0
                    +","+Math.floor(255*(row/map.dims.h))
                    +","+Math.floor(255*(col/map.dims.w))
                    +","+(map.tileMap[row][col].province/map.provinces.length)
                +")");
            }       
        }
        if (debug.mode.seed) {
            renderObjects.seed = new createjs.Text(
                "Seed: "+map.seed, 
                "24px Courier",
                "black"
            );

            renderObjects.seed.x            = 10;
            renderObjects.seed.y            = 24;
            renderObjects.seed.textBaseline = "alphabetic";

            stage.addChild(renderObjects.seed);
        }

        stage.update();
    }
}

window.onload = init;
















// UTILS
var seed = 1;
function seedRandom(s) { seed = s; return seed; }
function random() {
    var x = Math.sin(seed++) * 10000;
    return x - Math.floor(x);
}
function getRandomInt(min, max) {
    return Math.floor(random() * (max - min)) + min;
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
function getRandomColor() {
    var letters = '0123456789ABCDEF'.split('');
    var color = '#';
    for (var i = 0; i < 6; i++ ) {
        color += letters[Math.floor(Math.random() * 16)];
    }
    return color;
}
function generatePallete(numColors) {
    var palette = ['white'];
    for (var color = 0; color < numColors-1; color++) {
        palette.push(getRandomColor());
    }
    return palette;
}

function uniq(a) {
    var seen = {};
    var out = [];
    var len = a.length;
    var j = 0;
    for(var i = 0; i < len; i++) {
         var item = a[i];
         if(seen[item] !== 1) {
               seen[item] = 1;
               out[j++] = item;
         }
    }
    return out;
}

function strToLexNum(str) {
    var sum = 0;
    for (var i = 0; i < str.length; i++) {
      sum += str.charCodeAt(i);
    }
    return sum;
}