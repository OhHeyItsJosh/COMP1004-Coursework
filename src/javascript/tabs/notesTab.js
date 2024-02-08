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
    builder: (state) => {
        const widget = document.createElement("div");
        widget.classList.add("tree-item");
        widget.classList.add("flex-row");
        // widget.classList.add("flex-align-center");
        widget.setAttribute("note-id", state.getId());

        
        for (let i = 0; i < state.getParentCount(); i++)
        {
            const indent = document.createElement("div");
            indent.classList.add("tree-indent");

            widget.appendChild(indent);
        }

        widget.innerHTML += state.getName();

        const expanded = document.createElement("div");
        expanded.classList.add("expanded");
        widget.appendChild(expanded);

        const addBtn = document.createElement("p");
        addBtn.classList.add("tree-add-child");
        addBtn.innerHTML = "+";
        addBtn.addEventListener("click", (event) => {
            createNote(state);
            event.stopPropagation();
        });

        widget.appendChild(addBtn);

        widget.onclick = () => {
            selectNote(state.getId());
        }
        return widget;
    },
    onAppend: (builder, parent, widget, state) => {
        const parentId = state.getParentId();
        if (!parentId) {
            const branch = createTreeBranch(widget);
            parent.appendChild(branch);
            return;
        }

        /** @type {HTMLElement} */
        const parentItem = builder.getItem(state.getParentId());
        const parentBranch = parentItem.parentElement;

        const sublist = parentBranch.getElementsByClassName("tree-sublist")[0];
        const newBranch = createTreeBranch(widget);
        sublist.appendChild(newBranch);
    }
});

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
        updateNote(note);

        // select content
        if (event.code == "Enter")
            noteContent.focus();
    }
});

noteContent.addEventListener("keydown", (event) => blurOnKeys(["Escape"], event, noteContent));

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
function updateNote(note) {
    noteStateNotifier.setState(note.getId(), note);
}