import { Component } from "react";
import * as THREE from "three";
import { Capsule } from "three/examples/jsm/Addons.js";

interface PlayerProps {
    scene: any;
    gravity: number;
    mouseTime: number;
}

export default class Player extends Component<PlayerProps> {
    public playerDirection = new THREE.Vector3();
    public playerVelocity = new THREE.Vector3();
    public playerOnFloor = false;
    public keyStates : any = {};
    public playerCollider = new Capsule( new THREE.Vector3( 0, 0.35, 0 ), new THREE.Vector3( 0, 1, 0 ), 0.35 );
    public sphereIdx = 0;

    public ammo = 6;

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

        if ( this.playerOnFloor ) { if ( this.keyStates[ 'Space' ] ) { this.playerVelocity.y = 15; } }

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

    //
    throwBall() {

        if( this.ammo > 0 ) {
            const sphere = this.props.scene.spheres[ this.sphereIdx ];

            this.props.scene.camera.getWorldDirection( this.playerDirection );

            sphere.collider.center.copy( this.playerCollider.end ).addScaledVector( this.playerDirection, this.playerCollider.radius * 2.0 );

            // throw the ball with more force if we hold the button longer, and if we move forward

            const impulse = 15 + 30 * ( 1 - Math.exp( ( this.props.mouseTime - performance.now() ) * 0.001 ) );

            sphere.velocity.copy( this.playerDirection ).multiplyScalar( impulse );
            sphere.velocity.addScaledVector( this.playerVelocity, 2 );

            this.sphereIdx = ( this.sphereIdx + 1 ) % this.props.scene.spheres.length;

            this.ammo -= 1;
        }

    }

    teleportPlayerIfOob() {

        if ( this.props.scene.camera.position.y <= - 25 ) {

            this.playerCollider.start.set( 0, 0.35, 0 );
            this.playerCollider.end.set( 0, 1, 0 );
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

        this.props.scene.camera.position.copy( this.playerCollider.end );

        // update
        document.getElementById('munitions_restantes')!.innerHTML = "" + this.ammo;

    }
}