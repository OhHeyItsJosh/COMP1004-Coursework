///<reference path="../core.js"/>
///<reference path="../state.js"/>
///<reference path="../prefab.js"/>

const calendarContent = document.getElementById("calendar-content");
const calendarHeader = document.getElementById("calendar-header");
const upcomingTasksContainer = document.getElementById("upcoming-tasks-container");

const SECOND_LENGTH_MS = 1000;
const MINUTE_LENGTH_MS = SECOND_LENGTH_MS * 60;
const HOUR_LENGTH_MS = MINUTE_LENGTH_MS * 60;
const DAY_LENGTH_MS = 24 * HOUR_LENGTH_MS;

function computeDateRange() {
    const now = new Date(Date.now());
    const timeIntoWeek = ((now.getDay()) * DAY_LENGTH_MS) + (now.getHours() * HOUR_LENGTH_MS) + (now.getMinutes() * MINUTE_LENGTH_MS) + (now.getSeconds() * SECOND_LENGTH_MS) + now.getMilliseconds();

    const start = Date.now() - timeIntoWeek;
    const end = start + (7 * DAY_LENGTH_MS);

    return { start, end };
}

/** @type {{start: number, end: number}} */
let currentDateRange;

function initDashboard() {
    currentDateRange = computeDateRange();
    initProgressGraph();

    // highlight current day in header
    calendarHeader.children[new Date(Date.now()).getDay()].classList.add("current-day");
}

const pgRows = document.getElementById("pg-rows");
const pgColumns = document.getElementById("pg-columns");
const pgLabels = document.getElementById("pg-labels");

const PG_COLUMNS = ["S", "M", "T", "W", "T", "F", "S"];
const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function initProgressGraph() {
    for (let i = 0; i < PG_COLUMNS.length; i++)
    {
        const column = elementWithClasses("div", ["pg-column"]);
        column.appendChild(elementWithClasses("div", ["pg-started-section"]));
        column.appendChild(elementWithClasses("div", ["pg-completed-section"]));

        pgColumns.appendChild(column);

        const label = elementWithClasses("h3", ["pg-label", "expanded"]);
        label.innerText = PG_COLUMNS[i];
        pgLabels.appendChild(label);
    }
}

function redrawProgressGraph() {
    console.log("redrawing progress graph");
    const graphData = new Array(7);
    let highestTaskCount = 0;

    for (let i = 0; i < 7; i++)
    {
        const dayTS = currentDateRange.start + (DAY_LENGTH_MS * i);
        const dayData = progressTracker.getTaskProgressInDateRange(dayTS, dayTS + DAY_LENGTH_MS);

        graphData[i] = dayData;

        const taskCount = dayData.completed.length + dayData.started.length;
        highestTaskCount = Math.max(highestTaskCount, taskCount);
    }

    console.log(graphData);

    const graphMax = Math.ceil(highestTaskCount / 4) * 4;

    pgRows.children[0].innerText = graphMax * 0.75;
    pgRows.children[1].innerText = graphMax * 0.5;
    pgRows.children[2].innerText = graphMax * 0.25;

    for (let i = 0; i < 7; i++)
    {
        const column = pgColumns.children[i];
        column.style.height = `${((graphData[i].completed.length + graphData[i].started.length) / graphMax) * 100}%`;

        const startedSection = column.querySelector(".pg-started-section");
        const completedSection = column.querySelector(".pg-completed-section");

        startedSection.style.flex = graphData[i].started.length;
        completedSection.style.flex = graphData[i].completed.length;

        column.onclick = () => {
            showModal(new ProgressViewModal(DAYS[i], graphData[i]))
        };
    }
}

class ProgressViewModal extends Modal {

    day;
    progress;

    /** @type {StatefulCollectionBuilder<Task>} */
    startedTaskBuilder;
    /** @type {StatefulCollectionBuilder<Task>} */
    completedTaskBuilder;

    constructor(day, progress) {
        super();
        this.day = day;
        this.progress = progress;
    }

    build() {
        const builder = fetchPrefab("progress-view-modal");
        builder.setVariableContent("title", `Progress on ${this.day}`);

        builder.setVariableContent("started-lbl", `Started - ${this.progress.started.length}`);
        builder.setVariableContent("completed-lbl", `Completed - ${this.progress.completed.length}`);
        
        /**
         * @param {Task} task 
         * @param {boolean} forCompleted 
         * @returns 
         */
        const buildTaskWithDate = (task, forCompleted) => {
            const taskContainer = elementWithClasses("div", ["flex-column"]);

            const timestamp = document.createElement("h4");
            timestamp.innerText = getDateString(new Date(forCompleted ? task.getCompletedAt() : task.getStartedAt()), true);
            const taskCard = buildTaskCard(task);

            taskContainer.appendChild(timestamp);
            taskContainer.appendChild(taskCard);

            return taskContainer;
        }

        // builder for started tasks
        this.startedTaskBuilder = new StatefulCollectionBuilder({
            parent: builder.getVariable("started-tasks"),
            builder: (task) => buildTaskWithDate(task, false),
            shouldAppend: (widget, state) => this.progress.started.includes(state)
        });

        // add started tasks to builder
        for (const task of this.progress.started)
            this.startedTaskBuilder.setItem(task.getId(), task);

        // builder for completed tasks
        this.completedTaskBuilder = new StatefulCollectionBuilder({
            parent: builder.getVariable("completed-tasks"),
            builder: (task) => buildTaskWithDate(task, true),
            shouldAppend: (widget, state) => this.progress.completed.includes(state)
        });

        // add completed tasks to builder
        for (const task of this.progress.completed)
            this.completedTaskBuilder.setItem(task.getId(), task);

        taskStateNotifier.addBuilder(this.startedTaskBuilder);
        taskStateNotifier.addBuilder(this.completedTaskBuilder);

        return builder.getElement();
    }

    onClose() {
        taskStateNotifier.removeBuilder(this.startedTaskBuilder);
        taskStateNotifier.removeBuilder(this.completedTaskBuilder);
    }
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