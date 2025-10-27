import { Scene } from "@babylonjs/core/scene";
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
import {
  Physics6DoFConstraint,
  PhysicsActivationControl,
  PhysicsBody,
  PhysicsConstraintAxis,
  PhysicsMotionType,
  PhysicsShapeCylinder,
  PhysicsShapeSphere,
} from "@babylonjs/core/Physics/";
import { Mesh, Quaternion, Vector3 } from "@babylonjs/core";
import { Sphere } from "./sphere";
import PID from "../PID";

export class Table {
  mesh: Mesh;
  physicsBody: PhysicsBody;
  xTiltPID: PID = new PID(1, 0, 0.1, 0);
  xAngForcePID: PID = new PID(0.1, 0.1, 0.1, 0);
  motorMount: { physicsBody: PhysicsBody; mesh: Mesh };
  motor: Physics6DoFConstraint;

  set targetPosition(pos: Vector3) {
    this.xTiltPID.setpoint = pos.x;
  }
  constructor(
    private scene: Scene,
    public sphere: Sphere,
  ) {
    this.scene = scene;
    this.mesh = MeshBuilder.CreateCylinder(
      "ground",
      { diameter: 20, height: 0.25, tessellation: 24 },
      this.scene,
    );
    this.physicsBody = new PhysicsBody(
      this.mesh,
      PhysicsMotionType.DYNAMIC,
      false,
      this.scene,
    );
    this.physicsBody.setMassProperties({ mass: 1 });
    this.physicsBody.shape = new PhysicsShapeCylinder(
      new Vector3(0, 0.125, 0),
      new Vector3(0, -0.125, 0),
      10,
      this.scene,
    );

    const motorMountMesh = MeshBuilder.CreateSphere("MotorMount");
    motorMountMesh.position = new Vector3(0, -3, 0);
    this.motorMount = {
      mesh: motorMountMesh,
      physicsBody: new PhysicsBody(
        motorMountMesh,
        PhysicsMotionType.STATIC,
        false,
        this.scene,
      ),
    };

    this.motorMount.physicsBody.shape = new PhysicsShapeSphere(
      Vector3.Zero(),
      0.5,
      scene,
    );
    window.hk.setActivationControl(
      this.motorMount.physicsBody,
      PhysicsActivationControl.ALWAYS_ACTIVE,
    );

    this.motor = new Physics6DoFConstraint(
      {
        axisA: Vector3.Right(),
        perpAxisA: Vector3.Up(),
        axisB: Vector3.Right(),
        perpAxisB: Vector3.Up(),
        pivotA: new Vector3(0, 3, 0),
        pivotB: new Vector3(0, 0, 0),
        maxDistance: 10,
        collision: false,
      },
      [
        {
          axis: PhysicsConstraintAxis.ANGULAR_X,
          maxLimit: 0, //.5,
          minLimit: -0, //.5,
        },
        {
          axis: PhysicsConstraintAxis.ANGULAR_Y,
          maxLimit: 0,
          minLimit: 0,
        },
        {
          axis: PhysicsConstraintAxis.ANGULAR_Z,
          maxLimit: 0.5,
          minLimit: -0.5,
        },
        {
          axis: PhysicsConstraintAxis.LINEAR_X,
          maxLimit: 0,
          minLimit: 0,
        },
        {
          axis: PhysicsConstraintAxis.LINEAR_Y,
          maxLimit: 0,
          minLimit: 0,
        },
        {
          axis: PhysicsConstraintAxis.LINEAR_Z,
          maxLimit: 0,
          minLimit: 0,
        },
      ],
      this.scene,
    );

    this.motorMount.physicsBody.addConstraint(this.physicsBody, this.motor);

    this.scene.onBeforePhysicsObservable.add(() => this.beforePhysics());
    window.hk.setActivationControl(
      this.physicsBody,
      PhysicsActivationControl.ALWAYS_ACTIVE,
    );

    const prop = document.getElementById("prop") as HTMLInputElement;
    prop.addEventListener("change", (e) => {
      this.xTiltPID.kp = parseFloat((e.target as HTMLInputElement).value);
    });
    this.xTiltPID.kp = parseFloat(prop.value);

    const int = document.getElementById("int") as HTMLInputElement;
    int.addEventListener("change", (e) => {
      this.xTiltPID.ki = parseFloat((e.target as HTMLInputElement).value);
    });
    this.xTiltPID.ki = parseFloat(int.value);

    const der = document.getElementById("der") as HTMLInputElement;
    der.addEventListener("change", (e) => {
      this.xTiltPID.kd = parseFloat((e.target as HTMLInputElement).value);
    });
    this.xTiltPID.kd = parseFloat(der.value);

    this.xTiltPID.outputLimits = [-0.1, 0.1];
    this.xAngForcePID.outputLimits = [-0.1, 0.1];
  }

  private time: number = 0;
  beforePhysics() {
    this.time += this.mesh.getEngine().getDeltaTime() * 0.001;

    this.targetPosition = new Vector3((this.time / 20) % 2 < 1 ? -3 : 3, 0, 0);

    const currentRotation =
      this.physicsBody.transformNode.rotationQuaternion ?? Quaternion.Zero();
    const targetRotationZ = this.xTiltPID.update(
      this.sphere.physicsBody.transformNode.position.x,
      this.mesh.getEngine().getDeltaTime(),
    );
    let targetRotation = Quaternion.FromEulerAngles(
      0,
      0,
      /* Math.sin(this.time * 4) / 4 */ -targetRotationZ,
    );
    const maxAngularVelocity = 0.005;

    let diff = targetRotation.subtract(currentRotation);

    if (diff.length() > maxAngularVelocity) {
      console.log("clamping");
      diff = diff.normalize().scale(maxAngularVelocity);
    }

    this.physicsBody.setTargetTransform(
      Vector3.Zero(),
      currentRotation.add(diff),
    );
  }
}
