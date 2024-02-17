import { Component } from "react";
import * as THREE from "three";
import Sphere from "./Sphere";
import { Octree } from 'three/addons/math/Octree.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

interface SceneProps {
    //clock: THREE.Clock
}

export default class Scene extends Component<SceneProps> {

    static GRAVITY = 30;
    static STEPS_PER_FRAME = 5;

    public scene = new THREE.Scene();
    public player : any;
    public spheres : any[] = [];
    public worldOctree = new Octree();
    public camera = new THREE.PerspectiveCamera( 70, window.innerWidth / window.innerHeight, 0.1, 1000 );
    public renderer = new THREE.WebGLRenderer( { antialias: true } );
    public container = document.getElementById( 'container' );

    public loader = new GLTFLoader().setPath( './models/gltf/' );

    public model_coin: any;

    constructor( props : SceneProps ) {
        super( props );
        this.camera.rotation.order = 'YXZ';
        this.scene.background = new THREE.Color( 0x88ccee );
        this.scene.fog = new THREE.Fog( 0x88ccee, 0, 50 );

        const fillLight1 = new THREE.HemisphereLight( 0x8dc1de, 0x00668d, 1.5 );
        fillLight1.position.set( 2, 1, 1 );
        this.scene.add( fillLight1 );

        const directionalLight = new THREE.DirectionalLight( 0xffffff, 2.5 );
        directionalLight.position.set( - 5, 25, - 1 );
        directionalLight.castShadow = true;
        directionalLight.shadow.camera.near = 0.01;
        directionalLight.shadow.camera.far = 500;
        directionalLight.shadow.camera.right = 30;
        directionalLight.shadow.camera.left = - 30;
        directionalLight.shadow.camera.top	= 30;
        directionalLight.shadow.camera.bottom = - 30;
        directionalLight.shadow.mapSize.width = 1024;
        directionalLight.shadow.mapSize.height = 1024;
        directionalLight.shadow.radius = 4;
        directionalLight.shadow.bias = - 0.00006;
        this.scene.add( directionalLight );

        this.renderer.setPixelRatio( window.devicePixelRatio );
        this.renderer.setSize( window.innerWidth, window.innerHeight );
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.VSMShadowMap;
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.container?.appendChild( this.renderer.domElement );

        const NUM_SPHERES = 100;
        const SPHERE_RADIUS = 0.2;

        const sphereGeometry = new THREE.IcosahedronGeometry( SPHERE_RADIUS, 5 );
        const sphereMaterial = new THREE.MeshLambertMaterial( { color: 0xdede8d } );

        // load map & objects
        this.loadModels();

        // load coin
        this.loader.load( 'coin.gltf.glb', ( gltf ) => {

            for ( let i = 0; i < NUM_SPHERES; i ++ ) {

                const sphere = new THREE.Mesh( gltf.scene, sphereMaterial );
                sphere.castShadow = true;
                sphere.receiveShadow = true;

                this.scene.add( sphere );

                this.spheres.push( {
                    mesh: sphere,
                    collider: new THREE.Sphere( new THREE.Vector3( 0, - 100, 0 ), SPHERE_RADIUS ),
                    velocity: new THREE.Vector3()
                } );

            }

            //this.scene.add( gltf.scene );
            /*this.model_coin = gltf.scene;
            gltf.scene.name = 'coin';
            gltf.scene.traverse( child => {
                if ( child.isMesh ) {
                    child.castShadow = true;
                    child.receiveShadow = true;
                }
            } );*/
        } );

    }

    loadModels(){


        // load world
        this.loader.load( 'collision-world.glb', ( gltf ) => {

            this.scene.add( gltf.scene );

            this.worldOctree.fromGraphNode( gltf.scene );

            gltf.scene.traverse( child => {

                if ( child.isMesh ) {

                    child.castShadow = true;
                    child.receiveShadow = true;

                    if ( child.material.map ) {

                        child.material.map.anisotropy = 4;

                    }

                }

            } );
        } );
    }

}
