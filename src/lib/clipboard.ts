export type ClipboardProvider = {
	copy: (values: string[]) => void,
	paste: () => Promise<string[]>,
};

export function useLocalClipboard(): ClipboardProvider {
	let localClipboard: string[] = [];

	return {
		copy: values => localClipboard = values,
		paste: async () => localClipboard,
	};
}

export function useAsyncClipboard(mime: string): ClipboardProvider {
	if (!navigator.clipboard) throw new Error("Async Clipboard is not available");
	return {
		copy(values) {
			const clipboardItems = values.map(json => {
				const blob = new Blob([json], { type: mime });
				return new ClipboardItem({ [mime]: blob });
			});
			navigator.clipboard.write(clipboardItems);
		},
		async paste() {
			const clipboard = await navigator.clipboard.read();
			return Promise.all(
				clipboard
					.filter(item => item.types.includes(mime))
					.map(async item => {
						const blob = await item.getType(mime);
						return await blob.text();
					})
			);
		}
	};
}

