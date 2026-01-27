#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { ClinicalRegistryStack } from './stack';

const app = new cdk.App();

new ClinicalRegistryStack(app, 'ClinicalRegistryStack', {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION || 'us-east-1',
  },
  description: 'Clinical Registry System Infrastructure',
});

app.synth();
