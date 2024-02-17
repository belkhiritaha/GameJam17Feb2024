import { Component } from "react";
import * as THREE from "three";
import { Capsule } from "three/examples/jsm/Addons.js";
import Sphere from "./Sphere";
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

interface MobProps {
    scene: any;
    gravity: number;
}

export default class Mob extends Component<MobProps> {
    public mobDirection = new THREE.Vector3();
    public mobVelocity = new THREE.Vector3();
    public mobOnFloor = false;
    public keyStates : any = {};
    public mobCollider = new Capsule( new THREE.Vector3( 0, 5.35, 0 ), new THREE.Vector3( 0, 6, 0 ), 0.35 );

    public gltf : any;
    public mixer : any;
    public runAction : any;
    public idleAction : any;
    public attackAction : any = [];
    public hp = 100;


    constructor( props : MobProps ) {

        super( props );

        const loader = new GLTFLoader();

        // const texture = new THREE.TextureLoader().load("knight_texture.png");

        loader.load(
            "/models/gltf/Knight.glb",
            (gltf : any) => {
                gltf.scene.scale.set(0.5, 0.5, 0.5);
                gltf.scene.position.set(0, 10, 0);
                this.props.scene.scene.add(gltf.scene);
                this.gltf = gltf.scene;
                this.mixer = new THREE.AnimationMixer(this.gltf);

                this.runAction = this.mixer.clipAction(gltf.animations[48]);
                this.idleAction = this.mixer.clipAction(gltf.animations[36]);
                this.attackAction.push(this.mixer.clipAction(gltf.animations[0])); // from 0 to 3 are attack animations
                this.attackAction.push(this.mixer.clipAction(gltf.animations[1]));
                this.attackAction.push(this.mixer.clipAction(gltf.animations[2]));
                // this.attackAction.push(this.mixer.clipAction(gltf.animations[3]));
                this.attackAction.push(this.mixer.clipAction(gltf.animations[8]));
                for (let i = 0; i < this.attackAction.length; i++) {
                    // this.attackAction[i].clampWhenFinished = true;
                    this.attackAction[i].loop = THREE.LoopOnce;
                    this.attackAction[i].timeScale = 15;
                }


                // this.attackAction.play();
                this.idleAction.timeScale = 3;
                this.runAction.timeScale = 6;
                // this.runAction.play();
                this.idleAction.play();

                const helmet = (gltf.scene.children[0].children[3] as THREE.SkinnedMesh).skeleton.bones[14].children[0];
                helmet.rotation.x = 1;
                helmet.parent?.remove(helmet);

                // hp bar
                // const geometry = new THREE.PlaneGeometry(1, 0.1); needs to be proportional to the hp
                const geometry = new THREE.PlaneGeometry(1 * this.hp / 100, 0.1);
                const material = new THREE.MeshBasicMaterial({ color: 0xff0000, side: THREE.DoubleSide });
                const plane = new THREE.Mesh(geometry, material);
                plane.position.set(0, 3, 0);
                plane.name = "hpBar";
                gltf.scene.add(plane);
            }
        );
    }

    mobCollisions() {

        const result = this.props.scene.worldOctree.capsuleIntersect( this.mobCollider );

        this.mobOnFloor = false;

        if ( result ) {

            this.mobOnFloor = result.normal.y > 0;

            if ( ! this.mobOnFloor ) {

                this.mobVelocity.addScaledVector( result.normal, - result.normal.dot( this.mobVelocity ) );

            }

            this.mobCollider.translate( result.normal.multiplyScalar( result.depth ) );

        }

    }

    mobSphereCollision( sphere : any ) {

        const center = Sphere.vector1.addVectors( this.mobCollider.start, this.mobCollider.end ).multiplyScalar( 0.5 );

        const sphere_center = sphere.collider.center;

        const r = this.mobCollider.radius + sphere.collider.radius;
        const r2 = r * r;

        // approximation: mob = 3 spheres

        for ( const point of [ this.mobCollider.start, this.mobCollider.end, center ] ) {

            const d2 = point.distanceToSquared( sphere_center );

            if ( d2 < r2 ) {

                const normal = Sphere.vector1.subVectors( point, sphere_center ).normalize();
                const v1 = Sphere.vector2.copy( normal ).multiplyScalar( normal.dot( this.mobVelocity ) );
                const v2 = Sphere.vector3.copy( normal ).multiplyScalar( normal.dot( sphere.velocity ) );

                this.mobVelocity.add( v2 ).sub( v1 );
                sphere.velocity.add( v1 ).sub( v2 );

                const d = ( r - Math.sqrt( d2 ) ) / 2;
                sphere_center.addScaledVector( normal, - d );
                this.hp -= 10;

                // update hp bar
                const hpBar = this.gltf.children
                    .find((child : any) => child.name === "hpBar");
                if (hpBar) {
                    hpBar.scale.x = this.hp / 100;
                }

                // if mob is dead
                if (this.hp <= 0) {
                    this.killMob();
                }
            }

        }

    }

    killMob() {
        this.props.scene.scene.remove(this.gltf);
    }


    updateMob( deltaTime : number ) {
        const player = this.props.scene.player;
        const playerPos = player.playerCollider.start.clone().add(player.playerCollider.end).multiplyScalar(0.5);

        const mobPos = this.mobCollider.start.clone().add(this.mobCollider.end).multiplyScalar(0.5);

        const direction = playerPos.clone().sub(mobPos).normalize();

        const angle = Math.atan2(direction.x, direction.z);
        this.gltf && (this.gltf.rotation.y = angle);


        // Adjust the velocity of the mob to move towards the player
        const speed = 1; // Adjust the speed as needed
        this.mobVelocity.copy(direction).multiplyScalar(speed);

        let damping = Math.exp( - 4 * deltaTime ) - 1;

        if ( ! this.mobOnFloor ) {

            this.mobVelocity.y -= this.props.gravity * deltaTime;

            // small air resistance
            damping *= 0.1;

        }

        this.mobVelocity.addScaledVector( this.mobVelocity, damping );

        const deltaPosition = this.mobVelocity.clone().multiplyScalar( deltaTime );
        this.mobCollider.translate( deltaPosition );
        // copy the position of the collider to the model
        this.gltf?.position.copy(this.mobCollider.start);

        //

        this.mobCollisions();

    }

    teleportMobIfOob() {

        if ( this.mobCollider.end.y <= - 25 ) {

            this.mobCollider.start.set( 0, 0.35, 0 );
            this.mobCollider.end.set( 0, 1, 0 );
            this.mobCollider.radius = 0.35;

        }

    }
}