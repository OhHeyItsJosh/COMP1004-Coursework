/**
 * @template T
 */
class StatefulCollectionBuilder {
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
        this.#items = new Map();
        this.#builder = args.builder;
        this.#onAppend = args.onAppend;
    }

    rebuildItem(id, state) {
        const currentWidget = this.#items.get(id);
        if (!currentWidget)
            return;

        const rebuiltWidget = this.#builder(state);
        currentWidget.innerHTML = rebuiltWidget.innerHTML;
    }

    rebuildAll() {

    }

    appendItem(id, state) {
        const widget = this.#builder(state);
        this.#onAppend(widget, state);

        this.#items.set(id, widget);
    }
}