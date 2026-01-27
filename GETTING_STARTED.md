# Getting Started - Choose Your Path

Welcome! Here's how to get your Clinical Registry System up and running.

## 🤔 Which Path Should You Take?

### Path 1: Local Development First (Recommended for Testing)
**Best if you want to:**
- ✅ Test the frontend quickly
- ✅ Develop without AWS costs
- ✅ Don't have AWS credentials yet
- ✅ Want to see it working in 5 minutes

**Time:** 5 minutes  
**Cost:** Free  
**Follow:** [LOCAL_DEVELOPMENT.md](./LOCAL_DEVELOPMENT.md)

### Path 2: Deploy to AWS (Recommended for Production)
**Best if you want to:**
- ✅ Use real AWS services (Transcribe, Textract)
- ✅ Test the complete system
- ✅ Deploy for actual use
- ✅ Have AWS credentials

**Time:** 20-30 minutes  
**Cost:** ~$5-10/month  
**Follow:** [SETUP_PREREQUISITES.md](./SETUP_PREREQUISITES.md) → [QUICK_START.md](./QUICK_START.md)

---

## 🚀 Quick Decision Tree

```
Do you have AWS CLI and CDK installed?
│
├─ YES → Do you have AWS credentials configured?
│         │
│         ├─ YES → Great! Go to QUICK_START.md
│         │
│         └─ NO → Follow SETUP_PREREQUISITES.md (Step 2 only)
│
└─ NO → Choose one:
          │
          ├─ Want to test locally first?
          │   → Follow LOCAL_DEVELOPMENT.md
          │
          └─ Want to deploy to AWS?
              → Follow SETUP_PREREQUISITES.md (all steps)
```

---

## 📋 Path 1: Local Development (No AWS)

### What You'll Get
- Mock API server running locally
- Frontend connected to mock server
- Files saved to local disk
- No AWS services (no transcription/OCR)

### Steps

1. **Create mock server** (2 minutes)
   ```powershell
   cd packages/backend
   # Copy code from LOCAL_DEVELOPMENT.md
   npm install express cors body-parser
   ```

2. **Start mock server** (1 minute)
   ```powershell
   npm run dev
   ```

3. **Configure frontend** (1 minute)
   ```powershell
   cd packages/frontend
   echo "VITE_API_ENDPOINT=http://localhost:3000" > .env.local
   ```

4. **Start frontend** (1 minute)
   ```powershell
   npm run dev
   ```

5. **Test it!** ✨
   - Open http://localhost:5173
   - Record audio or capture image
   - Upload and see files in `packages/backend/local-data/`

**Next:** When ready for AWS, follow Path 2

---

## 📋 Path 2: AWS Deployment (Full System)

### What You'll Get
- Real API Gateway endpoint
- Lambda function processing uploads
- S3 storage with encryption
- DynamoDB records
- Transcribe Medical for audio
- Textract for images
- Complete production-ready system

### Prerequisites Check

Run these commands:
```powershell
node --version    # Need 20.x+
npm --version     # Need 10.x+
aws --version     # Need 2.x
cdk --version     # Need 2.115.0+
```

**Missing any?** → Follow [SETUP_PREREQUISITES.md](./SETUP_PREREQUISITES.md)

### Steps

1. **Install AWS tools** (10 minutes)
   - Install AWS CLI
   - Install AWS CDK
   - Configure credentials
   - Bootstrap CDK
   
   **Guide:** [SETUP_PREREQUISITES.md](./SETUP_PREREQUISITES.md)

2. **Deploy infrastructure** (10 minutes)
   ```powershell
   cd packages/backend
   npm run build
   npm run deploy
   ```
   
   **Guide:** [QUICK_START.md](./QUICK_START.md)

3. **Get API endpoint** (1 minute)
   - Note the `ApiEndpoint` from deployment output
   - Example: `https://abc123.execute-api.us-east-1.amazonaws.com/prod/`

4. **Configure frontend** (2 minutes)
   ```powershell
   cd packages/frontend
   echo "VITE_API_ENDPOINT=https://YOUR-API-ID.execute-api.YOUR-REGION.amazonaws.com/prod" > .env.local
   ```

5. **Start frontend** (1 minute)
   ```powershell
   npm run dev
   ```

6. **Test it!** ✨
   - Open http://localhost:5173
   - Record audio or capture image
   - Upload and verify in AWS Console

**Next:** Follow [INTEGRATION_GUIDE.md](./INTEGRATION_GUIDE.md) for advanced features

---

## 🎯 Recommended Workflow

### For Development
1. Start with **Path 1** (Local Development)
2. Build and test frontend features
3. When ready, switch to **Path 2** (AWS)

### For Production
1. Go straight to **Path 2** (AWS Deployment)
2. Follow security best practices
3. Set up monitoring and alarms

---

## 📚 Documentation Overview

| Document | Purpose | When to Use |
|----------|---------|-------------|
| **GETTING_STARTED.md** (this file) | Choose your path | Start here |
| **LOCAL_DEVELOPMENT.md** | Local testing without AWS | Development |
| **SETUP_PREREQUISITES.md** | Install AWS tools | Before AWS deploy |
| **QUICK_START.md** | Fast AWS deployment | AWS deployment |
| **INTEGRATION_GUIDE.md** | Detailed integration | After deployment |
| **DEPLOYMENT.md** | Production deployment | Production setup |
| **INFRASTRUCTURE.md** | Architecture details | Understanding system |

---

## ⚡ Super Quick Start (Already Have AWS Setup)

If you already have AWS CLI and CDK configured:

```powershell
# 1. Build
cd packages/backend
npm run build

# 2. Deploy
npm run deploy

# 3. Configure frontend (use your API endpoint)
cd ../frontend
echo "VITE_API_ENDPOINT=https://YOUR-API-ENDPOINT" > .env.local

# 4. Start
npm run dev
```

Done! 🎉

---

## 🆘 Need Help?

### I don't have AWS credentials
- **Option A:** Create AWS account (free tier available)
- **Option B:** Use local development (no AWS needed)
- **Guide:** [SETUP_PREREQUISITES.md](./SETUP_PREREQUISITES.md)

### I want to test without AWS costs
- **Solution:** Use local development
- **Guide:** [LOCAL_DEVELOPMENT.md](./LOCAL_DEVELOPMENT.md)

### I'm getting errors during deployment
- **Check:** AWS credentials configured?
- **Check:** CDK bootstrapped?
- **Check:** Sufficient IAM permissions?
- **Guide:** [SETUP_PREREQUISITES.md](./SETUP_PREREQUISITES.md) troubleshooting

### I deployed but frontend can't connect
- **Check:** API endpoint in `.env.local`?
- **Check:** CORS configuration?
- **Check:** Authorization header?
- **Guide:** [INTEGRATION_GUIDE.md](./INTEGRATION_GUIDE.md) troubleshooting

---

## ✅ Success Checklist

### Local Development
- [ ] Mock server running on port 3000
- [ ] Frontend running on port 5173
- [ ] Can upload audio/images
- [ ] Files appear in `local-data/` folder

### AWS Deployment
- [ ] AWS CLI installed and configured
- [ ] CDK installed and bootstrapped
- [ ] Infrastructure deployed successfully
- [ ] API endpoint obtained
- [ ] Frontend configured with endpoint
- [ ] Can upload audio/images
- [ ] Files appear in S3
- [ ] Records appear in DynamoDB

---

## 🎉 What's Next?

After getting the basic system running:

1. **Add Authentication**
   - Implement Cognito user pool
   - Add login/signup flow
   - Secure API endpoints

2. **Implement Status Polling**
   - Poll transcription job status
   - Poll OCR job status
   - Show progress to users

3. **Build Review Interface**
   - Display extracted data
   - Allow field editing
   - Implement submission

4. **Add Error Handling**
   - Retry logic
   - Offline queue
   - User notifications

5. **Production Hardening**
   - CloudWatch alarms
   - Rate limiting
   - WAF rules
   - Monitoring dashboard

---

## 💡 Tips

- **Start simple:** Get basic upload working first
- **Test locally:** Use mock server before AWS
- **Check logs:** CloudWatch Logs are your friend
- **Monitor costs:** Set up AWS Budgets
- **Use free tier:** Most services have free tier
- **Ask for help:** Check troubleshooting sections

---

## 🚀 Ready to Start?

Pick your path and let's go! 

- **Local Development:** [LOCAL_DEVELOPMENT.md](./LOCAL_DEVELOPMENT.md)
- **AWS Deployment:** [SETUP_PREREQUISITES.md](./SETUP_PREREQUISITES.md)

Good luck! 🎉
