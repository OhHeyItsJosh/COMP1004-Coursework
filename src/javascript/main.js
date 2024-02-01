///<reference path="core.js"/>
///<reference path="state.js"/>

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
    builder: (state) => {
        const taskCard = fetchPrefab("task-card-prefab");

        taskCard.setVariableContent("name", state.getName());
        taskCard.setVariableContent("description", state.getDescription());
        taskCard.setVariableContent("deadline", `${getDateString(state.getStartDate())} - ${getDateString(state.getEndDate())}`);
    
        const taskElement = taskCard.getElement();
        taskElement.addEventListener("click", () => console.log(state));

        return taskElement;
    }
});

function init() {
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
    const modal = new Modal(modalBuilder.getElement());
    showModal(modal);
}

function createTask(source) {
    const sourceModal = source.closest("modal");

    const name = sourceModal.getElementsByClassName("task-name-input")[0].value;
    const description = sourceModal.getElementsByClassName("task-description-input")[0].value;
    const startDate = sourceModal.getElementsByClassName("task-startdate-input")[0].valueAsNumber;
    const endDate = sourceModal.getElementsByClassName("task-enddate-input")[0].valueAsNumber;

    // TODO: improve feedback in the future
    if (isNaN(startDate) || isNaN(endDate))
        return;

    const task = new Task(name, description, startDate, endDate);
    activeProject.tasksHierarchy.addRootLevelNode(task);

    taskStatefulBuilder.appendItem(task.getId(), task);
    popHighestModal();
}

function showTaskModal() {
    // const taskModalBuilder = fetchPrefab("create-task-modal");

    // const taskModal = new Modal(taskModalBuilder.getElement());
    // showModal(taskModal);
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