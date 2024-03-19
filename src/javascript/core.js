class Project {
    /** @type {string} */
    id;
    /** @type {string} */
    name;
    /** @type {TasksHierarchy} */
    tasksHierarchy;
    /** @type {NotesHierarchy} */
    notesHierarchy;
    /** @type {ManyToManyNodeRelationship<TasksHierarchy, NotesHierarchy>} */
    taskNoteRelationship;

    constructor(id, name, tasks, notes, taskNoteRelationship) {
        this.id = id;
        this.name = name;
        this.tasksHierarchy = tasks;
        this.notesHierarchy = notes;
        this.taskNoteRelationship = taskNoteRelationship;
    }

    static new(name) {
        return new Project(
            Date.now(), // TODO: add better id assigner
            name,
            TasksHierarchy.createNew(), 
            NotesHierarchy.createNew(),
            ManyToManyNodeRelationship.createNew()
        );
    }

    /**
     * @returns {string}
     */
    serialise() {
        const obj = {
            "id": this.id,
            "name": this.name,
            "tasks": this.tasksHierarchy.toSerialisableStructure(),
            "notes": this.notesHierarchy.toSerialisableStructure(),
            "task_note_relationships": this.taskNoteRelationship.toSerialisableStructure()
        }

        return JSON.stringify(obj, null, 2);
    }

    /**
     * @param {string} jsonString
     * @returns {Project}
     */
    static deserialise(jsonString) {
        const obj = JSON.parse(jsonString);

        const id = obj["id"];
        if (!id)
            throw Error("project id not found");

        const name = obj["name"] ?? "(name not found)";
        const tasksHierarchy = new TasksHierarchy(obj["tasks"] ?? {});
        const notesHierarchy = new NotesHierarchy(obj["notes"] ?? {});
        const taskNoteRelationship = new ManyToManyNodeRelationship(obj["task_note_relationships"] ?? {});

        return new Project(id, name, tasksHierarchy, notesHierarchy, taskNoteRelationship);
    }

    // first relation = task
    // second relation = note

    getRelatedNotesForTask(taskId) {
        return this.taskNoteRelationship.getRelationsForFirst(taskId).map((id) => this.notesHierarchy.getNode(id)).filter(note => note);
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

    deleteNode(id) {
        this.nodeMap.delete(id);

        // remove from root level nodes
        const rootIndex = this.rootNodes.indexOf(id);
        if (rootIndex != -1)
            this.rootNodes.splice(rootIndex, 1);
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
            if (!node)
                continue;

            node.traverseChildNodes(callback);
        }
    }

    getAllNodes() {
        return Array.from(this.nodeMap.values());
    }

    nodeCount() {
        return this.nodeMap.size;
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

    hasParent() {
        return this.parent != null && this.parent != "";
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

    deleteRecursive() {
        for (const child of this.getChildren())
        {
            child.deleteRecursive();
        }
        
        if (this.parent)
            this.getParent().removeChildNode(this);

        this.nodeTree.deleteNode(this.id);
    }

    getChildren() {
        return this.children.map((child) => this.nodeTree.getNode(child));
    }

    getChildIds() {
        return this.children;
    }

    getDescendantIds(set = new Set()) {
        for (const childId of this.children)
        {
            set.add(childId);

            const node = this.nodeTree.getNode(childId);
            if (node)
                node.getDescendantIds(set);
        }

        
        return set;
    }

    getTree() {
        return this.nodeTree;
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

    getChildNode(childId) {
        if (!this.children.includes(childId))
            return null;

        return this.nodeTree.getNode(childId);
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
     * @param {(id: string, node: TreeNode) => void} callback 
     */
    traverseChildNodes(callback) {
        callback(this.getId(), this);
        
        for (const child of this.getChildren())
            child.traverseChildNodes(callback);
    }

    isSiblingNode(id) {
        if (id == this.id)
            return false;

        return this.getParent().getChildren().includes(id);
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

        return index.toString();
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

     /**
      * 
      * @param {string} tagId 
      * @param {(task: Task) => void} removeCallback 
      * @returns 
      */
     deleteTag(tagId, removeCallback) {
        if (!this.tagRepo.has(tagId))
            return;

        this.tagRepo.delete(tagId);

        // remove that tag from every node
        this.forEachNode((id, node) => {
            if (node.hasTag(tagId)) {
                node.removeTag(tagId);

                if (removeCallback)
                    removeCallback(node);
            }
        });
     }

     /**
      * @param {number} dateLow 
      * @param {number} dateHigh 
      */
     /// As this is only a simple app, i am going to use a linear O(N) apparoch where I iterate over each task and compare it.
     /// This approach should be sufficient as won't be working with a ton of data and this method won't get called that often.
     /// In a more professional context I might consider setting up an index system to index each task by their start and end date,
     /// this would scale better with more tasks as it would allow me to lookup tasks by date with O(logN) complexity. 
     getTasksInDateRange(dateLow, dateHigh) {
        const matchingTasks = [];

        this.forEachNode((id, /** @type {Task}*/ task) => {
            if (task.isInDateRange(dateLow, dateHigh))
                matchingTasks.push(task);
        });

        return matchingTasks;
     }
}

class Tag {
    /** @type {string} */
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
    /** @typedef {{name: string, description: string, start_date: number, end_date: number, tags: string[], status_code: number, started_at: number, completed_at: number}} TaskData */

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
     * @type {string[]}
     * @private */
    tags;

    /** @type {number} 
     * @private */
    status;

    /** @type {number}
     * @private */
    startedAt;
    
    /** @type {number}
     * @private */
    completedAt;

    /**
     * @param {TaskData} data 
     */
    constructor(data, tree) {
        super(data, tree);
        this.name = data.name;
        this.description = data.description;
        this.startDate = data.start_date;
        this.endDate = data.end_date;

        this.startedAt = data.started_at;
        this.completedAt = data.completed_at;
        
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
        nodeJSON["started_at"] = this.startedAt;
        nodeJSON["completed_at"] = this.completedAt;

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

    getStartDateRaw() {
        return this.startDate;
    }

    getEndDateRaw() {
        return this.endDate;
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

    getStatusDetails() {
        // get start / completion time based of current status
        const timestamp = (() => {
            switch(this.status) {
                case Status.COMPLETED:
                    return this.completedAt;
                case Status.IN_PROGRESS:
                    return this.startedAt;
                default: 
                    return null;
            }
        })();

        return {
            status: this.status,
            timestamp: timestamp
        }
    }

    setStatus(status) {
        this.status = status;

        switch(status) {
            case Status.COMPLETED:
                this.completedAt = Date.now();
                break;

            case Status.IN_PROGRESS:
                this.startedAt = Date.now();
                break;
        }
    }

    getStartedAt() {
        return this.startedAt;
    }

    getCompletedAt() {
        return this.completedAt;
    }

    resetCompletion() {
        this.startedAt = undefined;
        this.completedAt = undefined;
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

    isInDateRange(dateLow, dateHigh) {
        const taskStart = this.startDate;
        const taskEnd = this.endDate;

        // console.log(`${dateLow} - ${dateHigh}, ${taskStart} : ${taskEnd}`);

        // check if either start or end is in bounds
        return ( taskStart >= dateLow && taskStart <= dateHigh ) || ( taskEnd >= dateLow && taskEnd <= dateHigh ) || ( taskStart <= dateLow && taskEnd >= dateHigh );
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

const StatusNameShort = {
    0: "N",
    1: "P",
    2: "C"
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

    toggleRelationship(firstId, secondId) {
        if (this.isRelated(firstId, secondId))
            this.removeRelationship(firstId, secondId);
        else
            this.addRelationship(firstId, secondId);
    }

    addRelationship(firstId, secondId) {
        this.addToRelations(this.relations_F, firstId, secondId);
        this.addToRelations(this.relations_S, secondId, firstId);
    }

    removeRelationship(firstId, secondId) {
        this.removeFromRelations(this.relations_F, firstId, secondId);
        this.removeFromRelations(this.relations_S, secondId, firstId);
    }

    /**
     * 
     * @param {Map<string, string[]>} relationsMap 
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

    /**
     * 
     * @param {Map<string, string[]?} relationsMap 
     * @param {string} targetId 
     * @param {string} newId 
     * @returns 
     */
    removeFromRelations(relationsMap, targetId, newId) {
        if (!relationsMap.has(targetId))
            return;

        const relationList = relationsMap.get(targetId);
        const itemIndex = relationList.indexOf(newId);

        if (itemIndex == -1)
            return;

        relationList.splice(itemIndex, 1);

        if (relationList.length == 0)
            relationsMap.delete(targetId);
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

class _TaskDatePair {
    /** @type {Task} */
    task;
    /** @type {number} */
    date;

    constructor(task, date) {
        this.task = task;
        this.date = date;
    }
}

class ProgressTrackerData {
    /** @type {number} */
    lowerDateBounds;
    /** @type {number} */
    upperDateBounds;

    /** @type {_TaskDatePair[]} */
    progressStartedIndecies;
    /** @type {_TaskDatePair[]} */
    completionIndecies;
    /** @type {Map<string, _TaskProgressRef>} */
    taskRefs;

    /** @type {Project} */
    projectContext;

    /** @typedef {(task: Task) => void} UpdateCallback */
    /** @type {UpdateCallback[]} */
    updateCallbacks;

    /**
     * @param {number} lowerBounds 
     * @param {number} upperBounds
     * @param {Project} projectContext
     */
    constructor(lowerBounds, upperBounds, projectContext) {
        this.progressStartedIndecies = [];
        this.completionIndecies = [];
        this.taskRefs = new Map();

        this.lowerDateBounds = lowerBounds;
        this.upperDateBounds = upperBounds;

        this.projectContext = projectContext;
        this.updateCallbacks = [];
    }

    /**
     * @param {UpdateCallback} callback 
     */
    addUpdateCallback(callback) {
        this.updateCallbacks.push(callback);
    }

    /**
     * @param {Task} task 
     */
    trackTaskChange(task) {
        if (!task)
            return;

        const progressRef = this.taskRefs.get(task.getId()) ?? 
        // create new task ref
        (() => {
            if (!task.getStartedAt() && !task.getCompletedAt())
                return null;

            const newTaskRef = new _TaskProgressRef();
            this.taskRefs.set(task.getId(), newTaskRef);

            return newTaskRef;
        })();

        if (!progressRef)
            return;

        let changeMade = false;

        // reindex for started date
        if (task.getStartedAt()) {
            const {ref, didChange} = this._reindexTask(this.progressStartedIndecies, task, task.getStartedAt(), progressRef.startedDateRef);
            progressRef.startedDateRef = ref;
            changeMade = changeMade || didChange;
        }
        
        // reindex for completion date
        if (task.getCompletedAt()) {
            const {ref, didChange} = this._reindexTask(this.completionIndecies, task, task.getCompletedAt(), progressRef.completedDateRef);
            progressRef.completedDateRef = ref;
            changeMade = changeMade || didChange;
        }

        if (changeMade)
            this.updateCallbacks.forEach((callback) => callback(task));
    }

    removeTrackedTaskData(taskId) {
        const taskRef = this.taskRefs.get(taskId);
        if (!taskRef)
            return;

        if (taskRef.startedDateRef)
            this.progressStartedIndecies.splice(this.progressStartedIndecies.indexOf(taskRef.startedDateRef), 1);

        if (taskRef.completedDateRef)
            this.completionIndecies.splice(this.completionIndecies.indexOf(taskRef.completedDateRef), 1);

        this.updateCallbacks.forEach((callback) => callback(null));
    }

    getTaskProgressInDateRange(lowerDate, upperDate) {
        // console.log(`${new Date(lowerDate)} --- ${new Date(upperDate)}`);

        return {
            "started": this._getItemsInDateRange(this.progressStartedIndecies, lowerDate, upperDate).map(e => e.task),
            "completed": this._getItemsInDateRange(this.completionIndecies, lowerDate, upperDate).map(e => e.task)
        }
    }

    /**
     * 
     * @param {_TaskDatePair[]} list 
     * @param {number} lowerDate 
     * @param {number} upperDate 
     */
    _getItemsInDateRange(list, lowerDate, upperDate) {
        // find lower bound
        const beginIndex = this._binarySearch(list, lowerDate, true);
        let rangeLength = 0;
        let finished = false;

        if (beginIndex == list.length)
            return [];

        // increment until out of upper bound range
        while (!finished)
        {
            if (list[beginIndex + rangeLength].date <= upperDate)
                rangeLength++;
            else
                finished = true;

            if (beginIndex + rangeLength >= list.length) 
                break;
        }

        return list.slice(beginIndex, beginIndex + rangeLength);
    }
 
    /**
     * 
     * @param {_TaskDatePair[]} indexList
     * @param {Task} task
     * @param {number} date
     * @param {_TaskDatePair} existingRef
     * @returns {{ref: _TaskDatePair, didChange: boolean}}
     */
    _reindexTask(indexList, task, date, existingRef) {
        if (existingRef) {
            const refIndex = indexList.indexOf(existingRef);
            console.log(refIndex);

            // check whether existing index is correct
            if (
                (this._boundSafeIndex(indexList, refIndex - 1).date <= date) && 
                (date <= this._boundSafeIndex(indexList, refIndex + 1).date)
            )
            {
                return {ref: existingRef, didChange: false}
            }

            // remove existing value
            indexList.splice(refIndex, 1);
        }

        if (date < this.lowerDateBounds || date > this.upperDateBounds)
            return {ref: undefined, didChange: false};
        

        // reinsert item to correct index
        const index = this._binarySearch(indexList, date, true);
        const taskDatePair = new _TaskDatePair(task, date);
        indexList.splice(index, 0, taskDatePair);

        // console.log(`got insertion index: ${index}`);

        return {ref: taskDatePair, didChange: true};
    }

    /**
     * @param {_TaskDatePair[]} list
     * @param {number} date
     * @param {boolean} insertion 
     * @returns {number}
     */
    _binarySearch(list, date, insertion)  {
        let found = false;
        let top = list.length - 1;
        let bottom = 0;
        let middle;
        let itrCount = 0;

        
        if (list.length == 0)
            return 0;
        
        while (!found && top > bottom)
        {
            // protection from infinite loop
            if (itrCount > list.length)
                throw Error("Binary search isn't working");

            middle = Math.floor((top + bottom) / 2);
            const currentItem = list[middle];

            // if value is found
            if (currentItem.date == date)
                found = true;

            // check right
            if (currentItem.date < date) {
                bottom = middle + 1
            }

            // check left
            if (currentItem.date > date) {
                top = middle;
            }

            itrCount++;
        }

        if (found)
            return middle;

        if (insertion) {
            const finalIndex = bottom ?? 0;

            // console.log(`date to be inserted: ${date}, compared to: ${list[middle]}`);
            return date > list[finalIndex].date
                ? finalIndex + 1
                : finalIndex;
        }

        return null;
    }

    /** @template T
     * @param {T[]} list
     * @returns T 
     */
    _boundSafeIndex(list, index) {
        if (index < 0)
            return list[0];
        else if (index >= list.length)
            return list[list.length - 1];
        else
            return list[index];
    }
}

class _TaskProgressRef {
    /** @type {_TaskDatePair} */
    startedDateRef;
    /** @type {_TaskDatePair} */
    completedDateRef;
}