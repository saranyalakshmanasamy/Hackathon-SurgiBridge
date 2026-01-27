export interface EnvironmentConfig {
  registryTableName: string;
  audioBucketName: string;
  imagesBucketName: string;
  reportsBucketName: string;
  kmsKeyId: string;
  region: string;
}

export const getEnvironmentConfig = (): EnvironmentConfig => {
  return {
    registryTableName: process.env.REGISTRY_TABLE_NAME || '',
    audioBucketName: process.env.AUDIO_BUCKET_NAME || '',
    imagesBucketName: process.env.IMAGES_BUCKET_NAME || '',
    reportsBucketName: process.env.REPORTS_BUCKET_NAME || '',
    kmsKeyId: process.env.KMS_KEY_ID || '',
    region: process.env.AWS_REGION || 'us-east-1',
  };
};
