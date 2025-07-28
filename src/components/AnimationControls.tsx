import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { 
  Play, 
  Pause, 
  SkipBack, 
  SkipForward, 
  RotateCcw,
  Camera,
  Gauge
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface AnimationControlsProps {
  totalFrames: number;
  currentFrame: number;
  isPlaying: boolean;
  frameRate: number;
  onFrameChange: (frame: number) => void;
  onPlayPause: () => void;
  onReset: () => void;
  onCameraView: (view: 'side' | 'catcher' | 'free') => void;
  currentView: 'side' | 'catcher' | 'free';
  playbackSpeed?: number;
  onSpeedChange?: (speed: number) => void;
}

export function AnimationControls({
  totalFrames,
  currentFrame,
  isPlaying,
  frameRate,
  onFrameChange,
  onPlayPause,
  onReset,
  onCameraView,
  currentView,
  playbackSpeed = 1,
  onSpeedChange
}: AnimationControlsProps) {
  
  const formatTime = (frame: number) => {
    const seconds = frame / frameRate;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = (seconds % 60).toFixed(2);
    return `${minutes}:${remainingSeconds.padStart(5, '0')}`;
  };

  const handleSpeedChange = (speed: number[]) => {
    if (onSpeedChange) {
      onSpeedChange(speed[0]);
    }
  };

  const jumpToFrame = (direction: 'forward' | 'backward') => {
    const jumpSize = Math.max(1, Math.floor(frameRate / 10)); // 0.1 second jumps
    if (direction === 'forward') {
      onFrameChange(Math.min(currentFrame + jumpSize, totalFrames - 1));
    } else {
      onFrameChange(Math.max(currentFrame - jumpSize, 0));
    }
  };

  return (
    <Card className="bg-gradient-glassmorphism border-card-border backdrop-blur-xl">
      <CardContent className="p-6">
        {/* Playback Controls */}
        <div className="flex items-center justify-center space-x-4 mb-6">
          <Button
            variant="outline"
            size="sm"
            onClick={() => jumpToFrame('backward')}
            className="border-primary/30 hover:border-primary hover:bg-primary/10"
          >
            <SkipBack className="h-4 w-4" />
          </Button>
          
          <Button
            onClick={onPlayPause}
            size="lg"
            className={cn(
              "bg-gradient-tech hover:shadow-glow transition-all duration-300",
              isPlaying && "animate-pulse-glow"
            )}
          >
            {isPlaying ? (
              <Pause className="h-6 w-6" />
            ) : (
              <Play className="h-6 w-6" />
            )}
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => jumpToFrame('forward')}
            className="border-primary/30 hover:border-primary hover:bg-primary/10"
          >
            <SkipForward className="h-4 w-4" />
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={onReset}
            className="border-accent/30 hover:border-accent hover:bg-accent/10"
          >
            <RotateCcw className="h-4 w-4" />
          </Button>
        </div>

        {/* Frame Slider */}
        <div className="space-y-4 mb-6">
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>Frame: {currentFrame + 1} / {totalFrames}</span>
            <span>Time: {formatTime(currentFrame)}</span>
          </div>
          
          <Slider
            value={[currentFrame]}
            onValueChange={([value]) => onFrameChange(value)}
            max={totalFrames - 1}
            min={0}
            step={1}
            className="w-full"
          />
        </div>

        {/* Speed Control */}
        <div className="space-y-4 mb-6">
          <div className="flex items-center space-x-2">
            <Gauge className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">Playback Speed: {playbackSpeed.toFixed(1)}x</span>
          </div>
          
          <Slider
            value={[playbackSpeed]}
            onValueChange={handleSpeedChange}
            min={0.1}
            max={3}
            step={0.1}
            className="w-full"
          />
        </div>

        {/* Camera Views */}
        <div className="space-y-3">
          <div className="flex items-center space-x-2 mb-2">
            <Camera className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">Camera View</span>
          </div>
          
          <div className="grid grid-cols-3 gap-2">
            {[
              { id: 'side', label: 'Side View' },
              { id: 'catcher', label: 'Catcher View' },
              { id: 'free', label: 'Free Orbit' }
            ].map(({ id, label }) => (
              <Button
                key={id}
                variant={currentView === id ? "default" : "outline"}
                size="sm"
                onClick={() => onCameraView(id as 'side' | 'catcher' | 'free')}
                className={cn(
                  "text-xs",
                  currentView === id 
                    ? "bg-gradient-tech shadow-neon" 
                    : "border-border hover:border-primary/50 hover:bg-primary/10"
                )}
              >
                {label}
              </Button>
            ))}
          </div>
        </div>

        {/* Frame Rate Info */}
        <div className="mt-6 pt-4 border-t border-border">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Frame Rate: {frameRate} Hz</span>
            <span>Duration: {formatTime(totalFrames - 1)}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}