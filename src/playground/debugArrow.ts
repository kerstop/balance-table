import {
  Mesh,
  MeshBuilder,
  Quaternion,
  Scene,
  TransformNode,
  Vector3,
} from "@babylonjs/core";

export class DebugArrow extends TransformNode {
  shaft: Mesh;
  head: Mesh;

  public set direction(v: Vector3) {
    this.rotationQuaternion = Quaternion.FromLookDirectionRH(v, Vector3.Up());
  }

  constructor(
    public name: string,
    private scene: Scene,
    direction: Vector3,
  ) {
    super(name, scene, false);
    scene.addTransformNode(this);

    this.shaft = MeshBuilder.CreateCylinder(
      "shaft",
      {
        height: 1,
        diameter: 0.1,
      },
      this.scene,
    );
    this.shaft.position.z = 0.5;
    this.shaft.rotation.x = Math.PI / 2;
    this.shaft.setParent(this);

    this.head = MeshBuilder.CreateCylinder("head", {
      height: 0.25,
      diameterTop: 0,
      diameterBottom: 0.3,
    });
    this.head.position.z = 1.125;
    this.head.rotation.x = Math.PI / 2;
    this.head.setParent(this);

    this.rotationQuaternion = Quaternion.FromLookDirectionRH(
      direction,
      Vector3.Up(),
    );
  }
}
