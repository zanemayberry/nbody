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
var speedy = [];

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
	timestep: ko.observable(.0001),
	bigG: ko.observable(1),
	zoomLevel: ko.observable(0),
	stepsPerDraw: ko.observable(10000),
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

var update = function () {
	var steps = parseInt(viewModel.stepsPerDraw());
	var dt = parseFloat(viewModel.timestep());
	var bigG = parseFloat(viewModel.bigG());
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

	for (var i = 0; i < steps; i++) {
		for (var j = 0; j < num_planets; j++) {
			var offset = 5 * j;

			var p_x       = speedy[offset];
			var p_y       = speedy[offset + 1];
			var p_vx      = speedy[offset + 2];
			var p_vy      = speedy[offset + 3];
			var p_mass_dt = speedy[offset + 4] * dt;

			for (var k = 0; k < j; k++) {
				var offset_k = 5 * k;

				var dx        = speedy[offset_k] - p_x;
				var dy        = speedy[offset_k + 1] - p_y;
				var o_mass_dt = speedy[offset_k + 4] * dt;

				var r = 1.0 / Math.sqrt(dx * dx + dy * dy);

				var a_r_inv = bigG * r * r * r;
				var ax = dx * a_r_inv;
				var ay = dy * a_r_inv;

				p_vx += ax * o_mass_dt;
				p_vy += ay * o_mass_dt;

				speedy[offset_k + 2] -= ax * p_mass_dt;
				speedy[offset_k + 3] -= ay * p_mass_dt;
			}

			speedy[offset + 2] = p_vx;
			speedy[offset + 3] = p_vy;
		}

		for (var j = 0; j < num_planets; j++) {
			var offset = 5 * j;
			var p = planets[j];
			var new_vx = speedy[offset + 2];
			var new_vy = speedy[offset + 3];

			p.ax = (new_vx - p.vx) / dt;
			p.ay = (new_vy - p.vy) / dt;
			p.vx = new_vx;
			p.vy = new_vy;
			p.x += p.vx * dt;
			p.y += p.vy * dt;
		}
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