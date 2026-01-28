/**
 * OCR Service - Mock implementation for local development
 * In production, this would integrate with Amazon Textract
 */

export interface OCRJob {
  jobId: string;
  status: 'IN_PROGRESS' | 'COMPLETED' | 'FAILED';
  startTime: string;
}

export interface TextBlock {
  text: string;
  blockType: 'LINE' | 'WORD';
  confidence: number;
  geometry: BoundingBox;
}

export interface BoundingBox {
  top: number;
  left: number;
  width: number;
  height: number;
}

export interface OCRResult {
  extractedText: string;
  blocks: TextBlock[];
  confidence: number;
  documentType: 'handwritten' | 'printed' | 'mixed';
}

export interface OCRStatus {
  jobId: string;
  status: 'IN_PROGRESS' | 'COMPLETED' | 'FAILED';
  progress: number;
}

/**
 * Mock OCR Service that simulates Amazon Textract behavior
 * For demo purposes, it extracts text from known clinical document patterns
 */
export class OCRService {
  private jobs: Map<string, { status: string; result?: OCRResult }> = new Map();

  /**
   * Start OCR processing on an image
   * In production: calls Amazon Textract DetectDocumentText API
   */
  async startOCR(imageS3Key: string): Promise<OCRJob> {
    const jobId = `ocr-job-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    // Store job as in progress
    this.jobs.set(jobId, { status: 'IN_PROGRESS' });

    // Simulate async OCR processing
    this.processOCR(jobId, imageS3Key).catch(error => {
      console.error('OCR processing failed:', error);
      this.jobs.set(jobId, { status: 'FAILED' });
    });

    return {
      jobId,
      status: 'IN_PROGRESS',
      startTime: new Date().toISOString()
    };
  }

  /**
   * Get OCR job status
   */
  async getOCRStatus(jobId: string): Promise<OCRStatus> {
    const job = this.jobs.get(jobId);
    
    if (!job) {
      throw new Error(`OCR job not found: ${jobId}`);
    }

    return {
      jobId,
      status: job.status as 'IN_PROGRESS' | 'COMPLETED' | 'FAILED',
      progress: job.status === 'COMPLETED' ? 100 : job.status === 'IN_PROGRESS' ? 50 : 0
    };
  }

  /**
   * Get OCR result
   */
  async getOCRResult(jobId: string): Promise<OCRResult> {
    const job = this.jobs.get(jobId);
    
    if (!job) {
      throw new Error(`OCR job not found: ${jobId}`);
    }

    if (job.status !== 'COMPLETED') {
      throw new Error(`OCR job not completed: ${job.status}`);
    }

    if (!job.result) {
      throw new Error('OCR result not available');
    }

    return job.result;
  }

  /**
   * Process OCR (mock implementation)
   * In production: this would be triggered by S3 event and call Textract
   */
  private async processOCR(jobId: string, _imageS3Key: string): Promise<void> {
    // Simulate processing delay
    await new Promise(resolve => setTimeout(resolve, 2000));

    try {
      // For demo purposes, generate realistic clinical text
      // In production, this would be actual OCR from Textract
      const extractedText = this.generateMockClinicalText();
      
      // Detect document type based on text characteristics
      const documentType = this.detectDocumentType(extractedText);
      
      // Generate text blocks with confidence scores
      const blocks = this.generateTextBlocks(extractedText, documentType);
      
      // Calculate overall confidence
      const confidence = blocks.reduce((sum, block) => sum + block.confidence, 0) / blocks.length;

      const result: OCRResult = {
        extractedText,
        blocks,
        confidence,
        documentType
      };

      // Store completed result
      this.jobs.set(jobId, { status: 'COMPLETED', result });
      
      console.log(`OCR completed for job ${jobId}:`, {
        textLength: extractedText.length,
        blockCount: blocks.length,
        confidence,
        documentType
      });
    } catch (error) {
      console.error('OCR processing error:', error);
      this.jobs.set(jobId, { status: 'FAILED' });
      throw error;
    }
  }

  /**
   * Generate mock clinical text for demo purposes
   * In production, this would be actual OCR output from Textract
   * Randomizes between different clinical scenarios for realistic demos
   */
  private generateMockClinicalText(): string {
    const scenarios = [
      this.generateCholecystectomy(),
      this.generateKneeArthroscopy(),
      this.generateHerniaRepair(),
      this.generateAppendectomy(),
      this.generateCarpalTunnel()
    ];
    
    // Randomly select a scenario
    const scenario = scenarios[Math.floor(Math.random() * scenarios.length)];
    return scenario;
  }

  private generateCholecystectomy(): string {
    return `OPERATIVE NOTE

Patient: Jane Doe
MRN: 11223344
DOB: 05/15/1978
Date: ${new Date().toLocaleDateString()}

Surgeon: Dr. Sarah Johnson
Procedure: Laparoscopic Cholecystectomy

Indication: Symptomatic cholelithiasis with recurrent biliary colic

Findings:
- Inflamed gallbladder with multiple stones
- No evidence of bile duct injury
- Liver appeared normal
- No other abnormalities noted

Procedure performed:
- Four-port laparoscopic approach
- Pneumoperitoneum established with Veress needle
- Calot's triangle dissected
- Cystic artery and duct clipped and divided
- Gallbladder removed via umbilical port

Complications: None

EBL: 50 mL

Vital Signs Post-Op:
- BP: 120/75 mmHg
- HR: 72 bpm
- SpO2: 98% on room air
- Temp: 36.8°C

Post-op plan:
- Pain management with oral analgesics
- Diet as tolerated
- Discharge same day if stable
- Follow-up 2 weeks`;
  }

  private generateKneeArthroscopy(): string {
    return `OPERATIVE NOTE

Patient: John Smith
MRN: 22334455
DOB: 03/22/1985
Date: ${new Date().toLocaleDateString()}

Surgeon: Dr. James Wilson
Procedure: Right knee arthroscopy

Indication: Medial meniscus tear

Findings:
- Grade 3 medial meniscus tear
- Intact ACL and PCL
- Mild chondromalacia patella
- No loose bodies

Procedure performed:
- Partial medial meniscectomy
- Debridement of unstable cartilage
- Synovial biopsy

Complications: None

EBL: <50 mL

Vital Signs Post-Op:
- BP: 118/72 mmHg
- HR: 68 bpm
- SpO2: 99% on room air
- Temp: 36.5°C

Post-op plan:
- Weight bearing as tolerated
- Physiotherapy starting day 1
- Ice and elevation
- NSAIDs for pain
- Follow-up 2 weeks`;
  }

  private generateHerniaRepair(): string {
    return `OPERATIVE NOTE

Patient: Robert Martinez
MRN: 33445566
DOB: 07/10/1972
Date: ${new Date().toLocaleDateString()}

Surgeon: Dr. Michael Chen
Procedure: Laparoscopic inguinal hernia repair

Indication: Right inguinal hernia

Findings:
- Indirect inguinal hernia, 3cm defect
- No incarceration or strangulation
- Normal bowel appearance

Procedure performed:
- Three-port laparoscopic approach
- Hernia sac reduced
- Mesh placement (10x15cm polypropylene)
- Secured with tacks and fibrin glue

Complications: None

EBL: 25 mL

Vital Signs Post-Op:
- BP: 125/80 mmHg
- HR: 75 bpm
- SpO2: 97% on room air
- Temp: 36.9°C

Post-op plan:
- No heavy lifting for 6 weeks
- Pain management with acetaminophen
- Return to light activity in 1 week
- Follow-up 2 weeks`;
  }

  private generateAppendectomy(): string {
    return `OPERATIVE NOTE

Patient: Emily Davis
MRN: 44556677
DOB: 11/30/1995
Date: ${new Date().toLocaleDateString()}

Surgeon: Dr. Lisa Anderson
Procedure: Laparoscopic appendectomy

Indication: Acute appendicitis

Findings:
- Inflamed appendix with periappendiceal fluid
- No perforation
- No abscess formation
- Normal cecum and terminal ileum

Procedure performed:
- Three-port laparoscopic approach
- Appendix mobilized and mesoappendix divided
- Appendix stapled at base and removed
- Irrigation of peritoneal cavity

Complications: None

EBL: 30 mL

Vital Signs Post-Op:
- BP: 115/70 mmHg
- HR: 70 bpm
- SpO2: 98% on room air
- Temp: 37.2°C

Post-op plan:
- IV antibiotics for 24 hours
- Clear liquids advancing to regular diet
- Pain management with IV/oral analgesics
- Discharge when tolerating diet
- Follow-up 1 week`;
  }

  private generateCarpalTunnel(): string {
    return `OPERATIVE NOTE

Patient: Patricia Brown
MRN: 55667788
DOB: 09/15/1968
Date: ${new Date().toLocaleDateString()}

Surgeon: Dr. David Thompson
Procedure: Right carpal tunnel release

Indication: Severe carpal tunnel syndrome

Findings:
- Thickened transverse carpal ligament
- Compressed median nerve
- No tenosynovitis
- Normal flexor tendons

Procedure performed:
- Open carpal tunnel release
- Transverse carpal ligament divided
- Median nerve decompressed
- Hemostasis achieved

Complications: None

EBL: <10 mL

Vital Signs Post-Op:
- BP: 122/78 mmHg
- HR: 74 bpm
- SpO2: 98% on room air
- Temp: 36.7°C

Post-op plan:
- Hand elevation for 48 hours
- Finger exercises immediately
- Splint for comfort only
- Pain management with oral analgesics
- Suture removal 10-14 days
- Follow-up 2 weeks`;
  }

  /**
   * Detect document type based on text characteristics
   */
  private detectDocumentType(text: string): 'handwritten' | 'printed' | 'mixed' {
    // For demo purposes, assume printed text
    // In production, Textract provides this information
    
    // Simple heuristic: if text has many formatting characters, likely printed
    const hasFormatting = /[:\-\n\t]/.test(text);
    const hasStructure = text.includes('PROCEDURE:') || text.includes('Patient:');
    
    if (hasFormatting && hasStructure) {
      return 'printed';
    }
    
    // Could be handwritten if less structured
    return text.length < 500 ? 'handwritten' : 'mixed';
  }

  /**
   * Generate text blocks with confidence scores
   */
  private generateTextBlocks(text: string, documentType: 'handwritten' | 'printed' | 'mixed'): TextBlock[] {
    const lines = text.split('\n').filter(line => line.trim().length > 0);
    const blocks: TextBlock[] = [];
    
    // Base confidence based on document type (as per requirements)
    const baseConfidence = documentType === 'printed' ? 0.85 : 
                          documentType === 'handwritten' ? 0.625 : 0.75;
    
    lines.forEach((line, index) => {
      // Add some variance to confidence scores
      const variance = (Math.random() - 0.5) * 0.1;
      const confidence = Math.max(0.5, Math.min(0.95, baseConfidence + variance));
      
      blocks.push({
        text: line.trim(),
        blockType: 'LINE',
        confidence,
        geometry: {
          top: index * 0.05,
          left: 0.05,
          width: 0.9,
          height: 0.04
        }
      });
    });
    
    return blocks;
  }
}

// Singleton instance for local development
export const ocrService = new OCRService();
