///<reference path="core.js"/>
///<reference path="state.js"/>
///<reference path="prefab.js"/>
///<reference path="tabs/tasksTab.js"/>
///<reference path="tabs/notesTab.js"/>

let activeProject = Project.new();

function onProjectLoad() {
    taskStateNotifier.flush();

    taskStateNotifier.addBuilder(taskDistributorBuilder);
    activeProject.tasksHierarchy.forEachNode((id, node) => {
        taskStateNotifier.setState(id, node);
    });

    selectedNoteId = null;

    noteStateNotifier.flush();
    noteStateNotifier.addBuilder(noteExplorerBuilder);
    activeProject.notesHierarchy.forEachNode((id, node) => {
        noteStateNotifier.setState(id, node);
    });

    buildNoteContent();
}

function init() {
    // create example data
    const exampleTask = Task.createNew("Example Task", "Lorem ipsum dolor sit amet consectetur adipisicing elit. Placeat totam, a hic laboriosam debitis impedit itaque est eaque ducimus sed rerum aliquam eius, ab perferendis?", Date.now(), Date.now() + (1000 * 60 * 60 * 24));
    activeProject.tasksHierarchy.addRootLevelNode(exampleTask);
    const newTag = activeProject.tasksHierarchy.createTag("Test Tag", "#ff55AA");
    exampleTask.addTag(newTag.id);
    
    const nestedTask = Task.createNew("Nested Task", "This is a test for nesting tasks", Date.now(), Date.now());
    exampleTask.addChildNode(nestedTask);

    taskStateNotifier.setState(exampleTask.getId(), exampleTask);
    // taskStatefulBuilder.appendItem(exampleTask.getId(), exampleTask);

    // create example notes data
    const exampleNote = Note.createNew("Test Note", "Test Description");
    activeProject.notesHierarchy.addRootLevelNode(exampleNote);
    const nestedNote = Note.createNew("Nested Note", "Test Description");
    const nestedNote2 = Note.createNew("Nested Note", "Test Description");
    const nestedNote3 = Note.createNew("Nested Note", "Test Description");
    exampleNote.addChildNode(nestedNote);
    exampleNote.addChildNode(nestedNote2);
    exampleNote.addChildNode(nestedNote3);

    const extraNestedNote = Note.createNew("Really Nested Note", "Bruh");
    nestedNote.addChildNode(extraNestedNote);

    activeProject.taskNoteRelationship.addRelationship(exampleTask.getId(), exampleNote.getId());
    activeProject.taskNoteRelationship.addRelationship(nestedTask.getId(), exampleNote.getId());
    activeProject.taskNoteRelationship.addRelationship(nestedTask.getId(), nestedNote.getId());
    onProjectLoad();
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
    exportAnchor.setAttribute("download", `project.json`);

    showModal(new StaticModal(modalBuilder.getElement()));
}

function importClicked() {
    const modalBuilder = fetchPrefab("import-dialog");
    const fileInput = modalBuilder.getVariable("import");
    
    modalBuilder.setVariableClickListener("import-btn", () => {
        const reader = new FileReader();
        reader.onload = (event) => {
            activeProject = Project.deserialise(event.target.result);
            console.log(activeProject);
            onProjectLoad();
        }
       
        reader.readAsText(fileInput.files[0]);
        popHighestModal();
    })

    showModal(new StaticModal(modalBuilder.getElement()));
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
                widget.onclick = (event) => {
                    this.selectCallback(state);
                    popHighestModal();
                }

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
    /** @type {SearchSelector} */
    selectorBuilder;

    /**
     * 
     * @param {SearchSelectorArgs} args 
     */
    constructor(args) {
        super();
        this.selectorArgs = args;
    }

    build() {
        const modalBuilder = fetchPrefab("search-modal");

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

init();