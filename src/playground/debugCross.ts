import { Mesh, MeshBuilder, Scene, TransformNode } from "@babylonjs/core";

export class DebugCross extends TransformNode {
  m1: Mesh;
  m2: Mesh;
  m3: Mesh;
  constructor(
    public name: string,
    private scene: Scene,
    length: number,
  ) {
    super(name, scene, false);
    this.scene.addTransformNode(this);

    let m1 = MeshBuilder.CreateCylinder(
      "m1",
      {
        diameter: 0.1,
        height: length,
      },
      this.scene,
    );
    m1.setParent(this);

    let m2 = MeshBuilder.CreateCylinder(
      "m2",
      {
        diameter: 0.1,
        height: length,
      },
      this.scene,
    );
    m2.rotation.x = Math.PI / 2;
    m2.setParent(this);

    let m3 = MeshBuilder.CreateCylinder(
      "m3",
      {
        diameter: 0.1,
        height: length,
      },
      this.scene,
    );
    m3.rotation.z = Math.PI / 2;
    m3.setParent(this);
  }
}
