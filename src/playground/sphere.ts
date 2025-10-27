import {
  Mesh,
  MeshBuilder,
  PhysicsActivationControl,
  PhysicsBody,
  PhysicsMotionType,
  PhysicsPrestepType,
  PhysicsShapeSphere,
  Scene,
  Vector3,
} from "@babylonjs/core";

export class Sphere {
  mesh: Mesh;
  physicsBody: PhysicsBody;
  spawn_position: Vector3 = new Vector3(0.2, 5, 0);
  constructor(private scene: Scene) {
    this.mesh = MeshBuilder.CreateSphere(
      "sphere",
      { diameter: 1, segments: 32 },
      this.scene,
    );
    this.mesh.position = this.spawn_position.clone();

    this.physicsBody = new PhysicsBody(
      this.mesh,
      PhysicsMotionType.DYNAMIC,
      false,
      this.scene,
    );
    this.physicsBody.setMassProperties({ mass: 1 });
    this.physicsBody.shape = new PhysicsShapeSphere(
      Vector3.Zero(),
      0.5,
      this.scene,
    );
    window.hk.setActivationControl(
      this.physicsBody,
      PhysicsActivationControl.ALWAYS_ACTIVE,
    );
    this.physicsBody.setPrestepType(PhysicsPrestepType.TELEPORT);
    this.scene.onBeforePhysicsObservable.add(() => this.beforePhysics());
  }

  beforePhysics() {
    if (this.physicsBody.transformNode.position.length() > 30) {
      this.physicsBody.transformNode.setAbsolutePosition(
        this.spawn_position.clone(),
      );
      this.physicsBody.setAngularVelocity(Vector3.Zero());
      this.physicsBody.setLinearVelocity(Vector3.Zero());
    }
  }
}
