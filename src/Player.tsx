import { Component } from "react";
import * as THREE from "three";
import { Capsule } from "three/examples/jsm/Addons.js";
import Scene from "./Scene";

interface PlayerProps {
    scene: any;
    gravity: number;
    mouseTime: number;
}

export default class Player extends Component<PlayerProps> {
    public healthPoints = 100;
    public playerDirection = new THREE.Vector3();
    public playerVelocity = new THREE.Vector3();
    public playerOnFloor = false;
    public keyStates : any = {};
    public playerCollider = new Capsule( new THREE.Vector3( 0, 10.35, 0 ), new THREE.Vector3( 0, 11, 0 ), 0.35 );

    constructor( props : PlayerProps ) {
        super( props );
    }

    getForwardVector() {

        this.props.scene.camera.getWorldDirection( this.playerDirection );
        this.playerDirection.y = 0;
        this.playerDirection.normalize();

        return this.playerDirection;

    }

    getSideVector() {

        this.props.scene.camera.getWorldDirection( this.playerDirection );
        this.playerDirection.y = 0;
        this.playerDirection.normalize();
        this.playerDirection.cross( this.props.scene.camera.up );

        return this.playerDirection;

    }

    controls( deltaTime : number ) {

        // gives a bit of air control
        const speedDelta = deltaTime * ( this.playerOnFloor ? 25 : 8 );

        if ( this.keyStates[ 'KeyW' ] ) {

            this.playerVelocity.add( this.getForwardVector().multiplyScalar( speedDelta ) );

        }

        if ( this.keyStates[ 'KeyS' ] ) {

            this.playerVelocity.add( this.getForwardVector().multiplyScalar( - speedDelta ) );

        }

        if ( this.keyStates[ 'KeyA' ] ) { this.playerVelocity.add( this.getSideVector().multiplyScalar( - speedDelta ) ); }

        if ( this.keyStates[ 'KeyD' ] ) {

            this.playerVelocity.add( this.getSideVector().multiplyScalar( speedDelta ) );

        }

        if ( this.keyStates[ 'KeyE' ] ) {
            console.log("E");
            // if distance between camera and shop is less than 2, then open shop
            if (!this.props.scene.shop.gltf) return;
            const distance = this.props.scene.camera.position.distanceTo(this.props.scene.shop.gltf.position);
            console.log(distance);
            if (distance < this.props.scene.shop.distanceToBuy) {
                console.log(this.props.scene.list_coins.map( ( coin : any ) => !coin.isOnGround ? coin : null ).filter( ( coin : any ) => coin !== null ).length);
                if (this.props.scene.list_coins.map( ( coin : any ) => !coin.isOnGround ? coin : null ).filter( ( coin : any ) => coin !== null ).length >= this.props.scene.shop.coinPrice) {
                    console.log("buy");
                    // remove from list_coins coinPrice coins that are not on ground
                    for (let i = 0; i < this.props.scene.shop.coinPrice; i++) {
                        this.props.scene.list_coins.splice(this.props.scene.list_coins.findIndex((coin : any) => !coin.isOnGround), 1);
                    }

                    // add numItems
                    for (let i = 0; i < this.props.scene.shop.numItems; i++) {
                        this.props.scene.loadOthers( null, 0.3 , new THREE.Vector3(0, -100, 0), new THREE.Vector3(0, 0, 0), false );
                    }
                }
            }
            this.keyStates[ 'KeyE' ] = false;
        }


        if ( this.playerOnFloor ) { if ( this.keyStates[ 'Space' ] ) { this.playerVelocity.y = 5; } }

    }

    // with map
    playerCollisions() {
        const result = this.props.scene.worldOctree.capsuleIntersect( this.playerCollider );
        this.playerOnFloor = false;
        if ( result ) {
            this.playerOnFloor = result.normal.y > 0;
            if ( ! this.playerOnFloor ) {
                this.playerVelocity.addScaledVector( result.normal, - result.normal.dot( this.playerVelocity ) );
            }
            this.playerCollider.translate( result.normal.multiplyScalar( result.depth ) );
        }
    }

    playerMobCollision( mob : any ) {
        // if distance between the two is less than 2, then move them apart
        if (!this.props.scene.camera || !mob.gltf) return;

        const distance = this.props.scene.camera.position.distanceTo(mob.gltf.position);
        if (distance < 1.5) {
            const direction = new THREE.Vector3().subVectors(this.props.scene.camera.position, mob.gltf.position).normalize();
            const delta = direction.multiplyScalar(1.5 - distance);
            this.playerCollider.translate(delta);
        }
    }

    //
    throwBall() {
        this.props.scene.camera.getWorldDirection( this.playerDirection );
        const impulse = 15 + 30 * ( 1 - Math.exp( ( this.props.mouseTime - performance.now() ) * 0.001 ) );

        // throw others projectioal and after coin
        if(this.props.scene.list_others.map( ( other : any ) => !other.isOnGround ? other : null ).filter( ( other : any ) => other !== null ).length > 0) {
            // throw something
            const other = this.props.scene.list_others.map( ( other : any ) => !other.isOnGround ? other : null ).filter( ( other : any ) => other !== null )[ 0 ];

            other.collider.center.copy( this.playerCollider.end ).addScaledVector( this.playerDirection, this.playerCollider.radius * 2.0 );

            other.velocity.copy( this.playerDirection ).multiplyScalar( impulse );
            other.velocity.addScaledVector( this.playerVelocity, 2 );

            // make it on ground
            other.isOnGround = true;
            other.isBeingThrown = true;

            this.props.scene.playThrowSound("throw");
        } else {
            if(this.props.scene.list_coins.map( ( coin : any ) => !coin.isOnGround ? coin : null ).filter( ( coin : any ) => coin !== null ).length > 0) {
                // throw coin
                const coin = this.props.scene.list_coins.map( ( coin : any ) => !coin.isOnGround ? coin : null ).filter( ( coin : any ) => coin !== null )[ 0 ];

                coin.collider.center.copy( this.playerCollider.end ).addScaledVector( this.playerDirection, this.playerCollider.radius * 2.0 );

                coin.velocity.copy( this.playerDirection ).multiplyScalar( impulse );
                coin.velocity.addScaledVector( this.playerVelocity, 2 );

                // make it on ground
                coin.isOnGround = true;
                coin.isBeingThrown = true;

                this.props.scene.playThrowSound("throw");
            }
        }
    }

    teleportPlayerIfOob() {

        if ( this.props.scene.camera.position.y <= - 25 ) {

            this.playerCollider.start.set( 0, 10.35, 0 );
            this.playerCollider.end.set( 0, 11, 0 );
            this.playerCollider.radius = 0.35;
            this.props.scene.camera.position.copy( this.playerCollider.end );
            this.props.scene.camera.rotation.set( 0, 0, 0 );

        }

    }

    updatePlayer( deltaTime : number ) {
        let damping = Math.exp( - 4 * deltaTime ) - 1;

        if ( ! this.playerOnFloor ) {

            this.playerVelocity.y -= this.props.gravity * deltaTime;

            // small air resistance
            damping *= 0.1;

        }

        this.playerVelocity.addScaledVector( this.playerVelocity, damping );

        const deltaPosition = this.playerVelocity.clone().multiplyScalar( deltaTime );
        this.playerCollider.translate( deltaPosition );

        this.playerCollisions();

        this.props.scene.mobs.forEach( ( mob : any ) => this.playerMobCollision( mob ) );

        this.props.scene.camera.position.copy( this.playerCollider.end );

        document.getElementById('points_de_vie')!.value = this.healthPoints;
        document.getElementById('pieces_restantes')!.innerHTML = "" + this.props.scene.list_coins.map( ( coin : any ) => !coin.isOnGround ? coin : null ).filter( ( coin : any ) => coin !== null ).length;
        document.getElementById('autres_objets_restants')!.innerHTML = "" + this.props.scene.list_others.map( ( other : any ) => !other.isOnGround ? other : null ).filter( ( other : any ) => other !== null ).length;

        // player dead
        if(this.healthPoints <= 0) {
            document.exitPointerLock();
            document.getElementById('inventaire')!.style.display = "none";
            document.getElementById('viseur')!.style.display = "none";
            document.getElementById('container')!.style.display = "none";
            document.getElementById('root')!.style.display = "none";
            document.getElementById('end_game')!.style.display = "block";
        }
    }
}