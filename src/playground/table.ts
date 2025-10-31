import { Scene } from "@babylonjs/core/scene";
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
import {
  IPhysicsEnginePluginV2,
  Physics6DoFConstraint,
  PhysicsActivationControl,
  PhysicsBody,
  PhysicsConstraintAxis,
  PhysicsEngineV2,
  PhysicsMotionType,
  PhysicsShapeCylinder,
  PhysicsShapeSphere,
} from "@babylonjs/core/Physics/";
import {
  Mesh,
  Quaternion,
  TransformNode,
  Vector3,
  AxesViewer,
  UtilityLayerRenderer,
} from "@babylonjs/core";
import { Sphere } from "./sphere";
import { PID, PIDOptions } from "../PID";
import { DebugArrow } from "./debugArrow";
import { DebugCross } from "./debugCross";

const animPoints = new Array(6).fill(Vector3.Zero()).map((v, i, a) => {
  return new Vector3(
    Math.sin((i / a.length) * 2 * Math.PI),
    0,
    Math.cos((i / a.length) * 2 * Math.PI),
  ).scale(6);
});

export class Table extends TransformNode {
  mesh: Mesh;
  physicsBody: PhysicsBody;
  xTiltPID: PID;
  zTiltPID: PID;

  animI: number = 0;

  targetPositionDebug: DebugCross;

  rotationLimit: number = Math.PI / 8;
  rotationRateLimit: number = Math.PI / 4;
  animationTime: number = 5;

  debugArrow: DebugArrow;

  set targetPosition(pos: Vector3) {
    this.xTiltPID.setpoint = pos.x;
    this.zTiltPID.setpoint = pos.z;
    this.targetPositionDebug.position = pos;
  }
  constructor(
    private scene: Scene,
    public sphere: Sphere,
    private utilityLayer: UtilityLayerRenderer,
  ) {
    super("Table", scene, false);
    scene.addTransformNode(this);
    window.table = this;

    this.debugArrow = new DebugArrow("DebugArrow", scene, Vector3.Up());
    this.targetPositionDebug = new DebugCross(
      "TargetPositionCross",
      scene,
      1.2,
    );
    new DebugCross("WorldCenter", scene, 1);

    let pidV = [0.1, 0, 0.000175];
    let pidOptions: PIDOptions = {
      outputLimits: [-this.rotationLimit, this.rotationLimit],
      inputHistory: 15,
    };
    this.xTiltPID = new PID(pidV[0], pidV[1], pidV[2], 0, pidOptions);
    this.zTiltPID = new PID(pidV[0], pidV[1], pidV[2], 0, pidOptions);

    this.mesh = MeshBuilder.CreateCylinder(
      "Surface",
      { diameter: 20, height: 0.25, tessellation: 24 },
      this.scene,
    );
    this.mesh.position.y = -0.125;
    this.mesh.setParent(this);
    this.physicsBody = new PhysicsBody(
      this.mesh,
      PhysicsMotionType.ANIMATED,
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

    this.scene.onBeforePhysicsObservable.add(() => this.beforePhysics());
    window.hk.setActivationControl(
      this.physicsBody,
      PhysicsActivationControl.ALWAYS_ACTIVE,
    );

    console.log("X axis PID controller", this.xTiltPID);
    console.log("Z axis PID controller", this.zTiltPID);
    const prop = document.getElementById("prop") as HTMLInputElement;
    prop.addEventListener("change", (e) => {
      this.xTiltPID.kp = parseFloat((e.target as HTMLInputElement).value);
      this.zTiltPID.kp = parseFloat((e.target as HTMLInputElement).value);
    });
    prop.value = this.xTiltPID.kp.toString();

    const int = document.getElementById("int") as HTMLInputElement;
    int.addEventListener("change", (e) => {
      this.xTiltPID.ki = parseFloat((e.target as HTMLInputElement).value);
      this.zTiltPID.ki = parseFloat((e.target as HTMLInputElement).value);
    });
    int.value = this.xTiltPID.ki.toString();

    const der = document.getElementById("der") as HTMLInputElement;
    der.addEventListener("change", (e) => {
      this.xTiltPID.kd = parseFloat((e.target as HTMLInputElement).value);
      this.zTiltPID.kd = parseFloat((e.target as HTMLInputElement).value);
    });
    der.value = this.xTiltPID.kd.toString();

    this.targetPosition = new Vector3(0, 0, 0);
    setInterval(() => {
      let t = this.animI;
      let m = animPoints.length;
      let mod = t % m;
      let scale = Math.floor(t / m) + 1;
      let offset = Math.floor((mod * scale) / m);
      this.targetPosition = animPoints[(mod * scale + offset) % m];
      this.animI += 1;
    }, this.animationTime * 1000);

    window.document.addEventListener("keydown", (e) => {
      if (e.key === "c") {
        if (this.perfCollect) {
          this.perfCollect = false;
          console.log(this.perfPositionData);
          console.log(this.perfCollisionData);
        } else {
          this.perfCollect = true;
          this.perfPositionData = [];
          this.perfCollisionData = [];
          console.log("Starting Collection");
        }
      }
    });

    this.sphere.physicsBody.setCollisionCallbackEnabled(true);
    this.sphere.physicsBody.getCollisionObservable().add((e) => {
      if (this.perfCollect) {
        this.perfCollisionData.push({
          time: this.time,
          position: e.point,
          impulse: e.impulse,
          normal: e.normal,
          type: e.type,
          distance: e.distance,
        });
      }
    });
  }

  private time: number = 0;
  private perfCollect: boolean = false;
  private perfPositionData: any[] = [];
  private perfCollisionData: any[] = [];
  beforePhysics() {
    let dt = (this.scene.getPhysicsEngine()?.getSubTimeStep() ?? 0) * 0.001;
    this.time += dt;

    if (this.perfCollect) {
      this.perfPositionData.push({
        position: this.sphere.physicsBody.transformNode.position.clone(),
        velocity: this.sphere.physicsBody.getLinearVelocity().clone(),
        time: this.time,
      });
    }
    const currentRotation =
      this.physicsBody.transformNode.rotationQuaternion ?? Quaternion.Zero();
    const targetRotationZ = this.xTiltPID.update(
      this.sphere.physicsBody.transformNode.position.x,
      dt,
    );
    const targetRotationX = this.zTiltPID.update(
      this.sphere.physicsBody.transformNode.position.z,
      dt,
    );
    let targetRotation = Quaternion.FromEulerAngles(
      targetRotationX,
      0,
      -targetRotationZ,
    );

    let diff = currentRotation.conjugate().multiply(targetRotation);
    let { angle: diffAngle, axis: diffAxis } = diff.toAxisAngle();

    if (diffAngle > this.rotationRateLimit * dt) {
      diffAngle = this.rotationRateLimit * dt;
    }
    diff = Quaternion.RotationAxis(diffAxis, diffAngle);

    targetRotation = currentRotation.multiply(diff);

    let { angle: targetAngle, axis: targetAxis } = targetRotation.toAxisAngle();
    if (targetAngle > this.rotationLimit) {
      targetAngle = this.rotationLimit;
    }

    targetRotation = Quaternion.RotationAxis(targetAxis, targetAngle);

    const sphereRadiusOffset = Vector3.Up()
      .applyRotationQuaternion(targetRotation)
      .scale(-0.625); /// 0.5 sphere 0.125 plate thickness

    const spherePosition = this.sphere.mesh.position.multiplyByFloats(1, 0, 1);
    const spherePositionTangent = spherePosition
      .normalizeToNew()
      .cross(Vector3.Up());
    this.debugArrow.direction = spherePositionTangent;

    let targetPosition = spherePosition
      .add(sphereRadiusOffset)
      .add(
        spherePositionTangent
          .cross(Vector3.Up().applyRotationQuaternion(targetRotation))
          .normalizeToNew()
          .scale(spherePosition.length()),
      );

    this.physicsBody.setTargetTransform(targetPosition, targetRotation);
  }
}
