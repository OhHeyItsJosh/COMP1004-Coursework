const tabHandlers = new Map();

class TabView {
    // Map<{tabId}, {tabObj}>
    tabs;

    constructor(tabs) {
        this.tabs = tabs;
    }

    static fromDOMobj(obj) {
        const tabs = new Map();
        
        const tabObjs = obj.getElementsByClassName("tab");
        for (const tabObj of tabObjs)
        {
            const tabId = tabObj.getAttribute("tab-id");
            if (!tabId)
                continue;

            tabs.set(tabId, tabObj);
        }
        
        return new TabView(tabs);
    }

    setTab(newTabId) {
        for (const [tabId, tabObj] of this.tabs.entries())
        {
            if (newTabId == tabId) {
                tabObj.classList.add("tab-active");
            }
            else {
                if (tabObj.classList.contains("tab-active"))
                    tabObj.classList.remove("tab-active");
            }
        }


    }
}

class TabHandler {
    tabViews;
    currentTab;
    controller;

    constructor(controller) {
        this.tabViews = [];
        this.controller = controller;
    }

    addTabView(tabView) {
        this.tabViews.push(tabView);
    }

    switchTab(tab) {
        for (const tabView of this.tabViews)
        {
            tabView.setTab(tab);
        }

        for (const tabButton of this.controller.children)
        {
            if (tabButton.getAttribute("tab-id") == tab) {
                tabButton.classList.add("selectable-tab-active");
            }
            else {
                if (tabButton.classList.contains("selectable-tab-active"))
                    tabButton.classList.remove("selectable-tab-active");
            }
        }
    }
}

function initTabSystem() {
    initTabHandlers();
    bindTabViews();

    console.log(tabHandlers);
}

function initTabHandlers() {
    const tabControllers = document.getElementsByClassName("tab-controller");

    for (const tabController of tabControllers)
    {
        const controllerId = tabController.getAttribute("tab-controller-id");
        if (!controllerId)
            continue;

        if (tabHandlers.has(controllerId)) {
            console.error(`Error: A tab controller with the id ${controllerId} already exists`);
        }

        tabHandlers.set(controllerId, new TabHandler(tabController));

        const selectableTabs = tabController.getElementsByClassName("selectable-tab");
        for (const selectableTab of selectableTabs)
        {
            bindSelectableTabToHandler(selectableTab, controllerId);
        }
    }
}

function bindTabViews() {
    const tabViews = document.getElementsByClassName("tab-view");

    for (const tabView of tabViews)
    {
        const controllerId = tabView.getAttribute("tab-controller-id");
        if (!controllerId)
            continue;

        if (!tabHandlers.has(controllerId))
            continue;

        tabHandlers.get(controllerId).addTabView(TabView.fromDOMobj(tabView));
    }
}

function bindSelectableTabToHandler(selectableTabObj, controllerId) {
    selectableTabObj.addEventListener("click", () => {
        const handler = tabHandlers.get(controllerId);
        if (!handler)
            return;

        const tabId = selectableTabObj.getAttribute("tab-id");
        if (!tabId)
            return;

        handler.switchTab(tabId);
    });
}

/** @returns {TabHandler} */
function getTabHandler(id) {
    return tabHandlers.get(id);
}

initTabSystem();