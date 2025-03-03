class Camera {
  constructor() {
    this.fov = 60;
    this.eye = new Vector3([0.0, 0.0, -5.0]);
    this.up = new Vector3([0.0, 1.0, 0.0]);
    this.at = new Vector3([0.0, 0.0, -1.0]);
    this.alpha = 5;

    this.viewMat = new Matrix4();
    this.updateViewMatrix();
    gl.uniformMatrix4fv(u_ViewMatrix, false, this.viewMat.elements);

    this.projMat = new Matrix4();
    this.projMat.setPerspective(50, canvas.width / canvas.height, 1, 100);
    gl.uniformMatrix4fv(u_ProjectionMatrix, false, this.projMat.elements);
  }

  updateViewMatrix() {
    this.viewMat.setLookAt(
      this.eye.elements[0], this.eye.elements[1], this.eye.elements[2],
      this.at.elements[0], this.at.elements[1], this.at.elements[2],
      this.up.elements[0], this.up.elements[1], this.up.elements[2]
    );
  }

  moveForward(speed) {
    let direction = new Vector3([0, 0, 0]);
    direction.set(this.at);
    direction.sub(this.eye);
    if (direction.elements[0] === 0 && direction.elements[1] === 0 && direction.elements[2] === 0) {
      direction.set([0, 0, 1]);
    }
    direction.normalize();
    direction.mul(speed);
    this.eye.add(direction);
    this.at.add(direction);
  }

  moveBackwards(speed) {
    let direction = new Vector3([0, 0, 0]);
    direction.set(this.eye);
    direction.sub(this.at);
    if (direction.elements[0] === 0 && direction.elements[1] === 0 && direction.elements[2] === 0) {
      direction.set([0, 0, 1]);
    }
    direction.normalize();
    direction.mul(speed);
    this.eye.add(direction);
    this.at.add(direction);
  }

  moveLeft(speed) {
    let forward = new Vector3([0, 0, 0]);
    forward.set(this.at);
    forward.sub(this.eye);
    let leftDir = Vector3.cross(this.up, forward);
    leftDir.normalize();
    leftDir.mul(speed);
    this.eye.add(leftDir);
    this.at.add(leftDir);
  }

  moveRight(speed) {
    let forward = new Vector3([0, 0, 0]);
    forward.set(this.at);
    forward.sub(this.eye);
    let rightDir = Vector3.cross(forward, this.up);
    rightDir.normalize();
    rightDir.mul(speed);
    this.eye.add(rightDir);
    this.at.add(rightDir);
  }

  panLeft() {
    let forward = new Vector3();
    forward.set(this.at);
    forward.sub(this.eye);
    let rotMat = new Matrix4();
    rotMat.setRotate(this.alpha, this.up.elements[0], this.up.elements[1], this.up.elements[2]);
    let rotatedForward = rotMat.multiplyVector3(forward);
    let newAt = new Vector3();
    newAt.set(this.eye);
    newAt.add(rotatedForward);
    this.at = newAt;
  }

  panRight() {
    let forward = new Vector3();
    forward.set(this.at);
    forward.sub(this.eye);
    let rotMat = new Matrix4();
    rotMat.setRotate(-this.alpha, this.up.elements[0], this.up.elements[1], this.up.elements[2]);
    let rotatedForward = rotMat.multiplyVector3(forward);
    let newAt = new Vector3();
    newAt.set(this.eye);
    newAt.add(rotatedForward);
    this.at = newAt;
  }
}
