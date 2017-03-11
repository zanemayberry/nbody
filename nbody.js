var canvas = document.getElementById("nbody-canvas");
var ctx = canvas.getContext("2d");
var TWO_PI = 2 * Math.PI;
var vel_debug = 10;
var acc_debug = 1000;
var G = 1;
var dt = 1;
var show_vel = true;
var show_acc = true;

document.onkeydown = function (e) {
	console.log(e.which);
};

document.onkeyup = function (e) {
	console.log(e.key);
};

var planets = [
	{
		x: 200,
		y: 200,
		vx: 0,
		vy: 0,
		ax: 0,
		ay: 0,
		r: 20,
		mass: 500,
		color: "#992233"
	},
	{
		x: 10,
		y: 10,
		vx: 1.4,
		vy: 0,
		ax: 0,
		ay: 0,
		r: 10,
		mass: 10,
		color: "#00AA77"
	},
	{
		x: 300,
		y: 10,
		vx: 1,
		vy: 1,
		ax: 0,
		ay: 0,
		r: 10,
		mass: 10,
		color: "#FF0000"
	}
];

var updatePlanet = function (planetIdx) {
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
		var r = Math.hypot(dx, dy);
		var r3 = r * r * r;

		var a_r_inv = G * o.mass / r3;
		var ax = dx * a_r_inv;
		var ay = dy * a_r_inv;

		p.ax += ax;
		p.ay += ay;
	}
};

var update = function () {
	for (var i = 0; i < planets.length; i++) {
		updatePlanet(i);
	}
	for (var i = 0; i < planets.length; i++) {
		var p = planets[i];
		p.x += p.vx * dt;
		p.y += p.vy * dt;
		p.vx += p.ax * dt;
		p.vy += p.ay * dt;
	}
};

var drawPlanet = function (planet) {
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

	if (show_vel) {
		ctx.beginPath();
		ctx.moveTo(x, y);
		ctx.lineTo(x + vx * vel_debug, y + vy * vel_debug);
		ctx.stroke();
	}

	if (show_acc) {
		ctx.beginPath();
		ctx.moveTo(x, y);
		ctx.lineTo(x + ax * acc_debug, y + ay * acc_debug);
		ctx.stroke();
	}
};

var draw = function () {
	ctx.clearRect(0, 0, canvas.width, canvas.height);
	for (var i = 0; i < planets.length; i++) {
		var thisPlanet = planets[i];
		drawPlanet(thisPlanet);
	}
};

var loop = function () {
	update();
	draw();
	window.requestAnimationFrame(loop);
};

window.requestAnimationFrame(loop);