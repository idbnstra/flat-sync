/**
 * FlatSync Projects Management
 * Handles storage and retrieval of image pairs (projects) and their calibrations.
 */

const STORAGE_KEY = 'flatsync_projects';
const CALIBRATION_STORAGE_KEY = 'flatCalibration_'; // Postfix with project ID

const DEFAULT_PROJECTS = [
    {
        id: 'denver-central',
        name: 'Denver Central (1930s vs Modern)',
        modernUrl: 'images/streetview_qG9OSpzmP62gz4aEXgARvA_high.jpg',
        historicalUrl: 'images/centralpano_old.tif',
        description: 'Downtown Denver historical comparison.',
        dateCreated: Date.now()
    }
];

class ProjectManager {
    constructor() {
        this.projects = this._loadProjects();
    }

    _loadProjects() {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                // Merge with defaults to ensure they always exist
                const merged = [...DEFAULT_PROJECTS];
                parsed.forEach(p => {
                    if (!merged.find(m => m.id === p.id)) {
                        merged.push(p);
                    }
                });
                return merged;
            } catch (e) {
                console.error('Failed to parse projects from localStorage', e);
                return [...DEFAULT_PROJECTS];
            }
        }
        return [...DEFAULT_PROJECTS];
    }

    _saveToStorage() {
        // Only save user-added projects (non-defaults)
        const userProjects = this.projects.filter(p => !DEFAULT_PROJECTS.find(d => d.id === p.id));
        localStorage.setItem(STORAGE_KEY, JSON.stringify(userProjects));
    }

    getAllProjects() {
        return this.projects;
    }

    getProject(id) {
        return this.projects.find(p => p.id === id) || this.projects[0];
    }

    addProject(project) {
        const newProject = {
            id: project.id || `proj-${Date.now()}`,
            name: project.name || 'Untitled Project',
            modernUrl: project.modernUrl || '',
            historicalUrl: project.historicalUrl || '',
            description: project.description || '',
            dateCreated: Date.now(),
            ...project
        };
        this.projects.push(newProject);
        this._saveToStorage();
        return newProject;
    }

    deleteProject(id) {
        if (DEFAULT_PROJECTS.find(d => d.id === id)) {
            console.warn('Cannot delete a default project');
            return false;
        }
        this.projects = this.projects.filter(p => p.id !== id);
        this._saveToStorage();
        // Also clean up calibration
        localStorage.removeItem(CALIBRATION_STORAGE_KEY + id);
        return true;
    }

    getCalibration(id) {
        const saved = localStorage.getItem(CALIBRATION_STORAGE_KEY + id);
        if (saved) {
            try {
                return JSON.parse(saved);
            } catch (e) {
                return null;
            }
        }
        return null;
    }

    saveCalibration(id, calibration) {
        localStorage.setItem(CALIBRATION_STORAGE_KEY + id, JSON.stringify(calibration));
    }
}

// Export a singleton instance
window.projectManager = new ProjectManager();
