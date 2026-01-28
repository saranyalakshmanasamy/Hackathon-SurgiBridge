const API_ENDPOINT = import.meta.env.VITE_API_ENDPOINT || 'http://localhost:3000';

interface UploadMetadata {
  patientId: string;
  encounterId: string;
  userId: string;
  context: 'theatre' | 'ward' | 'office';
  deviceInfo: {
    deviceType: 'mobile' | 'desktop';
    platform: string;
    browser: string;
  };
}

interface UploadResponse {
  success: boolean;
  recordId: string;
  s3Key: string;
  uploadTimestamp: string;
  jobId?: string;
}

class ApiClient {
  private getDeviceInfo() {
    const userAgent = navigator.userAgent;
    return {
      deviceType: /mobile/i.test(userAgent) ? 'mobile' as const : 'desktop' as const,
      platform: navigator.platform,
      browser: userAgent.split(' ').pop() || 'unknown',
    };
  }

  private async blobToBase64(blob: Blob): Promise<string> {
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

  async uploadAudio(
    audioBlob: Blob,
    metadata: Partial<UploadMetadata> = {}
  ): Promise<UploadResponse> {
    const base64Data = await this.blobToBase64(audioBlob);

    const response = await fetch(`${API_ENDPOINT}/ingest`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer demo-token', // Mock token for local testing
      },
      body: JSON.stringify({
        patientId: metadata.patientId || 'patient-demo-001',
        encounterId: metadata.encounterId || 'encounter-demo-001',
        userId: metadata.userId || 'user-demo-001',
        contentType: 'audio',
        data: base64Data,
        metadata: {
          timestamp: new Date().toISOString(),
          deviceInfo: metadata.deviceInfo || this.getDeviceInfo(),
          context: metadata.context || 'office',
        },
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'Upload failed');
    }

    return response.json();
  }

  async uploadImage(
    imageBlob: Blob,
    metadata: Partial<UploadMetadata> = {}
  ): Promise<UploadResponse> {
    const base64Data = await this.blobToBase64(imageBlob);

    const response = await fetch(`${API_ENDPOINT}/ingest`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer demo-token', // Mock token for local testing
      },
      body: JSON.stringify({
        patientId: metadata.patientId || 'patient-demo-001',
        encounterId: metadata.encounterId || 'encounter-demo-001',
        userId: metadata.userId || 'user-demo-001',
        contentType: 'image',
        data: base64Data,
        metadata: {
          timestamp: new Date().toISOString(),
          deviceInfo: metadata.deviceInfo || this.getDeviceInfo(),
          context: metadata.context || 'office',
        },
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'Upload failed');
    }

    return response.json();
  }

  async getRecords(): Promise<any> {
    const response = await fetch(`${API_ENDPOINT}/records`);
    if (!response.ok) {
      throw new Error('Failed to fetch records');
    }
    return response.json();
  }

  async getRecord(recordId: string): Promise<any> {
    const response = await fetch(`${API_ENDPOINT}/records/${recordId}`);
    if (!response.ok) {
      throw new Error('Failed to fetch record');
    }
    return response.json();
  }
}

export const apiClient = new ApiClient();
