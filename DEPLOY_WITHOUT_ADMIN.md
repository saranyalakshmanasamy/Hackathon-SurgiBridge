# Deploy Without Admin Rights

Guide for deploying when you don't have admin rights on your computer.

## 🌟 Best Option: AWS CloudShell (Recommended)

AWS CloudShell is a browser-based terminal with AWS CLI, CDK, and other tools pre-installed. No installation needed!

### Prerequisites
- AWS Sandpit account access
- Web browser
- Internet connection

### Step 1: Access AWS CloudShell (1 minute)

1. **Log into AWS Console**
   - Go to your AWS Sandpit console
   - Use your credentials to log in

2. **Open CloudShell**
   - Look for the CloudShell icon in the top navigation bar (looks like `>_`)
   - Or go to: Services → CloudShell
   - Click to open

3. **Wait for CloudShell to initialize**
   - Takes 10-20 seconds
   - You'll see a terminal prompt

✅ You now have a terminal with AWS CLI and Node.js pre-installed!

### Step 2: Verify Tools (1 minute)

```bash
# Check AWS CLI (pre-installed)
aws --version

# Check Node.js (pre-installed)
node --version

# Check npm (pre-installed)
npm --version

# Verify your AWS identity
aws sts get-caller-identity
```

✅ All tools should be available!

### Step 3: Install AWS CDK (2 minutes)

```bash
npm install -g aws-cdk
```

Verify:
```bash
cdk --version
```

### Step 4: Upload Your Code to CloudShell (5 minutes)

**Option A: Use Git (Recommended)**

```bash
# Clone your repository
git clone https://github.com/YOUR-USERNAME/YOUR-REPO.git
cd YOUR-REPO
```

**Option B: Upload Files Manually**

1. In CloudShell, click **Actions** → **Upload file**
2. Create a zip of your project locally
3. Upload the zip file
4. Extract it:
   ```bash
   unzip YOUR-PROJECT.zip
   cd YOUR-PROJECT
   ```

**Option C: Use AWS S3**

On your local machine (if you have AWS access):
```powershell
# Zip your project
Compress-Archive -Path . -DestinationPath project.zip

# Upload to S3 (if you have access)
aws s3 cp project.zip s3://YOUR-BUCKET/
```

In CloudShell:
```bash
# Download from S3
aws s3 cp s3://YOUR-BUCKET/project.zip .
unzip project.zip
```

### Step 5: Bootstrap CDK (2 minutes)

```bash
cdk bootstrap
```

✅ One-time setup complete!

### Step 6: Build and Deploy (10 minutes)

```bash
# Install dependencies
cd packages/backend
npm install

# Build
npm run build

# Deploy
npm run deploy
```

**Wait for deployment...**

You'll see:
```
✅  ClinicalRegistryStack

Outputs:
ClinicalRegistryStack.ApiEndpoint = https://abc123xyz.execute-api.us-east-1.amazonaws.com/prod/
```

**📝 COPY THIS API ENDPOINT!**

### Step 7: Configure Frontend Locally (2 minutes)

Back on your local machine:

```powershell
cd packages/frontend

# Create .env.local with the API endpoint from CloudShell
echo "VITE_API_ENDPOINT=https://YOUR-API-ID.execute-api.us-east-1.amazonaws.com/prod" > .env.local

# Start frontend
npm run dev
```

### Step 8: Test! 🎉

1. Open http://localhost:5173
2. Upload audio or image
3. Verify in AWS Console

---

## 🔄 Alternative Option: Use GitHub Actions / CI/CD

If you have a GitHub repository, you can deploy using GitHub Actions without any local installation.

### Step 1: Set Up GitHub Secrets

In your GitHub repository:
1. Go to Settings → Secrets and variables → Actions
2. Add these secrets:
   - `AWS_ACCESS_KEY_ID`
   - `AWS_SECRET_ACCESS_KEY`
   - `AWS_REGION` (e.g., us-east-1)

### Step 2: Create GitHub Actions Workflow

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to AWS

on:
  push:
    branches: [ main ]
  workflow_dispatch:

jobs:
  deploy:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '20'
    
    - name: Configure AWS credentials
      uses: aws-actions/configure-aws-credentials@v2
      with:
        aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
        aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
        aws-region: ${{ secrets.AWS_REGION }}
    
    - name: Install dependencies
      run: |
        cd packages/backend
        npm install
    
    - name: Build
      run: |
        cd packages/backend
        npm run build
    
    - name: Install CDK
      run: npm install -g aws-cdk
    
    - name: Bootstrap CDK (if needed)
      run: |
        cd packages/backend
        cdk bootstrap || true
    
    - name: Deploy
      run: |
        cd packages/backend
        npm run deploy
```

### Step 3: Trigger Deployment

1. Commit and push to GitHub
2. Go to Actions tab
3. Watch deployment progress
4. Get API endpoint from logs

---

## 🖥️ Alternative Option: Use AWS Console (Manual)

You can create resources manually through AWS Console, but this is tedious and error-prone.

### Not Recommended Because:
- ❌ Time-consuming (hours vs minutes)
- ❌ Error-prone
- ❌ Hard to maintain
- ❌ No infrastructure as code

**Use CloudShell or GitHub Actions instead!**

---

## 🐳 Alternative Option: Use Docker (If Docker Desktop Installed)

If you have Docker Desktop (doesn't require admin after initial install):

### Step 1: Create Dockerfile

Create `Dockerfile.deploy`:

```dockerfile
FROM node:20

# Install AWS CLI
RUN curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip" && \
    unzip awscliv2.zip && \
    ./aws/install

# Install CDK
RUN npm install -g aws-cdk

WORKDIR /app
COPY . .

# Install dependencies
RUN cd packages/backend && npm install

CMD ["/bin/bash"]
```

### Step 2: Build and Run

```powershell
# Build image
docker build -f Dockerfile.deploy -t clinical-registry-deploy .

# Run container with AWS credentials
docker run -it \
  -e AWS_ACCESS_KEY_ID=your-key \
  -e AWS_SECRET_ACCESS_KEY=your-secret \
  -e AWS_REGION=us-east-1 \
  clinical-registry-deploy
```

### Step 3: Deploy from Container

Inside the container:
```bash
cd packages/backend
npm run build
cdk bootstrap
npm run deploy
```

---

## 📊 Comparison

| Method | Pros | Cons | Recommended |
|--------|------|------|-------------|
| **AWS CloudShell** | ✅ No installation<br>✅ Pre-configured<br>✅ Easy | ❌ Need AWS Console access | ⭐ **YES** |
| **GitHub Actions** | ✅ Automated<br>✅ No local tools | ❌ Need GitHub<br>❌ Setup required | ⭐ **YES** |
| **Docker** | ✅ Isolated<br>✅ Reproducible | ❌ Need Docker installed | Maybe |
| **Manual Console** | ✅ No tools needed | ❌ Very tedious<br>❌ Error-prone | ❌ **NO** |

---

## 🎯 Recommended Approach

### For You (No Admin Rights):

**Use AWS CloudShell!**

1. Log into AWS Console
2. Open CloudShell (click `>_` icon)
3. Install CDK: `npm install -g aws-cdk`
4. Upload/clone your code
5. Deploy: `npm run deploy`
6. Get API endpoint
7. Configure frontend locally
8. Test!

**Total time: ~20 minutes**

---

## 🆘 Troubleshooting

### Can't access CloudShell
- Check with AWS admin
- CloudShell may be disabled in your sandpit
- Try GitHub Actions instead

### CloudShell session timeout
- CloudShell sessions timeout after ~20 minutes of inactivity
- Your files persist in `/home/cloudshell-user/`
- Just reopen CloudShell and continue

### Upload fails in CloudShell
- File size limit: 1GB
- Use Git clone instead
- Or upload to S3 first, then download in CloudShell

### GitHub Actions fails
- Check secrets are set correctly
- Verify AWS credentials have permissions
- Check Actions logs for specific errors

---

## ✅ CloudShell Deployment Checklist

- [ ] AWS Console access
- [ ] CloudShell opened
- [ ] CDK installed in CloudShell
- [ ] Code uploaded/cloned
- [ ] Dependencies installed
- [ ] CDK bootstrapped
- [ ] Backend built
- [ ] Stack deployed
- [ ] API endpoint copied
- [ ] Frontend configured locally
- [ ] Successfully tested upload

---

## 🚀 Quick Start with CloudShell

```bash
# 1. Open CloudShell in AWS Console

# 2. Install CDK
npm install -g aws-cdk

# 3. Clone your repo (or upload files)
git clone YOUR-REPO-URL
cd YOUR-REPO

# 4. Bootstrap CDK
cdk bootstrap

# 5. Build and deploy
cd packages/backend
npm install
npm run build
npm run deploy

# 6. Copy the API endpoint from output!
```

---

## 💡 Pro Tips

1. **Use CloudShell for deployment only**
   - Develop locally
   - Deploy from CloudShell
   - Best of both worlds

2. **Save your CloudShell commands**
   - Create a `deploy.sh` script
   - Makes redeployment easy

3. **Use Git for code transfer**
   - Faster than uploading
   - Version controlled
   - Easy to update

4. **Keep CloudShell active**
   - Run a command every 15 minutes
   - Or use `watch` command
   - Prevents timeout

---

## 📚 Next Steps

After deploying with CloudShell:

1. **Test thoroughly** with your frontend
2. **Monitor** in AWS Console
3. **Iterate** - make changes locally, redeploy from CloudShell
4. **Document** your deployment process

---

## 🎉 Success!

Once deployed from CloudShell:
- ✅ No admin rights needed
- ✅ Full AWS infrastructure deployed
- ✅ API endpoint available
- ✅ Frontend can connect
- ✅ System fully functional

**You're ready to develop!** 🚀
