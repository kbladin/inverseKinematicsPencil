var objectTypesLoaded = 0;
var readyToRender = false;

// Repeat this function as fast as possible.
window.setInterval(function(){
    if (readyToRender  && objectTypesLoaded == 3);
        // Only if all objects are loaded.
        updateInterval();
}, 1);

var scene = new THREE.Scene();
var camera = new THREE.PerspectiveCamera(
    60, // fov
    document.getElementById("threejs-frame").offsetWidth /
    document.getElementById("threejs-frame").offsetHeight, // aspect ratio
    0.1, // near
    1000 ); // far
var renderer = new THREE.WebGLRenderer();

sLight = new THREE.SpotLight(0xFFEEBB,1.0);
sLight.position.set( 30, 20, 10);
sLight.castShadow = true;
sLight.shadowMapWidth = 2048;
sLight.shadowMapHeight = 2048;
sLight.shadowCameraNear = 1;
sLight.shadowCameraFar = 60;
sLight.shadowCameraFov = 20;
sLight.shadowDarkness = 0.5;

sLight2 = new THREE.SpotLight(0x9988FF,0.7);
sLight2.position.set( 0, 12, 5);

scene.add(sLight);
scene.add(sLight2);

var floor = new THREE.Mesh(
    new THREE.BoxGeometry( 70, 0.1, 70 ),
    new THREE.MeshPhongMaterial( { color: 0xFFFFFF } ));
floor.receiveShadow = true;

var intersectObjects = [];
intersectObjects.push( floor );
scene.add( floor );

robotArm = new RobotArm();
robotArm.N_SEGMENTS = 6;
var dimension = new THREE.Vector3(0.2,1.5,0.1);

for (i = 0; i < robotArm.N_SEGMENTS; i++) {
    robotArm.rotationAxes[i] = new THREE.Vector3(0, 0, 1);
    robotArm.rotationAngles[i] = Math.PI * 0.1;
    robotArm.roots[i] = new THREE.Vector3(
        0,
        -dimension.y/2 + dimension.x/2,
        -dimension.z/2);
    robotArm.branches[i] = new THREE.Vector3(
        0,
        dimension.y/2 - dimension.x/2,
        dimension.z/2);
}

// First segment rotates around y-axis.
robotArm.rotationAxes[0] = new THREE.Vector3(0, 1, 0);
robotArm.roots[0] = new THREE.Vector3(
    0,
    - dimension.x/2,
    0);

loader = new THREE.JSONLoader();
loader.load(
    'inverse_kinematics/models/base.js',
    function (geometry, materials) {
    robotArm.materials[0] = new THREE.MeshFaceMaterial(materials);
    robotArm.meshes[0] = new THREE.Mesh( geometry, robotArm.materials[0] );
    robotArm.meshes[0].castShadow = true;
    robotArm.meshes[0].receiveShadow = true;
    scene.add( robotArm.meshes[0] );
    objectTypesLoaded++;
});
loader.load(
    'inverse_kinematics/models/untitled.js',
    function (geometry, materials) {
    for (i = 1; i < robotArm.N_SEGMENTS - 1; i++) {
        robotArm.materials[i] = new THREE.MeshFaceMaterial(materials);
        robotArm.meshes[i] = new THREE.Mesh( geometry, robotArm.materials[i] );
        robotArm.meshes[i].castShadow = true;
        robotArm.meshes[i].receiveShadow = true;
        scene.add( robotArm.meshes[i] );
    }
    objectTypesLoaded++;
});
loader.load(
    'inverse_kinematics/models/pen.js',
    function (geometry, materials) {
    robotArm.materials[robotArm.N_SEGMENTS - 1] =new THREE.MeshFaceMaterial(
        materials);
    robotArm.meshes[robotArm.N_SEGMENTS - 1] = new THREE.Mesh(
        geometry,
        robotArm.materials[robotArm.N_SEGMENTS - 1] );
    robotArm.meshes[robotArm.N_SEGMENTS - 1].castShadow = true;
    robotArm.meshes[robotArm.N_SEGMENTS - 1].receiveShadow = true;
    scene.add( robotArm.meshes[robotArm.N_SEGMENTS - 1] );
    objectTypesLoaded++;
});

// Ink particles
var particleGeometry = new THREE.Geometry();
for ( i = 0; i < 20000; i ++ ) {
    var vertex = new THREE.Vector3(0,-1,0);
    particleGeometry.vertices.push( vertex );
}
var particleMaterial = new THREE.PointCloudMaterial(
    { vertexColors: THREE.VertexColors, size: 0.06,} );
var particles = new THREE.PointCloud( particleGeometry, particleMaterial );
scene.add( particles );
var currParticle = 1;

renderer.setSize(
    document.getElementById("threejs-frame").offsetWidth,
    document.getElementById("threejs-frame").offsetHeight );
renderer.shadowMapEnabled = true;
renderer.shadowMapType = THREE.PCFSoftShadowMap;

document.getElementById("threejs-frame").appendChild( renderer.domElement );

var V = new THREE.Matrix4();
var Vtrans = new THREE.Matrix4();
var VrotX = new THREE.Matrix4();
var VrotY = new THREE.Matrix4();
var VrotZ = new THREE.Matrix4();

Vtrans.makeTranslation(0, 4, 3);
VrotX.makeRotationX(-Math.PI * 0.27);
VrotY.makeRotationY(Math.PI * 0.25);

V.multiply(Vtrans);
V.multiply(VrotY);
V.multiply(VrotX);

camera.applyMatrix(V);

readyToRender = true;

var tap = true;
document.addEventListener('touchstart',function(e) {
  tap = true;
});
document.addEventListener('touchmove',function(e) {
 tap = false;
});
document.addEventListener('touchend',function(e) {
  if(tap) {
     var touch = e.changedTouches[0];
     var layerX = touch.layerX;
     var layerY = touch.layerY;

     var vector = new THREE.Vector3( ( 
        e.layerX /
            document.getElementById("threejs-frame").offsetWidth ) * 2 - 1, 
        - ( e.layerY /
            document.getElementById("threejs-frame").offsetHeight ) * 2 + 1, 
        0.5 
    );

    vector.unproject( camera );
    var ray = new THREE.Raycaster(
        camera.position,
        vector.sub( camera.position ).normalize() );
    var intersects = ray.intersectObjects( intersectObjects );
    if ( intersects.length > 0 ) {
        var pos = intersects[ 0 ].point;
        robotArm.targetPos = pos;
    }
  }
});

var mousedown = false;
function updateInterval(event) {
    for (var i = 0; i < 50; i++) {
        robotArm.updateAngles();
        robotArm.updatePositions();

        if (mousedown)
            robotArm.targetPos.y = 0;
        if (
            robotArm.endAffector.y < 0.3 &&
            (Math.abs(
                particles.geometry.vertices[currParticle].x -
                robotArm.endAffector.x) > 0.02 ||
            Math.abs(
                particles.geometry.vertices[currParticle].z -
                robotArm.endAffector.z) > 0.02)){ // Draw

            currParticle++;
            currParticle =
                (currParticle % (particles.geometry.vertices.length-1)) + 1;
            particles.geometry.vertices[currParticle].x =
                robotArm.endAffector.x;
            particles.geometry.vertices[currParticle].y = 0.1;
            particles.geometry.vertices[currParticle].z =
                robotArm.endAffector.z;
            particles.geometry.dispose();

        }
    };
}

function mouseDown(event) {
    mousedown = true;
}

function mouseUp(event) {
    mousedown = false;
}

function mouseOver(event) {
    var vector = new THREE.Vector3( ( 
        event.layerX /
            document.getElementById("threejs-frame").offsetWidth ) * 2 - 1, 
        - ( event.layerY /
            document.getElementById("threejs-frame").offsetHeight ) * 2 + 1, 
        0.5 
    );

    vector.unproject( camera );
    var ray = new THREE.Raycaster(
        camera.position,
        vector.sub( camera.position ).normalize() );
    var intersects = ray.intersectObjects( intersectObjects );
    if ( intersects.length > 0 ) {
        var pos = intersects[ 0 ].point;
        pos.y += 0.5;
        robotArm.targetPos = pos;
    }
}

var render = function () {
    requestAnimationFrame( render );
    renderer.render(scene, camera);
};

render();
