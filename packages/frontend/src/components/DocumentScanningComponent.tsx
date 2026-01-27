import React, { useState, useRef } from 'react';
import { Camera, Upload, X, Check, Image as ImageIcon } from 'lucide-react';

export interface ImageCapture {
  blob: Blob;
  format: 'jpeg' | 'png' | 'pdf';
  timestamp: Date;
  deviceInfo: DeviceInfo;
}

export interface PreprocessedImage {
  blob: Blob;
  originalBlob: Blob;
  transformations: ImageTransformation[];
}

export interface ImageTransformation {
  type: 'rotation' | 'contrast' | 'noise_reduction';
  parameters: Record<string, any>;
}

export interface DeviceInfo {
  deviceType: 'mobile' | 'desktop';
  platform: string;
  browser: string;
}

interface DocumentScanningComponentProps {
  onImagesCapture?: (images: PreprocessedImage[]) => void;
  onError?: (error: Error) => void;
  maxPages?: number;
}

export const DocumentScanningComponent: React.FC<DocumentScanningComponentProps> = ({
  onImagesCapture,
  onError,
  maxPages = 10
}) => {
  const [capturedImages, setCapturedImages] = useState<PreprocessedImage[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const getDeviceInfo = (): DeviceInfo => {
    const userAgent = navigator.userAgent;
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);
    
    let browser = 'Unknown';
    if (userAgent.includes('Chrome')) browser = 'Chrome';
    else if (userAgent.includes('Safari')) browser = 'Safari';
    else if (userAgent.includes('Firefox')) browser = 'Firefox';
    else if (userAgent.includes('Edge')) browser = 'Edge';
    
    return {
      deviceType: isMobile ? 'mobile' : 'desktop',
      platform: navigator.platform,
      browser
    };
  };

  const getSupportedFormats = (): string[] => {
    return ['image/jpeg', 'image/png', 'application/pdf'];
  };

  const preprocessImage = async (imageBlob: Blob): Promise<PreprocessedImage> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const url = URL.createObjectURL(imageBlob);
      
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          
          if (!ctx) {
            reject(new Error('Failed to get canvas context'));
            return;
          }

          // Set canvas size to image size
          canvas.width = img.width;
          canvas.height = img.height;

          // Draw original image
          ctx.drawImage(img, 0, 0);

          // Get image data for processing
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const data = imageData.data;

          const transformations: ImageTransformation[] = [];

          // Apply contrast enhancement
          const contrastFactor = 1.2;
          for (let i = 0; i < data.length; i += 4) {
            data[i] = Math.min(255, Math.max(0, ((data[i] - 128) * contrastFactor) + 128));     // R
            data[i + 1] = Math.min(255, Math.max(0, ((data[i + 1] - 128) * contrastFactor) + 128)); // G
            data[i + 2] = Math.min(255, Math.max(0, ((data[i + 2] - 128) * contrastFactor) + 128)); // B
          }
          transformations.push({
            type: 'contrast',
            parameters: { factor: contrastFactor }
          });

          // Apply simple noise reduction (averaging with neighbors)
          const originalData = new Uint8ClampedArray(data);
          for (let y = 1; y < canvas.height - 1; y++) {
            for (let x = 1; x < canvas.width - 1; x++) {
              const idx = (y * canvas.width + x) * 4;
              
              for (let c = 0; c < 3; c++) {
                const sum = 
                  originalData[idx + c] * 0.5 +
                  originalData[((y - 1) * canvas.width + x) * 4 + c] * 0.125 +
                  originalData[((y + 1) * canvas.width + x) * 4 + c] * 0.125 +
                  originalData[(y * canvas.width + (x - 1)) * 4 + c] * 0.125 +
                  originalData[(y * canvas.width + (x + 1)) * 4 + c] * 0.125;
                
                data[idx + c] = Math.round(sum);
              }
            }
          }
          transformations.push({
            type: 'noise_reduction',
            parameters: { method: 'averaging' }
          });

          // Put processed image data back
          ctx.putImageData(imageData, 0, 0);

          // Convert canvas to blob
          canvas.toBlob((processedBlob) => {
            if (processedBlob) {
              resolve({
                blob: processedBlob,
                originalBlob: imageBlob,
                transformations
              });
            } else {
              reject(new Error('Failed to create processed blob'));
            }
            URL.revokeObjectURL(url);
          }, 'image/jpeg', 0.95);
        } catch (error) {
          URL.revokeObjectURL(url);
          reject(error);
        }
      };

      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error('Failed to load image'));
      };

      img.src = url;
    });
  };

  const handleFileSelect = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    setIsProcessing(true);

    try {
      const newImages: PreprocessedImage[] = [];
      const newPreviewUrls: string[] = [];

      for (let i = 0; i < Math.min(files.length, maxPages - capturedImages.length); i++) {
        const file = files[i];
        
        // Validate format
        const supportedFormats = getSupportedFormats();
        if (!supportedFormats.includes(file.type)) {
          throw new Error(`Unsupported format: ${file.type}. Supported formats: JPEG, PNG, PDF`);
        }

        // For PDF, we'll store it as-is without preprocessing
        if (file.type === 'application/pdf') {
          const preprocessedImage: PreprocessedImage = {
            blob: file,
            originalBlob: file,
            transformations: []
          };
          newImages.push(preprocessedImage);
          newPreviewUrls.push(''); // No preview for PDF
        } else {
          // Preprocess image
          const preprocessedImage = await preprocessImage(file);
          newImages.push(preprocessedImage);
          
          // Create preview URL
          const previewUrl = URL.createObjectURL(preprocessedImage.blob);
          newPreviewUrls.push(previewUrl);
        }
      }

      setCapturedImages(prev => [...prev, ...newImages]);
      setPreviewUrls(prev => [...prev, ...newPreviewUrls]);
    } catch (error) {
      const err = error instanceof Error ? error : new Error('Failed to process images');
      if (onError) {
        onError(err);
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const captureImage = () => {
    const deviceInfo = getDeviceInfo();
    
    if (deviceInfo.deviceType === 'mobile') {
      // Use camera input for mobile
      cameraInputRef.current?.click();
    } else {
      // Use file input for desktop
      fileInputRef.current?.click();
    }
  };

  const captureMultiplePages = () => {
    fileInputRef.current?.click();
  };

  const removeImage = (index: number) => {
    setCapturedImages(prev => prev.filter((_, i) => i !== index));
    
    // Revoke preview URL to free memory
    if (previewUrls[index]) {
      URL.revokeObjectURL(previewUrls[index]);
    }
    setPreviewUrls(prev => prev.filter((_, i) => i !== index));
  };

  const handleComplete = () => {
    if (capturedImages.length > 0 && onImagesCapture) {
      onImagesCapture(capturedImages);
    }
  };

  const handleClear = () => {
    // Revoke all preview URLs
    previewUrls.forEach(url => {
      if (url) URL.revokeObjectURL(url);
    });
    
    setCapturedImages([]);
    setPreviewUrls([]);
  };

  return (
    <div className="w-full max-w-2xl mx-auto p-6 bg-white dark:bg-gray-800 rounded-lg shadow-md">
      <div className="flex flex-col space-y-6">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            Document Scanning
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Capture documents using camera or upload files (JPEG, PNG, PDF)
          </p>
        </div>

        {/* Hidden file inputs */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,application/pdf"
          multiple
          onChange={(e) => handleFileSelect(e.target.files)}
          className="hidden"
          aria-label="Upload files"
        />
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/jpeg,image/png"
          capture="environment"
          onChange={(e) => handleFileSelect(e.target.files)}
          className="hidden"
          aria-label="Capture with camera"
        />

        {/* Action buttons */}
        <div className="flex flex-wrap justify-center gap-4">
          <button
            onClick={captureImage}
            disabled={isProcessing || capturedImages.length >= maxPages}
            className="flex items-center justify-center px-6 py-3 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 text-white rounded-lg transition-colors shadow-md"
            aria-label="Capture image"
            style={{ minWidth: '44px', minHeight: '44px' }}
          >
            <Camera size={24} className="mr-2" />
            <span>Capture</span>
          </button>

          <button
            onClick={captureMultiplePages}
            disabled={isProcessing || capturedImages.length >= maxPages}
            className="flex items-center justify-center px-6 py-3 bg-green-500 hover:bg-green-600 disabled:bg-gray-400 text-white rounded-lg transition-colors shadow-md"
            aria-label="Upload multiple pages"
            style={{ minWidth: '44px', minHeight: '44px' }}
          >
            <Upload size={24} className="mr-2" />
            <span>Upload</span>
          </button>
        </div>

        {/* Processing indicator */}
        {isProcessing && (
          <div className="text-center">
            <div className="inline-block w-6 h-6 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">Processing images...</p>
          </div>
        )}

        {/* Image previews */}
        {capturedImages.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                Captured Pages ({capturedImages.length}/{maxPages})
              </h3>
              <button
                onClick={handleClear}
                className="text-sm text-red-600 hover:text-red-700 dark:text-red-400"
                aria-label="Clear all images"
              >
                Clear All
              </button>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {capturedImages.map((image, index) => (
                <div
                  key={index}
                  className="relative bg-gray-100 dark:bg-gray-700 rounded-lg overflow-hidden aspect-[3/4]"
                >
                  {previewUrls[index] ? (
                    <img
                      src={previewUrls[index]}
                      alt={`Page ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <ImageIcon size={48} className="text-gray-400" />
                      <span className="absolute bottom-2 text-xs text-gray-600 dark:text-gray-300">
                        PDF
                      </span>
                    </div>
                  )}
                  
                  <div className="absolute top-2 left-2 bg-black bg-opacity-60 text-white text-xs px-2 py-1 rounded">
                    Page {index + 1}
                  </div>
                  
                  <button
                    onClick={() => removeImage(index)}
                    className="absolute top-2 right-2 bg-red-500 hover:bg-red-600 text-white rounded-full p-1 transition-colors"
                    aria-label={`Remove page ${index + 1}`}
                    style={{ minWidth: '32px', minHeight: '32px' }}
                  >
                    <X size={16} />
                  </button>

                  {image.transformations.length > 0 && (
                    <div className="absolute bottom-2 right-2 bg-green-500 text-white rounded-full p-1">
                      <Check size={16} />
                    </div>
                  )}
                </div>
              ))}
            </div>

            <button
              onClick={handleComplete}
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors shadow-md font-medium"
              aria-label="Complete scanning"
              style={{ minHeight: '44px' }}
            >
              Complete ({capturedImages.length} page{capturedImages.length !== 1 ? 's' : ''})
            </button>
          </div>
        )}

        {capturedImages.length === 0 && !isProcessing && (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            <ImageIcon size={48} className="mx-auto mb-2 opacity-50" />
            <p>No documents captured yet</p>
          </div>
        )}
      </div>
    </div>
  );
};

// Export interface for external use
export interface DocumentScanningComponentRef {
  captureImage: () => void;
  captureMultiplePages: () => void;
  getSupportedFormats: () => string[];
}
