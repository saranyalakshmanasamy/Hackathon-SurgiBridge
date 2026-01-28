/**
 * Structured Extraction Service - Mock implementation for local development
 * In production, this would integrate with Amazon Comprehend Medical and LLM (GPT-4/Bedrock)
 */

export enum EntityType {
  PROCEDURE = 'procedure',
  DIAGNOSIS = 'diagnosis',
  COMPLICATION = 'complication',
  ANATOMY = 'anatomy',
  DEVICE = 'device',
  MEDICATION = 'medication',
  VITAL_SIGN = 'vital_sign',
  LAB_VALUE = 'lab_value'
}

export interface ExtractedEntity {
  type: EntityType;
  value: string;
  confidence: number;
  sourceText: string;
  sourceOffset: number;
}

export interface ClinicalNarrative {
  type: 'reasoning' | 'explanation' | 'observation';
  text: string;
  relatedEntities: string[];
}

export interface RegistryFields {
  // Patient Information
  patientId?: string;
  patientName?: string;
  dateOfBirth?: string;
  gender?: string;
  mrn?: string;
  
  // Procedure Information
  procedureCode?: string;
  procedureName?: string;
  procedureDate?: string;
  surgeonId?: string;
  surgeonName?: string;
  facility?: string;
  
  // Clinical Data
  primaryDiagnosis?: string;
  secondaryDiagnoses?: string[];
  complications?: Complication[];
  devices?: Device[];
  medications?: Medication[];
  vitalSigns?: VitalSigns;
  labValues?: LabValues;
  
  // Narrative
  clinicalReasoning?: string;
  procedureNotes?: string;
  postOpNotes?: string;
  
  // Metadata
  dataCompleteness?: number;
  overallConfidence?: number;
}

export interface Complication {
  type: string;
  severity: 'minor' | 'moderate' | 'major';
  description: string;
  onset: string;
}

export interface Device {
  name: string;
  manufacturer?: string;
  serialNumber?: string;
  implanted: boolean;
}

export interface Medication {
  name: string;
  dose: string;
  route: string;
  frequency: string;
}

export interface VitalSigns {
  bloodPressure?: string;
  heartRate?: number;
  temperature?: number;
  oxygenSaturation?: number;
}

export interface LabValues {
  hemoglobin?: number;
  whiteBloodCount?: number;
  platelets?: number;
  creatinine?: number;
  [key: string]: number | undefined;
}

export interface ExtractionMetadata {
  source: 'voice' | 'scan';
  sourceText: string;
  extractionMethod: 'comprehend' | 'llm' | 'hybrid';
  extractionTimestamp: string;
  modelVersion: string;
}

export interface ExtractionResult {
  entities: ExtractedEntity[];
  narratives: ClinicalNarrative[];
  structuredData: RegistryFields;
  extractionMetadata: ExtractionMetadata;
}

/**
 * Mock Structured Extraction Service
 * Simulates Amazon Comprehend Medical + LLM behavior
 */
export class StructuredExtractionService {
  /**
   * Extract structured clinical entities from text
   * In production: calls Comprehend Medical DetectEntities + LLM for structured mapping
   */
  async extractEntities(text: string, source: 'voice' | 'scan'): Promise<ExtractionResult> {
    console.log(`Starting extraction from ${source}, text length: ${text.length}`);
    
    // Extract entities using pattern matching (simulates Comprehend Medical)
    const entities = this.extractClinicalEntities(text, source);
    
    // Extract narratives
    const narratives = this.extractNarratives(text);
    
    // Map to structured registry fields (simulates LLM)
    const structuredData = this.mapToRegistryFields(text, entities);
    
    // Calculate overall confidence and completeness
    const overallConfidence = this.calculateOverallConfidence(entities, source);
    const dataCompleteness = this.calculateCompleteness(structuredData);
    
    structuredData.overallConfidence = overallConfidence;
    structuredData.dataCompleteness = dataCompleteness;
    
    const result: ExtractionResult = {
      entities,
      narratives,
      structuredData,
      extractionMetadata: {
        source,
        sourceText: text.substring(0, 500), // Store first 500 chars
        extractionMethod: 'hybrid',
        extractionTimestamp: new Date().toISOString(),
        modelVersion: 'mock-v1.0'
      }
    };
    
    console.log(`Extraction completed: ${entities.length} entities, confidence: ${overallConfidence.toFixed(2)}`);
    
    return result;
  }

  /**
   * Calculate confidence score for an entity based on source
   * Implements requirements 4.8, 4.9, 4.10
   */
  calculateConfidence(entity: ExtractedEntity, source: 'voice' | 'scan'): number {
    // Base confidence from entity detection
    let confidence = entity.confidence;
    
    // Apply source-specific adjustments
    if (source === 'scan') {
      // Printed text: 0.75-0.95, Handwritten: 0.50-0.75
      // For demo, assume printed text
      confidence = Math.max(0.75, Math.min(0.95, confidence));
    } else if (source === 'voice') {
      // Voice transcription quality affects confidence
      // For demo, apply slight reduction
      confidence = confidence * 0.9;
    }
    
    return Math.max(0.0, Math.min(1.0, confidence));
  }

  /**
   * Extract clinical entities from text (simulates Comprehend Medical)
   */
  private extractClinicalEntities(text: string, source: 'voice' | 'scan'): ExtractedEntity[] {
    const entities: ExtractedEntity[] = [];
    
    // Extract procedures
    const procedurePatterns = [
      /(?:PROCEDURE:|Procedure:)\s*([^\n]+)/gi,
      /(Laparoscopic\s+\w+)/gi,
      /(Cholecystectomy|Appendectomy|Hernia\s+Repair)/gi
    ];
    
    procedurePatterns.forEach(pattern => {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        entities.push({
          type: EntityType.PROCEDURE,
          value: match[1].trim(),
          confidence: this.calculateConfidence({ confidence: 0.92 } as ExtractedEntity, source),
          sourceText: match[0],
          sourceOffset: match.index
        });
      }
    });
    
    // Extract diagnoses
    const diagnosisPatterns = [
      /(?:INDICATION:|Diagnosis:)\s*([^\n]+)/gi,
      /(cholelithiasis|appendicitis|cholecystitis)/gi
    ];
    
    diagnosisPatterns.forEach(pattern => {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        entities.push({
          type: EntityType.DIAGNOSIS,
          value: match[1].trim(),
          confidence: this.calculateConfidence({ confidence: 0.88 } as ExtractedEntity, source),
          sourceText: match[0],
          sourceOffset: match.index
        });
      }
    });
    
    // Extract anatomy
    const anatomyPatterns = [
      /(gallbladder|appendix|liver|stomach|intestine|colon)/gi,
      /(Calot's\s+triangle)/gi
    ];
    
    anatomyPatterns.forEach(pattern => {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        entities.push({
          type: EntityType.ANATOMY,
          value: match[1].trim(),
          confidence: this.calculateConfidence({ confidence: 0.90 } as ExtractedEntity, source),
          sourceText: match[0],
          sourceOffset: match.index
        });
      }
    });
    
    // Extract devices
    const devicePatterns = [
      /(Veress\s+needle)/gi,
      /(\d+mm\s+port)/gi,
      /(retrieval\s+bag)/gi
    ];
    
    devicePatterns.forEach(pattern => {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        entities.push({
          type: EntityType.DEVICE,
          value: match[1].trim(),
          confidence: this.calculateConfidence({ confidence: 0.85 } as ExtractedEntity, source),
          sourceText: match[0],
          sourceOffset: match.index
        });
      }
    });
    
    // Extract vital signs
    const vitalPatterns = [
      /BP:\s*(\d+\/\d+)\s*mmHg/gi,
      /HR:\s*(\d+)\s*bpm/gi,
      /SpO2:\s*(\d+)%/gi,
      /Temp:\s*([\d.]+)°C/gi
    ];
    
    vitalPatterns.forEach(pattern => {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        entities.push({
          type: EntityType.VITAL_SIGN,
          value: match[1].trim(),
          confidence: this.calculateConfidence({ confidence: 0.95 } as ExtractedEntity, source),
          sourceText: match[0],
          sourceOffset: match.index
        });
      }
    });
    
    // Extract medications (if present)
    const medicationPatterns = [
      /(analgesics|antibiotics|morphine|fentanyl)/gi
    ];
    
    medicationPatterns.forEach(pattern => {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        entities.push({
          type: EntityType.MEDICATION,
          value: match[1].trim(),
          confidence: this.calculateConfidence({ confidence: 0.87 } as ExtractedEntity, source),
          sourceText: match[0],
          sourceOffset: match.index
        });
      }
    });
    
    return entities;
  }

  /**
   * Extract clinical narratives
   */
  private extractNarratives(text: string): ClinicalNarrative[] {
    const narratives: ClinicalNarrative[] = [];
    
    // Extract indication/reasoning
    const indicationMatch = text.match(/INDICATION:([^]*?)(?=PROCEDURE DETAILS:|$)/i);
    if (indicationMatch) {
      narratives.push({
        type: 'reasoning',
        text: indicationMatch[1].trim(),
        relatedEntities: []
      });
    }
    
    // Extract procedure details
    const detailsMatch = text.match(/PROCEDURE DETAILS:([^]*?)(?=FINDINGS:|$)/i);
    if (detailsMatch) {
      narratives.push({
        type: 'explanation',
        text: detailsMatch[1].trim(),
        relatedEntities: []
      });
    }
    
    // Extract findings
    const findingsMatch = text.match(/FINDINGS:([^]*?)(?=ESTIMATED BLOOD LOSS:|COMPLICATIONS:|$)/i);
    if (findingsMatch) {
      narratives.push({
        type: 'observation',
        text: findingsMatch[1].trim(),
        relatedEntities: []
      });
    }
    
    return narratives;
  }

  /**
   * Map extracted entities to structured registry fields (simulates LLM)
   */
  private mapToRegistryFields(text: string, entities: ExtractedEntity[]): RegistryFields {
    const fields: RegistryFields = {};
    
    // Extract patient information
    const patientMatch = text.match(/Patient:\s*([^\n]+)/i);
    if (patientMatch) fields.patientName = patientMatch[1].trim();
    
    const mrnMatch = text.match(/MRN:\s*(\d+)/i);
    if (mrnMatch) fields.mrn = mrnMatch[1].trim();
    
    const dobMatch = text.match(/DOB:\s*([^\n]+)/i);
    if (dobMatch) fields.dateOfBirth = dobMatch[1].trim();
    
    // Extract procedure information
    const procedureEntities = entities.filter(e => e.type === EntityType.PROCEDURE);
    if (procedureEntities.length > 0) {
      fields.procedureName = procedureEntities[0].value;
      // Map to procedure code (simplified)
      fields.procedureCode = this.mapProcedureToCode(procedureEntities[0].value);
    }
    
    const dateMatch = text.match(/Date of Procedure:\s*([^\n]+)/i);
    if (dateMatch) fields.procedureDate = dateMatch[1].trim();
    
    const surgeonMatch = text.match(/SURGEON:\s*([^\n]+)/i);
    if (surgeonMatch) fields.surgeonName = surgeonMatch[1].trim();
    
    // Extract diagnoses
    const diagnosisEntities = entities.filter(e => e.type === EntityType.DIAGNOSIS);
    if (diagnosisEntities.length > 0) {
      fields.primaryDiagnosis = diagnosisEntities[0].value;
      fields.secondaryDiagnoses = diagnosisEntities.slice(1).map(e => e.value);
    }
    
    // Extract complications
    const complicationMatch = text.match(/COMPLICATIONS:\s*([^\n]+)/i);
    if (complicationMatch) {
      const compText = complicationMatch[1].trim().toLowerCase();
      if (compText !== 'none') {
        fields.complications = [{
          type: compText,
          severity: 'minor',
          description: compText,
          onset: 'intraoperative'
        }];
      } else {
        fields.complications = [];
      }
    }
    
    // Extract devices
    const deviceEntities = entities.filter(e => e.type === EntityType.DEVICE);
    fields.devices = deviceEntities.map(e => ({
      name: e.value,
      implanted: false
    }));
    
    // Extract medications
    const medicationEntities = entities.filter(e => e.type === EntityType.MEDICATION);
    fields.medications = medicationEntities.map(e => ({
      name: e.value,
      dose: 'as needed',
      route: 'oral',
      frequency: 'PRN'
    }));
    
    // Extract vital signs
    const vitalEntities = entities.filter(e => e.type === EntityType.VITAL_SIGN);
    fields.vitalSigns = {};
    
    vitalEntities.forEach(e => {
      if (e.sourceText.includes('BP:')) {
        fields.vitalSigns!.bloodPressure = e.value;
      } else if (e.sourceText.includes('HR:')) {
        fields.vitalSigns!.heartRate = parseInt(e.value);
      } else if (e.sourceText.includes('SpO2:')) {
        fields.vitalSigns!.oxygenSaturation = parseInt(e.value);
      } else if (e.sourceText.includes('Temp:')) {
        fields.vitalSigns!.temperature = parseFloat(e.value);
      }
    });
    
    // Extract narratives
    const indicationMatch = text.match(/INDICATION:([^]*?)(?=PROCEDURE DETAILS:|$)/i);
    if (indicationMatch) {
      fields.clinicalReasoning = indicationMatch[1].trim();
    }
    
    const detailsMatch = text.match(/PROCEDURE DETAILS:([^]*?)(?=FINDINGS:|$)/i);
    if (detailsMatch) {
      fields.procedureNotes = detailsMatch[1].trim();
    }
    
    const planMatch = text.match(/PLAN:([^]*?)$/i);
    if (planMatch) {
      fields.postOpNotes = planMatch[1].trim();
    }
    
    return fields;
  }

  /**
   * Map procedure name to code (simplified)
   */
  private mapProcedureToCode(procedureName: string): string {
    const codeMap: Record<string, string> = {
      'laparoscopic cholecystectomy': '47562',
      'cholecystectomy': '47600',
      'appendectomy': '44970',
      'hernia repair': '49505'
    };
    
    const normalized = procedureName.toLowerCase();
    for (const [key, code] of Object.entries(codeMap)) {
      if (normalized.includes(key)) {
        return code;
      }
    }
    
    return 'UNKNOWN';
  }

  /**
   * Calculate overall confidence from entities
   */
  private calculateOverallConfidence(entities: ExtractedEntity[], _source: 'voice' | 'scan'): number {
    if (entities.length === 0) return 0.5;
    
    const sum = entities.reduce((acc, e) => acc + e.confidence, 0);
    return sum / entities.length;
  }

  /**
   * Calculate data completeness percentage
   */
  private calculateCompleteness(fields: RegistryFields): number {
    const requiredFields = [
      'patientName', 'mrn', 'procedureName', 'procedureDate', 
      'surgeonName', 'primaryDiagnosis'
    ];
    
    const filledRequired = requiredFields.filter(field => 
      fields[field as keyof RegistryFields] !== undefined && 
      fields[field as keyof RegistryFields] !== ''
    ).length;
    
    return (filledRequired / requiredFields.length) * 100;
  }
}

// Singleton instance for local development
export const extractionService = new StructuredExtractionService();
