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
    var dims = dims;
    var provinces = [];
    var provinceID = 0;
    
    var tileMap = map;

    // Generate array of -1
    tileMap = Array.apply(null, Array(dims.h)).map(function(){
        return Array.apply(null, Array(dims.w)).map(Number.prototype.valueOf, -1)
    });

    // generate map using a seed, or random
    var seed = (seed!="")?seed:Math.random();
    seedRandom( (parseFloat(seed) == seed)?parseFloat(seed):strToLexNum(seed) );

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
                    if (row + dr < 0 || row + dr > dims.h-1) continue;
                    if (col + dc < 0 || col + dc > dims.w-1) continue;

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
        var emptycount = dims.h*dims.w;
        for (var row = 0; row < dims.h; row++) {
            for (var col = 0; col < dims.w; col++) {
                if (tileMap[row][col] !== -1) emptycount-=1;
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
            var currTile = tileMap[row][col];

            provinces[currTile.province].tiles.push({
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
                    var adjacentTile = tileMap[row + dr][col + dc];

                    if (adjacentTile.province !== currTile.province) {
                        provinces[currTile.province].bordering.push(adjacentTile.province);
                        provinces[adjacentTile.province].bordering.push(currTile.province);

                        provinces[currTile.province].bordering = uniq(
                            provinces[currTile.province].bordering
                        );
                        provinces[adjacentTile.province].bordering = uniq(
                            provinces[adjacentTile.province].bordering
                        );
                    }
                }
            }
        }
    }

    // assign owners to each province making sure there is a continuous landmass
    // be warned. trash code ahead.
    debug.log("Assigning province owners");
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
                    var row = provinces[someBorderProvince].tiles[tile].row;
                    var col = provinces[someBorderProvince].tiles[tile].col;
                    tileMap[row][col].owner = provinces[someBorderProvince].owner;
                }
            }
        }

        // we then chose a province from seen-provinces to continue the process untill full
        someProvince = seenProvinces[getRandomInt(0,seenProvinces.length-1)];

        // log % completion
        debug.log( Math.floor((seenProvinces.length / totalProvinces) / (2/3) * 100) );
    }


    // set object properties

    // given properties (for easy reference)
    this.dims = dims;
    this.seed = seed;

    // generated map
    this.provinces = provinces;
    this.tileMap = tileMap;
}











// 10/10 rendering engine, plz no fix
function createTable(tableData,pallete) {
  var table = document.createElement('table')
    , tableBody = document.createElement('tbody');

  tableData.forEach(function(rowData) {
    var row = document.createElement('tr');

    rowData.forEach(function(cellData) {
      var cell = document.createElement('td');
      cell.innerHTML = "<span style='background-color: "+pallete[cellData.owner]+"'>"+"&nbsp;&nbsp;&nbsp;"+"</span>";
      row.appendChild(cell);
    });

    tableBody.appendChild(row);
  });

  table.appendChild(tableBody);
  document.body.appendChild(table);
}

function render() {
    var pallete = generatePallete(4);
    createTable(map.tileMap, pallete);
    document.body.appendChild(document.createTextNode("Seed: " + map.seed));
}









var map;

function init() {
    var SEED = new Date().getTime();
    var SCALE = 20;
    var PLAYERS = 3;
    if (SCALE < 5 || SCALE =="" || !parseInt(SCALE)) SCALE = 15;
    
    var BOARD_DIMENSIONS = {w:3*SCALE,h:2*SCALE};

    // generate map
    map = new Map(BOARD_DIMENSIONS,PLAYERS,SEED);
    
    render();
}

window.onload = init;










// DEBUG
var debug = {
    on: true,
    log: function (message) {
        if (debug.on) console.log(message);
    }
}





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

// returns array without duplicates
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