import { LogEntry, Project, ProjectTimeRecord, ProjectTimeSummary, ProjectType } from '../types';

export const PROJECT_TYPE_ORDER: ProjectType[] = ['De la vida', 'Software', 'Contenido', 'Fisico'];

export const formatDeltaMinutes = (minutes: number) => {
  const safeMinutes = Math.max(0, Math.abs(Math.round(minutes || 0)));
  const hours = Math.floor(safeMinutes / 60);
  const remainingMinutes = safeMinutes % 60;
  const prefix = minutes > 0 ? '+' : minutes < 0 ? '-' : '';

  if (hours === 0) return `${prefix}${remainingMinutes} min`;
  if (remainingMinutes === 0) return `${prefix}${hours} h`;
  return `${prefix}${hours} h ${remainingMinutes} min`;
};

export const findProjectCompletionTimestamp = (logs: LogEntry[]) => {
  const finishLog = logs.find((log) => log.newNextAction === 'Proyecto Finalizado');
  if (finishLog) return finishLog.timestamp;

  const fallback = logs.find((log) => log.completedAction === 'Proyecto Finalizado');
  return fallback?.timestamp ?? null;
};

export const buildProjectTimeRecord = (
  project: Project,
  completedAt: string,
): ProjectTimeRecord | null => {
  const estimatedMinutes = Math.max(0, Math.floor(project.direction?.timeTargetMinutes ?? 0));
  if (estimatedMinutes <= 0) return null;

  const createdAtMs = new Date(project.createdAt).getTime();
  const completedAtMs = new Date(completedAt).getTime();

  if (!Number.isFinite(createdAtMs) || !Number.isFinite(completedAtMs) || completedAtMs < createdAtMs) {
    return null;
  }

  const actualMinutes = Math.max(1, Math.round((completedAtMs - createdAtMs) / 60000));

  return {
    projectId: project.id,
    projectName: project.name,
    projectType: project.type,
    createdAt: project.createdAt,
    completedAt,
    estimatedMinutes,
    actualMinutes,
    deltaMinutes: actualMinutes - estimatedMinutes,
  };
};

export const summarizeProjectTimeRecords = (records: ProjectTimeRecord[]): ProjectTimeSummary[] => {
  const summaryMap = new Map<ProjectType, ProjectTimeSummary>();

  PROJECT_TYPE_ORDER.forEach((projectType) => {
    summaryMap.set(projectType, {
      projectType,
      projectCount: 0,
      totalEstimatedMinutes: 0,
      totalActualMinutes: 0,
      totalDeltaMinutes: 0,
      fasterCount: 0,
      onTimeCount: 0,
      overCount: 0,
    });
  });

  records.forEach((record) => {
    const summary = summaryMap.get(record.projectType);
    if (!summary) return;

    summary.projectCount += 1;
    summary.totalEstimatedMinutes += record.estimatedMinutes;
    summary.totalActualMinutes += record.actualMinutes;
    summary.totalDeltaMinutes += record.deltaMinutes;

    if (record.deltaMinutes < 0) summary.fasterCount += 1;
    else if (record.deltaMinutes > 0) summary.overCount += 1;
    else summary.onTimeCount += 1;
  });

  return PROJECT_TYPE_ORDER.map((projectType) => summaryMap.get(projectType)!);
};
