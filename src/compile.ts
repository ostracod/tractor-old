
import { Compiler } from "./compiler.js";
import { initializeBuiltInItems } from "./builtInItem.js";

if (process.argv.length < 3) {
    console.log("Usage: node ./dist/compile.js <projectPath> <configName?> <configName?> <configName?>...");
    process.exit(1);
}

initializeBuiltInItems();
const projectPath = process.argv[2];
const configNames = process.argv.slice(3);
const compiler = new Compiler(projectPath, configNames);
compiler.compile();


