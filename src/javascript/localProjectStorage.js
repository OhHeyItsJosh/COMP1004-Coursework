const PROJECT_DETAILS_KEY = "project-details";

class ProjectDetails {
    /** @type {string} */
    id;
    /** @type {string} */
    name;
    /** @type {number} */
    taskCount;
    /** @type {number} */
    noteCount;

    constructor(id, name, taskCount, noteCount) {
        this.id = id;
        this.name = name;
        this.taskCount = taskCount;
        this.noteCount = noteCount;
    }

    serialise() {
        return JSON.stringify(this);
    }

    static deserialise(str) {
        const obj = JSON.parse(str);
        if (!obj || !obj.id)
            return null;

        obj.__proto__ = ProjectDetails.prototype;

        return obj;
    }

    /**
     * @param {Project} project 
     */
    static fromProject(project) {
        return new ProjectDetails(
            project.id,
            project.name,
            project.tasksHierarchy.nodeCount(),
            project.notesHierarchy.nodeCount()
        );
    }
}

function getProjectLSid(projectId) {
    return `proj-${projectId}`;
}

/** @returns {ProjectDetails[]} */
function getSavedProjects() {
    const savedProjects = _loadSavedProjectsObject();
    return Object.values(savedProjects).map((projectString) => ProjectDetails.deserialise(projectString));
}

/**
 * @param {Project} project 
 */
function saveProjectToLocalStorage(project) {
    // save project data
    localStorage.setItem(getProjectLSid(project.id), project.serialise());

    // set project details
    const savedProjectDetails = _loadSavedProjectsObject();

    savedProjectDetails[project.id] = ProjectDetails.fromProject(project).serialise();
    const savedProjectsString = JSON.stringify(savedProjectDetails);
    localStorage.setItem(PROJECT_DETAILS_KEY, savedProjectsString);
}

/**
 * @param {Project} project 
 */
function removeProjectFromLocalStorage(project) {
    // remove project data
    localStorage.removeItem(getProjectLSid(project.id));

    // remove project details
    const savedProjectDetails = _loadSavedProjectsObject();
    delete savedProjectDetails[project.id];

    localStorage.setItem(PROJECT_DETAILS_KEY, JSON.stringify(savedProjectDetails));
}

function _loadSavedProjectsObject() {
    const savedProjectDetails = JSON.parse(localStorage.getItem(PROJECT_DETAILS_KEY)) ?? {};
    if (typeof savedProjectDetails != "object" || Array.isArray(savedProjectDetails))
        return {};

    return savedProjectDetails;
}

/** @returns {Project} */
function getProjectFromLocalStroage(projectId) {
    return Project.deserialise(localStorage.getItem(getProjectLSid(projectId))); 
}