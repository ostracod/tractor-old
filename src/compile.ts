
import Compiler from "./compiler.js";

if (process.argv.length !== 3) {
    console.log("Usage: node ./dist/compile.js (tractor project path)");
    process.exit(1);
}

const projectPath = process.argv[2];
const compiler = new Compiler(projectPath);
compiler.compile();


