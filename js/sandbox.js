var draw;
var sand;
var input;
var radios;

var paused;
var frameDuration = 8; // ms -> 125 fps

// update input hint
var updateInput;

var updateSand;
var updateSandInterval;

function start() {
	var canvas = document.getElementById('sandbox');
	var config = document.getElementById('config').textContent;

	var boundingRect = canvas.getBoundingClientRect();
	canvas.width = boundingRect.width;
	canvas.height = boundingRect.height;

	sand = new Sand(canvas, config);

	if (sand.gl) {
		draw = new Draw(sand.gl, sand.rectVerticesBuffer, sand.rectVerticesTextureCoordBuffer);
		input = new Input(draw);

		updateCellsList();		

		var startupImage = new Image();
		startupImage.onload = function() { 
			handleTextureLoaded(startupImage); 

			// update canvas
			window.clearInterval(updateSandInterval);
			updateSandInterval = window.setInterval(updateSand, frameDuration);

			// Set up to draw the scene periodically.
			window.requestAnimationFrame(animate);
		}
		startupImage.src = './sand.png';

		initUserInput(canvas);
	}
}

function handleImages(images) {
	if (images && images.length > 0) {
		var image = new Image();
		image.onload = function() { 
			handleTextureLoaded(image);
		};
		
		var reader = new FileReader();
		reader.onload = (function(img) { return function(e) { img.src = e.target.result; }; })(image);
		reader.readAsDataURL(images[0]); // pick first image

		var fileInput = document.getElementById('file-input');
		fileInput.value = ''; // clear input
	}
}

function updateCellsList() {
	radios = [];
	var cellSelect = document.getElementById('cell-select');

	// remove all children
	while (cellSelect.lastChild) {
		cellSelect.removeChild(cellSelect.lastChild);
	}

	var checked = false;

	for (var i = 0; i < sand.config.index.length; i++) {
		var cell = sand.config.index[i];
		
		var item = document.createElement('div');
		var radio = document.createElement('input');
		radio.id = 'radio-' + cell.name;
		radio.setAttribute('name', 'cell');
		radio.setAttribute('type', 'radio');
		radio.setAttribute('value', cell.name);

		if (!checked && cell.color[3] > 0.5) {
			radio.setAttribute('checked', '');
		}

		radios.push(radio);

		var label = document.createElement('label');
		label.setAttribute('for', radio.id);
		label.appendChild(document.createTextNode(cell.name));

		item.appendChild(radio);
		item.appendChild(label);

		cellSelect.appendChild(item);
	}
}

function handleTextureLoaded(image) {
	var inputContext = input.inputCanvas.getContext('2d');

	inputContext.clearRect(0, 0, input.inputCanvas.width, input.inputCanvas.height);
	inputContext.drawImage(image, 0, 0);

	// set densities
	var inputData = inputContext.getImageData(0, 0, input.inputCanvas.width, input.inputCanvas.height);
	var data = inputData.data;
	for (var i = 3; i < data.length; i += 4) {
		for (var j = 0; j < sand.config.index.length; j++) {
			if (data[i - 3] == sand.config.index[j].color[0] && data[i - 2] == sand.config.index[j].color[1] && data[i - 1] == sand.config.index[j].color[2]) {
				data[i] = sand.config.index[j].color[3] * 255;
			}
		}
	}

	inputContext.putImageData(inputData, 0, 0);

	var maskContext = input.maskCanvas.getContext('2d');

	// create mask, draw the entire image
	maskContext.fillStyle = 'rgba(255, 255, 255, 1.0)';
	maskContext.fillRect(0, 0, input.maskCanvas.width, input.maskCanvas.height);

	// tell updateSand() to update the buffers with input
	updateInput = true;
}

function animate() {
	draw.drawScene(sand.sandBuffer == 0 ? sand.sandTexture0 : sand.sandTexture1);

	window.requestAnimationFrame(animate);
}

function initUserInput(canvas) {
	var down = false;
	var color = 'rgba(255, 255, 255, 1.0)';

	function getMousePos(canvas, evt) {
		var rect = canvas.getBoundingClientRect();
		return {
			x: evt.clientX - rect.left,
			y: evt.clientY - rect.top
		};
	}

	function getCurrentColor() {
		var color = 'rgba(255, 255, 255, 1.0)';

		for (var i = 0; i < radios.length; i++) {
			if (radios[i].checked) {
				var cell = sand.config.cells[radios[i].value];

				color = 'rgba(' + cell.color[0] + ', ' + cell.color[1] + ', ' + cell.color[2] + ', ' + cell.color[3].toFixed(3) + ')';

				break;
			}
		}

		return color;
	}

	function drawCanvas(canvas, mousePos, color) {
		var context = canvas.getContext('2d');

		context.fillStyle = color;
		// use a rectangle because circles are antialiased
		context.fillRect(mousePos.x - 12, mousePos.y - 12, 24, 24);
	}

	function drawEvent(canvas, evt) {
		var mousePos = getMousePos(canvas, evt);

		drawCanvas(input.inputCanvas, mousePos, color);
		drawCanvas(input.maskCanvas, mousePos, 'rgba(255, 255, 255, 1.0)');

		updateInput = true;
	}

	function handleMouseDown(evt) {
		evt.preventDefault();

		down = true;

		if (evt.shiftKey) { // wall
			color = 'rgba(127, 127, 127, 0.5)';
		} else if (evt.ctrlKey) { // empty
			color = 'rgba(0, 0, 0, 0.5)';
		} else if (evt.altKey) { // fire
			color = 'rgba(255, 0, 0, 0.1)';
		} else {
			color = getCurrentColor();
		}

		drawEvent(canvas, evt);
	}

	function handleMouseUp(evt) {
		evt.preventDefault();

		down = false;
	}

	function handleMouseMove(evt) {
		evt.preventDefault();

		if (down) {
			drawEvent(canvas, evt);
		}
	}

	canvas.addEventListener('mousedown', handleMouseDown, true);
	canvas.addEventListener('mouseup', handleMouseUp, true);
	canvas.addEventListener('mouseleave', handleEnd, true);
	canvas.addEventListener('mousemove', handleMouseMove, true);

	var ongoingTouches = [];

	function copyTouch(touch) {
		return { identifier: touch.identifier, clientX: touch.clientX, clientY: touch.clientY };
	}

	function ongoingTouchIndexById(idToFind) {
		for (var i=0; i < ongoingTouches.length; i++) {
			var id = ongoingTouches[i].identifier;

			if (id == idToFind) {
				return i;
			}
		}
		return -1; // not found
	}

	function handleStart(evt) {
		evt.preventDefault();

		for (var i = 0; i < evt.changedTouches.length; i++) {
			var touch = copyTouch(evt.changedTouches[i]);

			ongoingTouches.push(touch);

			color = getCurrentColor();
			drawEvent(canvas, touch);
		}
	}

	function handleMove(evt) {
		evt.preventDefault();

		for (var i = 0; i < evt.changedTouches.length; i++) {
			var idx = ongoingTouchIndexById(evt.changedTouches[i].identifier);

			if (idx >= 0) {
				var touch = copyTouch(evt.changedTouches[i]);

				drawEvent(canvas, touch);

				ongoingTouches.splice(idx, 1, touch);
			}
		}
	}

	function handleEnd(evt) {
		evt.preventDefault();

		if (evt.changedTouches) {
			for (var i = 0; i < evt.changedTouches.length; i++) {
			var idx = ongoingTouchIndexById(evt.changedTouches[i].identifier);

			if (idx >= 0) {
				ongoingTouches.splice(idx, 1);
			}
		}
		}
	}

	canvas.addEventListener('touchstart', handleStart, true);
	canvas.addEventListener('touchend', handleEnd, true);
	canvas.addEventListener('touchcancel', handleEnd, true);
	canvas.addEventListener('touchleave', handleEnd, true);
	canvas.addEventListener('touchmove', handleMove, true);

	var update = document.getElementById('update');
	update.addEventListener('click', function(evt) {
		sand.config.reset();

		sand.loadConfig(document.getElementById('config').value);

		updateCellsList();
	}, false);

	var pause = document.getElementById('pause');
	pause.addEventListener('click', togglePause, false);

	var saveSandbox = document.getElementById('save-sandbox');
	saveSandbox.addEventListener('click', function(evt) {
		// draw it again
		draw.drawScene(sand.sandBuffer == 0 ? sand.sandTexture0 : sand.sandTexture1);

		// save it
		saveSandbox.href = canvas.toDataURL();
		saveSandbox.download = 'sandbox.png';
	});

	var loadSandbox = document.getElementById('load-sandbox');
	var fileInput = document.getElementById('file-input');
	
	loadSandbox.addEventListener('click', function (evt) {
		if (fileInput) {
			fileInput.click();
		}

		evt.preventDefault();
	}, false);
}

function togglePause() {
	window.clearInterval(updateSandInterval);

	if (paused) {
		updateSandInterval = setInterval(updateSand, frameDuration);
	}

	paused = !paused;
}

var t0, t1;

function updateSand() {

	if (performance) {
		t0 = performance.now();
	}

	sand.next();

	if (performance) {
		t1 = performance.now();

		if (t1 - t0 > frameDuration) {
			console.log(t1 - t0);

			frameDuration *= 2;

			window.clearInterval(updateSandInterval);
			updateSandInterval = setInterval(updateSand, frameDuration);
		}
	}

	if (updateInput) {
		input.drawInput();
		updateInput = false;
	}
}