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

    isRootLevelNode(id) {
        const pred = this.rootNodes.indexOf(id) != -1;
        return pred;
    }
}

class TreeNode {
    /** @type {string} 
     * @protected */
    id;
    /** @type {NodeHierarchyTree} 
     * @protected */
    nodeTree;
    /** @type {string[]} 
     * @protected */
    children;
    /** @type {string} 
     * @protected */
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

    getChildren() {
        return this.children.map((child) => this.nodeTree.getNode(child));
    }

    isRootLevelNode() {
        return this.nodeTree.isRootLevelNode(this.id);
    }

    hasChildren() {
        return this.children.length > 0;
    }

    /**
     * 
     * @param {(id: string, node: TreeNode) => void} callback 
     */
    forEachParent(callback) {
        const parent = this.getParent();
        if (!parent)
            return;
        
        callback(parent.getId(), parent);
        parent.forEachParent(callback);
    }
}

class TasksHierarchy extends NodeHierarchyTree {
    /** @type {Map<number, Tag>} @private */
    tagRepo;

    constructor() {
        super();
        this.tagRepo = new Map();
     }

     getSavedTags() {
        return Array.from(this.tagRepo.values());
     }

     getTag(id) {
        return this.tagRepo.get(id);
     }

     #nextTagId() {
        let index = this.tagRepo.size;

        while (this.tagRepo.has(index))
            { index++; }

        return index;
     }

     /**
      * 
      * @param {string} text
      * @param {string} color
      * @returns {Tag}
      */
     createTag(text, color) {
        const tag = new Tag(this.#nextTagId(), text, color);
        this.tagRepo.set(tag.id, tag);

        return tag;
     }

    getActiveTasks() {}
}

class Tag {
    /** @type {number} */
    id;
    /** @type {string} */
    text;
    /** @type {string} */
    color;

    constructor(id, text, color) {
        this.id = id;
        this.text = text;
        this.color = color;
    }
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
    startDate;

    /**
     * @type {number}
     * @private */
    endDate;

    /**
     * @type {number[]}
     * @private */
    tags;

    /** @type {number} 
     * @private */
    status;

    /**
     * 
     * @param {string}  name 
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
        
        this.tags = [];
        this.status = Status.NOT_STARTED;
    }

    getName() {
        return this.name;
    }

    setName(name) {
        this.name = name;
    }

    getDescription() {
        return this.description;
    }

    setDescription(description) {
        this.description = description;
    }

    getStartDate() {
        return new Date(this.startDate);
    }

    getEndDate() {
        return new Date(this.endDate);
    }

    setDates(startDate, endDate) {
        this.startDate = startDate;
        this.endDate = endDate;
    }

    addTag(tagId) {
        if (this.tags.includes(tagId)) 
            return false;

        this.tags.push(tagId);
        return true;
    }

    hasTag(tagId) {
        return this.tags.includes(tagId);
    }

    removeTag(tagId) {
        const index = this.tags.indexOf(tagId);
        if (index == -1)
            return;
        
        this.tags.splice(index, 1);
    }

    getTags() {
        return this.tags.map((tagId) => TasksHierarchy.prototype.getTag.call(this.nodeTree, tagId));
    }

    getStatus() {
        return this.status;
    }

    setStatus(status) {
        this.status = status;
    }

    getSubtaskCompletion() {
        const report = new SubtaskReport();
        return this.getCompletionRecursive(report);
    }

    /**
     * 
     * @param {SubtaskReport} report 
     */
    getCompletionRecursive(report) {
        for (const childNode of this.getChildren())
        {
            if (childNode.getStatus() == Status.COMPLETED)
                report.completed++;
            report.count++;

            if (childNode.hasChildren())
                childNode.getCompletionRecursive(report);
        }

        return report;
    }

    // /** @return {string[]} */
    // getCachedTagsFromParentStructure() {
    //     return TasksHierarchy.prototype.getSavedTags.call(this.nodeTree);
    // }
}

class SubtaskReport {
    constructor() {
        this.count = 0;
        this.completed = 0;
    }

    toString() {
        return `${this.completed} / ${this.count}`;
    }
}

const Status = {
    NOT_STARTED: 0,
    IN_PROGRESS: 1,
    COMPLETED: 2
}

const StatusName = {
    0: "Not Started",
    1: "In Progress",
    2: "Completed"
}