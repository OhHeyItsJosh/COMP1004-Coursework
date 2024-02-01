class Project {
    /** @type {TasksHierarchy} */
    tasksHierarchy;

    constructor() {
        this.tasksHierarchy = new TasksHierarchy();
    }
}

class NodeHierarchyTree {
    /** @type {Map<string, TreeNode>} */
    nodeMap;
    /** @type {string[]} */
    rootNodes;

    constructor() {
        this.nodeMap = new Map();
        this.rootNodes = [];
    }

    /**
     * 
     * @param {TreeNode} node 
     */
    addNode(node) {
        node.bindTree(this);
        this.nodeMap.set(node.getId(), node);
    }

    /**
     * 
     * @param {TreeNode} node 
     */
    addRootLevelNode(node) {
        this.addNode(node);
        this.rootNodes.push(node.getId());
    }

    /**
     * 
     * @param {string} id 
     */
    getNode(id) {
        return this.nodeMap.get(id);
    }
}

class TreeNode {
    /** @type {string} 
     * @private */
    id;
    /** @type {NodeHierarchyTree} 
     * @private */
    nodeTree;
    /** @type {string[]} 
     * @private */
    children;
    /** @type {string} 
     * @private */
    parent;

    constructor() {
        this.id = Math.floor(Math.random() * 1000000); // temporary, switch to better id assigner later on
        this.nodeTree = null;
        this.children = [];
        this.parent = null;
    }

    getId() {
        return this.id;
    }

    getParent() {
        return this.nodeTree.getNode(this.parent);
    }

    /**
     * 
     * @param {NodeHierarchyTree} tree 
     */
    bindTree(tree) {
        this.nodeTree = tree;
    }

    /**
     * 
     * @param {TreeNode} node 
     */
    assignParent(node) {
        if (this.parent) {
            this.getParent().removeChildNode(node);
        }

        this.parent = node.getId();
    }
    
    /**
     * 
     * @param {TreeNode} node 
     */
    addChildNode(node) {
        this.nodeTree.addNode(node);
        this.children.push(node.getId());
        node.assignParent(this);
    }

    /**
     * 
     * @param {TreeNode} node 
     */
    removeChildNode(node) {
        const index = this.children.indexOf(node.getId());
        if (index == -1)
            return;

        this.children.splice(index, 1);
    }
}

class TasksHierarchy extends NodeHierarchyTree {
    constructor() { super(); }

    getActiveTasks() {}
}

class Task extends TreeNode {
    /** @type {string}
     * @private */
    name;

    /** @type {string} 
     * @private */
    description;

    /**
     * @type {number}
     * @private */
    startDate

    /**
     * @type {number}
     * @private */
    endDate

    /**
     * 
     * @param {string} name 
     * @param {string} description 
     * @param {number} startDate 
     * @param {number} endDate 
     */
    constructor(name, description, startDate, endDate) {
        super();
        this.name = name;
        this.description = description;
        this.startDate = startDate;
        this.endDate = endDate;
    }

    getName() {
        return this.name;
    }

    getDescription() {
        return this.description;
    }

    getStartDate() {
        return new Date(this.startDate);
    }

    getEndDate() {
        return new Date(this.endDate);
    }
}