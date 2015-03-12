function RobotArm () {
	this.geometries = [],
	this.rotationAxes = [],
	this.rotationAngles = [],
	this.roots = [],
	this.branches = [],

	this.materials = [],
	this.cubes = [],
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


	P[0] = new THREE.Vector3(this.branches[0].x,this.branches[0].y,this.branches[0].z);


    for (var i = 1; i <= robotArm.geometries.length; i++) {
    	MrotX.makeRotationX(this.rotationAxes[i-1].x * this.rotationAngles[i-1]);
    	MrotY.makeRotationY(this.rotationAxes[i-1].y * this.rotationAngles[i-1]);
    	MrotZ.makeRotationZ(this.rotationAxes[i-1].z * this.rotationAngles[i-1]);

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
	//P[robotArm.geometries.length].add(this.branches[robotArm.branches.length-1]);

	this.endAffector.x = P[robotArm.geometries.length].x;
	this.endAffector.y = P[robotArm.geometries.length].y;
	this.endAffector.z = P[robotArm.geometries.length].z;

	var J = Matrix.Zero(6, robotArm.geometries.length);

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


	var J_inv = (((J.transpose().multiply(J)).add(Matrix.I(P.length - 1).multiply(14^2))).inverse()).multiply(J.transpose());
	

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


	delta_e = delta_e.multiply(0.02);

	//console.log(delta_e);
	var delta_theta = J_inv.multiply(delta_e);
	//console.log(delta_theta);

	for (var i = 0; i < this.rotationAngles.length; i++) {
		this.rotationAngles[i] += delta_theta.elements[i];
		//this.rotationAngles[i] %= Math.PI*2;
	};
};

RobotArm.prototype.updatePositions = function() {

    for (var i = 0; i < robotArm.geometries.length; i++) {
		this.cubes[i].matrix = new THREE.Matrix4();;
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


	this.cubes[0].applyMatrix(M);

    for (var i = 1; i < robotArm.geometries.length; i++) {
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

		this.cubes[i].applyMatrix(M);
	};
};
