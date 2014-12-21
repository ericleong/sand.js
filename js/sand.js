var canvas;
var gl;
var rectVerticesBuffer;
var rectVerticesTextureCoordBuffer;
var mvMatrix;
var shaderProgram;
var vertexPositionAttribute;
var textureCoordAttribute;
var perspectiveMatrix;

var IDENTITY_MATRIX = new Float32Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]);

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
		gl.clearDepth(1.0);                 // Clear everything
		gl.enable(gl.DEPTH_TEST);           // Enable depth testing
		gl.depthFunc(gl.LEQUAL);            // Near things obscure far things
		
		// Initialize the shaders; this is where all the lighting for the
		// vertices and so forth is established.
		
		initShaders();
		
		// Here's where we call the routine that builds all the objects
		// we'll be drawing.
		
		initBuffers();

		// Next, load and set up the textures we'll be using.

		initTextures();
		
		// Set up to draw the scene periodically.
		
		setInterval(drawScene, 15);
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
	}
	catch(e) {
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
	// Clear the canvas before we start drawing on it.

	gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
	
	// Draw the rect by binding the array buffer to the rect's vertices
	// array, setting attributes, and pushing it to GL.

	gl.bindBuffer(gl.ARRAY_BUFFER, rectVerticesBuffer);
	gl.vertexAttribPointer(vertexPositionAttribute, 3, gl.FLOAT, false, 0, 0);

	// Set the texture coordinates attribute for the vertices.
	
	gl.bindBuffer(gl.ARRAY_BUFFER, rectVerticesTextureCoordBuffer);
	gl.vertexAttribPointer(textureCoordAttribute, 2, gl.FLOAT, false, 0, 0);
	
	// Specify the texture to map onto the face.
	
	gl.activeTexture(gl.TEXTURE0);
	gl.bindTexture(gl.TEXTURE_2D, rectTexture);
	gl.uniform1i(gl.getUniformLocation(shaderProgram, 'uSampler'), 0);
	
	var pUniform = gl.getUniformLocation(shaderProgram, 'uPMatrix');
	gl.uniformMatrix4fv(pUniform, false, IDENTITY_MATRIX);

	var mvUniform = gl.getUniformLocation(shaderProgram, 'uMVMatrix');
	gl.uniformMatrix4fv(mvUniform, false, IDENTITY_MATRIX);

	gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
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
	rectTexture = gl.createTexture();
	rectImage = new Image();
	rectImage.onload = function() { handleTextureLoaded(rectImage, rectTexture); }
	rectImage.src = './sand.png';
}

function handleTextureLoaded(image, texture) {
	gl.bindTexture(gl.TEXTURE_2D, texture);
	gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
	gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
	gl.bindTexture(gl.TEXTURE_2D, null);
}