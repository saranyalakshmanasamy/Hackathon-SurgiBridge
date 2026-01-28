import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import fs from 'fs';
import path from 'path';
import { randomUUID } from 'crypto';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json({ limit: '50mb' }));

// Mock data storage
const dataDir = path.join(__dirname, 'local-data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Health check
app.get('/', (req, res) => {
  res.json({ 
    message: 'Clinical Registry Local API Server',
    status: 'running',
    endpoints: {
      health: 'GET /',
      ingest: 'POST /ingest'
    }
  });
});

// Ingestion endpoint (matches the Lambda handler)
app.post('/ingest', (req, res) => {
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

    // Generate mock record ID
    const recordId = randomUUID();
    const timestamp = new Date().toISOString();

    // Save data locally
    const fileName = contentType === 'audio' ? 'audio.webm' : 'image.jpg';
    const s3Key = `${patientId}/${encounterId}/${recordId}/${fileName}`;
    const filePath = path.join(dataDir, `${recordId}-${fileName}`);
    
    // Decode base64 and save
    const buffer = Buffer.from(data, 'base64');
    fs.writeFileSync(filePath, buffer);

    // Save metadata
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
      status: 'draft',
      versionNumber: '0.0',
    };
    fs.writeFileSync(metadataPath, JSON.stringify(recordMetadata, null, 2));

    console.log(`✅ [${timestamp}] Saved ${contentType} for record ${recordId}`);
    console.log(`   Patient: ${patientId}, Encounter: ${encounterId}, User: ${userId}`);
    console.log(`   File: ${filePath}`);
    console.log(`   Context: ${metadata.context}`);

    // Mock response (matches Lambda response)
    res.json({
      success: true,
      recordId,
      s3Key,
      uploadTimestamp: timestamp,
      jobId: `mock-${contentType}-job-${recordId}`,
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

// List all records
app.get('/records', (req, res) => {
  try {
    const files = fs.readdirSync(dataDir);
    const metadataFiles = files.filter(f => f.endsWith('-metadata.json'));
    
    const records = metadataFiles.map(file => {
      const content = fs.readFileSync(path.join(dataDir, file), 'utf8');
      return JSON.parse(content);
    });

    res.json({
      count: records.length,
      records: records.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
    });
  } catch (error) {
    console.error('Error listing records:', error);
    res.status(500).json({ error: 'Failed to list records' });
  }
});

// Get specific record
app.get('/records/:recordId', (req, res) => {
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
  console.log('========================================');
  console.log('');
  console.log(`✅ Server running at http://localhost:${PORT}`);
  console.log(`📁 Data stored in: ${dataDir}`);
  console.log('');
  console.log('📋 Available endpoints:');
  console.log(`   GET  http://localhost:${PORT}/          - Health check`);
  console.log(`   POST http://localhost:${PORT}/ingest    - Upload audio/image`);
  console.log(`   GET  http://localhost:${PORT}/records   - List all records`);
  console.log(`   GET  http://localhost:${PORT}/records/:id - Get specific record`);
  console.log('');
  console.log('🧪 Test with:');
  console.log(`   curl http://localhost:${PORT}/`);
  console.log('');
  console.log('⏹️  Press Ctrl+C to stop');
  console.log('');
});
