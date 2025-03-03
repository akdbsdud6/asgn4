class Cube {
  constructor() {
    this.type = 'cube';
    this.color = [1.0, 1.0, 1.0, 1.0];
    this.matrix = new Matrix4();
    this.textureNum = -2;
  }

  drawTriangle3DNormalUV(vertices, uv, normals) {
    // 1) Positions
    let vertexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);
    gl.vertexAttribPointer(a_Position, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(a_Position);

    // 2) UVs
    let uvBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, uvBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(uv), gl.STATIC_DRAW);
    gl.vertexAttribPointer(a_UV, 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(a_UV);

    // 3) Normals
    let normalBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, normalBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(normals), gl.STATIC_DRAW);
    gl.vertexAttribPointer(a_Normal, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(a_Normal);

    // 4) Draw
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }

  drawCube(M) {
    // 1) Send model matrix + texture mode
    gl.uniformMatrix4fv(u_ModelMatrix, false, M.elements);
    gl.uniform1i(u_whichTexture, this.textureNum);

    // ----- FRONT FACE -----
    // Normal: (0,0,-1)
    gl.uniform4f(
      u_FragColor,
      this.color[0],
      this.color[1],
      this.color[2],
      this.color[3]
    );
    let frontNormal = [0.0, 0.0, -1.0];
    this.drawTriangle3DNormalUV(
      [0,0,0, 1,1,0, 1,0,0],
      [0,0, 1,1, 1,0],
      [...frontNormal, ...frontNormal, ...frontNormal]
    );
    this.drawTriangle3DNormalUV(
      [0,0,0, 0,1,0, 1,1,0],
      [0,0, 0,1, 1,1],
      [...frontNormal, ...frontNormal, ...frontNormal]
    );

    // ----- TOP FACE -----
    // Normal: (0,1,0)
    gl.uniform4f(
      u_FragColor,
      this.color[0],
      this.color[1],
      this.color[2],
      this.color[3]
    );
    let topNormal = [0.0, 1.0, 0.0];
    this.drawTriangle3DNormalUV(
      [0,1,0, 0,1,1, 1,1,1],
      [0,0, 0,1, 1,1],
      [...topNormal, ...topNormal, ...topNormal]
    );
    this.drawTriangle3DNormalUV(
      [0,1,0, 1,1,1, 1,1,0],
      [0,0, 1,1, 1,0],
      [...topNormal, ...topNormal, ...topNormal]
    );

    // ----- BACK FACE -----
    // Normal: (0,0,1)
    gl.uniform4f(
      u_FragColor,
      this.color[0],
      this.color[1],
      this.color[2],
      this.color[3]
    );
    let backNormal = [0.0, 0.0, 1.0];
    this.drawTriangle3DNormalUV(
      [0,0,1, 1,0,1, 1,1,1],
      [0,0, 1,0, 1,1],
      [...backNormal, ...backNormal, ...backNormal]
    );
    this.drawTriangle3DNormalUV(
      [0,0,1, 1,1,1, 0,1,1],
      [0,0, 1,1, 0,1],
      [...backNormal, ...backNormal, ...backNormal]
    );

    // ----- LEFT FACE -----
    // Normal: (-1,0,0)
    gl.uniform4f(
      u_FragColor,
      this.color[0],
      this.color[1],
      this.color[2],
      this.color[3]
    );
    let leftNormal = [-1.0, 0.0, 0.0];
    this.drawTriangle3DNormalUV(
      [0,0,0, 0,0,1, 0,1,1],
      [0,0, 1,0, 1,1],
      [...leftNormal, ...leftNormal, ...leftNormal]
    );
    this.drawTriangle3DNormalUV(
      [0,0,0, 0,1,1, 0,1,0],
      [0,0, 1,1, 0,1],
      [...leftNormal, ...leftNormal, ...leftNormal]
    );

    // ----- RIGHT FACE -----
    // Normal: (1,0,0)
    gl.uniform4f(
      u_FragColor,
      this.color[0],
      this.color[1],
      this.color[2],
      this.color[3]
    );
    let rightNormal = [1.0, 0.0, 0.0];
    this.drawTriangle3DNormalUV(
      [1,0,0, 1,1,1, 1,0,1],
      [0,0, 1,1, 1,0],
      [...rightNormal, ...rightNormal, ...rightNormal]
    );
    this.drawTriangle3DNormalUV(
      [1,0,0, 1,1,0, 1,1,1],
      [0,0, 0,1, 1,1],
      [...rightNormal, ...rightNormal, ...rightNormal]
    );

    // ----- BOTTOM FACE -----
    // Normal: (0,-1,0)
    gl.uniform4f(
      u_FragColor,
      this.color[0],
      this.color[1],
      this.color[2],
      this.color[3]
    );
    let bottomNormal = [0.0, -1.0, 0.0];
    this.drawTriangle3DNormalUV(
      [0,0,0, 1,0,1, 0,0,1],
      [0,0, 1,1, 0,1],
      [...bottomNormal, ...bottomNormal, ...bottomNormal]
    );
    this.drawTriangle3DNormalUV(
      [0,0,0, 1,0,0, 1,0,1],
      [0,0, 1,0, 1,1],
      [...bottomNormal, ...bottomNormal, ...bottomNormal]
    );
  }
}
