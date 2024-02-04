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
    setItem(id, state) {};

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
     * @typedef {(widget: Object, state: T) => void} AppendCallback
     */

    /** @type {Map<string, Object>} */
    #items;
    /**@type {WidgetBuilder} */
    #builder;
    /** @type {AppendCallback} */
    #onAppend;

    /**
     * @param {{builder: WidgetBuilder, onAppend: AppendCallback}} args
     */
    constructor(args) {
        super();
        this.#items = new Map();
        this.#builder = args.builder;
        this.#onAppend = args.onAppend;
    }

    setItem(id, state) {
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
        this.#onAppend(widget, state);

        this.#items.set(id, widget);
    }

    hasItem(id) {
        return this.#items.has(id);
    }
}

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

    setItem(id, state) {
        // sort
        const groupId = this.sortToGroup(id, state);
        const sortedGroup = this.statefulGroups.get(groupId);

        // presence check in sorted group
        if (sortedGroup.hasItem(id)) {
            sortedGroup.setItem(id, state);
            return;
        }

        // remove from all groups and re-append item
        this.removeFromAll(id);
        sortedGroup.setItem(id, state);
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
    setState(id, state) {
        for (const builder of this.#notifyList)
        {
            builder.setItem(id, state);
        }
    }
}