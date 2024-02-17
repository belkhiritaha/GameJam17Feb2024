import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
import './App.css'
import * as THREE from 'three';

import Player from './Player';
import Scene from './Scene';
import Sphere from './Sphere';

function App() {
    let mouseTime = 0;
    const clock = new THREE.Clock();

    const scene = new Scene( {} );
    const player = new Player( { gravity: 30, scene, mouseTime } );
    scene.player = player;

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

        if ( document.pointerLockElement !== null ) player.throwBall();

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

            Sphere.updateSpheres( scene, deltaTime, Scene.GRAVITY, player );

            player.teleportPlayerIfOob();

        }

        scene.renderer.render( scene.scene, scene.camera );

        requestAnimationFrame( animate );

    }

    animate();

    /*
    window.addEventListener( 'resize', onWindowResize );

    function onWindowResize() {

        scene.camera.aspect = window.innerWidth / window.innerHeight;
        scene.camera.updateProjectionMatrix();

        scene.renderer.setSize( window.innerWidth, window.innerHeight );

    }
    */

  return ( <></> )
}

export default App
