import React, { useState, useEffect, useRef } from 'react';
import { FileUpload } from '@/components/FileUpload';
import { MotionViewer3D } from '@/components/MotionViewer3D';
import { AnimationControls } from '@/components/AnimationControls';
import { MetricsDashboard } from '@/components/MetricsDashboard';
import { DataParser, MotionData } from '@/utils/dataParser';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Database } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const Index = () => {
  const [motionData, setMotionData] = useState<MotionData | null>(null);
  const [currentFrame, setCurrentFrame] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentView, setCurrentView] = useState<'side' | 'catcher' | 'free'>('side');
  const [motionPhase, setMotionPhase] = useState<'windup' | 'stride' | 'acceleration' | 'release' | 'follow-through'>('windup');
  const animationRef = useRef<number>();
  const lastFrameTimeRef = useRef(0);
  const { toast } = useToast();

  // Determine motion phase based on frame progression
  useEffect(() => {
    if (!motionData) return;
    
    const progress = currentFrame / motionData.frames.length;
    if (progress < 0.2) setMotionPhase('windup');
    else if (progress < 0.4) setMotionPhase('stride');
    else if (progress < 0.7) setMotionPhase('acceleration');
    else if (progress < 0.8) setMotionPhase('release');
    else setMotionPhase('follow-through');
  }, [currentFrame, motionData]);

  // Animation loop with speed control
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  
  useEffect(() => {
    if (isPlaying && motionData) {
      const targetFPS = 60 * playbackSpeed; // Adjust FPS based on speed
      const frameInterval = 1000 / targetFPS;
      
      const animate = (timestamp: number) => {
        if (timestamp - lastFrameTimeRef.current >= frameInterval) {
          setCurrentFrame(prev => {
            const next = prev + 1;
            if (next >= motionData.frames.length) {
              setIsPlaying(false);
              return 0;
            }
            return next;
          });
          lastFrameTimeRef.current = timestamp;
        }
        animationRef.current = requestAnimationFrame(animate);
      };
      animationRef.current = requestAnimationFrame(animate);
    } else {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    }

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isPlaying, motionData, playbackSpeed]);

  const handleFilesLoaded = async (files: {
    jointCenters: string;
    jointRotations: string;
    baseballMetrics: string;
  }) => {
    try {
      // Parse the uploaded files
      const jointCenters = DataParser.parseJointCenters(files.jointCenters);
      const jointRotations = DataParser.parseJointRotations(files.jointRotations);
      const baseballMetrics = DataParser.parseBaseballMetrics(files.baseballMetrics);

      // Combine data
      const combinedData = DataParser.combineData(jointCenters, jointRotations, baseballMetrics);
      
      setMotionData(combinedData);
      setCurrentFrame(0);
      setIsPlaying(false);

      toast({
        title: "Data Loaded Successfully",
        description: `${combinedData.frames.length} frames loaded at ${combinedData.frameRate} Hz`,
      });
    } catch (error) {
      toast({
        title: "Error Loading Data",
        description: "Please check your file formats and try again.",
        variant: "destructive",
      });
      console.error('Error parsing motion data:', error);
    }
  };

  const handlePlayPause = () => {
    setIsPlaying(!isPlaying);
  };

  const handleReset = () => {
    setCurrentFrame(0);
    setIsPlaying(false);
  };

  const handleFrameChange = (frame: number) => {
    setCurrentFrame(frame);
  };

  const handleCameraView = (view: 'side' | 'catcher' | 'free') => {
    setCurrentView(view);
  };

  const handleSpeedChange = (speed: number) => {
    setPlaybackSpeed(speed);
  };

  const handleBackToUpload = () => {
    setMotionData(null);
    setCurrentFrame(0);
    setIsPlaying(false);
  };

  if (!motionData) {
    return (
      <div className="min-h-screen bg-background relative overflow-hidden">
        {/* Animated background grid */}
        <div className="absolute inset-0 bg-gradient-to-br from-background via-background to-primary/5" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,_hsl(var(--primary)/0.1)_0%,_transparent_70%)]" />
        
        {/* Animated scan line */}
        <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-primary to-transparent animate-scan-line opacity-30" />
        
        <div className="relative z-10 min-h-screen flex flex-col items-center justify-center p-6">
          <div className="text-center mb-8">
            <h1 className="text-6xl font-bold bg-gradient-tech bg-clip-text text-transparent mb-4 animate-float">
              3D Motion Capture
            </h1>
            <h2 className="text-3xl font-bold text-foreground mb-2">
              Baseball Pitching Analyzer
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Advanced biomechanical analysis with real-time 3D visualization and performance metrics
            </p>
          </div>
          
          <FileUpload onFilesLoaded={handleFilesLoaded} />
          
          {/* Feature highlights */}
          <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl">
            {[
              {
                icon: <Database className="h-8 w-8" />,
                title: "300Hz Data Processing",
                description: "High-frequency motion capture data analysis"
              },
              {
                icon: <div className="h-8 w-8 rounded-full bg-primary/20 animate-pulse-glow" />,
                title: "Real-time 3D Visualization",
                description: "Glowing skeleton with biomechanical overlays"
              },
              {
                icon: <div className="h-8 w-8 bg-gradient-tech rounded animate-float" />,
                title: "Performance Metrics",
                description: "Velocity, torque, and kinematic analysis"
              }
            ].map((feature, index) => (
              <Card key={index} className="bg-gradient-glassmorphism border-card-border backdrop-blur-xl hover:shadow-glow transition-all duration-300">
                <CardContent className="p-6 text-center">
                  <div className="flex justify-center mb-4 text-primary">
                    {feature.icon}
                  </div>
                  <h3 className="font-bold mb-2">{feature.title}</h3>
                  <p className="text-sm text-muted-foreground">{feature.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-card-border bg-gradient-glassmorphism backdrop-blur-xl">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                onClick={handleBackToUpload}
                className="text-muted-foreground hover:text-foreground"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Upload
              </Button>
              <div className="h-6 w-px bg-border" />
              <h1 className="text-xl font-bold bg-gradient-tech bg-clip-text text-transparent">
                Motion Analysis
              </h1>
            </div>
            <div className="text-sm text-muted-foreground">
              {motionData.frames.length} frames • {motionData.frameRate} Hz
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-6 py-6">
        <div className="grid grid-cols-1 xl:grid-cols-4 gap-6 h-[calc(100vh-180px)]">
          {/* 3D Viewer */}
          <div className="xl:col-span-3">
            <MotionViewer3D
              motionData={motionData}
              currentFrame={currentFrame}
              cameraView={currentView}
            />
          </div>
          
          {/* Controls and Metrics */}
          <div className="space-y-6">
            <AnimationControls
              totalFrames={motionData.frames.length}
              currentFrame={currentFrame}
              isPlaying={isPlaying}
              frameRate={motionData.frameRate}
              onFrameChange={handleFrameChange}
              onPlayPause={handlePlayPause}
              onReset={handleReset}
              onCameraView={handleCameraView}
              currentView={currentView}
              playbackSpeed={playbackSpeed}
              onSpeedChange={handleSpeedChange}
            />
            
            <MetricsDashboard
              frameData={motionData.frames[currentFrame]}
              motionPhase={motionPhase}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;
