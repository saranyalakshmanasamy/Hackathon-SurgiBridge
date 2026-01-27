import React, { useState, useRef, useEffect } from 'react';
import { Mic, Square, Pause, Play } from 'lucide-react';

export enum RecordingState {
  IDLE = 'idle',
  RECORDING = 'recording',
  PAUSED = 'paused',
  STOPPED = 'stopped'
}

export interface AudioBlob {
  blob: Blob;
  duration: number;
  mimeType: string;
}

interface VoiceRecordingComponentProps {
  onRecordingComplete?: (audioBlob: AudioBlob) => void;
  onError?: (error: Error) => void;
}

export const VoiceRecordingComponent: React.FC<VoiceRecordingComponentProps> = ({
  onRecordingComplete,
  onError
}) => {
  const [recordingState, setRecordingState] = useState<RecordingState>(RecordingState.IDLE);
  const [duration, setDuration] = useState<number>(0);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const startTimeRef = useRef<number>(0);
  const pausedDurationRef = useRef<number>(0);
  const pauseStartTimeRef = useRef<number>(0);
  const durationIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current);
      }
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
    };
  }, []);

  const startDurationTracking = () => {
    if (durationIntervalRef.current) {
      clearInterval(durationIntervalRef.current);
    }
    
    durationIntervalRef.current = setInterval(() => {
      const elapsed = Date.now() - startTimeRef.current - pausedDurationRef.current;
      setDuration(Math.floor(elapsed / 1000));
    }, 100);
  };

  const stopDurationTracking = () => {
    if (durationIntervalRef.current) {
      clearInterval(durationIntervalRef.current);
      durationIntervalRef.current = null;
    }
  };

  const startRecording = async (): Promise<void> => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      // Determine supported MIME type
      const mimeTypes = [
        'audio/webm',
        'audio/webm;codecs=opus',
        'audio/mp4',
        'audio/ogg;codecs=opus'
      ];
      
      const supportedMimeType = mimeTypes.find(type => MediaRecorder.isTypeSupported(type)) || '';

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: supportedMimeType
      });

      chunksRef.current = [];
      startTimeRef.current = Date.now();
      pausedDurationRef.current = 0;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: supportedMimeType });
        const finalDuration = Math.floor((Date.now() - startTimeRef.current - pausedDurationRef.current) / 1000);
        
        const audioBlob: AudioBlob = {
          blob,
          duration: finalDuration,
          mimeType: supportedMimeType
        };

        if (onRecordingComplete) {
          onRecordingComplete(audioBlob);
        }

        // Clean up
        stream.getTracks().forEach(track => track.stop());
        stopDurationTracking();
      };

      mediaRecorder.onerror = (event) => {
        const error = new Error(`MediaRecorder error: ${event}`);
        if (onError) {
          onError(error);
        }
        stream.getTracks().forEach(track => track.stop());
        stopDurationTracking();
      };

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start(100); // Collect data every 100ms
      setRecordingState(RecordingState.RECORDING);
      startDurationTracking();
    } catch (error) {
      const err = error instanceof Error ? error : new Error('Failed to start recording');
      if (onError) {
        onError(err);
      }
      setRecordingState(RecordingState.IDLE);
    }
  };

  const pauseRecording = (): void => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.pause();
      pauseStartTimeRef.current = Date.now();
      setRecordingState(RecordingState.PAUSED);
      stopDurationTracking();
    }
  };

  const resumeRecording = (): void => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'paused') {
      pausedDurationRef.current += Date.now() - pauseStartTimeRef.current;
      mediaRecorderRef.current.resume();
      setRecordingState(RecordingState.RECORDING);
      startDurationTracking();
    }
  };

  const stopRecording = async (): Promise<AudioBlob | null> => {
    return new Promise((resolve) => {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        const originalOnStop = mediaRecorderRef.current.onstop;
        const currentRecorder = mediaRecorderRef.current;
        
        mediaRecorderRef.current.onstop = (event) => {
          if (originalOnStop && currentRecorder) {
            originalOnStop.call(currentRecorder, event);
          }
          
          const blob = new Blob(chunksRef.current, { 
            type: currentRecorder?.mimeType || 'audio/webm' 
          });
          const finalDuration = Math.floor((Date.now() - startTimeRef.current - pausedDurationRef.current) / 1000);
          
          const audioBlob: AudioBlob = {
            blob,
            duration: finalDuration,
            mimeType: currentRecorder?.mimeType || 'audio/webm'
          };
          
          resolve(audioBlob);
        };
        
        mediaRecorderRef.current.stop();
        setRecordingState(RecordingState.STOPPED);
      } else {
        resolve(null);
      }
    });
  };

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="w-full max-w-md mx-auto p-6 bg-white dark:bg-gray-800 rounded-lg shadow-md">
      <div className="flex flex-col items-center space-y-6">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            Voice Recording
          </h2>
          <div className="text-3xl font-mono text-gray-700 dark:text-gray-300">
            {formatDuration(duration)}
          </div>
        </div>

        <div className="flex items-center space-x-4">
          {recordingState === RecordingState.IDLE && (
            <button
              onClick={startRecording}
              className="flex items-center justify-center w-16 h-16 bg-red-500 hover:bg-red-600 text-white rounded-full transition-colors shadow-lg"
              aria-label="Start recording"
              style={{ minWidth: '44px', minHeight: '44px' }}
            >
              <Mic size={28} />
            </button>
          )}

          {recordingState === RecordingState.RECORDING && (
            <>
              <button
                onClick={pauseRecording}
                className="flex items-center justify-center w-16 h-16 bg-yellow-500 hover:bg-yellow-600 text-white rounded-full transition-colors shadow-lg"
                aria-label="Pause recording"
                style={{ minWidth: '44px', minHeight: '44px' }}
              >
                <Pause size={28} />
              </button>
              <button
                onClick={stopRecording}
                className="flex items-center justify-center w-16 h-16 bg-gray-700 hover:bg-gray-800 text-white rounded-full transition-colors shadow-lg"
                aria-label="Stop recording"
                style={{ minWidth: '44px', minHeight: '44px' }}
              >
                <Square size={28} />
              </button>
            </>
          )}

          {recordingState === RecordingState.PAUSED && (
            <>
              <button
                onClick={resumeRecording}
                className="flex items-center justify-center w-16 h-16 bg-green-500 hover:bg-green-600 text-white rounded-full transition-colors shadow-lg"
                aria-label="Resume recording"
                style={{ minWidth: '44px', minHeight: '44px' }}
              >
                <Play size={28} />
              </button>
              <button
                onClick={stopRecording}
                className="flex items-center justify-center w-16 h-16 bg-gray-700 hover:bg-gray-800 text-white rounded-full transition-colors shadow-lg"
                aria-label="Stop recording"
                style={{ minWidth: '44px', minHeight: '44px' }}
              >
                <Square size={28} />
              </button>
            </>
          )}

          {recordingState === RecordingState.STOPPED && (
            <button
              onClick={startRecording}
              className="flex items-center justify-center w-16 h-16 bg-red-500 hover:bg-red-600 text-white rounded-full transition-colors shadow-lg"
              aria-label="Start new recording"
              style={{ minWidth: '44px', minHeight: '44px' }}
            >
              <Mic size={28} />
            </button>
          )}
        </div>

        <div className="text-sm text-gray-600 dark:text-gray-400">
          {recordingState === RecordingState.IDLE && 'Click the microphone to start recording'}
          {recordingState === RecordingState.RECORDING && (
            <span className="flex items-center">
              <span className="inline-block w-2 h-2 bg-red-500 rounded-full mr-2 animate-pulse"></span>
              Recording...
            </span>
          )}
          {recordingState === RecordingState.PAUSED && 'Recording paused'}
          {recordingState === RecordingState.STOPPED && 'Recording complete'}
        </div>
      </div>
    </div>
  );
};

// Export the interface and methods for external use
export interface VoiceRecordingComponentRef {
  startRecording: () => Promise<void>;
  pauseRecording: () => void;
  resumeRecording: () => void;
  stopRecording: () => Promise<AudioBlob | null>;
  getRecordingState: () => RecordingState;
}
