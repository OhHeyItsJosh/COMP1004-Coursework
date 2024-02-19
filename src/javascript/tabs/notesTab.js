///<reference path="../core.js"/>
///<reference path="../state.js"/>
///<reference path="../prefab.js"/>

const noteStateNotifier = new StateNotifier();

const noteExplorer = document.getElementById("note-explorer");
const noteContainer = document.getElementById("note-container");

const nestedNotesContainer = document.getElementById("nested-notes-container");
const relatedTasksContainer = document.getElementById("related-tasks-container");

let selectedNoteId;

/** @typedef {StatefulCollectionBuilder<Note>} NoteBuilder 
 * @type {NoteBuilder}
*/
const noteExplorerBuilder = new StatefulCollectionBuilder({
    parent: noteExplorer,
    builder: (state, args) => {
        // create tree item widget
        const widget = elementWithClasses("div", ["tree-item", "flex-row"])
        widget.setAttribute("note-id", state.getId());

        // add intends
        const parentCount = state.getParentCount();
        for (let i = 0; i < parentCount; i++)
        {
            const indent = elementWithClasses("div", ["tree-indent"]);
            widget.appendChild(indent);
        }

        // add drawer arrow if the note has children
        if (state.hasChildren()) {
            const collapseBtn = elementWithClasses("div", ["tree-collapse-arrow"]);
            collapseBtn.onclick = (event) => {
                event.stopPropagation();
                const branch = findAdjacentElement(widget, (el) => el.classList.contains("tree-sublist"));
                if (!branch)
                    return;
    
                collapseBtn.classList.toggle("closed");
                branch.classList.toggle("collpased");
            };
            widget.appendChild(collapseBtn);
        }
        // add spacer if the note does not have children
        else {
            const spacer = elementWithClasses("div", ["arrow-spacer"]);
            widget.appendChild(spacer);
        }

        // add label
        const label = elementWithClasses("div", ["label"]);
        label.innerHTML = state.getName();
        widget.appendChild(label);

        const expanded = elementWithClasses("div", ["expanded"])
        widget.appendChild(expanded);

        // create button to add child note
        const addBtn = elementWithClasses("p", ["tree-add-child"]);
        addBtn.innerHTML = "+";
        addBtn.addEventListener("click", (event) => {
            createNote(state);
            event.stopPropagation();
        });

        widget.appendChild(addBtn);

        // select the note when it is clicked.
        widget.onclick = () => {
            selectNote(state.getId());
        }

        // set selected class if it is selected
        if (args.isSelected)
            widget.classList.add("selected");

        return widget;
    },
    onAppend: (builder, parent, widget, state) => {
        const parentId = state.getParentId();

        // if no parent, create top level branch
        if (!parentId) {
            const branch = createTreeBranch(widget);
            parent.appendChild(branch);
            return;
        }

        // re-built parent if this note is its first child (to add drawer toggle button)
        const nodeParent = state.getParent();
        if (nodeParent.childCount() == 1) {
            builder.setItem(parentId, nodeParent);
        }

        // get sublist for parent element and append child.
        /** @type {HTMLElement} */
        const parentItem = builder.getItem(state.getParentId());
        const sublist = findAdjacentElement(parentItem, (el) => el.classList.contains("tree-sublist"));
        
        const newBranch = createTreeBranch(widget);
        sublist.appendChild(newBranch);
    }
});

/** @type {NoteBuilder} */
let nestedNotesBuilder;
/** @type {StatefulCollectionBuilder<Task>} */
let relatedTasksBuilder;

/**
 * 
 * @param {HTMLElement} element 
 * @param {(element: HTMLElement) => boolean} predicate 
 * @returns 
 */
function findAdjacentElement(element, predicate) {
    let currentElement = element.nextElementSibling;
    while (currentElement)
    {
        if (predicate(currentElement))
            return currentElement;

        currentElement = currentElement.nextElementSibling;
    }

    return null;
}

/** @return {HTMLElement} */
function elementWithClasses(element, classes) {
    const el = document.createElement(element);
    for (const clazz of classes)
    {
        el.classList.add(clazz);
    }

    return el;
}

function createTreeBranch(item) {
    const branch = document.createElement("li");
    branch.classList.add("tree-branch");
    branch.appendChild(item);

    const sublist = document.createElement("ul");
    sublist.classList.add("tree-sublist");

    branch.appendChild(sublist);
    return branch;
}

function selectNote(id) {
    // remove selected class from current select element in explorer
    if (selectedNoteId) {
        const explorerItem = noteExplorerBuilder.getItem(selectedNoteId);
        if (explorerItem)
            explorerItem.classList.remove("selected");
    }

    // set selected class in explorer
    const selectedExplorerItem = noteExplorerBuilder.getItem(id);
    selectedExplorerItem.classList.add("selected");
    
    selectedNoteId = id;
    buildNoteContent();
}

/**
 * @param {Note} parentNote 
 */
function createNote(parentNote) {
    const newNote = Note.createNew("New Note", "");

    if (!parentNote) {
        activeProject.notesHierarchy.addRootLevelNode(newNote);
    }
    else {
        parentNote.addChildNode(newNote);
    }

    noteStateNotifier.setState(newNote.getId(), newNote);
    selectNote(newNote.getId());

    const range = document.createRange();
    range.selectNodeContents(noteTitleElement);
    const selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(range);

    noteTitleElement.focus();

    changeMade();
}

const addNestedNoteButton = document.getElementById("add-nested-note-btn");

function buildNoteContent() {
    /** @type {Note} */
    const note = getSelctedNote();
    
    // if there is no note selected
    if (!note) {
        noteContainer.classList.add("inactive");
        return;
    }
    else {
        noteContainer.classList.remove("inactive");
    }

    noteTitleElement.innerText = note.getName();
    noteContentElement.innerText = note.getContent();

    addNestedNoteButton.onclick = () => createNote(note);

    // nested notes section
    if (nestedNotesBuilder)
        nestedNotesBuilder.clear();

    /** @type {NoteBuilder} */
    nestedNotesBuilder = new StatefulCollectionBuilder({
        parent: nestedNotesContainer,
        shouldAppend: (widget, state) => {
            if (state.getParentId() != note.getId())
                return false;
            return true;
        },
        builder: (state, args) => {
            const card = createNoteCard(state);
            card.style.fontSize = "0.75rem";
            card.onclick = () => selectNote(state.getId());
            return card;
        }
    });

    note.getChildren().forEach((child) => {
        nestedNotesBuilder.setItem(child.getId(), child);
    });

    // related tasks second
    if (relatedTasksBuilder) {
        relatedTasksBuilder.clear();
        taskStateNotifier.removeBuilder(relatedTasksBuilder);
    }

    relatedTasksBuilder = new StatefulCollectionBuilder({
        parent: relatedTasksContainer,
        shouldAppend: (widget, state) => {
            return activeProject.taskNoteRelationship.isRelated(state.getId(), note.getId());
        },
        builder: (state, args) => {
            const card = buildTaskCard(state, args);
            card.style.fontSize = "0.85rem";

            return card;
        }
    });

    activeProject.getRelatedTasksForNote(note.getId()).forEach((task) => {
        relatedTasksBuilder.setItem(task.getId(), task);
    });

    taskStateNotifier.addBuilder(relatedTasksBuilder);
}

function getSelctedNote() {
    return activeProject.notesHierarchy.getNode(selectedNoteId);
}

const noteTitleElement = document.getElementById("note-title");
const noteContentElement = document.getElementById("note-content");

noteTitleElement.addEventListener("keydown", (event) => {
    if (event.code == "Enter" | event.code == "Escape") {
        noteTitleElement.blur();
        event.preventDefault();

        let newTitle = noteTitleElement.innerHTML;
        newTitle = newTitle.replace("<br>", "");

        // TODO: sanitise
        
        const note = getSelctedNote();
        note.setName(newTitle);
        changeMade();
        noteStateNotifier.setState(note.getId(), note, {}, { isSelected: true });


        // select content
        if (event.code == "Enter")
            noteContentElement.focus();
    }
});


noteContentElement.addEventListener("blur", (_) => {
    const newContent = noteContentElement.innerText;

    const note = getSelctedNote();
    note.setContent(newContent);
    changeMade();
    // updateNote(note);
});

/**
 * @param {Note} note 
 */
function createNoteCard(note) {
    const noteCard = fetchPrefab("generic-card");
    noteCard.setVariableContent("title", note.getName());

    const maxLength = 50;
    let content = note.getContent().substring(0, maxLength);
    if (content.length == maxLength)
        content += "...";

    noteCard.setVariableContent("content", content);

    return noteCard.getElement();
}

function linkTaskToNote() {
    const note = getSelctedNote();
    const relatedTasks = activeProject.getRelatedTasksForNote(note.getId());

    /** @type {SearchSelectorModal<Task>}*/
    const selectorModal = new SearchSelectorModal({
        items: activeProject.tasksHierarchy.getAllNodes(),
        itemBuilder: (state, args) => {
            const card = buildTaskCard(state, args);
            if (relatedTasks.includes(state))
                card.classList.add("related");

            return card;
        },
        getId: (item) => item.getId(),
        getSearchItem: (item) => item.getName(),
        onSelect: (task) => {
            // create relationship + update builder
            activeProject.taskNoteRelationship.toggleRelationship(task.getId(), note.getId());
            relatedTasksBuilder.setItem(task.getId(), task);
            changeMade();
        }
    })

    showModal(selectorModal);
}