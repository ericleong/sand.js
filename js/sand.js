var canvas;
var gl;
var rectTexture;
var sandTexture0, sandTexture1;

var sandBuffer;
var rectFrameBuffer;
var sandFrameBuffer0, sandFrameBuffer1;

var rectVerticesBuffer;
var rectVerticesTextureCoordBuffer;
var shaderProgram;
var vertexPositionAttribute;
var textureCoordAttribute;

function initUserInput() {
	var canvas = document.getElementById('glcanvas');
	
	// create a new canvas
	var painter = document.createElement('canvas');
	var context = painter.getContext('2d');
	context.imageSmoothingEnabled = false;

	// set dimensions
	painter.width = canvas.width;
	painter.height = canvas.height;

	function getMousePos(canvas, evt) {
		var rect = canvas.getBoundingClientRect();
		return {
			x: evt.clientX - rect.left,
			y: evt.clientY - rect.top
		};
	}

	canvas.addEventListener('mousemove', function(evt) {
		var mousePos = getMousePos(canvas, evt);

		context.beginPath();
		context.arc(mousePos.x, mousePos.y, 8, 0, 2 * Math.PI, false);
		context.fillStyle = 'rgba(255, 255, 255, 1.0)';
		context.fill();

		gl.bindTexture(gl.TEXTURE_2D, rectTexture);
		gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
		gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, painter);

		context.clearRect(0, 0, painter.width, painter.height);
	}, false);
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
		gl.clearColor(0.0, 0.0, 0.0, 1.0);  // Clear to black, fully opaque
		gl.enable(gl.BLEND);
		gl.disable(gl.DEPTH_TEST);
		gl.blendFunc(gl.SRC_ALPHA, gl.ONE);
		
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
		gl = canvas.getContext('experimental-webgl');
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
// drawScene
//
// Draw the scene.
//
function drawScene() {
	sandBuffer = sandBuffer == 0 ? 1 : 0;

	gl.bindFramebuffer(gl.FRAMEBUFFER, sandBuffer == 0 ? sandFrameBuffer0 : sandFrameBuffer1);

	// Clear the canvas before we start drawing on it.
	gl.clear(gl.COLOR_BUFFER_BIT);

	// Draw the rect by binding the array buffer to the rect's vertices
	// array, setting attributes, and pushing it to GL.

	gl.bindBuffer(gl.ARRAY_BUFFER, rectVerticesBuffer);
	gl.vertexAttribPointer(vertexPositionAttribute, 3, gl.FLOAT, false, 0, 0);

	// Set the texture coordinates attribute for the vertices.
	
	gl.bindBuffer(gl.ARRAY_BUFFER, rectVerticesTextureCoordBuffer);
	gl.vertexAttribPointer(textureCoordAttribute, 2, gl.FLOAT, false, 0, 0);
	
	// Specify the texture to map onto the face.
	gl.uniform1i(gl.getUniformLocation(shaderProgram, 'uSampler'), 0);
	
	gl.activeTexture(gl.TEXTURE0);
	gl.bindTexture(gl.TEXTURE_2D, sandBuffer == 0 ? sandTexture1 : sandTexture0);
	
	gl.uniform1i(gl.getUniformLocation(shaderProgram, 'uAdvance'), 1);

	gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

	// draw user input
	gl.activeTexture(gl.TEXTURE0);
	gl.bindTexture(gl.TEXTURE_2D, rectTexture);

	gl.uniform1i(gl.getUniformLocation(shaderProgram, 'uAdvance'), 0);

	gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

	// clear user input
	gl.bindFramebuffer(gl.FRAMEBUFFER, rectFrameBuffer);

	gl.clear(gl.COLOR_BUFFER_BIT);

	// draw onto screen
	gl.bindFramebuffer(gl.FRAMEBUFFER, null);

	gl.clear(gl.COLOR_BUFFER_BIT);

	// Draw the rect by binding the array buffer to the rect's vertices
	// array, setting attributes, and pushing it to GL.

	gl.bindBuffer(gl.ARRAY_BUFFER, rectVerticesBuffer);
	gl.vertexAttribPointer(vertexPositionAttribute, 3, gl.FLOAT, false, 0, 0);

	// Set the texture coordinates attribute for the vertices.
	
	gl.bindBuffer(gl.ARRAY_BUFFER, rectVerticesTextureCoordBuffer);
	gl.vertexAttribPointer(textureCoordAttribute, 2, gl.FLOAT, false, 0, 0);

	gl.uniform1i(gl.getUniformLocation(shaderProgram, 'uSampler'), 0);

	gl.activeTexture(gl.TEXTURE0);
	gl.bindTexture(gl.TEXTURE_2D, sandBuffer == 0 ? sandTexture0 : sandTexture1);

	gl.uniform1i(gl.getUniformLocation(shaderProgram, 'uAdvance'), 0);

	gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

	window.requestAnimationFrame(drawScene);
}

//
// initShaders
//
// Initialize the shaders, so WebGL knows how to light our scene.
//
function initShaders() {
	var fragmentShader = getShader(gl, 'shader-fs');
	var vertexShader = getShader(gl, 'shader-vs');
	
	// Create the shader program
	
	shaderProgram = gl.createProgram();
	gl.attachShader(shaderProgram, vertexShader);
	gl.attachShader(shaderProgram, fragmentShader);
	gl.linkProgram(shaderProgram);
	
	// If creating the shader program failed, alert
	
	if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
		alert('Unable to initialize the shader program.');
	}
	
	gl.useProgram(shaderProgram);
	
	vertexPositionAttribute = gl.getAttribLocation(shaderProgram, 'aVertexPosition');
	gl.enableVertexAttribArray(vertexPositionAttribute);

	textureCoordAttribute = gl.getAttribLocation(shaderProgram, 'aTextureCoord');
	gl.enableVertexAttribArray(textureCoordAttribute);
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
	rectImage = new Image();
	rectImage.onload = function() { handleTextureLoaded(rectImage); }
	rectImage.src = './sand.png';
}

function initTexture(image) {
	var texture = gl.createTexture();
	gl.bindTexture(gl.TEXTURE_2D, texture);
	gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
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
	var tex = initTexture(image);
	rectTexture = tex[0];
	rectFrameBuffer = tex[1];
	
	tex = initTexture(image);
	sandTexture0 = tex[0];
	sandFrameBuffer0 = tex[1];
	
	tex = initTexture(image);
	sandTexture1 = tex[0];
	sandFrameBuffer1 = tex[1];

	gl.bindTexture(gl.TEXTURE_2D, null);

	// Set up to draw the scene periodically.
	window.requestAnimationFrame(drawScene);
}