var shaderMaterial = new THREE.ShaderMaterial({
	uniforms: THREE.UniformsUtils.merge([
		THREE.UniformsLib[ "common" ],
		THREE.UniformsLib[ "fog" ],
		THREE.UniformsLib[ "shadowmap" ]
	]),
	
	vertexShader: [
		// Insert custom header code here
		
		THREE.ShaderChunk[ "common" ],
		THREE.ShaderChunk[ "map_pars_vertex" ],
		THREE.ShaderChunk[ "lightmap_pars_vertex" ],
		THREE.ShaderChunk[ "envmap_pars_vertex" ],
		THREE.ShaderChunk[ "color_pars_vertex" ],
		THREE.ShaderChunk[ "morphtarget_pars_vertex" ],
		THREE.ShaderChunk[ "skinning_pars_vertex" ],
		THREE.ShaderChunk[ "shadowmap_pars_vertex" ],
		THREE.ShaderChunk[ "logdepthbuf_pars_vertex" ],
		
		"void main() {",
			THREE.ShaderChunk[ "map_vertex" ],
			THREE.ShaderChunk[ "lightmap_vertex" ],
			THREE.ShaderChunk[ "color_vertex" ],
			THREE.ShaderChunk[ "skinbase_vertex" ],

			"	#ifdef USE_ENVMAP",
			THREE.ShaderChunk[ "morphnormal_vertex" ],
			THREE.ShaderChunk[ "skinnormal_vertex" ],
			THREE.ShaderChunk[ "defaultnormal_vertex" ],
			"	#endif",

			THREE.ShaderChunk[ "morphtarget_vertex" ],
			THREE.ShaderChunk[ "skinning_vertex" ],
			THREE.ShaderChunk[ "default_vertex" ],
			THREE.ShaderChunk[ "logdepthbuf_vertex" ],

			THREE.ShaderChunk[ "worldpos_vertex" ],
			THREE.ShaderChunk[ "envmap_vertex" ],
			THREE.ShaderChunk[ "shadowmap_vertex" ],
		"}"
	].join("\n"),
	
	fragmentShader: [
		// Insert custom header code here
		
		"uniform vec3 diffuse;",
		"uniform float opacity;",
		
		THREE.ShaderChunk[ "common" ],
		THREE.ShaderChunk[ "color_pars_fragment" ],
		THREE.ShaderChunk[ "map_pars_fragment" ],
		THREE.ShaderChunk[ "alphamap_pars_fragment" ],
		THREE.ShaderChunk[ "lightmap_pars_fragment" ],
		THREE.ShaderChunk[ "envmap_pars_fragment" ],
		THREE.ShaderChunk[ "fog_pars_fragment" ],
		THREE.ShaderChunk[ "shadowmap_pars_fragment" ],
		THREE.ShaderChunk[ "specularmap_pars_fragment" ],
		THREE.ShaderChunk[ "logdepthbuf_pars_fragment" ],
		
		// Insert custom functions here
		
		"void main() {",
		"	vec3 outgoingLight = vec3( 0.0 );",	// outgoing light does not have an alpha, the surface does
		"	vec4 diffuseColor = vec4( diffuse, opacity );",

		// Insert custom pre-render code here

		THREE.ShaderChunk[ "logdepthbuf_fragment" ],
		THREE.ShaderChunk[ "map_fragment" ],
		THREE.ShaderChunk[ "color_fragment" ],
		THREE.ShaderChunk[ "alphamap_fragment" ],
		THREE.ShaderChunk[ "alphatest_fragment" ],
		THREE.ShaderChunk[ "specularmap_fragment" ],

		"	outgoingLight = diffuseColor.rgb;", // simple shader

		THREE.ShaderChunk[ "lightmap_fragment" ],		// TODO: Light map on an otherwise unlit surface doesn't make sense.
		THREE.ShaderChunk[ "envmap_fragment" ],
		THREE.ShaderChunk[ "shadowmap_fragment" ],		// TODO: Shadows on an otherwise unlit surface doesn't make sense.

		THREE.ShaderChunk[ "linear_to_gamma_fragment" ],

		THREE.ShaderChunk[ "fog_fragment" ],

		// Final pixel color
		"	gl_FragColor = vec4( outgoingLight, diffuseColor.a );",	// TODO, this should be pre-multiplied to allow for bright highlights on very transparent objects

	"}"
		
	].join("\n"),
	
	skinning: true,
	shading: THREE.SmoothShading
});