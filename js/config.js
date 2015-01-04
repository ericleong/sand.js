'use strict';

var Config = function(cellsCanvas, rulesCanvas) {
	if (cellsCanvas === undefined) {
		this.cellsCanvas = document.createElement('canvas');
		this.cellsCanvas.width = 256;
		this.cellsCanvas.height = 1;
	} else {
		this.cellsCanvas = cellsCanvas;
	}

	if (rulesCanvas === undefined) {
		this.rulesCanvas = document.createElement('canvas');
		this.rulesCanvas.width = 256;
		this.rulesCanvas.height = 256;
	} else {
		this.rulesCanvas = rulesCanvas;
	}

	this.reset();
};

Config.prototype.reset = function() {
	this.cells = {};
	this.index = [];
	this.numCells = 0;

	var cellsContext = this.cellsCanvas.getContext('2d');
	var rulesContext = this.rulesCanvas.getContext('2d');

	cellsContext.clearRect(0, 0, this.cellsCanvas.width, this.cellsCanvas.height);
	rulesContext.clearRect(0, 0, this.rulesCanvas.width, this.rulesCanvas.height);

	this.cellsData = cellsContext.createImageData(this.cellsCanvas.width, this.cellsCanvas.height);
	this.rulesData = rulesContext.createImageData(this.rulesCanvas.width, this.rulesCanvas.height);
};

Config.prototype.setPixelRGBA = function(imageData, width, x, y, r, g, b, a) {
	var pos = (y * width + x) * 4;
	var data = imageData.data;
	data[pos] = r;
	data[pos + 1] = g;
	data[pos + 2] = b;
	data[pos + 3] = a;
};

Config.prototype.setPixelColor = function(imageData, width, x, y, color) {
	this.setPixelRGBA(imageData, width, x, y, color[0], color[1], color[2], 255)
};

Config.prototype.setPixelCell = function(imageData, width, x, y, cell) {
	this.setPixelRGBA(imageData, width, x, y, cell.index, 0.0, 0.0, cell.density * 255)
}

Config.prototype.addCell = function(name, red, green, blue, density) {
	var index = this.numCells;

	this.cells[name] = {
		index: index,
		name: name,
		color: [red, green, blue],
		density: density
	};

	this.index[index] = this.cells[name];

	this.setPixelColor(this.cellsData, this.cellsCanvas.width, index, 0, this.cells[name].color);	

	this.numCells++;

	this.addRule(name, name, name, name);
};

Config.prototype.addRule = function(current, neighbor, newCurrent, newNeighbor) {
	var currentCell = this.cells[current];
	var neighborCell = this.cells[neighbor];

	var newCurrentCell = this.cells[newCurrent];
	var newNeighborCell = this.cells[newNeighbor];

	this.setPixelCell(this.rulesData, this.rulesCanvas.width, currentCell.index, neighborCell.index, newCurrentCell);
	this.setPixelCell(this.rulesData, this.rulesCanvas.width, neighborCell.index, currentCell.index, newNeighborCell);
};

Config.prototype.parse = function(text) {
	var lines = text.split('\n');

	for (var l = 0; l < lines.length; l++) {
		var line = lines[l];
		var words = line.split(' ');

		if (words[0] == 'cell' && this.cells[name] === undefined) {
			this.addCell(words[1], parseInt(words[2], 10), parseInt(words[3], 10), parseInt(words[4], 10), parseFloat(words[5]));
		} else if (words[0] == 'rule') {
			this.addRule(words[1], words[2], words[3], words[4]);
		}
	}
};