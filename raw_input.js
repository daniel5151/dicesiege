// Track User Actions
var input = {
    cursorType: 'default',
    intype: "mouse",
    cursor: {
        x: 0,
        y: 0,
        on: false
    },
    trackCursor: function(event, type) {
        input.intype = type;
        if (type == 'mouse') {
            var rect = c.getBoundingClientRect();
            input.cursor.x = event.clientX - rect.left;
            input.cursor.y = event.clientY - rect.top;

        } else {
            if (type == 'touchmove') {
                if (event.touches.length == 1) {
                    input.cursor.x = event.targetTouches[0].pageX;
                    input.cursor.y = event.targetTouches[0].pageY;
                }
            } else if (type == 'touchstart') {
                if (event.touches.length == 1) {
                    input.cursor.x = event.changedTouches[0].pageX;
                    input.cursor.y = event.changedTouches[0].pageY;
                }
            }
            if (c.offsetParent) {
                do {
                    input.cursor.x -= c.offsetLeft;
                    input.cursor.y -= c.offsetTop;
                }
                while ((c = obj.offsetParent) != null);
            }
        }
    },
};

// Event Handler Shtuff
function initEventHandlers() {
    // GLOBAL EVENT LISTENERS
    /* cursor Tracking */
    document.addEventListener('mousemove', function(event) { input.trackCursor(event, 'mouse');     }, false);
    document.addEventListener('touchmove', function(event) { input.trackCursor(event, 'touchmove'); }, false);

    /* Mouse Handling */
           c.addEventListener('mousedown', function(event) { input.cursor.on = true;  }, false);
    document.addEventListener('mouseup',   function(event) { input.cursor.on = false; }, false);

    /* TouchScreen Handling */
    c.addEventListener('touchstart', function(event) {
        input.cursor.on = true; 
        input.trackCursor(event, 'touchstart');
    }, false);
    c.addEventListener('touchend',   function(event) {
        input.cursor.on = false;
    }, false);

    // Disable annoying default context-menu
    c.oncontextmenu = function() { return false; };

    // Disable selecting text on c
    c.onselectstart = function() { return false; };
}