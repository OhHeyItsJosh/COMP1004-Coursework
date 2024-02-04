const prefabContainer = document.getElementById("prefabs");
const prefabsIndex = new Map();

class PrefabBuilder {
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

    /** @return {HTMLElement} */
    getVariable(variableName) {
        return this.variableElements.get(variableName);
    }

    setVariableClickListener(variableName, listener) {
        if (!this.variableElements.has(variableName))
            return;

        const element = this.variableElements.get(variableName);
        element.onclick = listener;
    }

    getElement() {
        return this.element;
    }
}

function indexPrefabs() {
    const prefabs = prefabContainer.children;
    
    for (const prefab of prefabs)
    {
        if (!prefab.id)
            continue;

        prefabsIndex.set(prefab.id, prefab);
    }
}

/**
 * 
 * @param {string} id 
 * @returns {PrefabBuilder}
 */
function fetchPrefab(id) {
    const foundModal = prefabsIndex.get(id);
    if (!foundModal)
        return null;
    
    return new PrefabBuilder(foundModal);
}

indexPrefabs();