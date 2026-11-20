import { apiFetch } from './client';

export interface AcademyModule {
  id: string;
  code: string;
  title: string;
  summary: string | null;
  duration_minutes: number | null;
  is_required: boolean;
  is_active: boolean;
  sort_order: number;
  created_at: string;
}

export interface AcademyLesson {
  id: string;
  module_id: string;
  title: string;
  content_type: string | null;
  content_url: string | null;
  duration_minutes: number | null;
  sort_order: number;
}

export interface AcademyCompletion {
  id: string;
  profile_id: string;
  module_id: string;
  score: number | null;
  completed_at: string;
}

export function apiListModules(isActive?: boolean) {
  return apiFetch<AcademyModule[]>('/academy/modules', {
    params: isActive !== undefined ? { is_active: isActive } : undefined,
  });
}

export function apiListModuleLessons(moduleId: string) {
  return apiFetch<AcademyLesson[]>(`/academy/modules/${moduleId}/lessons`);
}

export function apiCreateModule(body: {
  code: string;
  title: string;
  summary?: string;
  duration_minutes?: number;
  is_required?: boolean;
  sort_order?: number;
}) {
  return apiFetch<{ id: string }>('/academy/modules', {
    method: 'POST',
    body,
  });
}
