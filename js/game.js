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

    // Sanity Checks
    if (players < 2) throw new Error("Invalid number of player");

    // Stuff
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

    console.time("Begining initial map seeding");
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
    console.timeEnd("Begining initial map seeding");


    console.time("Growth by Iteration");

    // grow seeds by iterating
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
    }
    console.timeEnd("Growth by Iteration");

    // find out what hexes belong to what provinces, and also which provinces border one another
    console.time("Enumerating Provinces");

    for (var y = 0; y < tileMap.dims.h; y++) {
        for (var x = 0; x < tileMap.dims.w; x++) {
            // for readability
            var curTile = tileMap[y][x];

            provinces[curTile.province].tiles.push([x,y])

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
    console.timeEnd("Enumerating Provinces");

    // assign owners to each province making sure there is a continuous landmass
    // be warned. trash code ahead.
    console.time("Assigning province owners");

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
        // console.log( Math.floor((seenProvinces.length / totalProvinces) / (2/3) * 100) );
    }
    console.timeEnd("Assigning province owners");

    console.log("\n");
    console.timeEnd("Total Map Generation Time");


    // --------------------- MAP OBJECT CREATION --------------------- //

    // now that the map has been generated, actually give
    // this object the map properties

    // given properties (for easy reference)
    this.n_players = players;
    this.seed = seed;

    // generated map
    this.provinces = provinces;
    this.tileMap = tileMap;
}

var Game = new function() {
    var selectedProvinceID = -1;
    
    // DEBUG STUFF
        this.GET_SELECTED_PROVINCE = function () { return selectedProvinceID; }

    this.Input = {
        province: {
            clicked: function (clickedProvinceID) {
                if (selectedProvinceID != clickedProvinceID) {
                    // If selecting a province
                    if (selectedProvinceID == -1) {
                        selectedProvinceID = clickedProvinceID;
                        Render.ReRender.province.color(clickedProvinceID, getRandomColor());
                    }

                    // If attacking...
                }

                // Deselect province if it's the same province is clicked twice
                else if (selectedProvinceID == clickedProvinceID) {
                    selectedProvinceID = -1;
                    Render.ReRender.province.owner(clickedProvinceID, map.provinces[clickedProvinceID].owner);
                }
            }
        }
    }

    function attack (attackerProvinceID, defenderProvinceID) {

    }
}