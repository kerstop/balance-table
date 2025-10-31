import { ArcRotateCamera } from "@babylonjs/core/Cameras/arcRotateCamera";
import { DefaultRenderingPipeline } from "@babylonjs/core/PostProcesses/RenderPipeline/Pipelines/defaultRenderingPipeline";
import { HemisphericLight } from "@babylonjs/core/Lights/hemisphericLight";
import { Scene } from "@babylonjs/core/scene";
import { Tools } from "@babylonjs/core/Misc/tools";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
// import { LoadAssetContainerAsync } from "@babylonjs/core/Loading/sceneLoader";
import { Table } from "./table";
import { Sphere } from "./sphere";
import { MeshBuilder, UtilityLayerRenderer } from "@babylonjs/core";

export default class MainScene {
  private camera: ArcRotateCamera;
  private utilityLayer: UtilityLayerRenderer;

  constructor(
    private scene: Scene,
    private canvas: HTMLCanvasElement,
  ) {
    this.utilityLayer = new UtilityLayerRenderer(scene);
    this._setCamera(scene);
    this._setLight(scene);
    //  this._setEnvironment(scene);
    this.loadComponents();
  }

  _setCamera(scene: Scene): void {
    this.camera = new ArcRotateCamera(
      "camera",
      Tools.ToRadians(90),
      Tools.ToRadians(80),
      20,
      Vector3.Zero(),
      scene,
    );
    this.camera.attachControl(this.canvas, true);
    this.camera.setTarget(Vector3.Zero());
  }

  _setLight(scene: Scene): void {
    const light = new HemisphericLight("light", new Vector3(0, 1, 0), scene);
    light.intensity = 0.5;
  }

  _setEnvironment(scene: Scene) {
    scene.createDefaultEnvironment({
      createGround: false,
      createSkybox: false,
    });
  }

  _setPipeLine(): void {
    const pipeline = new DefaultRenderingPipeline(
      "default-pipeline",
      false,
      this.scene,
      [this.scene.activeCamera!],
    );
    pipeline.fxaaEnabled = true;
    pipeline.samples = 4;
  }

  async loadComponents(): Promise<void> {
    // Load your files in order
    let sphere = new Sphere(this.scene);
    new Table(this.scene, sphere, this.utilityLayer);
  }
}
