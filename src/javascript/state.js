/** @interface 
 * @template T
*/
class Stateful {
    /**
     * 
     * @param {string} id 
     * @param {T} state
     * @abstract
     */
    setItem(id, state, args) {};

    /**
     * 
     * @param {string} id
     * @abstract 
     */
    hasItem(id) {};
}

/**
 * @template T
 */
class StatefulCollectionBuilder extends Stateful {
    /**
     * @typedef {(state: T) => Object} WidgetBuilder
     * @typedef {(widget: Object, state: T) => boolean} AppendPredicate
     * @typedef {(ids: string[]) => string[]} SortCallback
     */

    /** @type {HTMLElement} */
    #parent;
    /** @type {Map<string, Object>} */
    #items;
    /**@type {WidgetBuilder} */
    #builder;
    /** @type {AppendPredicate} */
    #shouldAppendPredicate;
    /** @type {SortCallback} */
    #sortCallback;

    /**
     * @param {{parent: HTMLElement, builder: WidgetBuilder, shouldAppend: AppendPredicate, sorter: SortCallback}} args
     */
    constructor(args) {
        super();
        this.#items = new Map();
        this.#builder = args.builder;
        this.#shouldAppendPredicate = args.shouldAppend;
        this.#parent = args.parent;
        this.#sortCallback = args.sorter;
    }

    /**
     * 
     * @param {string} id 
     * @param {T} state 
     * @param {{resort: boolean}} args 
     * @returns 
     */
    setItem(id, state, args) {
        if (this.#items.has(id))
        {
            if (state == null)
                this.removeItem(id);
            else
                this.rebuildItem(id, state);
        }
        else if (state == null)
            return;
        else
            this.appendItem(id, state);

        if (args && args.resort && this.#sortCallback)
            this.sortItems();
    }

    sortItems() {
        const ids = Array.from(this.#items.keys());
        const sortedIds = this.#sortCallback.call(this, ids);

        for (const sortedId of sortedIds)
        {
            this.#parent.appendChild(this.#items.get(sortedId));
        }
    }

    rebuildItem(id, state) {
        const currentWidget = this.#items.get(id);
        if (!currentWidget)
            return;

        const rebuiltWidget = this.#builder(state);
        currentWidget.innerHTML = rebuiltWidget.innerHTML;
    }

    removeItem(id) {
        const target = this.#items.get(id);
        if (!target)
            return;

        this.#items.delete(id);
        target.remove();
    }

    rebuildAll() {

    }

    appendItem(id, state) {
        const widget = this.#builder(state);
        if (this.#shouldAppendPredicate && !this.#shouldAppendPredicate(id, state))
            return;

        this.#parent.appendChild(widget);
        this.#items.set(id, widget);
    }

    hasItem(id) {
        return this.#items.has(id);
    }
}

/**
 * @template T
 */
class StatefulListener extends Stateful {
    #setItemCallback

    /**
     * @param {(id: string, state: T, args: any)} setItemCallback 
     */
    constructor(setItemCallback) {
        super();
        this.#setItemCallback = setItemCallback;
    }

    setItem(id, state, args) {
        this.#setItemCallback(id, state, args);
    }

    hasItem(id) {
        return true;
    }
}

// class StatefulBuilder extends Stateful {
//     /** @type {string} */
//     #id
//     /** @type {WidgetBuilder} */
//     #builder
//     /** @type {HTMLElement} */
//     #widget

//     constructor(id, builder) {
//         super();
//         this.#id = id;
//         this.#builder = builder;
//     }

//     setItem(id, state, args) {
//         if (id != this.#id)
//             return;

        
//     }

//     hasItem(id) {

//     }
// }

/**
 * @template T
 */
class StatefulDistributor extends Stateful {

    /** @typedef {Map<string, Stateful<T>} GroupMap */
    /** @type {GroupMap} */
    statefulGroups;
    /** @typedef {(id: string, state: T) => string} SortGroupCallback */
    /** @type {SortGroupCallback} */
    sortToGroup;

    /**
     * 
     * @param {GroupMap} groups 
     * @param {SortGroupCallback} sortCallback 
     */
    constructor(groups, sortCallback) {
        super();
        this.statefulGroups = new Map(Object.entries(groups));
        this.sortToGroup = sortCallback;
    }

    setItem(id, state, args) {
        // sort
        const groupId = this.sortToGroup(id, state);
        const sortedGroup = this.statefulGroups.get(groupId);

        // presence check in sorted group
        if (sortedGroup.hasItem(id)) {
            sortedGroup.setItem(id, state, args);
            return;
        }

        // remove from all groups and re-append item
        this.removeFromAll(id);
        sortedGroup.setItem(id, state, args);
    }

    hasItem(id) {
        throw Error("unimplemented");
    }

    removeFromAll(id) {
        for (const [_, group] of this.statefulGroups.entries())
        {
            group.setItem(id, null);
        }
    }
}

/**
 * @template T
 */
class StateNotifier {
    /** @type {Stateful<T>[]} */
    #notifyList;

    constructor() {
        this.#notifyList = [];
    }

    /** @param {Stateful<T>} builder */
    addBuilder(builder) {
        this.#notifyList.push(builder);
    }

    /** @param {Stateful<T>} builder */
    removeBuilder(builder) {
        const index = this.#notifyList.indexOf(builder);
        if (index == -1)
            return;

        this.#notifyList.splice(index, 1);
    }

    /**
     * @param {string} id 
     * @param {T} state 
     */
    setState(id, state, args) {
        for (const builder of this.#notifyList)
        {
            builder.setItem(id, state, args);
        }
    }
}