import type { ComponentType } from 'npm:react@18.3.1'
import { template as lmsAssignmentNotification } from './lms-assignment-notification.tsx'
import { template as systemNotification } from './system-notification.tsx'

export interface TemplateEntry {
  component: ComponentType<any>
  subject: string | ((data: any) => string)
  displayName?: string
  previewData?: Record<string, any>
  to?: string
}

export const TEMPLATES: Record<string, TemplateEntry> = {
  'lms-assignment-notification': lmsAssignmentNotification,
  'system-notification': systemNotification,
}
