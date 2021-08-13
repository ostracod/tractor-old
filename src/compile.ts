
import { Compiler } from "./compiler.js";
// We need to import these files to populate their
// constructors in constructors.ts.
import "./compiler.js";
import "./statement.js";
import "./statementBlock.js";
import "./statementGenerator.js";
import "./expression.js";

if (process.argv.length < 3) {
    console.log("Usage: node ./dist/compile.js <projectPath> <configName?> <configName?> <configName?>...");
    process.exit(1);
}

const projectPath = process.argv[2];
const configNames = process.argv.slice(3);
const compiler = new Compiler(projectPath, configNames);
compiler.compile();


