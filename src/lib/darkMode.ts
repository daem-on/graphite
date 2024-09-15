import { ref } from "vue";

const darkModeQuery = window.matchMedia("(prefers-color-scheme: dark)");

export const isDarkMode = ref(darkModeQuery.matches);

darkModeQuery.addEventListener("change", e => {
	isDarkMode.value = e.matches;
});
