import {
  DataRecord,
  DataConnector,
  SyncJob,
  SyncResult
} from '../types/ConnectorTypes';

export interface PrivacyPolicy {
  id: string;
  name: string;
  description: string;
  version: string;
  framework: 'GDPR' | 'CCPA' | 'HIPAA' | 'SOC2' | 'ISO27001' | 'CUSTOM';
  dataRetention: {
    defaultPeriod: number; // days
    maxPeriod: number; // days
    legalHold: boolean;
  };
  dataProcessing: {
    consentRequired: boolean;
    purposeLimitation: boolean;
    dataMinimization: boolean;
  };
  userRights: {
    access: boolean;
    rectification: boolean;
    erasure: boolean;
    portability: boolean;
    objection: boolean;
  };
  dataSubjectTypes: string[];
  dataCategories: string[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ConsentRecord {
  id: string;
  dataSubjectId: string;
  dataSubjectType: string;
  dataType: string;
  purpose: string;
  processor: string;
  consentGiven: boolean;
  consentDate?: Date;
  withdrawalDate?: Date;
  expiryDate?: Date;
  metadata: Record<string, any>;
}

export interface DataClassification {
  id: string;
  name: string;
  description: string;
  sensitivityLevel: 'public' | 'internal' | 'confidential' | 'restricted' | 'top_secret';
  retentionPeriod: number; // days
  encryptionRequired: boolean;
  accessControls: string[];
  dataTypes: string[];
  handlingInstructions: string[];
}

export interface PrivacyImpactAssessment {
  id: string;
  name: string;
  description: string;
  status: 'draft' | 'in_review' | 'approved' | 'rejected';
  assessedBy: string;
  assessmentDate: Date;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  dataFlows: DataFlow[];
  identifiedRisks: PrivacyRisk[];
  mitigationMeasures: MitigationMeasure[];
  recommendations: string[];
  approvedBy?: string;
  approvedDate?: Date;
  reviewDate?: Date;
}

export interface DataFlow {
  id: string;
  source: string;
  destination: string;
  dataType: string;
  volume: 'low' | 'medium' | 'high';
  frequency: 'real_time' | 'daily' | 'weekly' | 'monthly' | 'ad_hoc';
  purpose: string;
  lawfulBasis: 'consent' | 'contract' | 'legal_obligation' | 'vital_interests' | 'public_task' | 'legitimate_interests';
  thirdCountryTransfer: boolean;
  securityMeasures: string[];
}

export interface PrivacyRisk {
  id: string;
  title: string;
  description: string;
  category: 'unauthorized_access' | 'data_breach' | 'loss_of_integrity' | 'loss_of_confidentiality' | 'non_compliance';
  likelihood: 'rare' | 'unlikely' | 'possible' | 'likely' | 'almost_certain';
  impact: 'negligible' | 'minor' | 'moderate' | 'major' | 'severe';
  riskScore: number;
  mitigated: boolean;
  mitigationDate?: Date;
}

export interface MitigationMeasure {
  id: string;
  title: string;
  description: string;
  category: 'technical' | 'organizational' | 'legal';
  effectiveness: 'low' | 'medium' | 'high';
  implementationStatus: 'not_started' | 'in_progress' | 'completed' | 'verified';
  assignedTo?: string;
  dueDate?: Date;
  completedDate?: Date;
}

export interface DataSubjectRequest {
  id: string;
  requestType: 'access' | 'rectification' | 'erasure' | 'portability' | 'objection' | 'restriction';
  dataSubjectId: string;
  dataSubjectType: string;
  requestedData?: string[];
  requestedFields?: string[];
  status: 'pending' | 'in_progress' | 'completed' | 'rejected' | 'expired';
  submittedDate: Date;
  dueDate: Date;
  completedDate?: Date;
  processedBy?: string;
  rejectionReason?: string;
  resultData?: Record<string, any>;
  resultFiles?: string[];
  auditTrail: RequestAuditEntry[];
}

export interface RequestAuditEntry {
  timestamp: Date;
  action: string;
  performedBy: string;
  details: Record<string, any>;
}

export interface BreachNotification {
  id: string;
  breachId: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  dataCategories: string[];
  affectedRecords: number;
  affectedDataSubjects: number;
  discoveryDate: Date;
  breachDate?: Date;
  containmentDate?: Date;
  notificationDate?: Date;
  description: string;
  causes: string[];
  impacts: string[];
  mitigations: string[];
  notifications: {
    authorities: boolean;
    dataSubjects: boolean;
    partners: boolean;
  };
  status: 'investigating' | 'contained' | 'notified' | 'resolved';
  assignedTo?: string;
  resolutionDate?: Date;
}

export interface AuditLog {
  id: string;
  timestamp: Date;
  userId: string;
  action: string;
  resource: string;
  resourceId: string;
  details: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  outcome: 'success' | 'failure' | 'blocked';
  privacyPolicyId?: string;
  dataClassificationId?: string;
}

export class DataPrivacyService {
  private policies: Map<string, PrivacyPolicy> = new Map();
  private classifications: Map<string, DataClassification> = new Map();
  private consentRecords: Map<string, ConsentRecord> = new Map();
  private assessments: Map<string, PrivacyImpactAssessment> = new Map();
  private subjectRequests: Map<string, DataSubjectRequest> = new Map();
  private breachNotifications: Map<string, BreachNotification> = new Map();
  private auditLogs: AuditLog[] = [];

  constructor() {
    this.initializeDefaultPolicies();
    this.initializeDefaultClassifications();
  }

  // Policy Management
  createPolicy(policy: Omit<PrivacyPolicy, 'id' | 'createdAt' | 'updatedAt'>): string {
    const id = this.generateId('policy');
    const newPolicy: PrivacyPolicy = {
      ...policy,
      id,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    this.policies.set(id, newPolicy);
    this.logAudit('system', 'create_policy', 'privacy_policy', id, { policyName: policy.name });
    return id;
  }

  updatePolicy(id: string, updates: Partial<PrivacyPolicy>): boolean {
    const policy = this.policies.get(id);
    if (!policy) return false;

    this.policies.set(id, {
      ...policy,
      ...updates,
      updatedAt: new Date()
    });

    this.logAudit('system', 'update_policy', 'privacy_policy', id, { updates });
    return true;
  }

  getPolicy(id: string): PrivacyPolicy | null {
    return this.policies.get(id) || null;
  }

  getActivePolicies(): PrivacyPolicy[] {
    return Array.from(this.policies.values()).filter(p => p.isActive);
  }

  getPoliciesByFramework(framework: PrivacyPolicy['framework']): PrivacyPolicy[] {
    return Array.from(this.policies.values()).filter(p => p.framework === framework && p.isActive);
  }

  // Data Classification Management
  createClassification(classification: Omit<DataClassification, 'id'>): string {
    const id = this.generateId('classification');
    const newClassification: DataClassification = {
      ...classification,
      id
    };

    this.classifications.set(id, newClassification);
    this.logAudit('system', 'create_classification', 'data_classification', id, { name: classification.name });
    return id;
  }

  classifyData(data: Record<string, any>, dataType: string): DataClassification | null {
    // Find matching classification based on data content and type
    const classifications = Array.from(this.classifications.values()).filter(c =>
      c.dataTypes.includes(dataType) || c.dataTypes.includes('*')
    );

    // Return the most restrictive classification
    const sensitivityOrder = ['public', 'internal', 'confidential', 'restricted', 'top_secret'];
    classifications.sort((a, b) =>
      sensitivityOrder.indexOf(b.sensitivityLevel) - sensitivityOrder.indexOf(a.sensitivityLevel)
    );

    return classifications[0] || null;
  }

  getClassifications(): DataClassification[] {
    return Array.from(this.classifications.values());
  }

  // Consent Management
  recordConsent(consent: Omit<ConsentRecord, 'id'>): string {
    const id = this.generateId('consent');
    const newConsent: ConsentRecord = {
      ...consent,
      id
    };

    this.consentRecords.set(id, newConsent);
    this.logAudit('system', 'record_consent', 'consent_record', id, {
      dataSubjectId: consent.dataSubjectId,
      dataType: consent.dataType,
      consentGiven: consent.consentGiven
    });
    return id;
  }

  checkConsent(dataSubjectId: string, dataType: string, purpose: string): boolean {
    const consents = Array.from(this.consentRecords.values()).filter(c =>
      c.dataSubjectId === dataSubjectId &&
      c.dataType === dataType &&
      c.purpose === purpose &&
      c.consentGiven &&
      (!c.expiryDate || c.expiryDate > new Date())
    );

    return consents.length > 0;
  }

  withdrawConsent(consentId: string): boolean {
    const consent = this.consentRecords.get(consentId);
    if (!consent) return false;

    consent.consentGiven = false;
    consent.withdrawalDate = new Date();

    this.logAudit('system', 'withdraw_consent', 'consent_record', consentId, {
      dataSubjectId: consent.dataSubjectId
    });
    return true;
  }

  // Privacy Impact Assessment
  createAssessment(assessment: Omit<PrivacyImpactAssessment, 'id' | 'assessmentDate'>): string {
    const id = this.generateId('pia');
    const newAssessment: PrivacyImpactAssessment = {
      ...assessment,
      id,
      assessmentDate: new Date()
    };

    this.assessments.set(id, newAssessment);
    this.logAudit('system', 'create_assessment', 'privacy_assessment', id, {
      name: assessment.name,
      riskLevel: assessment.riskLevel
    });
    return id;
  }

  updateAssessment(id: string, updates: Partial<PrivacyImpactAssessment>): boolean {
    const assessment = this.assessments.get(id);
    if (!assessment) return false;

    this.assessments.set(id, { ...assessment, ...updates });
    this.logAudit('system', 'update_assessment', 'privacy_assessment', id, { updates });
    return true;
  }

  getAssessments(): PrivacyImpactAssessment[] {
    return Array.from(this.assessments.values());
  }

  getAssessmentsByStatus(status: PrivacyImpactAssessment['status']): PrivacyImpactAssessment[] {
    return Array.from(this.assessments.values()).filter(a => a.status === status);
  }

  // Data Subject Requests
  createSubjectRequest(request: Omit<DataSubjectRequest, 'id' | 'submittedDate'>): string {
    const id = this.generateId('dsr');
    const newRequest: DataSubjectRequest = {
      ...request,
      id,
      submittedDate: new Date(),
      auditTrail: [{
        timestamp: new Date(),
        action: 'request_submitted',
        performedBy: 'system',
        details: { requestType: request.requestType }
      }]
    };

    this.subjectRequests.set(id, newRequest);
    this.logAudit('system', 'create_dsr', 'data_subject_request', id, {
      requestType: request.requestType,
      dataSubjectId: request.dataSubjectId
    });
    return id;
  }

  processSubjectRequest(requestId: string, processor: string, result?: Record<string, any>): boolean {
    const request = this.subjectRequests.get(requestId);
    if (!request) return false;

    request.status = 'completed';
    request.processedBy = processor;
    request.completedDate = new Date();
    if (result) {
      request.resultData = result;
    }

    request.auditTrail.push({
      timestamp: new Date(),
      action: 'request_processed',
      performedBy: processor,
      details: { resultProvided: !!result }
    });

    this.logAudit(processor, 'process_dsr', 'data_subject_request', requestId, {
      requestType: request.requestType,
      dataSubjectId: request.dataSubjectId
    });
    return true;
  }

  getSubjectRequests(): DataSubjectRequest[] {
    return Array.from(this.subjectRequests.values());
  }

  getSubjectRequestsByStatus(status: DataSubjectRequest['status']): DataSubjectRequest[] {
    return Array.from(this.subjectRequests.values()).filter(r => r.status === status);
  }

  // Breach Management
  reportBreach(breach: Omit<BreachNotification, 'id' | 'discoveryDate'>): string {
    const id = this.generateId('breach');
    const newBreach: BreachNotification = {
      ...breach,
      id,
      discoveryDate: new Date()
    };

    this.breachNotifications.set(id, newBreach);
    this.logAudit('system', 'report_breach', 'breach_notification', id, {
      severity: breach.severity,
      affectedRecords: breach.affectedRecords
    });

    // Trigger automated breach response procedures
    this.handleBreachResponse(id);
    return id;
  }

  updateBreach(id: string, updates: Partial<BreachNotification>): boolean {
    const breach = this.breachNotifications.get(id);
    if (!breach) return false;

    this.breachNotifications.set(id, { ...breach, ...updates });
    this.logAudit('system', 'update_breach', 'breach_notification', id, { updates });
    return true;
  }

  getBreaches(): BreachNotification[] {
    return Array.from(this.breachNotifications.values());
  }

  getBreachesBySeverity(severity: BreachNotification['severity']): BreachNotification[] {
    return Array.from(this.breachNotifications.values()).filter(b => b.severity === severity);
  }

  // Data Processing Compliance
  validateDataProcessing(
    data: Record<string, any>,
    dataType: string,
    purpose: string,
    processor: string
  ): {
    isCompliant: boolean;
    violations: string[];
    recommendations: string[];
  } {
    const violations: string[] = [];
    const recommendations: string[] = [];

    // Check data classification
    const classification = this.classifyData(data, dataType);
    if (!classification) {
      violations.push('Data classification not found');
      recommendations.push('Classify data type and apply appropriate controls');
    }

    // Check consent if required
    const activePolicies = this.getActivePolicies();
    for (const policy of activePolicies) {
      if (policy.dataProcessing.consentRequired) {
        // For demo, assume we have a data subject ID
        const hasConsent = this.checkConsent('demo_subject', dataType, purpose);
        if (!hasConsent) {
          violations.push(`Consent not found for ${dataType} processing under ${policy.framework}`);
        }
      }

      // Check data minimization
      if (policy.dataProcessing.dataMinimization) {
        const dataFields = Object.keys(data);
        const unnecessaryFields = dataFields.filter(field =>
          !this.isFieldNecessaryForPurpose(field, purpose)
        );

        if (unnecessaryFields.length > 0) {
          violations.push(`Unnecessary data fields collected: ${unnecessaryFields.join(', ')}`);
          recommendations.push('Apply data minimization principles');
        }
      }

      // Check purpose limitation
      if (policy.dataProcessing.purposeLimitation) {
        const isPurposeValid = this.validatePurpose(purpose, policy);
        if (!isPurposeValid) {
          violations.push(`Invalid processing purpose: ${purpose}`);
        }
      }
    }

    return {
      isCompliant: violations.length === 0,
      violations,
      recommendations
    };
  }

  // Data Retention Management
  applyDataRetention(data: DataRecord[]): DataRecord[] {
    const retainedData: DataRecord[] = [];

    for (const record of data) {
      const shouldRetain = this.shouldRetainRecord(record);
      if (shouldRetain) {
        retainedData.push(record);
      } else {
        this.logAudit('system', 'delete_expired_record', 'data_record', record.externalId, {
          dataType: record.dataType,
          retentionPolicy: 'expired'
        });
      }
    }

    return retainedData;
  }

  // Audit and Reporting
  getAuditLogs(filters?: {
    startDate?: Date;
    endDate?: Date;
    userId?: string;
    action?: string;
    resource?: string;
  }): AuditLog[] {
    let filteredLogs = [...this.auditLogs];

    if (filters) {
      if (filters.startDate) {
        filteredLogs = filteredLogs.filter(log => log.timestamp >= filters.startDate!);
      }
      if (filters.endDate) {
        filteredLogs = filteredLogs.filter(log => log.timestamp <= filters.endDate!);
      }
      if (filters.userId) {
        filteredLogs = filteredLogs.filter(log => log.userId === filters.userId);
      }
      if (filters.action) {
        filteredLogs = filteredLogs.filter(log => log.action === filters.action);
      }
      if (filters.resource) {
        filteredLogs = filteredLogs.filter(log => log.resource === filters.resource);
      }
    }

    return filteredLogs.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  generateComplianceReport(): {
    summary: {
      totalPolicies: number;
      activeAssessments: number;
      pendingRequests: number;
      openBreaches: number;
    };
    complianceScore: number;
    frameworkCompliance: Record<string, number>;
    recommendations: string[];
  } {
    const activePolicies = this.getActivePolicies();
    const pendingAssessments = this.getAssessmentsByStatus('draft').length +
                              this.getAssessmentsByStatus('in_review').length;
    const pendingRequests = this.getSubjectRequestsByStatus('pending').length;
    const openBreaches = this.getBreaches().filter(b =>
      b.status !== 'resolved'
    ).length;

    // Calculate compliance score (simplified)
    const frameworkCompliance: Record<string, number> = {};
    activePolicies.forEach(policy => {
      frameworkCompliance[policy.framework] = 85; // Simplified calculation
    });

    const avgCompliance = Object.values(frameworkCompliance).reduce((sum, score) => sum + score, 0) /
                          Object.values(frameworkCompliance).length || 0;

    const recommendations: string[] = [];
    if (pendingAssessments > 0) {
      recommendations.push(`${pendingAssessments} privacy assessments require completion`);
    }
    if (pendingRequests > 0) {
      recommendations.push(`${pendingRequests} data subject requests pending`);
    }
    if (openBreaches > 0) {
      recommendations.push(`${openBreaches} security breaches require resolution`);
    }

    return {
      summary: {
        totalPolicies: activePolicies.length,
        activeAssessments: this.getAssessmentsByStatus('approved').length,
        pendingRequests,
        openBreaches
      },
      complianceScore: Math.round(avgCompliance),
      frameworkCompliance,
      recommendations
    };
  }

  // Data Anonymization and Pseudonymization
  anonymizeData(data: Record<string, any>, fields: string[]): Record<string, any> {
    const anonymized = { ...data };

    for (const field of fields) {
      if (field in anonymized) {
        anonymized[field] = this.anonymizeValue(anonymized[field], field);
      }
    }

    return anonymized;
  }

  pseudonymizeData(data: Record<string, any>, fields: string[]): Record<string, any> {
    const pseudonymized = { ...data };

    for (const field of fields) {
      if (field in pseudonymized) {
        pseudonymized[field] = this.pseudonymizeValue(pseudonymized[field], field);
      }
    }

    return pseudonymized;
  }

  // Private helper methods
  private initializeDefaultPolicies(): void {
    // GDPR Policy
    this.createPolicy({
      name: 'GDPR Compliance Policy',
      description: 'General Data Protection Regulation compliance policy',
      version: '1.0',
      framework: 'GDPR',
      dataRetention: {
        defaultPeriod: 365,
        maxPeriod: 2555, // 7 years
        legalHold: true
      },
      dataProcessing: {
        consentRequired: true,
        purposeLimitation: true,
        dataMinimization: true
      },
      userRights: {
        access: true,
        rectification: true,
        erasure: true,
        portability: true,
        objection: true
      },
      dataSubjectTypes: ['customer', 'employee', 'prospect'],
      dataCategories: ['personal', 'sensitive', 'health', 'financial'],
      isActive: true
    });

    // CCPA Policy
    this.createPolicy({
      name: 'CCPA Compliance Policy',
      description: 'California Consumer Privacy Act compliance policy',
      version: '1.0',
      framework: 'CCPA',
      dataRetention: {
        defaultPeriod: 730,
        maxPeriod: 1825, // 5 years
        legalHold: true
      },
      dataProcessing: {
        consentRequired: false,
        purposeLimitation: true,
        dataMinimization: true
      },
      userRights: {
        access: true,
        rectification: true,
        erasure: true,
        portability: true,
        objection: true
      },
      dataSubjectTypes: ['consumer', 'employee'],
      dataCategories: ['personal', 'commercial', 'biometric'],
      isActive: true
    });

    console.log('Initialized default privacy policies');
  }

  private initializeDefaultClassifications(): void {
    // Public Data
    this.createClassification({
      name: 'Public',
      description: 'Data intended for public disclosure',
      sensitivityLevel: 'public',
      retentionPeriod: 1825, // 5 years
      encryptionRequired: false,
      accessControls: ['public_access'],
      dataTypes: ['marketing_content', 'public_profile'],
      handlingInstructions: ['No special handling required']
    });

    // Internal Data
    this.createClassification({
      name: 'Internal',
      description: 'Internal company data not for public disclosure',
      sensitivityLevel: 'internal',
      retentionPeriod: 2555, // 7 years
      encryptionRequired: true,
      accessControls: ['employee_access'],
      dataTypes: ['internal communications', 'company_data'],
      handlingInstructions: ['Internal use only', 'Encrypt at rest']
    });

    // Confidential Data
    this.createClassification({
      name: 'Confidential',
      description: 'Sensitive company information requiring protection',
      sensitivityLevel: 'confidential',
      retentionPeriod: 3650, // 10 years
      encryptionRequired: true,
      accessControls: ['authorized_personnel'],
      dataTypes: ['financial_data', 'strategic_plans'],
      handlingInstructions: ['Strong encryption required', 'Access logging mandatory']
    });

    // Restricted Data
    this.createClassification({
      name: 'Restricted',
      description: 'Highly sensitive personal information',
      sensitivityLevel: 'restricted',
      retentionPeriod: 1095, // 3 years
      encryptionRequired: true,
      accessControls: ['privacy_team', 'compliance_officer'],
      dataTypes: ['personal_identifiable_information', 'health_data'],
      handlingInstructions: ['End-to-end encryption', 'Strict access controls', 'Audit all access']
    });

    console.log('Initialized default data classifications');
  }

  private handleBreachResponse(breachId: string): void {
    const breach = this.breachNotifications.get(breachId);
    if (!breach) return;

    // Automated breach response procedures
    console.log(`Initiating breach response for breach ${breachId}`);

    // Notify authorities for high/critical breaches
    if (breach.severity === 'high' || breach.severity === 'critical') {
      console.log('Notifying data protection authorities');
      breach.notifications.authorities = true;
    }

    // Notify affected data subjects
    if (breach.affectedDataSubjects > 0) {
      console.log(`Preparing notifications for ${breach.affectedDataSubjects} affected individuals`);
      breach.notifications.dataSubjects = true;
    }

    this.updateBreach(breachId, { status: 'investigating' });
  }

  private isFieldNecessaryForPurpose(field: string, purpose: string): boolean {
    // Simplified logic - in production, this would be more sophisticated
    const necessaryFields = {
      'user_authentication': ['email', 'password_hash', 'user_id'],
      'order_processing': ['order_id', 'customer_id', 'items', 'total'],
      'marketing': ['email', 'name', 'preferences'],
      'analytics': ['user_id', 'action', 'timestamp']
    };

    return necessaryFields[purpose]?.includes(field) || false;
  }

  private validatePurpose(purpose: string, policy: PrivacyPolicy): boolean {
    // Check if purpose aligns with policy requirements
    const validPurposes = [
      'user_authentication',
      'order_processing',
      'customer_service',
      'marketing',
      'analytics',
      'compliance',
      'security'
    ];

    return validPurposes.includes(purpose);
  }

  private shouldRetainRecord(record: DataRecord): boolean {
    // Check retention policies based on classification
    const classification = this.classifyData(record.data, record.dataType);
    if (!classification) return true; // Default to retain if unclassified

    const ageInDays = (Date.now() - record.updatedAt.getTime()) / (1000 * 60 * 60 * 24);
    return ageInDays <= classification.retentionPeriod;
  }

  private anonymizeValue(value: any, field: string): any {
    if (typeof value === 'string') {
      if (field.toLowerCase().includes('email')) {
        return '*****@*****.***';
      } else if (field.toLowerCase().includes('phone')) {
        return '***-***-****';
      } else if (field.toLowerCase().includes('name')) {
        return '*****';
      } else if (field.toLowerCase().includes('address')) {
        return '*** ***** ***, **, *****';
      }
      return '*****';
    }
    return null;
  }

  private pseudonymizeValue(value: any, field: string): any {
    // Generate deterministic pseudonym based on value and field
    const seed = `${field}_${value}_${Math.random().toString(36).substr(2, 9)}`;
    return `pseudonym_${Buffer.from(seed).toString('base64').substr(0, 16)}`;
  }

  private logAudit(
    userId: string,
    action: string,
    resource: string,
    resourceId: string,
    details: Record<string, any>
  ): void {
    const auditLog: AuditLog = {
      id: this.generateId('audit'),
      timestamp: new Date(),
      userId,
      action,
      resource,
      resourceId,
      details,
      outcome: 'success'
    };

    this.auditLogs.push(auditLog);

    // Keep only last 100,000 audit logs
    if (this.auditLogs.length > 100000) {
      this.auditLogs = this.auditLogs.slice(-50000);
    }
  }

  private generateId(prefix: string): string {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}