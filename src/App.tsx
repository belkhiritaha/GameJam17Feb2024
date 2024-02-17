import { useState } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
import './App.css'
import * as THREE from 'three';

import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

import { Octree } from 'three/addons/math/Octree.js';
import { OctreeHelper } from 'three/addons/helpers/OctreeHelper.js';

import { Capsule } from 'three/addons/math/Capsule.js';

import { GUI } from 'three/addons/libs/lil-gui.module.min.js';

import Player from './Player';
import Scene from './Scene';
import Sphere from './Sphere';

function App() {
    let mouseTime = 0;
    const clock = new THREE.Clock();

    const scene = new Scene( {} );
    const player = new Player( { gravity: 30, scene, mouseTime } );

    const container = document.getElementById( 'container' );

    const renderer = new THREE.WebGLRenderer( { antialias: true } );
    renderer.setPixelRatio( window.devicePixelRatio );
    renderer.setSize( window.innerWidth, window.innerHeight );
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.VSMShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    container?.appendChild( renderer.domElement );

    const GRAVITY = 30;

    const STEPS_PER_FRAME = 5;


    document.addEventListener( 'keydown', ( event ) => {

        player.keyStates[ event.code ] = true;

    } );

    document.addEventListener( 'keyup', ( event ) => {

        player.keyStates[ event.code ] = false;

    } );

    container?.addEventListener( 'mousedown', () => {

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

    window.addEventListener( 'resize', onWindowResize );

    function onWindowResize() {

        scene.camera.aspect = window.innerWidth / window.innerHeight;
        scene.camera.updateProjectionMatrix();

        renderer.setSize( window.innerWidth, window.innerHeight );

    }

    const loader = new GLTFLoader().setPath( './models/gltf/' );

    loader.load( 'collision-world.glb', ( gltf ) => {

        scene.scene.add( gltf.scene );

        scene.worldOctree.fromGraphNode( gltf.scene );

        gltf.scene.traverse( child => {

            if ( child.isMesh ) {

                child.castShadow = true;
                child.receiveShadow = true;

                if ( child.material.map ) {

                    child.material.map.anisotropy = 4;

                }

            }

        } );

        const helper = new OctreeHelper( scene.worldOctree );
        helper.visible = false;
        scene.scene.add( helper );

        const gui = new GUI( { width: 200 } );
        gui.add( { debug: false }, 'debug' )
            .onChange( function ( value ) {

                helper.visible = value;

            } );

        animate();

    } );

    function animate() {

        const deltaTime = Math.min( 0.05, clock.getDelta() ) / STEPS_PER_FRAME;

        // we look for collisions in substeps to mitigate the risk of
        // an object traversing another too quickly for detection.

        for ( let i = 0; i < STEPS_PER_FRAME; i ++ ) {

            player.controls( deltaTime );

            player.updatePlayer( deltaTime );

            Sphere.updateSpheres( scene, deltaTime, GRAVITY, player );

            player.teleportPlayerIfOob();

        }

        renderer.render( scene.scene, scene.camera );

        requestAnimationFrame( animate );

    }

  return (
    <>
      <div>
        <a href="https://vitejs.dev" target="_blank">
          <img src={viteLogo} className="logo" alt="Vite logo" />
        </a>
        <a href="https://react.dev" target="_blank">
          <img src={reactLogo} className="logo react" alt="React logo" />
        </a>
      </div>
      <h1>Vite + React</h1>
      <div className="card">
        <p>
          Edit <code>src/App.tsx</code> and save to test HMR
        </p>
      </div>
      <p className="read-the-docs">
        Click on the Vite and React logos to learn more
      </p>
    </>
  )
}

export default App
