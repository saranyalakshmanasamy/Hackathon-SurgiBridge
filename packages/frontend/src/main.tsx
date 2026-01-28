import React, { useState } from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import { VoiceRecordingComponent } from './components/VoiceRecordingComponent';
import { DocumentScanningComponent } from './components/DocumentScanningComponent';
import { apiClient } from './services/apiClient';

function App() {
  const [uploadStatus, setUploadStatus] = useState<string>('');
  const [isUploading, setIsUploading] = useState(false);
  const [lastRecordId, setLastRecordId] = useState<string>('');

  const handleAudioUpload = async (audioBlob: { blob: Blob; duration: number; mimeType: string }) => {
    try {
      setIsUploading(true);
      setUploadStatus('Uploading audio...');
      
      const response = await apiClient.uploadAudio(audioBlob.blob);
      
      setLastRecordId(response.recordId);
      setUploadStatus(`✅ Audio uploaded successfully! Record ID: ${response.recordId}`);
      
      console.log('✅ Upload response:', response);
      alert(`Audio uploaded successfully!\n\nRecord ID: ${response.recordId}\nDuration: ${audioBlob.duration}s\nSize: ${Math.round(audioBlob.blob.size / 1024)}KB`);
    } catch (error: any) {
      setUploadStatus(`❌ Upload failed: ${error.message}`);
      console.error('❌ Upload error:', error);
      alert(`Upload failed: ${error.message}`);
    } finally {
      setIsUploading(false);
    }
  };

  const handleImageUpload = async (images: any[]) => {
    try {
      setIsUploading(true);
      setUploadStatus(`Uploading ${images.length} image(s)...`);
      
      // Upload first image (for demo, you can loop for multiple)
      const response = await apiClient.uploadImage(images[0].blob);
      
      setLastRecordId(response.recordId);
      setUploadStatus(`✅ Image uploaded successfully! Record ID: ${response.recordId}`);
      
      console.log('✅ Upload response:', response);
      alert(`Image uploaded successfully!\n\nRecord ID: ${response.recordId}\nPages: ${images.length}\nSize: ${Math.round(images[0].blob.size / 1024)}KB`);
    } catch (error: any) {
      setUploadStatus(`❌ Upload failed: ${error.message}`);
      console.error('❌ Upload error:', error);
      alert(`Upload failed: ${error.message}`);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
      <div className="container mx-auto px-4 max-w-6xl">
        <header className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
            SurgiBridge
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Hybrid Voice/Image-to-Structured-Data Clinical Documentation
          </p>
          
          {/* Upload Status Banner */}
          {uploadStatus && (
            <div className={`mt-4 p-4 rounded-lg ${
              uploadStatus.startsWith('✅') 
                ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200' 
                : uploadStatus.startsWith('❌')
                ? 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200'
                : 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200'
            }`}>
              <p className="font-semibold">{uploadStatus}</p>
              {lastRecordId && (
                <p className="text-sm mt-1">
                  Check backend logs or local-data folder for saved files
                </p>
              )}
            </div>
          )}
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Voice Recording Section */}
          <div className="space-y-4">
            <h2 className="text-2xl font-semibold text-gray-800 dark:text-gray-200 text-center">
              🎤 Voice Recording
            </h2>
            <VoiceRecordingComponent
              onRecordingComplete={handleAudioUpload}
              onError={(error) => {
                console.error('❌ Recording error:', error);
                alert(`Recording error: ${error.message}`);
              }}
            />
            <div className="text-center text-sm text-gray-500 dark:text-gray-400">
              Record audio and it will automatically upload to the backend
            </div>
          </div>

          {/* Document Scanning Section */}
          <div className="space-y-4">
            <h2 className="text-2xl font-semibold text-gray-800 dark:text-gray-200 text-center">
              📄 Document Scanning
            </h2>
            <DocumentScanningComponent
              maxPages={10}
              onImagesCapture={handleImageUpload}
              onError={(error) => {
                console.error('❌ Scanning error:', error);
                alert(`Scanning error: ${error.message}`);
              }}
            />
            <div className="text-center text-sm text-gray-500 dark:text-gray-400">
              Capture/upload images and they will automatically upload to the backend
            </div>
          </div>
        </div>

        {/* Status Footer */}
        <footer className="text-center mt-12 pt-8 border-t border-gray-200 dark:border-gray-700">
          <div className="space-y-2">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              ✅ Task 1: Project Setup & Infrastructure - Complete
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              ✅ Task 2: Voice Recording Component - Complete
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              ✅ Task 3: Document Scanning Component - Complete
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              ✅ Task 4.1: Backend Ingestion Lambda - Complete
            </p>
            <p className="text-sm text-green-600 dark:text-green-400 font-semibold mt-4">
              🚀 Frontend ↔️ Backend Integration: ACTIVE
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-500">
              Backend: http://localhost:3000 | Frontend: http://localhost:3001
            </p>
          </div>
        </footer>
      </div>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
