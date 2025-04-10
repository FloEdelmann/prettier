import url from "node:url";
import { isValidIdentifier } from "@babel/types";
import serialize from "serialize-javascript";

export default function esbuildPluginEvaluate() {
  return {
    name: "evaluate",
    setup(build) {
      const { format } = build.initialOptions;

      build.onLoad(
        { filter: /\.evaluate\.c?js$/, namespace: "file" },
        async ({ path }) => {
          const module = await import(url.pathToFileURL(path));
          const text = Object.entries(module)
            .filter(([specifier]) => specifier !== "module.exports")
            .map(([specifier, value]) => {
              const code =
                value instanceof RegExp
                  ? `/${value.source}/${value.flags}`
                  : serialize(value, { space: 2 });

              if (specifier === "default") {
                return format === "cjs"
                  ? `module.exports = ${code};`
                  : `export default ${code};`;
              }

              if (!isValidIdentifier(specifier)) {
                throw new Error(`${specifier} is not a valid specifier`);
              }

              return format === "cjs"
                ? `exports.${specifier} = ${code};`
                : `export const ${specifier} = ${code};`;
            })
            .join("\n");
          return { contents: text };
        },
      );
    },
  };
}
