const modalStack = [];
const recognisedAnimationClasses = new Set(["modal-zoom-animation"]);

// hard coded at the moment, might change in the future
const ANIM_DURATION = 300;

class Modal {
    element;
    animation;
    state;

    constructor(object, state) {
        this.element = object;
        this.state = state;

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

function wait(ms) {
    return new Promise((resolve, reject) => {
        setTimeout(() => resolve(), ms);
    })
}

const modalContainer = document.getElementById("modal-container");

function showModal(modal) {
    modalStack.push(modal);
    modalContainer.appendChild(modal.element);
    modalContainerChangedState();

    setTimeout(() => {
        modal.openAnim()
    }, 10)
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

// indexModalPrefabs();
window.addEventListener("click", (event) => {
    const target = event.composedPath()[0];
    if (target.classList.contains("modal-container-active"))
        popHighestModal();
});