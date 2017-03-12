var canvas = $("#nbody-canvas")[0];
var planetsText = document.getElementById("planets-text");
var ctx = canvas.getContext("2d");
ctx.lineWidth = 1.2;
var TWO_PI = 2 * Math.PI;
var vel_debug = 10;
var acc_debug = 1000; // ZANETODO: log scale these guys :)
var mouseX = undefined;
var mouseY = undefined;
var cameraX = 0;
var cameraY = 0;
var cameraVX = 0;
var cameraVY = 0;
var cameraInputWeight = .05;
var cameraSpeed = 7;
var canvasWidth = 800;
var canvasHeight = 600;
var zoomLevel = 0;
var zoomSpeed = 1 / 360;
var zoomExponent = 2;
var planets = [];
var speedyBuf = new ArrayBuffer(4096); // support for 100 planets
var speedy = new Float64Array(speedyBuf);
var isFullScreen = false;

var keycode = {
	W: 87,
	A: 65,
	S: 83,
	D: 68,
	R: 82,
	TILDE: 192,
	ESC: 27
};

var initialConditions = ko.observableArray([
	{
		x: 200,
		y: 200,
		vx: 0,
		vy: 0,
		r: 20,
		mass: 500,
		color: "#992233"
	},
	{
		x: 10,
		y: 10,
		vx: 1.4,
		vy: 0,
		r: 10,
		mass: 10,
		color: "#00AA77"
	},
	{
		x: 300,
		y: 10,
		vx: 1,
		vy: 1,
		r: 10,
		mass: 10,
		color: "#FF0000"
	}
]);

var loadPlanets = function () {
	var stringified = JSON.stringify(initialConditions());
	var objectified = JSON.parse(stringified);
	planets = [];

	for (var i = 0; i < objectified.length; i++) {
		var thisPlanet = objectified[i];

		planets.push({
			x: parseFloat(thisPlanet.x),
			y: parseFloat(thisPlanet.y),
			vx: parseFloat(thisPlanet.vx),
			vy: parseFloat(thisPlanet.vy),
			mass: parseFloat(thisPlanet.mass),
			ax: parseFloat(0),
			ay: parseFloat(0),
			r: parseFloat(thisPlanet.r),
			color: thisPlanet.color
		});
	}
};

var addPlanet = function () {
	var size = 10 * Math.pow(10, Math.random());
	var randomColor = "#";
	for (var i = 0; i < 3; i++) {
		// bias towards darker colors
		randomColor += (Math.random() * 0xDD<<0).toString(16);
		while (randomColor.length < i * 2 + 3) {
			randomColor += "0";
		}
	}
	initialConditions.push({
		x: Math.random() * canvasWidth,
		y: Math.random() * canvasHeight,
		vx: Math.random() * 4 - 2,
		vy: Math.random() * 4 - 2,
		r: Math.sqrt(size),
		mass: size,
		color: randomColor
	});
};

var removePlanet = function (index) {
	initialConditions.splice(index(), 1);
};

var viewModel = {
	showVelocity: ko.observable(false),
	showAcceleration: ko.observable(false),
	timestep: ko.observable(.001),
	bigG: ko.observable(2.5),
	stepsPerDraw: ko.observable(1000),
	initialConditions: initialConditions,
	loadPlanets: loadPlanets
};

var toggleVelocity = function () { 
	viewModel.showVelocity(!viewModel.showVelocity()); 
};

var toggleAcceleration = function () { 
	viewModel.showAcceleration(!viewModel.showAcceleration()); 
};

ko.applyBindings(viewModel);

document.addEventListener('mousewheel', function(e) { 
	zoomLevel += e.deltaY;
}, true);

var keys = {};

document.onkeydown = function (e) {
	if (e.which == keycode.TILDE) {
		enterFullScreen();
		return;
	}
	keys[e.which] = true;
};

document.onkeyup = function (e) {
	delete keys[e.which];
};

var onFullScreenChange = function (e) {
	isFullScreen = !isFullScreen;
	if (isFullScreen) {
		canvasWidth = screen.width;
		canvasHeight = screen.height;
	}
	else {
		canvasWidth = 800;
		canvasHeight = 600;
	}
	canvas.width = canvasWidth;
	canvas.height = canvasHeight;
};

document.addEventListener('webkitfullscreenchange', onFullScreenChange, false);
document.addEventListener('mozfullscreenchange', onFullScreenChange, false);
document.addEventListener('fullscreenchange', onFullScreenChange, false);
document.addEventListener('MSFullscreenChange', onFullScreenChange, false);

var testKey = function (key) {
	return keys[key] == true;
};

var reset = function () {
	loadPlanets();
	cameraX = 0;
	cameraY = 0;
	zoomLevel = 0;
};

var enterFullScreen = function () {
    if (canvas.requestFullScreen)
        canvas.requestFullScreen();
    else if (canvas.webkitRequestFullScreen)
        canvas.webkitRequestFullScreen();
    else if (canvas.mozRequestFullScreen)
        canvas.mozRequestFullScreen();
};

function fastUpdate (stdlib, foreign, heap) {
	"use asm";
	
	var sqrt = stdlib.Math.sqrt;
	var max = stdlib.Math.max;
	var f64 = new stdlib.Float64Array(heap);

	function run (steps, heap_size, dt, bigG) {
		steps = steps|0;
		heap_size = heap_size|0;
		dt = +dt;
		bigG = +bigG;
		
		var i = 0;
		var j = 0;
		var p_x       = 0.0;
		var p_y       = 0.0;
		var p_vx      = 0.0;
		var p_vy      = 0.0;
		var p_mass_dt = 10.0;
		var dx = 0.0;
		var dy = 0.0;
		var ax = 0.0;
		var ay = 0.0;
		var o_mass_dt = 10.0;
		var r = 0.0;
		var a_r_inv = 0.0;

		for (; steps; steps = (steps - 1)|0) {
			for (i = 0; (i|0) < (heap_size|0); i = (i + 40)|0) {		
				p_x       = +f64[i>>3];
				p_y       = +f64[(i+8)>>3];
				p_vx      = +f64[(i+16)>>3];
				p_vy      = +f64[(i+24)>>3];
				p_mass_dt = +f64[(i+32)>>3] * dt;

				for (j = 0; (j|0) < (i|0); j = (j + 40)|0) {		
					dx        = +f64[j>>3] - p_x;
					dy        = +f64[(j+8)>>3] - p_y;
					o_mass_dt = +f64[(j+32)>>3] * dt;

					// sqrt is the bottleneck right now
					// this approximation seems to perform about 30% faster
					// than square root (15% total runtime)
					// ax = (+dx < 0.0) ? -dx : dx;
					// ay = (+dy < 0.0) ? -dy : dy;
					// r = ax > ay ? 1.0 / ax : 1.0 / ay;
					// r = r * (1.29289 - (ax + ay) * r * 0.29289);
					r = 1.0 / +max(+sqrt(dx * dx + dy * dy), 2.0);
		
					a_r_inv = bigG * r * r * r;
					ax = a_r_inv * dx;
					ay = a_r_inv * dy;
		
					p_vx += ax * o_mass_dt;
					p_vy += ay * o_mass_dt;
		
					f64[(j+16)>>3] -= ax * p_mass_dt;
					f64[(j+24)>>3] -= ay * p_mass_dt;
				}

				f64[(i+16)>>3] = p_vx;
				f64[(i+24)>>3] = p_vy;
			}

			for (i = 0; (i|0) < (heap_size|0); i = (i + 40)|0) {		
				f64[i>>3] += +f64[(i+16)>>3] * dt;
				f64[(i+8)>>3] += +f64[(i+24)>>3] * dt;
			}
		}

		return;
	};

	return {
		run: run
	};
}

var innerUpdate = fastUpdate(window, null, speedyBuf);

var update = function () {
	if (testKey(keycode.R)) {
		reset();
	}

	var steps = parseInt(viewModel.stepsPerDraw());
	var dt = parseFloat(viewModel.timestep());
	var bigG = parseFloat(viewModel.bigG());
	var inv_dt_steps = 1.0 / dt / steps;
	var num_planets = planets.length;

	for (var i = 0; i < num_planets; i++) {
		var p = planets[i];
		var offset = 5 * i;
		speedy[offset]     = p.x;
		speedy[offset + 1] = p.y;
		speedy[offset + 2] = p.vx;
		speedy[offset + 3] = p.vy;
		speedy[offset + 4] = p.mass;
	}

	var heap_size = num_planets * 40;
	innerUpdate.run(steps, heap_size, dt, bigG);

	for (var i = 0; i < num_planets; i++) {
		var offset = 5 * i;
		var p = planets[i];

		var new_vx = speedy[offset + 2];
		var new_vy = speedy[offset + 3];

		p.ax = (new_vx - p.vx) * inv_dt_steps;
		p.ay = (new_vy - p.vy) * inv_dt_steps;
		p.vx = new_vx;
		p.vy = new_vy;
		p.x = speedy[offset];
		p.y = speedy[offset + 1];
	}
};

var drawPlanet = function (planet, cameraScale, showVel, showAcc) {
	var x = cameraScale * (planet.x - cameraX - canvasWidth / 2) + canvasWidth / 2;
	var y = cameraScale * (planet.y - cameraY - canvasHeight / 2) + canvasHeight / 2;
	var vx = planet.vx;
	var vy = planet.vy;
	var ax = planet.ax;
	var ay = planet.ay;

	ctx.strokeStyle = planet.color;
	ctx.beginPath();
	ctx.arc(x, y, cameraScale * planet.r, 0, TWO_PI);
	ctx.stroke();

	if (showVel) {
		ctx.beginPath();
		ctx.moveTo(x, y);
		ctx.lineTo(x + cameraScale * vx * vel_debug, y + cameraScale * vy * vel_debug);
		ctx.stroke();
	}

	if (showAcc) {
		ctx.beginPath();
		ctx.moveTo(x, y);
		ctx.lineTo(x + cameraScale * ax * acc_debug, y + cameraScale * ay * acc_debug);
		ctx.stroke();
	}
};

var moveCamera = function (cameraScale) {
	var inputVX = 0;
	var inputVY = 0;
	if (testKey(keycode.W)) {
		inputVY -= 1;
	}
	if (testKey(keycode.A)) {
		inputVX -= 1;
	}
	if (testKey(keycode.S)) {
		inputVY += 1;
	}
	if (testKey(keycode.D)) {
		inputVX += 1;
	}

	var inputMag = Math.hypot(inputVX, inputVY);
	if (inputMag != 0) {
		inputVX /= inputMag;
		inputVY /= inputMag;
	}

	// ZANETODO: should be time based to avoid inconsistency
	cameraVX = (cameraInputWeight * inputVX + (1 - cameraInputWeight) * cameraVX);	
	cameraVY = (cameraInputWeight * inputVY + (1 - cameraInputWeight) * cameraVY);

	cameraX += cameraSpeed * cameraVX / cameraScale;
	cameraY += cameraSpeed * cameraVY / cameraScale;	
};

var draw = function () {
	var showVel = viewModel.showVelocity();
	var showAcc = viewModel.showAcceleration();
	var cameraScale = Math.pow(zoomExponent, -zoomLevel * zoomSpeed);

	moveCamera(cameraScale);

	ctx.clearRect(0, 0, canvas.width, canvas.height);
	for (var i = 0; i < planets.length; i++) {
		var thisPlanet = planets[i];
		drawPlanet(thisPlanet, cameraScale, showVel, showAcc);
	}
};

var loop = function () {
	update();
	draw();
	window.requestAnimationFrame(loop);
};

window.requestAnimationFrame(loop);