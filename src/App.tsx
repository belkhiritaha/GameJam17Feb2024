import './App.css'
import * as THREE from 'three';

import Player from './Player';
import Scene from './Scene';
import Sphere from './Sphere';
import Mob from './Mob';
import Shop from './Shop';

function App() {
    let mouseTime = 0;
    const clock = new THREE.Clock();
    let isFirstClick = true;
    let appIsLoading = true;

    const loadingManager = new THREE.LoadingManager();
    loadingManager.onLoad = function () {
        console.log(`Just finished loading!`);
        appIsLoading = false;
        isFirstClick = true;
        document.getElementById('loading')!.style.display = "none";
        document.getElementById('inventaire')!.style.display = "block";
        document.getElementById('viseur')!.style.display = "block";
        document.getElementById('container')!.style.display = "block";
        document.getElementById('root')!.style.display = "block";
    }

    const scene = new Scene( { loaderManager: loadingManager } );
    const player = new Player( { gravity: 30, scene, mouseTime } );
    scene.player = player;

    const shop = new Shop( { scene } );
    scene.shop = shop;

    const mobs : any[] = [];

    for (let i = 0; i < 5; i++) {
        const mob = new Mob( { loader:loadingManager, gravity: 100, scene, position: new THREE.Vector3( Math.random() * 10, 5, Math.random() * 10 ), id: i, model_path: "Skeleton_Mage.glb" } );
        mobs.push(mob);
    }
    scene.mobs = mobs;

    document.addEventListener( 'keydown', ( event ) => {

        player.keyStates[ event.code ] = true;

    } );

    document.addEventListener( 'keyup', ( event ) => {

        player.keyStates[ event.code ] = false;

    } );

    scene.container?.addEventListener( 'mousedown', () => {

        document.body.requestPointerLock();

        mouseTime = performance.now();

    } );

    document.addEventListener( 'mouseup', () => {
        if (isFirstClick) {
            isFirstClick = false;
        } else {
            if ( document.pointerLockElement !== null ) player.throwBall();
        }
    } );

    document.body.addEventListener( 'mousemove', ( event ) => {
        if ( document.pointerLockElement === document.body ) {
            scene.camera.rotation.y -= event.movementX / 500;
            scene.camera.rotation.x -= event.movementY / 500;
        }
    } );

    function animate() {

        const deltaTime = Math.min( 0.05, clock.getDelta() ) / Scene.STEPS_PER_FRAME;

        // we look for collisions in substeps to mitigate the risk of
        // an object traversing another too quickly for detection.

        for ( let i = 0; i < Scene.STEPS_PER_FRAME; i ++ ) {

            player.controls( deltaTime );

            player.updatePlayer( deltaTime );


            Sphere.updateSpheres( scene, deltaTime, Scene.GRAVITY, mobs );

            player.teleportPlayerIfOob();

            mobs.forEach( ( mob ) => {
                mob.updateMob(deltaTime);
            });

            shop.update();
        }

        scene.renderer.render( scene.scene, scene.camera );

        requestAnimationFrame( animate );

    }

    animate();

    return ( <> </> )
}

export default App
