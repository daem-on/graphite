import { UnwrapRef, computed, ref } from "vue";
import { activeToolRef } from "./tools";

type UndoConfig<D> = {
	scope: paper.PaperScope,
	undoBufferSize: number,
	transform: (data: string) => UnwrapRef<D>,
	untransform: (data: UnwrapRef<D>) => string,
	deserializeJSON: (data: string) => any,
	restoreLayer: (data: any) => void,
};

type UndoState<D> = {
	type: string,
	data: D,
	hash: string,
}

async function getDigest(source: string): Promise<string> {
	const buffer = new TextEncoder().encode(source);
	const digest = await crypto.subtle.digest("SHA-256", buffer);
	const hashArray = Array.from(new Uint8Array(digest));
	const hashHex = hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
	return hashHex;
}

export function createUndoBuffer<D>(config: UndoConfig<D>) {
	const states = ref<UndoState<D>[]>([]);
	const head = ref(-1);

	function restore(entry: UndoState<UnwrapRef<D>>) {
		const activeLayerData = config.scope.project.activeLayer.data;
		config.scope.project.clear();
		config.scope.view.update();
		const text = config.untransform(entry.data);
		config.scope.project.importJSON(config.deserializeJSON(text));
		config.restoreLayer(activeLayerData);
		activeToolRef.value?.emit("restore", undefined);
	}

	async function snapshot(type: string) {
		const text = config.scope.project.exportJSON();
		const hash = await getDigest(text);

		if (head.value >= 0 && states.value[head.value].hash === hash) return;

		const data = config.transform(text);
		
		if (head.value + 1 < states.value.length) {
			states.value.length = head.value + 1;
		}
		
		states.value.push({ type, hash, data });
		
		if (states.value.length > config.undoBufferSize) {
			states.value.shift();
		}
		
		head.value = states.value.length-1;
	}

	const created = {
		statesRef: computed(() => states.value),
		headRef: computed(() => head.value),
		snapshot,
		undo() {
			if (head.value > 0) {
				head.value--;
				restore(states.value[head.value]);
			}
		},
		redo() {
			if (head.value < states.value.length-1) {
				head.value++;
				restore(states.value[head.value]);
			}
		},
		moveHeadTo(position: number) {
			if (position < 0 || position >= states.value.length) {
				return;
			}
			if (position === head.value) return;
			head.value = position;
			restore(states.value[head.value]);
		},
		clear() {
			states.value = [];
			head.value = -1;
		},
		getStates() {
			return states.value;
		},
		getHead() {
			return head.value;
		}
	}
	return created;
}
