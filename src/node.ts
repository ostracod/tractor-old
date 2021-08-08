
export class Node {
    parentSlot: NodeSlot;
    slots: { [slotId: string]: NodeSlot };
    
    constructor() {
        this.parentSlot = null;
        this.slots = {};
    }
    
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
    
    processNodes(handle: (node: Node) => Node, shouldRecur: boolean): void {
        for (const key in this.slots) {
            const slot = this.slots[key];
            const node = slot.get();
            if (node === null) {
                continue;
            }
            const result = handle(node);
            if (result === null) {
                if (shouldRecur) {
                    node.processNodes(handle, shouldRecur);
                }
            } else {
                slot.set(result);
            }
        }
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
}

let nextSlotId = 0;

export class NodeSlot<T extends Node = Node> {
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
}


