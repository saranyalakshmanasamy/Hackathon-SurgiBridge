// Common types for the Clinical Registry System

export interface DeviceInfo {
  deviceType: 'mobile' | 'desktop';
  platform: string;
  browser: string;
}

export interface IngestionMetadata {
  timestamp: string;
  deviceInfo: DeviceInfo;
  context: 'theatre' | 'ward' | 'office';
}

export interface FieldValue {
  value: any;
  confidence: number;
  source: 'system' | 'voice' | 'scan' | 'manual';
  isEdited: boolean;
  isConfirmed: boolean;
  extractionMetadata?: {
    sourceText: string;
    extractionMethod: string;
    extractionTimestamp: string;
  };
}

export interface RecordMetadata {
  audioS3Key?: string;
  imageS3Keys?: string[];
  transcriptionJobId?: string;
  ocrJobIds?: string[];
  extractionJobId?: string;
  context: 'theatre' | 'ward' | 'office';
  ipAddress: string;
  deviceInfo: DeviceInfo;
}

export interface AuditEntry {
  action: 'create' | 'read' | 'update' | 'delete';
  userId: string;
  timestamp: string;
  fieldChanges?: FieldChange[];
  ipAddress: string;
  deviceInfo: DeviceInfo;
}

export interface FieldChange {
  fieldName: string;
  oldValue: any;
  newValue: any;
  source: string;
}

export interface RegistryRecordItem {
  recordId: string;
  versionNumber: string;
  patientId: string;
  encounterId: string;
  userId: string;
  status: 'draft' | 'submitted' | 'superseded';
  fields: Record<string, FieldValue>;
  changeReason?: string;
  changeType?: 'create' | 'update' | 'correction';
  isCurrent: boolean;
  createdAt: string;
  updatedAt: string;
  submittedAt?: string;
  metadata: RecordMetadata;
  auditTrail: AuditEntry[];
  ttl?: number;
}
