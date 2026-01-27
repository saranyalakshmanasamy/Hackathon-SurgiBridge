import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { DocumentScanningComponent } from './DocumentScanningComponent';

// Mock URL.createObjectURL and revokeObjectURL
global.URL.createObjectURL = vi.fn(() => 'mock-url');
global.URL.revokeObjectURL = vi.fn();

// Mock Image
class MockImage {
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;
  src: string = '';
  width: number = 800;
  height: number = 600;

  constructor() {
    setTimeout(() => {
      if (this.onload) {
        this.onload();
      }
    }, 10);
  }
}

global.Image = MockImage as any;

// Mock Canvas
const mockGetContext = vi.fn(() => ({
  drawImage: vi.fn(),
  getImageData: vi.fn(() => ({
    data: new Uint8ClampedArray(800 * 600 * 4),
    width: 800,
    height: 600
  })),
  putImageData: vi.fn()
}));

const mockToBlob = vi.fn((callback) => {
  callback(new Blob(['processed'], { type: 'image/jpeg' }));
});

global.HTMLCanvasElement.prototype.getContext = mockGetContext as any;
global.HTMLCanvasElement.prototype.toBlob = mockToBlob as any;

describe('DocumentScanningComponent', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should render initial state', () => {
    render(<DocumentScanningComponent />);
    
    expect(screen.getByText('Document Scanning')).toBeInTheDocument();
    expect(screen.getByText(/Capture documents using camera or upload files/)).toBeInTheDocument();
    expect(screen.getByLabelText('Capture image')).toBeInTheDocument();
    expect(screen.getByLabelText('Upload multiple pages')).toBeInTheDocument();
  });

  it('should accept JPEG format', async () => {
    const onImagesCapture = vi.fn();
    render(<DocumentScanningComponent onImagesCapture={onImagesCapture} />);
    
    const fileInput = screen.getByLabelText('Upload files') as HTMLInputElement;
    const file = new File(['image'], 'test.jpg', { type: 'image/jpeg' });
    
    Object.defineProperty(fileInput, 'files', {
      value: [file],
      writable: false
    });
    
    fireEvent.change(fileInput);
    
    await waitFor(() => {
      expect(screen.getByText(/Captured Pages/)).toBeInTheDocument();
    });
  });

  it('should accept PNG format', async () => {
    const onImagesCapture = vi.fn();
    render(<DocumentScanningComponent onImagesCapture={onImagesCapture} />);
    
    const fileInput = screen.getByLabelText('Upload files') as HTMLInputElement;
    const file = new File(['image'], 'test.png', { type: 'image/png' });
    
    Object.defineProperty(fileInput, 'files', {
      value: [file],
      writable: false
    });
    
    fireEvent.change(fileInput);
    
    await waitFor(() => {
      expect(screen.getByText(/Captured Pages/)).toBeInTheDocument();
    });
  });

  it('should accept PDF format', async () => {
    const onImagesCapture = vi.fn();
    render(<DocumentScanningComponent onImagesCapture={onImagesCapture} />);
    
    const fileInput = screen.getByLabelText('Upload files') as HTMLInputElement;
    const file = new File(['pdf'], 'test.pdf', { type: 'application/pdf' });
    
    Object.defineProperty(fileInput, 'files', {
      value: [file],
      writable: false
    });
    
    fireEvent.change(fileInput);
    
    await waitFor(() => {
      expect(screen.getByText(/Captured Pages/)).toBeInTheDocument();
    });
  });

  it('should handle multiple page capture', async () => {
    render(<DocumentScanningComponent />);
    
    const fileInput = screen.getByLabelText('Upload files') as HTMLInputElement;
    const files = [
      new File(['image1'], 'test1.jpg', { type: 'image/jpeg' }),
      new File(['image2'], 'test2.jpg', { type: 'image/jpeg' }),
      new File(['image3'], 'test3.jpg', { type: 'image/jpeg' })
    ];
    
    Object.defineProperty(fileInput, 'files', {
      value: files,
      writable: false
    });
    
    fireEvent.change(fileInput);
    
    await waitFor(() => {
      expect(screen.getByText('Captured Pages (3/10)')).toBeInTheDocument();
    });
  });

  it('should apply image preprocessing', async () => {
    render(<DocumentScanningComponent />);
    
    const fileInput = screen.getByLabelText('Upload files') as HTMLInputElement;
    const file = new File(['image'], 'test.jpg', { type: 'image/jpeg' });
    
    Object.defineProperty(fileInput, 'files', {
      value: [file],
      writable: false
    });
    
    fireEvent.change(fileInput);
    
    await waitFor(() => {
      expect(mockGetContext).toHaveBeenCalled();
      expect(mockToBlob).toHaveBeenCalled();
    });
  });

  it('should remove individual images', async () => {
    render(<DocumentScanningComponent />);
    
    const fileInput = screen.getByLabelText('Upload files') as HTMLInputElement;
    const files = [
      new File(['image1'], 'test1.jpg', { type: 'image/jpeg' }),
      new File(['image2'], 'test2.jpg', { type: 'image/jpeg' })
    ];
    
    Object.defineProperty(fileInput, 'files', {
      value: files,
      writable: false
    });
    
    fireEvent.change(fileInput);
    
    await waitFor(() => {
      expect(screen.getByText('Captured Pages (2/10)')).toBeInTheDocument();
    });
    
    const removeButton = screen.getByLabelText('Remove page 1');
    fireEvent.click(removeButton);
    
    await waitFor(() => {
      expect(screen.getByText('Captured Pages (1/10)')).toBeInTheDocument();
    });
  });

  it('should clear all images', async () => {
    render(<DocumentScanningComponent />);
    
    const fileInput = screen.getByLabelText('Upload files') as HTMLInputElement;
    const file = new File(['image'], 'test.jpg', { type: 'image/jpeg' });
    
    Object.defineProperty(fileInput, 'files', {
      value: [file],
      writable: false
    });
    
    fireEvent.change(fileInput);
    
    await waitFor(() => {
      expect(screen.getByText(/Captured Pages/)).toBeInTheDocument();
    });
    
    const clearButton = screen.getByLabelText('Clear all images');
    fireEvent.click(clearButton);
    
    await waitFor(() => {
      expect(screen.getByText('No documents captured yet')).toBeInTheDocument();
    });
  });

  it('should call onImagesCapture when complete button is clicked', async () => {
    const onImagesCapture = vi.fn();
    render(<DocumentScanningComponent onImagesCapture={onImagesCapture} />);
    
    const fileInput = screen.getByLabelText('Upload files') as HTMLInputElement;
    const file = new File(['image'], 'test.jpg', { type: 'image/jpeg' });
    
    Object.defineProperty(fileInput, 'files', {
      value: [file],
      writable: false
    });
    
    fireEvent.change(fileInput);
    
    await waitFor(() => {
      expect(screen.getByLabelText('Complete scanning')).toBeInTheDocument();
    });
    
    const completeButton = screen.getByLabelText('Complete scanning');
    fireEvent.click(completeButton);
    
    expect(onImagesCapture).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          blob: expect.any(Blob),
          originalBlob: expect.any(Blob),
          transformations: expect.any(Array)
        })
      ])
    );
  });

  it('should have minimum 44px touch targets', () => {
    render(<DocumentScanningComponent />);
    
    const captureButton = screen.getByLabelText('Capture image');
    const uploadButton = screen.getByLabelText('Upload multiple pages');
    
    expect(captureButton.style.minWidth).toBe('44px');
    expect(captureButton.style.minHeight).toBe('44px');
    expect(uploadButton.style.minWidth).toBe('44px');
    expect(uploadButton.style.minHeight).toBe('44px');
  });

  it('should respect maxPages limit', async () => {
    render(<DocumentScanningComponent maxPages={2} />);
    
    const fileInput = screen.getByLabelText('Upload files') as HTMLInputElement;
    const files = [
      new File(['image1'], 'test1.jpg', { type: 'image/jpeg' }),
      new File(['image2'], 'test2.jpg', { type: 'image/jpeg' }),
      new File(['image3'], 'test3.jpg', { type: 'image/jpeg' })
    ];
    
    Object.defineProperty(fileInput, 'files', {
      value: files,
      writable: false
    });
    
    fireEvent.change(fileInput);
    
    await waitFor(() => {
      expect(screen.getByText('Captured Pages (2/2)')).toBeInTheDocument();
    });
  });

  it('should handle unsupported format error', async () => {
    const onError = vi.fn();
    render(<DocumentScanningComponent onError={onError} />);
    
    const fileInput = screen.getByLabelText('Upload files') as HTMLInputElement;
    const file = new File(['image'], 'test.bmp', { type: 'image/bmp' });
    
    Object.defineProperty(fileInput, 'files', {
      value: [file],
      writable: false
    });
    
    fireEvent.change(fileInput);
    
    await waitFor(() => {
      expect(onError).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('Unsupported format')
        })
      );
    });
  });
});
