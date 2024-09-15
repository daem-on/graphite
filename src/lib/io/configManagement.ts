let configKey = "config";
let config: Record<string, any> = {};

export function configExists(name: string) {
	return config[name] != null;
}

export function getConfig(name: string) {
	return config[name];
}

export function setConfig(name: string, value: any) {
	config[name] = value;
	saveConfig();
}

export function assignConfig(values: Record<string, any>) {
	Object.assign(config, values);
	saveConfig();
}

export function loadConfig() {
	try {
		config = JSON.parse(localStorage[configKey]);
	} catch (e) {
		console.error("Error while reading config:", e);
		config = {};
	}
}

export function setupConfig(defaultConfig: Record<string, any>, key: string) {
	configKey = key;
	if (localStorage[configKey] === undefined) {
		config = defaultConfig;
		saveConfig();
	}
	loadConfig();
}

function saveConfig() {
	localStorage[configKey] = JSON.stringify(config);
}