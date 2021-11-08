
import * as niceUtils from "./niceUtils.js";
import { IdentifierMap } from "./identifier.js";
import { Statement, LabelStatement, JumpStatement, JumpIfStatement } from "./statement.js";
import { CompItem } from "./compItem.js";
import { CompVoid } from "./compValue.js";

export class StatementPancake {
    statements: Statement[];
    labelIndexMap: IdentifierMap<number>;
    reachabilityMap: Map<Statement, boolean>;
    returnCompItems: CompItem[];
    
    // Assumes that transformControlFlow has been called
    // on the parent block.
    constructor(statements: Statement[]) {
        this.statements = statements;
        this.labelIndexMap = new IdentifierMap();
        this.statements.forEach((statement, index) => {
            if (statement instanceof LabelStatement) {
                const identifier = statement.getDeclarationIdentifier();
                this.labelIndexMap.add(identifier, index);
            }
        });
        this.reachabilityMap = new Map();
        this.statements.forEach((statement) => {
            this.reachabilityMap.set(statement, false);
        });
        this.returnCompItems = [];
        const { returnsVoid, returnsUnresolvedItem } = this.determineReachability();
        if (returnsVoid) {
            this.returnCompItems.push(new CompVoid());
        }
        if (returnsUnresolvedItem) {
            this.returnCompItems.push(null);
        }
    }
    
    getNextIndexes(index: number): number[] {
        const statement = this.statements[index];
        let canAdvance = false;
        let canJump = false;
        if (statement instanceof JumpStatement) {
            canJump = true;
        } else if (statement instanceof JumpIfStatement) {
            canAdvance = true;
            canJump = true;
        } else if (statement.type.directive !== "RET") {
            canAdvance = true;
        }
        const output: number[] = [];
        if (canAdvance) {
            const nextIndex = index + 1;
            if (nextIndex < this.statements.length) {
                output.push(nextIndex);
            }
        }
        if (canJump) {
            const identifier = statement.getIdentifier();
            output.push(this.labelIndexMap.get(identifier));
        }
        return output;
    }
    
    determineReachability(): { returnsVoid: boolean, returnsUnresolvedItem: boolean } {
        if (this.statements.length <= 0) {
            return { returnsVoid: true, returnsUnresolvedItem: false };
        }
        let returnsVoid = false;
        let returnsUnresolvedItem = false;
        const indexesToVisit: number[] = [0];
        while (indexesToVisit.length > 0) {
            const index = indexesToVisit.pop();
            const statement = this.statements[index];
            if (this.reachabilityMap.get(statement)) {
                continue;
            }
            if (statement.type.directive === "RET") {
                if (statement.args.length <= 0) {
                    returnsVoid = true;
                } else {
                    const expression = statement.args[0].get();
                    const item = expression.evaluateToCompItemOrNull();
                    if (item === null) {
                        returnsUnresolvedItem = true;
                    } else {
                        this.returnCompItems.push(item);
                    }
                }
            }
            this.reachabilityMap.set(statement, true);
            const nextIndexes = this.getNextIndexes(index);
            niceUtils.extendList(indexesToVisit, nextIndexes);
        }
        return { returnsVoid, returnsUnresolvedItem };
    }
}


