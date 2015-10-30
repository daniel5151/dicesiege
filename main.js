var shapes = [];

function Circle (props) {
    this.x = props.x | 0;
    this.y = props.y | 0;
    this.r = props.r | 20;
    this.color = (props.color == "random")?getRandomColor():props.color | "lightblue";

    this.draw = function () { draw.shape.circle(this.x, this.y, this.r, this.color); }
}

function render() {
    draw.clear();
    for (var i = 0; i < shapes.length; i++) shapes[i].draw();
    draw.message("Cursor on? " + input.cursor.on, 100, 100);
}

function logic() {
    if (input.cursor.on)
        shapes.push(new Circle({
            x:input.cursor.x,
            y:input.cursor.y,
            r:10,
            color:"random"
        }));
}

// shim layer with setTimeout fallback
window.requestAnimFrame = (function() {
    return window.requestAnimationFrame ||
        window.webkitRequestAnimationFrame ||
        window.mozRequestAnimationFrame ||
        function(callback) {
            window.setTimeout(callback, 1000 / 60);
        };
})();

var lastTime;
function main() {
    var now = Date.now();
    var dt = (now - lastTime);

    logic()
    render()

    lastTime = now;
    requestAnimFrame(main);
};

function init() {
    // Declare and Populate Global Canvas
    c = document.getElementById('c');
    ctx = c.getContext('2d');

    c.width = c_size.w;
    c.height = c_size.h;

    // Initialize Event Handlers
    initEventHandlers();

    // Begin
    console.log('Running...');

    main();
}

window.onload = init;