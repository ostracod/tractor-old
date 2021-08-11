
import { Displayable } from "./interfaces.js";
import { constructors } from "./constructors.js";
import { CompilerError } from "./compilerError.js";
import { Pos } from "./pos.js";
import { Compiler } from "./compiler.js";
import { Statement } from "./statement.js";
import { StatementBlock } from "./statementBlock.js";
import { StatementGenerator } from "./statementGenerator.js";
import { Expression } from "./expression.js";

export abstract class Node implements Displayable {
    parentSlot: NodeSlot;
    slots: { [slotId: string]: NodeSlot };
    pos: Pos;
    
    constructor() {
        this.parentSlot = null;
        this.slots = {};
        this.pos = null;
    }
    
    abstract getDisplayString(): string;
    
    getParentNode(): Node {
        if (this.parentSlot === null) {
            return null;
        }
        return this.parentSlot.parentNode;
    }
    
    getParentByFilter(filter: (node: Node) => boolean): Node {
        let node: Node = this;
        while (node !== null) {
            node = node.getParentNode();
            if (filter(node)) {
                return node;
            }
        }
        return null;
    }
    
    getParentByClass<T extends Node>(constructor: Function & { prototype: T }): T {
        return this.getParentByFilter((node) => node instanceof constructor) as T;
    }
    
    getParentBlock(): StatementBlock {
        return this.getParentByClass(constructors.StatementBlock);
    }
    
    getCompiler(): Compiler {
        return this.getParentByClass(constructors.Compiler);
    }
    
    // If handle returns a node:
    //   > processNodes will replace the original node
    //   > processNodes will not recur
    // If handle returns null:
    //   > processNodes will not replace the original node
    //   > processNodes will recur
    processNodes(handle: (node: Node) => Node): void {
        for (const key in this.slots) {
            const slot = this.slots[key];
            const node = slot.get();
            if (node === null) {
                continue;
            }
            const result = handle(node);
            if (result === null) {
                node.processNodes(handle);
            } else {
                slot.set(result);
            }
        }
    }
    
    processNodesByClass<T extends Node>(
        constructor: Function & { prototype: T },
        handle: (node: T) => T,
    ): void {
        this.processNodes((node) => {
            if (node instanceof constructor) {
                return handle(node as T);
            }
            return null;
        });
    }
    
    processExpressions(handle: (expression: Expression) => Expression): void {
        this.processNodesByClass(constructors.Expression, handle);
    }
    
    processBlocks(handle: (block: StatementBlock) => StatementBlock): void {
        this.processNodesByClass(constructors.StatementBlock, handle);
    }
    
    processBlockStatements(handle: (statement: Statement) => Statement[]): void {
        this.processNodesByClass(constructors.StatementBlock, (block) => {
            block.processBlockStatements(handle);
            return null;
        });
    }
    
    addSlot<T extends Node>(node: T = null): NodeSlot<T> {
        const slot = new NodeSlot<T>();
        slot.parentNode = this;
        this.slots[slot.id] = slot;
        slot.set(node);
        return slot;
    }
    
    addSlots<T extends Node>(nodes: T[]): NodeSlot<T>[] {
        return nodes.map((node) => this.addSlot(node));
    }
    
    removeSlot(slot: NodeSlot): void {
        slot.parentNode = null;
        delete this.slots[slot.id];
    }
    
    getPos(): Pos {
        let node: Node = this;
        while (node !== null) {
            const { pos } = node;
            if (pos !== null) {
                return pos;
            }
            node = node.getParentNode();
        }
        return null;
    }
    
    createError(message: string): CompilerError {
        return new CompilerError(message, this.getPos());
    }
    
    tryOperation(operation: () => void): void {
        try {
            operation();
        } catch (error) {
            if (error instanceof CompilerError && error.pos === null) {
                error.pos = this.getPos();
            }
            throw error;
        }
    }
    
    createStatementBlock(statements: Statement[] = []): StatementBlock {
        return new constructors.StatementBlock(this.getPos(), statements);
    }
    
    createStatementGenerator(destination: Statement[] = null): StatementGenerator {
        return new constructors.StatementGenerator(this.getPos(), destination);
    }
}

let nextSlotId = 0;

export class NodeSlot<T extends Node = Node> implements Displayable {
    id: number;
    parentNode: Node;
    node: T;
    
    constructor() {
        this.id = nextSlotId;
        nextSlotId += 1;
        this.parentNode = null;
        this.node = null;
    }
    
    get(): T {
        return this.node;
    }
    
    set(node: T): void {
        if (this.node !== null) {
            this.node.parentSlot = null;
        }
        if (node !== null) {
            if (node.parentSlot !== null) {
                node.parentSlot.node = null;
            }
            node.parentSlot = this;
        }
        this.node = node;
    }
    
    getDisplayString(): string {
        if (this.node === null) {
            return "(Empty slot)";
        } else {
            return "(Slot) " + this.node.getDisplayString();
        }
    }
}


