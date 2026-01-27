# Clinical Registry System

A Hybrid Voice-to-Structured-Data Clinical Registry System that enables clinicians to capture clinical data through voice recording or document scanning, automatically extract structured registry fields, and review/confirm results.

## Project Structure

```
clinical-registry-system/
├── packages/
│   ├── frontend/          # React frontend application
│   │   ├── src/
│   │   ├── public/
│   │   └── package.json
│   └── backend/           # AWS Lambda backend services
│       ├── src/
│       │   ├── infrastructure/  # AWS CDK infrastructure code
│       │   ├── lambdas/         # Lambda function handlers
│       │   └── config/          # Configuration files
│       └── package.json
└── package.json           # Root package.json for monorepo

```

## Technology Stack

### Frontend
- React 18+ with TypeScript
- Tailwind CSS for styling
- Lucide React for icons
- Vite for build tooling

### Backend
- AWS Lambda (Node.js 20.x with TypeScript)
- AWS CDK for infrastructure as code
- DynamoDB for data storage
- S3 for file storage
- API Gateway for REST and WebSocket APIs
- Amazon Transcribe Medical for speech-to-text
- Amazon Textract for OCR
- Amazon Comprehend Medical for entity extraction

## Getting Started

### Prerequisites
- Node.js 20.x or higher
- AWS CLI configured with appropriate credentials
- AWS CDK CLI installed globally: `npm install -g aws-cdk`

### Installation

1. Install dependencies:
```bash
npm install
```

2. Install frontend dependencies:
```bash
npm install --workspace=packages/frontend
```

3. Install backend dependencies:
```bash
npm install --workspace=packages/backend
```

### Development

#### Frontend Development
```bash
npm run frontend
```
This starts the Vite development server on http://localhost:3000

#### Backend Development

1. Build the backend:
```bash
npm run backend
```

2. Deploy infrastructure:
```bash
cd packages/backend
npm run deploy
```

### Infrastructure

The AWS CDK stack includes:
- DynamoDB table with 3 Global Secondary Indexes
- 3 S3 buckets (audio, images, reports) with KMS encryption
- API Gateway with REST endpoints
- IAM roles and policies for Lambda functions
- CloudWatch logging and X-Ray tracing
- KMS key for encryption at rest

### Testing

Run all tests:
```bash
npm test
```

## Security

- All data encrypted at rest using AWS KMS
- All data encrypted in transit using TLS 1.2+
- IAM-based access control
- Immutable audit trails at database level

## License

Private - All rights reserved
