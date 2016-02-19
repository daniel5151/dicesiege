/*
10/10 best rendering engine ever, tables are god tru konfirmed
*/

function TableRender() {
    var pallete = generatePallete(3);
    pallete.unshift("white");

    var table = document.createElement('table')
    var tableBody = document.createElement('tbody');

    map.ownerByHexMap.forEach(function(rowData) {
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



// But seriosuly tho, here is the acutal renderer

var Renderer = function (Game) {
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
    var pallete;

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
        Circle:function(two, props){
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

            return circle;
        },
        Rect:function(two, props) {
            var x         = props.x || 100;
            var y         = props.y || 100;
            var w         = props.w || 100;
            var h         = props.h || 100;

            var fill      = props.fill      || "white";
            var stroke    = props.stroke    || "black";
            var linewidth = props.linewidth || 2;

            this.two_rect = two.makeRectangle(x, y, w, h);

            this.two_rect.fill      = fill;
            this.two_rect.stroke    = stroke;
            this.two_rect.linewidth = linewidth;

            two.update();
        },
        Text:function(two, props) {
            var text       = props.text      || "LOL POOP" 

            var x          = props.x         || 100;
            var y          = props.y         || 100;

            var color      = props.color     || "black"
            var font_size  = props.font_size || 12;
            var font       = props.font      || "monospace"
            var alignment  = props.alignment || "center"

            var text_obj = two.makeText(text, x, y, {
                fill: color,
                size: font_size,
                family: font,
                alignment: alignment
            });

            this.two_text = two.makeGroup();

            // Now, we extend Two.js's text rendering system with some *flavor* ;)

            // First, we add a "bounding box" rectangle so we can do neat stuff
            if (props.bounding_box !== undefined) {
                // This is a pretty finicky bounding box calculation, but it will do for now
                var bounding_box = two.makeRoundedRectangle(x, y-1, font_size*(text.toString().length*0.6)+5, font_size+5, 5);

                var fill      = props.bounding_box.fill      || "rgba(255,255,255,0.75)";
                var stroke    = props.bounding_box.stroke    || "black";
                var linewidth = props.bounding_box.linewidth || 1;

                bounding_box.fill      = fill     
                bounding_box.stroke    = stroke   
                bounding_box.linewidth = linewidth

                this.two_text.add(bounding_box);
            }

            this.two_text.add(text_obj);


            two.update();

            // Next, we make it so that we can add custom CSS classes to our Text object
            // This is mainly for setting the cursor to default when hovering over the text
            var self = this;
            this.updateClassList = function () {
                if ( two.type === Two.Types.svg && props.classes !== undefined) {
                    var elem = self.two_text._renderer.elem
                    for (var i = 0; i < props.classes.length; i++) {
                        elem.classList.add(props.classes[i]);
                    }
                }
            }

            // Lastly, magical touch event handlers ngggghhhhhhhnggg
            this.addEventListener = function (event, f, preventDefault) {
                if (two.type !== Two.Types.svg) return;

                self.two_text._renderer.elem.addEventListener(event, f, preventDefault);
            }
        },
        Path:function (two, props) {
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

            this.two_path = two.makePath(anchoredPoints, false);

            if (noStroke) linewidth = 0;
            if (noFill)   fill = "rgba(0,0,0,0)";

            this.two_path.linewidth = linewidth;
            this.two_path.stroke = stroke;
            this.two_path.fill = fill;

            two.update();

            var self = this;
            this.addEventListener = function (event, f, preventDefault) {
                if (two.type !== Two.Types.svg) return;

                self.two_path._renderer.elem.addEventListener(event, f, preventDefault);
            }
        }
    };

    // ---- GAME OBJECTS ---- //
    var GameObjects = {
        ProvinceOutline:function () {
            /* OUTLINE */
            var outlinePoints = [];
            for (var x = 0; x < Game.Data.dims.w; x++) {
                for (var y = 0; y < Game.Data.dims.h; y++) {
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
            
            // DIRTY FLOATING POINT PRECISION BULLSHIT
            outlinePoints = outlinePoints.map(function (pt) {
                return [
                    pt[0] - 100, 
                    pt[1] - 100
                ];
            })
            // DIRTY FLOATING POINT PRECISION BULLSHIT

            var outline = r_objects["board"]["outline"] = new Primitives.Path(two,{
                points: outlinePoints,
                noFill: true,
                linewidth: hexradius/10
            });

            this.two_path = outline.two_path;
        },
        Province:function (props) {
            var provinceID = props.id;

            this.provinceID = provinceID;

            // Label some important things
            var province = Game.Data.provinces[provinceID];
            var tiles    = province.tiles;

            // This is the end goal.
            // We need to populate this array with the two_path for the province shape!
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
                    // new Primitives.Path(two,{
                    //     points:corners,
                    //     fill:pallete[province.owner+1]
                    // }).addEventListener(function(e){
                    //     console.log(self.provinceID)
                    // });
                //Shit tier rendering 4 da testing b0ss
            }

            // Magic. MAGIC. MAAAGGGGIIIICCCC
            province_points = hull(province_points, Math.sqrt(HexW*HexW + HexH*HexH)*1.1 )
            province_points = province_points.slice(0,-1);
            // Why slice? Because hull returns an array whose first element and last element are equal. lel
            
            // DIRTY FLOATING POINT PRECISION BULLSHIT
            province_points = province_points.map(function (pt) {
                return [
                    pt[0] - 100, 
                    pt[1] - 100
                ];
            })
            // DIRTY FLOATING POINT PRECISION BULLSHIT

            // Keep a record of all this math we did
            this.province_points = province_points;

            // Render me!
            this.PathPrimitive = new Primitives.Path(two,{
                points:    province_points,
                fill:      pallete[province.owner],
                linewidth: hexradius/10,
            })

            // Alright! Now that the province base is done, let's add the other stuff!

            // For now, we will jsut display a string with some debug info

            // This centroid function is MAGIC
            var centroid = get_polygon_centroid(province_points);
            var textX = centroid[0];
            var textY = centroid[1];

            this.TextPrimitive = new Primitives.Text(two,{
                x: textX,
                y: textY,
                text: provinceID,
                classes:["province-text"],
                bounding_box: true
            });








            var self = this;
            this.addEventListener = function(event, f, preventDefault) {
                self.PathPrimitive.addEventListener(event, f, preventDefault);
                self.TextPrimitive.addEventListener(event, f, preventDefault);
            }
        }
    }

    // ---- UTILITY FUNCTIONS ---- //
    var Utils = {
        generatePallete: function(numColors) {
            var palette= [];
            for (var color = 0; color < numColors; color++) {
                palette.push(getRandomColor());
            }
            return palette;
        },
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
        },
        getPathFromPID: function (provinceID) {
            return r_objects.board.provinces[provinceID].PathPrimitive.two_path;
        }
    }


    var animationQueue = {};
    two.bind("update", function(framecount){
        for (var anim in animationQueue) {
            animationQueue[anim](framecount);
        };
    }).play();

    this.GET_ANIMATION_QUEUE = function() { return animationQueue };



    /*
        PUBLIC METHODS
    */

    // ---- RERENDERING METHODS ---- //
    // NOTE: I initialize it with both `var` and with `this` so that I can use it
    //       publically, while also not having to write this.ReRender everytime I
    //       want to use one of these functions internally.
    var ReRender = {
        resize: function () {
            console.time("Resizing Board");

            // ---------------------- BOARD ---------------------- //
            HexW = hexradius * Math.cos(Math.PI / 6);
            HexH = hexradius * Math.sin(Math.PI / 6);

            var BaseBoardW = (HexW * (Game.Data.dims.w * 2 + 1) );
            var BaseBoardH = (HexH * (Game.Data.dims.h * 3    ) );

            var scale = Math.min(
                two.width  / BaseBoardW * 0.975,    // 0.975 is a nice padding value
                two.height / BaseBoardH * 0.975
            )

            var ScaledBoardW = BaseBoardW * scale;
            var ScaledBoardH = BaseBoardH * scale;

            r_groups["board"].scale = scale;
            r_groups["board"].translation.set(
                (two.width  - ScaledBoardW) / 2,
                (two.height - ScaledBoardH) / 2
            );

            two.update();

            console.timeEnd("Resizing Board");
        },
        province: {
            color: function (provinceID, color, suppressUpdate) {
                Utils.getPathFromPID(provinceID).fill = color;
                if (!suppressUpdate) two.update();
            },
            owner: function (provinceID, owner, suppressUpdate) {
                Utils.getPathFromPID(provinceID).fill = pallete[owner];
                if (!suppressUpdate) two.update();
            },
            selected: function (provinceID, selected) {
                if (selected) {
                    var percent = 0;
                    var goingUp = true;
                    animationQueue[provinceID] = function(framecount){
                        if (percent > 1) goingUp = false;
                        if (percent < 0) goingUp = true;

                        if (goingUp) percent += 0.05;
                        else         percent -= 0.05;

                        var provinceColorArray = hex2rgb(pallete[Game.Data.provinces[provinceID].owner]);

                        var color1 = provinceColorArray.map(function(x){ return x += (255-x)/3; });
                        var color2 = provinceColorArray

                        var fillColor = "rgb("+pickHex(color1, color2, percent).join()+")";

                        ReRender.province.color(provinceID, fillColor, true);
                    };
                } else {
                    delete animationQueue[provinceID];

                    ReRender.province.owner(provinceID, Game.Data.provinces[provinceID].owner, true);
                }


                two.update();
            }
        }
    };
    this.ReRender = ReRender;

    var r_objects = {};  // Tracks individual shapes
    var r_groups = {};   // Tracks rendering groups

    // DEBUG STUFF
        // Exposes internal objects to the outside world
        this.GET_RENDERED_OBJECTS = function () { return r_objects; }
        this.GET_RENDERED_GROUPS  = function () { return r_groups;  }


    this.init = function () {
        // ------ SHARED ASSETS ------ //
        pallete = Utils.generatePallete(Game.Data.n_players);
        pallete.unshift("white");

        /* z-ordering, the shitty way ^TM */
        r_groups["foregrounds"] = {};
        r_groups["backgrounds"] = {};

        // ---------- BOARD ---------- //
        console.time("Total Board Rendering Time");

        // -- Object Generation -- //

        r_objects["board"] = {};

        /* PROVINCES */
        r_objects["board"]["provinces"] = {};
        for (var id in Game.Data.provinces) {
            r_objects["board"]["provinces"][id] = new GameObjects.Province({id:id});
        }

        /* OUTLINE */
        r_objects["board"]["outline"] = new GameObjects.ProvinceOutline();

        // -- Object Grouping -- //

        /* Board Rendering Group */
        r_groups["board"] = two.makeGroup();

        // Add outline first. This should always stay underneath everything
        r_groups["board"]
            .add(r_objects["board"]["outline"].two_path);

        // Make a background level for the board
        r_groups["backgrounds"]["board"] = two.makeGroup();
        r_groups["board"]
            .add(r_groups["backgrounds"]["board"]);
        
        // Add provinces
        for (var province in r_objects["board"]["provinces"]) {
            r_groups["board"].add(
                r_objects["board"]["provinces"][province].PathPrimitive.two_path,
                r_objects["board"]["provinces"][province].TextPrimitive.two_text
            );

            r_objects["board"]["provinces"][province].TextPrimitive.updateClassList();
        }

        // Make a foreground level for the board
        r_groups["foregrounds"]["board"] = two.makeGroup();
        r_groups["board"]
            .add(r_groups["foregrounds"]["board"]);

        // Push all of the province text to the foreground (so it doesn't clip behind provinces)
        for (var province in r_objects["board"]["provinces"]) {
            r_groups["foregrounds"]["board"]
                .add(r_objects["board"]["provinces"][province].TextPrimitive.two_text);
        }

        console.timeEnd("Total Board Rendering Time");
        


        // ---------- UI ---------- //
        r_objects["ui"] = {};
        r_objects["ui"]["seed"] = new Primitives.Text(two, {
            x:120,
            y:20,
            text:"Seed: " + Game.Data.seed,
            font_size: 20,
            classes:["selectable-text"],
            bounding_box: true
        });
        r_objects["ui"]["seed"].updateClassList();

        // Render everything!
        ReRender.resize();

        // Attach event handlers
        initEventHandlers();
    };

    function initEventHandlers() {
        two.bind("resize", ReRender.resize);

        /*
            ZOOMING AND PANNING
        */

        // This is magic. Bless ZUI
        zui = new ZUI(two, r_groups["board"]);

        // Why does this fix things? Good question!
        zui.surfaceMatrix = r_groups["board"]._matrix
        
        zui.addLimits(0.75, 8);

        // Useful label
        var $stage = r_groups["board"]._renderer.elem;

        // Key Variables
        var prevX = -1;
        var prevY = -1;

        var startX = -1;
        var startY = -1;
        CLICK_THRESHOLD = 10; // Arbitrary number lol

        var clickNoDrag = false;

        var scaling = false;

        // ---------- MOUSE ---------- // 
        function MouseWheelHandler (e) {
            e.stopPropagation();
            e.preventDefault();

            var dy = (e.wheelDeltaY || - e.deltaY) / 1000;

            zui.zoomBy(dy, e.clientX, e.clientY);

            two.update()

            return false;
        }
        $stage.addEventListener("mousewheel", MouseWheelHandler, false);
        $stage.addEventListener("DOMMouseScroll", MouseWheelHandler, false);

        $stage.addEventListener("mousedown", function(e) {
            prevX = startX = e.pageX;
            prevY = startY = e.pageY;

            clickNoDrag = true;
        });
        document.addEventListener("mousemove", function(e) {
            if (prevX == -1 && prevY == -1) return;

            if (Math.abs(e.pageX - startX) + Math.abs(e.pageY - startY) > CLICK_THRESHOLD)
                clickNoDrag = false;

            zui.translateSurface(
                -(prevX - e.pageX),
                -(prevY - e.pageY)
            )

            prevX = e.pageX;
            prevY = e.pageY;

            // Why? Dunno. But it fixes things.
            zui.zoomBy( ((Math.random()>0.5)?0.000000001:-0.000000001), e.clientX, e.clientY);
            two.update();

        });
        document.addEventListener("mouseup", function(e) {
            prevX = -1;
            prevY = -1;
        });



        // ---------- TOUCH ---------- // 
        $stage.addEventListener("touchstart", function(e) {
            prevX = startX = e.targetTouches[0].pageX;
            prevY = startY = e.targetTouches[0].pageY;

            if(e.touches.length == 2) { scaling = true; }

            clickNoDrag = true;
        });
        document.addEventListener("touchmove", function(e) {
            if (!scaling) {
                if (prevX == -1 && prevY == -1) return;

                if (Math.abs(e.pageX - startX) + Math.abs(e.pageY - startY) > CLICK_THRESHOLD)
                    clickNoDrag = false;

                zui.translateSurface(
                    -(prevX - e.targetTouches[0].pageX),
                    -(prevY - e.targetTouches[0].pageY)
                )

                prevX = e.targetTouches[0].pageX;
                prevY = e.targetTouches[0].pageY;

                // Why? Dunno. But it fixes things.
                zui.zoomBy( ((Math.random()>0.5)?0.000000001:-0.000000001), 0,0);
                two.update();
            }

            if (scaling && e.touches.length == 2) {
                var newDist = (Math.sqrt(
                    (e.touches[0].pageX-e.touches[1].pageX) * (e.touches[0].pageX-e.touches[1].pageX) +
                    (e.touches[0].pageY-e.touches[1].pageY) * (e.touches[0].pageY-e.touches[1].pageY))
                );

                // prevDist = newDist;

                zui.zoomSet(newDist/100, e.touches[0].clientX, e.touches[0].clientY);

                two.update()
            }
        });
        document.addEventListener("touchend", function(e) {
            prevX = -1;
            prevY = -1;

            if (scaling) scaling = false;
        });


        /*
            PROVINCES
        */

        // If we are using a non SVG renderer, we gotta do some sneaky beaky stuff to get clicking working

        // TOO BAD I DIDN'T IMPLEMENT THIS FULLY LOL
        // It doesn't account for Zoom and Pan.
        // That's going to be a biiiiiitch.

        if (two.type !== Two.Types.svg) {
            document.addEventListener("click", function(e){
                for (var province in r_objects["board"]["provinces"]) {
                    (function(province_obj){

                        var isClicked = inside_polygon(
                            [
                                (e.pageX - r_groups["board"].translation._x) / r_groups["board"].scale, 
                                (e.pageY - r_groups["board"].translation._y) / r_groups["board"].scale
                            ], 
                            province_obj.province_points
                        );

                        if (clickNoDrag && isClicked) {
                            Game.Input.province.clicked(province_obj.provinceID);
                            console.log(province_obj.provinceID)
                        }

                    })(r_objects["board"]["provinces"][province])
                }
            })
        }


        for (var province in r_objects["board"]["provinces"]) {
            (function(province_obj){
                // If we are lucky enough that we have a SVG renderer, then just attach event handlers
                // Easy Peasy
                province_obj.addEventListener("click", function(e){
                    if (clickNoDrag) Game.Input.province.clicked(province_obj.provinceID);
                })
            })(r_objects["board"]["provinces"][province])
        }
    }

    this.init();
};

var zui;