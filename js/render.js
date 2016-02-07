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



// But seriosuly tho, here is the acutal renderer

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
            // var rect = two.makeRectangle(213, 100, 100, 100);

            // rect.fill = 'rgb(0, 200, 255)';
            // rect.opacity = 0.75;
            // rect.noStroke();

            // two.update();

            // return rect;
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

            this.Primitive = new Primitives.Path({
                points:    province_points,
                fill:      pallete[province.owner],
                linewidth: hexradius/10
            })

            var self = this;
            this.Primitive.onclick(function(e,primitive){
                Game.Input.province.clicked(provinceID);
            });
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
        }
    }

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

            var BaseBoardW = (HexW * (map.tileMap.dims.w * 2 + 1) );
            var BaseBoardH = (HexH * (map.tileMap.dims.h * 3    ) );

            var scale = Math.min(
                two.width  / BaseBoardW * 0.975,    // 0.975 is a nice padding value
                two.height / BaseBoardH * 0.975
            )

            var ScaledBoardW = BaseBoardW * scale;
            var ScaledBoardH = BaseBoardH * scale;

            rendered_groups["board"].scale = scale;
            rendered_groups["board"].translation.set(
                (two.width  - ScaledBoardW) / 2,
                (two.height - ScaledBoardH) / 2
            );

            two.update();

            console.timeEnd("Resizing Board");
        },
        province: {
            color: function (provinceID, color) {
                rendered_objects.board.provinces[provinceID].Primitive.path.fill = color;
                two.update();
            },
            owner: function (provinceID, owner) {
                rendered_objects.board.provinces[provinceID].Primitive.path.fill = pallete[owner];
                two.update();
            }
        }
    };
    this.ReRender = ReRender;

    var rendered_objects = {};  // Tracks individual shapes
    var rendered_groups = {};   // Tracks rendering groups

    // DEBUG STUFF
        // Exposes internal objects to the outside world
        this.GET_RENDERED_OBJECTS = function () { return rendered_objects; }
        this.GET_RENDERED_GROUPS  = function () { return rendered_groups;  }

    this.init = function () {
        // ------ SHARED ASSETS ------ //
        pallete = Utils.generatePallete(map.n_players);
        pallete.unshift("white");

        // ---------- BOARD ---------- //
        console.time("Rendering Board");

        rendered_objects["board"] = {};

        /* PROVINCES */
        rendered_objects.board["provinces"] = {};
        for (var id = 0; id < map.provinces.length; id++) {
            if (map.provinces[id].owner == 0) continue;
            rendered_objects.board.provinces[id] = new GameObjects.Province({id:id});
        }

        /* OUTLINE */
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
        
        // DIRTY FLOATING POINT PRECISION BULLSHIT
        outlinePoints = outlinePoints.map(function (pt) {
            return [
                pt[0] - 100, 
                pt[1] - 100
            ];
        })
        // DIRTY FLOATING POINT PRECISION BULLSHIT

        rendered_objects.board["outline"] = new Primitives.Path({
            points: outlinePoints,
            noFill: true,
            linewidth: hexradius/10
        })

        /* Group rendered provinces into an easy to manage Two.Group */
        rendered_groups["board"] = two.makeGroup();

        // Add outline first
        rendered_groups["board"].add(rendered_objects.board.outline.path);

        // Add provinces
        for (var province in rendered_objects.board.provinces) {
            rendered_groups["board"].add(rendered_objects.board.provinces[province].Primitive.path);
        }

        /* Attach event handlers*/
        two.bind("resize", ReRender.resize);

        console.timeEnd("Rendering Board");
        


        // Render everyhting!
        ReRender.resize();






        // This is magic.
        var zui = new ZUI(two);
        zui.addLimits(0.5, 8);

        // TODO: Add pinch-to-zoom for mobile.

        var $stage = two.renderer.domElement;
        function MouseWheelHandler (e) {
            e.stopPropagation();
            e.preventDefault();

            var dy = (e.wheelDeltaY || - e.deltaY) / 1000;

            zui.zoomBy(dy, e.clientX, e.clientY);

            two.update()

            return false;
        }
        // IE9, Chrome, Safari, Opera
        $stage.addEventListener("mousewheel", MouseWheelHandler, false);
        // Firefox
        $stage.addEventListener("DOMMouseScroll", MouseWheelHandler, false);
    };
};