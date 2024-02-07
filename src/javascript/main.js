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

    noteStateNotifier.flush();
    noteStateNotifier.addBuilder(noteExplorerBuilder);
    activeProject.notesHierarchy.forEachNode((id, node) => {
        noteStateNotifier.setState(id, node);
    })
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

init();