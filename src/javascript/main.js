///<reference path="core.js"/>
///<reference path="state.js"/>
///<reference path="prefab.js"/>

const completedTaskContainer = document.getElementById("completed-task-container");

const activeProject = new Project();

/** 
 * @typedef {StatefulCollectionBuilder<Task>} TaskBuilder
 * @type {TaskBuilder} 
 * */
const taskStatefulBuilder = new StatefulCollectionBuilder({
    onAppend: (widget, state) => {
        completedTaskContainer.append(widget);
    },
    builder: buildTaskCard
});

function init() {
    const exampleTask = new Task("Example Task", "Lorem ipsum dolor sit amet consectetur adipisicing elit. Placeat totam, a hic laboriosam debitis impedit itaque est eaque ducimus sed rerum aliquam eius, ab perferendis?", Date.now(), Date.now() + (1000 * 60 * 60 * 24));
    activeProject.tasksHierarchy.addRootLevelNode(exampleTask);
    const newTag = activeProject.tasksHierarchy.createTag("Test Tag", "#ff55AA");
    exampleTask.addTag(newTag.id);
    
    const nestedTask = new Task("Nested Task", "This is a test for nesting tasks", Date.now(), Date.now());
    exampleTask.addChildNode(nestedTask);

    taskStatefulBuilder.appendItem(exampleTask.getId(), exampleTask);
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

    const tagContainer = taskCard.getVariable("tags");
    task.getTags().forEach((tag) => tagContainer.appendChild(renderTag(tag)));

    const taskElement = taskCard.getElement();
    taskElement.addEventListener("click", () => showTaskViewModal(task));

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
    
    const modal = new Modal(modalBuilder.getElement());
    showModal(modal);
}


function createTaskClicked() {
    const modalBuilder = fetchPrefab("create-task-modal");
    modalBuilder.setVariableClickListener("create-btn", () => newTaskClicked(modalBuilder.getElement()))

    const modal = new Modal(modalBuilder.getElement());
    showModal(modal);
}

function newTaskClicked(source) {
    const task = createTask(source);
    
    activeProject.tasksHierarchy.addRootLevelNode(task);
    taskStatefulBuilder.appendItem(task.getId(), task);
    
    popHighestModal();
}

/**
 * 
 * @param {*} sourceModal 
 * @returns {Task}
 */
function createTask(sourceModal) {
    const name = sourceModal.getElementsByClassName("task-name-input")[0].value;
    const description = sourceModal.getElementsByClassName("task-description-input")[0].value;
    const startDate = sourceModal.getElementsByClassName("task-startdate-input")[0].valueAsNumber;
    const endDate = sourceModal.getElementsByClassName("task-enddate-input")[0].valueAsNumber;

    // TODO: improve feedback in the future
    if (isNaN(startDate) || isNaN(endDate))
        return null;

    const task = new Task(name, description, startDate, endDate);
    return task;
}

// spaghetti code, NEED to come up with better state management system
/**
 * 
 * @param {Task} task 
 */
function showTaskViewModal(task) {
    const modalBuilder = fetchPrefab("task-view-modal");

    modalBuilder.setVariableContent("title", task.getName());
    modalBuilder.setVariableContent("description", task.getDescription());
    modalBuilder.setVariableContent("date-display", `${getDateString(task.getStartDate())}  -  ${getDateString(task.getEndDate())}`);

    const tagContainer = modalBuilder.getVariable("tag-container");
    const tagBuilder = new StatefulCollectionBuilder({
        builder: renderTag,
        onAppend: (widget, state) => {
            tagContainer.appendChild(widget);
        }
    });

    const localAddTag = (tag) => {
        const added = task.addTag(tag.id);
        
        // clunky
        if (!added)
            return;

        // update states
        tagBuilder.appendItem(tag.id, tag);
        taskStatefulBuilder.rebuildItem(task.getId(), task);
    }

    task.getTags().forEach((tag) => tagBuilder.appendItem(tag.id, tag));

    // tags
    modalBuilder.setVariableClickListener("add-tag-btn", () => {
        const tagSelectModalBuilder = fetchPrefab("tag-select-modal");
        const tagContainer = tagSelectModalBuilder.getVariable("tag-container");

        activeProject.tasksHierarchy.getSavedTags().map((tag) => {
            const tagElement = renderTag(tag);
            tagElement.onclick = () => {
                localAddTag(tag);
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
            localAddTag(createdTag);

            popHighestModal();
        });

        showModal(new Modal(tagSelectModalBuilder.getElement()));
    });

    // nested tasks
    const nestedTasksContainer = modalBuilder.getVariable("tasks-container");

    /**
     * @typedef {StatefulCollectionBuilder<Task>} TaskBuilder
     * @type {TaskBuilder}
     */
    const nestedTasksBuilder = new StatefulCollectionBuilder({
        builder: buildTaskCard,
        onAppend: (widget, state) => {
            nestedTasksContainer.appendChild(widget);
        }
    });

    // add task button
    const addTaskButton = modalBuilder.getVariable("add-task");
    addTaskButton.onclick = () => {
        const createTaskModalBuilder = fetchPrefab("create-task-modal");

        createTaskModalBuilder.setVariableClickListener("create-btn", (event) => 
        {
            const newTask = createTask(createTaskModalBuilder.getElement());
            
            task.addChildNode(newTask);
            nestedTasksBuilder.appendItem(newTask.getId(), newTask);

            popHighestModal();
        });

        showModal(new Modal(createTaskModalBuilder.getElement()))
    }

    task.getChildren().forEach((child) => {
        nestedTasksBuilder.appendItem(child.getId(), child);
    })

    showModal(new Modal(modalBuilder.getElement()), {
        tasksBuilder: nestedTasksBuilder
    });
}

/**
 * 
 * @param {Date} date 
 */
function getDateString(date) {
    return `${date.getDay().toString().padStart(2, "0")}-${date.getMonth().toString().padStart(2, "0")}-${date.getFullYear().toString()}`;
}

function dateButtonOverride(event, target) {
    event.preventDefault();
    target.showPicker();
}

init();