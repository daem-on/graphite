/// <reference types="wicg-file-system-access" />

import { saveAs } from "file-saver";

export const supportsFilesystem = !!window.showSaveFilePicker && !!window.showOpenFilePicker;
export class FileSystemApiNotSupportedError extends Error {
	constructor() {
		super("File System API is not supported in this browser.");
	}
}

export async function pickSaveFile(types: FilePickerAcceptType[]): Promise<FileSystemFileHandle | undefined> {
	if (supportsFilesystem) {
		try {
			return await window.showSaveFilePicker({ types });
		} catch {
			console.log("Exited without any save location set.");
			return undefined;
		}
	} else {
		throw new FileSystemApiNotSupportedError();
	}
}

export async function writeOrDownloadBlob(blob: Blob, handle: FileSystemFileHandle | undefined, filename: string) {
	if (supportsFilesystem && handle) {
		const writable = await handle.createWritable();
		await writable.write(blob);
		await writable.close();
	} else {
		saveAs(blob, filename);
	}
}

export async function openSingleFile(types: FilePickerAcceptType[]): Promise<FileSystemFileHandle | undefined> {
	if (supportsFilesystem) {
		try {
			const result = await window.showOpenFilePicker({ types, multiple: false });
			return result[0];
		} catch (e: any) {
			if (e.name === "AbortError") {
				console.log("Exited without any file selected.");
				return undefined;
			}
			throw e;
		}
	} else {
		throw new FileSystemApiNotSupportedError();
	}
}
