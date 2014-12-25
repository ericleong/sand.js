var canvas;
var gl;

// textures
var rectTexture, maskTexture;
var sandTexture0, sandTexture1;

// frame buffers
var sandBuffer;
var rectFrameBuffer, maskFrameBuffer;
var sandFrameBuffer0, sandFrameBuffer1;

// vertex/coordinate buffers
var rectVerticesBuffer;
var rectVerticesTextureCoordBuffer;

var copyProgram, advanceProgram, opaqueProgram;
var vertexPositionAttribute;
var textureCoordAttribute;

// user input
var painter;
var mask;

var down = false;
var color = 'rgba(255, 255, 255, 1.0)';

function initUserInput() {
	var canvas = document.getElementById('glcanvas');

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

		context.clearRect(0, 0, canvas.width, canvas.height);

		context.fillStyle = color;
		// use a rectangle because circles are antialiased
		context.fillRect(mousePos.x - 12, mousePos.y - 12, 24, 24);

		gl.bindTexture(gl.TEXTURE_2D, texture);
		gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
		gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
		gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, canvas);
	}

	function draw(canvas, evt) {
		var mousePos = getMousePos(canvas, evt);

		drawCanvas(painter, mousePos, color, rectTexture);
		drawCanvas(mask, mousePos, 'rgba(255, 255, 255, 1.0)', maskTexture);
	}

	canvas.addEventListener('mousedown', function(evt) {
		down = true;

		if (evt.shiftKey) {
			color = 'rgba(0, 255, 255, 0.5)';
		} else if (evt.ctrlKey) {
			color = 'rgba(0, 0, 0, 0.5)';
		} else if (evt.altKey) {
			color = 'rgba(255, 255, 0, 0.25)';
		} else {
			color = 'rgba(255, 255, 255, 1.0)';
		}

		draw(canvas, evt);
	}, true);

	canvas.addEventListener('mouseup', function(evt) {
		down = false;
	}, true);

	canvas.addEventListener('mousemove', function(evt) {
		if (down) {
			draw(canvas, evt);
		}
	}, true);
}

//
// start
//
// Called when the canvas is created to get the ball rolling.
// Figuratively, that is. There's nothing moving in this demo.
//
function start() {
	canvas = document.getElementById('glcanvas');

	initWebGL(canvas);      // Initialize the GL context
	
	// Only continue if WebGL is available and working
	
	if (gl) {
		gl.enable(gl.BLEND);
		gl.disable(gl.DEPTH_TEST);
		gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
		
		// Initialize the shaders; this is where all the lighting for the
		// vertices and so forth is established.
		
		initShaders();
		
		// Here's where we call the routine that builds all the objects
		// we'll be drawing.
		
		initBuffers();

		// Next, load and set up the textures we'll be using.

		initTextures();

		initUserInput();
	}
}

//
// initWebGL
//
// Initialize WebGL, returning the GL context or null if
// WebGL isn't available or could not be initialized.
//
function initWebGL() {
	gl = null;
	
	try {
		gl = canvas.getContext('experimental-webgl', { premultipliedAlpha: false });
	} catch(e) {
		console.log(e);
	}
	
	// If we don't have a GL context, give up now
	
	if (!gl) {
		alert('Unable to initialize WebGL. Your browser may not support it.');
	}
}

//
// initBuffers
//
// Initialize the buffers we'll need. For this demo, we just have
// one object -- a simple two-dimensional rect.
//
function initBuffers() {

	// Map the texture onto the rect's face.
	rectVerticesTextureCoordBuffer = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, rectVerticesTextureCoordBuffer);
	
	var textureCoordinates = [
		// Front
		0.0, 0.0,
		1.0, 0.0,
		0.0, 1.0,
		1.0, 1.0
	];

	gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(textureCoordinates), gl.STATIC_DRAW);
	
	// Create a buffer for the rect's vertices.
	
	rectVerticesBuffer = gl.createBuffer();
	
	// Select the rectVerticesBuffer as the one to apply vertex
	// operations to from here out.
	
	gl.bindBuffer(gl.ARRAY_BUFFER, rectVerticesBuffer);
	
	// Now create an array of vertices for the rect. Note that the Z
	// coordinate is always 0 here.
	
	var vertices = [
		-1.0, -1.0,  0.0,
		1.0, -1.0,  0.0,
		-1.0, 1.0, 0.0,
		1.0, 1.0, 0.0
	];
	
	// Now pass the list of vertices into WebGL to build the shape. We
	// do this by creating a Float32Array from the JavaScript array,
	// then use it to fill the current vertex buffer.
	
	gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);
}

//
// advance
//
// Advance the scene.
//
function advance() {
	sandBuffer = sandBuffer == 0 ? 1 : 0;

	/* advance */

	gl.useProgram(advanceProgram);
	
	vertexPositionAttribute = gl.getAttribLocation(advanceProgram, 'aVertexPosition');
	gl.enableVertexAttribArray(vertexPositionAttribute);

	textureCoordAttribute = gl.getAttribLocation(advanceProgram, 'aTextureCoord');
	gl.enableVertexAttribArray(textureCoordAttribute);

	// draw onto framebuffer
	gl.bindFramebuffer(gl.FRAMEBUFFER, sandBuffer == 0 ? sandFrameBuffer0 : sandFrameBuffer1);

	// Clear the canvas before we start drawing on it.
	gl.clearColor(0.0, 0.0, 0.0, 0.0);  // Clear to black, transparent
	gl.clear(gl.COLOR_BUFFER_BIT);

	// this fixes our problems with alpha
	// remember, we are not using alpha for transparency
	gl.blendFunc(gl.ONE, gl.ZERO);

	// Draw the rect by binding the array buffer to the rect's vertices
	// array, setting attributes, and pushing it to GL.

	gl.bindBuffer(gl.ARRAY_BUFFER, rectVerticesBuffer);
	gl.vertexAttribPointer(vertexPositionAttribute, 3, gl.FLOAT, false, 0, 0);

	// Set the texture coordinates attribute for the vertices.
	
	gl.bindBuffer(gl.ARRAY_BUFFER, rectVerticesTextureCoordBuffer);
	gl.vertexAttribPointer(textureCoordAttribute, 2, gl.FLOAT, false, 0, 0);
	
	// Specify the texture to map onto the face.
	gl.uniform1i(gl.getUniformLocation(advanceProgram, 'uSampler'), 0);
	
	gl.activeTexture(gl.TEXTURE0);
	gl.bindTexture(gl.TEXTURE_2D, sandBuffer == 0 ? sandTexture1 : sandTexture0);
	
	gl.uniform1i(gl.getUniformLocation(advanceProgram, 'uBias'), sandBuffer);

	gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

	/* add user input */

	gl.useProgram(copyProgram);
	
	vertexPositionAttribute = gl.getAttribLocation(copyProgram, 'aVertexPosition');
	gl.enableVertexAttribArray(vertexPositionAttribute);

	textureCoordAttribute = gl.getAttribLocation(copyProgram, 'aTextureCoord');
	gl.enableVertexAttribArray(textureCoordAttribute);

	// Draw the rect by binding the array buffer to the rect's vertices
	// array, setting attributes, and pushing it to GL.

	gl.bindBuffer(gl.ARRAY_BUFFER, rectVerticesBuffer);
	gl.vertexAttribPointer(vertexPositionAttribute, 3, gl.FLOAT, false, 0, 0);

	// Set the texture coordinates attribute for the vertices.
	
	gl.bindBuffer(gl.ARRAY_BUFFER, rectVerticesTextureCoordBuffer);
	gl.vertexAttribPointer(textureCoordAttribute, 2, gl.FLOAT, false, 0, 0);

	// Specify the texture to map onto the face.
	gl.uniform1i(gl.getUniformLocation(copyProgram, 'uSampler'), 0);

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

function drawScene() {
	/* copy framebuffer to screen */

	gl.useProgram(opaqueProgram);
	
	vertexPositionAttribute = gl.getAttribLocation(opaqueProgram, 'aVertexPosition');
	gl.enableVertexAttribArray(vertexPositionAttribute);

	textureCoordAttribute = gl.getAttribLocation(opaqueProgram, 'aTextureCoord');
	gl.enableVertexAttribArray(textureCoordAttribute);

	// draw onto screen
	gl.bindFramebuffer(gl.FRAMEBUFFER, null);

	gl.clearColor(0.0, 0.0, 0.0, 0.0);  // Clear to black, fully opaque
	gl.clear(gl.COLOR_BUFFER_BIT);

	gl.blendFunc(gl.ONE, gl.ZERO);

	// Draw the rect by binding the array buffer to the rect's vertices
	// array, setting attributes, and pushing it to GL.

	gl.bindBuffer(gl.ARRAY_BUFFER, rectVerticesBuffer);
	gl.vertexAttribPointer(vertexPositionAttribute, 3, gl.FLOAT, false, 0, 0);

	// Set the texture coordinates attribute for the vertices.
	
	gl.bindBuffer(gl.ARRAY_BUFFER, rectVerticesTextureCoordBuffer);
	gl.vertexAttribPointer(textureCoordAttribute, 2, gl.FLOAT, false, 0, 0);

	gl.uniform1i(gl.getUniformLocation(opaqueProgram, 'uSampler'), 0);

	gl.activeTexture(gl.TEXTURE0);
	gl.bindTexture(gl.TEXTURE_2D, sandBuffer == 0 ? sandTexture0 : sandTexture1);

	gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

	window.requestAnimationFrame(drawScene);
}

//
// initShaders
//
// Initialize the shaders, so WebGL knows how to light our scene.
//
function initShaders() {
	copyProgram = createProgram('shader-vs-copy', 'shader-fs-copy');
	opaqueProgram = createProgram('shader-vs-copy', 'shader-fs-copy-opaque');
	advanceProgram = createProgram('shader-vs-advance', 'shader-fs-advance');
}

function createProgram(vertexShaderId, fragmentShaderId) {

	var vertexShader = getShader(gl, vertexShaderId);
	var fragmentShader = getShader(gl, fragmentShaderId);
	
	// Create the shader programs
	
	var program = gl.createProgram();
	gl.attachShader(program, vertexShader);
	gl.attachShader(program, fragmentShader);
	gl.linkProgram(program);
	
	// If creating the shader program failed, alert
	
	if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
		alert('Unable to initialize the shader program.');
	}

	return program;
}

//
// getShader
//
// Loads a shader program by scouring the current document,
// looking for a script with the specified ID.
//
function getShader(gl, id) {
	var shaderScript = document.getElementById(id);
	
	// Didn't find an element with the specified ID; abort.
	
	if (!shaderScript) {
		return null;
	}
	
	// Walk through the source element's children, building the
	// shader source string.
	
	var theSource = '';
	var currentChild = shaderScript.firstChild;
	
	while(currentChild) {
		if (currentChild.nodeType == 3) {
			theSource += currentChild.textContent;
		}
		
		currentChild = currentChild.nextSibling;
	}
	
	// Now figure out what type of shader script we have,
	// based on its MIME type.
	
	var shader;
	
	if (shaderScript.type == 'x-shader/x-fragment') {
		shader = gl.createShader(gl.FRAGMENT_SHADER);
	} else if (shaderScript.type == 'x-shader/x-vertex') {
		shader = gl.createShader(gl.VERTEX_SHADER);
	} else {
		return null;  // Unknown shader type
	}
	
	// Send the source to the shader object
	
	gl.shaderSource(shader, theSource);
	
	// Compile the shader program
	
	gl.compileShader(shader);
	
	// See if it compiled successfully
	
	if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
		alert('An error occurred compiling the shaders: ' + gl.getShaderInfoLog(shader));
		return null;
	}
	
	return shader;
}

function initTextures() {
	var rectImage = new Image();
	rectImage.onload = function() { handleTextureLoaded(rectImage); }
	rectImage.src = './sand.png';
}

function initTexture(image) {
	var texture = gl.createTexture();
	gl.bindTexture(gl.TEXTURE_2D, texture);
	gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
	gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
	gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

	var framebuffer = gl.createFramebuffer();
	gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
	gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);

	return [texture, framebuffer];
}

function handleTextureLoaded(image) {
	var canvas = document.createElement('canvas');

	canvas.width = image.width;
	canvas.height = image.height;

	var context = canvas.getContext('2d');

	context.fillStyle = 'rgba(0, 0, 0, 0.50)';
	context.fillRect(0, 0, canvas.width, canvas.height);
	context.drawImage(image, 0, 0);

	var tex = initTexture(canvas);
	rectTexture = tex[0];
	rectFrameBuffer = tex[1];

	context.clearRect(0, 0, canvas.width, canvas.height);
	
	tex = initTexture(canvas);
	sandTexture0 = tex[0];
	sandFrameBuffer0 = tex[1];
	
	tex = initTexture(canvas);
	sandTexture1 = tex[0];
	sandFrameBuffer1 = tex[1];

	context.fillStyle = 'rgba(255, 255, 255, 1.0)';
	context.fillRect(0, 0, canvas.width, canvas.height);
	
	// create mask
	tex = initTexture(canvas);
	maskTexture = tex[0];
	maskFrameBuffer = tex[1];

	gl.bindTexture(gl.TEXTURE_2D, null);

	setInterval(advance, 8);

	// Set up to draw the scene periodically.
	window.requestAnimationFrame(drawScene);
}