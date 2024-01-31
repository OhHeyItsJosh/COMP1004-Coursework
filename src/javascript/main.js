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

const completedTaskContainer = document.getElementById("completed-task-container");

function createTaskClicked() {
    const modalBuilder = fetchPrefab("create-task-modal");
    const modal = new Modal(modalBuilder.getElement());
    showModal(modal);
}

function createTask(source) {
    const sourceModal = source.closest("modal");

    const taskCard = fetchPrefab("task-card-prefab");

    const name = sourceModal.getElementsByClassName("task-name-input")[0].value;
    taskCard.setVariableContent("name", name);

    const description = sourceModal.getElementsByClassName("task-description-input")[0].value;
    taskCard.setVariableContent("description", description);

    const taskElement = taskCard.getElement();
    taskElement.addEventListener("click", () => showTaskModal());

    completedTaskContainer.appendChild(taskElement);
    popHighestModal();
}

function showTaskModal() {
    // const taskModalBuilder = fetchPrefab("create-task-modal");

    // const taskModal = new Modal(taskModalBuilder.getElement());
    // showModal(taskModal);
}