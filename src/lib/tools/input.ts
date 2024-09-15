import { reactive } from "vue";

export function setupInput(scope: paper.PaperScope) {
	setupKeyboard();
	setupMouse(scope);
}

const keys = [
	'a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l',
	'm', 'n', 'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x',
	'y', 'z', '1', '2', '3', '4', '5', '6', '7', '8', '9', '0',
	'enter', 'backspace', 'delete', 'escape', 'space', 'control'
] as const;

type Key = typeof keys[number];
export type KeySpec = `${'ctrl-' | ''}${'shift-' | ''}${Key}${'-up' | ''}`;

export const currentBinds = reactive(new Map<KeySpec, Set<string>>());
const actionCallbacks = new Map<string, () => void>();

export function registerAction(name: string, callback: () => void, defaultBind?: KeySpec) {
	actionCallbacks.set(name, callback);
	if (defaultBind) {
		if (!currentBinds.has(defaultBind)) {
			currentBinds.set(defaultBind, new Set());
		}
		currentBinds.get(defaultBind)!.add(name);
	}
}

export function getActionList(): string[] {
	return Array.from(actionCallbacks.keys());
}

export function loadCustomKeybinds(keybindsConfig: [KeySpec, string[]][]) {
	currentBinds.clear();
	for (const [key, commands] of keybindsConfig) {
		if (keySpecIsValid(key) && Array.isArray(commands)) {
			currentBinds.set(key, new Set(commands));
		}
	}
}

export function serializeCustomKeybinds(): [KeySpec, string[]][] {
	return Array.from(currentBinds.entries()).map(([key, commands]) => {
		return [key, Array.from(commands)];
	});
}

const keySpecRegex = /^(ctrl-)?(shift-)?([a-z0-9]+)(-up)?$/;
function keySpecIsValid(input: string): input is KeySpec {
	const match = keySpecRegex.exec(input);
	if (!match) return false;
	if (!keys.includes(match[3] as Key)) return false;
	return true;
}

export function getKeySpec(event: KeyboardEvent, up: boolean): KeySpec {
	let spec = "";
	if (event.ctrlKey || event.metaKey) spec += "ctrl-";
	if (event.shiftKey) spec += "shift-";
	const key = event.key === " " ? "space" : event.key.toLowerCase();
	spec += key;
	if (up) spec += "-up";
	return spec as KeySpec;
}

function setupKeyboard() {
	function handleKeyEvent(event: KeyboardEvent, up: boolean) {
		if (event.key === "Escape") {
			blurCurrent();
			return;
		}
		if (userIsTyping(event)) return;
		if (event.repeat) return;
		const spec = getKeySpec(event, up);
		if (currentBinds.has(spec)) {
			const actions = currentBinds.get(spec)!;
			for (const action of actions) {
				actionCallbacks.get(action)!();
			}
			event.preventDefault();
		}
	}

	window.addEventListener("keydown", event => {
		handleKeyEvent(event, false);
	});

	window.addEventListener("keyup", event => {
		handleKeyEvent(event, true);
	});
}

export function textIsSelected() {
	if (window.getSelection()?.toString()) {
		return true;
	}

	return false;
}

export function userIsTyping(event: KeyboardEvent) {
	return event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement;
}

function blurCurrent() {
	const active = document.activeElement;
	if (active instanceof HTMLElement) active.blur();
}

const setupMouse = (scope: paper.PaperScope) => {
	scope.view.onMouseDown = () => blurCurrent();
};
