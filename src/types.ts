export type Priority = 'NOW' | 'Next1' | 'Next2' | 'Next3';
export type ProjectType = 'De la vida' | 'Software' | 'Contenido' | 'Fisico';
export type ProjectStatus = 'Idea' | 'Activo' | 'Bloqueado' | 'Terminado';
export type ProjectPhotoStage = 'before' | 'after';
export type AppMode = 'Creativo' | 'Produccion';

export interface ProjectPhoto {
  id?: string;
  dataUrl: string;
  mimeType: string;
  fileName: string;
  width: number;
  height: number;
  capturedAt: string; // ISO String
}

export type ProjectPhotos = Partial<Record<ProjectPhotoStage, ProjectPhoto>> & {
  process?: ProjectPhoto[];
};

export interface Direction {
  out: string[];
  why: string;
  d: string;
  p: string;
  h: string;
  in: string[];
  timeTargetMinutes: number;
  timeAccumulatedMinutes: number;
  budgetTarget: number;
  costAccumulated: number;
}

export interface ProjectTimeRecord {
  projectId: string;
  projectName: string;
  projectType: ProjectType;
  createdAt: string;
  completedAt: string;
  estimatedMinutes: number;
  actualMinutes: number;
  deltaMinutes: number;
}

export interface ProjectTimeSummary {
  projectType: ProjectType;
  projectCount: number;
  totalEstimatedMinutes: number;
  totalActualMinutes: number;
  totalDeltaMinutes: number;
  fasterCount: number;
  onTimeCount: number;
  overCount: number;
}

export interface Project {
  id: string;
  name: string;
  description: string;
  priority: Priority;
  type: ProjectType;
  status: ProjectStatus;
  createdAt: string; // ISO String
  nextAction: string;
  direction: Direction;
  ownerId: string;
  productionEnabled?: boolean;
}

export interface LogEntry {
  id: string;
  text: string;
  timestamp: string; // ISO String
  completedAction?: string;
  newNextAction?: string;
}

export type InventoryStatus = 'Consumido' | 'En uso' | 'Para usar' | 'Para mejorar' | 'Guardado';
export type InventoryCategory = 'Material' | 'Herramienta' | 'Producto' | 'Contenido' | 'Software' | 'Insumo' | 'Otro';
export type ProductionCostCategory = 'Materiales' | 'Herramientas' | 'Servicios' | 'Transporte' | 'Mano de obra' | 'Otros';
export type ProductionQuoteStatus = 'Cotizada' | 'En compra' | 'Descartada';
export type PurchasePlanStatus = 'Pendiente' | 'Comprado' | 'Cancelado';

export interface InventoryItem {
  id: string;
  name: string;
  description: string;
  category: InventoryCategory;
  quantity: number;
  unitCost?: number;
  status: InventoryStatus;
  subStatus: string;
  sourceProjectId?: string;
  projectPhotos?: ProjectPhotos;
  createdAt: string; // ISO String
  updatedAt: string; // ISO String
}

export interface InventoryConfig {
  improvementOptions: string[];
  locationOptions: string[];
}

export interface ProductionQuote {
  id: string;
  provider: string;
  itemName: string;
  category: ProductionCostCategory;
  quantity: number;
  unitPrice: number;
  contact: string;
  notes: string;
  status: ProductionQuoteStatus;
  createdAt: string;
  updatedAt: string;
}

export interface PurchasePlanItem {
  id: string;
  itemName: string;
  category: ProductionCostCategory;
  quantity: number;
  estimatedUnitCost: number;
  provider?: string;
  quoteId?: string;
  status: PurchasePlanStatus;
  createdAt: string;
  updatedAt: string;
  purchasedAt?: string;
}

export interface ProjectCostRecord {
  id: string;
  itemName: string;
  category: ProductionCostCategory;
  quantity: number;
  unitCost: number;
  total: number;
  provider?: string;
  purchaseId?: string;
  createdAt: string;
}

export interface Provider {
  id: string;
  name: string;
  category: ProductionCostCategory;
  contact: string;
  phone: string;
  email: string;
  website: string;
  address: string;
  notes: string;
  archived: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectProductionData {
  quotes: ProductionQuote[];
  purchases: PurchasePlanItem[];
  costs: ProjectCostRecord[];
}

export interface ProjectProductionSummary {
  budgetTarget: number;
  estimatedTotal: number;
  realTotal: number;
  legacyCost: number;
  totalWithLegacy: number;
  available: number;
}
