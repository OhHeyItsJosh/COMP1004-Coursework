/** @interface 
 * @template T
*/
class Stateful {
    /**
     * @param {string} id 
     * @param {T} state
     * @abstract
     */
    setItem(id, state, args, builderArgs) {};

    /**
     * @param {string} id
     * @abstract 
     */
    hasItem(id) {};

    /**
     * @abstract
     */
    clear() {}
}

/**
 * @template T
 */
class StatefulCollectionBuilder extends Stateful {
    /**
     * @typedef {(state: T, args: any) => Object} WidgetBuilder
     * @typedef {(widget: Object, state: T) => boolean} AppendPredicate
     * @typedef {(builder: StatefulCollectionBuilder, parent: HTMLElement, widget: HTMLElement, state: T) => void} AppendCallback
     * @typedef {(ids: string[], changedState: T) => string[]} SortCallback
     * @typedef {(builder: StatefulCollectionBuilder, widget: HTMLElement) => void} RemoveCallback
     */

    /** @type {HTMLElement} */
    #parent;
    /** @type {Map<string, Object>} */
    #items;
    /**@type {WidgetBuilder} */
    #builder;
    /** @type {AppendPredicate} */
    #shouldAppendPredicate;
    /** @type {AppendCallback} */
    #onAppend;
    /** @type {RemoveCallback} */
    #onRemove;
    /** @type {SortCallback} */
    #sortCallback;
    /** @type {string[]} */
    #orderIndex;

    /**
     * @param {{parent: HTMLElement, builder: WidgetBuilder, shouldAppend: AppendPredicate, sorter: SortCallback, onAppend: AppendCallback, onRemove: RemoveCallback}} args
     */
    constructor(args) {
        super();
        this.#items = new Map();
        this.#builder = args.builder;
        this.#shouldAppendPredicate = args.shouldAppend;
        this.#onAppend = args.onAppend;
        this.#onRemove = args.onRemove;
        this.#parent = args.parent;
        this.#sortCallback = args.sorter;
        this.#orderIndex = [];
    }

    /**
     * 
     * @param {string} id 
     * @param {T} state 
     * @param {{resort: boolean}} args 
     * @returns 
     */
    setItem(id, state, args, builderArgs) {
        builderArgs = builderArgs ?? {};

        if (this.#items.has(id))
        {
            // handle removing item
            if (state == null || (this.#shouldAppendPredicate && !this.#shouldAppendPredicate(id, state))) {
                this.removeItem(id);
                return;
            }
            
            this.rebuildItem(id, state, builderArgs);
        }
        else if (state == null)
            return;
        else {
            if (this.#shouldAppendPredicate && !this.#shouldAppendPredicate(id, state))
                return;

            this.appendItem(id, state, builderArgs, builderArgs);
        }

        if (args && args.resort && this.#sortCallback)
            this.sortItems(state);
    }

    /** @returns {HTMLElement} */
    getItem(id) {
        return this.#items.get(id);
    }

    sortItems(changedItem) {
        // console.log("sort being called");
        // console.log(changedItem);¬
        this.#orderIndex = this.#sortCallback.call(this, Array.from(this.#orderIndex), changedItem);

        for (let i = 0; i < this.#orderIndex.length; i++)
        {
            const item = this.#items.get(this.#orderIndex[i]);
            if (!item) {
                this.#orderIndex.splice(i, 1);
                i--;
                continue;
            }
            this.#parent.appendChild(item);
        }
    }

    rebuildItem(id, state, builderArgs) {
        const currentWidget = this.#items.get(id);
        if (!currentWidget) {
            return;
        }

        // // remove the item if it should not be appended
        // if (this.#shouldAppendPredicate && !this.#shouldAppendPredicate(id, state)) {
        //     this.removeItem(id);
        //     return;
        // }

        const rebuiltWidget = this.#builder(state, builderArgs);
        currentWidget.replaceWith(rebuiltWidget);

        this.#items.set(id, rebuiltWidget);
    }

    removeItem(id) {
        const target = this.#items.get(id);
        if (!target)
            return;
        
        this.#items.delete(id);
        
        if (this.#onRemove)
            this.#onRemove(this, target);
        
        try {
            target.remove();
        } catch (e) {}
    }

    rebuildAll() {

    }

    appendItem(id, state, builderArgs) {
        const widget = this.#builder(state, builderArgs);

        this.#items.set(id, widget);
        this.#orderIndex.push(id);

        if (this.#onAppend)
            this.#onAppend(this, this.#parent, widget, state);
        else
            this.#parent.appendChild(widget);
    }

    hasItem(id) {
        return this.#items.has(id);
    }

    clear() {
        for (const [id, widget] of this.#items.entries())
        {
            if (this.#onRemove)
                this.#onRemove(this, widget);

            try {
                widget.remove();
            } catch(e) {}
        }

        this.#items.clear();
        this.#orderIndex = [];
    }

    /**
     * 
     * @param {(id: string, state: HTMLElement) => void} callback 
     */
    forEachItem(callback) {
        this.#items.forEach((value, key) => {
            callback(key, value);
        })
    }

    itemCount() {
        return this.#items.size;
    }
}

/**
 * @template T
 */
class StatefulListener extends Stateful {
    #setItemCallback

    /**
     * @param {(id: string, state: T, args: any, builderArgs: any)} setItemCallback 
     */
    constructor(setItemCallback) {
        super();
        this.#setItemCallback = setItemCallback;
    }

    setItem(id, state, args, builderArgs) {
        this.#setItemCallback(id, state, args, builderArgs);
    }

    hasItem(id) {
        return true;
    }

    clear() {}
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

    setItem(id, state, args, builderArgs) {
        // sort
        const groupId = this.sortToGroup(id, state);
        const sortedGroup = this.statefulGroups.get(groupId);

        // presence check in sorted group
        if (sortedGroup.hasItem(id)) {
            sortedGroup.setItem(id, state, args, builderArgs);
            return;
        }

        // remove from all groups and re-append item
        this.removeFromAll(id);
        sortedGroup.setItem(id, state, args, builderArgs);
    }

    hasItem(id) {
        throw Error("unimplemented");
    }

    removeFromAll(id) {
        for (const [_, group] of this.statefulGroups.entries())
            group.setItem(id, null);
    }

    clear() {
        for (const [_, group] of this.statefulGroups.entries())
            group.clear();
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
    setState(id, state, args, builderArgs) {
        for (const builder of this.#notifyList)
            builder.setItem(id, state, args, builderArgs);
    }

    flush() {
        for (const stateful of this.#notifyList)
            stateful.clear();

        this.#notifyList = [];
    }
}