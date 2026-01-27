# Integration Guide: Ingestion Lambda & Frontend

This guide walks you through deploying the ingestion Lambda function and integrating it with the frontend components.

## Table of Contents
1. [Prerequisites](#prerequisites)
2. [Backend Deployment](#backend-deployment)
3. [Frontend Integration](#frontend-integration)
4. [Testing the Integration](#testing-the-integration)
5. [Troubleshooting](#troubleshooting)

---

## Prerequisites

### Required Tools
- Node.js 20.x or higher
- npm 10.x or higher
- AWS CLI v2 configured with credentials
- AWS CDK CLI v2.115.0 or higher

### AWS Account Requirements
- AWS account with appropriate permissions
- IAM permissions for:
  - CloudFormation
  - Lambda
  - API Gateway
  - DynamoDB
  - S3
  - KMS
  - IAM
  - CloudWatch
  - Transcribe Medical
  - Textract

### First-Time CDK Setup
```bash
# Install CDK CLI globally
npm install -g aws-cdk

# Bootstrap CDK in your AWS account (one-time setup)
cdk bootstrap aws://YOUR-ACCOUNT-ID/YOUR-REGION

# Example:
cdk bootstrap aws://123456789012/us-east-1
```

---

## Backend Deployment

### Step 1: Install Dependencies

```bash
# From project root
npm install

# Install backend dependencies
cd packages/backend
npm install
```

### Step 2: Build the Backend

```bash
# From packages/backend directory
npm run build
```

This compiles TypeScript to JavaScript and validates the code.

### Step 3: Review Infrastructure Changes

```bash
# Synthesize CloudFormation template
npm run synth

# Preview changes (optional but recommended)
cdk diff
```

This shows what resources will be created/modified.

### Step 4: Deploy Infrastructure

```bash
# Deploy the stack
npm run deploy

# Or with auto-approval (for CI/CD)
cdk deploy --require-approval never
```

**Deployment creates:**
- ✅ DynamoDB table with GSIs
- ✅ 3 S3 buckets (audio, images, reports)
- ✅ KMS encryption key
- ✅ Lambda function (ingestion handler)
- ✅ API Gateway REST API
- ✅ IAM roles and policies
- ✅ CloudWatch log groups

### Step 5: Note Stack Outputs

After deployment completes, save these outputs:

```bash
# View stack outputs
aws cloudformation describe-stacks \
  --stack-name ClinicalRegistryStack \
  --query 'Stacks[0].Outputs'
```

**Important outputs:**
- `ApiEndpoint`: Your API Gateway URL (e.g., `https://abc123.execute-api.us-east-1.amazonaws.com/prod/`)
- `RegistryTableName`: DynamoDB table name
- `AudioBucketName`: S3 bucket for audio files
- `ImagesBucketName`: S3 bucket for images
- `KmsKeyId`: Encryption key ID

---

## Frontend Integration

### Step 1: Create API Client Service

Create `packages/frontend/src/services/apiClient.ts`:

```typescript
import axios, { AxiosInstance } from 'axios';

const API_ENDPOINT = import.meta.env.VITE_API_ENDPOINT || 'http://localhost:3000';

class ApiClient {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: API_ENDPOINT,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Add request interceptor for authentication
    this.client.interceptors.request.use(
      (config) => {
        // Add auth token if available
        const token = localStorage.getItem('authToken');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );
  }

  async uploadAudio(audioBlob: Blob, metadata: {
    patientId: string;
    encounterId: string;
    userId: string;
    context: 'theatre' | 'ward' | 'office';
    deviceInfo: {
      deviceType: 'mobile' | 'desktop';
      platform: string;
      browser: string;
    };
  }) {
    // Convert blob to base64
    const base64Data = await this.blobToBase64(audioBlob);

    const response = await this.client.post('/ingest', {
      patientId: metadata.patientId,
      encounterId: metadata.encounterId,
      userId: metadata.userId,
      contentType: 'audio',
      data: base64Data,
      metadata: {
        timestamp: new Date().toISOString(),
        deviceInfo: metadata.deviceInfo,
        context: metadata.context,
      },
    });

    return response.data;
  }

  async uploadImage(imageBlob: Blob, metadata: {
    patientId: string;
    encounterId: string;
    userId: string;
    context: 'theatre' | 'ward' | 'office';
    deviceInfo: {
      deviceType: 'mobile' | 'desktop';
      platform: string;
      browser: string;
    };
  }) {
    // Convert blob to base64
    const base64Data = await this.blobToBase64(imageBlob);

    const response = await this.client.post('/ingest', {
      patientId: metadata.patientId,
      encounterId: metadata.encounterId,
      userId: metadata.userId,
      contentType: 'image',
      data: base64Data,
      metadata: {
        timestamp: new Date().toISOString(),
        deviceInfo: metadata.deviceInfo,
        context: metadata.context,
      },
    });

    return response.data;
  }

  private blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        // Remove data URL prefix (e.g., "data:audio/webm;base64,")
        const base64Data = base64String.split(',')[1];
        resolve(base64Data);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }
}

export const apiClient = new ApiClient();
```

### Step 2: Configure Environment Variables

Create `packages/frontend/.env.local` for development:

```env
VITE_API_ENDPOINT=https://YOUR-API-ID.execute-api.YOUR-REGION.amazonaws.com/prod
```

Create `packages/frontend/.env.production` for production:

```env
VITE_API_ENDPOINT=https://YOUR-API-ID.execute-api.YOUR-REGION.amazonaws.com/prod
```

**Replace with your actual API Gateway endpoint from stack outputs.**

### Step 3: Update Voice Recording Component

Update `packages/frontend/src/components/VoiceRecordingComponent.tsx` to use the API client:

```typescript
import { apiClient } from '../services/apiClient';

// Inside your component, after stopping recording:
const handleUpload = async () => {
  try {
    setUploading(true);
    
    const response = await apiClient.uploadAudio(audioBlob, {
      patientId: 'patient-123', // Get from context/props
      encounterId: 'encounter-456', // Get from context/props
      userId: 'user-789', // Get from auth context
      context: 'theatre', // Get from context/props
      deviceInfo: {
        deviceType: /mobile/i.test(navigator.userAgent) ? 'mobile' : 'desktop',
        platform: navigator.platform,
        browser: navigator.userAgent.split(' ').pop() || 'unknown',
      },
    });

    console.log('Upload successful:', response);
    // Handle success (show notification, navigate, etc.)
  } catch (error) {
    console.error('Upload failed:', error);
    // Handle error (show error message)
  } finally {
    setUploading(false);
  }
};
```

### Step 4: Update Document Scanning Component

Update `packages/frontend/src/components/DocumentScanningComponent.tsx` similarly:

```typescript
import { apiClient } from '../services/apiClient';

// Inside your component, after capturing image:
const handleUpload = async () => {
  try {
    setUploading(true);
    
    const response = await apiClient.uploadImage(imageBlob, {
      patientId: 'patient-123', // Get from context/props
      encounterId: 'encounter-456', // Get from context/props
      userId: 'user-789', // Get from auth context
      context: 'office', // Get from context/props
      deviceInfo: {
        deviceType: /mobile/i.test(navigator.userAgent) ? 'mobile' : 'desktop',
        platform: navigator.platform,
        browser: navigator.userAgent.split(' ').pop() || 'unknown',
      },
    });

    console.log('Upload successful:', response);
    // Handle success
  } catch (error) {
    console.error('Upload failed:', error);
    // Handle error
  } finally {
    setUploading(false);
  }
};
```

### Step 5: Install Required Dependencies

```bash
cd packages/frontend
npm install axios
```

### Step 6: Build Frontend

```bash
# Development build
npm run dev

# Production build
npm run build
```

---

## Testing the Integration

### 1. Test Backend Deployment

```bash
# Test API Gateway health
curl https://YOUR-API-ID.execute-api.YOUR-REGION.amazonaws.com/prod/

# Test ingestion endpoint (should return 401 without auth)
curl -X POST https://YOUR-API-ID.execute-api.YOUR-REGION.amazonaws.com/prod/ingest
```

### 2. Test Frontend Locally

```bash
cd packages/frontend
npm run dev
```

Open `http://localhost:5173` and test:
- ✅ Voice recording component loads
- ✅ Document scanning component loads
- ✅ Upload buttons trigger API calls
- ✅ Check browser console for API responses

### 3. Test End-to-End Flow

#### Audio Upload Test:
1. Record audio using VoiceRecordingComponent
2. Click upload
3. Check browser console for response
4. Verify in AWS Console:
   - S3: Check audio bucket for uploaded file
   - DynamoDB: Check registry table for draft record
   - CloudWatch: Check Lambda logs
   - Transcribe: Check for transcription job

#### Image Upload Test:
1. Capture/upload image using DocumentScanningComponent
2. Click upload
3. Check browser console for response
4. Verify in AWS Console:
   - S3: Check images bucket for uploaded file
   - DynamoDB: Check registry table for draft record
   - CloudWatch: Check Lambda logs
   - Textract: Check for OCR job

### 4. Monitor with CloudWatch

```bash
# View Lambda logs
aws logs tail /aws/lambda/ClinicalRegistryStack-IngestionLambda --follow

# View API Gateway logs
aws logs tail /aws/apigateway/Clinical\ Registry\ API --follow
```

### 5. Check X-Ray Traces

1. Open AWS X-Ray console
2. Navigate to Service Map
3. View traces for recent API requests
4. Analyze performance and errors

---

## Troubleshooting

### Issue: CORS Errors in Browser

**Symptom:** Browser console shows CORS policy errors

**Solution:**
1. Verify API Gateway CORS configuration in stack.ts
2. Check that Lambda returns proper CORS headers
3. Ensure `Access-Control-Allow-Origin` is set correctly

```typescript
// In handler.ts, verify corsHeaders:
const corsHeaders = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*', // Or specific domain
  'Access-Control-Allow-Headers': 'Content-Type,Authorization',
  'Access-Control-Allow-Methods': 'POST,OPTIONS',
};
```

### Issue: 401 Unauthorized

**Symptom:** API returns 401 error

**Solution:**
1. Ensure Authorization header is included in requests
2. Check that token is valid
3. Verify API client interceptor is adding auth header

```typescript
// In apiClient.ts, verify interceptor:
config.headers.Authorization = `Bearer ${token}`;
```

### Issue: Lambda Timeout

**Symptom:** API returns 504 Gateway Timeout

**Solution:**
1. Increase Lambda timeout in stack.ts:
```typescript
timeout: cdk.Duration.seconds(60), // Increase from 30
```
2. Optimize Lambda code
3. Check CloudWatch logs for slow operations

### Issue: S3 Upload Fails

**Symptom:** Lambda logs show S3 upload errors

**Solution:**
1. Verify Lambda has S3 permissions
2. Check KMS key permissions
3. Verify bucket names in environment variables
4. Check CloudWatch logs for detailed error

```bash
# Check Lambda environment variables
aws lambda get-function-configuration \
  --function-name ClinicalRegistryStack-IngestionLambda
```

### Issue: DynamoDB Write Fails

**Symptom:** Lambda logs show DynamoDB errors

**Solution:**
1. Verify Lambda has DynamoDB permissions
2. Check table name in environment variables
3. Verify table exists and is active
4. Check for schema validation errors

```bash
# Verify table exists
aws dynamodb describe-table --table-name YOUR-TABLE-NAME
```

### Issue: Transcribe/Textract Not Starting

**Symptom:** Jobs not appearing in AWS console

**Solution:**
1. Verify Lambda has Transcribe/Textract permissions
2. Check IAM role policies
3. Verify S3 bucket permissions for service access
4. Check CloudWatch logs for error details

```bash
# Check Lambda role permissions
aws iam get-role-policy \
  --role-name ClinicalRegistryStack-LambdaExecutionRole \
  --policy-name inline-policy
```

### Issue: Frontend Can't Connect to API

**Symptom:** Network errors in browser console

**Solution:**
1. Verify `VITE_API_ENDPOINT` is set correctly
2. Check API Gateway endpoint URL
3. Verify API Gateway is deployed
4. Test endpoint with curl

```bash
# Test API endpoint
curl -v https://YOUR-API-ID.execute-api.YOUR-REGION.amazonaws.com/prod/ingest
```

### Useful Commands

```bash
# View CloudFormation stack status
aws cloudformation describe-stacks --stack-name ClinicalRegistryStack

# View Lambda function details
aws lambda get-function --function-name ClinicalRegistryStack-IngestionLambda

# View recent Lambda invocations
aws lambda list-functions

# View API Gateway details
aws apigateway get-rest-apis

# View S3 bucket contents
aws s3 ls s3://YOUR-AUDIO-BUCKET-NAME/

# View DynamoDB items
aws dynamodb scan --table-name YOUR-TABLE-NAME --max-items 10
```

---

## Next Steps

After successful integration:

1. **Implement Authentication**
   - Add Cognito user pool
   - Integrate with API Gateway authorizer
   - Update frontend to handle auth flow

2. **Add Error Handling**
   - Implement retry logic
   - Add offline queue
   - Show user-friendly error messages

3. **Implement Status Polling**
   - Poll transcription job status
   - Poll OCR job status
   - Update UI when processing completes

4. **Add Monitoring**
   - Set up CloudWatch alarms
   - Configure SNS notifications
   - Create CloudWatch dashboard

5. **Optimize Performance**
   - Enable API Gateway caching
   - Optimize Lambda cold starts
   - Implement connection pooling

6. **Security Hardening**
   - Restrict CORS to specific domains
   - Implement rate limiting
   - Add WAF rules
   - Enable API Gateway request validation

---

## Support

For issues or questions:
1. Check CloudWatch Logs for detailed errors
2. Review X-Ray traces for performance issues
3. Consult AWS documentation
4. Check project README and DEPLOYMENT.md

## Additional Resources

- [AWS CDK Documentation](https://docs.aws.amazon.com/cdk/)
- [AWS Lambda Documentation](https://docs.aws.amazon.com/lambda/)
- [API Gateway Documentation](https://docs.aws.amazon.com/apigateway/)
- [Transcribe Medical Documentation](https://docs.aws.amazon.com/transcribe/)
- [Textract Documentation](https://docs.aws.amazon.com/textract/)
