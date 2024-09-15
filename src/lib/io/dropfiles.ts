export function cancelAll(event: Event) {
	event.preventDefault();
	event.stopPropagation();
}

export function handleDroppedFile(event: DragEvent, canHandle: (file: File) => boolean, onLoad: (file: File, text: string) => void) {
	const files = event.dataTransfer?.files;
	if (!files || files.length <= 0) return;
	const file = files[0];
	if (!canHandle(file)) return;
	const reader = new FileReader();
	reader.onload = () => onLoad(file, reader.result as string);
	reader.readAsText(file);
}