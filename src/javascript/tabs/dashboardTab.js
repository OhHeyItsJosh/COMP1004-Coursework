///<reference path="../core.js"/>
///<reference path="../state.js"/>
///<reference path="../prefab.js"/>

const calendarContent = document.getElementById("calendar-content");
const calendarHeader = document.getElementById("calendar-header");
const upcomingTasksContainer = document.getElementById("upcoming-tasks-container");

const DAY_LENGTH_MS = 24 * 60 * 60 * 1000;

function computeDateRange() {
    const now = new Date(Date.now());
    const timeIntoWeek = (now.getDay() + 1) * DAY_LENGTH_MS;

    const start = Date.now() - timeIntoWeek;
    const end = start + (7 * DAY_LENGTH_MS);

    return [ start, end ];
}

/** @type {{start: number, end: number}} */
let currentDateRange;

function initDashboard() {
    const [start, end] = computeDateRange();
    currentDateRange = {
        start: start,
        end: end
    };

    // highlight current day in header
    calendarHeader.children[new Date(Date.now()).getDay()].classList.add("current-day");


}

/** @type {StatefulCollectionBuilder<Task>} */
const calendarItemBuilder = new StatefulCollectionBuilder({
    parent: calendarContent,
    builder: (state, args) => {
        const startIndex = Math.min(Math.floor(Math.max(state.getStartDateRaw() - currentDateRange.start, 0) / DAY_LENGTH_MS) + 1, 7);
        const endIndex = Math.min(Math.floor((state.getEndDateRaw() - currentDateRange.start) / DAY_LENGTH_MS) + 1, 7);
        
        const showCompact = Math.abs(startIndex - endIndex) == 0;        

        // const widget = state.hasParent()
        //     ? buildCalenderSubtask(state, showCompact)
        //     : buildCalendarTask(state, showCompact)

        const widget = buildCalendarTask(state, showCompact);

        widget.onclick = () => {
            showModal(new TaskViewModal(state));
        };

        widget.style["grid-column-start"] = startIndex;
        widget.style["grid-column-end"] = endIndex + 1;

        return widget;
    },
    onAppend: (builder, parent, widget, state) => {
        const container = elementWithClasses("div", ["week-divided"]);
        container.appendChild(widget);

        parent.appendChild(container);
    },
    shouldAppend: (widget, state) => state.isInDateRange(currentDateRange.start, currentDateRange.end),
    onRemove: (builder, widget) => {
        widget.parentElement.remove();
    }
});

/** @type {StatefulCollectionBuilder<Task>} */
const upcomingTasksBuilder = new StatefulCollectionBuilder({
    parent: upcomingTasksContainer,
    builder: buildTaskCard,
    shouldAppend: (widget, state) => {
        const now = new Date(Date.now());

        const hoursIn = now.getHours() * 60 * 60 * 1000;
        const minutesIn = now.getMinutes() * 60 * 1000;
        const secondsIn = now.getSeconds() * 60 * 1000;

        const dayStart = Date.now() - hoursIn - minutesIn - secondsIn;

        return state.getEndDateRaw() > dayStart && state.getEndDateRaw() < Date.now() + (3 * DAY_LENGTH_MS);
    },
    onAppend: (builder, parent, widget, state) => {
        updateUpcomingTaskCount(builder.itemCount());
        parent.appendChild(widget);
    },
    onRemove: (builder, widget) => {
        updateUpcomingTaskCount(builder.itemCount());
    }
})

const upcomingTaskCounter = document.getElementById("upcoming-task-count");

function updateUpcomingTaskCount(count) {
    upcomingTaskCounter.innerText = count;
}

/**
 * @param {Task} task 
 */
function buildCalendarTask(task, compact) {
    const builder = fetchPrefab("calendar-task");

    builder.setVariableContent("name", task.getName());
    builder.setVariableContent("description", capString(task.getDescription(), 100));

    applyTaskStatusToElement(builder.getVariable("status"), task);

    if (compact) {
        builder.getVariable("description").remove();
        builder.getVariable("status").remove();
    }

    return builder.getElement();
}

/**
 * @param {Task} task 
 */
function buildCalenderSubtask(task, compact) {
    const builder = fetchPrefab("calender-subtask");
    
    builder.setVariableContent("name", task.getName());
    applyTaskStatusToElement(builder.getVariable("status"), task);

    if (compact) {
        builder.getVariable("status").remove();
    }

    return builder.getElement();
}

initDashboard();