"use strict";
var jadi = require("./jadi.js").jadi;
exports.newInstance = function(jadiInstance, relativePath) {
	relativePath = relativePath || "";
	jadiInstance = jadi(jadiInstance);

	return jadiInstance.plugIn(function() {
		var container = this;
		var originalResolve = container.utils.resolvePath;
		var pathUtil = require('path');
		container.utils.resolvePath = function(obj, path, parent) {
			var moduleClazz = path.split("@");
			if (moduleClazz.length === 2) {
				var abPath = pathUtil.resolve(relativePath + moduleClazz[0]);
				var hasJs = abPath.indexOf(".js") !== -1;
				if (!hasJs) {
					abPath = abPath + ".js";
				}
				if (pathUtil.existsSync(abPath)) {
					var clazz = moduleClazz[1];
					if (clazz === "") {
						return require(abPath);
					}
					return require(abPath)[clazz];
				} else {
					throw new Error(moduleClazz[0] + " not found");
				}
			}
			return originalResolve(obj, path, parent);
		};

		jadiInstance.nodeBeans = function() {
			var mapping = container.factory.mapping;
			var definitions = [];
			for ( var i = 0; i < arguments.length; i++) {
				definitions.push(arguments[i]);
			}
			mapping.addBeanDefinition.apply(mapping, definitions);
			container.factory.loadEagerBeans();
		};

		jadiInstance.load = function(configFiles) {
			for ( var i = 0; i < configFiles.length; i++) {
				var filePath = pathUtil.resolve(configFiles[i]);
				var beanDefinitions = require(filePath).beanDefinitions;
				jadiInstance.nodeBeans(beanDefinitions);
				for ( var j = 0; j < beanDefinitions.length; j++) {
					if (beanDefinitions[j].dispatcher) {
						if (beanDefinitions[j].id !== undefined) {
							var dispatcher = jadiInstance.getBean(beanDefinitions[j].id);
						} else {
							var dispatcher = jadiInstance.newInstance(beanDefinitions[j]);
						}
						if (dispatcher.setBeanFactory !== undefined) {
							dispatcher.setBeanFactory(jadiInstance);
						}
						break;
					}
				}
			}
			container.factory.loadEagerBeans();
			return dispatcher;
		}

		require("./common/logger.js").makeAvailable();
		return jadiInstance;
	});
}