import { describe, it, expect } from 'vitest';
import * as cdk from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import { ClinicalRegistryStack } from './stack';

describe('ClinicalRegistryStack', () => {
  it('creates DynamoDB table with correct configuration', () => {
    const app = new cdk.App();
    const stack = new ClinicalRegistryStack(app, 'TestStack');
    const template = Template.fromStack(stack);

    // Verify DynamoDB table exists
    template.resourceCountIs('AWS::DynamoDB::Table', 1);

    // Verify table has encryption enabled
    template.hasResourceProperties('AWS::DynamoDB::Table', {
      SSESpecification: {
        SSEEnabled: true,
      },
    });

    // Verify table has point-in-time recovery
    template.hasResourceProperties('AWS::DynamoDB::Table', {
      PointInTimeRecoverySpecification: {
        PointInTimeRecoveryEnabled: true,
      },
    });
  });

  it('creates three S3 buckets with encryption', () => {
    const app = new cdk.App();
    const stack = new ClinicalRegistryStack(app, 'TestStack');
    const template = Template.fromStack(stack);

    // Verify three S3 buckets exist (audio, images, reports)
    template.resourceCountIs('AWS::S3::Bucket', 3);

    // Verify buckets have encryption enabled
    template.allResourcesProperties('AWS::S3::Bucket', {
      BucketEncryption: {
        ServerSideEncryptionConfiguration: [
          {
            ServerSideEncryptionByDefault: {
              SSEAlgorithm: 'aws:kms',
            },
          },
        ],
      },
    });
  });

  it('creates API Gateway with correct configuration', () => {
    const app = new cdk.App();
    const stack = new ClinicalRegistryStack(app, 'TestStack');
    const template = Template.fromStack(stack);

    // Verify API Gateway exists
    template.resourceCountIs('AWS::ApiGateway::RestApi', 1);

    // Verify API Gateway has a deployment
    template.resourceCountIs('AWS::ApiGateway::Deployment', 1);

    // Verify API Gateway has a stage
    template.resourceCountIs('AWS::ApiGateway::Stage', 1);
  });

  it('creates KMS key with rotation enabled', () => {
    const app = new cdk.App();
    const stack = new ClinicalRegistryStack(app, 'TestStack');
    const template = Template.fromStack(stack);

    // Verify KMS key exists
    template.resourceCountIs('AWS::KMS::Key', 1);

    // Verify key rotation is enabled
    template.hasResourceProperties('AWS::KMS::Key', {
      EnableKeyRotation: true,
    });
  });

  it('creates IAM role for Lambda with necessary permissions', () => {
    const app = new cdk.App();
    const stack = new ClinicalRegistryStack(app, 'TestStack');
    const template = Template.fromStack(stack);

    // Verify IAM roles exist (Lambda role + API Gateway CloudWatch role)
    template.resourceCountIs('AWS::IAM::Role', 2);

    // Verify Lambda role has correct service principal
    template.hasResourceProperties('AWS::IAM::Role', {
      AssumeRolePolicyDocument: {
        Statement: [
          {
            Action: 'sts:AssumeRole',
            Effect: 'Allow',
            Principal: {
              Service: 'lambda.amazonaws.com',
            },
          },
        ],
      },
    });
  });

  it('creates DynamoDB table with three GSIs', () => {
    const app = new cdk.App();
    const stack = new ClinicalRegistryStack(app, 'TestStack');
    const template = Template.fromStack(stack);

    // Verify table has global secondary indexes
    template.hasResourceProperties('AWS::DynamoDB::Table', {
      GlobalSecondaryIndexes: [
        {
          IndexName: 'PatientIndex',
          KeySchema: [
            { AttributeName: 'patientId', KeyType: 'HASH' },
            { AttributeName: 'createdAt', KeyType: 'RANGE' },
          ],
        },
        {
          IndexName: 'UserIndex',
          KeySchema: [
            { AttributeName: 'userId', KeyType: 'HASH' },
            { AttributeName: 'createdAt', KeyType: 'RANGE' },
          ],
        },
        {
          IndexName: 'CurrentVersionIndex',
          KeySchema: [
            { AttributeName: 'isCurrent', KeyType: 'HASH' },
            { AttributeName: 'updatedAt', KeyType: 'RANGE' },
          ],
        },
      ],
    });
  });
});
