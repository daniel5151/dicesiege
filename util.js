function getRandomColor() {
	var letters = '0123456789ABCDEF'.split('');
	var color = '#';
	for (var i = 0; i < 6; i++) {
		color += letters[Math.round(Math.random() * 15)];
	}
	return color;
}

function lineLength(point1, point2) {
	var xs = 0;
	var ys = 0;

	xs = point2.x - point1.x;
	xs = xs * xs;

	ys = point2.y - point1.y;
	ys = ys * ys;

	return Math.sqrt(xs + ys);
}

function randInt(max, min) {
	return Math.floor(Math.random() * (max - min + 1)) + min;
}

function getColorByHeight(y) {
	/* Color by Height */
	var heightColoring;
	var tempDistance;
	if (y > 2 * canvas.h / 3) {
		heightColoring = 'rgb(255,0,0)';
	} else if (y > canvas.h / 3) {
		tempDistance = Math.floor(y * 255 / (canvas.h / 3));
		heightColoring = 'rgb(255,' + (255 - (tempDistance % 255)) + ',0)';
	} else {
		tempDistance = Math.floor(y * 255 / (canvas.h / 3));
		heightColoring = 'rgb(' + tempDistance + ',255,0)';
	}
	return heightColoring;
};

function getColorByVelocity(x, y) {
	/* Color by Height */
	var velocityColoring;
	var tempVelocity = Math.sqrt(Math.pow(x, 2) + Math.pow(y, 2));
	if (tempVelocity > 100) {
		velocityColoring = 'rgb(255,0,0)';
	} else if (tempVelocity > 50) {
		tempVelocity = Math.floor(tempVelocity * 255 / (50));
		velocityColoring = 'rgb(255,' + (255 - (tempVelocity % 255)) + ',0)';
	} else {
		tempVelocity = Math.floor(tempVelocity * 255 / (50));
		velocityColoring = 'rgb(' + tempVelocity + ',255,0)';
	}
	return velocityColoring;
};

function distanceFromLineSegment(point1, point2, testPoint) {
	var lnLength = lineLength(point1, point2)
	var distStartPoint = lineLength(testPoint, point1)
	var distEndPoint = lineLength(testPoint, point2)

	if (Math.pow(distEndPoint, 2) > Math.pow(distStartPoint, 2) + Math.pow(lnLength, 2)) {
		return distStartPoint
	} else if (Math.pow(distStartPoint, 2) > Math.pow(distEndPoint, 2) + Math.pow(lnLength, 2)) {
		return distEndPoint
	} else {
		// Heron's formula to find "height" of triangle composed of line segment, and lines connecting
		// each end point with the cursor.
		var s = (distStartPoint + distEndPoint + lnLength) / 2
		var distToLine = 2 / lnLength * Math.sqrt(s * (s - distStartPoint) * (s - distEndPoint) * (s - lnLength))
		return distToLine;
	}
}

function centerOfLine(point1, point2) {
	return {
		x: (point1.x + point2.x) / 2,
		y: (point1.y + point2.y) / 2
	};
}