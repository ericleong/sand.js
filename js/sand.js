'use strict';

//
// init
//
var Sand = function(canvas, config) {
	var gl = this.initWebGL(canvas);      // Initialize the GL context
	
	// Only continue if WebGL is available and working
	
	if (gl) {
		this.gl = gl;

		this.gl.enable(this.gl.BLEND);
		this.gl.disable(this.gl.DEPTH_TEST);
		this.gl.blendFunc(this.gl.SRC_ALPHA, this.gl.ONE_MINUS_SRC_ALPHA);
		
		// Initialize the shaders; this is where all the lighting for the
		// vertices and so forth is established.
		
		this.initShaders(canvas);
		
		// Here's where we call the routine that builds all the objects
		// we'll be drawing.
		
		this.initBuffers();

		// Load and set up the textures we'll be using.

		this.initTextures(canvas, config);
	}
}

//
// initWebGL
//
// Initialize WebGL, returning the GL context or null if
// WebGL isn't available or could not be initialized.
//
Sand.prototype.initWebGL = function(canvas) {
	var gl = null;
	
	try {
		gl = canvas.getContext('experimental-webgl', { 
			alpha: false,
			premultipliedAlpha: false
		});
	} catch(e) {
		console.log(e);
	}
	
	// If we don't have a GL context, give up now
	
	if (!gl) {
		alert('Unable to initialize WebGL. Your browser may not support it.');
	}

	return gl;
}

//
// initBuffers
//
// Initialize the buffers we'll need. For this demo, we just have
// one object -- a simple two-dimensional rect.
//
Sand.prototype.initBuffers = function() {

	// Map the texture onto the rect's face.
	this.rectVerticesTextureCoordBuffer = this.gl.createBuffer();
	this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.rectVerticesTextureCoordBuffer);
	
	var textureCoordinates = [
		// Front
		0.0, 0.0,
		1.0, 0.0,
		0.0, 1.0,
		1.0, 1.0
	];

	this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(textureCoordinates), this.gl.STATIC_DRAW);
	
	// Create a buffer for the rect's vertices.
	
	this.rectVerticesBuffer = this.gl.createBuffer();
	
	// Select the this.rectVerticesBuffer as the one to apply vertex
	// operations to from here out.
	
	this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.rectVerticesBuffer);
	
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
	
	this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(vertices), this.gl.STATIC_DRAW);
}

// this is used externally
Sand.prototype.bindFrameBuffer = function() {
	// draw onto framebuffer
	this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, this.sandBuffer == 0 ? this.sandFrameBuffer0 : this.sandFrameBuffer1);
}

//
// next
//
// Advance the scene.
//
Sand.prototype.next = function() {
	if (this.programLeft === undefined || this.programRight === undefined) {
		return;
	}

	this.sandBuffer = this.sandBuffer == 0 ? 1 : 0;

	this.gl.useProgram(this.sandBuffer == 0 ? this.programLeft : this.programRight);

	// set the correct framebuffer
	this.bindFrameBuffer();

	// this fixes our problems with alpha
	// remember, we are not using alpha for transparency
	this.gl.blendFunc(this.gl.ONE, this.gl.ZERO);

	// Draw the rect by binding the array buffer to the rect's vertices
	// array, setting attributes, and pushing it to this.GL.

	this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.rectVerticesBuffer);
	this.gl.vertexAttribPointer(this.sandBuffer == 0 ? this.aVertexPositionLeft : this.aVertexPositionRight, 3, this.gl.FLOAT, false, 0, 0);

	// Set the texture coordinates attribute for the vertices.
	
	this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.rectVerticesTextureCoordBuffer);
	this.gl.vertexAttribPointer(this.sandBuffer == 0 ? this.aTextureCoordLeft : this.aTextureCoordRight, 2, this.gl.FLOAT, false, 0, 0);
	
	// Specify the texture to map onto the face.
	this.gl.uniform1i(this.sandBuffer == 0 ? this.uSamplerLeft : this.uSamplerRight, this.sandBuffer == 0 ? 1 : 0);
	
	this.gl.activeTexture(this.sandBuffer == 0 ? this.gl.TEXTURE1 : this.gl.TEXTURE0);
	this.gl.bindTexture(this.gl.TEXTURE_2D, this.sandBuffer == 0 ? this.sandTexture1 : this.sandTexture0);
	
	// Pass rules texture
	this.gl.uniform1i(this.sandBuffer == 0 ? this.uRulesLeft : this.uRulesRight, 2);
	
	this.gl.activeTexture(this.gl.TEXTURE2);
	this.gl.bindTexture(this.gl.TEXTURE_2D, this.rulesTexture);

	this.gl.drawArrays(this.gl.TRIANGLE_STRIP, 0, 4);
}

//
// initShaders
//
Sand.prototype.initShaders = function(canvas) {

	/* left bias */
	this.programLeft = SandUtils.createProgram(this.gl, 'shader-vs-sand-left', 'shader-fs-sand-left');

	// vertex shader uniforms
	var uSize = this.gl.getUniformLocation(this.programLeft, 'uSize');

	// set the size of the canvas
	this.gl.useProgram(this.programLeft);
	this.gl.uniform2fv(uSize, [canvas.width, canvas.height]);

	// fragment shader uniforms
	this.uSamplerLeft = this.gl.getUniformLocation(this.programLeft, 'uSampler');
	this.uRulesLeft = this.gl.getUniformLocation(this.programLeft, 'uRules');

	// vertex attributes
	this.aVertexPositionLeft = this.gl.getAttribLocation(this.programLeft, 'aVertexPosition');
	this.gl.enableVertexAttribArray(this.aVertexPositionLeft);

	this.aTextureCoordLeft = this.gl.getAttribLocation(this.programLeft, 'aTextureCoord');
	this.gl.enableVertexAttribArray(this.aTextureCoordLeft);

	/* right bias */
	this.programRight = SandUtils.createProgram(this.gl, 'shader-vs-sand-right', 'shader-fs-sand-right');

	// vertex shader uniforms
	var uSize = this.gl.getUniformLocation(this.programRight, 'uSize');

	// set the size of the canvas
	this.gl.useProgram(this.programRight);
	this.gl.uniform2fv(uSize, [canvas.width, canvas.height]);

	// fragment shader uniforms
	this.uSamplerRight = this.gl.getUniformLocation(this.programRight, 'uSampler');
	this.uRulesRight = this.gl.getUniformLocation(this.programRight, 'uRules');

	// vertex attributes
	this.aVertexPositionRight = this.gl.getAttribLocation(this.programRight, 'aVertexPosition');
	this.gl.enableVertexAttribArray(this.aVertexPositionRight);

	this.aTextureCoordRight = this.gl.getAttribLocation(this.programRight, 'aTextureCoord');
	this.gl.enableVertexAttribArray(this.aTextureCoordRight);
}

Sand.prototype.initTextures = function(canvas, config) {
	var tex = SandUtils.initTextureWithFrameBuffer(this.gl, canvas);
	this.sandTexture0 = tex[0];
	this.sandFrameBuffer0 = tex[1];
	
	tex = SandUtils.initTextureWithFrameBuffer(this.gl, canvas);
	this.sandTexture1 = tex[0];
	this.sandFrameBuffer1 = tex[1];

	this.loadConfig(config);

	this.gl.bindTexture(this.gl.TEXTURE_2D, null);
}

Sand.prototype.loadConfig = function(config) {
	// does not reset

	this.config = this.config === undefined ? new Config() : this.config;

	this.config.parse(config);

	this.cellsTexture = SandUtils.initTexture(this.gl, this.config.cellsData, false);
	this.rulesTexture = SandUtils.initTexture(this.gl, this.config.rulesData, false);

	this.gl.bindTexture(this.gl.TEXTURE_2D, null);
}