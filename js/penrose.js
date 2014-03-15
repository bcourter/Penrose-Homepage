$(function() {

var renderer, camera, controls, settings, bodyGeometry, lightGeometry, dudesGeometry, triangle, scene, globe;
var modelLoaded = false;
var dudesLoaded = false;
var lightHue = 0.6;
var triangleColor = 0x333333;
var ambientColor = 0x222222;
var floorHeight = -3;

if ( ! Detector.webgl ) Detector.addGetWebGLMessage();

var SHADOW_MAP_WIDTH = 2048, SHADOW_MAP_HEIGHT = 1024;

var SCREEN_WIDTH = window.innerWidth;
var SCREEN_HEIGHT = window.innerHeight;
var FLOOR = -250;

var NEAR = 10, FAR = 3000;

var light;
var clock = new THREE.Clock();

initUI();
init();
animate();

document.onselectstart = function() {
  return false;
};

function initUI() {
	if (Detector.webgl) {
		$("#isRotating").button();
		$("#isAnimating").button();
		$("#showPeople").button().click(function() {
			if (!dudesLoaded) {
				loadDudes();
			} else {
				dudesGeometry.traverse( function ( child ) {
					if ( child instanceof THREE.Mesh ) {			
						child.visible = settings.showPeopleCheckbox.checked;
					}
				});
			}
		});
	} else {
		$("#isRotating").hide();
		$("#isAnimating").hide();
		$("#showPeople").hide();
		$("label").hide();
		$("#helptext").hide();

		Detector.addGetWebGLMessage({ parent: $("noWebGLMessage")[0] });
	}
}

function init() {
	container = document.createElement( 'div' );
	document.body.appendChild( container );

	// SCENE CAMERA

	camera = new THREE.PerspectiveCamera( 23, SCREEN_WIDTH / SCREEN_HEIGHT, NEAR, FAR );
	camera.position.set( 700, 50, 1900 );

	controls = new THREE.OrbitControls( camera );

	controls.lookSpeed = 0.0125;
	controls.movementSpeed = 500;
	controls.noFly = false;
	controls.lookVertical = true;
	controls.constrainVertical = true;
	controls.verticalMin = 1.5;
	controls.verticalMax = 2.0;

	controls.lon = 250;

	// SCENE

	scene = new THREE.Scene();
	//scene.fog = new THREE.Fog( 0x0, 4000, FAR );

	createScene();

	// RENDERER

	renderer = new THREE.WebGLRenderer( { antialias: true } );
	renderer.setSize( SCREEN_WIDTH, SCREEN_HEIGHT );
	container.appendChild( renderer.domElement );

	renderer.setClearColor( 0x0, 1 );
	renderer.autoClear = false;

	//

	renderer.shadowMapEnabled = true;
	renderer.shadowMapType = THREE.PCFShadowMap;

	window.addEventListener( 'resize', onWindowResize, false );


	var Settings = function () {
		this.isRotatingCheckbox = document.getElementById("isRotating");
		this.isAnimatingCheckbox = document.getElementById("isAnimating");
		this.showPeopleCheckbox = document.getElementById("showPeople");
	};
	settings = new Settings();	
}

function onWindowResize() {

	SCREEN_WIDTH = window.innerWidth;
	SCREEN_HEIGHT = window.innerHeight - 2 * MARGIN;

	camera.aspect = SCREEN_WIDTH / SCREEN_HEIGHT;
	camera.updateProjectionMatrix();

	renderer.setSize( SCREEN_WIDTH, SCREEN_HEIGHT );

	var aspect = SCREEN_WIDTH / SCREEN_HEIGHT;

	controls.handleResize();

}

function createScene( ) {

	var panorama = getGetValue("panorama");
	if (panorama != null) {
		triangleColor = 0xffffff;
		ambientColor = 0x888888;
	}

	// GROUND

	var geometry = new THREE.CircleGeometry( 60, 20 );
	var planeMaterial = new THREE.MeshPhongMaterial( { color: 0x777777 } );
	planeMaterial.ambient = planeMaterial.color;

	var ground = new THREE.Mesh( geometry, planeMaterial );

	ground.position.set( 0, FLOOR, 0 );
	ground.rotation.x = - Math.PI / 2;
	ground.scale.set( 100, 100, 100 );

	ground.castShadow = false;
	ground.receiveShadow = true;

//	scene.add( ground );

	// Triangle
	triangle = new THREE.Object3D();
	triangle.castShadow = true;
	triangle.receiveShadow = true;

	var loader = new THREE.OBJLoader();
	var bodyLoaded = false;
	var lightsLoaded = false;

	loader.load( "resources/obj/penrose-body.obj", function ( event ) {
		bodyGeometry = event.clone();	
		bodyGeometry.castShadow = true;		
		triangle.add(bodyGeometry);
		if (lightsLoaded)
			finishModelLoad();
		else
			bodyLoaded = true;
	});

	var lightLoader = new THREE.OBJLoader();
	lightLoader.load( "resources/obj/penrose-lights.obj", function ( event ) {
		lightGeometry = event.clone();
		triangle.add(lightGeometry);
		if (bodyLoaded)
			finishModelLoad();
		else
			lightsLoaded = true;
	});

	var scale = 2;
	triangle.scale.set(scale, scale, scale);
	triangle.position.y = FLOOR;

	scene.add(triangle);	


	// panorama
	if (panorama != null) {
	    panomap = THREE.ImageUtils.loadTexture("resources/panoramas/" + panorama);

	    var sphere = new THREE.SphereGeometry( 360, 64, 48 );
	    sphere.applyMatrix( new THREE.Matrix4().makeScale( -1, 1, 1 ) );
	    sphere.applyMatrix( new THREE.Matrix4().makeRotationY(1.75));

	    for (var i = 0; i < sphere.vertices.length; i++) {
	    	var vertex = sphere.vertices[i];
	    	vertex.y = Math.max(vertex.y - 2, 0);
	    }

	    var sphereMaterial = new THREE.MeshLambertMaterial( {
	    	color: 0x888888,
	    	emissive: 0x111111,
	        map: panomap,
	    } );

	    skybox = new THREE.Mesh( sphere, sphereMaterial );
	    skybox.receiveShadow = true;
	    triangle.add(skybox);


	 //    var light = new THREE.DirectionalLight(0xdddddd);
		// light.position.set(0, 1, 0).normalize();


	    light = new THREE.SpotLight( 0xffffff, 1, 0, Math.PI / 2, 1 );
		light.position.set( 0, 2000, 0 );
		light.target.position.set( 0, 0, 0 );

		light.castShadow = true;
		light.onlyShadow =

		light.shadowCameraNear = 1200;
		light.shadowCameraFar = 2500;
		light.shadowCameraFov = 50;

		light.shadowBias = 0.00001;
		light.shadowDarkness = 0.5;

		light.shadowMapWidth = SHADOW_MAP_WIDTH;
		light.shadowMapHeight = SHADOW_MAP_HEIGHT;

		light.shadowCameraVisible = true;

		scene.add( light );
	}

	// add subtle ambient lighting
	var ambientLight = new THREE.AmbientLight(ambientColor);
	scene.add(ambientLight);
	
	// add directional light source
	var directionalLight = new THREE.DirectionalLight(0x404040);
	directionalLight.position.set(1, 1, 1).normalize();
//	scene.add(directionalLight);

}

function animate() {

	requestAnimationFrame( animate );

	render();
}

function render() {

	var delta = clock.getDelta();

	controls.update( delta );

	renderer.clear();
	renderer.render( scene, camera );

}

function getGetValue(key){
	var location = window.location.search;
	if (location.length < 2)
		return null;

	var res = location.match(new RegExp("[?&]" + key + "=([^&/]*)", "i"));
	return res[1];
}	

function finishModelLoad() {
	bodyGeometry.traverse( function ( child ) {
		if ( child instanceof THREE.Mesh ) {			
			child.material = new THREE.MeshPhongMaterial( { 
				color: triangleColor, 
				emissive: 0
		//		shading: THREE.SmoothShading,
			} );

			child.castShadow = true;
    		child.receiveShadow = true;
		}
	});

	lightGeometry.traverse( function ( child ) {
		if ( child instanceof THREE.Mesh ) {			
			child.material = new THREE.MeshPhongMaterial( { color: 0xffffff, shading: THREE.FlatShading } );
		}
	});

}

function loadDudes() {
	var dudeLoader = new THREE.OBJLoader();
	dudeLoader.load( "resources/obj/dudes0.obj", function ( event ) {
		dudesGeometry = event.content.clone();
		dudesGeometry.applyMatrix(new THREE.Matrix4().identity().rotateX(-Math.PI / 2));
		dudesGeometry.traverse( function ( child ) {
			if ( child instanceof THREE.Mesh ) {			
				child.material = new THREE.MeshPhongMaterial( { color: 0xeebb44, emissive: 0x664422, shading: THREE.SmoothShading } );
			}
		});
		
		triangle.add(dudesGeometry);
		dudesLoaded = true;
	});
}

function onWindowResize() {
	camera.aspect = window.innerWidth / window.innerHeight;
	camera.updateProjectionMatrix();

	renderer.setSize( window.innerWidth, window.innerHeight );
}













// var FPS = 30.0;
// var msPerTick = 1000 / FPS;
// var nextTick = Date.now();

// function animate() {
// 	var currentTime, ticks = 0;

// 	requestAnimationFrame( animate, renderer.domElement );

//     currentTime = Date.now();
//     if (currentTime - nextTick > 60 * msPerTick) {
//       	nextTick = currentTime - msPerTick;
//     }
//     while (currentTime > nextTick) {
//       	updateModel();
//       	nextTick += msPerTick;
//       	ticks++;
//     }
//     if (ticks) {
//       	render();
//     }

// 	controls.update();
// }

// function updateModel() {
// 	if (!modelLoaded) {
// 		return;
// 	}

// 	var rotationFactor = 0.001
// 	if (settings.isRotatingCheckbox.checked) {
// 		triangle.rotation.y += rotationFactor;
// 	}

// 	if (settings.isAnimatingCheckbox.checked) {
// 		lightHue = (lightHue + 0.001) % 1.0;
// 	}
// }

// function render() {
// 	if (settings.isAnimatingCheckbox.checked && modelLoaded) {
// 		lightGeometry.traverse( function ( child ) {
// 			if ( child instanceof THREE.Mesh ) {
// 				child.material.color.setHSL(lightHue, 1.0, 0.6);
// 			}
// 		});
// 	}

// 	renderer.render( scene, camera );
// }

}); // jQuery function wrapper

