import { DailyPlan } from '../types';
import { getAll, put, putMany, clearStore } from './db';

export async function getAllDailyPlans(): Promise<DailyPlan[]> {
  return getAll<DailyPlan>('dailyPlans');
}

export async function saveDailyPlans(plans: DailyPlan[]): Promise<void> {
  return putMany('dailyPlans', plans);
}

export async function updatePlanStatus(id: string, status: 'pending' | 'done'): Promise<void> {
  const plans = await getAllDailyPlans();
  const plan = plans.find(p => p.id === id);
  if (plan) { plan.status = status; await put('dailyPlans', plan); }
}

export async function completePlanWithFeedback(id: string, feedback: { mastery: 'red' | 'yellow' | 'green'; timeSpent: number; note: string }): Promise<void> {
  const plans = await getAllDailyPlans();
  const plan = plans.find(p => p.id === id);
  if (plan) {
    plan.status = 'done';
    plan.mastery = feedback.mastery;
    plan.timeSpent = feedback.timeSpent;
    plan.note = feedback.note;
    plan.completedAt = Date.now();
    await put('dailyPlans', plan);
  }
}

export async function deleteAllDailyPlans(): Promise<void> {
  return clearStore('dailyPlans');
}