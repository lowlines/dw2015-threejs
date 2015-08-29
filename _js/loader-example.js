THREE.CustomLoader = function(manager) {
	this.manager = (manager !== undefined) ? manager : THREE.DefaultLoadManager;
};
THREE.CustomLoader.prototype = {
	constructor: THREE.CustomLoader,
	load: function(url, onLoad, onProgress, onError) {
		var scope = this;
		var cached = THREE.Cache.get(url);
		
		if (cached !== undefined) {
			if (onLoad) onLoad(cached);
			return;
		}
		
		// Implement custom loader here
	}
}