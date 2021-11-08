
import { Compiler } from "./compiler.js";
import { initializeBuiltInDefinitions } from "./builtInDefinition.js";

if (process.argv.length < 3) {
    console.log("Usage: node ./dist/compile.js <projectPath> <configName?> <configName?> <configName?>...");
    process.exit(1);
}

initializeBuiltInDefinitions();
const projectPath = process.argv[2];
const configNames = process.argv.slice(3);
const compiler = new Compiler(projectPath, configNames);
compiler.compile();


