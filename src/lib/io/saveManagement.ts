export type SaveManager<PK> = {
	save: () => void;
	reload: () => void;
	open: () => void;
	saveAs: () => void;
	clear: () => void;
	switchProvider: (provider: PK) => void;
};

export type SaveProvider<S, D> = {
	createInitialSave: (document: D) => Promise<S | null>;
	save: (state: S, document: D) => void;
	reload: (state: S) => Promise<D>;
	open: () => Promise<[S, D] | null>;
	getDisplayName: (state: S) => string;
}

export function createSaveManager<D, PK extends string>(settings: {
	getDocumentState: () => D;
	setDocumentState: (state: D) => void;
	createEmptyDocument: () => D;
	providers: Record<PK, SaveProvider<any, D>>;
	setDisplayName: (name: string) => void;
	untitledName: string;
}): SaveManager<PK> {
	if (Object.keys(settings.providers).length === 0) {
		throw new Error("No save providers given");
	}

	const providers = new Map<PK, SaveProvider<any, D>>(
		Object.entries(settings.providers) as any
	);
	const states = new Map<PK, any>();

	let currentProvider: PK = providers.keys().next().value;
	const current = {
		get provider() {
			return providers.get(currentProvider)!;
		},
		get state(): any {
			return states.get(currentProvider);
		},
		set state(value: any) {
			states.set(currentProvider, value);
		},
	}

	async function saveInitial() {
		const document = settings.getDocumentState();
		const newState = await current.provider.createInitialSave(document);
		if (newState) {
			current.state = newState;
			updateDisplayName();
		}
	}

	function updateDisplayName() {
		if (current.state) {
			settings.setDisplayName(current.provider.getDisplayName(current.state));
		} else {
			settings.setDisplayName(settings.untitledName);
		}
	}

	return {
		async save() {
			if (!current.state) {
				await saveInitial();
			} else {
				current.provider.save(current.state, settings.getDocumentState());
			}
		},
		async reload() {
			if (!current.state) return;
			const document = await current.provider.reload(current.state);
			settings.setDocumentState(document);
		},
		async open() {
			const result = await current.provider.open();
			if (!result) return;
			const [newState, document] = result;
			current.state = newState;
			settings.setDocumentState(document);
			updateDisplayName();
		},
		async saveAs() {
			await saveInitial();
		},
		clear() {
			current.state = undefined;
			settings.setDocumentState(settings.createEmptyDocument());
			updateDisplayName();
		},
		async switchProvider(provider: PK) {
			if (provider === currentProvider) return;
			currentProvider = provider;
			current.state = undefined;
			updateDisplayName();
			await saveInitial();
		},
	};
}