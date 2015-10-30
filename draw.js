// Everything to do with drawing
var c;
var ctx;
var c_size = {
    w: 1280,
    h: 720,
};

var draw = {
    // Vars
    dontReDrawCanvas: false,

    // Shapes
    shape: {
        circle: function(x, y, r, color, selected) {
            ctx.beginPath();
            ctx.lineWidth = selected ? 3 : 1;
            ctx.arc(x, y, r, 0, Math.PI * 2, false);
            ctx.fillStyle = color;
            ctx.fill();
            ctx.strokeStyle = 'black';
            ctx.stroke();
            ctx.closePath();
        },
        
        arrow: function(x, y, x2, y2, color) {
            var headlen = 10;
            var angle = Math.atan2(y2 - y, x2 - x);

            ctx.beginPath();

            ctx.moveTo(x, y);
            ctx.lineTo(x2, y2);
            ctx.moveTo(x2, y2);

            ctx.lineTo(x2 - headlen * Math.cos(angle - Math.PI / 6), y2 - headlen * Math.sin(angle - Math.PI / 6));
            ctx.moveTo(x2, y2);
            ctx.lineTo(x2 - headlen * Math.cos(angle + Math.PI / 6), y2 - headlen * Math.sin(angle + Math.PI / 6));

            ctx.lineWidth = 4;
            ctx.strokeStyle = 'black';
            ctx.stroke();

            ctx.lineWidth = 2;
            ctx.strokeStyle = color;
            ctx.stroke();

            ctx.closePath();
        },
        line: function(x, y, x2, y2, props) {
            ctx.beginPath();

            ctx.lineWidth = props.width || 1;
            ctx.strokeStyle = props.color || 'black';

            if (props.dashed) {
                ctx.dashedLine(x, y, x2, y2, 3)
            } else {
                ctx.moveTo(x, y)
                ctx.lineTo(x2, y2)
            }

            ctx.stroke();

            ctx.closePath();
        }
    },

    // Common Drawing Functions
    clear: function() {
        ctx.beginPath();
        ctx.rect(0, 0, c_size.w, c_size.h);

        ctx.fillStyle = "lightgrey";
        ctx.fill();

        ctx.lineWidth = 1;
        ctx.strokeStyle = '#000000';
        ctx.stroke();
    },
    message: function(message, x, y) {
        ctx.font = '18pt sans-serif';
        ctx.fillStyle = 'black';
        ctx.fillText(message, x, y);
    }
};

// There is a built in dashed line function, but this is for better support
CanvasRenderingContext2D.prototype.dashedLine = function(x1, y1, x2, y2, dashLen) {
    if (dashLen == undefined) dashLen = 2;
    this.moveTo(x1, y1);

    var dX = x2 - x1;
    var dY = y2 - y1;
    var dashes = Math.floor(Math.sqrt(dX * dX + dY * dY) / dashLen);
    var dashX = dX / dashes;
    var dashY = dY / dashes;

    var q = 0;
    while (q++ < dashes) {
        x1 += dashX;
        y1 += dashY;
        this[q % 2 == 0 ? 'moveTo' : 'lineTo'](x1, y1);
    }
    this[q % 2 == 0 ? 'moveTo' : 'lineTo'](x2, y2);
};