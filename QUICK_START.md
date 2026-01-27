# Quick Start Guide

Get the Clinical Registry System up and running in minutes.

## 🚀 Quick Deploy (5 minutes)

### 1. Prerequisites Check
```bash
node --version    # Should be 20.x or higher
npm --version     # Should be 10.x or higher
aws --version     # Should be 2.x
cdk --version     # Should be 2.115.0 or higher
```

### 2. Install & Build
```bash
# Clone and install
git clone <your-repo>
cd SurgiBridge
npm install

# Build backend
cd packages/backend
npm run build
```

### 3. Deploy to AWS
```bash
# First time only: Bootstrap CDK
cdk bootstrap

# Deploy infrastructure
npm run deploy
```

**⏱️ Deployment takes ~5-10 minutes**

### 4. Save API Endpoint
After deployment, note the `ApiEndpoint` output:
```
Outputs:
ClinicalRegistryStack.ApiEndpoint = https://abc123.execute-api.us-east-1.amazonaws.com/prod/
```

### 5. Configure Frontend
```bash
cd ../frontend

# Create .env.local
echo "VITE_API_ENDPOINT=https://YOUR-API-ID.execute-api.YOUR-REGION.amazonaws.com/prod" > .env.local

# Start dev server
npm run dev
```

### 6. Test It! 🎉
Open http://localhost:5173 and:
- ✅ Record audio
- ✅ Upload to backend
- ✅ Check AWS Console for results

---

## 📋 What Gets Deployed

| Resource | Purpose | Cost |
|----------|---------|------|
| Lambda Function | Process uploads | Pay per request |
| API Gateway | REST API | Pay per request |
| DynamoDB | Store records | Pay per request |
| S3 Buckets (3) | Store files | Pay per GB |
| KMS Key | Encryption | ~$1/month |

**Estimated cost for development: $5-10/month**

---

## 🧪 Quick Test

### Test Backend
```bash
# Should return 401 (expected - no auth)
curl -X POST https://YOUR-API-ENDPOINT/ingest
```

### Test Frontend
1. Open http://localhost:5173
2. Click "Record Audio"
3. Speak for a few seconds
4. Click "Stop" then "Upload"
5. Check browser console for success message

### Verify in AWS Console
1. **S3**: Check audio bucket for uploaded file
2. **DynamoDB**: Check registry table for draft record
3. **CloudWatch**: Check Lambda logs
4. **Transcribe**: Check for transcription job

---

## 🔧 Common Issues

### "CDK not bootstrapped"
```bash
cdk bootstrap aws://YOUR-ACCOUNT-ID/YOUR-REGION
```

### "CORS error in browser"
- Verify API endpoint in `.env.local`
- Check CORS headers in Lambda response

### "401 Unauthorized"
- Add mock auth token for testing:
```typescript
localStorage.setItem('authToken', 'test-token');
```

### "Lambda timeout"
- Check CloudWatch logs for errors
- Verify IAM permissions

---

## 📚 Next Steps

1. **Read Full Guides**
   - [INTEGRATION_GUIDE.md](./INTEGRATION_GUIDE.md) - Detailed integration steps
   - [DEPLOYMENT.md](./DEPLOYMENT.md) - Production deployment
   - [INFRASTRUCTURE.md](./packages/backend/INFRASTRUCTURE.md) - Architecture details

2. **Implement Features**
   - Add authentication (Cognito)
   - Implement status polling
   - Add error handling
   - Create review interface

3. **Production Readiness**
   - Configure CORS for your domain
   - Set up CloudWatch alarms
   - Enable API Gateway caching
   - Implement rate limiting

---

## 🆘 Need Help?

1. Check [INTEGRATION_GUIDE.md](./INTEGRATION_GUIDE.md) troubleshooting section
2. View CloudWatch logs: `aws logs tail /aws/lambda/ClinicalRegistryStack-IngestionLambda --follow`
3. Check X-Ray traces in AWS Console
4. Review task implementation notes in `.kiro/specs/clinical-registry-system/`

---

## 🧹 Cleanup

To remove all AWS resources:
```bash
cd packages/backend
cdk destroy
```

**⚠️ Warning: This deletes all data. Backup first!**

---

## 📊 Architecture Overview

```
Frontend (React)
    ↓
API Gateway
    ↓
Lambda (Ingestion)
    ↓
├─→ S3 (Audio/Images) → Transcribe/Textract
└─→ DynamoDB (Records)
```

---

## ✅ Success Checklist

- [ ] Backend deployed successfully
- [ ] API endpoint saved
- [ ] Frontend configured with API endpoint
- [ ] Audio upload works
- [ ] Image upload works
- [ ] Files appear in S3
- [ ] Records appear in DynamoDB
- [ ] Transcribe/Textract jobs start
- [ ] CloudWatch logs show activity

**All checked? You're ready to build! 🎉**
