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

const createId = () => Math.random().toString(36).substr(2, 9);

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

export const storage = {
  getUserProfile: (): UserProfile => {
    const data = localStorage.getItem(USER_PROFILE_KEY);
    return normalizeUserProfile(data ? JSON.parse(data) : DEFAULT_USER);
  },

  saveUserProfile: (profile: UserProfile) => {
    localStorage.setItem(USER_PROFILE_KEY, JSON.stringify(normalizeUserProfile(profile)));
  },
  
  getProjects: (): Project[] => {
    const data = localStorage.getItem(PROJECTS_KEY);
    const projects = data ? JSON.parse(data) : [];

    return projects.map((project: Project) => ({
      ...project,
      direction: normalizeDirection(project.direction),
      productionEnabled: project.productionEnabled === true,
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

  getProjectProcessPhotos: (projectId: string): ProjectPhoto[] => {
    const data = localStorage.getItem(`${PROJECT_PROCESS_PHOTOS_KEY_PREFIX}${projectId}`);
    return data ? JSON.parse(data) : [];
  },

  saveProjectProcessPhotos: (projectId: string, photos: ProjectPhoto[]) => {
    localStorage.setItem(`${PROJECT_PROCESS_PHOTOS_KEY_PREFIX}${projectId}`, JSON.stringify(photos));
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
    Object.entries(photos).forEach(([projectId, stages]) => {
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

  getProviders: (): Provider[] => {
    const data = localStorage.getItem(PROVIDERS_KEY);
    const providers = data ? JSON.parse(data) : [];
    return Array.isArray(providers) ? providers.map(normalizeProvider) : [];
  },

  saveProviders: (providers: Provider[]) => {
    localStorage.setItem(PROVIDERS_KEY, JSON.stringify(providers.map(normalizeProvider)));
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

  getProjectProduction: (projectId: string): ProjectProductionData => {
    const data = localStorage.getItem(`${PROJECT_PRODUCTION_KEY_PREFIX}${projectId}`);
    return normalizeProductionData(data ? JSON.parse(data) : null);
  },

  saveProjectProduction: (projectId: string, data: ProjectProductionData) => {
    localStorage.setItem(`${PROJECT_PRODUCTION_KEY_PREFIX}${projectId}`, JSON.stringify(normalizeProductionData(data)));
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
    const data = localStorage.getItem(INVENTORY_KEY);
    const items = data ? JSON.parse(data) : [];
    return items.map(normalizeInventoryItem);
  },

  saveInventory: (items: InventoryItem[]) => {
    localStorage.setItem(INVENTORY_KEY, JSON.stringify(items));
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
