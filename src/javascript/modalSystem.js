/** @type {Modal} */
const modalStack = [];
const recognisedAnimationClasses = new Set(["modal-zoom-animation"]);

// hard coded at the moment, might change in the future
const ANIM_DURATION = 300;

class Modal {
    element;
    animation;

    canClickOff = true;

    constructor() {
        if (this.constructor == Modal)
            throw new Error("Modal is abstract and should not be instanciated");
    }

    initialise() {
        this.element = this.build();
        this.animation = this.findAnim();
    }

    findAnim() {
        for (const clazz of this.element.classList.entries())
        {
            const animationName = clazz[1];
            if (recognisedAnimationClasses.has(animationName)) {
                return animationName;
            }
        }
    }

    setCanClickOff(flag) {
        this.canClickOff = flag;
    }

    /** @abstract */
    build() {};
    /** @abstract */
    onClose() {};

    async openAnim() {
        this.element.classList.remove(this.animation);
        return wait(ANIM_DURATION);
    }

    async closeAnim() {
        this.element.classList.add(this.animation);
        return wait(ANIM_DURATION);
    }
}

class StaticModal extends Modal {

    constructor(element) {
        super();
        this.element = element;
    }

    build() {
        return this.element;
    }
}

function wait(ms) {
    return new Promise((resolve, reject) => {
        setTimeout(() => resolve(), ms);
    })
}

const modalContainer = document.getElementById("modal-container");

/**
 * 
 * @param {Modal} modal 
 * @param {{canClickOff: boolean}} args 
 */
function showModal(modal, args = {}) {
    modal.setCanClickOff(args.canClickOff ?? true);

    modal.initialise();
    modalStack.push(modal);
    modalContainer.appendChild(modal.element);
    modalContainerChangedState();

    setTimeout(() => {
        modal.openAnim()
    }, 10)
}

async function popHighestModal() {
    const highest = modalStack.pop();
    if (!highest)
        return;

    highest.closeAnim();
    highest.onClose();

    await wait(100);
    modalContainer.removeChild(highest.element);
    modalContainerChangedState();
}

async function popAllModals() {
    const modalCount = modalStack.length;
    const promises = new Array(modalCount);

    for (let i = 0; i < modalCount; i++)
    {
        promises[i] = popHighestModal();
    }

    await Promise.all(promises);
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

// indexModalPrefabs();
window.addEventListener("click", (event) => {
    const target = event.composedPath()[0];
    if (target.classList.contains("modal-container-active") && modalStack[modalStack.length - 1].canClickOff)
        popHighestModal();
});