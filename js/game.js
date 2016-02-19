// What properties should this map have?
// -------------------------------------
// dims - object with w and h
// ownerByHexMap - 2d array with each object being a object containing
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
    var ownerByHexMap = Array.apply(null, Array(dims.h)).map(function(){
        return Array.apply(null, Array(dims.w)).map(Number.prototype.valueOf, -1)
    });

    // Randomly place seeds for provinces around
    // Yep. This may result in an infinite loop
    // YOLO
    var BUFFER = 2;
    var assignedTiles = [];

    console.time("Begining initial map seeding");
    for (var i = 0; i < (dims.h*dims.w) / ((players+1)*(BUFFER*BUFFER + BUFFER)); i++) {
        while (true){
            // pick a random point on the board
            var randomR = Math.round(random()*(dims.h-1));
            var randomC = Math.round(random()*(dims.w-1));

            // check if we have visited this piece before, and if so, just continue
            var docontinue = false;
            for (var tile = 0; tile < assignedTiles.length; tile++) {
                if (assignedTiles[tile].row == randomR && assignedTiles[tile].col === randomC) {
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
                    if (ownerByHexMap[randomR + dr][randomC + dc] !== -1) {
                        areaconflict = true;
                        break;
                    }
                }
                if (areaconflict) break;
            }

            if (!areaconflict) {
                ownerByHexMap[randomR][randomC] = provinceID;

                provinces.push({
                    tiles:[[randomC,randomR]],
                    bordering:[],
                    owner:0,        // updated later
                    id:provinceID
                });

                provinceID++;

                assignedTiles.push({
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
        for (var row = 0; row < dims.h; row++) {
            oldmap.push([]);
            for (var col = 0; col < dims.w; col++) {
                oldmap[row][col] = ownerByHexMap[row][col];
            }
        }

        // iterate through all tiles until we run out of tiles to fill
        var currtiles = assignedTiles.length;
        for (var i = 0; i < currtiles; i++) {
            if (assignedTiles[i] == 0) continue;

            // for readability
            var row = assignedTiles[i].row;
            var col = assignedTiles[i].col;

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

                    // if the surrounding tile is empty, and a tile is lucky,
                    // then the tile gets some more land
                    if (oldAdjacentTile === -1 && random() < 0.25) {
                        // give land to that adjacent hex
                        ownerByHexMap[row + dr][col + dc] = ownerByHexMap[row][col]
                        
                        // push to internal tile array, as we now iterate through this tile too
                        assignedTiles.push({
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
                assignedTiles[i] == 0;
            }
        }

        // check if there are any more provinces left to fill, and if not, break.
        var emptycount = dims.h*dims.w;
        for (var row = 0; row < dims.h; row++) {
            for (var col = 0; col < dims.w; col++) {
                if (ownerByHexMap[row][col] !== -1) emptycount-=1;
            }
        }
        if (emptycount == 0) break;
    }
    console.timeEnd("Growth by Iteration");

    // find out what hexes belong to what provinces, and also which provinces border one another
    console.time("Calculating interesting Province data");

    for (var y = 0; y < dims.h; y++) {
        for (var x = 0; x < dims.w; x++) {
            // for readability
            var curTileOwner = ownerByHexMap[y][x];

            provinces[curTileOwner].tiles.push([x,y])

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
                    y2 < 0 || y2 > dims.h-1 ||
                    x2 < 0 || x2 > dims.w-1
                );
                if (!isOnEdgeOfBoard) {
                    // for readability
                    var adjTileOwner = ownerByHexMap[y2][x2];

                    if (adjTileOwner !== curTileOwner) {
                        provinces[curTileOwner].bordering.push(adjTileOwner);
                        provinces[adjTileOwner].bordering.push(curTileOwner);

                        provinces[curTileOwner].bordering = uniq(
                            provinces[curTileOwner].bordering
                        );
                        provinces[adjTileOwner].bordering = uniq(
                            provinces[adjTileOwner].bordering
                        );
                    }
                }
            };
        }
    }
    console.timeEnd("Calculating interesting Province data");

    // assign owners to each province making sure there is a continuous landmass

    console.time("Assigning province owners");

    // So, I decided to revisit this and try to make it better.

    // The original method I used was, well, gross.
    // It picked a random province as a "start" province, and then it randomly 
    // "grew" the province around itself, going on until the requested number
    // of provinces would be selected.

    // This algorithm led to "blobby" maps, where the growth would occur on
    // just one side of the map, leaving a lot of whitespace on the other end
    // Also, sometimes it didn't terminate, which is bad...

    // I've developed a new province assignment algorithm that should lead to
    // nicer maps, even if it is more processor intensive. 
    // In a nutshell, this algorithm works by picking multiple random "key"
    // provinces, and using a Graph traversal algorithm to find the paths
    // between them, and selecting provinces based on those paths.

    // It seems to create more "even" maps, and it also looks nicer in code.

    // I am going to leave both heuristics in the code for now, since they
    // each have their merits and their detriments.

    // By default though, I think i'm going to stick with the new Graph based one.

    var HEURISTIC = 1;

    if (HEURISTIC == 1) {
        // on a scale of 1-10, how "dense" should the map be?
        // By the way, this is suuuper vague, and it only starts to matter on larger maps. ish.
        // Like I said, *very* vague
        var DENSITY = 5

        // Pick some arbitrary provinces
        var startProvinces = getRandomSeededArrayOfInts(2 + Math.floor(provinces.length / (11 - DENSITY)),0,provinces.length);

        // NOTE:
        // The startProvinces choice could be improved by selecting provinces based on map location
        // i.e using the tilemap to select provinces at various key points on the map

        // Using magical graph algorithms, we can find the shortest paths between them!
        // First, we have to generate a "map" object that the graph algo can work nicely with:
        var graph_map = {};
        provinces.forEach(function(province){
            graph_map[province.id] = {};
            province.bordering.forEach(function(borderPID){
                graph_map[province.id][borderPID] = 1;
            })
        })

        // Next, throw that map into Graph
        var province_graph = new Graph(graph_map);

        // Now, we let the graph algoritm do it's work ;)
        var shortestPaths = [];
        for (var i = 0; i < startProvinces.length; i++) {
            for (var j = i+1; j < startProvinces.length; j++) {
                // let's add some randomness, for giggles
                if ( getRandomSeededInt(0,5) === 0 ) continue;

                shortestPaths.push(
                    province_graph.findShortestPath(startProvinces[i], startProvinces[j])
                        .map(function(x){ return parseInt(x) })
                );
            }
        }

        // concat all of these paths into one huge list of provinces
        var selected_provinces = [].concat.apply([], shortestPaths);
        // let's make it unique
        selected_provinces = uniq(selected_provinces)
        
        // Finally, let's assign a player to each province
        var playerCounter = 0; // needed to give each player correct ammount of land
        selected_provinces.forEach(function(selectedPID){
            provinces[selectedPID].owner = (playerCounter++ % players) + 1;
        });
    }
    else if (HEURISTIC == 0) {
        var totalProvinces = provinces.length;

        var playerCounter = 0; // needed to give each player correct ammount of land

        var someProvince = getRandomSeededInt(0,totalProvinces); // get a random start province

        var seenProvinces = [someProvince]; // add that province to the list of seen provinces
        var MAX_ITER = 10000;
        while (seenProvinces.length < totalProvinces*2/3) { // we want to fill up 2/3 of the board
            if (!MAX_ITER--) exit();
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
                }
            }

            // we then chose a province from seen-provinces to continue the process untill full
            someProvince = seenProvinces[getRandomSeededInt(0,seenProvinces.length-1)];

            // log % completion
            // console.log( Math.floor((seenProvinces.length / totalProvinces) / (2/3) * 100) );
        }
    };

    console.timeEnd("Assigning province owners");

    console.time("Creating object of selected provinces");

    var provinces_obj = {};

    provinces.forEach(function(province){
        // Remove any borderPID's that belong to provinces that have no owner
        province.bordering = province.bordering.filter(function(borderPID){
            return !(provinces[borderPID].owner == 0)
        })

        // Discard provinces that are not owned by anyone
        if (province.owner !== 0) 
            provinces_obj[province.id] = province;
    })


    console.timeEnd("Creating object of selected provinces");

    console.log("\n");
    console.timeEnd("Total Map Generation Time");


    // --------------------- MAP OBJECT CREATION --------------------- //

    // now that the map has been generated, actually give
    // this object the map properties

    // generated map
    this.provinces = provinces_obj;
    this.ownerByHexMap = ownerByHexMap;
    this.dims = dims;
}

var GenGameData = function(BOARD_DIMENSIONS,PLAYERS,SEED) {
    // Generate map!
    var raw_map = new Map(BOARD_DIMENSIONS,PLAYERS,SEED);

    this.n_players   = PLAYERS;

    this.seed        = SEED;
    this.dims        = raw_map.dims;

    this.provinces = raw_map.provinces;

    this.ownerByHexMap = raw_map.ownerByHexMap;

    this.History = [];
}

var Game = function (GameData) {
    var thisGame = this;

    this.Data = GameData;

    // We store a move history, both for loading, and also for (later to be implemented) replays
    var History = {
        addEvent:function(eventType, data) {
            thisGame.Data.History.push({
                event: eventType,
                data: data
            })
        }
    }

    var Utils = {
        provinceFromPID: function (PID) {
            return thisGame.Data.provinces[PID];
        } 
    }

    // DEBUG STUFF
        this.GET_SELECTED_PROVINCE = function () { return selectedPID; }

    var selectedPID = null;
    this.Input = {
        province: {
            clicked: function (clickedPID) {
                if (selectedPID != clickedPID) {
                    // If selecting a province
                    if (selectedPID == null) {
                        // Let's sanity check and see if the province can even be selected for an attack:
                        var notSelectable = Utils.provinceFromPID(clickedPID).bordering.every(function(borderPID){
                            return Utils.provinceFromPID(borderPID).owner === Utils.provinceFromPID(clickedPID).owner;
                        });

                        if (notSelectable) return;

                        selectedPID = clickedPID;
                        Render.ReRender.province.selected(clickedPID, true);
                    }

                    // If attacking...
                    else {
                        // First, we should check if user is aiming at himself
                        if (Utils.provinceFromPID(selectedPID).owner == Utils.provinceFromPID(clickedPID).owner) return;

                        // Check if there is a border b/w the two
                        var isBorder = Utils.provinceFromPID(selectedPID).bordering.some(function(borderPID){
                            return borderPID == clickedPID;
                        });

                        if (isBorder) Moves.attack(selectedPID, clickedPID);
                    }
                }

                // Deselect province if it's the same province is clicked twice
                else if (selectedPID == clickedPID) {
                    selectedPID = null;
                    Render.ReRender.province.selected(clickedPID, false);
                }
            }
        }
    }

    var Moves = {
        attack:function (attackPID, defendPID) {
            // what we should be doing is checking the number of soldiers each
            // person has stationed at the province, but becuase I am lazy,
            // I'm not going to implement that now, and instead, outcomes
            // will be randomly chosen by dice roll

            var RandomNum = 4 // Decided fairly by Dice Roll

            var success = !!Math.floor(RandomNum*10) % 2;

            if (success) {
                // Defender loses all soldiers stationed in that province
                    // Code
                // Transfer ownership of the province to attacker
                Utils.provinceFromPID(defendPID).owner = Utils.provinceFromPID(attackPID).owner;

                // Attacker moves all soldiers except one to the new province
                    // Code
                // One attacker soldier is left behind.
                    // Code

                // Rerender the two provinces
                    // Province one rerender
                Render.ReRender.province.owner(defendPID, Utils.provinceFromPID(defendPID).owner);

                // Record history
                History.addEvent("attack_success",{
                    attackPID: attackPID,
                    defendPID: defendPID,
                    attacker: Utils.provinceFromPID(attackPID).owner,
                    defender: Utils.provinceFromPID(defendPID).owner
                })
            } else {
                // Attacker loses all soldiers except one in his province
                    // Code
                // Rerender
                    // Code
            }

            // Deselect the attacker
            Render.ReRender.province.selected(attackPID, false);
            selectedPID = null;
        }
    }
}