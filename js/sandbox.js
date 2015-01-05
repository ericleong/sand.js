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
		initUserInput(canvas);

		if (window.location.protocol.indexOf('file:') == 0) {
			// because of CORS, outside image files cannot be loaded, so just show a blank canvas

			var maskContext = input.maskCanvas.getContext('2d');
			maskContext.fillStyle = 'rgba(0, 0, 0, 1.0)';
			maskContext.fillRect(0, 0, input.maskCanvas.width, input.maskCanvas.height);

			handleTextureLoaded(input.maskCanvas);

			// update canvas
			window.clearInterval(updateSandInterval);
			updateSandInterval = window.setInterval(updateSand, frameDuration);

			// Set up to draw the scene periodically.
			window.requestAnimationFrame(animate);
		} else {
			// load a startup image
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
		}
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

		if (!checked && cell.density > 0.5) {
			radio.setAttribute('checked', '');
			checked = true;
		}

		radios.push(radio);

		var label = document.createElement('label');
		label.setAttribute('for', radio.id);
		label.style.backgroundColor = getRGB(cell.color);
		if (relativeLuminance(cell.color[0], cell.color[1], cell.color[2]) > 0.5) {
			label.classList.remove('light');
			label.classList.add('dark');
		} else {
			label.classList.remove('dark');
			label.classList.add('light');
		}
		label.appendChild(document.createTextNode(cell.name));

		item.appendChild(radio);
		item.appendChild(label);

		cellSelect.appendChild(item);
	}
}

function handleTextureLoaded(image) {
	var inputContext = input.inputCanvas.getContext('2d');
	inputContext.imageSmoothingEnabled = false;

	inputContext.clearRect(0, 0, input.inputCanvas.width, input.inputCanvas.height);

	if (image.naturalWidth && image.naturalHeight) {
		inputContext.drawImage(image, 
			Math.floor((input.inputCanvas.width - image.naturalWidth) / 2),
			Math.floor((input.inputCanvas.height - image.naturalHeight) / 2));
	} else {
		inputContext.drawImage(image, 0, 0);
	}

	// set densities
	var inputData = inputContext.getImageData(0, 0, input.inputCanvas.width, input.inputCanvas.height);
	var data = inputData.data;

	for (var i = 0; i < data.length; i += 4) {
		for (var j = 0; j < sand.config.index.length; j++) { // need a better search method
			if (data[i] == sand.config.index[j].color[0] && data[i + 1] == sand.config.index[j].color[1] && data[i + 2] == sand.config.index[j].color[2]) {
				// uses integers from 0 - 255
				data[i] = sand.config.index[j].index;
				data[i + 1] = 0.0;
				data[i + 2] = 0.0;
				data[i + 3] = sand.config.index[j].density * 255;
			}
		}
	}

	inputContext.putImageData(inputData, 0, 0);

	var maskContext = input.maskCanvas.getContext('2d');

	// create mask, draw the entire image
	maskContext.fillStyle = 'rgba(255, 255, 255, 1.0)';
	maskContext.fillRect(0, 0, input.maskCanvas.width, input.maskCanvas.height);

	// tell updateSand() to update the buffers with input
	updateInput = 1;
}

function getCurrentCell() {
	for (var i = 0; i < radios.length; i++) {
		if (radios[i].checked) {
			return sand.config.cells[radios[i].value];
		}
	}
}

function getRGB(color) {
	return 'rgb(' + color[0] + ', ' + color[1] + ', ' + color[2] + ')';
}

// from http://www.w3.org/TR/WCAG20/#relativeluminancedef
function relativeLuminance(R8bit, G8bit, B8bit) {

	var RsRGB = R8bit / 255;
	var GsRGB = G8bit / 255;
	var BsRGB = B8bit / 255;

	var R = (RsRGB <= 0.03928) ? RsRGB / 12.92 : Math.pow((RsRGB + 0.055) / 1.055, 2.4);
	var G = (GsRGB <= 0.03928) ? GsRGB / 12.92 : Math.pow((GsRGB + 0.055) / 1.055, 2.4);
	var B = (BsRGB <= 0.03928) ? BsRGB / 12.92 : Math.pow((BsRGB + 0.055) / 1.055, 2.4);

	// For the sRGB colorspace, the relative luminance of a color is defined as: 
	var L = 0.2126 * R + 0.7152 * G + 0.0722 * B;

	return L;
}

function animate() {
	draw.drawScene(sand.cellsTexture, sand.sandBuffer == 0 ? sand.sandTexture0 : sand.sandTexture1);

	window.requestAnimationFrame(animate);
}

function initUserInput(canvas) {
	var down = false;

	function getMousePos(canvas, evt) {
		var rect = canvas.getBoundingClientRect();
		return {
			x: evt.clientX - rect.left,
			y: evt.clientY - rect.top
		};
	}

	function drawCanvas(canvas, mousePos, color) {
		var context = canvas.getContext('2d');

		// use a rectangle because circles are antialiased
		context.fillStyle = color;
		context.fillRect(Math.floor(mousePos.x) - 12, Math.floor(mousePos.y) - 12, 24, 24);
	}

	function drawEvent(canvas, evt) {
		var mousePos = getMousePos(canvas, evt);

		drawCanvas(input.maskCanvas, mousePos, 'rgba(255, 255, 255, 1.0)');

		updateInput = 2;

		if (paused) {
			sand.bindFrameBuffer();
			updateColor();
		}
	}

	function handleMouseDown(evt) {
		evt.preventDefault();

		down = true;

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
		for (var i = 0; i < ongoingTouches.length; i++) {
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
		draw.drawScene(sand.cellsTexture, sand.sandBuffer == 0 ? sand.sandTexture0 : sand.sandTexture1);

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

function updateColor() {
	var cell = getCurrentCell();
	input.drawColor(cell.index / 255.0, 0.0, 0.0, cell.density);
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

	if (updateInput > 0) {
		if (updateInput == 2) { // we are only drawing one cell type
			updateColor();
		} else {
			input.drawInput();
		}
		
		updateInput = 0;
	}
}