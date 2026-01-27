import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import { VoiceRecordingComponent } from './components/VoiceRecordingComponent';
import { DocumentScanningComponent } from './components/DocumentScanningComponent';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
      <div className="container mx-auto px-4 max-w-6xl">
        <header className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
            Clinical Registry System
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Hybrid Voice-to-Structured-Data Clinical Documentation
          </p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Voice Recording Section */}
          <div className="space-y-4">
            <h2 className="text-2xl font-semibold text-gray-800 dark:text-gray-200 text-center">
              Task 2: Voice Recording
            </h2>
            <VoiceRecordingComponent
              onRecordingComplete={(audioBlob) => {
                console.log('✅ Recording complete:', {
                  duration: audioBlob.duration,
                  size: audioBlob.blob.size,
                  mimeType: audioBlob.mimeType
                });
                alert(`Recording complete! Duration: ${audioBlob.duration}s, Size: ${Math.round(audioBlob.blob.size / 1024)}KB`);
              }}
              onError={(error) => {
                console.error('❌ Recording error:', error);
                alert(`Recording error: ${error.message}`);
              }}
            />
          </div>

          {/* Document Scanning Section */}
          <div className="space-y-4">
            <h2 className="text-2xl font-semibold text-gray-800 dark:text-gray-200 text-center">
              Task 3: Document Scanning
            </h2>
            <DocumentScanningComponent
              maxPages={10}
              onImagesCapture={(images) => {
                console.log('✅ Images captured:', images);
                console.log(`Total pages: ${images.length}`);
                images.forEach((img, index) => {
                  console.log(`Page ${index + 1}:`, {
                    size: img.blob.size,
                    transformations: img.transformations.map(t => t.type)
                  });
                });
                alert(`Scanning complete! ${images.length} page(s) captured and preprocessed.`);
              }}
              onError={(error) => {
                console.error('❌ Scanning error:', error);
                alert(`Scanning error: ${error.message}`);
              }}
            />
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
            <p className="text-sm text-gray-500 dark:text-gray-500 mt-4">
              Next: Task 4 - Backend Ingestion Lambda
            </p>
          </div>
        </footer>
      </div>
    </div>
  </React.StrictMode>,
);
