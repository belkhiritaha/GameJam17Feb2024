import { Component } from "react";
import * as THREE from "three";
import { Capsule } from "three/examples/jsm/Addons.js";
import Sphere from "./Sphere";
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

interface MobProps {
    scene: any;
    gravity: number;
    position: THREE.Vector3;
    id: number;
    model_path: string;
}

export default class Mob extends Component<MobProps> {
    public mobDirection = new THREE.Vector3();
    public mobVelocity = new THREE.Vector3();
    public mobOnFloor = false;
    public keyStates : any = {};

    public mobCollider = new Capsule( this.props.position.clone(), this.props.position.clone().add(new THREE.Vector3(0, 1, 0)), 0.35 );
    public id: number;

    public gltf : any;
    public mixer : any;
    public idleAction : any;
    public attackAction : any = [];
    public hp = 100;
    public isDead = false;

    constructor( props : MobProps ) {

        super( props );
        this.id = props.id;

        const loader = new GLTFLoader().setPath( './models/gltf/' );

        // const texture = new THREE.TextureLoader().load("knight_texture.png");

        loader.load(
            props.model_path,
            (gltf : any) => {
                gltf.scene.scale.set(0.5, 0.5, 0.5);
                gltf.scene.position.set(0, 10, 0);
                this.props.scene.scene.add(gltf.scene);
                this.gltf = gltf.scene;
                this.mixer = new THREE.AnimationMixer(this.gltf);

                this.idleAction = this.mixer.clipAction(gltf.animations[46]);
                this.attackAction.push(this.mixer.clipAction(gltf.animations[0])); // from 0 to 3 are attack animations
                this.attackAction.push(this.mixer.clipAction(gltf.animations[1]));
                this.attackAction.push(this.mixer.clipAction(gltf.animations[2]));
                this.attackAction.push(this.mixer.clipAction(gltf.animations[8]));
                for (let i = 0; i < this.attackAction.length; i++) {
                    // this.attackAction[i].clampWhenFinished = true;
                    this.attackAction[i].loop = THREE.LoopOnce;
                    this.attackAction[i].timeScale = 15;
                }


                this.idleAction.timeScale = 3;
                this.idleAction.play();

                // hp bar
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
        if (!this.gltf) return;

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
        if (!this.gltf) return;

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
                if (sphere.isBeingThrown) {
                    this.hp -= 25;
                    sphere.isBeingThrown = false;

                    // update hp bar
                    const hpBar = this.gltf.children
                        .find((child : any) => child.name === "hpBar");
                    if (hpBar) {
                        hpBar.scale.x = this.hp / 100;
                    }

                    // if mob is dead
                    if (this.hp <= 0 && !this.isDead) {
                        this.killMob();
                    }

                    if (sphere.isCoin) {
                        // delete the coin
                        const coinSphere = this.props.scene.scene.getObjectByName(sphere.mesh.name);
                        if (coinSphere) {
                            this.props.scene.scene.remove(coinSphere);
                        }
                        this.props.scene.list_coins.splice(this.props.scene.list_coins.findIndex((coin : any) => coin.id === sphere.id), 1);
                    }
                }
            }

        }

    }

    killMob() {
        if (this.gltf) {
            this.props.scene.scene.remove(this.gltf);
            this.props.scene.mobs.splice(this.props.scene.mobs.findIndex((mob : any) => mob.id === this.id), 1);
        }
        if (!this.isDead) {
            // spawn objects around the mob
            const center = this.gltf?.position.clone();
            const radius = 1;
            const numObjects = 5;
            for (let i = 0; i < numObjects; i++) {
                const angle = (i / numObjects) * Math.PI * 2;
                const x = center.x + radius * Math.cos(angle);
                const z = center.z + radius * Math.sin(angle);
                // initial outwards velocity
                const vel = new THREE.Vector3(x - center.x, 0, z - center.z).normalize().multiplyScalar(10);
                if (i < 2) {
                    this.props.scene.loadCoin( new THREE.Vector3(x, center.y, z), vel, true );
                }
                else {
                    this.props.scene.loadOthers( 'plate.gltf.glb', 0.2, new THREE.Vector3(x, center.y, z), vel, true );
                    //this.props.scene.compteur_others += 1; todo
                }

            }
            this.isDead = true;
            this.mixer.stopAllAction();
            this.gltf = null;
        }
    }

    mobMobCollision( mob : any ) {
        // if distance between the two mobs is less than 2, then move them apart
        if (!this.gltf || !mob.gltf) return;

        const distance = this.gltf.position.distanceTo(mob.gltf.position);
        if (distance < 2) {
            const direction = this.gltf.position.clone().sub(mob.gltf.position).normalize();
            const delta = direction.multiplyScalar(2 - distance);
            this.mobCollider.translate(delta);
        }
    }


    updateMob( deltaTime : number ) {
        if (!this.gltf) return;

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

        this.props.scene.mobs.forEach((mob : any) => {
            if (mob.id !== this.id) {
                this.mobMobCollision(mob);
            }
        });

        if (this.mixer) {
            this.mixer.update(deltaTime);
        }
    }

    teleportMobIfOob() {
        if (!this.gltf) return;

        if ( this.mobCollider.end.y <= - 25 ) {

            this.mobCollider.start.set( 0, 0.35, 0 );
            this.mobCollider.end.set( 0, 1, 0 );
            this.mobCollider.radius = 0.35;

        }

    }
}