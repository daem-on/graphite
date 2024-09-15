import vue from "@vitejs/plugin-vue";
import dts from "vite-plugin-dts";
import { defineConfig } from "vite";
import submodules from "./submodules.json";

export default defineConfig({
	plugins: [
		dts(),
		vue()
	],
	build: {
		lib: {
			entry: submodules.map(name => `src/lib/${name}.ts`),
			name: "graphite",
			fileName: (_, entryName) => `${entryName}.js`,
			formats: ["es"],
		},
		rollupOptions: {
			external: ["vue", "paper", "@floating-ui/vue"],
			output: {
				globals: {
					vue: "Vue",
					paper: "paper",
				}
			}
		}
	}
});