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
    var ownerByHexMap = Array.apply(null, Array(dims.r)).map(function(){
        return Array.apply(null, Array(dims.c)).map(Number.prototype.valueOf, -1)
    });

    // Randomly place seeds for provinces around
    // Yep. This may result in an infinite loop
    // YOLO
    var BUFFER = 2;
    var assignedTiles = [];

    console.time("Begining initial map seeding");
    for (var i = 0; i < (dims.r*dims.c) / ((players+1)*(BUFFER*BUFFER + BUFFER)); i++) {
        while (true){
            // pick a random point on the board
            var randomR = Math.round(random()*(dims.r-1));
            var randomC = Math.round(random()*(dims.c-1));

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
                    if (randomR + dr < 0 || randomR + dr > dims.r-1) continue;
                    if (randomC + dc < 0 || randomC + dc > dims.c-1) continue;

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
                    id:provinceID,
                    troops: 1
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
        for (var row = 0; row < dims.r; row++) {
            oldmap.push([]);
            for (var col = 0; col < dims.c; col++) {
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
                    if (row + dr < 0 || row + dr > dims.r-1) continue;
                    if (col + dc < 0 || col + dc > dims.c-1) continue;

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
        var emptycount = dims.r*dims.c;
        for (var row = 0; row < dims.r; row++) {
            for (var col = 0; col < dims.c; col++) {
                if (ownerByHexMap[row][col] !== -1) emptycount-=1;
            }
        }
        if (emptycount == 0) break;
    }
    console.timeEnd("Growth by Iteration");

    // find out what hexes belong to what provinces, and also which provinces border one another
    console.time("Calculating interesting Province data");

    for (var y = 0; y < dims.r; y++) {
        for (var x = 0; x < dims.c; x++) {
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
                    y2 < 0 || y2 > dims.r-1 ||
                    x2 < 0 || x2 > dims.c-1
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

    // Contains useful info related to each player
    var player_info = {};
    for (var player = 1; player <= players; player++) {
        player_info[player] = {
            ownedPIDs:[],
            troops:0,
            reserves: 0
        }
    }

    if (HEURISTIC == 1) {
        // on a scale of 1-10, how "dense" should the map be?
        // By the way, this is suuuper vague, and it only starts to matter on larger maps. ish.
        // Like I said, *very* vague
        var DENSITY = 5;

        // Pick some arbitrary provinces
        //var startProvinces = getRandomSeededArrayOfInts(2 + Math.floor(provinces.length / (11 - DENSITY)),0,provinces.length);

        // Select provinces based on the corners on the map
        var startProvinces = [];
        for (var i = 0; i <= 3; i++) {
            for (var j = 0; j <= 3; j++) {
                startProvinces.push(ownerByHexMap
                    [Math.floor( (dims.r-1) / 3 * i )]
                    [Math.floor( (dims.c-1) / 3 * j )]
                );
            }
        }
        startProvinces = uniq(startProvinces);
        while (startProvinces.length > 10) {
            startProvinces.splice( getRandomSeededInt(0,startProvinces.length), 1 );
        }

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
                // if ( getRandomSeededInt(0,5) === 0 ) continue;

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
            var newOwner = (playerCounter++ % players) + 1;
            
            provinces[selectedPID].owner = newOwner;

            // While we are here, let's throw a random number of troops
            // onto the province. 
            // TODO:: Fix distribution to be, you know, FAIR?!

            // By default, each province has a single troop, with a max of 
            // 6, so for now, just add a random number of troops from 0-5
            // gg wp, good game balance 20/10
            var troops = getRandomSeededInt(1,7);
            provinces[selectedPID].troops = troops; 

            // Record this info for easier retrieval
            player_info[newOwner].ownedPIDs.push(selectedPID);
            player_info[newOwner].troops += troops;
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

    // The final province object
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
    this.player_info = player_info;
}

var GenGameData = function(BOARD_DIMENSIONS,PLAYERS,SEED) {
    // Generate map!
    var raw_map = new Map(BOARD_DIMENSIONS,PLAYERS,SEED);

    this.n_players   = PLAYERS;
    this.player_info = raw_map.player_info;

    this.seed        = SEED;
    this.dims        = raw_map.dims;

    this.provinces = raw_map.provinces;

    this.ownerByHexMap = raw_map.ownerByHexMap;

    this.turn = 1;
    this.current_player = 1;

    this.History = [];
}

var GameController = function (GameData) {
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

    var selectedPID = null;
    this.Input = {
        next_turn: function () {
            // Alias for easier code
            var player_info = thisGame.Data.player_info[thisGame.Data.current_player];

            // Give the player who just had his turn troops based
            // on the number of provinces they own
            var troop_to_assign = player_info.ownedPIDs.length + player_info.reserves;

            var assignable_PIDs = player_info.ownedPIDs.filter(function(PID){
                return (Utils.provinceFromPID(PID).troops < 6)
            });

            for (;troop_to_assign > 0; troop_to_assign--) {                
                if (assignable_PIDs.length == 0) {
                    player_info.reserves = troop_to_assign;
                    console.log(player_info.reserves);
                    break; 
                }

                var randomIndex = getRandomInt(0,assignable_PIDs.length);
                var PID = assignable_PIDs[randomIndex];
                var province = Utils.provinceFromPID(PID);

                province.troops++;

                Render.ReRender.province.troops(PID, province.troops);

                if (province.troops == 6) assignable_PIDs.splice(randomIndex,1);
            }
            

            // Update turn counter
            thisGame.Data.turn++;

            // update current player
            for (;;) {
                thisGame.Data.current_player++;
                if (thisGame.Data.current_player > thisGame.Data.n_players) thisGame.Data.current_player = 1;

                if (thisGame.Data.player_info[thisGame.Data.current_player].ownedPIDs.length == 0) thisGame.Data.current_player++;
                else break;
            }

            
            // Indicate whose turn it is
            Render.ReRender.current_turn.update(thisGame.Data.current_player);
        },
        province: {
            clicked: function (clickedPID) {
                var selectedP = Utils.provinceFromPID(selectedPID);
                var  clickedP = Utils.provinceFromPID( clickedPID);

                console.log(clickedP)

                if (selectedPID != clickedPID) {
                    // If selecting a province
                    if (selectedPID == null) {
                        // Is the player selecting a province he owns?
                        if (clickedP.owner != thisGame.Data.current_player) return;

                        // Can the province can even be selected for an attack?
                        // i.e, does it border any enemy provinces?
                        var noEnemyBorders = clickedP.bordering.every(function(borderPID){
                            return Utils.provinceFromPID(borderPID).owner === clickedP.owner;
                        });
                        if (noEnemyBorders) return;

                        // i.e does it have more than one troop?
                        if (clickedP.troops == 1) return;

                        selectedPID = clickedPID;
                        Render.ReRender.province.selected(clickedPID, true);
                    }

                    // If attacking...
                    else {
                        // First, we should check if user is aiming at himself
                        if (selectedP.owner == clickedP.owner) return;

                        // Check if there is a border b/w the two
                        var isBorder = selectedP.bordering.some(function(borderPID){
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
            var attackP = Utils.provinceFromPID(attackPID);
            var defendP = Utils.provinceFromPID(defendPID);

            var attacker = attackP.owner;
            var defender = defendP.owner;

            var attackPWR = 0;
            var defendPWR = 0;

            for (var i = 0; i < attackP.troops; i++) attackPWR += getRandomInt(1,7);
            for (var i = 0; i < defendP.troops; i++) defendPWR += getRandomInt(1,7);

            var success = attackPWR > defendPWR;

            success = 1;

            console.log("Attack: " + attackPWR);
            console.log("Defend: " + defendPWR);
            console.log("Victor: " + (success)?"Attacker":"Defender" );

            if (success) {                
                // Transfer ownership of the province to attacker
                defendP.owner = attacker;

                var attacker_info = thisGame.Data.player_info[attacker];
                var defender_info = thisGame.Data.player_info[defender];

                    // deletes province from defender, and appends it to attacker
                attacker_info.ownedPIDs.push(
                    defender_info.ownedPIDs.splice(defender_info.ownedPIDs.indexOf(defendPID), 1)[0]
                );

                // Attacker moves all soldiers except one to the new province
                defendP.troops = attackP.troops - 1;

                // One attacker soldier is left behind.
                attackP.troops = 1;

                // Rerender the two provinces
                Render.ReRender.province.post_attack(defendP);
                Render.ReRender.province.post_attack(attackP);

                // Record history
                History.addEvent("attack_success",{
                    attackPID: attackPID,
                    defendPID: defendPID,
                    attacker: attacker,
                    defender: defender
                })
            } else {
                // Attacker loses all soldiers except one in his province
                attackP.troops = 1;
                // Rerender
                Render.ReRender.province.post_attack(attackP);
            }

            // Deselect the attacker
            Render.ReRender.province.selected(attackPID, false);
            selectedPID = null;
        }
    }
}