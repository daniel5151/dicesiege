// (function(){

// DEBUG
var debug = {
    on: true,
    log: function (message) {
        if (debug.on) console.log(message);
    },
    time: function (label) {
        if (debug.on) console.time(label);
    },
    timeEnd: function (label) {
        if (debug.on) console.timeEnd(label);
    }
}

function getHexesSurrounding(x, y) {
    var surroundingHexes = [0,0,0,0,0,0];

    var tilePos = 0;
    // For the row above, at, and beneath the current tile
    for (var dy = -1; dy <= 1; dy++) {
        
        // Which tiles need to be checked in a row depends on
        // if the row is even or oddly numbered, or if the row
        // being checked is the same row that the tile rests on

        var dx_range = [];
        if      (dy == 0)    dx_range = [-1, 1];  // Same Row as tile
        else if (y % 2 == 1) dx_range = [ 0, 1];  // Row is an Odd Row
        else if (y % 2 == 0) dx_range = [-1, 0];  // Row is an Even row
        
        // Fianlly, we can iterate through each of the tiles surrounding the tile
        for (var dx = dx_range[0] ; dx <= dx_range[1] ; dx++, tilePos++) {
            // Check if we are at the current tile
            if (dy == 0 && dx == 0) { tilePos--; continue; } 

            // Get that nice circular order
            if (tilePos == 0 || tilePos == 1) surroundingHexes[tilePos] = [y + dy, x + dx];
            if (tilePos == 3)                 surroundingHexes[2]       = [y + dy, x + dx];
            if (tilePos == 5)                 surroundingHexes[3]       = [y + dy, x + dx];
            if (tilePos == 4)                 surroundingHexes[4]       = [y + dy, x + dx];
            if (tilePos == 2)                 surroundingHexes[5]       = [y + dy, x + dx];

        }
    }

    return surroundingHexes;
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

    // --------------------- MAP INITIALIZATION --------------------- //

    console.time("Total Map Generation Time");

    var provinces = [];
    var provinceID = 0;


    // generate map using a seed, or random
    var seed = (seed!="")?seed:Math.random();
    seedRandom( (parseFloat(seed) == seed)?parseFloat(seed):strToLexNum(seed) );

    // Generate array of -1
    var tileMap = Array.apply(null, Array(dims.h)).map(function(){
        return Array.apply(null, Array(dims.w)).map(Number.prototype.valueOf, -1)
    });
    tileMap.dims = dims;

    // Randomly place seeds for provinces around
    // Yep. This may result in an infinite loop
    // YOLO
    var BUFFER = 2;
    var tiles = [];

    debug.time("Begining initial map seeding");
    for (var i = 0; i < (tileMap.dims.h*tileMap.dims.w) / ((players+1)*(BUFFER*BUFFER + BUFFER)); i++) {
        while (true){
            // pick a random point on the board
            var randomR = Math.round(random()*(tileMap.dims.h-1));
            var randomC = Math.round(random()*(tileMap.dims.w-1));

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
                    if (randomR + dr < 0 || randomR + dr > tileMap.dims.h-1) continue;
                    if (randomC + dc < 0 || randomC + dc > tileMap.dims.w-1) continue;

                    // if there is a tile that is non--1 around a piece, then there is an area conflict.
                    if (tileMap[randomR + dr][randomC + dc] !== -1) {
                        areaconflict = true;
                        break;
                    }
                }
                if (areaconflict) break;
            }

            if (!areaconflict) {
                tileMap[randomR][randomC] = {
                    owner:0,                            // we assign owners later on
                    province: provinceID++
                };

                provinces.push({
                    tiles:[[randomC,randomR]],
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
    debug.timeEnd("Begining initial map seeding");


    debug.time("Growth by Iteration");

    // grow seeds by iterating
        // var MAX_ITER = 6;
        // while (--MAX_ITER){
    while (true) {
        // clone map
        var oldmap = [];
        for (var row = 0; row < tileMap.dims.h; row++) {
            oldmap.push([]);
            for (var col = 0; col < tileMap.dims.w; col++) {
                oldmap[row][col] = tileMap[row][col];
            }
        }

        // iterate through all tiles until we run out of tiles to fill
        var currtiles = tiles.length;
        for (var i = 0; i < currtiles; i++) {
            if (tiles[i] == 0) continue;

            // for readability
            var row = tiles[i].row;
            var col = tiles[i].col;
            var currTile = tileMap[row][col];

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
                    if (row + dr < 0 || row + dr > tileMap.dims.h-1) continue;
                    if (col + dc < 0 || col + dc > tileMap.dims.w-1) continue;

                    // for readability 
                    var oldAdjacentTile =  oldmap[row + dr][col + dc];
                    var newAdjacentTile = tileMap[row + dr][col + dc];

                    // if the surrounding tile is empty, and a tile is lucky,
                    // then the tile gets some more land
                    if (oldAdjacentTile === -1 && random() < 0.25) {
                        // give land to that adjacent hex
                        tileMap[row + dr][col + dc] = {
                            owner: 0,
                            province: tileMap[row][col].province
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
        var emptycount = tileMap.dims.h*tileMap.dims.w;
        for (var row = 0; row < tileMap.dims.h; row++) {
            for (var col = 0; col < tileMap.dims.w; col++) {
                if (tileMap[row][col] !== -1) emptycount-=1;
            }
        }
        if (emptycount == 0) break;
        // debug.log(emptycount);
    }
    debug.timeEnd("Growth by Iteration");

    // find out what hexes belong to what provinces, and also which provinces border one another
    debug.time("Enumerating Provinces");

    for (var y = 0; y < tileMap.dims.h; y++) {
        for (var x = 0; x < tileMap.dims.w; x++) {
            // for readability
            var curTile = tileMap[y][x];

            provinces[curTile.province].tiles.push([x,y])

            var surroundingHexes = getHexesSurrounding(x,y);
            for (var side = 0; side < 6; side++) {
                if (!surroundingHexes[side]) continue;
                var y2 = surroundingHexes[side][0];
                var x2 = surroundingHexes[side][1];

                // Check if the tile being referenced is on the outside of the board
                var isOnEdgeOfBoard = (
                    y2 < 0 || y2 > tileMap.dims.h-1 ||
                    x2 < 0 || x2 > tileMap.dims.w-1
                );
                if (!isOnEdgeOfBoard) {
                    // for readability
                    var adjTile = tileMap[y2][x2];

                    if (adjTile.province !== curTile.province) {
                        provinces[curTile.province].bordering.push(adjTile.province);
                        provinces[adjTile.province].bordering.push(curTile.province);

                        provinces[curTile.province].bordering = uniq(
                            provinces[curTile.province].bordering
                        );
                        provinces[adjTile.province].bordering = uniq(
                            provinces[adjTile.province].bordering
                        );
                    }
                }
            };
        }
    }
    debug.timeEnd("Enumerating Provinces");

    // assign owners to each province making sure there is a continuous landmass
    // be warned. trash code ahead.
    debug.time("Assigning province owners");

    var totalProvinces = provinces.length;

    var playerCounter = 0; // needed to give each player correct ammount of land

    var someProvince = getRandomInt(0,totalProvinces); // get a random start province

    var seenProvinces = [someProvince]; // add that province to the list of seen provinces
    while (seenProvinces.length < totalProvinces*2/3) { // we want to fill up 2/3 of the board
        // get a list of all provinces bordering the currecnt province
        var currentBorderProvinces = provinces[someProvince].bordering;

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
                provinces[someBorderProvince].owner = (playerCounter++ % players) + 1;

                // set province owner
                for (var tile = 0; tile < provinces[someBorderProvince].tiles.length; tile++) {
                    var row = provinces[someBorderProvince].tiles[tile][1];
                    var col = provinces[someBorderProvince].tiles[tile][0];
                    tileMap[row][col].owner = provinces[someBorderProvince].owner;
                }
            }
        }

        // we then chose a province from seen-provinces to continue the process untill full
        someProvince = seenProvinces[getRandomInt(0,seenProvinces.length-1)];

        // log % completion
        // debug.log( Math.floor((seenProvinces.length / totalProvinces) / (2/3) * 100) );
    }
    debug.timeEnd("Assigning province owners");

    debug.log("\n");
    debug.timeEnd("Total Map Generation Time");


    // --------------------- MAP OBJECT CREATION --------------------- //

    // now that the map has been generated, actually give
    // this object the map properties

    // given properties (for easy reference)

    this.seed = seed;

    // generated map
    this.provinces = provinces;
    this.tileMap = tileMap;
}









/*
10/10 best rendering engine ever, tables are god tru konfirmed
*/

function TableRender() {
    var pallete = generatePallete(3);
    pallete.unshift("white");

    var table = document.createElement('table')
    var tableBody = document.createElement('tbody');

    map.tileMap.forEach(function(rowData) {
        var row = document.createElement('tr');

        rowData.forEach(function(cellData) {
            var cell = document.createElement('td');
            cell.innerHTML = "<span style='background-color: "+pallete[cellData.owner]+"'>"+"&nbsp;&nbsp;&nbsp;&nbsp;"+"</span>";
            row.appendChild(cell);
        });

        tableBody.appendChild(row);
    });

    table.appendChild(tableBody);
    document.body.appendChild(table);

    document.body.appendChild(document.createTextNode("Seed: " + map.seed));
}










function generatePallete(numColors) {
    var palette= [];
    for (var color = 0; color < numColors; color++) {
        palette.push(getRandomColor());
    }
    return palette;
}

var Render = new function () {
    /*
        PRIVATE METHODS
    */

    // ---- ESSENTIAL ELEMENTS ---- //
    var elem = document.getElementById('board');
    var two = new Two({
        fullscreen:true,
        // type:Two.Types.webgl,
        // type:Two.Types.canvas,
        // width: 285,
        // height: 200
    }).appendTo(elem);

    // ---- SHARED ASSETS ---- //
    var pallete = generatePallete(3);
    pallete.unshift("white");

    // ---- BOARD VARS ---- //

    // This value actually doesn't matter...
    // Just keep it big enough so that floating point arithmetic
    // doesn't strat fucking with the Hull algorithm
    var hexradius = 10;
    
    // Useful values
    var HexW = hexradius * Math.cos(Math.PI / 6);
    var HexH = hexradius * Math.sin(Math.PI / 6);

    // ---- ACTUAL RENDERING METHODS ---- //

    // PRIMITIVES
    var Primitives = {
        Circle:function(props){
            var x         = props.x         || 10;
            var y         = props.y         || 10;
            var r         = props.r         || 10;

            var fill      = props.fill      || "orangered";
            var stroke    = props.stroke    || "black";
            var linewidth = props.linewidth || 2;

            var circle = two.makeCircle(x, y, r);

            circle.fill = fill;
            circle.stroke = stroke;
            circle.linewidth = linewidth;

            two.update();

            circle.onclick = function (f) {
                if (two.type !== Two.Types.svg) return;
                this._renderer.elem.addEventListener('click', f);
            }


            return circle;
        },
        Rect:function() {
            var rect = two.makeRectangle(213, 100, 100, 100);

            rect.fill = 'rgb(0, 200, 255)';
            rect.opacity = 0.75;
            rect.noStroke();

            two.update();

            return rect;
        },
        Path:function (props) {
            var points    = props.points    || [[100,100],[100,200],[200,200],[200,100]];

            var fill      = props.fill      || "orangered";
            var stroke    = props.stroke    || "black";
            var linewidth = props.linewidth || 1;

            var noStroke  = props.noStroke  || false;
            var noFill    = props.noFill    || false;

            var anchoredPoints = [];
            for (var i = 0; i < points.length; i++) {
                anchoredPoints.push(new Two.Anchor(
                    points[i][0], 
                    points[i][1], 
                    0, 0, 0, 0, 
                    ((i == 0)
                        ? Two.Commands.move
                        : Two.Commands.line
                    )
                ));
            };

            this.path = two.makePath(anchoredPoints, false);

            if (noStroke) linewidth = 0;
            if (noFill)   fill = "rgba(0,0,0,0)";

            this.path.linewidth = linewidth;
            this.path.stroke = stroke;
            this.path.fill = fill;

            two.update();

            var self = this;
            this.onclick = function (f) {
                if (two.type !== Two.Types.svg) return;
                self.path._renderer.elem.addEventListener('click', function (e) {
                    f(e,self);
                });
            }
        }
    };

    // ---- GAME OBJECTS ---- //
    var GameObjects = {
        Province:function (props) {
            var provinceID = props.id;

            this.provinceID = provinceID;

            // Label some important things
            var province = map.provinces[provinceID];
            var tiles    = province.tiles;

            // This is the end goal.
            // We need to populate this array with the path for the province shape!
            var province_points = [];

            // Let's do work for each tile!
            for (var i = 0; i < tiles.length; i++) {
                var x = tiles[i][0];
                var y = tiles[i][1];

                // calculate coordinates of each corner
                var corners = Utils.getHexCorners(x,y)

                for (var corner in corners) {
                    // DIRTY FLOATING POINT PRECISION BULLSHIT
                            corners[corner][0] += 100;
                            corners[corner][1] += 100;
                    // DIRTY FLOATING POINT PRECISION BULLSHIT
                    
                    province_points.push(corners[corner]);
                }

                //Shit tier rendering 4 da testing b0ss
                    // var self = this;
                    // new Primitives.Path({
                    //     points:corners,
                    //     fill:pallete[province.owner+1]
                    // }).onclick(function(e){
                    //     debug.log(self.provinceID)
                    // });
                //Shit tier rendering 4 da testing b0ss
            }

            // Magic. MAGIC. MAAAGGGGIIIICCCC
            province_points = hull(province_points, Math.sqrt(HexW*HexW + HexH*HexH)*1.1 )
            province_points = province_points.slice(0,-1);
            // Why slice? Because hull returns an array whose first element and last element are equal. lel
            
            // DIRTY FLOATING POINT PRECISION BULLSHIT
                for (var i = 0; i < province_points.length; i++) {
                    province_points[i][0]-=100;
                    province_points[i][1]-=100;
                }
            // DIRTY FLOATING POINT PRECISION BULLSHIT

            this.Primitives = new Primitives.Path({
                points:    province_points,
                fill:      pallete[province.owner],
                linewidth: hexradius/10
            })


            var self = this;
            this.Primitives.onclick(function(e,primitive){
                debug.log(self);
                self.Primitives.path.fill = getRandomColor();
                two.update();
            });
        }
    }

    // ---- UTILITY FUNCTIONS ---- //
    var Utils = {
        getHexCorners: function(x,y) {
            // complicated b/c needs to account for odd rows
            var xc = HexW * (y % 2 + 1) + 2 * HexW * x; 
            var yc = hexradius * (1 + 1.5 * y);

            /*
            The indices of each corner are...

                     [1]    
                                
                     / \
                   /  |  \
            [0]  /   HexH  \  [2]
                |     |     |
                |-----c     |
                | HexW      |
            [5]  \         /  [3]
                   \     /
                     \ /
              
                     [4]
            */

            // calculate coordinates of each corner
            var corners = [
                [ xc - HexW , yc - HexH     ],
                [ xc        , yc - HexH * 2 ],
                [ xc + HexW , yc - HexH     ],
                [ xc + HexW , yc + HexH     ],
                [ xc        , yc + HexH * 2 ],
                [ xc - HexW , yc + HexH     ]
            ];

            return corners;
        }
    }

    /*
        PUBLIC METHODS
    */

    this.rendered_objects = {}; // Tracks individual shapes
    this.rendered_groups = {};  // Tracks rendering groups

    this.resize = function () {
        debug.time("Resizing Board");

        // ---------------------- BOARD ---------------------- //
        HexW = hexradius * Math.cos(Math.PI / 6);
        HexH = hexradius * Math.sin(Math.PI / 6);

        var BaseBoardW = (HexW * (map.tileMap.dims.w * 2 + 1) );
        var BaseBoardH = (HexH * (map.tileMap.dims.h * 3    ) );

        var scale = Math.min(
            two.width  / BaseBoardW * 0.975,    // 0.975 is a nice padding value
            two.height / BaseBoardH * 0.975
        )

        var ScaledBoardW = BaseBoardW * scale;
        var ScaledBoardH = BaseBoardH * scale;

        Render.rendered_groups["board"].scale = scale;
        Render.rendered_groups["board"].translation.set(
            (two.width  - ScaledBoardW) / 2,
            (two.height - ScaledBoardH) / 2
        );

        two.update();

        debug.timeEnd("Resizing Board");
    }

    this.init = function () {
        debug.time("Rendering Board");

            Render.rendered_objects["board"] = {};

            // Render individual provinces
            Render.rendered_objects.board["provinces"] = [];
            for (var id = 0; id < map.provinces.length; id++) {
                if (map.provinces[id].owner == 0) continue;
                Render.rendered_objects.board.provinces.push( new GameObjects.Province({id:id}) );
            }

            // Render board outline
            var outlinePoints = [];
            for (var x = 0; x < map.tileMap.dims.w; x++) {
                for (var y = 0; y < map.tileMap.dims.h; y++) {
                    // TODO: Add some if statement to skip internal tiles

                    // calculate coordinates of each corner
                    var corners = Utils.getHexCorners(x,y)

                    for (var corner in corners) {
                        // DIRTY FLOATING POINT PRECISION BULLSHIT
                                corners[corner][0] += 100;
                                corners[corner][1] += 100;
                        // DIRTY FLOATING POINT PRECISION BULLSHIT
                        
                        outlinePoints.push(corners[corner]);
                    }
                }
            }

            // Magic. MAGIC. MAAAGGGGIIIICCCC
            outlinePoints = hull(outlinePoints, Math.sqrt(HexW*HexW + HexH*HexH)*1.1 )
            outlinePoints = outlinePoints.slice(0,-1);
            // Why slice? Because hull returns an array whose first element and last element are equal. lel
            
            // DIRTY FLOATING POINT PRECISION BULLSHIT
                for (var i = 0; i < outlinePoints.length; i++) {
                    outlinePoints[i][0]-=100;
                    outlinePoints[i][1]-=100;
                }
            // DIRTY FLOATING POINT PRECISION BULLSHIT

            Render.rendered_objects.board["outline"] = new Primitives.Path({
                points: outlinePoints,
                noFill: true,
                linewidth: hexradius/10
            })

            // Group rendered provinces into an easy to manage Group
            Render.rendered_groups["board"] = two.makeGroup();
            
            Render.rendered_groups["board"].add(Render.rendered_objects.board.outline.path);
            for (var i = 0; i < Render.rendered_objects.board.provinces.length; i++) {
                Render.rendered_groups["board"].add(Render.rendered_objects.board.provinces[i].Primitives.path);
            }

            // Attach event handlers
            window.onresize = this.resize;
        debug.timeEnd("Rendering Board");
        


        // Render everyhting!
        this.resize();
    };
};


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
























// MAGIC
var seed = 1;
function seedRandom(s) { seed = s; return seed; }
function random() {
    var x = Math.sin(seed++) * 10000;
    return x - Math.floor(x);
}


function getRandomInt(min, max) {
    return Math.floor(random() * (max - min)) + min;
}


function getRandomColor() {
    var letters = '0123456789ABCDEF'.split('');
    var color = '#';
    for (var i = 0; i < 6; i++ ) {
        color += letters[Math.floor(Math.random() * 16)];
    }
    return color;
}


function uniq(a) {
    // returns array without duplicates
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


function exit( status ) {
    // http://kevin.vanzonneveld.net
    // +   original by: Brett Zamir (http://brettz9.blogspot.com)
    // +      input by: Paul
    // +   bugfixed by: Hyam Singer (http://www.impact-computing.com/)
    // +   improved by: Philip Peterson
    // +   bugfixed by: Brett Zamir (http://brettz9.blogspot.com)
    // %        note 1: Should be considered expirimental. Please comment on this function.
    // *     example 1: exit();
    // *     returns 1: null

    var i;

    if (typeof status === 'string') {
        alert(status);
    }

    window.addEventListener('error', function (e) {e.preventDefault();e.stopPropagation();}, false);

    var handlers = [
        'copy', 'cut', 'paste',
        'beforeunload', 'blur', 'change', 'click', 'contextmenu', 'dblclick', 'focus',
        'keydown', 'keypress', 'keyup', 'mousedown', 'mousemove', 'mouseout', 'mouseover', 
        'resize', 'scroll', 'DOMNodeInserted', 'DOMNodeRemoved', 'DOMNodeRemovedFromDocument', 
        'DOMNodeInsertedIntoDocument', 'DOMAttrModified', 'DOMCharacterDataModified', 
        'DOMElementNameChanged', 'DOMAttributeNameChanged', 'DOMActivate', 'DOMFocusIn', 
        'DOMFocusOut', 'online', 'offline', 'textInput', 'abort', 'close', 'dragdrop', 
        'paint', 'reset', 'select', 'submit', 'unload', 'mouseup', 'load', 
    ];

    function stopPropagation (e) {
        e.stopPropagation();
        // e.preventDefault(); // Stop for the form controls, etc., too?
    }
    for (i=0; i < handlers.length; i++) {
        window.addEventListener(handlers[i], function (e) {stopPropagation(e);}, true);
    }

    if (window.stop) {
        window.stop();
    }

    throw '';
}

// })();