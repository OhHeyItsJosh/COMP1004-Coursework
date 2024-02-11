///<reference path="../core.js"/>
///<reference path="../state.js"/>
///<reference path="../prefab.js"/>

const completedTaskContainer = document.getElementById("completed-task-container");
const inProgressTaskContainer = document.getElementById("in-progress-task-container");
const notStartedTaskContainer = document.getElementById("not-started-task-container");

/**
 * @typedef {StateNotifier<Task>} TaskNotifier
 * @type {TaskNotifier} 
 */
const taskStateNotifier = new StateNotifier();

function taskBuilderToContainer(container, inverseSort) {
    return new StatefulCollectionBuilder({
        parent: container,
        shouldAppend: (widget, state) => {
            if (!state.isRootLevelNode())
                return false;
            return true;
        },
        sorter: (ids) => {
            return ids.sort((a, b) => {
                const a_node = activeProject.tasksHierarchy.getNode(a);
                const b_node = activeProject.tasksHierarchy.getNode(b);

                if (inverseSort)
                    return b_node.getEndDate() - a_node.getEndDate();
                else
                    return a_node.getEndDate() - b_node.getEndDate();
            });
        },
        builder: buildTaskCard
    });
}

/** 
 * @typedef {StatefulDistributor<Task>} TaskBuilder
 * @type {TaskBuilder} 
 * */
const taskDistributorBuilder = new StatefulDistributor({
    "completed": taskBuilderToContainer(completedTaskContainer, true),
    "in-progress": taskBuilderToContainer(inProgressTaskContainer, false),
    "not-started": taskBuilderToContainer(notStartedTaskContainer, false)
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

const StatusClassMap = {
    0: "status-not-started",
    1: "status-progress",
    2: "status-completed" 
} 

/**
 * 
 * @param {Task} task 
 * @returns {HTMLElement}
 */
function buildTaskCard(task) {
    const taskCard = fetchPrefab("task-card-prefab");

    taskCard.setVariableContent("name", task.getName());

    const descriptionLength = 100;
    let description = task.getDescription().substring(0, 100);
    if (description.length == descriptionLength)
        description += "...";

    taskCard.setVariableContent("description", description);
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

    // progress indicator
    const completion = task.getSubtaskCompletion();
    const {progressCircumference, progressIndicator} = buildProgressIndicator(80, 10);

    progressIndicator.setAttribute("stroke-dashoffset", completionToOffset(completion, progressCircumference));
    taskCard.getVariable("progress-indicator").appendChild(progressIndicator);
    taskCard.setVariableContent("progress-label", completion.toString());

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

function createTaskClicked() {
    showModal(new CreateTaskModal((task) => 
    {
        activeProject.tasksHierarchy.addRootLevelNode(task);
        taskDistributorBuilder.setItem(task.getId(), task, { resort: true });
        
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
    /** @type {StatefulCollectionBuilder<Note>} */
    relatedNotesBuilder;
    /** @type {StatefulListener<Task>} */
    progressChangeListener;

    /** @type {HTMLElement} */
    progressLabel;
    /** @type {HTMLElement} */
    progressIndicator


    constructor(task) {
        super();
        this.task = task;
    }

    /**
     * 
     * @param {PrefabBuilder} builder 
     */
    renderStaticText(builder) {
        builder.setVariableContent("title", this.task.getName());
        builder.setVariableContent("description", this.task.getDescription());
        builder.setVariableContent("date-display", `${getDateString(this.task.getStartDate())}  -  ${getDateString(this.task.getEndDate())}`);
    }

    build() {
        const modalBuilder = fetchPrefab("task-view-modal");
        
        // populate basic text elements
        this.renderStaticText(modalBuilder);

        modalBuilder.setVariableClickListener("edit-btn", () => {
            const editModal = new CreateTaskModal((editedTask) => 
            {
                const shouldResort = editedTask.getEndDate().getTime() != this.task.getEndDate().getTime();

                // apply new data to task
                this.task.setName(editedTask.getName());
                this.task.setDescription(editedTask.getDescription());
                this.task.setDates(editedTask.getStartDate(), editedTask.getEndDate());

                // re-render static text + update task state
                this.renderStaticText(modalBuilder);
                taskStateNotifier.setState(this.task.getId(), this.task, { resort: shouldResort });
            });

            editModal.useExistingTask(this.task);
            showModal(editModal);
        });

        // status select box
        const statusSelectBox = modalBuilder.getVariable("status-select");
        statusSelectBox.setAttribute("selected", `${this.task.getStatus()}`);

        const selectOption = statusSelectBox.querySelector(`option[value="${this.task.getStatus()}"]`);
        selectOption.setAttribute("selected", "");
        
        statusSelectBox.onchange = (event) => {
            const status = parseInt(statusSelectBox.value);
            this.task.setStatus(status);
            statusSelectBox.setAttribute("selected", `${status}`);
            taskStateNotifier.setState(this.task.getId(), this.task, { resort: true });

            this.task.forEachParent((id, task) => {
                taskStateNotifier.setState(id, task);
            })
        }
        
        // render tags
        const tagContainer = modalBuilder.getVariable("tag-container");
        this.tagBuilder = new StatefulCollectionBuilder({
            parent: tagContainer,
            builder: renderTag
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
            parent: nestedTasksContainer,
            builder: buildTaskCard,
            shouldAppend: (widget, state) => {
                if (state.getParent() != this.task)
                    return false;
                return true;
            }
        });

        taskStateNotifier.addBuilder(this.nestedTasksBuilder);
    
        // bind add task button
        modalBuilder.setVariableClickListener("add-task", () => showModal(new CreateTaskModal((task) => 
        {
            this.task.addChildNode(task);
            this.nestedTasksBuilder.appendItem(task.getId(), task);
            taskStateNotifier.setState(this.task.getId(), this.task);
            
            this.task.forEachParent((id, task) => {
                taskStateNotifier.setState(id, task);
            });
        }))); 
    
        this.task.getChildren().forEach((child) => {
            this.nestedTasksBuilder.appendItem(child.getId(), child);
        })

        // related notes
        const relatedNotesContainer = modalBuilder.getVariable("notes-container");

        this.relatedNotesBuilder = new StatefulCollectionBuilder({
            parent: relatedNotesContainer,
            builder: (state, args) => {
                const card = createNoteCard(state);
                card.onclick = () => {
                    selectNote(state.getId());
                    popAllModals();
                    getTabHandler("main-nav").switchTab("notes");
                }
                
                return card;
            },
            shouldAppend: (widget, state) => {
                return activeProject.taskNoteRelationship.isRelated(this.task.getId(), state.getId());
            }
        });

        activeProject.getRelatedNotesForTask(this.task.getId()).forEach((note) => {
            this.relatedNotesBuilder.setItem(note.getId(), note);
        });

        // render progress indicator if there are subtasks
        if (this.task.hasChildren()) {
            const {progressCircumference, progressIndicator } = buildProgressIndicator(100, 14);
            this.progressIndicator = progressIndicator;
            this.progressLabel = modalBuilder.getVariable("progress-label");
    
            modalBuilder.getVariable("progress-indicator").appendChild(this.progressIndicator);
    
            this.progressChangeListener = new StatefulListener((id, state, args) => {
                if (id != this.task.getId())
                    return;

                this.setProgressIndicator(this.task.getSubtaskCompletion(), progressCircumference);
            });
    
            taskStateNotifier.addBuilder(this.progressChangeListener);
            this.setProgressIndicator(this.task.getSubtaskCompletion(), progressCircumference);
        }
        // remove progress indicator if there are no subtasks
        else {
            const indicator = modalBuilder.getVariable("progress-indicator");
            indicator.parentElement.classList.add("flex-centered");
            indicator.parentElement.classList.remove("flex-space-between");
            indicator.remove();
        }


        return modalBuilder.getElement();
    }

    setProgressIndicator(completion, circumference) {
        const offset = completionToOffset(completion, circumference);

        this.progressIndicator.setAttribute("stroke-dashoffset", offset);
        this.progressLabel.innerHTML = completion.toString();
    }

    onClose() {
        taskStateNotifier.removeBuilder(this.nestedTasksBuilder);
        taskStateNotifier.removeBuilder(this.progressChangeListener);
    }
}

class CreateTaskModal extends Modal {

    /** @typedef {(task: Task) => void} CreateCallback */
     /** @type  {CreateCallback} */
    onCreateCallback;
    /** @type {Task} */
    existingTask;

    /** @param {CreateCallback} onCreate */
    constructor(onCreate) {
        super();
        this.onCreateCallback = onCreate;
    }

    build() {
        const createTaskModalBuilder = fetchPrefab("create-task-modal");
        // IDEA: maybe change modal to store builder instead of element, this way of accessing and setting data is unconsistent.
        if (this.existingTask) {
            this.popluateInputs(this.existingTask, createTaskModalBuilder.getElement());
            
            createTaskModalBuilder.setVariableContent("create-btn", "Save");
            createTaskModalBuilder.setVariableContent("title", "Edit Task");
        }

        createTaskModalBuilder.setVariableClickListener("create-btn", (event) => 
        {
            const task = this.createTask();
            if (!task)
                return;

            this.onCreateCallback(task);
            popHighestModal();
        });

        return createTaskModalBuilder.getElement();
    }

    useExistingTask(task) {
        this.existingTask = task;
    }

    /**
     * 
     * @param {Task} task 
     */
    popluateInputs(task, element) {
        element.getElementsByClassName("task-name-input")[0].value = task.getName();
        element.getElementsByClassName("task-description-input")[0].value = task.getDescription();
        element.getElementsByClassName("task-startdate-input")[0].valueAsNumber = task.getStartDate().getTime();
        element.getElementsByClassName("task-enddate-input")[0].valueAsNumber = task.getEndDate().getTime();
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

        const task = Task.createNew(name, description, startDate, endDate);
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

function buildProgressIndicator(size, thickness) {
    const builder = fetchPrefab("progress-indicator");
    const inner = builder.getVariable("inner-ring");
    const outer = builder.getVariable("outer-ring");

    inner.setAttribute("cx", size / 2);
    inner.setAttribute("cy", size / 2);
    outer.setAttribute("cx", size / 2);
    outer.setAttribute("cy", size / 2);

    const radius = (size / 2) - (thickness / 2) - 4;
    inner.setAttribute("r", radius);
    outer.setAttribute("r", radius);

    inner.setAttribute("stroke-width", thickness / 4);
    outer.setAttribute("stroke-width", thickness);

    const circumference = Math.round(2 * Math.PI * radius);
    outer.setAttribute("stroke-dasharray", circumference);

    const element = builder.getElement();
    element.setAttribute("width", size);
    element.setAttribute("height", size);

    return {
        progressIndicator: element,
        progressCircumference: circumference
    }
}

function completionToOffset(completion, circumference) {
    return circumference - Math.round((completion.completed / completion.count) * circumference);
}