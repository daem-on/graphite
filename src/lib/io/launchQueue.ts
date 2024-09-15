export function setup(canHandle: (file: FileSystemFileHandle) => boolean, onLoad: (file: FileSystemFileHandle, text: string) => void) {
	if ("launchQueue" in window) {	
		(window as any).launchQueue.setConsumer((launchParams: any) => {
			handleFiles(launchParams.files, canHandle, onLoad);
		});
	}
}

async function handleFiles(files: FileSystemFileHandle[], canHandle: (file: FileSystemFileHandle) => boolean, onLoad: (file: FileSystemFileHandle, text: string) => void) {
	if (files.length > 0) {
		const file = files[0];
        if (!canHandle(file)) return;
		const blob = await file.getFile();
        const text = await blob.text();
		onLoad(file, text);
    }
}