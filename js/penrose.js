$(function() {

var renderer, camera, settings, bodyGeometry, lightGeometry, dudesGeometry, triangle, scene, globe;
var modelLoaded = false;
var dudesLoaded = false;
var lightHue = 0.6;
var triangleColor = 0x333333;
var ambientColor = 0x222222;
var floorHeight = -3;

initUI();
initRenderer();
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

function initRenderer() {
	var panorama = getGetValue("panorama");
	if (panorama != null) {
		triangleColor = 0xffffff;
		ambientColor = 0x888888;
	}


	renderer = new THREE.WebGLRenderer({
		antialias: true,
	});
	renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMapEnabled = true;
    renderer.shadowMapSoft = true;
    renderer.shadowCameraNear = 1;
    renderer.shadowCameraFar = 100;
    renderer.shadowCameraFov = 20;

	document.body.appendChild(renderer.domElement);
	
	camera = new THREE.PerspectiveCamera(5, window.innerWidth / window.innerHeight, 1, 1000);
	camera.position.z = 90;
	camera.position.x = 50;

	controls = new THREE.OrbitControls( camera );
  	controls.addEventListener( 'change', render );

//	controls = new THREE.OrbitControls( camera, renderer.domElement );
//	controls.addEventListener( 'change', render );
	controls.rotateUp(0.1);

	window.addEventListener( 'resize', onWindowResize, false );

	var Settings = function () {
		this.isRotatingCheckbox = document.getElementById("isRotating");
		this.isAnimatingCheckbox = document.getElementById("isAnimating");
		this.showPeopleCheckbox = document.getElementById("showPeople");
	};
	settings = new Settings();	
	
	triangle = new THREE.Object3D();

	var base = new THREE.Mesh( 
		new THREE.CircleGeometry(200, 36),
		new THREE.MeshLambertMaterial( { color: 0x111111 } ) 
	);

	base.receiveShadow = true;

	base.applyMatrix(new THREE.Matrix4().makeRotationX(-Math.PI / 2));
	base.position.y = -0.6;
	triangle.add(base);

	scene = new THREE.Scene();
	globe = new THREE.Scene();
	scene.add(globe);

	var loader = new THREE.OBJLoader();
	var bodyLoaded = false;
	var lightsLoaded = false;

	loader.load( "resources/obj/penrose-body.obj", function ( event ) {
		bodyGeometry = event.clone();			
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

	var scale = 0.03;
	triangle.scale.set(scale, scale, scale);
	triangle.position.y = floorHeight;
	
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
	 //       map: panomap,
	    } );

	    skybox = new THREE.Mesh( sphere, sphereMaterial );
	    skybox.receiveShadow = true;
	 //   triangle.add(skybox);


	    var light = new THREE.DirectionalLight(0xdddddd);
		light.position.set(0, 1, 0).normalize();

	    light.castShadow = true;

	    var size = 60;
	    light.shadowCameraLeft = -size;
	    light.shadowCameraTop = -size;
	    light.shadowCameraRight = size;
	    light.shadowCameraBottom = size;
	    light.shadowCameraNear = 1;
	    light.shadowCameraFar = 100;
	    light.shadowBias = -0.00001
	    light.shadowMapWidth = light.shadowMapHeight = 1024;
	    light.shadowDarkness = 1;  
	    light.shadowMapType = THREE.PCFSoftShadowMap;

		scene.add(light);
	}

	// add subtle ambient lighting
	var ambientLight = new THREE.AmbientLight(ambientColor);
	scene.add(ambientLight);
	
    scene.fog = new THREE.Fog( 0x000000, 0, 1000 );

	// add directional light source
	var directionalLight = new THREE.DirectionalLight(0x404040);
	directionalLight.position.set(1, 1, 1).normalize();
//	scene.add(directionalLight);
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
				emissive: 0, 
				shading: THREE.SmoothShading,
			} );

			child.material.castShadow = true;
    		child.material.receiveShadow = true;
		}
	});

	lightGeometry.traverse( function ( child ) {
		if ( child instanceof THREE.Mesh ) {			
			child.material = new THREE.MeshBasicMaterial( { color: 0xffffff, shading: THREE.FlatShading } );
		}
	});

	globe.add(triangle);
	modelLoaded = true;
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

var FPS = 30.0;
var msPerTick = 1000 / FPS;
var nextTick = Date.now();

function animate() {
	var currentTime, ticks = 0;

	requestAnimationFrame( animate, renderer.domElement );

    currentTime = Date.now();
    if (currentTime - nextTick > 60 * msPerTick) {
      	nextTick = currentTime - msPerTick;
    }
    while (currentTime > nextTick) {
      	updateModel();
      	nextTick += msPerTick;
      	ticks++;
    }
    if (ticks) {
      	render();
    }

	controls.update();
}

function updateModel() {
	if (!modelLoaded) {
		return;
	}

	var rotationFactor = 0.001
	if (settings.isRotatingCheckbox.checked) {
		triangle.rotation.y += rotationFactor;
	}

	if (settings.isAnimatingCheckbox.checked) {
		lightHue = (lightHue + 0.001) % 1.0;
	}
}

function render() {
	if (settings.isAnimatingCheckbox.checked && modelLoaded) {
		lightGeometry.traverse( function ( child ) {
			if ( child instanceof THREE.Mesh ) {
				child.material.color.setHSL(lightHue, 1.0, 0.6);
			}
		});
	}

	renderer.render( scene, camera );
}

}); // jQuery function wrapper

