'use strict';

var Input = function(draw) {
	if (draw.gl) {
		this.draw = draw;
		this.gl = draw.gl;

		// Initialize the shaders
		this.initShaders();

		// copy the buffers
		this.rectVerticesBuffer = draw.rectVerticesBuffer;
		this.rectVerticesTextureCoordBuffer = draw.rectVerticesTextureCoordBuffer;

		// create a new canvas
		this.inputCanvas = document.createElement('canvas');
		this.maskCanvas = document.createElement('canvas');

		// set dimensions
		this.maskCanvas.width = this.gl.canvas.width;
		this.maskCanvas.height = this.gl.canvas.height;

		this.inputCanvas.width = this.gl.canvas.width;
		this.inputCanvas.height = this.gl.canvas.height;

		this.initTextures(this.inputCanvas, this.maskCanvas);
	}
}

//
// initShaders
//
// Initialize the shaders, so WebGL knows how to light our scene.
//
Input.prototype.initShaders = function() {
	this.program = SandUtils.createProgram(this.gl, 'shader-vs-draw', 'shader-fs-copy');

	// uniforms
	this.uSampler = this.gl.getUniformLocation(this.program, 'uSampler');

	// vertex attributes
	this.aVertexPosition = this.gl.getAttribLocation(this.program, 'aVertexPosition');
	this.gl.enableVertexAttribArray(this.aVertexPosition);

	this.aTextureCoord = this.gl.getAttribLocation(this.program, 'aTextureCoord');
	this.gl.enableVertexAttribArray(this.aTextureCoord);
}

Input.prototype.initTextures = function(inputCanvas, maskCanvas) {
	var tex = SandUtils.initTextureWithFrameBuffer(this.gl, inputCanvas);
	this.inputTexture = tex[0];
	this.inputFrameBuffer = tex[1];

	tex = SandUtils.initTextureWithFrameBuffer(this.gl, maskCanvas);
	this.maskTexture = tex[0];
	this.maskFrameBuffer = tex[1];

	this.gl.bindTexture(this.gl.TEXTURE_2D, null);
}

Input.prototype.updateTexture = function(texture, canvas) {
	this.gl.bindTexture(this.gl.TEXTURE_2D, texture);
	this.gl.pixelStorei(this.gl.UNPACK_FLIP_Y_WEBGL, true);
	this.gl.pixelStorei(this.gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
	this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.RGBA, this.gl.RGBA, this.gl.UNSIGNED_BYTE, canvas);

	canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);
}

Input.prototype.drawInput = function() {
	// this relies on the current framebuffer to be set to the current sand buffer

	this.updateTexture(this.inputTexture, this.inputCanvas);
	this.updateTexture(this.maskTexture, this.maskCanvas);

	/* add user input */

	this.gl.useProgram(this.program);
	
	// Draw the rect by binding the array buffer to the rect's vertices
	// array, setting attributes, and pushing it to GL.

	this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.rectVerticesBuffer);
	this.gl.vertexAttribPointer(this.aVertexPosition, 3, this.gl.FLOAT, false, 0, 0);

	// Set the texture coordinates attribute for the vertices.
	
	this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.rectVerticesTextureCoordBuffer);
	this.gl.vertexAttribPointer(this.aTextureCoord, 2, this.gl.FLOAT, false, 0, 0);

	/* mask */

	// Specify the texture to use.
	this.gl.uniform1i(this.uSampler, 5);

	// draw mask
	this.gl.blendFunc(this.gl.ZERO, this.gl.ONE_MINUS_SRC_ALPHA);

	// draw user input mask
	this.gl.activeTexture(this.gl.TEXTURE5);
	this.gl.bindTexture(this.gl.TEXTURE_2D, this.maskTexture);

	this.gl.drawArrays(this.gl.TRIANGLE_STRIP, 0, 4);

	/* input */

	// Specify the texture to use.
	this.gl.uniform1i(this.uSampler, 6);

	// preserve alpha
	this.gl.blendFunc(this.gl.ONE, this.gl.ONE_MINUS_SRC_ALPHA);

	// draw user input
	this.gl.activeTexture(this.gl.TEXTURE6);
	this.gl.bindTexture(this.gl.TEXTURE_2D, this.inputTexture);

	this.gl.drawArrays(this.gl.TRIANGLE_STRIP, 0, 4);

	this.gl.bindTexture(this.gl.TEXTURE_2D, null);

	// clear mask
	this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, this.maskFrameBuffer);

	this.gl.clearColor(0.0, 0.0, 0.0, 0.0);  // Clear to transparent
	this.gl.clear(this.gl.COLOR_BUFFER_BIT);

	// clear user input
	this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, this.inputFrameBuffer);

	this.gl.clearColor(0.0, 0.0, 0.0, 0.0);  // Clear to transparent
	this.gl.clear(this.gl.COLOR_BUFFER_BIT);
}

// draws the mask to the screen with the specified color
Input.prototype.drawColor = function(r, g, b, a) {
	// this relies on the current framebuffer to be set to the current sand buffer

	this.updateTexture(this.maskTexture, this.maskCanvas);

	/* add user input */

	this.gl.useProgram(this.program);
	
	// Draw the rect by binding the array buffer to the rect's vertices
	// array, setting attributes, and pushing it to GL.

	this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.rectVerticesBuffer);
	this.gl.vertexAttribPointer(this.aVertexPosition, 3, this.gl.FLOAT, false, 0, 0);

	// Set the texture coordinates attribute for the vertices.
	
	this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.rectVerticesTextureCoordBuffer);
	this.gl.vertexAttribPointer(this.aTextureCoord, 2, this.gl.FLOAT, false, 0, 0);

	/* mask */

	// Specify the texture to use.
	this.gl.uniform1i(this.uSampler, 5);

	// draw mask
	this.gl.blendFunc(this.gl.ZERO, this.gl.ONE_MINUS_SRC_ALPHA);

	// draw user input mask
	this.gl.activeTexture(this.gl.TEXTURE5);
	this.gl.bindTexture(this.gl.TEXTURE_2D, this.maskTexture);

	this.gl.drawArrays(this.gl.TRIANGLE_STRIP, 0, 4);

	// draw the color we want
	this.gl.blendFuncSeparate(this.gl.CONSTANT_COLOR, this.gl.ONE_MINUS_SRC_ALPHA, this.gl.CONSTANT_ALPHA, this.gl.ONE_MINUS_SRC_ALPHA);
	this.gl.blendColor(r, g, b, a);

	this.gl.drawArrays(this.gl.TRIANGLE_STRIP, 0, 4);

	// clear mask
	this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, this.maskFrameBuffer);

	this.gl.clearColor(0.0, 0.0, 0.0, 0.0);  // Clear to transparent
	this.gl.clear(this.gl.COLOR_BUFFER_BIT);
}