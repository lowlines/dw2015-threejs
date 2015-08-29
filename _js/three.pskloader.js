THREE.XHRBinaryLoader = function (manager) {
	this.manager = (manager !== undefined) ? manager : THREE.DefaultLoadingManager;
};
THREE.XHRBinaryLoader.prototype = {
	constructor: THREE.XHRLoader,
	load: function(url, onLoad, onProgress, onError) {
		var scope = this;
		var cached = THREE.Cache.get(url);

		if (cached !== undefined) {
			if (onLoad) onLoad(cached);
			return;
		}

		var request = new XMLHttpRequest();
		request.overrideMimeType('text/plain; charset=x-user-defined');
		request.open('GET', url, true);

		request.addEventListener('load', function(event) {
			THREE.Cache.add(url, this.response);
			if (onLoad) onLoad(this.response);
			scope.manager.itemEnd(url);
		}, false);

		if (onProgress !== undefined) {
			request.addEventListener('progress', function(event) {
				onProgress(event);
			}, false);
		}

		if (onError !== undefined) {
			request.addEventListener('error', function(event) {
				onError(event);
			}, false);
		}

		if (this.crossOrigin !== undefined) request.crossOrigin = this.crossOrigin;
		if (this.responseType !== undefined) request.responseType = this.responseType;

		request.send(null);

		scope.manager.itemStart(url);
	},
	setResponseType: function(value) {
		this.responseType = value;
	},
	setCrossOrigin: function(value) {
		this.crossOrigin = value;
	}
};

THREE.BinaryLoader = function(manager) {
	this.manager = (manager !== undefined) ? manager : THREE.DefaultLoadingManager;
};

THREE.BinaryLoader.prototype = {
	constructor: THREE.BinaryLoader,

	load: function (url, onLoad, onProgress, onError) {

		var scope = this;

		var loader = new THREE.XHRBinaryLoader(scope.manager);
		loader.setCrossOrigin(this.crossOrigin);
		loader.load(url, function(text) {
			var result = scope.parse(text);
			onLoad(result);
		}, onProgress, onError);


	},

	parse: function(data) {
		throw "Not Implemented";
	},

	int: function(data, offset, length) {
		var int = 0;
		for (var i=0; i<length; i++) {
			int |= (data.charCodeAt(offset+i) & 0xFF) << (i*8);
		}
		return int;
	},

	int8: function(data, offset) {
		return this.int(data, offset, 1);
	},

	int16: function(data, offset) {
		return this.int(data, offset, 2);
	},

	int32: function(data, offset) {
		return this.int(data, offset, 4);
	},

	bytes: function(data, offset, length) {
		var bytes = [];
		for (var i=0; i<length; i++) {
			bytes.push(this.int8(data, offset+i));
		}
		return bytes;
	},

	string: function(data, offset, length) {
		var str = data.substr(offset, length);
		if (str.indexOf("\0") != -1) str = str.substr(0, str.indexOf("\0"));
		return str;
	},

	hex: function(data, offset, length) {
		var hex = '';

		if (typeof data == 'number') {
			length = offset != undefined ? offset : 4;
			for (var i=0; i<length; i++) {
				var u8 = (data >> (i*8)) & 0xFF;
				hex = this.padNum(u8.toString(16), 2).toUpperCase() + hex;
			}
			return '0x'+hex;
		}

		if (offset == undefined) offset = 0;
		if (length == undefined) length = data.length;
		for (var i=0; i<length; i++) {
			hex = this.padNum(data.charCodeAt(offset+i).toString(16).toUpperCase(), 2) + hex;
		}
		return '0x'+hex;
	},

	padNum: function(num, length) {
		num = num.toString();
		while(num.length < length) {
			num = '0'+num;
		}
		return num;
	},

	sint: function(data, offset, length) {
		if (typeof data != 'number') data = this.int(data, offset, length);
		else length = offset;
		var bits = length * 8;
		var max = (1 << bits) - 1;
		if (data & (1 << (bits - 1))) {
			data = (data & max) - max;
		}
		return data;
	},

	decodeFloat: function(bytes, signBits, exponentBits, fractionBits, eMin, eMax, littleEndian) {
		if (littleEndian == undefined) littleEndian = true;
		var totalBits = (signBits + exponentBits + fractionBits);

		var binary = "";
		for (var i = 0, l = bytes.length; i < l; i++) {
			var bits = bytes[i].toString(2);
			while (bits.length < 8)
				bits = "0" + bits;

			if (littleEndian)
				binary = bits + binary;
			else
				binary += bits;
		}

		var sign = (binary.charAt(0) == '1')?-1:1;
		var exponent = parseInt(binary.substr(signBits, exponentBits), 2) - eMax;
		var significandBase = binary.substr(signBits + exponentBits, fractionBits);
		var significandBin = '1'+significandBase;
		var i = 0;
		var val = 1;
		var significand = 0;

		if (exponent == -eMax) {
			if (significandBase.indexOf('1') == -1)
				return 0;
			else {
				exponent = eMin;
				significandBin = '0'+significandBase;
			}
		}

		while (i < significandBin.length) {
			significand += val * parseInt(significandBin.charAt(i));
			val = val / 2;
			i++;
		}

		return sign * significand * Math.pow(2, exponent);
	},

	float: function(data, offset) {
		return this.decodeFloat(this.bytes(data, offset, 4), 1, 8, 23, -126, 127);

		/*var value = this.int(data, offset, 4);

		 var signBits = 1;
		 var exponentBits = 8;
		 var fractionBits = 23;

		 var eMin = -126;
		 var eMax = 127;

		 var signMask = ((1 << signBits) - 1);
		 var exponentMask = ((1 << exponentBits) - 1);
		 var fractionMask = ((1 << fractionBits) - 1);

		 var signValue = (value >> (exponentBits + fractionBits)) & signMask;
		 var expValue = (value >> fractionBits) & exponentMask;
		 var fracValue = (value & fractionMask);

		 var sign = signValue ? -1 : 1;
		 var exp = expValue - eMax;
		 var frac = fracValue;

		 if (exp == -eMax) {
		 if (frac == 0) return 0;
		 else exp = eMin;
		 } else {
		 frac |= 1 << fractionBits;
		 }

		 var mantissa = 0;
		 var fracVal = 1;
		 for (var i=0; i<fractionBits+1; i++) {
		 mantissa += fracVal * ((frac >> (fractionBits-i)) & 1);
		 fracVal = fracVal / 2;
		 }

		 var floatValue = sign * Math.pow(2, exp) * mantissa;
		 return floatValue;*/
		/*if (decodeValue != floatValue) {
		 console.log(value+' | '+this.hex(value)
		 +' | Sign: '+sign+' ('+signValue+')'
		 +' | Exponent: '+2+'^'+exp+' ('+expValue+')'
		 +' | Mantissa: '+mantissa+' ('+fracValue+')'
		 +' | Float: '+floatValue+' / '+decodeValue
		 );
		 }

		 return decodeValue;*/
	},

	/*float64: function(data, offset) {
	 return this.decodeFloat(this.bytes(data, offset, 8), 1, 11, 52, -1022, 1023);
	 }*/
};
THREE.BinaryLoader.extend = function(name, options) {
	eval(
		'THREE.'+name+' = function(manager) {'
			+'THREE.BinaryLoader.call(this, manager);'
			+'};'
			+'THREE.'+name+'.prototype = new THREE.BinaryLoader;'
			+'THREE.'+name+'.prototype.constructor = THREE.'+name+';'
			+'for (var key in options) {'
			+'THREE.'+name+'.prototype[key] = options[key];'
			+'}'
			+'THREE.EventDispatcher.prototype.apply(THREE.'+name+'.prototype);'
	);
	return THREE[name];
};

THREE.EventDispatcher.prototype.apply(THREE.BinaryLoader.prototype);

THREE.PSKLoader = THREE.BinaryLoader.extend('PSKLoader', {
	parse: function (data) {
		//console.log(data);

		var offset = 0;
		var points, wedges, faces, materials, bones, weights, extrauvs;

		//console.log('Parsing PSK...');

		while(offset < data.length) {
			var chunkId = this.string(data, offset, 0x14);
			var type = this.int(data, offset+0x14, 0x4);
			var dataSize = this.int(data, offset+0x18, 0x4);
			var dataCount = this.int(data, offset+0x1C, 0x4);
			//console.log('Chunk ID: '+chunkId+' ('+chunkId.length+')'+' | Type: '+type+' | Size: '+dataSize+' | Count: '+dataCount+' | Offset: '+offset);

			offset += 0x20;

			switch(chunkId) {
				case 'PNTS0000':
					points = [];
					for (var i=0; i<dataCount; i++) {
						var offset2 = offset+i*dataSize;
						var x = this.float(data, offset2);
						var z = this.float(data, offset2+0x4);
						var y = this.float(data, offset2+0x8);
						//console.log('X: '+x+' | Y: '+y+' | Z: '+z);
						//points.push({x: x, y: y, z: z});
						points.push({
							x: x,
							y: y,
							z: z
						});
					}
					break;
				case 'VTXW0000':
					wedges = [];
					for (var i=0; i<dataCount; i++) {
						var offset2 = offset+i*dataSize;
						var pointIndex = this.int(data, offset2, 0x4);
						var u = this.float(data, offset2+0x4);
						var v = this.float(data, offset2+0x8);
						var materialIndex = this.int(data, offset2+0xC, 0x1);
						//console.log('Point: '+pointIndex+' | U: '+u+' | V: '+v+' | Material: '+materialIndex);

						wedges.push({
							point: pointIndex,
							u: u,
							v: v,
							material: materialIndex
						});
					}
					break;
				case 'FACE0000':
					faces = [];
					for (var i=0; i<dataCount; i++) {
						var offset2 = offset+i*dataSize;
						var wedge0 = this.int(data, offset2, 0x2);
						var wedge1 = this.int(data, offset2+0x2, 0x2);
						var wedge2 = this.int(data, offset2+0x4, 0x2);
						var materialIndex = this.int(data, offset2+0x6, 0x1);
						var auxMaterialIndex = this.int(data, offset2+0x7, 0x1);
						var smoothingGroups = this.int(data, offset2+0x8, 0x4);
						faces.push({
							wedges: [wedge0, wedge1, wedge2],
							material: materialIndex,
							auxMaterial: auxMaterialIndex,
							smoothingGroups: smoothingGroups
						});
					}
					break;
				case 'MATT0000':
					materials = [];
					for (var i=0; i<dataCount; i++) {
						var offset2 = offset+i*dataSize;
						var name = this.string(data, offset2, 0x40);
						var textureIndex = this.int(data, offset2+0x40, 0x4);
						var polyFlags = this.int(data, offset2+0x44, 0x4);
						var auxMaterial = this.int(data, offset2+0x48, 0x4);
						var auxMaterialFlags = this.int(data, offset2+0x4C, 0x4);
						var lodBias = this.int(data, offset2+0x50, 0x4);
						var lodStyle = this.int(data, offset2+0x54, 0x4);
						materials.push({
							name: name,
							texture: textureIndex,
							polyFlags: polyFlags,
							auxMaterial: auxMaterial,
							auxMaterialFlags: auxMaterialFlags,
							lodBias: lodBias,
							lodStyle: lodStyle
						});
					}
					break;
				case 'REFSKELT':
					bones = [];
					for(var i=0; i<dataCount; i++) {
						var offset2 = offset+i*dataSize;
						var name = this.string(data, offset2, 0x40);
						var flags = this.int(data, offset2+0x40, 0x4);
						var children = this.int(data, offset2+0x44, 0x4);
						var parentId = this.int(data, offset2+0x48, 0x4);
						var orx = this.float(data, offset2+0x4C, 0x4);
						var orz = this.float(data, offset2+0x50, 0x4);
						var ory = this.float(data, offset2+0x54, 0x4);
						var orw = this.float(data, offset2+0x58, 0x4);
						var posX = this.float(data, offset2+0x5C, 0x4);
						var posZ = this.float(data, offset2+0x60, 0x4);
						var posY = this.float(data, offset2+0x64, 0x4);
						var length = this.float(data, offset2+0x68, 0x4);
						var sizeX = this.float(data, offset2+0x6C, 0x4);
						var sizeY = this.float(data, offset2+0x70, 0x4);
						var sizeZ = this.float(data, offset2+0x74, 0x4);
						bones.push({
							offset: offset2,
							name: name,
							flags: flags,
							children: children,
							parentId: parentId,
							orientation: {
								x: orx,
								y: ory,
								z: orz,
								w: orw
							},
							position: {
								x: posX,
								y: posY,
								z: posZ
							},
							length: length,
							size: {
								x: sizeX,
								y: sizeY,
								z: sizeZ
							}
						});
					}
					break;
				case 'RAWWEIGHTS':
					weights = [];
					for (var i=0; i<dataCount; i++) {
						var offset2 = offset+i*dataSize;
						var weight = this.float(data, offset2, 0x4);
						var pointIndex = this.int(data, offset2+0x4, 0x4);
						var boneIndex = this.int(data, offset2+0x8, 0x4);

						if (weights[pointIndex] == undefined) weights[pointIndex] = [];
						weights[pointIndex].push({weight: weight, bone: boneIndex});

						//if (weights[pointIndex].length > 1) console.log(pointIndex, weights[pointIndex]);
					}
					break;
			}

			offset += dataSize*dataCount;
		}

		var geometry = new THREE.Geometry();

		if (points) {
			//console.log('Points ('+points.length+'): ', points[0]);
			//console.log('Wedges ('+wedges.length+'): ', wedges[0]);
			//console.log('Faces ('+faces.length+'): ', faces[0]);
			//console.log('Materials ('+materials.length+'): ', materials);
			//console.log('Bones ('+bones.length+'): ', bones);
			//console.log('Weights ('+weights.length+'): ', weights[0]);
			for (var i=0; i<points.length; i++) {
				var point = points[i];
				geometry.vertices.push(new THREE.Vector3(point.x, point.y, point.z));
			}

			for (var i=0; i<faces.length; i++) {
				var face = faces[i];
				var wedge0 = wedges[face.wedges[0]];
				var wedge1 = wedges[face.wedges[1]];
				var wedge2 = wedges[face.wedges[2]];
				geometry.faces.push(new THREE.Face3(wedge0.point, wedge1.point, wedge2.point));
				geometry.faceVertexUvs[0].push([
					new THREE.Vector2(wedge0.u, wedge0.v),
					new THREE.Vector2(wedge1.u, wedge1.v),
					new THREE.Vector2(wedge2.u, wedge2.v)
				]);

			}
			geometry.uvsNeedUpdate = true;

			geometry.bones = [];
			for (var i=0; i<bones.length; i++) {
				var bone = bones[i];

				geometry.bones.push({
					parent: i == 0 ? -1 : bone.parentId,
					name: bone.name,
					pos: [bone.position.x, bone.position.y, bone.position.z],
					scl: [1+bone.size.x, 1+bone.size.y, 1+bone.size.z],
					rotq: [bone.orientation.x, bone.orientation.y, bone.orientation.z, bone.orientation.w]
				});
			}

			for (var i=0; i<weights.length; i++) {
				var weight = weights[i];
				var skinIndex = [0, 0, 0, 0];
				var skinWeight = [0, 0, 0, 0];
				for (var j=0; j<weight.length; j++) {
					skinIndex[j] = weight[j].bone;
					skinWeight[j] = weight[j].weight;
				}
				geometry.skinIndices.push(new THREE.Vector4(skinIndex[0], skinIndex[1], skinIndex[2], skinIndex[3]));
				geometry.skinWeights.push(new THREE.Vector4(skinWeight[0], skinWeight[1], skinWeight[2], skinWeight[3]));
			}
		}
		return geometry;
	}
});

THREE.PSALoader = THREE.BinaryLoader.extend('PSALoader', {
	parse: function(data) {
		var animations = [];

		var offset = 0;

		console.log('Parsing PSA...');

		while(offset < data.length) {
			var chunkId = this.string(data, offset, 0x14);
			var type = this.int(data, offset+0x14, 0x4);
			var dataSize = this.int(data, offset+0x18, 0x4);
			var dataCount = this.int(data, offset+0x1C, 0x4);
			console.log('Chunk ID: '+chunkId+' ('+chunkId.length+')'+' | Type: '+type+' | Size: '+dataSize+' | Count: '+dataCount+' | Offset: '+offset);

			offset += 0x20;

			var bones, animInfos, animKeys;

			switch(chunkId) {
				case 'BONENAMES':
					bones = [];
					for (var i=0; i<dataCount; i++) {
						var offset2 = offset+i*dataSize;

						var name = this.string(data, offset2, 0x40);
						var flags = this.int(data, offset2+0x40, 0x4);
						var numChildren = this.int(data, offset2+0x44, 0x4);
						var parentIndex = this.int(data, offset2+0x48, 0x4);
						var rotX = this.float(data, offset2+0x4C);
						var rotY = this.float(data, offset2+0x50);
						var rotZ = this.float(data, offset2+0x54);
						var rotW = this.float(data, offset2+0x58);
						var posX = this.float(data, offset2+0x5C);
						var posY = this.float(data, offset2+0x60);
						var posZ = this.float(data, offset2+0x64);

						/*console.log(name
						 +' | Offset: '+offset2
						 +' | Flags: '+flags
						 +' | Children: '+numChildren
						 +' | Parent: '+parentIndex
						 +' | Rotation: '+rotX+','+rotY+','+rotZ+','+rotW
						 +' | Position: '+posX+','+posY+','+posZ
						 );*/

						bones.push({
							name: name,
							flags: flags,
							numChildren: numChildren,
							parentIndex: parentIndex,
							rotation: {x: rotX, y: rotY, z: rotZ, w: rotW},
							position: {x: posX, y: posY, z: posZ}
						});
					}
					break;
				case 'ANIMINFO':
					animInfos = [];
					for (var i=0; i<dataCount; i++) {
						var offset2 = offset+i*dataSize;

						var name = this.string(data, offset2, 0x40);
						var group = this.string(data, offset2+0x40, 0x40);
						var totalBones = this.int(data, offset2+0x80, 0x4); // TotalBones * NumRawFrames is number of animations keys to digest.
						var rootInclude = this.int(data, offset2+0x84, 0x4); // 0 none 1 included 	(unused)
						var keyCompressionStyle = this.int(data, offset2+0x88, 0x4); // Reserved: variants in tradeoffs for compression
						var keyQuotum = this.int(data, offset2+0x8C, 0x4); // Max key quotum for compression
						var keyReduction = this.float(data, offset2+0x90); // desired
						var trackTime = this.float(data, offset2+0x94); // explicit - can be overridden by the animations rate
						var animRate = this.float(data, offset2+0x98); // frames per second.
						var startBone = this.int(data, offset2+0x9C, 0x4); // Reserved: for partial animations (unused)
						var firstRawFrame = this.int(data, offset2+0xA0, 0x4);
						var numRawFrames = this.int(data, offset2+0xA4, 0x4); // NumRawFrames and AnimRate dictate tracktime...

						/*console.log(name
						 //+' | Group: '+group
						 +' | Bones: '+totalBones
						 //+' | Root: '+rootInclude
						 //+' | CompStyle: '+keyCompressionStyle
						 +' | KeyQuotum: '+keyQuotum
						 +' | KeyReduction: '+keyReduction
						 +' | Time: '+trackTime
						 +' | AnimRate: '+animRate
						 +' | StartBone: '+startBone
						 +' | FirstFrame: '+firstRawFrame
						 +' | FrameCount: '+numRawFrames
						 );*/

						animInfos.push({
							name: name,
							group: group,
							totalBones: totalBones,
							rootInclude: rootInclude,
							keyCompressionStyle: keyCompressionStyle,
							keyQuotum: keyQuotum,
							keyReduction: keyReduction,
							trackTime: trackTime,
							animRate: animRate,
							startBone: startBone,
							firstRawFrame: firstRawFrame,
							numRawFrames: numRawFrames
						});
					}
					break;
				case 'ANIMKEYS':
					animKeys = [];
					for (var i=0; i<dataCount; i++) {
						var offset2 = offset+i*dataSize;

						var posX = this.float(data, offset2); // Relative to parent.
						var posZ = this.float(data, offset2+0x4);
						var posY = this.float(data, offset2+0x8);
						var rotX = this.float(data, offset2+0xC); // Relative to parent.
						var rotZ = this.float(data, offset2+0x10);
						var rotY = this.float(data, offset2+0x14);
						var rotW = this.float(data, offset2+0x18);
						var time = this.float(data, offset2+0x1C); // The duration until the next key (end key wraps to first...)

						animKeys.push({
							position: [posX, posY, posZ],//{x: posX, y: posY, z: posZ},
							rotation: [rotX, rotY, rotZ, rotW],//{x: rotX, y: rotY, z: rotZ, w: rotW},
							time: time
						});
					}
					break;
			}

			offset += dataSize*dataCount;
		}

		//console.log('Bones: ', bones);
		//console.log('AnimInfos: ', animInfos);
		//console.log('AnimKeys: ', animKeys.length);

		var rawFrameIndex = 0;

		for (var i=0; i<animInfos.length; i++) {
			var animInfo = animInfos[i];

			//if (animInfo.firstRawFrame*animInfo.totalBones != rawFrameIndex) console.log((animInfo.firstRawFrame*animInfo.totalBones)+' / '+rawFrameIndex);

			var hierarchy = [];

			for (var j=0; j<animInfo.totalBones; j++) {
				var bone = bones[animInfo.startBone+j];
				var keys = [];

				var animKeyTime = 0;
				for (var k=0; k<animInfo.numRawFrames; k++) {
					var animKeyIndex = animInfo.firstRawFrame*animInfo.totalBones+k*animInfo.totalBones+j;
					var animKey = animKeys[animKeyIndex];

					keys.push({
						time: (animKeyTime+animKey.time)/animInfo.animRate,
						pos: animKey.position,
						rot: animKey.rotation,
					});
					if (k == 0) keys[0].scl = [1,1,1];
					animKeyTime += animKey.time;

					rawFrameIndex++;
				}
				hierarchy.push({
					parent: bone.parentIndex,
					name: bone.name,
					keys: keys
				});
			}

			var anim = {
				name: animInfo.name,
				fps: animInfo.animRate,
				length: animInfo.trackTime/animInfo.animRate,
				hierarchy: hierarchy,
				relative: true
			};

			animations.push(anim);
		}

		return animations;
	}
});