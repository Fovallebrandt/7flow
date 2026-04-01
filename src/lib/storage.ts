import { Project, LogEntry, InventoryItem, InventoryConfig, ProjectPhoto, ProjectPhotoStage, ProjectTimeRecord, ProjectTimeSummary } from '../types';
import { normalizeDirection } from './direction';
import { buildProjectTimeRecord, findProjectCompletionTimestamp, summarizeProjectTimeRecords } from './timeStats';

const PROJECTS_KEY = '7flow_projects';
const LOGS_KEY_PREFIX = '7flow_logs_';
const PROJECT_PHOTO_KEY_PREFIX = '7flow_project_photo_';
const PROJECT_TIME_STATS_KEY = '7flow_project_time_stats';
const INVENTORY_KEY = '7flow_inventory';
const INVENTORY_CONFIG_KEY = '7flow_inventory_config';
const USER_PROFILE_KEY = '7flow_user_profile';

export interface UserProfile {
  name: string;
  avatarLetter: string;
}

const DEFAULT_USER: UserProfile = {
  name: 'Fernando',
  avatarLetter: 'F'
};

const DEFAULT_CONFIG: InventoryConfig = {
  improvementOptions: ['Para pintar', 'Para lijar', 'Para pulir', 'Para QA'],
  locationOptions: ['En la casa', 'En la bodega', 'En la cabaña']
};

export const storage = {
  getUserProfile: (): UserProfile => {
    const data = localStorage.getItem(USER_PROFILE_KEY);
    return data ? JSON.parse(data) : DEFAULT_USER;
  },

  saveUserProfile: (profile: UserProfile) => {
    localStorage.setItem(USER_PROFILE_KEY, JSON.stringify(profile));
  },
  
  getProjects: (): Project[] => {
    const data = localStorage.getItem(PROJECTS_KEY);
    const projects = data ? JSON.parse(data) : [];

    return projects.map((project: Project) => ({
      ...project,
      direction: normalizeDirection(project.direction),
    }));
  },
  
  saveProjects: (projects: Project[]) => {
    localStorage.setItem(PROJECTS_KEY, JSON.stringify(projects));
  },
  
  getProject: (id: string): Project | undefined => {
    return storage.getProjects().find(p => p.id === id);
  },
  
  addProject: (project: Omit<Project, 'id'>): string => {
    const projects = storage.getProjects();
    const id = Math.random().toString(36).substr(2, 9);
    const newProject = { ...project, id };
    storage.saveProjects([newProject, ...projects]);
    return id;
  },
  
  updateProject: (id: string, updates: Partial<Project>) => {
    const projects = storage.getProjects();
    const index = projects.findIndex(p => p.id === id);
    if (index !== -1) {
      projects[index] = { ...projects[index], ...updates };
      storage.saveProjects(projects);
    }
  },

  getProjectPhoto: (projectId: string, stage: ProjectPhotoStage): ProjectPhoto | undefined => {
    const data = localStorage.getItem(`${PROJECT_PHOTO_KEY_PREFIX}${projectId}_${stage}`);
    return data ? JSON.parse(data) : undefined;
  },

  saveProjectPhoto: (projectId: string, stage: ProjectPhotoStage, photo: ProjectPhoto) => {
    localStorage.setItem(`${PROJECT_PHOTO_KEY_PREFIX}${projectId}_${stage}`, JSON.stringify(photo));
  },

  deleteProjectPhoto: (projectId: string, stage: ProjectPhotoStage) => {
    localStorage.removeItem(`${PROJECT_PHOTO_KEY_PREFIX}${projectId}_${stage}`);
  },

  getProjectTimeStats: (): ProjectTimeRecord[] => {
    const data = localStorage.getItem(PROJECT_TIME_STATS_KEY);
    return data ? JSON.parse(data) : [];
  },

  saveProjectTimeStats: (stats: ProjectTimeRecord[]) => {
    localStorage.setItem(PROJECT_TIME_STATS_KEY, JSON.stringify(stats));
  },

  recordProjectTimeStat: (projectId: string, completedAt?: string) => {
    const project = storage.getProject(projectId);
    if (!project) return null;

    const completionTimestamp = completedAt || findProjectCompletionTimestamp(storage.getLogs(projectId));
    if (!completionTimestamp) return null;

    const record = buildProjectTimeRecord(project, completionTimestamp);
    if (!record) return null;

    const stats = storage.getProjectTimeStats();
    const index = stats.findIndex((item) => item.projectId === projectId);

    if (index === -1) {
      storage.saveProjectTimeStats([record, ...stats]);
    } else {
      stats[index] = record;
      storage.saveProjectTimeStats(stats);
    }

    return record;
  },

  syncProjectTimeStats: () => {
    const projects = storage.getProjects();
    projects.forEach((project) => {
      if (project.status !== 'Terminado') return;
      storage.recordProjectTimeStat(project.id);
    });
  },

  getProjectTimeSummary: (): ProjectTimeSummary[] => {
    return summarizeProjectTimeRecords(storage.getProjectTimeStats());
  },

  syncProjectPhotosToInventory: (projectId: string) => {
    const photos = {
      before: storage.getProjectPhoto(projectId, 'before'),
      after: storage.getProjectPhoto(projectId, 'after'),
    };

    const items = storage.getInventory();
    let changed = false;

    const nextItems = items.map((item) => {
      if (item.sourceProjectId !== projectId) return item;

      changed = true;
      const hasPhotos = Boolean(photos.before || photos.after);

      if (!hasPhotos) {
        const { projectPhotos, ...rest } = item;
        return rest;
      }

      return {
        ...item,
        projectPhotos: {
          ...(photos.before ? { before: photos.before } : {}),
          ...(photos.after ? { after: photos.after } : {}),
        },
      };
    });

    if (changed) {
      storage.saveInventory(nextItems);
    }
  },

  saveProjectPhotos: (photos: Record<string, Partial<Record<ProjectPhotoStage, ProjectPhoto>>>) => {
    Object.entries(photos).forEach(([projectId, stages]) => {
      (['before', 'after'] as ProjectPhotoStage[]).forEach((stage) => {
        const photo = stages[stage];
        if (photo) {
          storage.saveProjectPhoto(projectId, stage, photo);
        } else {
          storage.deleteProjectPhoto(projectId, stage);
        }
      });
    });
  },

  getProjectPhotos: (): Record<string, Partial<Record<ProjectPhotoStage, ProjectPhoto>>> => {
    const photos: Record<string, Partial<Record<ProjectPhotoStage, ProjectPhoto>>> = {};
    storage.getProjects().forEach((project) => {
      const before = storage.getProjectPhoto(project.id, 'before');
      const after = storage.getProjectPhoto(project.id, 'after');

      if (before || after) {
        photos[project.id] = {};
        if (before) photos[project.id]!.before = before;
        if (after) photos[project.id]!.after = after;
      }
    });

    return photos;
  },
  
  getLogs: (projectId: string): LogEntry[] => {
    const data = localStorage.getItem(`${LOGS_KEY_PREFIX}${projectId}`);
    return data ? JSON.parse(data) : [];
  },
  
  addLog: (projectId: string, log: Omit<LogEntry, 'id'>) => {
    const logs = storage.getLogs(projectId);
    const id = Math.random().toString(36).substr(2, 9);
    const newLog = { ...log, id };
    localStorage.setItem(`${LOGS_KEY_PREFIX}${projectId}`, JSON.stringify([newLog, ...logs]));
    return id;
  },
  
  getAllLogs: (): (LogEntry & { projectId: string })[] => {
    const allLogs: (LogEntry & { projectId: string })[] = [];
    const projects = storage.getProjects();
    projects.forEach(p => {
      const logs = storage.getLogs(p.id);
      logs.forEach(l => allLogs.push({ ...l, projectId: p.id }));
    });
    return allLogs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  },

  // Inventory
  getInventory: (): InventoryItem[] => {
    const data = localStorage.getItem(INVENTORY_KEY);
    return data ? JSON.parse(data) : [];
  },

  saveInventory: (items: InventoryItem[]) => {
    localStorage.setItem(INVENTORY_KEY, JSON.stringify(items));
  },

  addInventoryItem: (item: Omit<InventoryItem, 'id' | 'createdAt' | 'updatedAt'>) => {
    const items = storage.getInventory();
    const id = Math.random().toString(36).substr(2, 9);
    const now = new Date().toISOString();
    const newItem = { ...item, id, createdAt: now, updatedAt: now };
    storage.saveInventory([newItem, ...items]);
    return id;
  },

  updateInventoryItem: (id: string, updates: Partial<InventoryItem>) => {
    const items = storage.getInventory();
    const index = items.findIndex(i => i.id === id);
    if (index !== -1) {
      items[index] = { ...items[index], ...updates, updatedAt: new Date().toISOString() };
      storage.saveInventory(items);
    }
  },

  deleteInventoryItem: (id: string) => {
    const items = storage.getInventory();
    storage.saveInventory(items.filter(i => i.id !== id));
  },

  getInventoryConfig: (): InventoryConfig => {
    const data = localStorage.getItem(INVENTORY_CONFIG_KEY);
    return data ? JSON.parse(data) : DEFAULT_CONFIG;
  },

  saveInventoryConfig: (config: InventoryConfig) => {
    localStorage.setItem(INVENTORY_CONFIG_KEY, JSON.stringify(config));
  },

  getProjectStagnationDays: (projectId: string): number => {
    const project = storage.getProject(projectId);
    if (!project) return 0;
    
    const logs = storage.getLogs(projectId);
    const lastActivity = logs.length > 0 
      ? new Date(logs[0].timestamp) 
      : new Date(project.createdAt);
    
    const now = new Date();
    const diff = now.getTime() - lastActivity.getTime();
    return Math.floor(diff / (24 * 60 * 60 * 1000));
  },

  getStagnantProjects: (daysThreshold: number = 3): Project[] => {
    const projects = storage.getProjects();
    const now = new Date();
    const threshold = daysThreshold * 24 * 60 * 60 * 1000;

    return projects.filter(p => {
      // Only check active or blocked projects, or the current NOW project
      if (p.status === 'Terminado' || p.status === 'Idea') return false;

      const logs = storage.getLogs(p.id);
      const lastActivity = logs.length > 0 
        ? new Date(logs[0].timestamp) 
        : new Date(p.createdAt);

      const diff = now.getTime() - lastActivity.getTime();
      return diff > threshold;
    });
  }
};
