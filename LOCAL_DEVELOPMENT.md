# Local Development Setup (No AWS Required)

If you want to develop and test locally before deploying to AWS, here's how to set up a local development environment.

## Option 1: Mock API Server (Quickest)

Create a simple Express server to mock the ingestion endpoint.

### Step 1: Create Mock Server

Create `packages/backend/local-server.js`:

```javascript
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');

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
  res.json({ message: 'Local Clinical Registry API Server' });
});

// Ingestion endpoint
app.post('/ingest', (req, res) => {
  try {
    const { patientId, encounterId, userId, contentType, data, metadata } = req.body;

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

    // Generate mock record ID
    const recordId = `local-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const timestamp = new Date().toISOString();

    // Save data locally
    const fileName = contentType === 'audio' ? 'audio.webm' : 'image.jpg';
    const filePath = path.join(dataDir, `${recordId}-${fileName}`);
    
    // Decode base64 and save
    const buffer = Buffer.from(data, 'base64');
    fs.writeFileSync(filePath, buffer);

    // Save metadata
    const metadataPath = path.join(dataDir, `${recordId}-metadata.json`);
    fs.writeFileSync(metadataPath, JSON.stringify({
      recordId,
      patientId,
      encounterId,
      userId,
      contentType,
      metadata,
      timestamp,
      filePath,
    }, null, 2));

    console.log(`✅ Saved ${contentType} for record ${recordId}`);

    // Mock response
    res.json({
      success: true,
      recordId,
      s3Key: `${patientId}/${encounterId}/${recordId}/${fileName}`,
      uploadTimestamp: timestamp,
      jobId: `mock-job-${recordId}`,
    });
  } catch (error) {
    console.error('Error:', error);
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

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Local API server running at http://localhost:${PORT}`);
  console.log(`📁 Data stored in: ${dataDir}`);
  console.log(`\nTest with:`);
  console.log(`  curl http://localhost:${PORT}/`);
});
```

### Step 2: Install Dependencies

```powershell
cd packages/backend
npm install express cors body-parser
```

### Step 3: Add Script to package.json

Add to `packages/backend/package.json`:

```json
{
  "scripts": {
    "dev": "node local-server.js"
  }
}
```

### Step 4: Start Local Server

```powershell
cd packages/backend
npm run dev
```

You should see:
```
🚀 Local API server running at http://localhost:3000
📁 Data stored in: C:\...\packages\backend\local-data
```

### Step 5: Configure Frontend

Create `packages/frontend/.env.local`:

```env
VITE_API_ENDPOINT=http://localhost:3000
```

### Step 6: Start Frontend

```powershell
cd packages/frontend
npm run dev
```

### Step 7: Test!

1. Open http://localhost:5173
2. Record audio or capture image
3. Upload
4. Check `packages/backend/local-data/` for saved files
5. Check terminal for logs

---

## Option 2: LocalStack (AWS Emulation)

LocalStack emulates AWS services locally.

### Prerequisites

- Docker Desktop for Windows
- Python 3.x

### Step 1: Install LocalStack

```powershell
pip install localstack
```

### Step 2: Start LocalStack

```powershell
localstack start
```

Or with Docker:
```powershell
docker run -d -p 4566:4566 -p 4571:4571 localstack/localstack
```

### Step 3: Configure AWS CLI for LocalStack

```powershell
aws configure --profile localstack
# AWS Access Key ID: test
# AWS Secret Access Key: test
# Default region: us-east-1
# Default output format: json
```

### Step 4: Deploy to LocalStack

```powershell
cd packages/backend
cdk deploy --profile localstack
```

### Step 5: Use LocalStack Endpoint

Frontend `.env.local`:
```env
VITE_API_ENDPOINT=http://localhost:4566
```

---

## Option 3: Serverless Offline

Use Serverless Framework's offline plugin.

### Step 1: Install Serverless

```powershell
npm install -g serverless
npm install --save-dev serverless-offline
```

### Step 2: Create serverless.yml

Create `packages/backend/serverless.yml`:

```yaml
service: clinical-registry-local

provider:
  name: aws
  runtime: nodejs20.x
  stage: local
  region: us-east-1

functions:
  ingestion:
    handler: dist/lambdas/ingestion/handler.handler
    events:
      - http:
          path: ingest
          method: post
          cors: true

plugins:
  - serverless-offline

custom:
  serverless-offline:
    httpPort: 3000
```

### Step 3: Start Offline

```powershell
cd packages/backend
npm run build
serverless offline
```

---

## Comparison

| Method | Pros | Cons | Best For |
|--------|------|------|----------|
| **Mock Server** | ✅ Simplest<br>✅ No dependencies<br>✅ Fast | ❌ Not AWS-like<br>❌ No real services | Quick testing |
| **LocalStack** | ✅ AWS-like<br>✅ Multiple services | ❌ Requires Docker<br>❌ Complex setup | Full testing |
| **Serverless Offline** | ✅ Lambda-like<br>✅ Easy setup | ❌ Limited services | Lambda testing |

---

## Recommended Workflow

1. **Start with Mock Server** for initial frontend development
2. **Test locally** with mock data
3. **Deploy to AWS** when ready for real services
4. **Use LocalStack** for integration testing (optional)

---

## Mock Server Features

The mock server includes:
- ✅ Request validation
- ✅ Base64 decoding
- ✅ File storage
- ✅ Metadata tracking
- ✅ Error responses
- ✅ CORS support

**What it doesn't do:**
- ❌ Actual transcription (Transcribe Medical)
- ❌ Actual OCR (Textract)
- ❌ DynamoDB storage
- ❌ S3 storage
- ❌ KMS encryption

---

## Testing with Mock Server

### Test Audio Upload

```powershell
# Create test audio file (base64)
$audioData = [Convert]::ToBase64String([System.Text.Encoding]::UTF8.GetBytes("test audio data"))

# Send request
curl -X POST http://localhost:3000/ingest `
  -H "Content-Type: application/json" `
  -H "Authorization: Bearer test-token" `
  -d "{
    \"patientId\": \"patient-123\",
    \"encounterId\": \"encounter-456\",
    \"userId\": \"user-789\",
    \"contentType\": \"audio\",
    \"data\": \"$audioData\",
    \"metadata\": {
      \"timestamp\": \"2024-01-01T00:00:00.000Z\",
      \"deviceInfo\": {
        \"deviceType\": \"desktop\",
        \"platform\": \"Windows\",
        \"browser\": \"Chrome\"
      },
      \"context\": \"office\"
    }
  }"
```

### View Saved Files

```powershell
# List saved files
ls packages/backend/local-data/

# View metadata
cat packages/backend/local-data/*-metadata.json
```

---

## Next Steps

Once you're ready to deploy to AWS:

1. Follow [SETUP_PREREQUISITES.md](./SETUP_PREREQUISITES.md) to install AWS CLI and CDK
2. Follow [QUICK_START.md](./QUICK_START.md) to deploy
3. Update frontend `.env.local` with real API endpoint

---

## Troubleshooting

### Port 3000 already in use
```powershell
# Change PORT in local-server.js
const PORT = 3001;
```

### CORS errors
- Verify mock server is running
- Check frontend is using correct endpoint
- Verify CORS is enabled in mock server

### Files not saving
- Check `local-data` directory exists
- Verify write permissions
- Check disk space

### Frontend can't connect
- Verify mock server is running on port 3000
- Check `.env.local` has correct endpoint
- Restart frontend dev server after changing .env

---

## Clean Up

```powershell
# Stop mock server: Ctrl+C

# Delete local data
rm -r packages/backend/local-data
```

---

## Ready for AWS?

When you're ready to deploy to real AWS:
1. Install AWS CLI and CDK (see [SETUP_PREREQUISITES.md](./SETUP_PREREQUISITES.md))
2. Deploy infrastructure (see [QUICK_START.md](./QUICK_START.md))
3. Update frontend endpoint to real API Gateway URL
