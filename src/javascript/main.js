///<reference path="core.js"/>
///<reference path="state.js"/>
///<reference path="prefab.js"/>

const completedTaskContainer = document.getElementById("completed-task-container");
const inProgressTaskContainer = document.getElementById("in-progress-task-container");
const notStartedTaskContainer = document.getElementById("not-started-task-container");

const activeProject = new Project();

function taskBuilderToContainer(container) {
    return new StatefulCollectionBuilder({
        onAppend: (widget, state) => {
            if (!state.isRootLevelNode())
            return;
        
            container.append(widget);
        },
        builder: buildTaskCard
    });
}

/** 
 * @typedef {StatefulDistributor<Task>} TaskBuilder
 * @type {TaskBuilder} 
 * */
const taskDistributorBuilder = new StatefulDistributor({
    "completed": taskBuilderToContainer(completedTaskContainer),
    "in-progress": taskBuilderToContainer(inProgressTaskContainer),
    "not-started": taskBuilderToContainer(notStartedTaskContainer)
}, (id, state) => {
    switch(state.getStatus())
    {
        case Status.NOT_STARTED:
            return "not-started";

        case Status.IN_PROGRESS:
            return "in-progress";

        case Status.COMPLETED:
            return "completed";
    }
})

/**
 * @typedef {StateNotifier<Task>} TaskNotifier
 * @type {TaskNotifier} 
 */
const taskStateNotifier = new StateNotifier();

function init() {
    taskStateNotifier.addBuilder(taskDistributorBuilder);

    // create example data
    const exampleTask = new Task("Example Task", "Lorem ipsum dolor sit amet consectetur adipisicing elit. Placeat totam, a hic laboriosam debitis impedit itaque est eaque ducimus sed rerum aliquam eius, ab perferendis?", Date.now(), Date.now() + (1000 * 60 * 60 * 24));
    activeProject.tasksHierarchy.addRootLevelNode(exampleTask);
    const newTag = activeProject.tasksHierarchy.createTag("Test Tag", "#ff55AA");
    exampleTask.addTag(newTag.id);
    
    const nestedTask = new Task("Nested Task", "This is a test for nesting tasks", Date.now(), Date.now());
    exampleTask.addChildNode(nestedTask);

    taskStateNotifier.setState(exampleTask.getId(), exampleTask);
    // taskStatefulBuilder.appendItem(exampleTask.getId(), exampleTask);
}

const StatusClassMap = {
    0: "status-not-started",
    1: "status-progress",
    2: "status-completed" 
} 

/**
 * 
 * @param {Task} task 
 */
function buildTaskCard(task) {
    const taskCard = fetchPrefab("task-card-prefab");

    taskCard.setVariableContent("name", task.getName());
    taskCard.setVariableContent("description", task.getDescription());
    taskCard.setVariableContent("deadline", `${getDateString(task.getEndDate())}`);

    if (task.getChildren().length == 0)
        taskCard.getVariable("progress-indicator").remove();
    
    const statusDisplay = taskCard.getVariable("status");
    statusDisplay.innerHTML = StatusName[task.getStatus()];
    statusDisplay.classList.add(StatusClassMap[task.getStatus()]);

    const tagContainer = taskCard.getVariable("tags");
    task.getTags().forEach((tag) => tagContainer.appendChild(renderTag(tag)));

    const taskElement = taskCard.getElement();
    taskElement.addEventListener("click", () => showModal(new TaskViewModal(task)));

    return taskElement;
}

/**
 * 
 * @param {Tag} tag 
 * @returns 
 */
function renderTag(tag) {
    const elem = document.createElement("div");
    elem.classList.add("task-tag");
    elem.innerHTML = tag.text;
    elem.setAttribute("style", `background: ${tag.color};`);
    return elem;
}

function modalTest() {
    const modalBuilder = fetchPrefab("test-modal");
    modalBuilder.setVariableContent("title", "Test Title");
    modalBuilder.setVariableContent("description", "This modal is a test of the modal prefab system");
    modalBuilder.setVariableClickListener("do-something-btn", () => {
        const descriptionText = modalBuilder.getVariable("description");
        if (!descriptionText)
            return;

        descriptionText.innerHTML += "<br>You did something!"
    });
    
    const modal = new StaticModal(modalBuilder.getElement());
    showModal(modal);
}


function createTaskClicked() {
    showModal(new CreateTaskModal((task) => 
    {
        activeProject.tasksHierarchy.addRootLevelNode(task);
        taskDistributorBuilder.setItem(task.getId(), task);
        
        popHighestModal();
    }));
}

class TaskViewModal extends Modal {
    /** @type {Task} */
    task;

    /** @type {StatefulCollectionBuilder<Tag>} */
    tagBuilder;
    /** @type {StatefulCollectionBuilder<Task>} */
    nestedTasksBuilder;


    constructor(task) {
        super();
        this.task = task;
    }

    build() {
        const modalBuilder = fetchPrefab("task-view-modal");

        modalBuilder.setVariableContent("title", this.task.getName());
        modalBuilder.setVariableContent("description", this.task.getDescription());
        modalBuilder.setVariableContent("date-display", `${getDateString(this.task.getStartDate())}  -  ${getDateString(this.task.getEndDate())}`);

        const statusSelectBox = modalBuilder.getVariable("status-select");
        statusSelectBox.setAttribute("selected", `${this.task.getStatus()}`);

        const selectOption = statusSelectBox.querySelector(`option[value="${this.task.getStatus()}"]`);
        selectOption.setAttribute("selected", "");
        
        statusSelectBox.onchange = (event) => {
            const status = parseInt(statusSelectBox.value);
            this.task.setStatus(status);
            statusSelectBox.setAttribute("selected", `${status}`);
            taskStateNotifier.setState(this.task.getId(), this.task);
        }
    
        const tagContainer = modalBuilder.getVariable("tag-container");
        this.tagBuilder = new StatefulCollectionBuilder({
            builder: renderTag,
            onAppend: (widget, state) => {
                tagContainer.appendChild(widget);
            }
        });
    
        this.task.getTags().forEach((tag) => this.tagBuilder.appendItem(tag.id, tag));
    
        // bind edit tag button
        modalBuilder.setVariableClickListener("add-tag-btn", () => {
            showModal(new TagEditModal(this.task, (tagId, state) => 
            {
                this.tagBuilder.setItem(tagId, state);
                taskStateNotifier.setState(this.task.getId(), this.task);
            }))
        });
    
        // nested tasks
        const nestedTasksContainer = modalBuilder.getVariable("tasks-container");
    
        /**
         * @typedef {StatefulCollectionBuilder<Task>} TaskBuilder
         * @type {TaskBuilder}
         */
        this.nestedTasksBuilder = new StatefulCollectionBuilder({
            builder: buildTaskCard,
            onAppend: (widget, state) => {
                if (state.getParent() != this.task)
                    return;

                nestedTasksContainer.appendChild(widget);
            }
        });

        taskStateNotifier.addBuilder(this.nestedTasksBuilder);
    
        // bind add task button
        modalBuilder.setVariableClickListener("add-task", () => showModal(new CreateTaskModal((task) => 
        {
            this.task.addChildNode(task);
            this.nestedTasksBuilder.appendItem(task.getId(), task);
            taskStateNotifier.setState(this.task.getId(), this.task);

            popHighestModal();
        }))); 
    
        this.task.getChildren().forEach((child) => {
            this.nestedTasksBuilder.appendItem(child.getId(), child);
        })

        return modalBuilder.getElement();
    }

    onClose() {
        taskStateNotifier.removeBuilder(this.nestedTasksBuilder);
    }
}

class CreateTaskModal extends Modal {

    /** @typedef {(task: Task) => void} CreateCallback */
     /** @type  {CreateCallback} */
    onCreateCallback;

    /** @param {CreateCallback} onCreate */
    constructor(onCreate) {
        super();
        this.onCreateCallback = onCreate;
    }

    build() {
        const createTaskModalBuilder = fetchPrefab("create-task-modal");
        createTaskModalBuilder.setVariableClickListener("create-btn", (event) => 
        {
            const task = this.createTask();
            if (!task)
                return;

            this.onCreateCallback(task);
        });

        return createTaskModalBuilder.getElement();
    }

    /**
     * @param {*} sourceModal 
     * @returns {Task}
     */
    createTask() {
        const name = this.element.getElementsByClassName("task-name-input")[0].value;
        const description = this.element.getElementsByClassName("task-description-input")[0].value;
        const startDate = this.element.getElementsByClassName("task-startdate-input")[0].valueAsNumber;
        const endDate = this.element.getElementsByClassName("task-enddate-input")[0].valueAsNumber;

        // TODO: improve feedback in the future
        if (isNaN(startDate) || isNaN(endDate))
            return null;

        const task = new Task(name, description, startDate, endDate);
        return task;
    }
}

class TagEditModal extends Modal {

    /** @type {Task} */
    task;
    /** @typedef {(tagId: string, state: Tag) => void} ChangeCallback */
    /** @type {ChangeCallback} */
    onUpdate;

    /**
     * 
     * @param {Task} task 
     * @param {ChangeCallback} onUpdate 
     */
    constructor(task, onUpdate) {
        super();
        this.task = task;
        this.onUpdate = onUpdate;
    }

    build() {
        const tagSelectModalBuilder = fetchPrefab("tag-select-modal");
        const tagContainer = tagSelectModalBuilder.getVariable("tag-container");

        activeProject.tasksHierarchy.getSavedTags()
        .map((tag) => {
            const tagElement = renderTag(tag);
            tagElement.onclick = () => {
                this.toggleTag(tag);
                popHighestModal();
            }

            return tagElement;
        })
        .forEach((element) => {
            tagContainer.appendChild(element);
        });
        

        tagSelectModalBuilder.setVariableClickListener("tag-submit-btn", () => {
            const tagText = tagSelectModalBuilder.getVariable("tag-text-field").value;
            const tagColour = tagSelectModalBuilder.getVariable("tag-colour-field").value;

            const createdTag = activeProject.tasksHierarchy.createTag(tagText, tagColour);
            this.toggleTag(createdTag);

            popHighestModal();
        });

        return tagSelectModalBuilder.getElement();
    }

    toggleTag(tag) {
        const hasTag = this.task.hasTag(tag.id);

        if (hasTag) {
            this.task.removeTag(tag.id);
            this.onUpdate(tag.id, null);
        }
        else {
            this.task.addTag(tag.id);
            this.onUpdate(tag.id, tag);
        }
    }

    onClose() {

    }
}

/**
 * 
 * @param {Date} date 
 */
function getDateString(date) {
    return `${date.getDate().toString().padStart(2, "0")}-${(date.getMonth() + 1).toString().padStart(2, "0")}-${date.getFullYear().toString()}`;
}

function dateButtonOverride(event, target) {
    event.preventDefault();
    target.showPicker();
}

init();