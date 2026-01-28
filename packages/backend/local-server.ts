/**
 * Local Development Server with OCR and Extraction
 * Simulates AWS Lambda + Textract + Comprehend Medical behavior
 */

import express, { Request, Response } from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import fs from 'fs';
import path from 'path';
import { randomUUID } from 'crypto';
import { fileURLToPath } from 'url';
import { ocrService } from './src/services/ocrService.js';
import { extractionService } from './src/services/extractionService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json({ limit: '50mb' }));

// Mock data storage - use root local-data folder, not dist/local-data
// When compiled, __dirname is dist/, so we go up one level
const dataDir = path.join(__dirname, '..', 'local-data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Health check
app.get('/', (_req: Request, res: Response) => {
  res.json({ 
    message: 'Clinical Registry Local API Server with AI Extraction',
    status: 'running',
    features: ['OCR', 'Entity Extraction', 'Structured Data Mapping'],
    endpoints: {
      health: 'GET /',
      ingest: 'POST /ingest',
      records: 'GET /records',
      record: 'GET /records/:id',
      ocrStatus: 'GET /ocr/:jobId',
      extractedData: 'GET /records/:id/extracted'
    }
  });
});

// Ingestion endpoint with automatic OCR and extraction
app.post('/ingest', async (req: Request, res: Response) => {
  try {
    const { patientId, encounterId, userId, contentType, data, metadata } = req.body;

    // Validate Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({
        error: {
          code: 'AUTHORIZATION_ERROR',
          message: 'Authorization header is required',
          retryable: false,
          timestamp: new Date().toISOString(),
          requestId: 'local-' + Date.now(),
        },
      });
    }

    // Validate request
    if (!patientId || !encounterId || !userId || !contentType || !data || !metadata) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Missing required fields',
          retryable: false,
          timestamp: new Date().toISOString(),
          requestId: 'local-' + Date.now(),
        },
      });
    }

    if (!['audio', 'image'].includes(contentType)) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid content type. Must be "audio" or "image"',
          retryable: false,
          timestamp: new Date().toISOString(),
          requestId: 'local-' + Date.now(),
        },
      });
    }

    // Generate record ID
    const recordId = randomUUID();
    const timestamp = new Date().toISOString();

    // Save data locally
    const fileName = contentType === 'audio' ? 'audio.webm' : 'image.jpg';
    const s3Key = `${patientId}/${encounterId}/${recordId}/${fileName}`;
    const filePath = path.join(dataDir, `${recordId}-${fileName}`);
    
    // Decode base64 and save
    const buffer = Buffer.from(data, 'base64');
    fs.writeFileSync(filePath, buffer);

    console.log(`✅ [${timestamp}] Saved ${contentType} for record ${recordId}`);
    console.log(`   Patient: ${patientId}, Encounter: ${encounterId}, User: ${userId}`);
    console.log(`   File: ${filePath}`);
    console.log(`   Context: ${metadata.context}`);

    // Start async processing based on content type
    let jobId: string;
    
    if (contentType === 'image') {
      console.log(`🔍 Starting OCR processing for ${recordId}...`);
      const ocrJob = await ocrService.startOCR(s3Key);
      jobId = ocrJob.jobId;
      
      // Process extraction after OCR completes (async)
      processImageExtraction(recordId, ocrJob.jobId, patientId, encounterId, userId, metadata, timestamp, s3Key);
    } else {
      // For audio, we'd start transcription here
      // For now, just create a placeholder job
      jobId = `mock-transcription-job-${recordId}`;
      console.log(`🎤 Audio transcription not yet implemented (would start job ${jobId})`);
    }

    // Save initial metadata
    const metadataPath = path.join(dataDir, `${recordId}-metadata.json`);
    const recordMetadata = {
      recordId,
      patientId,
      encounterId,
      userId,
      contentType,
      metadata,
      timestamp,
      filePath,
      s3Key,
      status: 'processing',
      versionNumber: '0.0',
      processingJobId: jobId
    };
    fs.writeFileSync(metadataPath, JSON.stringify(recordMetadata, null, 2));

    // Return response
    res.json({
      success: true,
      recordId,
      s3Key,
      uploadTimestamp: timestamp,
      jobId,
      message: contentType === 'image' ? 'OCR and extraction in progress' : 'Transcription not yet implemented'
    });
  } catch (error) {
    console.error('❌ Error:', error);
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An unexpected error occurred',
        retryable: true,
        timestamp: new Date().toISOString(),
        requestId: 'local-' + Date.now(),
      },
    });
  }
});

/**
 * Process image: OCR → Extraction → Save structured data
 */
async function processImageExtraction(
  recordId: string,
  ocrJobId: string,
  _patientId: string,
  _encounterId: string,
  _userId: string,
  _metadata: any,
  _timestamp: string,
  _s3Key: string
) {
  try {
    // Wait for OCR to complete
    let ocrStatus = await ocrService.getOCRStatus(ocrJobId);
    while (ocrStatus.status === 'IN_PROGRESS') {
      await new Promise(resolve => setTimeout(resolve, 1000));
      ocrStatus = await ocrService.getOCRStatus(ocrJobId);
    }

    if (ocrStatus.status === 'FAILED') {
      console.error(`❌ OCR failed for ${recordId}`);
      updateRecordStatus(recordId, 'failed', { error: 'OCR processing failed' });
      return;
    }

    console.log(`✅ OCR completed for ${recordId}`);

    // Get OCR result
    const ocrResult = await ocrService.getOCRResult(ocrJobId);
    console.log(`📄 Extracted ${ocrResult.extractedText.length} characters`);
    console.log(`   Document type: ${ocrResult.documentType}`);
    console.log(`   Confidence: ${(ocrResult.confidence * 100).toFixed(1)}%`);

    // Perform structured extraction
    console.log(`🧠 Starting entity extraction for ${recordId}...`);
    const extractionResult = await extractionService.extractEntities(
      ocrResult.extractedText,
      'scan'
    );

    console.log(`✅ Extraction completed for ${recordId}`);
    console.log(`   Entities found: ${extractionResult.entities.length}`);
    console.log(`   Overall confidence: ${(extractionResult.structuredData.overallConfidence! * 100).toFixed(1)}%`);
    console.log(`   Data completeness: ${extractionResult.structuredData.dataCompleteness!.toFixed(1)}%`);

    // Update metadata with extracted data
    const metadataPath = path.join(dataDir, `${recordId}-metadata.json`);
    const existingMetadata = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
    
    const updatedMetadata = {
      ...existingMetadata,
      status: 'draft',
      ocrResult: {
        jobId: ocrJobId,
        extractedText: ocrResult.extractedText,
        confidence: ocrResult.confidence,
        documentType: ocrResult.documentType,
        blockCount: ocrResult.blocks.length
      },
      extractionResult: {
        entities: extractionResult.entities,
        narratives: extractionResult.narratives,
        metadata: extractionResult.extractionMetadata
      },
      structuredData: extractionResult.structuredData,
      processedAt: new Date().toISOString()
    };

    fs.writeFileSync(metadataPath, JSON.stringify(updatedMetadata, null, 2));

    console.log(`💾 Saved extracted data for ${recordId}`);
    console.log('');
    console.log('📊 Extracted Fields:');
    if (extractionResult.structuredData.patientName) {
      console.log(`   Patient: ${extractionResult.structuredData.patientName}`);
    }
    if (extractionResult.structuredData.mrn) {
      console.log(`   MRN: ${extractionResult.structuredData.mrn}`);
    }
    if (extractionResult.structuredData.procedureName) {
      console.log(`   Procedure: ${extractionResult.structuredData.procedureName}`);
    }
    if (extractionResult.structuredData.surgeonName) {
      console.log(`   Surgeon: ${extractionResult.structuredData.surgeonName}`);
    }
    console.log('');

  } catch (error) {
    console.error(`❌ Error processing ${recordId}:`, error);
    updateRecordStatus(recordId, 'failed', { error: String(error) });
  }
}

/**
 * Update record status
 */
function updateRecordStatus(recordId: string, status: string, additionalData: any = {}) {
  try {
    const metadataPath = path.join(dataDir, `${recordId}-metadata.json`);
    if (fs.existsSync(metadataPath)) {
      const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
      metadata.status = status;
      Object.assign(metadata, additionalData);
      fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2));
    }
  } catch (error) {
    console.error(`Error updating status for ${recordId}:`, error);
  }
}

// NEW: Manual text input for extraction (for testing with real documents)
app.post('/extract-from-text', async (req: Request, res: Response) => {
  try {
    const { text, patientId, encounterId, userId, context } = req.body;

    if (!text) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Text field is required',
          retryable: false,
          timestamp: new Date().toISOString(),
          requestId: 'local-' + Date.now(),
        },
      });
    }

    const recordId = randomUUID();
    const timestamp = new Date().toISOString();

    console.log(`📝 Processing text extraction for record ${recordId}`);
    console.log(`   Text length: ${text.length} characters`);

    // Perform extraction directly on the provided text
    const extractionResult = await extractionService.extractEntities(text, 'scan');

    console.log(`✅ Extraction completed for ${recordId}`);
    console.log(`   Entities found: ${extractionResult.entities.length}`);
    console.log(`   Overall confidence: ${(extractionResult.structuredData.overallConfidence! * 100).toFixed(1)}%`);
    console.log(`   Data completeness: ${extractionResult.structuredData.dataCompleteness!.toFixed(1)}%`);

    // Save metadata
    const metadataPath = path.join(dataDir, `${recordId}-metadata.json`);
    const metadata = {
      recordId,
      patientId: patientId || extractionResult.structuredData.patientId || 'extracted-from-text',
      encounterId: encounterId || 'encounter-demo-001',
      userId: userId || 'user-demo-001',
      contentType: 'text',
      metadata: {
        timestamp,
        context: context || 'office'
      },
      timestamp,
      status: 'draft',
      versionNumber: '0.0',
      extractionResult: {
        entities: extractionResult.entities,
        narratives: extractionResult.narratives,
        metadata: extractionResult.extractionMetadata
      },
      structuredData: extractionResult.structuredData,
      processedAt: new Date().toISOString()
    };

    fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2));

    console.log(`💾 Saved extracted data for ${recordId}`);
    console.log('');
    console.log('📊 Extracted Fields:');
    if (extractionResult.structuredData.patientName) {
      console.log(`   Patient: ${extractionResult.structuredData.patientName}`);
    }
    if (extractionResult.structuredData.mrn) {
      console.log(`   MRN: ${extractionResult.structuredData.mrn}`);
    }
    if (extractionResult.structuredData.procedureName) {
      console.log(`   Procedure: ${extractionResult.structuredData.procedureName}`);
    }
    if (extractionResult.structuredData.surgeonName) {
      console.log(`   Surgeon: ${extractionResult.structuredData.surgeonName}`);
    }
    console.log('');

    res.json({
      success: true,
      recordId,
      timestamp,
      structuredData: extractionResult.structuredData,
      entities: extractionResult.entities,
      quality: {
        overallConfidence: extractionResult.structuredData.overallConfidence,
        dataCompleteness: extractionResult.structuredData.dataCompleteness,
        entitiesExtracted: extractionResult.entities.length
      }
    });
  } catch (error) {
    console.error('❌ Error:', error);
    res.status(500).json({
      error: {
        code: 'EXTRACTION_ERROR',
        message: 'Failed to extract data from text',
        retryable: true,
        timestamp: new Date().toISOString(),
        requestId: 'local-' + Date.now(),
      },
    });
  }
});

// Get OCR status
app.get('/ocr/:jobId', async (req: Request, res: Response) => {
  try {
    const { jobId } = req.params;
    const status = await ocrService.getOCRStatus(jobId as string);
    res.json(status);
  } catch (error: any) {
    res.status(404).json({ error: error.message });
  }
});

// Get extracted data for a record
app.get('/records/:recordId/extracted', (req: Request, res: Response) => {
  try {
    const { recordId } = req.params;
    const metadataPath = path.join(dataDir, `${recordId}-metadata.json`);
    
    if (!fs.existsSync(metadataPath)) {
      return res.status(404).json({ error: 'Record not found' });
    }

    const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
    
    if (!metadata.structuredData) {
      return res.status(404).json({ 
        error: 'No extracted data available',
        status: metadata.status 
      });
    }

    res.json({
      recordId,
      status: metadata.status,
      structuredData: metadata.structuredData,
      ocrResult: metadata.ocrResult,
      extractionResult: metadata.extractionResult
    });
  } catch (error) {
    console.error('Error getting extracted data:', error);
    res.status(500).json({ error: 'Failed to get extracted data' });
  }
});

// NEW: Get clean summary of extracted data (demo-friendly)
app.get('/records/:recordId/summary', (req: Request, res: Response) => {
  try {
    const { recordId } = req.params;
    const metadataPath = path.join(dataDir, `${recordId}-metadata.json`);
    
    if (!fs.existsSync(metadataPath)) {
      return res.status(404).json({ error: 'Record not found' });
    }

    const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
    
    if (!metadata.structuredData) {
      return res.status(404).json({ 
        error: 'No extracted data available',
        status: metadata.status 
      });
    }

    const data = metadata.structuredData;
    
    // Create a clean, demo-friendly summary
    const summary = {
      recordId,
      uploadedAt: metadata.timestamp,
      processedAt: metadata.processedAt,
      
      patient: {
        name: data.patientName,
        mrn: data.mrn,
        dateOfBirth: data.dateOfBirth,
        gender: data.gender
      },
      
      procedure: {
        name: data.procedureName,
        code: data.procedureCode,
        date: data.procedureDate,
        surgeon: data.surgeonName,
        facility: data.facility
      },
      
      clinical: {
        primaryDiagnosis: data.primaryDiagnosis,
        secondaryDiagnoses: data.secondaryDiagnoses || [],
        complications: data.complications || [],
        devices: data.devices || [],
        medications: data.medications || []
      },
      
      vitalSigns: data.vitalSigns || {},
      
      narratives: {
        indication: data.clinicalReasoning,
        procedureNotes: data.procedureNotes,
        postOpPlan: data.postOpNotes
      },
      
      quality: {
        overallConfidence: `${(data.overallConfidence * 100).toFixed(1)}%`,
        dataCompleteness: `${data.dataCompleteness.toFixed(1)}%`,
        entitiesExtracted: metadata.extractionResult?.entities?.length || 0,
        ocrConfidence: `${(metadata.ocrResult?.confidence * 100).toFixed(1)}%`,
        documentType: metadata.ocrResult?.documentType
      }
    };

    res.json(summary);
  } catch (error) {
    console.error('Error getting summary:', error);
    res.status(500).json({ error: 'Failed to get summary' });
  }
});

// List all records
app.get('/records', (_req: Request, res: Response) => {
  try {
    const files = fs.readdirSync(dataDir);
    const metadataFiles = files.filter(f => f.endsWith('-metadata.json'));
    
    const records = metadataFiles.map(file => {
      const content = fs.readFileSync(path.join(dataDir, file), 'utf8');
      return JSON.parse(content);
    });

    res.json({
      count: records.length,
      records: records.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    });
  } catch (error) {
    console.error('Error listing records:', error);
    res.status(500).json({ error: 'Failed to list records' });
  }
});

// Get specific record
app.get('/records/:recordId', (req: Request, res: Response) => {
  try {
    const { recordId } = req.params;
    const metadataPath = path.join(dataDir, `${recordId}-metadata.json`);
    
    if (!fs.existsSync(metadataPath)) {
      return res.status(404).json({ error: 'Record not found' });
    }

    const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
    res.json(metadata);
  } catch (error) {
    console.error('Error getting record:', error);
    res.status(500).json({ error: 'Failed to get record' });
  }
});

// Start server
app.listen(PORT, () => {
  console.log('');
  console.log('🚀 ========================================');
  console.log('   Clinical Registry Local API Server');
  console.log('   WITH AI EXTRACTION');
  console.log('========================================');
  console.log('');
  console.log(`✅ Server running at http://localhost:${PORT}`);
  console.log(`📁 Data stored in: ${dataDir}`);
  console.log('');
  console.log('🤖 AI Features Enabled:');
  console.log('   ✓ OCR (Optical Character Recognition)');
  console.log('   ✓ Entity Extraction (Clinical NLP)');
  console.log('   ✓ Structured Data Mapping');
  console.log('');
  console.log('📋 Available endpoints:');
  console.log(`   GET  http://localhost:${PORT}/                    - Health check`);
  console.log(`   POST http://localhost:${PORT}/ingest              - Upload audio/image`);
  console.log(`   POST http://localhost:${PORT}/extract-from-text   - Extract from pasted text`);
  console.log(`   GET  http://localhost:${PORT}/records             - List all records`);
  console.log(`   GET  http://localhost:${PORT}/records/:id         - Get specific record`);
  console.log(`   GET  http://localhost:${PORT}/records/:id/extracted - Get extracted data`);
  console.log(`   GET  http://localhost:${PORT}/records/:id/summary - Get clean summary (demo)`);
  console.log(`   GET  http://localhost:${PORT}/ocr/:jobId          - Get OCR status`);
  console.log('');
  console.log('🧪 Test with:');
  console.log(`   curl http://localhost:${PORT}/`);
  console.log('');
  console.log('⏹️  Press Ctrl+C to stop');
  console.log('');
});
