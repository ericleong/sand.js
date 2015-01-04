'use strict';

var Draw = function(gl, rectVerticesBuffer, rectVerticesTextureCoordBuffer) {
	if (gl) {
		this.gl = gl;

		// Initialize the shaders		
		this.initShaders();

		this.rectVerticesBuffer = rectVerticesBuffer;
		this.rectVerticesTextureCoordBuffer = rectVerticesTextureCoordBuffer;
	}
}

//
// initShaders
//
// Initialize the shaders, so WebGL knows how to light our scene.
//
Draw.prototype.initShaders = function() {
	this.program = SandUtils.createProgram(this.gl, 'shader-vs-draw', 'shader-fs-draw');

	// uniforms
	this.uCells = this.gl.getUniformLocation(this.program, 'uCells');
	this.uSampler = this.gl.getUniformLocation(this.program, 'uSampler');

	// vertex attributes
	this.aVertexPosition = this.gl.getAttribLocation(this.program, 'aVertexPosition');
	this.gl.enableVertexAttribArray(this.aVertexPosition);

	this.aTextureCoord = this.gl.getAttribLocation(this.program, 'aTextureCoord');
	this.gl.enableVertexAttribArray(this.aTextureCoord);
}

Draw.prototype.drawScene = function(cellsTexture, sandTexture) {
	/* copy framebuffer to screen */

	this.gl.useProgram(this.program);

	// draw onto screen
	this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, null);

	this.gl.blendFunc(this.gl.ONE, this.gl.ZERO);
	this.gl.colorMask(true, true, true, false);

	// Draw the rect by binding the array buffer to the rect's vertices
	// array, setting attributes, and pushing it to this.gl.

	this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.rectVerticesBuffer);
	this.gl.vertexAttribPointer(this.aVertexPosition, 3, this.gl.FLOAT, false, 0, 0);

	// Set the texture coordinates attribute for the vertices.
	
	this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.rectVerticesTextureCoordBuffer);
	this.gl.vertexAttribPointer(this.aTextureCoord, 2, this.gl.FLOAT, false, 0, 0);

	// the cell color information
	this.gl.uniform1i(this.uCells, 3);

	this.gl.activeTexture(this.gl.TEXTURE3);
	this.gl.bindTexture(this.gl.TEXTURE_2D, cellsTexture);

	// the cell texture to draw
	this.gl.uniform1i(this.uSampler, 4);

	this.gl.activeTexture(this.gl.TEXTURE4);
	this.gl.bindTexture(this.gl.TEXTURE_2D, sandTexture);

	this.gl.drawArrays(this.gl.TRIANGLE_STRIP, 0, 4);

	// restore color mask
	this.gl.colorMask(true, true, true, true);
}