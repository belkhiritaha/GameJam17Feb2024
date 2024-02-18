import { Component } from "react";
import * as THREE from "three";
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { TextGeometry } from 'three/examples/jsm/geometries/TextGeometry';
import { Font } from 'three/examples/jsm/loaders/FontLoader';
import { FontLoader } from "three/examples/jsm/loaders/FontLoader";

interface ShopProps {
    scene: any;
}

export default class Shop extends Component<ShopProps> {
    public gltf : any;
    public textMesh : THREE.Mesh;
    public text : string = "Shop!";
    public textSize : number = 1;

    public coinPrice : number = 2;
    public numItems : number = 10;

    public distanceToBuy : number = 3;

    constructor( props : ShopProps ) {
        super( props );

        const loader = new GLTFLoader().setPath( './models/gltf/' );

        loader.load(
            "chest_gold.glb",
            (gltf : any) => {
                gltf.scene.position.set(8, 1.25, 7);
                gltf.scene.rotateY(Math.PI);
                this.props.scene.scene.add(gltf.scene);
                this.gltf = gltf.scene;
            }
        );

        const textLoader = new FontLoader();
        textLoader.load(
            'fonts/BreatheFire.json',
            (font: Font) => {
                const textGeometry = new TextGeometry(this.text, {
                    font: font,
                    size: this.textSize,
                    height: 0.1,
                    curveSegments: 4,
                });
                const textMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff });
                this.textMesh = new THREE.Mesh(textGeometry, textMaterial);
                this.textMesh.position.copy(new THREE.Vector3(9, 3, 7));
                this.textMesh.rotateY(Math.PI);
                this.props.scene.scene.add(this.textMesh);
        });
    }

    changeText(newText : string) {
        this.text = newText;
        this.textMesh.geometry.dispose();
        const textLoader = new FontLoader();
        textLoader.load(
            'fonts/BreatheFire.json',
            (font: Font) => {
                const textGeometry = new TextGeometry(this.text, {
                    font: font,
                    size: this.textSize,
                    height: 0.1,
                    curveSegments: 4,
                });
                const textMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff });
                this.textMesh.geometry = textGeometry;
                this.textMesh.material = textMaterial;
        });
    }


    sellItems() {
        if (this.props.scene.list_coins.map((coin : any) => !coin.isOnGround ? coin : null).filter((coin : any) => coin !== null).length === 0) {
            console.log("You have no coins to sell!");
            return;
        }
    }

    update() {
        if (this.textMesh) {
            if (this.props.scene.camera.position.distanceTo(this.textMesh.position) < this.distanceToBuy && this.text === "Shop!") {
                this.textSize = 0.3;
                this.changeText("[E] Buy items!");
            }

            if (this.props.scene.camera.position.distanceTo(this.textMesh.position) > this.distanceToBuy && this.text !== "Shop!") {
                this.textSize = 1;
                this.changeText("Shop!");
            }
        }
    }
}