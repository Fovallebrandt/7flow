import { Direction } from '../types';

const toMinutes = (value: unknown) => {
  const minutes = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(minutes) ? Math.max(0, Math.floor(minutes)) : 0;
};

const toMoney = (value: unknown) => {
  const amount = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(amount) ? Math.max(0, amount) : 0;
};

export const createDefaultDirection = (): Direction => ({
  out: [],
  why: '',
  d: '',
  p: '',
  h: '',
  in: [],
  timeTargetMinutes: 0,
  timeAccumulatedMinutes: 0,
  budgetTarget: 0,
  costAccumulated: 0,
});

export const normalizeDirection = (direction?: Partial<Direction> | null): Direction => ({
  out: Array.isArray(direction?.out) ? [...direction.out] : [],
  why: typeof direction?.why === 'string' ? direction.why : '',
  d: typeof direction?.d === 'string' ? direction.d : '',
  p: typeof direction?.p === 'string' ? direction.p : '',
  h: typeof direction?.h === 'string' ? direction.h : '',
  in: Array.isArray(direction?.in) ? [...direction.in] : [],
  timeTargetMinutes: toMinutes(direction?.timeTargetMinutes),
  timeAccumulatedMinutes: toMinutes(direction?.timeAccumulatedMinutes),
  budgetTarget: toMoney(direction?.budgetTarget),
  costAccumulated: toMoney(direction?.costAccumulated),
});

export const formatMinutes = (minutes: number) => {
  const safeMinutes = Math.max(0, Math.floor(minutes || 0));
  const hours = Math.floor(safeMinutes / 60);
  const remainingMinutes = safeMinutes % 60;

  if (hours === 0) return `${remainingMinutes} min`;
  if (remainingMinutes === 0) return `${hours} h`;
  return `${hours} h ${remainingMinutes} min`;
};
