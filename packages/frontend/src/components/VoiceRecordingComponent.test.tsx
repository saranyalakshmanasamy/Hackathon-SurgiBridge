import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { VoiceRecordingComponent } from './VoiceRecordingComponent';

// Mock MediaRecorder
class MockMediaRecorder {
  state: 'inactive' | 'recording' | 'paused' = 'inactive';
  ondataavailable: ((event: any) => void) | null = null;
  onstop: ((event: any) => void) | null = null;
  onerror: ((event: any) => void) | null = null;
  mimeType: string;
  
  constructor(_stream: MediaStream, options?: { mimeType?: string }) {
    this.mimeType = options?.mimeType || 'audio/webm';
  }
  
  start(_timeslice?: number) {
    this.state = 'recording';
    // Simulate data available
    setTimeout(() => {
      if (this.ondataavailable) {
        this.ondataavailable({ data: new Blob(['test'], { type: this.mimeType }) });
      }
    }, 10);
  }
  
  pause() {
    this.state = 'paused';
  }
  
  resume() {
    this.state = 'recording';
  }
  
  stop() {
    this.state = 'inactive';
    setTimeout(() => {
      if (this.onstop) {
        this.onstop({});
      }
    }, 10);
  }
  
  static isTypeSupported(mimeType: string) {
    return mimeType === 'audio/webm';
  }
}

describe('VoiceRecordingComponent', () => {
  let mockGetUserMedia: any;
  let mockMediaStream: any;

  beforeEach(() => {
    // Mock MediaRecorder
    global.MediaRecorder = MockMediaRecorder as any;
    
    // Mock getUserMedia
    mockMediaStream = {
      getTracks: () => [{
        stop: vi.fn()
      }]
    };
    
    mockGetUserMedia = vi.fn().mockResolvedValue(mockMediaStream);
    Object.defineProperty(global.navigator, 'mediaDevices', {
      writable: true,
      value: {
        getUserMedia: mockGetUserMedia
      }
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should render in idle state initially', () => {
    render(<VoiceRecordingComponent />);
    
    expect(screen.getByText('Voice Recording')).toBeInTheDocument();
    expect(screen.getByText('00:00')).toBeInTheDocument();
    expect(screen.getByText('Click the microphone to start recording')).toBeInTheDocument();
    expect(screen.getByLabelText('Start recording')).toBeInTheDocument();
  });

  it('should start recording when microphone button is clicked', async () => {
    const onRecordingComplete = vi.fn();
    render(<VoiceRecordingComponent onRecordingComplete={onRecordingComplete} />);
    
    const startButton = screen.getByLabelText('Start recording');
    fireEvent.click(startButton);
    
    await waitFor(() => {
      expect(mockGetUserMedia).toHaveBeenCalledWith({ audio: true });
    });
    
    await waitFor(() => {
      expect(screen.getByText('Recording...')).toBeInTheDocument();
    });
  });

  it('should pause recording when pause button is clicked', async () => {
    render(<VoiceRecordingComponent />);
    
    const startButton = screen.getByLabelText('Start recording');
    fireEvent.click(startButton);
    
    await waitFor(() => {
      expect(screen.getByLabelText('Pause recording')).toBeInTheDocument();
    });
    
    const pauseButton = screen.getByLabelText('Pause recording');
    fireEvent.click(pauseButton);
    
    await waitFor(() => {
      expect(screen.getByText('Recording paused')).toBeInTheDocument();
    });
  });

  it('should resume recording when play button is clicked after pause', async () => {
    render(<VoiceRecordingComponent />);
    
    // Start recording
    const startButton = screen.getByLabelText('Start recording');
    fireEvent.click(startButton);
    
    await waitFor(() => {
      expect(screen.getByLabelText('Pause recording')).toBeInTheDocument();
    });
    
    // Pause recording
    const pauseButton = screen.getByLabelText('Pause recording');
    fireEvent.click(pauseButton);
    
    await waitFor(() => {
      expect(screen.getByLabelText('Resume recording')).toBeInTheDocument();
    });
    
    // Resume recording
    const resumeButton = screen.getByLabelText('Resume recording');
    fireEvent.click(resumeButton);
    
    await waitFor(() => {
      expect(screen.getByText('Recording...')).toBeInTheDocument();
    });
  });

  it('should stop recording and call onRecordingComplete', async () => {
    const onRecordingComplete = vi.fn();
    render(<VoiceRecordingComponent onRecordingComplete={onRecordingComplete} />);
    
    // Start recording
    const startButton = screen.getByLabelText('Start recording');
    fireEvent.click(startButton);
    
    await waitFor(() => {
      expect(screen.getByLabelText('Stop recording')).toBeInTheDocument();
    });
    
    // Stop recording
    const stopButton = screen.getByLabelText('Stop recording');
    fireEvent.click(stopButton);
    
    await waitFor(() => {
      expect(onRecordingComplete).toHaveBeenCalled();
    });
    
    const callArgs = onRecordingComplete.mock.calls[0][0];
    expect(callArgs).toHaveProperty('blob');
    expect(callArgs).toHaveProperty('duration');
    expect(callArgs).toHaveProperty('mimeType');
  });

  it('should handle permission denied error', async () => {
    const onError = vi.fn();
    mockGetUserMedia.mockRejectedValue(new Error('Permission denied'));
    
    render(<VoiceRecordingComponent onError={onError} />);
    
    const startButton = screen.getByLabelText('Start recording');
    fireEvent.click(startButton);
    
    await waitFor(() => {
      expect(onError).toHaveBeenCalled();
    });
  });

  it('should have minimum 44px touch targets', () => {
    render(<VoiceRecordingComponent />);
    
    const startButton = screen.getByLabelText('Start recording');
    
    // Check that minWidth and minHeight are set to 44px
    expect(startButton.style.minWidth).toBe('44px');
    expect(startButton.style.minHeight).toBe('44px');
  });
});
