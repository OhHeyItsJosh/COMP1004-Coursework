class Project {
    /** @type {TasksHierarchy} */
    tasksHierarchy;
    /** @type {NotesHierarchy} */
    notesHierarchy;
    /** @type {ManyToManyNodeRelationship<TasksHierarchy, NotesHierarchy>} */
    taskNoteRelationship;

    constructor(tasks, notes, taskNoteRelationship) {
        this.tasksHierarchy = tasks;
        this.notesHierarchy = notes;

        if (taskNoteRelationship)
            this.taskNoteRelationship = taskNoteRelationship;
        else
            this.taskNoteRelationship = ManyToManyNodeRelationship.createNew(this.tasksHierarchy, this.notesHierarchy);
    }

    static new() {
        return new Project(
            TasksHierarchy.createNew(), 
            NotesHierarchy.createNew(),
            null
        );
    }

    /**
     * @returns {string}
     */
    serialise() {
        const obj = {
            "tasks": this.tasksHierarchy.toSerialisableStructure(),
            "notes": this.notesHierarchy.toSerialisableStructure()
        }

        return JSON.stringify(obj, null, 2);
    }

    /**
     * @param {string} jsonString
     * @returns {Project}
     */
    static deserialise(jsonString) {
        const obj = JSON.parse(jsonString);
        const tasksHierarchy = new TasksHierarchy(obj["tasks"] ?? {});
        const notesHierarchy = new NotesHierarchy(obj["notes"] ?? {});

        return new Project(tasksHierarchy, notesHierarchy);
    }

    // first relation = task
    // second relation = note

    getRelatedNotesForTask(taskId) {
        return this.taskNoteRelationship.getRelationsForFirst(taskId).map((id) => this.notesHierarchy.getNode(id));
    }

    getRelatedTasksForNote(noteId) {
        return this.taskNoteRelationship.getRelationsForSecond(noteId).map((id) => this.tasksHierarchy.getNode(id));
    }
}

class NodeHierarchyTree {
    /** @typedef {{nodes: Map<string, Object>, root_nodes: string[]}} TreeHierarchyData */

    /** @type {Map<string, TreeNode>} */
    nodeMap;
    /** @type {string[]} */
    rootNodes;

    /**
     * @param {TreeHierarchyData} data 
     */
    constructor(data) {
        this.nodeMap = new Map();
        
        this.addNodeData(data.nodes ?? {});
        this.rootNodes = (data.root_nodes ?? []).map((id) => id.toString());
    }

    static newData() {
        return {
            nodes: {},
            root_nodes: []
        };
    }

    toSerialisableStructure() {
        const nodesObject = {};
        for (const [key, node] of this.nodeMap.entries())
        {
            nodesObject[key] = node.toSerialisableStructure();
        }

        return {
            "nodes": nodesObject,
            "root_nodes": this.rootNodes 
        }
    }

    /**
     * 
     * @param {Object} object
     * @returns {TreeNode} 
     */
    nodeBuilder(object) {
        return new TreeNode(object, this);
    }

    /**
     * 
     * @param {Object[]} nodeData 
     */
    addNodeData(nodeData) {
        for (const [id, data] of Object.entries(nodeData))
        {
            const node = this.nodeBuilder(data);
            this.nodeMap.set(id, node);
        }
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

    /**
     * 
     * @param {(id: string, node: TreeNode)} callback 
     */
    forEachNode(callback) {
        // for (const [id, node] of this.nodeMap.entries())
        //     callback(id, node);
        for (const rootNodeId of this.rootNodes)
        {
            const node = this.nodeMap.get(rootNodeId);
            node.traverseChildNodes(callback);
        }
    }
}

class TreeNode {
    /** @typedef {{id: string, children_ids: string[], parent_id: string}} NodeData */

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

    /**
     * @param {NodeData} data
     * @param {NodeHierarchyTree} tree 
     */
    constructor(data, tree) {
        this.id = data.id.toString();
        this.nodeTree = tree;
        this.children = data.children_ids.map((id) => id.toString());
        this.parent = (data.parent_id ?? "").toString();
    }

    static createNew() {
        return new TreeNode(TreeNode.newData(), null);
    }

    /** @protected */
    static newData() {
        return {
            id: Math.floor(Math.random() * 1000000).toString(), // temporary, switch to better id assigner later on,
            children_ids: [],
            parent_id: null
        };
    }

    toSerialisableStructure() {
        return {
            "id": this.id,
            "children_ids": this.children,
            "parent_id": this.parent
        }
    }

    getId() {
        return this.id;
    }

    getParent() {
        return this.nodeTree.getNode(this.parent);
    }

    getParentId() {
        return this.parent;
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

    getChildAtIndex(index) {
        const childId = this.children[index];
        if (!childId)
            return null;

        return this.nodeTree.getNode(childId);
    }

    childCount() {
        return this.children.length;
    }

    indexOfChild(childId) {
        return this.children.indexOf(childId);
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

    getParentCount() {
        let count = 0;
        this.forEachParent((id, _) => count++);

        return count;
    }

    /**
     * 
     * @param {(id: string, note: TreeNode) => void} callback 
     */
    traverseChildNodes(callback) {
        callback(this.getId(), this);
        
        for (const child of this.getChildren())
            child.traverseChildNodes(callback);
    }
}

class TasksHierarchy extends NodeHierarchyTree {
    /** @type {Map<string, Tag>} @private */
    tagRepo;

    constructor(data) {
        super(data);
        this.tagRepo = new Map(Object.entries(data.tags));
     }

     /** @override */
     static createNew() {
        const data = super.newData();
        data.tags = new Map();

        return new TasksHierarchy(data);
     }

     /** @override */
     nodeBuilder(object) {
        return new Task(object, this);
     }

     toSerialisableStructure() {
        const treeJSON = super.toSerialisableStructure();
        treeJSON["tags"] = Object.fromEntries(this.tagRepo.entries());

        return treeJSON;
     }

     getSavedTags() {
        return Array.from(this.tagRepo.values());
     }

     getTag(id) {
        return this.tagRepo.get(id.toString());
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
        this.tagRepo.set(tag.id.toString(), tag);

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
    /** @typedef {{name: string, description: string, start_date: number, end_date: number, tags: string[], status_code: number}} TaskData */

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
     * @param {TaskData} data 
     */
    constructor(data, tree) {
        super(data, tree);
        this.name = data.name;
        this.description = data.description;
        this.startDate = data.start_date;
        this.endDate = data.end_date;
        
        this.tags = data.tags ?? [];
        this.status = data.status_code ?? Status.NOT_STARTED;
    }

    /**
     * @param {string}  name 
     * @param {string} description
     * @param {number} startDate 
     * @param {number} endDate 
     */
    static createNew(name, description, startDate, endDate) {
        const nodeData = TreeNode.newData();
        nodeData["name"] = name;
        nodeData["description"] = description;
        nodeData["start_date"] = startDate;
        nodeData["end_date"] = endDate;

        return new Task(nodeData, null);
    }

    toSerialisableStructure() {
        const nodeJSON = super.toSerialisableStructure();
        nodeJSON["name"] = this.name;
        nodeJSON["description"] = this.description;
        nodeJSON["start_date"] = this.startDate;
        nodeJSON["end_date"] = this.endDate;
        nodeJSON["tags"] = this.tags;
        nodeJSON["status_code"] = this.status;

        return nodeJSON;
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

class NotesHierarchy extends NodeHierarchyTree {
    
    constructor(data) {
        super(data);
    }

    static createNew() {
        return new NotesHierarchy(super.newData());
    }

    nodeBuilder(object) {
        return new Note(object, this);
    }
}

class Note extends TreeNode {
    /** @type {string}
     * @private */
    name;
    /** @type {string} 
     * @private */
    content;
    
    constructor(data, tree) {
        super(data, tree);
        this.name = data["name"];
        this.content = data["content"];
    }

    static createNew(name, content) {
        const nodeData = super.newData();
        nodeData["name"] = name;
        nodeData["content"] = content;

        return new Note(nodeData);
    }

    toSerialisableStructure() {
        const nodeJSON = super.toSerialisableStructure();
        nodeJSON["name"] = this.name;
        nodeJSON["content"] = this.content;

        return nodeJSON;
    }

    getName() {
        return this.name;
    }

    setName(name) {
        this.name = name;
    }

    getContent() {
        return this.content;
    }

    setContent(content) {
        this.content = content;
    }
}

/** 
 * @template F
 * @template S
 */
class ManyToManyNodeRelationship {
    /** @type {NodeHierarchyTree} */
    struct_F;
    /** @type {NodeHierarchyTree} */
    struct_S;

    /**
     * 
     * @param {NodeHierarchyTree} first 
     * @param {NodeHierarchyTree} second 
     */
    constructor(data) {
        this.relations_F = new Map(Object.entries(data["relations_f"] ?? {}));
        this.relations_S = new Map(Object.entries(data["relations_s"] ?? {}));
    }

    static createNew() {
        return new ManyToManyNodeRelationship({});
    }

    toSerialisableStructure() {
        return {
            "relations_f": Object.fromEntries(this.relations_F.entries()),
            "relations_s": Object.fromEntries(this.relations_S.entries())           
        }
    }

    addRelationship(firstId, secondId) {
        this.addToRelations(this.relations_F, firstId, secondId);
        this.addToRelations(this.relations_S, secondId, firstId);
    }

    /**
     * 
     * @param {Map<string, string[]>} relations 
     * @param {string} targetId 
     * @param {string} newId 
     */
    addToRelations(relationsMap, targetId, newId) {
        // add to relations map if not included
        if (relationsMap.has(targetId)) {
            const relationList = relationsMap.get(targetId);
            if (relationList.includes(newId))
                return;

            relationList.push(newId);
        }
        // create new entry in relations map
        else {
            relationsMap.set(targetId, [newId]);
        }
    }

    containsRelation(relationsMap, targetId, compareId) {
        const relationList = relationsMap.get(targetId);
        if (!relationList)
            return false;

        if (relationList.includes(compareId))
            return true;
        else
            return false;
    }

    /** @return {string[]} */
    getRelationsForFirst(firstId) {
        return (this.relations_F.get(firstId) ?? []);
    }

    /** @return {string[]} */
    getRelationsForSecond(secondId) {
        return (this.relations_S.get(secondId) ?? []);
    }

    isRelated(firstId, secondId) {
        return (this.containsRelation(this.relations_F, firstId, secondId) || this.containsRelation(this.relations_S, secondId, firstId));
    }
}