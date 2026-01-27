# CloudShell Deployment - Quick Guide

Step-by-step guide to deploy from AWS CloudShell (no admin rights needed).

## ✅ Prerequisites

- AWS Sandpit account access
- Code ready to deploy (on GitHub or local machine)

---

## 🚀 Deployment Steps

### Step 1: Open CloudShell (1 minute)

1. Log into AWS Console (your sandpit account)
2. Click the **CloudShell icon** (`>_`) in the top navigation bar
3. Wait for CloudShell to initialize (~10 seconds)

### Step 2: Get Your Code into CloudShell (5 minutes)

**Option A: Clone from GitHub (Recommended)**

```bash
# Clone your repository
git clone https://github.com/YOUR-USERNAME/YOUR-REPO.git
cd YOUR-REPO
```

**Option B: Upload Files Manually**

1. On your local machine, create a zip of your project:
   ```powershell
   # In your project root
   Compress-Archive -Path * -DestinationPath clinical-registry.zip
   ```

2. In CloudShell:
   - Click **Actions** → **Upload file**
   - Select your `clinical-registry.zip`
   - Wait for upload to complete

3. Extract the zip:
   ```bash
   unzip clinical-registry.zip
   ls  # Verify files are there
   ```

### Step 3: Install Dependencies (2 minutes)

```bash
# Navigate to backend
cd packages/backend

# Install all dependencies (including CDK)
npm install
```

✅ This installs CDK locally - no global install needed!

### Step 4: Bootstrap CDK (2 minutes)

```bash
# Bootstrap CDK (one-time setup)
npm run bootstrap
```

You should see:
```
✅  Environment aws://ACCOUNT-ID/REGION bootstrapped
```

### Step 5: Build Backend (2 minutes)

```bash
# Compile TypeScript
npm run build
```

✅ Should complete without errors

### Step 6: Deploy to AWS (10 minutes)

```bash
# Deploy the stack
npm run deploy
```

**What happens:**
- Creates CloudFormation stack
- Deploys Lambda function
- Creates API Gateway
- Creates DynamoDB table
- Creates S3 buckets
- Sets up IAM roles

**Wait for completion...**

You'll see:
```
✅  ClinicalRegistryStack

Outputs:
ClinicalRegistryStack.ApiEndpoint = https://abc123xyz.execute-api.us-east-1.amazonaws.com/prod/
ClinicalRegistryStack.AudioBucketName = clinicalregistrystack-audiobucket...
ClinicalRegistryStack.ImagesBucketName = clinicalregistrystack-imagesbucket...
...

Stack ARN:
arn:aws:cloudformation:us-east-1:ACCOUNT-ID:stack/ClinicalRegistryStack/...
```

### Step 7: Copy Your API Endpoint 📝

**IMPORTANT:** Copy the `ApiEndpoint` value!

Example:
```
https://abc123xyz.execute-api.us-east-1.amazonaws.com/prod/
```

You'll need this for the frontend.

---

## 💻 Configure Frontend (On Your Local Machine)

### Step 1: Create Environment File

```powershell
# Navigate to frontend directory
cd packages/frontend

# Create .env.local with your API endpoint
# Replace with YOUR actual endpoint from CloudShell
echo "VITE_API_ENDPOINT=https://YOUR-API-ID.execute-api.us-east-1.amazonaws.com/prod" > .env.local
```

### Step 2: Start Frontend

```powershell
npm run dev
```

### Step 3: Test! 🎉

1. Open http://localhost:5173
2. Record audio or capture image
3. Click upload
4. Check browser console for success

---

## ✅ Verify Deployment in AWS Console

### Check S3 Buckets
1. Go to **S3** in AWS Console
2. Look for buckets starting with `clinicalregistrystack-`
3. After uploading, check for your files

### Check DynamoDB
1. Go to **DynamoDB** → **Tables**
2. Find table starting with `ClinicalRegistryStack-RegistryRecordsTable`
3. Click **Explore table items**
4. See your draft records

### Check Lambda
1. Go to **Lambda** → **Functions**
2. Find `ClinicalRegistryStack-IngestionLambda`
3. Check **Monitor** tab for invocations

### Check CloudWatch Logs
1. Go to **CloudWatch** → **Log groups**
2. Find `/aws/lambda/ClinicalRegistryStack-IngestionLambda...`
3. View recent log streams

### Check Transcribe (for audio)
1. Go to **Amazon Transcribe**
2. Click **Transcription jobs**
3. See your jobs

### Check Textract (for images)
1. Go to **Amazon Textract**
2. Check recent jobs

---

## 🔧 Troubleshooting

### "npm install aws-cdk" permission error
✅ **Fixed!** We updated package.json to use `npx cdk` instead of global install.

Just run:
```bash
npm install  # Installs CDK locally
npm run deploy  # Uses npx cdk deploy
```

### "CDK not bootstrapped"
```bash
npm run bootstrap
```

### "Cannot find module"
```bash
# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install
```

### "Stack already exists"
```bash
# Update existing stack
npm run deploy
```

### CloudShell session timeout
- CloudShell times out after ~20 minutes of inactivity
- Your files persist in `/home/cloudshell-user/`
- Just reopen CloudShell and continue where you left off

### Upload fails
- File size limit: 1GB
- Use Git clone instead for large projects
- Or split into multiple uploads

### Deployment fails with permissions error
- Check with AWS admin
- You need permissions for: CloudFormation, Lambda, API Gateway, DynamoDB, S3, KMS, IAM

---

## 🔄 Redeployment (After Making Changes)

If you make changes and want to redeploy:

### Option 1: Update via Git
```bash
# In CloudShell
cd ~/YOUR-REPO
git pull
cd packages/backend
npm run build
npm run deploy
```

### Option 2: Upload New Files
1. Zip updated files locally
2. Upload to CloudShell
3. Extract and overwrite
4. Rebuild and redeploy

---

## 📊 Useful CloudShell Commands

```bash
# Check AWS identity
aws sts get-caller-identity

# List CloudFormation stacks
aws cloudformation list-stacks --stack-status-filter CREATE_COMPLETE UPDATE_COMPLETE

# View stack outputs
aws cloudformation describe-stacks --stack-name ClinicalRegistryStack --query 'Stacks[0].Outputs'

# List Lambda functions
aws lambda list-functions --query 'Functions[?contains(FunctionName, `ClinicalRegistry`)].FunctionName'

# View Lambda logs (last 10 minutes)
aws logs tail /aws/lambda/ClinicalRegistryStack-IngestionLambda --since 10m

# List S3 buckets
aws s3 ls | grep clinicalregistry

# List DynamoDB tables
aws dynamodb list-tables --query 'TableNames[?contains(@, `ClinicalRegistry`)]'
```

---

## 🧹 Cleanup (When Done Testing)

To remove all resources:

```bash
cd packages/backend
npm run destroy
```

Or manually:
```bash
npx cdk destroy
```

**⚠️ Warning:** This deletes all resources and data!

---

## 💡 Pro Tips

### 1. Save Your Work
CloudShell persists files in `/home/cloudshell-user/`, but it's good practice to:
- Commit changes to Git
- Keep backups
- Document your deployment

### 2. Create a Deploy Script
Create `deploy.sh` in CloudShell:
```bash
#!/bin/bash
cd ~/YOUR-REPO/packages/backend
git pull
npm install
npm run build
npm run deploy
```

Make it executable:
```bash
chmod +x deploy.sh
```

Run it:
```bash
./deploy.sh
```

### 3. Monitor Costs
```bash
# Check current month costs
aws ce get-cost-and-usage \
  --time-period Start=2024-01-01,End=2024-01-31 \
  --granularity MONTHLY \
  --metrics BlendedCost
```

### 4. Keep CloudShell Active
CloudShell times out after inactivity. To keep it active during long deployments:
```bash
# Run in background
npm run deploy &

# Or use watch to keep session alive
watch -n 60 date
```

---

## ✅ Deployment Checklist

- [ ] CloudShell opened
- [ ] Code uploaded/cloned
- [ ] Dependencies installed (`npm install`)
- [ ] CDK bootstrapped (`npm run bootstrap`)
- [ ] Backend built (`npm run build`)
- [ ] Stack deployed (`npm run deploy`)
- [ ] API endpoint copied
- [ ] Frontend configured with endpoint
- [ ] Frontend running locally
- [ ] Test upload successful
- [ ] Verified in S3
- [ ] Verified in DynamoDB
- [ ] Checked CloudWatch logs

---

## 🎉 Success!

Once you see:
- ✅ Deployment complete in CloudShell
- ✅ API endpoint obtained
- ✅ Frontend configured
- ✅ Test upload works
- ✅ Files in S3
- ✅ Records in DynamoDB

**You're fully deployed! 🚀**

---

## 📚 Next Steps

1. **Test thoroughly**
   - Upload various audio files
   - Upload various images
   - Check processing results

2. **Monitor**
   - CloudWatch logs
   - X-Ray traces
   - Cost Explorer

3. **Develop**
   - Make changes locally
   - Redeploy from CloudShell
   - Iterate

4. **Enhance**
   - Add authentication
   - Implement status polling
   - Build review interface

---

## 🆘 Need Help?

If you encounter issues:
1. Check the troubleshooting section above
2. Review CloudWatch logs
3. Check AWS Console for resource status
4. Verify permissions with AWS admin

**Common Issues:**
- Permission errors → Check with AWS admin
- Timeout → Reopen CloudShell and continue
- Upload fails → Use Git clone instead
- Deployment fails → Check CloudWatch logs

---

## 📞 Support Resources

- **CloudShell Docs**: https://docs.aws.amazon.com/cloudshell/
- **CDK Docs**: https://docs.aws.amazon.com/cdk/
- **AWS Console**: Your sandpit account
- **CloudWatch Logs**: For debugging

Good luck with your deployment! 🎉
