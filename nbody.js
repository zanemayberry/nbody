var canvas = document.getElementById("nbody-canvas");
var planetsText = document.getElementById("planets-text");
var rect = canvas.getBoundingClientRect();
var ctx = canvas.getContext("2d");
ctx.lineWidth = 1.2;
var TWO_PI = 2 * Math.PI;
var vel_debug = 10;
var acc_debug = 1000;
var mouseX = undefined;
var mouseY = undefined;
var cameraX = 0;
var cameraY = 0;
var cameraZ = 1000;
var planets = [];

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
	planets = JSON.parse(stringified);

	for (var i = 0; i < planets.length; i++) {
		var thisPlanet = planets[i];
		thisPlanet.x = parseFloat(thisPlanet.x);
		thisPlanet.y = parseFloat(thisPlanet.y);
		thisPlanet.vx = parseFloat(thisPlanet.vx);
		thisPlanet.vy = parseFloat(thisPlanet.vy);
		thisPlanet.r = parseFloat(thisPlanet.r);
		thisPlanet.mass = parseFloat(thisPlanet.mass);
		thisPlanet.ax = 0;
		thisPlanet.ay = 0;
	}
};

var addPlanet = function () {
	initialConditions.push({
		x: 0,
		y: 0,
		vx: 0,
		vy: 0,
		r: 10,
		mass: 10,
		color: "#000000"
	});
};

var removePlanet = function (index) {
	delete initialConditions.splice(index(), 1);
};

var viewModel = {
	showVelocity: ko.observable(false),
	showAcceleration: ko.observable(true),
	timestep: ko.observable(1),
	bigG: ko.observable(1),
	zoomLevel: ko.observable(0),
	initialConditions: initialConditions,
	loadPlanets: loadPlanets
};

ko.applyBindings(viewModel);

canvas.addEventListener('mousemove', function(evt) {
	mouseX = evt.clientX - rect.left;
	mouseY = evt.clientY - rect.top;
});

document.onmousewheel = function (evt) {
	viewModel.zoomLevel(viewModel.zoomLevel() + evt.deltaY);
};

var keys = {};

document.onkeydown = function (e) {
	keys[e.which] = true;
};

document.onkeyup = function (e) {
	delete keys[e.which];
};

var testKey = function (key) {
	return keys[key] = true;
};


var updatePlanet = function (planetIdx, bigG) {
	var p = planets[planetIdx];
	var p_x = p.x;
	var p_y = p.y;
	p.ax = 0;
	p.ay = 0;

	for (var i = 0; i < planets.length; i++) {
		if (i == planetIdx) {
			continue;
		}

		var o = planets[i];

		var dx = o.x - p_x;
		var dy = o.y - p_y;
		var r = Math.max(Math.hypot(dx, dy), 10);
		var r3 = r * r * r;

		var a_r_inv = bigG * o.mass / r3;
		var ax = dx * a_r_inv;
		var ay = dy * a_r_inv;

		p.ax += ax;
		p.ay += ay;
	}
};

var update = function () {
	var dt = viewModel.timestep();
	var bigG = viewModel.bigG();

	for (var i = 0; i < planets.length; i++) {
		updatePlanet(i, bigG);
	}

	// ZANETODO: would be cool to preserve total energy here...
	for (var i = 0; i < planets.length; i++) {
		var p = planets[i];
		p.x += p.vx * dt;
		p.y += p.vy * dt;
		p.vx += p.ax * dt;
		p.vy += p.ay * dt;
	}
};

var drawPlanet = function (planet, showVel, showAcc) {
	var x = planet.x;
	var y = planet.y;
	var vx = planet.vx;
	var vy = planet.vy;
	var ax = planet.ax;
	var ay = planet.ay;

	ctx.strokeStyle = planet.color;
	ctx.beginPath();
	ctx.arc(x, y, planet.r, 0, TWO_PI);
	ctx.stroke();

	if (showVel) {
		ctx.beginPath();
		ctx.moveTo(x, y);
		ctx.lineTo(x + vx * vel_debug, y + vy * vel_debug);
		ctx.stroke();
	}

	if (showAcc) {
		ctx.beginPath();
		ctx.moveTo(x, y);
		ctx.lineTo(x + ax * acc_debug, y + ay * acc_debug);
		ctx.stroke();
	}
};

var draw = function () {
	var showVel = viewModel.showVelocity();
	var showAcc = viewModel.showAcceleration();

	ctx.clearRect(0, 0, canvas.width, canvas.height);
	for (var i = 0; i < planets.length; i++) {
		var thisPlanet = planets[i];
		drawPlanet(thisPlanet, showVel, showAcc);
	}
};

var loop = function () {
	update();
	draw();
	window.requestAnimationFrame(loop);
};

window.requestAnimationFrame(loop);