///<reference path="../core.js"/>
///<reference path="../state.js"/>
///<reference path="../prefab.js"/>

const noteStateNotifier = new StateNotifier();

const noteExplorer = document.getElementById("note-explorer");
const noteContainer = document.getElementById("note-container");

let selectedNoteId;

/** @typedef {StatefulCollectionBuilder<Note>} NoteBuilder 
 * @type {NoteBuilder}
*/
const noteExplorerBuilder = new StatefulCollectionBuilder({
    parent: noteExplorer,
    builder: (state, args) => {
        const widget = elementWithClasses("div", ["tree-item", "flex-row"])
        widget.setAttribute("note-id", state.getId());

        const parentCount = state.getParentCount();
        for (let i = 0; i < parentCount; i++)
        {
            const indent = elementWithClasses("div", ["tree-indent"]);

            // mark last element
            // if (currentParent.indexOfChild(state.getId()) == currentParent.childCount() - 1)
            //     indent.classList.add("last");

            widget.appendChild(indent);

            // if (i + 1 < parentCount) 
            //     currentParent = currentParent.getParent();
        }

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
        else {
            const spacer = elementWithClasses("div", ["arrow-spacer"]);
            widget.appendChild(spacer);
        }

        const label = elementWithClasses("div", ["label"]);
        label.innerHTML = state.getName();
        widget.appendChild(label);

        const expanded = elementWithClasses("div", ["expanded"])
        widget.appendChild(expanded);

        const addBtn = elementWithClasses("p", ["tree-add-child"]);
        addBtn.innerHTML = "+";
        addBtn.addEventListener("click", (event) => {
            createNote(state);
            event.stopPropagation();
        });

        widget.appendChild(addBtn);

        widget.onclick = () => {
            selectNote(state.getId());
        }

        if (args.isSelected)
            widget.classList.add("selected");

        return widget;
    },
    onAppend: (builder, parent, widget, state) => {
        const parentId = state.getParentId();
        if (!parentId) {
            const branch = createTreeBranch(widget);
            parent.appendChild(branch);
            return;
        }

        const nodeParent = state.getParent();
        if (nodeParent.childCount() == 1) {
            builder.setItem(parentId, nodeParent);
        }

        /** @type {HTMLElement} */
        const parentItem = builder.getItem(state.getParentId());
        const sublist = findAdjacentElement(parentItem, (el) => el.classList.contains("tree-sublist"));
        
        const newBranch = createTreeBranch(widget);
        sublist.appendChild(newBranch);
    }
});

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

const noteTitle = document.getElementById("note-title");
const noteContent = document.getElementById("note-content");

function selectNote(id, selectName) {
    if (selectedNoteId) {
        const explorerItem = noteExplorerBuilder.getItem(selectedNoteId);
        explorerItem.classList.remove("selected");
    }

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
    range.selectNodeContents(noteTitle);
    const selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(range);
    noteTitle.focus();
}

function buildNoteContent() {
    /** @type {Note} */
    const note = activeProject.notesHierarchy.getNode(selectedNoteId);
    noteTitle.innerHTML = note.getName();
    noteContent.innerHTML = note.getContent();
}

function getSelctedNote() {
    return activeProject.notesHierarchy.getNode(selectedNoteId);
}

/**
 * 
 * @param {string[]} keys 
 */
function blurOnKeys(keys, event, element) {
    if (keys.includes(event.code)) {
        element.blur();
        event.preventDefault();
    }
}

noteTitle.addEventListener("keydown", (event) => {
    if (event.code == "Enter" | event.code == "Escape") {
        noteTitle.blur();
        event.preventDefault();

        let newTitle = noteTitle.innerHTML;
        newTitle = newTitle.replace("<br>", "");

        // TODO: sanitise
        
        const note = getSelctedNote();
        note.setName(newTitle);
        noteStateNotifier.setState(note.getId(), note, {}, { isSelected: true });


        // select content
        if (event.code == "Enter")
            noteContent.focus();
    }
});

noteContent.addEventListener("keydown", (event) => {
    blurOnKeys(["Escape"], event, noteContent);
});

noteContent.addEventListener("input", (event) => {
    console.log(event);
});

// noteTitle.addEventListener("blur", (e) => {

// });

noteContent.addEventListener("blur", (_) => {
    const newContent = noteContent.innerHTML;

    const note = getSelctedNote();
    note.setContent(newContent);
    // updateNote(note);
});

/**
 * 
 * @param {Note} note 
 */
// function updateNote(note) {
//     noteStateNotifier.setState(note.getId(), note);
// }