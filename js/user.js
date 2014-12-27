// textures
var rectTexture, maskTexture;

// frame buffers
var rectFrameBuffer, maskFrameBuffer;

// draw input hint
var updateInput = false;

var draw;
var sand;
var radios;

var painter;
var mask;

var frameDuration = 8; // ms

var updateCanvas;
var updateCanvasInterval;

function start() {
	var canvas = document.getElementById('sandbox');
	var config = document.getElementById('config').textContent;

	sand = new Sand(canvas, config);

	if (sand.gl) {
		draw = new Draw(sand.gl, sand.rectVerticesBuffer, sand.rectVerticesTextureCoordBuffer);

		updateCellsList();		

		var rectImage = new Image();
		rectImage.onload = function() { handleTextureLoaded(rectImage); }
		rectImage.src = './sand.png';

		initUserInput(canvas);
	}
}

function updateCellsList() {
	radios = [];
	var cellSelect = document.getElementById('cell-select');

	// remove all children
	while (cellSelect.lastChild) {
		cellSelect.removeChild(cellSelect.lastChild);
	}

	for (var i = 0; i < sand.config.index.length; i++) {
		var cell = sand.config.index[i];
		
		var item = document.createElement('div');
		var radio = document.createElement('input');
		radio.setAttribute('type', 'radio');
		radio.setAttribute('name', 'cell');
		radio.setAttribute('value', cell.name);

		if (i == 0) {
			radio.setAttribute('checked', '');
		}

		radios.push(radio);

		item.appendChild(radio);
		item.appendChild(document.createTextNode(cell.name));

		cellSelect.appendChild(item);
	}
}

function handleTextureLoaded(image) {
	var painterContext = painter.getContext('2d');

	// 'empty' has a density of 0.5
	painterContext.fillStyle = 'rgba(0, 0, 0, 0.5)';
	painterContext.fillRect(0, 0, painter.width, painter.height);
	painterContext.drawImage(image, 0, 0);

	var tex = SandUtils.initTextureWithFrameBuffer(sand.gl, painter);
	rectTexture = tex[0];
	rectFrameBuffer = tex[1];

	var maskContext = mask.getContext('2d');

	// create mask, draw the entire image
	maskContext.fillStyle = 'rgba(255, 255, 255, 1.0)';
	maskContext.fillRect(0, 0, mask.width, mask.height);

	tex = SandUtils.initTextureWithFrameBuffer(sand.gl, mask);
	maskTexture = tex[0];
	maskFrameBuffer = tex[1];

	draw.gl.bindTexture(draw.gl.TEXTURE_2D, null);

	// tell updateCanvas() to update the buffers with input
	updateInput = true;

	updateCanvasInterval = window.setInterval(updateCanvas, frameDuration);

	// Set up to draw the scene periodically.
	window.requestAnimationFrame(animate);
}

function animate() {
	draw.drawScene(sand.sandBuffer == 0 ? sand.sandTexture0 : sand.sandTexture1);

	window.requestAnimationFrame(animate);
}

function initUserInput(canvas) {
	var down = false;
	var color = 'rgba(255, 255, 255, 1.0)';

	// create a new canvas
	painter = document.createElement('canvas');
	mask = document.createElement('canvas');

	// set dimensions
	mask.width = canvas.width;
	mask.height = canvas.height;

	painter.width = canvas.width;
	painter.height = canvas.height;

	function getMousePos(canvas, evt) {
		var rect = canvas.getBoundingClientRect();
		return {
			x: evt.clientX - rect.left,
			y: evt.clientY - rect.top
		};
	}

	function drawCanvas(canvas, mousePos, color, texture) {
		var context = canvas.getContext('2d');

		context.fillStyle = color;
		// use a rectangle because circles are antialiased
		context.fillRect(mousePos.x - 12, mousePos.y - 12, 24, 24);
	}

	function drawEvent(canvas, evt) {
		var mousePos = getMousePos(canvas, evt);

		drawCanvas(painter, mousePos, color, rectTexture);
		drawCanvas(mask, mousePos, 'rgba(255, 255, 255, 1.0)', maskTexture);

		updateInput = true;
	}

	function handleStart(evt) {
		evt.preventDefault();

		down = true;

		if (evt.shiftKey) { // wall
			color = 'rgba(127, 127, 127, 0.5)';
		} else if (evt.ctrlKey) { // empty
			color = 'rgba(0, 0, 0, 0.5)';
		} else if (evt.altKey) { // fire
			color = 'rgba(255, 0, 0, 0.1)';
		} else {
			color = 'rgba(255, 255, 255, 1.0)';

			for (var i = 0; i < radios.length; i++) {
				if (radios[i].checked) {
					var cell = sand.config.cells[radios[i].value];

					color = 'rgba(' + cell.color[0] + ', ' + cell.color[1] + ', ' + cell.color[2] + ', ' + cell.color[3].toFixed(3) + ')';

					break;
				}
			}
		}

		drawEvent(canvas, evt);
	}

	function handleEnd(evt) {
		evt.preventDefault();

		down = false;
	}

	function handleMove(evt) {
		evt.preventDefault();

		if (down) {
			drawEvent(canvas, evt);
		}
	}

	canvas.addEventListener('mousedown', handleStart, true);
	canvas.addEventListener('mouseup', handleEnd, true);
	canvas.addEventListener('mouseleave', handleEnd, true);
	canvas.addEventListener('mousemove', handleMove, true);

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
}

function updateTexture(gl, texture, canvas) {
	gl.bindTexture(gl.TEXTURE_2D, texture);
	gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
	gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
	gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, canvas);

	canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);
}

function drawInput(gl) {
	updateTexture(gl, rectTexture, painter);
	updateTexture(gl, maskTexture, mask);

	/* add user input */

	gl.useProgram(draw.program);
	
	// Draw the rect by binding the array buffer to the rect's vertices
	// array, setting attributes, and pushing it to GL.

	gl.bindBuffer(gl.ARRAY_BUFFER, draw.rectVerticesBuffer);
	gl.vertexAttribPointer(draw.aVertexPosition, 3, gl.FLOAT, false, 0, 0);

	// Set the texture coordinates attribute for the vertices.
	
	gl.bindBuffer(gl.ARRAY_BUFFER, draw.rectVerticesTextureCoordBuffer);
	gl.vertexAttribPointer(draw.aTextureCoord, 2, gl.FLOAT, false, 0, 0);

	// Specify the texture to map onto the face.
	gl.uniform1i(draw.uSampler, 0);

	// draw mask
	gl.blendFunc(gl.ZERO, gl.ONE_MINUS_SRC_ALPHA);

	// draw user input mask
	gl.activeTexture(gl.TEXTURE0);
	gl.bindTexture(gl.TEXTURE_2D, maskTexture);

	gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

	// preserve alpha
	gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);

	// draw user input
	gl.activeTexture(gl.TEXTURE0);
	gl.bindTexture(gl.TEXTURE_2D, rectTexture);

	gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

	gl.bindTexture(gl.TEXTURE_2D, null);

	// clear mask
	gl.bindFramebuffer(gl.FRAMEBUFFER, maskFrameBuffer);

	gl.clearColor(0.0, 0.0, 0.0, 0.0);  // Clear to transparent
	gl.clear(gl.COLOR_BUFFER_BIT);

	// clear user input
	gl.bindFramebuffer(gl.FRAMEBUFFER, rectFrameBuffer);

	gl.clearColor(0.0, 0.0, 0.0, 0.0);  // Clear to transparent
	gl.clear(gl.COLOR_BUFFER_BIT);
}

function updateCanvas() {
	var t0;

	if (performance) {
		t0 = performance.now();
	}

	sand.next();

	if (updateInput) {
		drawInput(draw.gl);
	}

	if (performance) {
		t1 = performance.now();

		if (t1 - t0 > frameDuration) {
			frameDuration *= 2;

			window.clearInterval(updateCanvasInterval);
			updateCanvasInterval = setInterval(updateCanvas, frameDuration);
		}
	}
}