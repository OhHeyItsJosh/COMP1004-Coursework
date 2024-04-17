///<reference path="core.js"/>
///<reference path="state.js"/>
///<reference path="prefab.js"/>
///<reference path="tabs/tasksTab.js"/>
///<reference path="tabs/notesTab.js"/>

/** @type {Project} */
let activeProject;
/** @type {ProgressTrackerData} */
let progressTracker;
let dirty = false;

const contentWrapper = document.getElementById("wrapper");

const projectDetailsNotifier = new StateNotifier();

function onProjectLoad() {
    dirty = false;

    // hide ui if no project is loaded
    if (!activeProject) {
        contentWrapper.classList.add("hidden");
        showModal(new ProjectSelectModal(null), { canClickOff: false });

        return;
    }
    else {
        contentWrapper.classList.remove("hidden");
    }

    // create progress tracker
    const week = computeDateRange();
    progressTracker = new ProgressTrackerData(week.start, week.end, activeProject);

    // updateUIProjectName();
    projectDetailsNotifier.setState(activeProject.id, activeProject);
    taskStateNotifier.flush();

    // notes
    selectedNoteId = null;

    noteStateNotifier.flush();
    noteStateNotifier.addBuilder(noteExplorerBuilder);
    activeProject.notesHierarchy.forEachNode((id, node) => {
        noteStateNotifier.setState(id, node);
    });

    // dashboard
    taskStateNotifier.addBuilder(calendarItemBuilder);
    taskStateNotifier.addBuilder(upcomingTasksBuilder);    

    updateUpcomingTaskCount(0);

    // tasks
    taskStateNotifier.addBuilder(taskDistributorBuilder);
    // let nCount = 0;/
    activeProject.tasksHierarchy.forEachNode((id, node) => {
        // setTimeout(() => {
        taskStateNotifier.setState(id, node, {resort: true});
        progressTracker.trackTaskChange(node);
        // }, 1000 * nCount)

        // nCount++;
    });

    buildNoteContent();

    progressTracker.addUpdateCallback((_) => redrawProgressGraph());
    redrawProgressGraph();

    taskStateNotifier.addBuilder(new StatefulListener((id, state) => {
        // remove tracked data on task remove
        if (!state) {
            progressTracker.removeTrackedTaskData(id);
            return;
        }

        progressTracker.trackTaskChange(state);

    }));
    // console.log(progressTracker.progressStartedIndecies.map(item => item.date));
    // console.log(progressTracker);
    // console.log(progressTracker.progressStartedIndecies.map((id) => activeProject.tasksHierarchy.getNode(id).getStartedAt()).join(", "));
}

// function updateUIProjectName() {
//     document.getElementById("project-settings").innerText = activeProject.name;
// }

function init() {
    projectDetailsNotifier.addBuilder(new StatefulListener((id, state) => {
        if (id != activeProject.id)
            return;

        document.getElementById("project-settings").querySelector("p").innerText = state.name;
    }));

    onProjectLoad();
    initDashboard();
}

function saveActiveProject() {
    if (!activeProject)
        return;

    saveProjectToLocalStorage(activeProject);
}

function changeMade() {
    console.log("change made");
    dirty = true;
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


function exportClicked() {
    const dataBlob = new Blob([activeProject.serialise()], {type: "type/plain"});

    const modalBuilder = fetchPrefab("export-dialog");
    const exportAnchor = modalBuilder.getVariable("export");
    exportAnchor.setAttribute("href", URL.createObjectURL(dataBlob));
    exportAnchor.setAttribute("download", `${activeProject.name}.json`);

    showModal(new StaticModal(modalBuilder.getElement()));
}

function importClicked() {
    const modalBuilder = fetchPrefab("import-dialog");
    const fileInput = modalBuilder.getVariable("import");
    
    modalBuilder.setVariableClickListener("import-btn", () => {
        const reader = new FileReader();
        reader.onload = (event) => 
        {
            // import the project
            activeProject = Project.deserialise(event.target.result);
            saveActiveProject();
            onProjectLoad();
        }
       
        reader.readAsText(fileInput.files[0]);
        popAllModals();
    })

    showModal(new StaticModal(modalBuilder.getElement()));
}

function openProjectPanel() {
    saveActiveProject();
    showModal(new ProjectSelectModal(activeProject));
}

function newProjectClicked() {
    const nameInputModal = new TextInputModal({
        title: "Project Name",
        submitText: "Create",
        allowEmpty: false,
        onSubmit: (name) => {
            activeProject = Project.new(name);
            saveActiveProject();
            onProjectLoad();

            popHighestModal();
        }
    });

    showModal(nameInputModal);
}

function onRenameProject() {
    if (!activeProject)
        return;

    showModal(new TextInputModal({
        title: "Project Name",
        submitText: "Rename",
        existingText: activeProject.name,
        allowEmpty: false,
        onSubmit: (name) => {
            activeProject.name = name;
            saveActiveProject();

            projectDetailsNotifier.setState(activeProject.id, activeProject);
        }

    }));
}

function onDeleteProject() {
    showModal(new ConfirmationDialog({
        title: "Delete this project?",
        description: `Are you sure you want to delete this project? <br>It will be permanently removed from local storage.`,
        onConfirm: async () => {
            removeProjectFromLocalStorage(activeProject);
            
            activeProject = null;
            
            await popAllModals();
            onProjectLoad();
        }
    }))
}

class TextInputModal extends Modal {
    
    title;
    submitText;
    onSubmit;
    allowEmpty;
    existingText;

    textInputRef;

    /**
     * @param {{title: string, submitText: string, onSubmit: (input: string) => boolean, allowEmpty: boolean, existingText: string}} args 
     */
    constructor(args) {
        super();

        this.title = args.title;
        this.submitText = args.submitText;
        this.onSubmit = args.onSubmit;
        this.allowEmpty = args.allowEmpty ?? false;
        this.existingText = args.existingText;
    }

    build() {
        const builder = fetchPrefab("text-input-modal");
        
        if (this.title) builder.setVariableContent("title", this.title);
        if (this.submitText) builder.setVariableContent("submit-btn", this.submitText);

        this.textInputRef = builder.getVariable("text-input");
        if (this.existingText)
            this.textInputRef.value = this.existingText;

        this.textInputRef.addEventListener("keydown", (event) => {
            if (event.key == "Enter")
                this.runOnSubmit();
        });

        builder.setVariableClickListener("submit-btn", () => this.runOnSubmit());
        
        setTimeout(() => this.textInputRef.focus(), 10);
        return builder.getElement();
    }

    runOnSubmit() {
        const inputText = this.textInputRef.value;

        if (!this.allowEmpty && inputText == "")
            return;

        if (!(this.onSubmit(inputText) ?? true))
            return;

        popHighestModal();
    }
}

class ConfirmationDialog extends Modal {

    title;
    description;
    onConfirm;

    /**
     * @param {{title: string, description: string, onConfirm: () => void}} args 
     */
    constructor(args) {
        super();

        this.title = args.title;
        this.description = args.description;
        this.onConfirm = args.onConfirm;
    }

    build() {
        const builder = fetchPrefab("confirmation-dialog");
        
        if (this.title) builder.setVariableContent("title", this.title);
        if (this.description) builder.setVariableContent("description", this.description);
        builder.setVariableClickListener("confirm-btn", () => {
            this.onConfirm();
            popHighestModal();
        });

        return builder.getElement();
    }
}

class ProjectSelectModal extends Modal {

    /** @type {Project} */
    project;

    /** @type {StatefulListener} */
    projectDetailsListener;

    constructor(project) {
        super();
        this.project = project;
    }

    build() {
        const builder = fetchPrefab("project-select-modal");

        if (!this.project) {
            builder.getVariable("project-specific").remove();
        }

        const projectList = builder.getVariable("project-list");
        const projectListBuilder = new StatefulCollectionBuilder({
            parent: projectList,
            builder: (state, args) => {
                const cardBuilder = fetchPrefab("generic-card");
                cardBuilder.setVariableContent("title", state.name);
                cardBuilder.setVariableContent("content", `Tasks: ${state.taskCount}, Notes: ${state.noteCount}`);
    
                // cardBuilder.getElement().onclick = 
                onClickOnEnter(cardBuilder.getElement(), () => {
                    const project = getProjectFromLocalStroage(state.id);
                    if (!project)
                        return;
    
                    activeProject = project;
                    onProjectLoad();
                    popHighestModal();
                });

                return cardBuilder.getElement();
            }
        });

        const projectName = builder.getVariable("current-project-name");
        this.updateProjectName(projectName);
        this.buildProjectCards(projectListBuilder);
        
        // create listener for when project details are updated
        this.projectDetailsListener = new StatefulListener((id, _) => {
            if (id != activeProject.id)
                return;

            this.updateProjectName(projectName);
            this.buildProjectCards(projectListBuilder);
        });

        projectDetailsNotifier.addBuilder(this.projectDetailsListener);

        return builder.getElement();
    }

    updateProjectName(object) {
        if (!this.project)
            return;

        object.innerHTML = this.project.name;
    }

    buildProjectCards(listBuilder) {
        for (const projectDetails of getSavedProjects())
        {
            listBuilder.setItem(projectDetails.id, projectDetails);
        }
    }

    onClose() {
        projectDetailsNotifier.removeBuilder(this.projectNameListener);
    }
}


/** @template T */
class SearchSelector extends StatefulCollectionBuilder {

    /** T[] */
    items;
    searchItemProvider;
    idProvider;
    selectCallback;

    /**
     * @typedef {{itemBuilder: WidgetBuilder, items: T[], getSearchItem: (item: T) => string, getId: (item: T) => string, onSelect: (item: T) => void}} SearchSelectorArgs
     * @param {SearchSelectorArgs} args 
     */ 
    constructor(args, container) {
        super({
            builder: (state, builderArgs) => {
                const widget = args.itemBuilder(state, builderArgs);
                onClickOnEnter(widget, (event) => {
                    this.selectCallback(state);
                    popHighestModal();
                });

                return widget;
            },
            parent: container
        });

        this.selectCallback = args.onSelect;
        this.items = args.items;
        this.searchItemProvider = args.getSearchItem;
        this.idProvider = args.getId;
    }

    buildItems() {
        for (const item of this.items)
        {
            super.setItem(this.idProvider(item), item);
        }
    }

    searchTerm(term) {
        for (const item of this.items)
        {
            const searchBy = this.searchItemProvider(item).toLowerCase();
            const widget = this.getItem(this.idProvider(item));

            if (!searchBy.includes(term.toLowerCase()))
                widget.classList.add("hidden");
            else
                widget.classList.remove("hidden");
        }
    }
}

/** @template T */
class SearchSelectorModal extends Modal {

    selectorArgs;
    /** @type {string} */
    title;
    /** @type {SearchSelector} */
    selectorBuilder;

    /**
     * 
     * @param {SearchSelectorArgs} args 
     */
    constructor(args, title) {
        super();
        this.title = title;
        this.selectorArgs = args;
    }

    build() {
        const modalBuilder = fetchPrefab("search-modal");

        if (this.title) {
            modalBuilder.setVariableContent("title", this.title);
        }

        const itemContainer = modalBuilder.getVariable("item-container");
        this.selectorBuilder = new SearchSelector(this.selectorArgs, itemContainer);
        this.selectorBuilder.buildItems();

        const inputBox = modalBuilder.getVariable("search-input");
        
        inputBox.addEventListener("keydown", (event) => {
            if (event.key == "Enter")
                this.search(inputBox);
        });
        modalBuilder.setVariableClickListener("search-button", () => this.search(inputBox));

        setTimeout(() => {
            inputBox.focus();
        }, 10)
        return modalBuilder.getElement();
    }

    search(inputBox) {
        this.selectorBuilder.searchTerm(inputBox.value);
    }
    
    onClose() {

    }
}

/**
 * 
 * @param {Date} date 
 */
function getDateString(date, includeTime) {
    return `${date.getDate().toString().padStart(2, "0")}-${(date.getMonth() + 1).toString().padStart(2, "0")}-${date.getFullYear().toString()} ${includeTime ? `${date.getHours().toString().padStart(2, "0")}:${date.getMinutes().toString().padStart(2, "0")}` : ``}`;
}


function capString(string, length) {
    let capped = string.substring(0, length);
    if (capped.length == length)
        capped += "...";

    return capped;
}

function tempSave() {
    saveProjectToLocalStorage(activeProject);
}

function clearTemp() {
    localStorage.clear();
}

window.addEventListener("beforeunload", () => {
    try {
        document.activeElement.blur();
    } catch (e) {}

    saveActiveProject();
});

// autosave
setInterval(() => {
    if (dirty) {
        console.log("[autosave] saved active project")
        saveActiveProject();

        dirty = false;
    }
}, 1000 * 60)

/**
 * 
 * @param {HTMLElement} element 
 * @param {(event) => void} callback 
 */
function onClickOnEnter(element, callback) {
    element.addEventListener("click", callback);
    element.addEventListener("keydown", (event) => 
    {
        if (event.key == "Enter")
            callback(event);
    })
}

init();