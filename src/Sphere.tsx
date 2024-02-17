import { Component } from "react";
import * as THREE from "three";
import Player from "./Player";
import Mob from "./Mob";


interface SphereProps {
}

export default class Sphere extends Component<SphereProps> {
    public static vector1 = new THREE.Vector3();
    public static vector2 = new THREE.Vector3();
    public static vector3 = new THREE.Vector3();

    public geometry = new THREE.IcosahedronGeometry( 0.2, 5 );
    public material = new THREE.MeshLambertMaterial( { color: 0xdede8d } );
    public mesh = new THREE.Mesh( this.geometry, this.material );



    static spheresCollisions( scene : any ) {

        // concat between list of coins and list of others
        let spheres = scene.list_coins.concat(scene.list_others);

        for ( let i = 0, length = spheres.length; i < length; i ++ ) {

            const s1 = spheres[ i ];

            for ( let j = i + 1; j < length; j ++ ) {

                const s2 = spheres[ j ];

                const d2 = s1.collider.center.distanceToSquared( s2.collider.center );
                const r = s1.collider.radius + s2.collider.radius;
                const r2 = r * r;

                if ( d2 < r2 ) {

                    const normal = Sphere.vector1.subVectors( s1.collider.center, s2.collider.center ).normalize();
                    const v1 = Sphere.vector2.copy( normal ).multiplyScalar( normal.dot( s1.velocity ) );
                    const v2 = Sphere.vector3.copy( normal ).multiplyScalar( normal.dot( s2.velocity ) );

                    s1.velocity.add( v2 ).sub( v1 );
                    s2.velocity.add( v1 ).sub( v2 );

                    const d = ( r - Math.sqrt( d2 ) ) / 2;

                    s1.collider.center.addScaledVector( normal, d );
                    s2.collider.center.addScaledVector( normal, - d );

                }

            }

        }

    }


    static updateSpheres( scene : any, deltaTime : number, gravity : number, mobs : Mob[] ) {
        // concat between list of coins and list of others
        let spheres = scene.list_coins.concat(scene.list_others);
        spheres.forEach( ( sphere : any)  => {

            sphere.collider.center.addScaledVector( sphere.velocity, deltaTime );

            const result = scene.worldOctree.sphereIntersect( sphere.collider );

            if ( result ) {

                sphere.velocity.addScaledVector( result.normal, - result.normal.dot( sphere.velocity ) * 1.5 );
                sphere.collider.center.add( result.normal.multiplyScalar( result.depth ) );

            } else {

                sphere.velocity.y -= gravity * deltaTime;

            }

            const damping = Math.exp( - 1.5 * deltaTime ) - 1;
            sphere.velocity.addScaledVector( sphere.velocity, damping );


            // léger effet de rotation
            sphere.mesh.rotation.y += 1 * deltaTime;
            mobs.forEach( ( mob : any ) => mob.mobSphereCollision( sphere ) );
            scene.playerSphereCollision( sphere );

        } );

        Sphere.spheresCollisions( scene );

        for ( const sphere of spheres ) {

            sphere.mesh.position.copy( sphere.collider.center );

        }

    }
}