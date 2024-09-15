import { type Component, type Ref, StyleValue, computed, markRaw, ref } from "vue";

export type DialogData<T> = { id: string, title: string, style?: StyleValue, content: T };
export type DialogComponent<T> = Component<{ data: DialogData<T> }>;

type ActiveDialogEntry = { component: DialogComponent<any>, data: DialogData<any> };

const activeDialogs: Ref<Map<string, ActiveDialogEntry>> = ref(new Map());
export const activeDialogList = computed(() => Array.from(activeDialogs.value.values()));

export function addDialog<T>(component: DialogComponent<T>, data: DialogData<T>): void {
	component = markRaw(component);
	activeDialogs.value.set(data.id, { component, data });
}

export function removeDialog(id: string): void {
	activeDialogs.value.delete(id);
}