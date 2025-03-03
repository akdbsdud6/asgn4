let canvas;
let gl;

// Attributes
let a_Position;
let a_UV;
let a_Normal;
// Uniforms
let u_FragColor;
let u_ModelMatrix;
let u_ViewMatrix;
let u_ProjectionMatrix;
let u_whichTexture;
let u_isNormalDebug;
let u_LightColor;

// Global camera
let camera;
let g_cameraAngle = 180;
let g_lightPos=[0,1,-2];

// For normal debug on/off
let g_normalDebug = false;

let g_lightOn = true;

// Vertex Shader
const VSHADER_SOURCE = `
  attribute vec4 a_Position;
  attribute vec2 a_UV;
  attribute vec3 a_Normal;  

  varying vec2 v_UV;
  varying vec3 v_Normal;   
  varying vec4 v_VertPos; 

  uniform mat4 u_ModelMatrix;
  uniform mat4 u_ViewMatrix;
  uniform mat4 u_ProjectionMatrix;

  void main() {
    gl_Position = u_ProjectionMatrix * u_ViewMatrix * u_ModelMatrix * a_Position;
    v_UV = a_UV;
    v_Normal = a_Normal; 
    v_VertPos = u_ModelMatrix * a_Position;  
  }
`;

// Fragment Shader
const FSHADER_SOURCE = `
  precision mediump float;

  varying vec2 v_UV;
  varying vec3 v_Normal;

  uniform vec4 u_FragColor;
  uniform sampler2D u_Sampler0;

  uniform int u_whichTexture;
  uniform int u_isNormalDebug; // NEW: toggle normal debug

  uniform vec3 u_LightPos;
  uniform vec3 u_cameraPos;
  uniform vec3 u_LightColor;

  uniform bool u_lightOn;

  varying vec4 v_VertPos;

  void main() {
    // If it's the floor, always show texture:
    float dummy = u_LightPos.x; // or dot(u_LightPos, vec3(0));
    if (u_whichTexture == 0) {
      gl_FragColor = texture2D(u_Sampler0, v_UV);
      return;
    }

    // Otherwise, if normal debug is on, show normals:
    if (u_isNormalDebug == 1) {
      vec3 mappedNormal = (v_Normal + vec3(1.0)) * 0.5;
      gl_FragColor = vec4(mappedNormal, 1.0);
      return;
    }

    // Normal debug off => do your usual color logic:
    if (u_whichTexture == -2) {
      gl_FragColor = u_FragColor;
    } else if (u_whichTexture == -1) {
      gl_FragColor = vec4(v_UV, 1.0, 1.0);
    } else {
      gl_FragColor = vec4(1.0, 0.2, 0.2, 1.0);
    }

    vec3 lightVector = u_LightPos -vec3(v_VertPos);
    float r=length(lightVector);

    // N dot L
    vec3 L = normalize(lightVector);
    vec3 N = normalize(v_Normal);
    float nDotL = max(dot(N, L), 0.0);

    // Reflection
    vec3 R = reflect(-L, N);

    // eye 
    vec3 E = normalize(u_cameraPos - vec3(v_VertPos));

    // Specular
    float specular = pow(max(dot(E, R), 0.0), 20.0); // * u_LightColor;

    vec3 diffuse = vec3(gl_FragColor) * nDotL *0.7 * u_LightColor;
    vec3 ambient = vec3(gl_FragColor) * 0.3 * u_LightColor;
    gl_FragColor = vec4(specular+diffuse+ambient, 1.0);
  }`;

function setupWebGL() {
  canvas = document.getElementById('webgl');
  gl = canvas.getContext('webgl', { preserveDrawingBuffer: true });
  if (!gl) {
    console.log("Failed to get the rendering context for WebGL.");
    return;
  }
  gl.enable(gl.DEPTH_TEST);
}

function connectVariablesToGLSL() {
  if (!initShaders(gl, VSHADER_SOURCE, FSHADER_SOURCE)) {
    console.log("Failed to initialize shaders.");
    return;
  }

  // Get attribute locations
  a_Position = gl.getAttribLocation(gl.program, 'a_Position');
  a_UV       = gl.getAttribLocation(gl.program, 'a_UV');
  a_Normal   = gl.getAttribLocation(gl.program, 'a_Normal');
  if(a_Normal < 0) {
    console.log("Failed to get the storage location of a_Normal");
    return;
  }

  // Get uniform locations
  u_FragColor       = gl.getUniformLocation(gl.program, 'u_FragColor');
  u_ModelMatrix     = gl.getUniformLocation(gl.program, 'u_ModelMatrix');
  u_ViewMatrix      = gl.getUniformLocation(gl.program, 'u_ViewMatrix');
  u_ProjectionMatrix= gl.getUniformLocation(gl.program, 'u_ProjectionMatrix');
  u_whichTexture    = gl.getUniformLocation(gl.program, 'u_whichTexture');
  u_isNormalDebug   = gl.getUniformLocation(gl.program, 'u_isNormalDebug');

  if(!u_isNormalDebug) {
    console.log("Failed to get u_isNormalDebug location");
    return;
  }

  u_LightPos = gl.getUniformLocation(gl.program, 'u_LightPos');
  if(!u_LightPos) {
    console.log("Failed to get u_LightPos location");
    return;
  }

  u_cameraPos = gl.getUniformLocation(gl.program, 'u_cameraPos');
  if(!u_cameraPos) {
    console.log("Failed to get u_cameraPos location");
    return;
  }

  u_LightColor = gl.getUniformLocation(gl.program, 'u_LightColor');
  if(!u_LightColor) {
    console.log("Failed to get u_LightColor location");
    return;
  }

  u_lightOn = gl.getUniformLocation(gl.program, 'u_lightOn');
   if (!u_lightOn) {
       console.log('Failed to get u_lightOn');
       return;
   }

  // Initialize u_ModelMatrix to identity
  let identityM = new Matrix4();
  gl.uniformMatrix4fv(u_ModelMatrix, false, identityM.elements);
}

function initTextures() {
  let image = new Image();
  let u_Sampler0 = gl.getUniformLocation(gl.program, 'u_Sampler0');
  if (!u_Sampler0) {
    console.log("Failed to get uniform for texture0.");
    return;
  }

  image.onload = function() {
    let texture = gl.createTexture();
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 1);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, texture);

    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texImage2D(
      gl.TEXTURE_2D, 0, gl.RGB,
      gl.RGB, gl.UNSIGNED_BYTE, image
    );
    gl.uniform1i(u_Sampler0, 0);

    renderScene();
  };
  image.src = 'grass.jpg';
}

function main() {
  setupWebGL();

  connectVariablesToGLSL();

  

  // Use the single Camera class from camera.js
  camera = new Camera();

  initTextures();

  // Attach slider
  let angleSlider = document.getElementById('cameraAngle');
  if (angleSlider) {
    angleSlider.value = g_cameraAngle;
    angleSlider.addEventListener('input', function() {
      updateCameraAngle(this.value);
    });
  }

  // Light sliders
  let slideX = document.getElementById('lightSlideX');
  let slideY = document.getElementById('lightSlideY');
  let slideZ = document.getElementById('lightSlideZ');
  if(slideX){
    slideX.addEventListener('input', function(){
      g_lightPos[0] = parseFloat(this.value) / 20.0; // scale it
      renderScene();
    });
  }
  if(slideY){
    slideY.addEventListener('input', function(){
      g_lightPos[1] = parseFloat(this.value) / 20.0;
      renderScene();
    });
  }
  if(slideZ){
    slideZ.addEventListener('input', function(){
      g_lightPos[2] = parseFloat(this.value) / 20.0;
      renderScene();
    });
  }

  let slideRed = document.getElementById('lightRed');
  let slideGreen = document.getElementById('lightGreen');
  let slideBlue = document.getElementById('lightBlue');

  if (slideRed && slideGreen && slideBlue) {
    function updateLightColor() {
      g_lightColor[0] = parseFloat(slideRed.value) / 100.0;
      g_lightColor[1] = parseFloat(slideGreen.value) / 100.0;
      g_lightColor[2] = parseFloat(slideBlue.value) / 100.0;
      renderScene();
    }

    slideRed.addEventListener('input', updateLightColor);
    slideGreen.addEventListener('input', updateLightColor);
    slideBlue.addEventListener('input', updateLightColor);

    updateLightColor(); // Initialize light color from sliders
  }

  document.getElementById('light_on').onclick = function() {g_lightOn = true;};
  document.getElementById('light_off').onclick = function() {g_lightOn = false;};
  
  // Initialize camera angle
  updateCameraAngle(g_cameraAngle);

  // Clear color
  gl.clearColor(0, 0, 0, 1);
  renderScene();

  requestAnimationFrame(tick);
}

function updateCameraAngle(angleDegrees) {
  g_cameraAngle = angleDegrees;
  let radius = 8;
  let rad = angleDegrees * Math.PI / 180;
  let x = radius * Math.sin(rad);
  let z = radius * Math.cos(rad);

  // Move the camera
  camera.eye.elements[0] = x;
  camera.eye.elements[1] = 1.5;
  camera.eye.elements[2] = z;

  camera.at.elements[0] = 0;
  camera.at.elements[1] = 0.75;
  camera.at.elements[2] = 0;

  renderScene();
}

function renderScene() {
  let startTime = performance.now();

  // Setup projection
  let projMat = new Matrix4();
  projMat.setPerspective(50, canvas.width / canvas.height, 1, 200);
  gl.uniformMatrix4fv(u_ProjectionMatrix, false, projMat.elements);

  // Setup view
  camera.updateViewMatrix();
  gl.uniformMatrix4fv(u_ViewMatrix, false, camera.viewMat.elements);

  // Clear
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  // Pass normal debug uniform
  gl.uniform1i(u_isNormalDebug, g_normalDebug ? 1 : 0);

  gl.uniform3f(u_LightPos,
    g_lightPos[0],
    g_lightPos[1],
    g_lightPos[2]
  );

  gl.uniform3f(u_cameraPos, camera.eye.elements[0], camera.eye.elements[1], camera.eye.elements[2]);

  gl.uniform3f(u_LightColor, g_lightColor[0], g_lightColor[1], g_lightColor[2]);

  // === FLOOR ===
  let floor = new Cube();
  floor.color = [1, 1, 1, 1];
  floor.textureNum = 0; // floor uses texture0
  let floorMatrix = new Matrix4();
  floorMatrix.translate(0, -0.9, 0);
  floorMatrix.scale(20, 0, 20);
  floorMatrix.translate(-0.5, 0, -0.5);
  floor.drawCube(floorMatrix);

  // === WALLS/CEILING ===
  // front
  let frontWall = new Cube();
  frontWall.color = [0.8, 0.8, 0.8, 1];
  frontWall.textureNum = -2; // solid color
  let fwM = new Matrix4();
  fwM.translate(0, 1.6, -10);
  fwM.scale(20, 5, 0.1);
  fwM.translate(-0.5, -0.5, -0.5);
  frontWall.drawCube(fwM);

  // back
  let backWall = new Cube();
  backWall.color = [0.85, 0.85, 0.85, 1];
  backWall.textureNum = -2;
  let bwM = new Matrix4();
  bwM.translate(0, 1.6, 10);
  bwM.scale(20, 5, 0.1);
  bwM.translate(-0.5, -0.5, -0.5);
  backWall.drawCube(bwM);

  // left
  let leftWall = new Cube();
  leftWall.color = [0.75, 0.75, 0.75, 1];
  leftWall.textureNum = -2;
  let lwM = new Matrix4();
  lwM.translate(-10, 1.6, 0);
  lwM.scale(0.1, 5, 20);
  lwM.translate(-0.5, -0.5, -0.5);
  leftWall.drawCube(lwM);

  // right
  let rightWall = new Cube();
  rightWall.color = [0.7, 0.7, 0.7, 1];
  rightWall.textureNum = -2;
  let rwM = new Matrix4();
  rwM.translate(10, 1.6, 0);
  rwM.scale(0.1, 5, 20);
  rwM.translate(-0.5, -0.5, -0.5);
  rightWall.drawCube(rwM);

  // ceiling
  let ceiling = new Cube();
  ceiling.color = [0.9, 0.9, 0.9, 1];
  ceiling.textureNum = -2;
  let cM = new Matrix4();
  cM.translate(0, 4.05, 0);
  // cM.rotate(180, 1, 0, 0);   // Flip the cube “upside-down” 
  cM.scale(20, 0.1, 20);
  cM.translate(-0.5, -0.5, -0.5);
  ceiling.drawCube(cM);
  

  // === ANIMAL ===
  drawAnimal();

  // === SPHERE ===
  let sphere = new Sphere();
  sphere.color = [1.0, 0.55, 0.0, 1.0]; // or some color
  sphere.textureNum = -2; // solid color
  sphere.matrix.translate(2, 0.5, 0);    // put it to the right
  sphere.matrix.scale(1, 1, 1); // shrink
  sphere.render();

  // === Draw the Light ===
  var light = new Cube();
  light.color = [2,2,0,1];
  let lightMatrix = new Matrix4();
  lightMatrix.translate(g_lightPos[0], g_lightPos[1], g_lightPos[2]);
  lightMatrix.scale(-0.1, -0.1, -0.1);
  lightMatrix.translate(-0.5, -0.5, -0.5);
  light.drawCube(lightMatrix);

  // Performance
  let duration = performance.now() - startTime;
  let fps = Math.floor(1000 / duration);
  sendTextToHTML("Frame: " + duration.toFixed(1) + " ms | FPS: " + fps, "performance");
}

let g_globalAngle=0;

let g_headAngle=0;
let g_wingAngle=180;
//let g_rightWingAngle=180;
let g_leftLegAngle=180;
let g_rightLegAngle=180;
let g_leftFootAngle=0;
let g_rightFootAngle=0;
let g_rightToeAngle=0;
let g_leftToeAngle=0;
let g_eyeSize = 0.1;
let g_lightColor = [1,1,1,1];

var g_startTime = performance.now()/1000.0;
var g_seconds = performance.now()/1000.0 - g_startTime;

function tick(){
  g_seconds = performance.now()/1000.0 - g_startTime;

  updateAnimationAngles();
  renderScene();
  requestAnimationFrame(tick);
  
}

function updateAnimationAngles() {
  g_lightPos[0] = cos(g_seconds);
}



function drawAnimal() {
  let bodyColor = [1, 1, 0.9, 1]

  let globalXform = new Matrix4();
  globalXform.setTranslate(0, -0.3, 0);
  globalXform.scale(2.25, 2.25, 2.25);

  // HEAD

  var headMatrix = new Matrix4();
  var head = new Cube();
  head.color = [1,1,1,1];
  headMatrix.translate(-0.4, 0, -0.4, 0.0);
  headMatrix.scale(0.5, .5, .5);
  head.drawCube(headMatrix);

  // BEAK

  var beakMatrix = new Matrix4();
  var beak = new Cube();
  beak.color = [1,1,0,1];
  beakMatrix.translate(-0.4, 0.1, -0.6, 0.0);
  beakMatrix.scale(0.5, .2, .2);
  beak.drawCube(beakMatrix);

  // COMB

  var combMatrix = new Matrix4();
  var comb = new Cube();
  comb.color = [1,0,0,1];
  combMatrix.translate(-0.25, -0.1, -0.6, 0.0);
  combMatrix.scale(0.2, .2, .2);
  comb.drawCube(combMatrix);

  // BODY

  var bodyMatrix = new Matrix4();
  var body = new Cube();
  body.color = bodyColor;
  bodyMatrix.translate(-0.5, -0.5, -0.18, 0.0);
  bodyMatrix.rotate(0, 50, 1, 0);
  bodyMatrix.scale(0.7, .6, .8);
  body.drawCube(bodyMatrix);

 /*  // LEFT LEG

  var leftlimbMatrix = new Matrix4();
  var leftlimb = new Cube();
  leftlimb.color = [0.7,0.7,0,1];
  leftlimbMatrix.translate(0, -.36, 0.34, 0.0);
  leftlimbMatrix.rotate(g_leftLegAngle, 50, 0, 1);
  var leftlegCoordinates = new Matrix4(leftlimbMatrix);
  leftlimbMatrix.scale(0.1, .5, .1);
  leftlimb.drawCube(leftlimbMatrix);

  // LEFT FEET

  //var leftfeetMatrix = new Matrix4();
  var leftfeetMatrix = leftlegCoordinates;
  var leftfeet = new Cube();
  leftfeet.color = [0.7,0.7,0,1];
  leftfeetMatrix.translate(-0.05, 0.4, 0, 0.0);
  leftfeetMatrix.rotate(g_leftFootAngle, 50, 0, 1);
  var leftfeetCoordinates = new Matrix4(leftfeetMatrix);
  leftfeetMatrix.scale(0.2, .1, .2);
  leftfeet.drawCube(leftfeetMatrix);

  // RIGHT LEG

  var limbMatrix = new Matrix4();
  var limb = new Cube();
  limb.color = [0.7,0.7,0,1];
  limbMatrix.translate(-0.4, -0.36, 0.34, 0.0);
  limbMatrix.rotate(g_rightLegAngle, 50, 0, 1);
  var legCoordinates = new Matrix4(limbMatrix);
  limbMatrix.scale(0.1, .5, .1);
  limb.drawCube(limbMatrix);

  // RIGHT FEET
  //var feetMatrix = new Matrix4();
  var feetMatrix = legCoordinates;
  var feet = new Cube();
  feet.color = [0.7,0.7,0,1];
  feetMatrix.translate(-0.065, 0.4, 0, 0.0);
  feetMatrix.rotate(g_rightFootAngle, 50, 0, 1);
  var feetCoordinates = new Matrix4(feetMatrix);
  feetMatrix.scale(0.2, .1, .2);
  feet.drawCube(feetMatrix); */

  /* // LEFT WING
  var leftwingMatrix = new Matrix4();
  var leftwing = new Cube();
  //leftwing.textureNum = 0;
  leftwing.color = [0,1,1,1];
  leftwingMatrix.translate(0.25, 0.05, 0, 0.0);
  leftwingMatrix.rotate(g_wingAngle, 0, 0, 1);
  leftwingMatrix.scale(0.1, .5, .6);
  leftwing.drawCube(leftwingMatrix);

  // RIGHT WING
  var rightwingMatrix = new Matrix4();
  var rightwing = new Cube();
  rightwing.color = [0,1,1,1];
  rightwingMatrix.translate(-0.45, 0.05, 0, 0.0);
  rightwingMatrix.rotate(-1 * g_wingAngle, 0, 0, 1);
  rightwingMatrix.scale(0.1, .5, .6);
  rightwing.drawCube(rightwingMatrix); */

  // LEFT EYE
  var lefteyeMatrix = new Matrix4();  
  var lefteye = new Cube();
  lefteye.textureNum = -2;
  lefteye.color = [0,0,1,1];
  lefteyeMatrix.translate(-0.03, 0.3, -0.42, 0.0);
  lefteyeMatrix.scale(0.1, g_eyeSize, 0.1);
  lefteye.drawCube(lefteyeMatrix);

  // RIGHT EYE
  var righteyeMatrix = new Matrix4();  
  var righteye = new Cube();
  righteye.color = [0,0,1,1];
  righteyeMatrix.translate(-0.37, 0.3, -0.42, 0.0);
  righteyeMatrix.scale(0.1, g_eyeSize, 0.1);
  righteye.drawCube(righteyeMatrix);

 /*  // TOES
  var leftToesMatrix = leftfeetCoordinates;
  var leftToes = new Cube();
  leftToes.color = [1,0.5,0,1];
  leftToesMatrix.translate(0.075, 0, 0.175, 0.0);
  leftToesMatrix.rotate(g_leftToeAngle, 50, 0, 1);
  leftToesMatrix.scale(0.05, .1, .1);
  leftToes.drawCube(leftToesMatrix);


  var rightToesMatrix = feetCoordinates;
  var rightToes = new Cube();
  rightToes.color = [1,0.5,0,1];
  rightToesMatrix.translate(0.075, 0, 0.175, 0.0);
  rightToesMatrix.rotate(g_rightToeAngle, 50, 0, 1);
  rightToesMatrix.scale(0.05, .1, .1);
  rightToes.drawCube(rightToesMatrix); */

  // let mySphere = new Sphere();
  // mySphere.color = [1,0.5,0,1];
  // mySphere.textureNum = -2;
  // mySphere.matrix.translate(2, 0.5, 0);
  
  // mySphere.render();

  // // === LIGHT ===
  // var light = new Cube();
  // light.color = [2, 2, 0, 1];
  // light.textureNum = -2; // solid color
  // let lightMatrix = new Matrix4();
  // lightMatrix.translate(g_lightPos[0], g_lightPos[1], g_lightPos[2]);
  // lightMatrix.scale(0.1, 0.1, 0.1);
  // lightMatrix.translate(-0.5, -0.5, -0.5);
  // light.drawCube(lightMatrix);


}

// Normal debug toggle
function toggleNormalDebug() {
  g_normalDebug = !g_normalDebug;
  renderScene();
}

function sendTextToHTML(text, htmlID) {
  let htmlElm = document.getElementById(htmlID);
  if (!htmlElm) return;
  htmlElm.innerHTML = text;
}