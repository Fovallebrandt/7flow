import {
  Project,
  LogEntry,
  InventoryItem,
  InventoryCategory,
  InventoryConfig,
  ProjectPhoto,
  ProjectPhotoStage,
  ProjectPhotos,
  ProjectTimeRecord,
  ProjectTimeSummary,
  AppMode,
  Task,
  TaskPriority,
  TaskStatus,
  ProductionCostCategory,
  ProductionQuote,
  ProductionQuoteStatus,
  ProjectCostRecord,
  ProjectProductionData,
  ProjectProductionSummary,
  Provider,
  PurchasePlanItem,
  PurchasePlanStatus,
} from '../types';
import { normalizeDirection } from './direction';
import { buildProjectTimeRecord, findProjectCompletionTimestamp, summarizeProjectTimeRecords } from './timeStats';

const PROJECTS_KEY = '7flow_projects';
const LOGS_KEY_PREFIX = '7flow_logs_';
const PROJECT_PHOTO_KEY_PREFIX = '7flow_project_photo_';
const PROJECT_PROCESS_PHOTOS_KEY_PREFIX = '7flow_project_process_photos_';
const PROJECT_PRODUCTION_KEY_PREFIX = '7flow_project_production_';
const PROJECT_TIME_STATS_KEY = '7flow_project_time_stats';
const INVENTORY_KEY = '7flow_inventory';
const INVENTORY_CONFIG_KEY = '7flow_inventory_config';
const USER_PROFILE_KEY = '7flow_user_profile';
const PROVIDERS_KEY = '7flow_providers';
const TASKS_KEY = '7flow_tasks';

export interface UserProfile {
  name: string;
  avatarLetter: string;
  mode: AppMode;
}

const DEFAULT_USER: UserProfile = {
  name: 'Fernando',
  avatarLetter: 'F',
  mode: 'Creativo',
};

const DEFAULT_CONFIG: InventoryConfig = {
  improvementOptions: ['Para pintar', 'Para lijar', 'Para pulir', 'Para QA'],
  locationOptions: ['En la casa', 'En la bodega', 'En la cabaña']
};

const INVENTORY_CATEGORIES: InventoryCategory[] = ['Material', 'Herramienta', 'Producto', 'Contenido', 'Software', 'Insumo', 'Otro'];
const PRODUCTION_CATEGORIES: ProductionCostCategory[] = ['Materiales', 'Herramientas', 'Servicios', 'Transporte', 'Mano de obra', 'Otros'];
const QUOTE_STATUSES: ProductionQuoteStatus[] = ['Cotizada', 'En compra', 'Descartada'];
const PURCHASE_STATUSES: PurchasePlanStatus[] = ['Pendiente', 'Comprado', 'Cancelado'];
const TASK_STATUSES: TaskStatus[] = ['Pendiente', 'En progreso', 'Hecha', 'Cancelada'];
const TASK_PRIORITIES: TaskPriority[] = ['Hoy', 'Pronto', 'Algún día'];

const createId = () => Math.random().toString(36).substr(2, 9);

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const readJson = <T,>(key: string, fallback: T): T => {
  const data = localStorage.getItem(key);
  if (!data) return fallback;

  try {
    return JSON.parse(data) as T;
  } catch (error) {
    console.warn(`Ignoring invalid localStorage JSON for ${key}`, error);
    return fallback;
  }
};

const writeJson = (key: string, value: unknown) => {
  localStorage.setItem(key, JSON.stringify(value));
};

const toAmount = (value: unknown) => {
  const amount = Number(value);
  return Number.isFinite(amount) ? Math.max(0, Math.round(amount)) : 0;
};

const normalizeProductionCategory = (category: unknown): ProductionCostCategory =>
  PRODUCTION_CATEGORIES.includes(category as ProductionCostCategory)
    ? category as ProductionCostCategory
    : 'Otros';

const normalizeInventoryItem = (item: InventoryItem): InventoryItem => ({
  ...item,
  category: INVENTORY_CATEGORIES.includes(item.category) ? item.category : 'Otro',
  quantity: Number.isFinite(item.quantity) && item.quantity > 0 ? item.quantity : 1,
  unitCost: Number.isFinite(item.unitCost) && Number(item.unitCost) > 0 ? Number(item.unitCost) : undefined,
});

const normalizeInventoryConfig = (config?: Partial<InventoryConfig> | null): InventoryConfig => ({
  improvementOptions: Array.isArray(config?.improvementOptions)
    ? config.improvementOptions.filter((option): option is string => typeof option === 'string' && option.trim().length > 0)
    : DEFAULT_CONFIG.improvementOptions,
  locationOptions: Array.isArray(config?.locationOptions)
    ? config.locationOptions.filter((option): option is string => typeof option === 'string' && option.trim().length > 0)
    : DEFAULT_CONFIG.locationOptions,
});

const normalizeUserProfile = (profile?: Partial<UserProfile> | null): UserProfile => ({
  name: typeof profile?.name === 'string' && profile.name.trim() ? profile.name : DEFAULT_USER.name,
  avatarLetter: typeof profile?.avatarLetter === 'string' && profile.avatarLetter.trim()
    ? profile.avatarLetter
    : DEFAULT_USER.avatarLetter,
  mode: profile?.mode === 'Produccion' ? 'Produccion' : 'Creativo',
});

const normalizeQuote = (quote: Partial<ProductionQuote>): ProductionQuote => {
  const now = new Date().toISOString();
  return {
    id: typeof quote.id === 'string' && quote.id ? quote.id : createId(),
    provider: typeof quote.provider === 'string' ? quote.provider : '',
    itemName: typeof quote.itemName === 'string' ? quote.itemName : '',
    category: normalizeProductionCategory(quote.category),
    quantity: toAmount(quote.quantity) || 1,
    unitPrice: toAmount(quote.unitPrice),
    contact: typeof quote.contact === 'string' ? quote.contact : '',
    notes: typeof quote.notes === 'string' ? quote.notes : '',
    status: QUOTE_STATUSES.includes(quote.status as ProductionQuoteStatus) ? quote.status as ProductionQuoteStatus : 'Cotizada',
    createdAt: typeof quote.createdAt === 'string' ? quote.createdAt : now,
    updatedAt: typeof quote.updatedAt === 'string' ? quote.updatedAt : now,
  };
};

const normalizePurchase = (purchase: Partial<PurchasePlanItem>): PurchasePlanItem => {
  const now = new Date().toISOString();
  return {
    id: typeof purchase.id === 'string' && purchase.id ? purchase.id : createId(),
    itemName: typeof purchase.itemName === 'string' ? purchase.itemName : '',
    category: normalizeProductionCategory(purchase.category),
    quantity: toAmount(purchase.quantity) || 1,
    estimatedUnitCost: toAmount(purchase.estimatedUnitCost),
    provider: typeof purchase.provider === 'string' && purchase.provider ? purchase.provider : undefined,
    quoteId: typeof purchase.quoteId === 'string' && purchase.quoteId ? purchase.quoteId : undefined,
    status: PURCHASE_STATUSES.includes(purchase.status as PurchasePlanStatus) ? purchase.status as PurchasePlanStatus : 'Pendiente',
    createdAt: typeof purchase.createdAt === 'string' ? purchase.createdAt : now,
    updatedAt: typeof purchase.updatedAt === 'string' ? purchase.updatedAt : now,
    purchasedAt: typeof purchase.purchasedAt === 'string' ? purchase.purchasedAt : undefined,
  };
};

const normalizeCost = (cost: Partial<ProjectCostRecord>): ProjectCostRecord => {
  const quantity = toAmount(cost.quantity) || 1;
  const unitCost = toAmount(cost.unitCost);
  return {
    id: typeof cost.id === 'string' && cost.id ? cost.id : createId(),
    itemName: typeof cost.itemName === 'string' ? cost.itemName : '',
    category: normalizeProductionCategory(cost.category),
    quantity,
    unitCost,
    total: toAmount(cost.total) || quantity * unitCost,
    provider: typeof cost.provider === 'string' && cost.provider ? cost.provider : undefined,
    purchaseId: typeof cost.purchaseId === 'string' && cost.purchaseId ? cost.purchaseId : undefined,
    createdAt: typeof cost.createdAt === 'string' ? cost.createdAt : new Date().toISOString(),
  };
};

const normalizeProductionData = (data?: Partial<ProjectProductionData> | null): ProjectProductionData => ({
  quotes: Array.isArray(data?.quotes) ? data.quotes.map(normalizeQuote) : [],
  purchases: Array.isArray(data?.purchases) ? data.purchases.map(normalizePurchase) : [],
  costs: Array.isArray(data?.costs) ? data.costs.map(normalizeCost) : [],
});

const normalizeProvider = (provider: Partial<Provider>): Provider => {
  const now = new Date().toISOString();
  return {
    id: typeof provider.id === 'string' && provider.id ? provider.id : createId(),
    name: typeof provider.name === 'string' ? provider.name : '',
    category: normalizeProductionCategory(provider.category),
    contact: typeof provider.contact === 'string' ? provider.contact : '',
    phone: typeof provider.phone === 'string' ? provider.phone : '',
    email: typeof provider.email === 'string' ? provider.email : '',
    website: typeof provider.website === 'string' ? provider.website : '',
    address: typeof provider.address === 'string' ? provider.address : '',
    notes: typeof provider.notes === 'string' ? provider.notes : '',
    archived: provider.archived === true,
    createdAt: typeof provider.createdAt === 'string' ? provider.createdAt : now,
    updatedAt: typeof provider.updatedAt === 'string' ? provider.updatedAt : now,
  };
};

const normalizeTask = (task: Partial<Task>): Task => {
  const now = new Date().toISOString();
  const status = TASK_STATUSES.includes(task.status as TaskStatus) ? task.status as TaskStatus : 'Pendiente';

  return {
    id: typeof task.id === 'string' && task.id ? task.id : createId(),
    title: typeof task.title === 'string' ? task.title : '',
    notes: typeof task.notes === 'string' ? task.notes : '',
    status,
    priority: TASK_PRIORITIES.includes(task.priority as TaskPriority) ? task.priority as TaskPriority : 'Hoy',
    projectId: typeof task.projectId === 'string' && task.projectId ? task.projectId : undefined,
    createdAt: typeof task.createdAt === 'string' ? task.createdAt : now,
    updatedAt: typeof task.updatedAt === 'string' ? task.updatedAt : now,
    dueAt: typeof task.dueAt === 'string' && task.dueAt ? task.dueAt : undefined,
    completedAt: typeof task.completedAt === 'string' && task.completedAt
      ? task.completedAt
      : status === 'Hecha'
        ? now
        : undefined,
  };
};

export const storage = {
  getUserProfile: (): UserProfile => {
    return normalizeUserProfile(readJson<Partial<UserProfile> | null>(USER_PROFILE_KEY, DEFAULT_USER));
  },

  saveUserProfile: (profile: UserProfile) => {
    writeJson(USER_PROFILE_KEY, normalizeUserProfile(profile));
  },
  
  getProjects: (): Project[] => {
    const projects = readJson<Partial<Project>[]>(PROJECTS_KEY, []);
    if (!Array.isArray(projects)) return [];

    return projects.filter(isRecord).map((project) => ({
      ...project,
      direction: normalizeDirection(project.direction),
      productionEnabled: project.productionEnabled === true,
    } as Project));
  },
  
  saveProjects: (projects: Project[]) => {
    writeJson(PROJECTS_KEY, projects);
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
    const photo = readJson<ProjectPhoto | null>(`${PROJECT_PHOTO_KEY_PREFIX}${projectId}_${stage}`, null);
    return isRecord(photo) ? photo as ProjectPhoto : undefined;
  },

  saveProjectPhoto: (projectId: string, stage: ProjectPhotoStage, photo: ProjectPhoto) => {
    writeJson(`${PROJECT_PHOTO_KEY_PREFIX}${projectId}_${stage}`, photo);
  },

  deleteProjectPhoto: (projectId: string, stage: ProjectPhotoStage) => {
    localStorage.removeItem(`${PROJECT_PHOTO_KEY_PREFIX}${projectId}_${stage}`);
  },

  getProjectProcessPhotos: (projectId: string): ProjectPhoto[] => {
    const photos = readJson<ProjectPhoto[]>(`${PROJECT_PROCESS_PHOTOS_KEY_PREFIX}${projectId}`, []);
    return Array.isArray(photos) ? photos.filter(isRecord) as ProjectPhoto[] : [];
  },

  saveProjectProcessPhotos: (projectId: string, photos: ProjectPhoto[]) => {
    writeJson(`${PROJECT_PROCESS_PHOTOS_KEY_PREFIX}${projectId}`, photos);
  },

  addProjectProcessPhoto: (projectId: string, photo: ProjectPhoto) => {
    const photos = storage.getProjectProcessPhotos(projectId);
    const newPhoto = { ...photo, id: photo.id || Math.random().toString(36).substr(2, 9) };
    storage.saveProjectProcessPhotos(projectId, [newPhoto, ...photos]);
    return newPhoto.id;
  },

  deleteProjectProcessPhoto: (projectId: string, photoId: string) => {
    const photos = storage.getProjectProcessPhotos(projectId);
    storage.saveProjectProcessPhotos(projectId, photos.filter((photo) => photo.id !== photoId));
  },

  getProjectTimeStats: (): ProjectTimeRecord[] => {
    const stats = readJson<ProjectTimeRecord[]>(PROJECT_TIME_STATS_KEY, []);
    return Array.isArray(stats) ? stats.filter(isRecord) as ProjectTimeRecord[] : [];
  },

  saveProjectTimeStats: (stats: ProjectTimeRecord[]) => {
    writeJson(PROJECT_TIME_STATS_KEY, stats);
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
      process: storage.getProjectProcessPhotos(projectId),
    };

    const items = storage.getInventory();
    let changed = false;

    const nextItems = items.map((item) => {
      if (item.sourceProjectId !== projectId) return item;

      changed = true;
      const hasPhotos = Boolean(photos.before || photos.after || photos.process.length > 0);

      if (!hasPhotos) {
        const { projectPhotos, ...rest } = item;
        return rest;
      }

      return {
        ...item,
        projectPhotos: {
          ...(photos.before ? { before: photos.before } : {}),
          ...(photos.after ? { after: photos.after } : {}),
          ...(photos.process.length > 0 ? { process: photos.process } : {}),
        },
      };
    });

    if (changed) {
      storage.saveInventory(nextItems);
    }
  },

  saveProjectPhotos: (photos: Record<string, ProjectPhotos>) => {
    if (!isRecord(photos)) return;

    Object.entries(photos).forEach(([projectId, stages]) => {
      if (!isRecord(stages)) return;

      (['before', 'after'] as ProjectPhotoStage[]).forEach((stage) => {
        const photo = stages[stage];
        if (photo) {
          storage.saveProjectPhoto(projectId, stage, photo);
        } else {
          storage.deleteProjectPhoto(projectId, stage);
        }
      });

      storage.saveProjectProcessPhotos(projectId, Array.isArray(stages.process) ? stages.process : []);
    });
  },

  getProjectPhotos: (): Record<string, ProjectPhotos> => {
    const photos: Record<string, ProjectPhotos> = {};
    storage.getProjects().forEach((project) => {
      const before = storage.getProjectPhoto(project.id, 'before');
      const after = storage.getProjectPhoto(project.id, 'after');
      const process = storage.getProjectProcessPhotos(project.id);

      if (before || after || process.length > 0) {
        photos[project.id] = {};
        if (before) photos[project.id]!.before = before;
        if (after) photos[project.id]!.after = after;
        if (process.length > 0) photos[project.id]!.process = process;
      }
    });

    return photos;
  },
  
  getLogs: (projectId: string): LogEntry[] => {
    const logs = readJson<LogEntry[]>(`${LOGS_KEY_PREFIX}${projectId}`, []);
    return Array.isArray(logs) ? logs.filter(isRecord) as LogEntry[] : [];
  },

  saveLogs: (projectId: string, logs: LogEntry[]) => {
    writeJson(`${LOGS_KEY_PREFIX}${projectId}`, Array.isArray(logs) ? logs.filter(isRecord) : []);
  },
  
  addLog: (projectId: string, log: Omit<LogEntry, 'id'>) => {
    const logs = storage.getLogs(projectId);
    const id = Math.random().toString(36).substr(2, 9);
    const newLog = { ...log, id };
    storage.saveLogs(projectId, [newLog, ...logs]);
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

  getProviders: (): Provider[] => {
    const providers = readJson<Partial<Provider>[]>(PROVIDERS_KEY, []);
    return Array.isArray(providers) ? providers.map(normalizeProvider) : [];
  },

  saveProviders: (providers: Provider[]) => {
    writeJson(PROVIDERS_KEY, providers.map(normalizeProvider));
  },

  addProvider: (provider: Omit<Provider, 'id' | 'createdAt' | 'updatedAt'>) => {
    const providers = storage.getProviders();
    const now = new Date().toISOString();
    const newProvider = normalizeProvider({ ...provider, id: createId(), createdAt: now, updatedAt: now });
    storage.saveProviders([newProvider, ...providers]);
    return newProvider.id;
  },

  updateProvider: (providerId: string, updates: Partial<Provider>) => {
    const providers = storage.getProviders();
    storage.saveProviders(providers.map((provider) =>
      provider.id === providerId
        ? normalizeProvider({ ...provider, ...updates, updatedAt: new Date().toISOString() })
        : provider,
    ));
  },

  deleteProvider: (providerId: string) => {
    storage.saveProviders(storage.getProviders().filter((provider) => provider.id !== providerId));
  },

  getTasks: (): Task[] => {
    const tasks = readJson<Partial<Task>[]>(TASKS_KEY, []);
    return Array.isArray(tasks) ? tasks.filter(isRecord).map(normalizeTask) : [];
  },

  saveTasks: (tasks: Task[]) => {
    writeJson(TASKS_KEY, tasks.map(normalizeTask));
  },

  addTask: (task: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>) => {
    const now = new Date().toISOString();
    const newTask = normalizeTask({ ...task, id: createId(), createdAt: now, updatedAt: now });
    storage.saveTasks([newTask, ...storage.getTasks()]);
    return newTask.id;
  },

  updateTask: (taskId: string, updates: Partial<Task>) => {
    const now = new Date().toISOString();
    storage.saveTasks(storage.getTasks().map((task) => {
      if (task.id !== taskId) return task;

      const nextStatus = updates.status ?? task.status;
      return normalizeTask({
        ...task,
        ...updates,
        updatedAt: now,
        completedAt: nextStatus === 'Hecha' ? updates.completedAt || task.completedAt || now : undefined,
      });
    }));
  },

  deleteTask: (taskId: string) => {
    storage.saveTasks(storage.getTasks().filter((task) => task.id !== taskId));
  },

  getProjectTasks: (projectId: string): Task[] => {
    return storage.getTasks().filter((task) => task.projectId === projectId);
  },

  getProjectProduction: (projectId: string): ProjectProductionData => {
    return normalizeProductionData(readJson<Partial<ProjectProductionData> | null>(`${PROJECT_PRODUCTION_KEY_PREFIX}${projectId}`, null));
  },

  saveProjectProduction: (projectId: string, data: ProjectProductionData) => {
    writeJson(`${PROJECT_PRODUCTION_KEY_PREFIX}${projectId}`, normalizeProductionData(data));
  },

  getAllProjectProduction: (): Record<string, ProjectProductionData> => {
    return storage.getProjects().reduce((acc, project) => {
      const data = storage.getProjectProduction(project.id);
      if (data.quotes.length || data.purchases.length || data.costs.length) {
        acc[project.id] = data;
      }
      return acc;
    }, {} as Record<string, ProjectProductionData>);
  },

  saveAllProjectProduction: (production: Record<string, ProjectProductionData>) => {
    if (!isRecord(production)) return;

    Object.entries(production).forEach(([projectId, data]) => {
      storage.saveProjectProduction(projectId, data);
    });
  },

  addQuote: (projectId: string, quote: Omit<ProductionQuote, 'id' | 'createdAt' | 'updatedAt'>) => {
    const data = storage.getProjectProduction(projectId);
    const now = new Date().toISOString();
    const newQuote = normalizeQuote({ ...quote, id: createId(), createdAt: now, updatedAt: now });
    storage.saveProjectProduction(projectId, { ...data, quotes: [newQuote, ...data.quotes] });
    return newQuote.id;
  },

  updateQuote: (projectId: string, quoteId: string, updates: Partial<ProductionQuote>) => {
    const data = storage.getProjectProduction(projectId);
    const quotes = data.quotes.map((quote) =>
      quote.id === quoteId ? normalizeQuote({ ...quote, ...updates, updatedAt: new Date().toISOString() }) : quote,
    );
    storage.saveProjectProduction(projectId, { ...data, quotes });
  },

  deleteQuote: (projectId: string, quoteId: string) => {
    const data = storage.getProjectProduction(projectId);
    storage.saveProjectProduction(projectId, {
      ...data,
      quotes: data.quotes.filter((quote) => quote.id !== quoteId),
    });
  },

  addPurchasePlanItem: (projectId: string, item: Omit<PurchasePlanItem, 'id' | 'createdAt' | 'updatedAt'>) => {
    const data = storage.getProjectProduction(projectId);
    const now = new Date().toISOString();
    const newItem = normalizePurchase({ ...item, id: createId(), createdAt: now, updatedAt: now });
    storage.saveProjectProduction(projectId, { ...data, purchases: [newItem, ...data.purchases] });
    return newItem.id;
  },

  updatePurchasePlanItem: (projectId: string, purchaseId: string, updates: Partial<PurchasePlanItem>) => {
    const data = storage.getProjectProduction(projectId);
    const purchases = data.purchases.map((purchase) =>
      purchase.id === purchaseId ? normalizePurchase({ ...purchase, ...updates, updatedAt: new Date().toISOString() }) : purchase,
    );
    storage.saveProjectProduction(projectId, { ...data, purchases });
  },

  deletePurchasePlanItem: (projectId: string, purchaseId: string) => {
    const data = storage.getProjectProduction(projectId);
    storage.saveProjectProduction(projectId, {
      ...data,
      purchases: data.purchases.filter((purchase) => purchase.id !== purchaseId),
    });
  },

  convertQuoteToPurchase: (projectId: string, quoteId: string) => {
    const data = storage.getProjectProduction(projectId);
    const quote = data.quotes.find((item) => item.id === quoteId);
    if (!quote) return null;

    const now = new Date().toISOString();
    const purchase = normalizePurchase({
      id: createId(),
      itemName: quote.itemName,
      category: quote.category,
      quantity: quote.quantity,
      estimatedUnitCost: quote.unitPrice,
      provider: quote.provider,
      quoteId: quote.id,
      status: 'Pendiente',
      createdAt: now,
      updatedAt: now,
    });

    storage.saveProjectProduction(projectId, {
      quotes: data.quotes.map((item) =>
        item.id === quoteId ? normalizeQuote({ ...item, status: 'En compra', updatedAt: now }) : item,
      ),
      purchases: [purchase, ...data.purchases],
      costs: data.costs,
    });

    return purchase.id;
  },

  addCostRecord: (projectId: string, cost: Omit<ProjectCostRecord, 'id' | 'createdAt' | 'total'> & { total?: number }) => {
    const data = storage.getProjectProduction(projectId);
    const record = normalizeCost({ ...cost, id: createId(), createdAt: new Date().toISOString() });
    storage.saveProjectProduction(projectId, { ...data, costs: [record, ...data.costs] });
    return record.id;
  },

  updateCostRecord: (projectId: string, costId: string, updates: Partial<ProjectCostRecord>) => {
    const data = storage.getProjectProduction(projectId);
    const costs = data.costs.map((cost) =>
      cost.id === costId ? normalizeCost({ ...cost, ...updates }) : cost,
    );
    storage.saveProjectProduction(projectId, { ...data, costs });
  },

  deleteCostRecord: (projectId: string, costId: string) => {
    const data = storage.getProjectProduction(projectId);
    storage.saveProjectProduction(projectId, {
      ...data,
      costs: data.costs.filter((cost) => cost.id !== costId),
    });
  },

  convertPurchaseToCost: (projectId: string, purchaseId: string, updates: Partial<ProjectCostRecord> = {}) => {
    const data = storage.getProjectProduction(projectId);
    const purchase = data.purchases.find((item) => item.id === purchaseId);
    if (!purchase) return null;

    const now = new Date().toISOString();
    const cost = normalizeCost({
      id: createId(),
      itemName: updates.itemName || purchase.itemName,
      category: updates.category || purchase.category,
      quantity: updates.quantity ?? purchase.quantity,
      unitCost: updates.unitCost ?? purchase.estimatedUnitCost,
      provider: updates.provider || purchase.provider,
      purchaseId: purchase.id,
      createdAt: now,
    });

    storage.saveProjectProduction(projectId, {
      quotes: data.quotes,
      purchases: data.purchases.map((item) =>
        item.id === purchaseId
          ? normalizePurchase({ ...item, status: 'Comprado', purchasedAt: now, updatedAt: now })
          : item,
      ),
      costs: [cost, ...data.costs],
    });

    return cost.id;
  },

  getProjectProductionSummary: (projectId: string): ProjectProductionSummary => {
    const project = storage.getProject(projectId);
    const data = storage.getProjectProduction(projectId);
    const budgetTarget = project?.direction?.budgetTarget ?? 0;
    const estimatedTotal = data.purchases
      .filter((purchase) => purchase.status !== 'Cancelado')
      .reduce((total, purchase) => total + purchase.quantity * purchase.estimatedUnitCost, 0);
    const realTotal = data.costs.reduce((total, cost) => total + cost.total, 0);
    const legacyCost = realTotal > 0 ? 0 : project?.direction?.costAccumulated ?? 0;
    const totalWithLegacy = realTotal + legacyCost;

    return {
      budgetTarget,
      estimatedTotal,
      realTotal,
      legacyCost,
      totalWithLegacy,
      available: budgetTarget - totalWithLegacy,
    };
  },

  // Inventory
  getInventory: (): InventoryItem[] => {
    const items = readJson<InventoryItem[]>(INVENTORY_KEY, []);
    return Array.isArray(items) ? items.filter(isRecord).map((item) => normalizeInventoryItem(item as InventoryItem)) : [];
  },

  saveInventory: (items: InventoryItem[]) => {
    writeJson(INVENTORY_KEY, items);
  },

  addInventoryItem: (item: Omit<InventoryItem, 'id' | 'createdAt' | 'updatedAt'>) => {
    const items = storage.getInventory();
    const id = Math.random().toString(36).substr(2, 9);
    const now = new Date().toISOString();
    const newItem = normalizeInventoryItem({ ...item, id, createdAt: now, updatedAt: now });
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
    return normalizeInventoryConfig(readJson<Partial<InventoryConfig> | null>(INVENTORY_CONFIG_KEY, DEFAULT_CONFIG));
  },

  saveInventoryConfig: (config: InventoryConfig) => {
    writeJson(INVENTORY_CONFIG_KEY, normalizeInventoryConfig(config));
  },

  clearAppData: () => {
    Object.keys(localStorage).forEach((key) => {
      if (key.startsWith('7flow_') || key === 'theme') {
        localStorage.removeItem(key);
      }
    });
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
