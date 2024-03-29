import { Component } from "react";
import * as THREE from "three";
import Sphere from "./Sphere";
import { Octree } from 'three/addons/math/Octree.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

interface SceneProps {
    loaderManager: THREE.LoadingManager
}

export default class Scene extends Component<SceneProps> {

    static GRAVITY = 30;
    static STEPS_PER_FRAME = 5;

    public compteur_coins;
    public compteur_others;

    public list_coins : any[] = [];
    public list_others : any[] = [];

    public scene = new THREE.Scene();
    public player : any;
    public shop : any;

    public mobs : any[] = [];

    public worldOctree = new Octree();
    public camera = new THREE.PerspectiveCamera( 70, window.innerWidth / window.innerHeight, 0.1, 1000 );
    public renderer = new THREE.WebGLRenderer( { antialias: true } );
    public container = document.getElementById( 'container' );

    public loader;

    public model_coin: any;
    public model_warrior_skeleton: any;
    public model_mage_skeleton: any;
    public model_rogue_skeleton: any;

    static sound_gethit: any;
    static sound_hit: any;
    static sound_throw: any;

    public objective = 50;



    constructor( props : SceneProps ) {
        super( props );
        this.camera.rotation.order = 'YXZ';
        this.loader = new GLTFLoader(props.loaderManager).setPath( './models/gltf/' );
        this.scene.background = new THREE.CubeTextureLoader().load([
            "test_right.png", "test_left.png",
            "test_top.png", "test_bottom.png",
            "test_front.png", "test_back.png"
        ]);
        this.scene.fog = new THREE.Fog( 0x88ccee, 0, 50 );
        this.compteur_coins = 0;
        this.compteur_others = 0;

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

        const listener = new THREE.AudioListener();
        this.camera.add( listener );

        // create a global audio source
        const sound = new THREE.Audio( listener );

        // load a sound and set it as the Audio object's buffer
        const audioLoader = new THREE.AudioLoader();
        audioLoader.load( 'sounds/hit.wav', function( buffer ) {
            sound.setBuffer( buffer );
            sound.duration = 0.5;
            sound.setLoop( false );
            sound.setVolume( 0.5 );
            Scene.sound_hit = sound;
        });

        audioLoader.load( 'sounds/gethit.wav', function( buffer ) {
            sound.setBuffer( buffer );
            sound.setLoop( false );
            sound.setVolume( 0.5 );
            Scene.sound_gethit = sound;
        });

        const SPHERE_RADIUS = 0.3;

        // load map
        this.loadMap();

        // load coins
        for(let i=0; i<20; i++) {
            this.loadCoin( new THREE.Vector3( Math.random() * 10, 5, Math.random() * 10 ), new THREE.Vector3(0, 0, 0), true );
        }
        // and 4 others
        this.loadOthers( null, SPHERE_RADIUS, new THREE.Vector3( 0, -100, 0 ), new THREE.Vector3(0, 0, 0), false );
        this.loadOthers( null, SPHERE_RADIUS, new THREE.Vector3( 0, -100, 0 ), new THREE.Vector3(0, 0, 0), false );
        this.loadOthers( null, SPHERE_RADIUS, new THREE.Vector3( 0, -100, 0 ), new THREE.Vector3(0, 0, 0), false );
        this.loadOthers( null, SPHERE_RADIUS, new THREE.Vector3( 0, -100, 0 ), new THREE.Vector3(0, 0, 0), false );
        //this.compteur_others += 4;
        //this.player.ammo_others += 4;
    }

    playThrowSound(soundName: string) {
        const listener = new THREE.AudioListener();
        this.camera.add( listener );
        const sound = new THREE.Audio( listener );

        const audioLoader = new THREE.AudioLoader();
        audioLoader.load( 'sounds/' + soundName + '.wav', function( buffer ) {
            sound.setBuffer( buffer );
            sound.setLoop( false );
            sound.setVolume( 0.5 );
            sound.play();
        });

        // delete listener
        this.camera.remove( listener );
    }

    loadMap(){
        this.loader.load( 'test_small_map.glb', ( gltf ) => {
            
            this.scene.add( gltf.scene );
            this.worldOctree.fromGraphNode( gltf.scene );

            gltf.scene.traverse( child => {
                child.frustumCulled = false;
                child.castShadow = false;
                child.receiveShadow = false;

                if ( child.isMesh ) {

                    child.castShadow = false;
                    child.receiveShadow = false;

                    // if ( child.material.map ) { child.material.map.anisotropy = 4; }

                }

            } );
        } );
    }

    // path: chemin vers le fichier
    // r_: rayon du modèle (pour les collisions)

    loadCoin(position: THREE.Vector3 = new THREE.Vector3(0, -100, 0), velocity: THREE.Vector3 = new THREE.Vector3(0, 0, 0), onGround: boolean = true) {
        this.loader.load( 'coin.gltf.glb', ( gltf ) => {
            const model_ = gltf.scene.clone();
            model_.castShadow = true;
            model_.receiveShadow = true;
            model_.name = "coin_number_" + this.compteur_coins;

            model_.position.set( 0, -100, 0 );
            this.scene.add( model_ );

            this.list_coins.push( {
                id: "coin_number_" + this.compteur_coins,
                isCoin: true,
                isOnGround: onGround,
                isBeingThrown: false,
                mesh: model_,
                collider: new THREE.Sphere( position , 0.2 ),
                velocity: velocity
            } );
            this.compteur_coins += 1;
            // this.player.ammo_coin += 1;
        } );


    }

    loadOthers( path_: string | null, r_: number, position: THREE.Vector3 = new THREE.Vector3(0, -100, 0), velocity: THREE.Vector3 = new THREE.Vector3(0, 0, 0), onGround: boolean = true) {
        let path = ".gltf.glb"

        // insert into path random "key" or "plate" or "chair" or "torch"
        const rand = Math.floor(Math.random() * 4);
        if(rand === 0) {
            path = "key" + path;
        } else if(rand === 1) {
            path = "plate" + path;
        } else if(rand === 2) {
            path = "chair" + path;
        } else {
            path = "torch" + path;
        }

        this.loader.load( path_ ?? path, ( gltf ) => {
            const model_ = gltf.scene.clone();
            model_.castShadow = true;
            model_.receiveShadow = true;
            model_.name = "others_number_" + this.compteur_others;

            model_.position.set( 0, -100, 0 );
            this.scene.add( model_ );

            this.list_others.push( {
                id: "others_number_" + this.compteur_others,
                isCoin: false,
                isOnGround: onGround,
                isBeingThrown: false,
                mesh: model_,
                collider: new THREE.Sphere( position, r_ ),
                velocity: velocity
            } );


        } );
    }

    // with objects
    playerSphereCollision( sphere : any ) {

        const center = Sphere.vector1.addVectors( this.player.playerCollider.start, this.player.playerCollider.end ).multiplyScalar( 0.5 );

        const sphere_center = sphere.collider.center;

        const r = this.player.playerCollider.radius + sphere.collider.radius;
        const r2 = r * r;

        // approximation: player = 3 spheres

        for ( const point of [ this.player.playerCollider.start, this.player.playerCollider.end, center ] ) {

            const d2 = point.distanceToSquared( sphere_center );

            if ( d2 < r2 ) {

                // effet de recul
                const normal = Sphere.vector1.subVectors( point, sphere_center ).normalize();
                const v1 = Sphere.vector2.copy( normal ).multiplyScalar( normal.dot( this.player.playerVelocity ) );
                const v2 = Sphere.vector3.copy( normal ).multiplyScalar( normal.dot( sphere.velocity ) );

                this.player.playerVelocity.add( v2 ).sub( v1 );
                sphere.velocity.add( v1 ).sub( v2 );

                const d = ( r - Math.sqrt( d2 ) ) / 2;
                sphere_center.addScaledVector( normal, - d );

                // recup a coin
                if(sphere.isCoin) {
                    // remove object..
                    let selectedName = sphere.mesh.name;
                    let selectedObject = this.scene.getObjectByName( selectedName );
                    // move to 0 -100 0
                    sphere.collider.center.set(0, -100, 0);
                    // set as not on ground
                    sphere.isOnGround = false;
                    this.playThrowSound("minecraft");

                    // ..from the list of list_coins
                    // this.list_coins.splice(this.list_coins.findIndex(function(i){
                    //     return i.id === selectedName;
                    // }), 1);
                    // ..from the scene
                    // this.scene.remove( selectedObject! );

                    // and add new coin
                    // this.player.list_coins_index -= 1;
                    // this.loadCoin(new THREE.Vector3(0, -100, 0), new THREE.Vector3(0, 0, 0), false);
                }

            }
        }
    }

}
