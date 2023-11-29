const modalStack = [];
const modalPrefabs = new Map();
const recognisedAnimationClasses = new Set(["modal-zoom-animation"]);

// hard coded at the moment, might change in the future
const ANIM_DURATION = 300;

const modalPrefabContainer = document.getElementById("modal-prefabs");

class Modal {
    element;
    animation;

    constructor(object) {
        this.element = object;

        for (const clazz of object.classList.entries())
        {
            const animationName = clazz[1];
            if (recognisedAnimationClasses.has(animationName)) {
                this.animation = animationName;
                break;
            }
        }
    }

    async openAnim() {
        this.element.classList.remove(this.animation);
        return wait(ANIM_DURATION);
    }

    async closeAnim() {
        this.element.classList.add(this.animation);
        return wait(ANIM_DURATION);
    }
}

class ModalPrefabBuilder {
    element;
    variableElements;

    constructor(DOMelement) {
        this.element = DOMelement.cloneNode(true);
        this.indexVariables();
    }

    indexVariables() {
        this.variableElements = new Map();
        this.recursiveVariableIndex(this.element);
    }

    recursiveVariableIndex(element) {
        const children = element.children;
        if (!children || children.length == 0)
            return;

        for (const child of children)
        {
            if (child.hasAttribute("modal-var")) {
                const varName = child.getAttribute("modal-var");
                this.variableElements.set(varName, child);
            }

            this.recursiveVariableIndex(child);
        }
    }

    setVariableContent(variableName, content) {
        if (!this.variableElements.has(variableName))
            return;

        const element = this.variableElements.get(variableName);
        element.innerHTML = content;
    }

    getVariable(variableName) {
        return this.variableElements.get(variableName);
    }

    setVariableClickListener(variableName, listener) {
        if (!this.variableElements.has(variableName))
            return;

        const element = this.variableElements.get(variableName);
        element.onclick = listener;
    }

    getModal() {
        return new Modal(this.element);
    }
}

function wait(ms) {
    return new Promise((resolve, reject) => {
        setTimeout(() => resolve(), ms);
    })
}

function indexModalPrefabs() {
    const modals = modalPrefabContainer.getElementsByTagName("modal");
    
    for (const modalPrefab of modals)
    {
        if (!modalPrefab.id)
            continue;

        modalPrefabs.set(modalPrefab.id, modalPrefab);
    }
}

function fetchModalPrefab(id) {
    const foundModal = modalPrefabs.get(id);
    if (!foundModal)
        return null;
    
    return new ModalPrefabBuilder(foundModal);
}

const modalContainer = document.getElementById("modal-container");

function showModal(modal) {
    modalStack.push(modal);
    modalContainer.appendChild(modal.element);
    modalContainerChangedState();
    
    setTimeout(() => {
        modal.openAnim()
    }, 1)
}

async function popHighestModal() {
    const highest = modalStack.pop();

    highest.closeAnim();
    await wait(100);
    modalContainer.removeChild(highest.element);
    modalContainerChangedState();
}

function modalContainerChangedState() {
    const hasChildren = modalContainer.children.length ?? false;
    
    if (hasChildren)
        modalContainer.classList.add("modal-container-active");
    else {
        if (modalContainer.classList.contains("modal-container-active"));
            modalContainer.classList.remove("modal-container-active");
    }
}

indexModalPrefabs();
window.addEventListener("click", (event) => {
    const target = event.composedPath()[0];
    if (target.classList.contains("modal-container-active"))
        popHighestModal();
});