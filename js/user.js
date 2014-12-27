// textures
var rectTexture, maskTexture;

// frame buffers
var rectFrameBuffer, maskFrameBuffer;

// draw input hint
var updateInput = false;

var drawer;

function start() {
	var canvas = document.getElementById('glcanvas');
	var config = document.getElementById('config').textContent;

	init(canvas, config);

	if (gl) {
		drawer = new draw(gl, rectVerticesBuffer, rectVerticesTextureCoordBuffer);

		var rectImage = new Image();
		rectImage.onload = function() { handleTextureLoaded(rectImage); }
		rectImage.src = './sand.png';

		initUserInput(canvas);
	}
}

function handleTextureLoaded(image) {
	var canvas = document.createElement('canvas');

	canvas.width = image.width;
	canvas.height = image.height;

	var context = canvas.getContext('2d');

	// 'empty' has a density of 0.5
	context.fillStyle = 'rgba(0, 0, 0, 0.5)';
	context.fillRect(0, 0, canvas.width, canvas.height);
	context.drawImage(image, 0, 0);

	var tex = SandUtils.initTextureWithFrameBuffer(canvas);
	rectTexture = tex[0];
	rectFrameBuffer = tex[1];

	// create mask, draw the entire image
	context.fillStyle = 'rgba(255, 255, 255, 1.0)';
	context.fillRect(0, 0, canvas.width, canvas.height);

	tex = SandUtils.initTextureWithFrameBuffer(canvas);
	maskTexture = tex[0];
	maskFrameBuffer = tex[1];

	gl.bindTexture(gl.TEXTURE_2D, null);

	// tell the engine to update the buffers with input
	updateInput = true;

	setInterval(engine, 8);

	// Set up to draw the scene periodically.
	window.requestAnimationFrame(animate);	
}

function animate() {
	drawer.drawScene(sandBuffer == 0 ? sandTexture0 : sandTexture1);

	window.requestAnimationFrame(animate);
}

function initUserInput(canvas) {
	var down = false;
	var color = 'rgba(255, 255, 255, 1.0)';

	// create a new canvas
	var painter = document.createElement('canvas');
	var mask = document.createElement('canvas');

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

		context.clearRect(0, 0, canvas.width, canvas.height);

		context.fillStyle = color;
		// use a rectangle because circles are antialiased
		context.fillRect(mousePos.x - 12, mousePos.y - 12, 24, 24);

		gl.bindTexture(gl.TEXTURE_2D, texture);
		gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
		gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
		gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, canvas);
		gl.bindTexture(gl.TEXTURE_2D, null);
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
		} else { // sand
			color = 'rgba(255, 255, 255, 1.0)';
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

	canvas.addEventListener("touchstart", handleStart, true);
	canvas.addEventListener("touchend", handleEnd, true);
	canvas.addEventListener("touchcancel", handleEnd, true);
	canvas.addEventListener("touchleave", handleEnd, true);
	canvas.addEventListener("touchmove", handleMove, true);
}

function drawInput() {
	/* add user input */

	gl.useProgram(drawer.program);
	
	// Draw the rect by binding the array buffer to the rect's vertices
	// array, setting attributes, and pushing it to GL.

	gl.bindBuffer(gl.ARRAY_BUFFER, drawer.rectVerticesBuffer);
	gl.vertexAttribPointer(drawer.aVertexPosition, 3, gl.FLOAT, false, 0, 0);

	// Set the texture coordinates attribute for the vertices.
	
	gl.bindBuffer(gl.ARRAY_BUFFER, drawer.rectVerticesTextureCoordBuffer);
	gl.vertexAttribPointer(drawer.aTextureCoord, 2, gl.FLOAT, false, 0, 0);

	// Specify the texture to map onto the face.
	gl.uniform1i(drawer.uSampler, 0);

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

	// clear mask
	gl.bindFramebuffer(gl.FRAMEBUFFER, maskFrameBuffer);

	gl.clearColor(0.0, 0.0, 0.0, 0.0);  // Clear to transparent
	gl.clear(gl.COLOR_BUFFER_BIT);

	// clear user input
	gl.bindFramebuffer(gl.FRAMEBUFFER, rectFrameBuffer);

	gl.clearColor(0.0, 0.0, 0.0, 0.0);  // Clear to transparent
	gl.clear(gl.COLOR_BUFFER_BIT);
}

function engine() {
	advance();

	if (updateInput) {
		drawInput();
	}
}