var gl;

// textures
var sandTexture0, sandTexture1;
var cellsTexture, rulesTexture;

// frame buffers
var sandBuffer;
var sandFrameBuffer0, sandFrameBuffer1;

// vertex/coordinate buffers
var rectVerticesBuffer;
var rectVerticesTextureCoordBuffer;

var advanceProgram;

// vertex attrib locations
var aAdvanceVertexPosition;
var aAdvanceTextureCoord;

// uniform locations
var uAdvanceSampler, uAdvanceCells, uAdvanceRules;
var uBias;

//
// init
//
function init(canvas, config) {
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

		// Load and set up the textures we'll be using.

		initTextures(canvas, config);
	}
}

//
// initWebGL
//
// Initialize WebGL, returning the GL context or null if
// WebGL isn't available or could not be initialized.
//
function initWebGL(canvas) {
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
	gl.vertexAttribPointer(aAdvanceVertexPosition, 3, gl.FLOAT, false, 0, 0);

	// Set the texture coordinates attribute for the vertices.
	
	gl.bindBuffer(gl.ARRAY_BUFFER, rectVerticesTextureCoordBuffer);
	gl.vertexAttribPointer(aAdvanceTextureCoord, 2, gl.FLOAT, false, 0, 0);
	
	// Specify the texture to map onto the face.
	gl.uniform1i(uAdvanceSampler, 0);
	
	gl.activeTexture(gl.TEXTURE0);
	gl.bindTexture(gl.TEXTURE_2D, sandBuffer == 0 ? sandTexture1 : sandTexture0);
	
	// Pass cells texture
	gl.uniform1i(uAdvanceCells, 1);
	
	gl.activeTexture(gl.TEXTURE1);
	gl.bindTexture(gl.TEXTURE_2D, cellsTexture);
	
	// Pass cells texture
	gl.uniform1i(uAdvanceRules, 2);
	
	gl.activeTexture(gl.TEXTURE2);
	gl.bindTexture(gl.TEXTURE_2D, rulesTexture);
	
	gl.uniform1i(uBias, sandBuffer);

	gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
}

//
// initShaders
//
function initShaders() {
	advanceProgram = SandUtils.createProgram('shader-vs-advance', 'shader-fs-advance');

	// uniforms
	uAdvanceSampler = gl.getUniformLocation(advanceProgram, 'uSampler');
	uAdvanceCells = gl.getUniformLocation(advanceProgram, 'uCells');
	uAdvanceRules = gl.getUniformLocation(advanceProgram, 'uRules');
	uBias = gl.getUniformLocation(advanceProgram, 'uBias');

	// vertex attributes
	aAdvanceVertexPosition = gl.getAttribLocation(advanceProgram, 'aVertexPosition');
	gl.enableVertexAttribArray(aAdvanceVertexPosition);

	aAdvanceTextureCoord = gl.getAttribLocation(advanceProgram, 'aTextureCoord');
	gl.enableVertexAttribArray(aAdvanceTextureCoord);
}

function initTextures(canvas, config) {
	var tempCanvas = document.createElement('canvas');

	tempCanvas.width = canvas.width;
	tempCanvas.height = canvas.height;

	var context = tempCanvas.getContext('2d');

	// keep buffers empty
	context.clearRect(0, 0, canvas.width, canvas.height);
	
	tex = SandUtils.initTextureWithFrameBuffer(canvas);
	sandTexture0 = tex[0];
	sandFrameBuffer0 = tex[1];
	
	tex = SandUtils.initTextureWithFrameBuffer(canvas);
	sandTexture1 = tex[0];
	sandFrameBuffer1 = tex[1];

	// load config
	var generator = new lutGenerator();
	generator.parse(config);

	cellsTexture = SandUtils.initTexture(generator.cellsData, false);
	rulesTexture = SandUtils.initTexture(generator.rulesData, false);

	gl.bindTexture(gl.TEXTURE_2D, null);
}