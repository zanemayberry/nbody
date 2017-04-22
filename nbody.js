var canvas = $("#nbody-canvas")[0];
var planetsText = document.getElementById("planets-text");
var ctx = canvas.getContext("2d");
ctx.lineWidth = 1.2;
var TWO_PI = 2 * Math.PI;
var vel_debug = 40;
var acc_debug = 1000; // ZANETODO: log scale these guys :)
var mouseX = undefined;
var mouseY = undefined;
var canvasWidth = 800;
var canvasHeight = 600;
var cameraX = -canvasWidth / 2;
var cameraY = -canvasHeight / 2;
var cameraVX = 0;
var cameraVY = 0;
var cameraInputWeight = .05;
var cameraSpeed = 7;
var zoomLevel = -120;
var zoomSpeed = 1 / 360;
var zoomExponent = 2;
var planets = [];
var speedyBuf = new ArrayBuffer(0x10000); // support for 100 planets
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

var initialConditions = ko.observableArray([{"x":-53.80699346131542,"y":2.0027641803175427,"vx":-0.06995586511707014,"vy":-4.968757785259645,"mass":0.33,"ax":0.43631747415755767,"ay":-0.026050494430346127,"r":4.88,"color":"#bfb9b7","toRemove":false},{"x":105.08573477432849,"y":31.994782216622003,"vx":-1.0006237951756833,"vy":3.356672390954741,"mass":4.87,"ax":-0.1096800656424497,"ay":-0.03064809176846106,"r":12.1,"color":"#ff9f6b","toRemove":false},{"x":-60.728250000550965,"y":136.5673620590582,"vx":-2.715716363529503,"vy":-1.253829838773624,"mass":5.97,"ax":0.024500647107097873,"ay":-0.054841197701991806,"r":12.7,"color":"#0cba32","toRemove":false},{"x":-78.92388584411192,"y":212.23603799401286,"vx":-2.266557524347107,"vy":-0.8774614001823327,"mass":0.642,"ax":0.009161365908080032,"ay":-0.024473136939809348,"r":6.79,"color":"#c1440e","toRemove":false},{"x":-502.6178365181378,"y":597.2228332554381,"vx":-0.9970547190835919,"vy":-0.8405925315735184,"mass":1898,"ax":0.0014111023628364805,"ay":-0.0016712933181090017,"r":28.6,"color":"#ba7916","toRemove":false},{"x":877.959409240817,"y":1139.7087920566944,"vx":-0.7616023864954384,"vy":0.5962287057358555,"mass":568,"ax":-0.00039446802493281474,"ay":-0.0005115326412714616,"r":14.2,"color":"#b28d55","toRemove":false},{"x":2725.3223891115244,"y":905.0006572943988,"vx":-0.2155411849451579,"vy":0.6452615507596752,"mass":86.8,"ax":-0.00015377347308340172,"ay":-0.00005093349567664163,"r":10.22,"color":"#2dc198","toRemove":false},{"x":4434.634499259775,"y":727.8928861323752,"vx":-0.08912242259780728,"vy":0.5327633132596556,"mass":102,"ax":-0.00006526406503822024,"ay":-0.000010673364731927926,"r":9.9,"color":"#34a7df","toRemove":false},{"x":5871.318161472425,"y":635.1268049221131,"vx":-0.05177100493629744,"vy":0.4672231756595813,"mass":0.0146,"ax":-0.000038094769704906384,"ay":-0.000004099408159707885,"r":0.474,"color":"#a9b3b8","toRemove":false},{"x":1.3915264904305005,"y":1.198413654286134,"vx":0.001194250532934102,"vy":0.00217655535946763,"mass":1989000,"ax":-0.0000011041743213104603,"ay":0.0000019955463058836387,"r":40,"color":"#ffe700","toRemove":false}]);

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
			color: thisPlanet.color,
			toRemove: false
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
	bigG: ko.observable(.00067),
	stepsPerDraw: ko.observable(1000),
	initialConditions: initialConditions,
	loadPlanets: loadPlanets,
	simulateCollisions: ko.observable(false),
	solidFill: ko.observable(true)
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
	cameraX = -canvasWidth / 2;
	cameraY = -canvasHeight / 2;
	zoomLevel = -120;
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

					r = 1.0 / +max(+sqrt(dx * dx + dy * dy), 2.0);
		
					a_r_inv = bigG * r * r * r;
					ax = a_r_inv * dx;
					ay = a_r_inv * dy;
		
					p_vx = p_vx + ax * o_mass_dt;
					p_vy = p_vy + ay * o_mass_dt;
		
					f64[(j+16)>>3] = +f64[(j+16)>>3] - ax * p_mass_dt;
					f64[(j+24)>>3] = +f64[(j+24)>>3] - ay * p_mass_dt;
				}

				f64[(i+16)>>3] = p_vx;
				f64[(i+24)>>3] = p_vy;
			}

			for (i = 0; (i|0) < (heap_size|0); i = (i + 40)|0) {		
				f64[i>>3] = +f64[i>>3] + +f64[(i+16)>>3] * dt;
				f64[(i+8)>>3] = +f64[(i+8)>>3] + +f64[(i+24)>>3] * dt;
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

	if (viewModel.simulateCollisions()) {
		for (var i = 0; i < num_planets; i++) {
			var p = planets[i];
			for (var j = 0; j < i; j++) {
				var o = planets[j];
				if (o.toRemove) {
					continue;
				}

				var dx = p.x - o.x;
				var dy = p.y - o.y;
				var radii = p.r + o.r;

				if (dx * dx + dy * dy > radii * radii) {
					continue;
				}

				var big = p;
				var small = o;
				if (o.mass > p.mass) {
					big = o;
					small = p;
				}

				var momentumX = o.mass * o.vx + p.mass * p.vx;
				var momentumY = o.mass * o.vy + p.mass * p.vy;

				big.mass = o.mass + p.mass;
				big.vx = momentumX / big.mass;
				big.vy = momentumY / big.mass;
				big.r = Math.hypot(o.r, p.r);

				small.toRemove = true;
			}
		}

		var planets_copy = [];
		for (var i = 0; i < num_planets; i++) {
			var p = planets[i];
			if (!p.toRemove) {
				planets_copy.push(p);
			}
		}

		planets = planets_copy;
	}
};

var drawPlanet = function (planet, cameraScale, showVel, showAcc, solidFill) {
	var x = cameraScale * (planet.x - cameraX - canvasWidth / 2) + canvasWidth / 2;
	var y = cameraScale * (planet.y - cameraY - canvasHeight / 2) + canvasHeight / 2;
	var vx = planet.vx;
	var vy = planet.vy;
	var ax = planet.ax;
	var ay = planet.ay;

	ctx.strokeStyle = planet.color;
	ctx.fillStyle = planet.color;
	ctx.beginPath();
	ctx.arc(x, y, cameraScale * planet.r, 0, TWO_PI);
	if (solidFill) {
		ctx.fill();
	}
	else {
		ctx.stroke();
	}

	if (showVel) {
		var factor = Math.sqrt(cameraScale * vel_debug / Math.hypot(vx, vy));
		ctx.beginPath();
		ctx.moveTo(x, y);
		ctx.lineTo(x + factor * vx, y + factor * vy);
		ctx.stroke();
	}

	if (showAcc) {
		var factor = Math.sqrt(cameraScale * acc_debug / Math.hypot(ax, ay));
		ctx.beginPath();
		ctx.moveTo(x, y);
		ctx.lineTo(x + factor * ax, y + factor * ay);
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
	var solidFill = viewModel.solidFill();

	moveCamera(cameraScale);

	ctx.clearRect(0, 0, canvas.width, canvas.height);
	for (var i = 0; i < planets.length; i++) {
		var thisPlanet = planets[i];
		drawPlanet(thisPlanet, cameraScale, showVel, showAcc, solidFill);
	}
};

var loop = function () {
	update();
	draw();
	window.requestAnimationFrame(loop);
};

window.requestAnimationFrame(loop);