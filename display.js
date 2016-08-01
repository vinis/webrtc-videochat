//add keyboard callbacks
document.addEventListener("keydown", function(e){
	if(e.keyCode == 13){toggleFullScreen();}//ENTER
	else if(e.keyCode == 67){showCheckerBoard = (showCheckerBoard+1)%((isLeftRightTarget>0||isTopBottomTarget>0)?4:2);}//C
	else if(e.keyCode == 72){applyHomography = (applyHomography > 0) ? 0 : 1;}//H
	else if(e.keyCode == 83){swapLeftRight = (swapLeftRight > 0) ? 0 : 1;}//S
	else if(e.keyCode == 76){document.getElementById("loadHomography").click();}//L
	//console.log(e.keyCode);
}, false);

var video = document.getElementById("video");
var isPlaying = false;
video.addEventListener('canplay', function(){
	if(!isPlaying)
	{
		//start the game loop
		streamFeed();
		isPlaying = true;
	}
});

//initialize webGL
var canvas = document.getElementById("display");
var gl;
try
{
	gl = canvas.getContext("experimental-webgl");
}catch(e){}
if(!gl)
{
	alert("Could not initialise WebGL!");
}
gl.clearColor(0.0, 0.0, 0.2, 1.0);
updateWindowSize();

//create the quad texture buffer
var squareVertexPositionBuffer = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, squareVertexPositionBuffer);
vertices = [
	 1.0,  1.0,  0.0,
	-1.0,  1.0,  0.0,
	 1.0, -1.0,  0.0,
	-1.0, -1.0,  0.0
];
gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);
squareVertexPositionBuffer.itemSize = 3;
squareVertexPositionBuffer.numItems = 4;

//create the shader
var fragmentShader = getShader(gl, "fragmentShader");
var vertexShader = getShader(gl, "vertexShader");
shaderProgram = gl.createProgram();
gl.attachShader(shaderProgram, vertexShader);
gl.attachShader(shaderProgram, fragmentShader);
gl.linkProgram(shaderProgram);
if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS))
{
	alert("Could not initialise shaders");
}
gl.useProgram(shaderProgram);
shaderProgram.vertexPositionAttribute = gl.getAttribLocation(shaderProgram, "position");
gl.enableVertexAttribArray(shaderProgram.vertexPositionAttribute);
shaderProgram.showCheckerBoard = gl.getUniformLocation(shaderProgram, "showCheckerBoard");
shaderProgram.applyHomography = gl.getUniformLocation(shaderProgram, "applyHomography");
shaderProgram.swapLeftRight = gl.getUniformLocation(shaderProgram, "swapLeftRight");
shaderProgram.maskWhite = gl.getUniformLocation(shaderProgram, "maskWhite");
shaderProgram.h1 = gl.getUniformLocation(shaderProgram, "h1");
shaderProgram.h2 = gl.getUniformLocation(shaderProgram, "h2");
shaderProgram.isTopBottomSource = gl.getUniformLocation(shaderProgram, "isTopBottomSource");
shaderProgram.isLeftRightSource = gl.getUniformLocation(shaderProgram, "isLeftRightSource");
shaderProgram.isTopBottomTarget = gl.getUniformLocation(shaderProgram, "isTopBottomTarget");
shaderProgram.isLeftRightTarget = gl.getUniformLocation(shaderProgram, "isLeftRightTarget");
shaderProgram.sourceDimension = gl.getUniformLocation(shaderProgram, "sourceDimension");
shaderProgram.targetDimension = gl.getUniformLocation(shaderProgram, "targetDimension");
shaderProgram.calibX = gl.getUniformLocation(shaderProgram, "calibX");
shaderProgram.calibY = gl.getUniformLocation(shaderProgram, "calibY");

//create the video texture
var videoTexture = gl.createTexture();
gl.bindTexture(gl.TEXTURE_2D, videoTexture);
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

//set the initial shader variables
var homography1 = new Float32Array(9);
homography1[0] = 1.0;	homography1[3] = 0.0;	homography1[6] = 0.0;	
homography1[1] = 0.0;	homography1[4] = 1.0;	homography1[7] = 0.0;	
homography1[2] = 0.0;	homography1[5] = 0.0;	homography1[8] = 1.0;
var homography2 = new Float32Array(9);
homography2[0] = 1.0;	homography2[3] = 0.0;	homography2[6] = 0.0;	
homography2[1] = 0.0;	homography2[4] = 1.0;	homography2[7] = 0.0;	
homography2[2] = 0.0;	homography2[5] = 0.0;	homography2[8] = 1.0;
var screenDimension = new Float32Array(2);
screenDimension[0] = canvas.width;	screenDimension[1] = canvas.height;	
var videoDimension = new Float32Array(2);
videoDimension[0] = video.width;	videoDimension[1] = video.height;
var showCheckerBoard = 0;	
var applyHomography = 0;
var swapLeftRight = 0;
var isTopBottomSource = 0;	
var isLeftRightSource = 0;
var isTopBottomTarget = 0;
var isLeftRightTarget = 0;
var calibX = new Float32Array(4);
calibX[0] = 100;
calibX[1] = 300;
calibX[2] = 1000;
calibX[3] = 500;
var calibY = new Float32Array(4);
calibY[0] = 1000;
calibY[1] = 300;
calibY[2] = 1300;
calibY[3] = 1400;
gl.uniform1i(shaderProgram.showCheckerBoard, showCheckerBoard);
gl.uniform1i(shaderProgram.applyHomography, applyHomography);
gl.uniform1i(shaderProgram.swapLeftRight, swapLeftRight);
var maskThresh = parseFloat(document.InputForm.WhiteMasking.value);
if(isNaN(maskThresh)){maskThresh = 0;}
gl.uniform1f(shaderProgram.maskWhite,maskThresh);
gl.uniformMatrix3fv(shaderProgram.h1, false, homography1);
gl.uniformMatrix3fv(shaderProgram.h2, false, homography2);
gl.uniform1i(shaderProgram.isTopBottomSource, isTopBottomSource);
gl.uniform1i(shaderProgram.isLeftRightSource, isLeftRightSource);
gl.uniform1i(shaderProgram.isTopBottomTarget, isTopBottomTarget);
gl.uniform1i(shaderProgram.isLeftRightTarget, isLeftRightTarget);
gl.uniform2fv(shaderProgram.sourceDimension, screenDimension);
gl.uniform2fv(shaderProgram.targetDimension, videoDimension);
gl.uniform4fv(shaderProgram.calibX, calibX);
gl.uniform4fv(shaderProgram.calibY, calibY);

//create a shim for requesting frames
window.requestAnimationFrame || ( window.requestAnimationFrame = window.webkitRequestAnimationFrame || window.mozRequestAnimationFrame || window.oRequestAnimationFrame || window.msRequestAnimationFrame || function( callback ){window.setTimeout(callback, 1000 / 60);} );

//set the callback for the file loader drag and drop
document.getElementById("loadHomography").addEventListener('change', loadHomography, false);

///////////////////
//Load Homography//
///////////////////

function loadHomography(event)
{
	if(event.target.files.length>0)
	{
		console.log('Loading ' + event.target.files[0].name);
		var reader = new FileReader();
		reader.onload = (function(theFile){return function(e) {
			var floats = new Float32Array(e.target.result.split(/\s+/).map(parseFloat));
			if(floats.length>=18)
			{
				homography1 = floats.subarray(0,9);
				homography2 = floats.subarray(9,18);
			}
          		console.log(JSON.stringify(homography1));
			console.log(JSON.stringify(homography2));
		};})(event.target.files[0]);
		reader.readAsText(event.target.files[0]);
	}
	applyHomography = 1;
}

/////////////
//game loop//
/////////////

//is started when a stream is available in assign Stream
function streamFeed()
{
	requestAnimationFrame(streamFeed);
	updateWindowSize();

	//update uniforms
	screenDimension[0] = canvas.width;	screenDimension[1] = canvas.height;	
	videoDimension[0] = video.videoWidth;	videoDimension[1] = video.videoHeight;
	gl.uniform1i(shaderProgram.showCheckerBoard, showCheckerBoard);
	gl.uniform1i(shaderProgram.applyHomography, applyHomography);
	gl.uniform1i(shaderProgram.swapLeftRight, swapLeftRight);
	maskThresh = parseFloat(document.InputForm.WhiteMasking.value);
	if(isNaN(maskThresh)){maskThresh = 0;}
	gl.uniform1f(shaderProgram.maskWhite,maskThresh);
	gl.uniformMatrix3fv(shaderProgram.h1, false, homography1);
	gl.uniformMatrix3fv(shaderProgram.h2, false, homography2);
	gl.uniform1i(shaderProgram.isTopBottomSource, isTopBottomSource);
	gl.uniform1i(shaderProgram.isLeftRightSource, isLeftRightSource);
	gl.uniform1i(shaderProgram.isTopBottomTarget, isTopBottomTarget);
	gl.uniform1i(shaderProgram.isLeftRightTarget, isLeftRightTarget);
	gl.uniform2fv(shaderProgram.sourceDimension, videoDimension);
	gl.uniform2fv(shaderProgram.targetDimension, screenDimension);
	gl.uniform4fv(shaderProgram.calibX, calibX);
	gl.uniform4fv(shaderProgram.calibY, calibY);

	//update the texture
	gl.activeTexture(gl.TEXTURE0);
	gl.bindTexture(gl.TEXTURE_2D, videoTexture);
	gl.uniform1i(gl.getUniformLocation(shaderProgram, "textureSampler"), 0);
	gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
	gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA,gl.UNSIGNED_BYTE, video);
	
	//draw
	gl.viewport(0, 0, gl.viewportWidth, gl.viewportHeight);
	gl.clear(gl.COLOR_BUFFER_BIT);
	gl.bindBuffer(gl.ARRAY_BUFFER, squareVertexPositionBuffer);
	gl.vertexAttribPointer(shaderProgram.vertexPositionAttribute, squareVertexPositionBuffer.itemSize, gl.FLOAT, false, 0, 0);
	gl.drawArrays(gl.TRIANGLE_STRIP, 0, squareVertexPositionBuffer.numItems);
}

/////////
//WebGL//
/////////

function getShader(gl, id) 
{
	var shaderScript = document.getElementById(id);
	if (!shaderScript)
	{
		return null;
	}

	var str = "";
	var k = shaderScript.firstChild;
	while (k)
	{
		if (k.nodeType == 3)
		{
			str += k.textContent;
		}
		k = k.nextSibling;
	}

	var shader;
	if (shaderScript.type == "x-shader/x-fragment")
	{
		shader = gl.createShader(gl.FRAGMENT_SHADER);
	} 
	else if(shaderScript.type == "x-shader/x-vertex")
	{
		shader = gl.createShader(gl.VERTEX_SHADER);
	}
	else
	{
		return null;
	}

	gl.shaderSource(shader, str);
	gl.compileShader(shader);

	if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS))
	{
		alert(gl.getShaderInfoLog(shader));
		return null;
	}

	return shader;
}

function updateWindowSize()
{
	var w = window,
	d = document,
	e = d.documentElement,
	g = d.getElementsByTagName('body')[0],
	x = w.innerWidth || e.clientWidth || g.clientWidth,
	y = w.innerHeight|| e.clientHeight|| g.clientHeight;

	canvas.width  = x;
	canvas.height = y;
	gl.viewportWidth = x;
	gl.viewportHeight = y;
}

function setFormat(i_isTopBottomSource, i_isLeftRightSource, i_isTopBottomTarget, i_isLeftRightTarget)
{
	isTopBottomSource = i_isTopBottomSource?1:0;
	isLeftRightSource = i_isLeftRightSource?1:0;
	isTopBottomTarget = i_isTopBottomTarget?1:0;	
	isLeftRightTarget = i_isLeftRightTarget?1:0;
}

//////////////
//Fullscreen//
//////////////
function toggleFullScreen()
{
	if (!document.fullscreenElement && !document.mozFullScreenElement && !document.webkitFullscreenElement)
	{
		if (document.documentElement.requestFullscreen)
		{
			document.documentElement.requestFullscreen();
		}
		else if(document.documentElement.mozRequestFullScreen)
		{
			document.documentElement.mozRequestFullScreen();
		}
		else if(document.documentElement.webkitRequestFullscreen)
		{
			document.documentElement.webkitRequestFullscreen(Element.ALLOW_KEYBOARD_INPUT);
		}
	}
	else
	{
		if (document.cancelFullScreen)
		{
			document.cancelFullScreen();
		}
		else if(document.mozCancelFullScreen)
		{
			document.mozCancelFullScreen();
		}
		else if(document.webkitCancelFullScreen)
		{
			document.webkitCancelFullScreen();
		}
	}
	updateWindowSize();
}
