function RobotArm () {
	this.N_SEGMENTS = 5;
	this.rotationAxes = [];
	this.rotationAngles = [];
	this.roots = [];
	this.branches = [];

	this.materials = [];
	this.meshes = [];
	this.targetPos = new THREE.Vector3(-1,1,0);
	this.endAffector = new THREE.Vector3(0,0,0);
};

RobotArm.prototype.updateAngles = function() {

	var P = [];

	var M = new THREE.Matrix4();
	var MrotX = new THREE.Matrix4();
	var MrotY = new THREE.Matrix4();
	var MrotZ = new THREE.Matrix4();

	var matrices = [];
	matrices[0] = new THREE.Matrix4();

	P[0] = new THREE.Vector3(
		this.branches[0].x,
		this.branches[0].y,
		this.branches[0].z);

    for (var i = 1; i <= this.N_SEGMENTS; i++) {
    	MrotX.makeRotationX(this.rotationAxes[i-1].x * 
    		this.rotationAngles[i-1]);
    	MrotY.makeRotationY(this.rotationAxes[i-1].y * 
    		this.rotationAngles[i-1]);
    	MrotZ.makeRotationZ(this.rotationAxes[i-1].z * 
    		this.rotationAngles[i-1]);

    	M.multiply(MrotX);
    	M.multiply(MrotY);
    	M.multiply(MrotZ);

   		matrices[i] = new THREE.Matrix4();
   		matrices[i].copy(M);

    	P[i] = new THREE.Vector3(0,0,0);
    	P[i].add(this.branches[i-1]);
    	P[i].sub(this.roots[i-1]);
		P[i].applyMatrix4(M);
		P[i].add(P[i-1]);
	};

	this.endAffector.x = P[this.N_SEGMENTS].x;
	this.endAffector.y = P[this.N_SEGMENTS].y;
	this.endAffector.z = P[this.N_SEGMENTS].z;

	var J = Matrix.Zero(6, this.N_SEGMENTS);

	for (var i = 0; i < J.cols(); i++) {
		var tmp = new THREE.Vector3(
			P[P.length - 1].x,
			P[P.length - 1].y,
			P[P.length - 1].z);
		tmp.sub(P[i]);

		var Ji = new THREE.Vector3(
			this.rotationAxes[i].x,
			this.rotationAxes[i].y,
			this.rotationAxes[i].z);
		Ji.normalize();

		Ji.applyMatrix4(matrices[i]);

		J.elements[3][i] = Ji.x;
		J.elements[4][i] = Ji.y;
		J.elements[5][i] = Ji.z;

		Ji.cross(tmp);

		J.elements[0][i] = Ji.x;
		J.elements[1][i] = Ji.y;
		J.elements[2][i] = Ji.z;
	};

	var damping = 14;
	var J_pinv = (((J.transpose().multiply(J)).
		add(Matrix.I(P.length - 1).
			multiply(damping^2))).inverse()).multiply(J.transpose());
	// For Jacobian transpose method, uncomment:
	// J_pinv = J.transpose();

	var vFrom = new THREE.Vector3();
	var vTo = new THREE.Vector3();
	vFrom.subVectors(P[P.length - 1], P[P.length - 2]);
	vTo.subVectors(this.targetPos, P[P.length - 2]);

	var q = new THREE.Quaternion(0,0,0,'XYZ');
	q.setFromUnitVectors(vFrom, vTo, 'XYZ');
	var euler = new THREE.Euler(0,0,0, 'XYZ');
	euler.setFromQuaternion(q, 'XYZ');

	var delta_e = Vector.create([
		this.targetPos.x - P[P.length - 1].x,
		this.targetPos.y - P[P.length - 1].y,
		this.targetPos.z - P[P.length - 1].z,
		euler.x,
		euler.y,
		euler.z
		]);

	// Secondary task, first two angles want to be pi/6.
	// To avoid the pen to go under the ground.
	var delta_theta_input = Vector.Zero(this.N_SEGMENTS);
	for (var i = 1; i < 3; i++) {
		delta_theta_input.elements[i] =
			((3.1415)/6 - this.rotationAngles[i]) * 0.001;
	};
	var delta_theta_second = Matrix.I(P.length - 1).
		subtract((J_pinv.multiply(J))).multiply(delta_theta_input);

	delta_e = delta_e.multiply(0.02); // Short step
	var delta_theta = J_pinv.multiply(delta_e).add(delta_theta_second);

	// The first segment can rotate freely (around y axis).
	this.rotationAngles[0] += delta_theta.elements[0];

	// This code is to prevent the end affector to get to close to the base.
	// Otherwise the arm might end up under the floor.
	// Do not update the rotation angles if it is too close in rotation space.
	var targetPosRotSpace = new THREE.Vector3();
	var endAffectorRotSpace = new THREE.Vector3();
	targetPosRotSpace.copy(this.targetPos);
	endAffectorRotSpace.copy(this.endAffector);
	var rotYmatri = new THREE.Matrix4();
	rotYmatri.makeRotationY(-this.rotationAngles[0]);
	targetPosRotSpace.applyMatrix4(rotYmatri);
	endAffectorRotSpace.applyMatrix4(rotYmatri);

	var maxDist = 0.8;
	
	for (var i = 1; i < this.N_SEGMENTS; i++) {
		if (targetPosRotSpace.x < -maxDist || endAffectorRotSpace.x < -maxDist)
		this.rotationAngles[i] += delta_theta.elements[i];
	};
};

RobotArm.prototype.updatePositions = function() {
	// Reset all matrices
    for (var i = 0; i < this.N_SEGMENTS; i++) {
		this.meshes[i].matrix = new THREE.Matrix4();;
	}

	var M = new THREE.Matrix4();

	var MtransRoot = new THREE.Matrix4();
	var MrotX = new THREE.Matrix4();
	var MrotY = new THREE.Matrix4();
	var MrotZ = new THREE.Matrix4();
	var MtransBranch = new THREE.Matrix4();

	MtransRoot.makeTranslation(
		-this.roots[0].x,
		-this.roots[0].y,
		-this.roots[0].z);

	MrotX.makeRotationX(this.rotationAxes[0].x * this.rotationAngles[0]);
	MrotY.makeRotationY(this.rotationAxes[0].y * this.rotationAngles[0]);
	MrotZ.makeRotationZ(this.rotationAxes[0].z * this.rotationAngles[0]);

	MtransBranch.makeTranslation(
		this.branches[0].x,
		this.branches[0].y,
		this.branches[0].z);

	M.multiply(MtransRoot);
	M.multiply(MrotX);
	M.multiply(MrotY);
	M.multiply(MrotZ);
    M.multiply(MtransBranch);

	this.meshes[0].applyMatrix(M);

    for (var i = 1; i < this.N_SEGMENTS; i++) {
    	MtransRoot.makeTranslation(
    		-this.roots[i].x,
    		-this.roots[i].y,
    		-this.roots[i].z);

    	MrotX.makeRotationX(this.rotationAxes[i].x * this.rotationAngles[i]);
    	MrotY.makeRotationY(this.rotationAxes[i].y * this.rotationAngles[i]);
    	MrotZ.makeRotationZ(this.rotationAxes[i].z * this.rotationAngles[i]);

    	MtransBranch.makeTranslation(
    		this.branches[i - 1].x,
    		this.branches[i - 1].y,
    		this.branches[i - 1].z);

    	M.multiply(MtransRoot);
    	M.multiply(MrotX);
    	M.multiply(MrotY);
    	M.multiply(MrotZ);
    	M.multiply(MtransBranch);

		this.meshes[i].applyMatrix(M);
	};
};
