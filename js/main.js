var stage;

var board_prefs = {
    size:{
        h:10,
        w:10
    },
    offset:{
        x:60,
        y:60
    },
    hexdims:{
        s:40,
        h:'computed',
        w:'computed'
    }
}

function NewHex (i,j,hexdims,offset) {
    var hex = new createjs.Shape;

    var hexY = offset.y + i * hexdims.h;
    if (i % 2 == 0) var hexX = offset.x + j * hexdims.w;
    else            var hexX = offset.x + j * hexdims.w + 1/2* hexdims.w;

    hex.graphics
        .beginStroke("#aaa")
        .beginLinearGradientFill(
            ["#eee","#fafafa"],
            [0, 1], 0, hexY-20, 0, hexY+30
        )
        .drawPolyStar(hexX,hexY,hexdims.s,6,0,30)
        .endStroke()
        .endFill();

    var text = new createjs.Text(i + ", " + j, "16px Arial", "black");
        text.x = hexX-15;
        text.y = hexY+5;
        text.textBaseline = "alphabetic";

    var container = new createjs.Container();
    container.addChild(hex);
    container.addChild(text)
    return container;
}

function Board(prefs) {
    this.size = prefs.size;
    this.offset = prefs.offset;
    this.hexdims = {
        s: prefs.hexdims.s,
        w: Math.sqrt(3)/2 * 2 * prefs.hexdims.s,
        h:            3/4 * 2 * prefs.hexdims.s
    };

    this.init = function () {
        this.map = [];
        for (var i = 0; i < this.size.h; i++) {
            this.map.push([]);
            for (var j = 0; j < this.size.w; j++) {
                this.map[i][j] = NewHex(i, j, this.hexdims, this.offset);
                stage.addChild(this.map[i][j]);
            }       
        }
    }
}

var board;

function init() {
    //Create stage object - our root level container
    stage = new createjs.Stage("c");
    stage.canvas.width = window.innerWidth;
    stage.canvas.height = window.innerHeight;

    // stage.enableMouseOver(10);
    
    // Call the function to craete the hex grid
    board = new Board(board_prefs);
    board.init();

    // updaet canvas 24/7, b/c fuck efficiency
    createjs.Ticker.addEventListener("tick", stage);
}

window.onload = init;