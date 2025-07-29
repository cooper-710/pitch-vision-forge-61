import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { MotionViewer3D } from '@/components/MotionViewer3D';
import { MotionData } from '@/utils/dataParser';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Play, Pause, RotateCcw, Gauge, Activity, Target, TrendingUp } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const Visualizer = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [motionData, setMotionData] = useState<MotionData | null>(null);
  const [currentFrame, setCurrentFrame] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [currentView, setCurrentView] = useState<'side' | 'catcher' | 'free'>('side');
  const [motionPhase, setMotionPhase] = useState<'windup' | 'stride' | 'acceleration' | 'release' | 'follow-through'>('windup');
  const [selectedMetric, setSelectedMetric] = useState('pelvisTwistVelocity');
  const animationRef = useRef<number>();
  const lastFrameTimeRef = useRef(0);

  // Get motion data from navigation state or redirect
  useEffect(() => {
    if (location.state?.motionData) {
      setMotionData(location.state.motionData);
    } else {
      toast({
        title: "No Data Found",
        description: "Please upload motion data first.",
        variant: "destructive",
      });
      navigate('/');
    }
  }, [location.state, navigate, toast]);

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

  // Animation loop
  useEffect(() => {
    if (isPlaying && motionData) {
      const targetFPS = 60 * playbackSpeed;
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

  const handlePlayPause = () => setIsPlaying(!isPlaying);
  const handleReset = () => { setCurrentFrame(0); setIsPlaying(false); };
  const handleFrameChange = (frame: number) => setCurrentFrame(frame);

  // Generate data with proper biomechanical calculations
  const generateBiomechanicalData = (metric: string) => {
    if (!motionData) return [];
    
    const realData = motionData.frames.map((frame, index) => {
      let value = 0;
      switch (metric) {
        case 'pelvisTwistVelocity':
          value = frame.baseballMetrics.pelvisTwistVelocity;
          break;
        case 'shoulderTwistVelocity':
          value = frame.baseballMetrics.shoulderTwistVelocity;
          break;
        case 'shoulderExternalRotation':
          value = frame.baseballMetrics.shoulderExternalRotation;
          break;
        case 'trunkSeparation':
          value = frame.baseballMetrics.trunkSeparation;
          break;
        default:
          value = 0;
      }
      
      return {
        frame: frame.frameNumber,
        value: isNaN(value) ? 0 : value
      };
    });

    // Only log once to avoid console spam
    const shouldLog = motionData.frames.length > 10 && currentFrame === 0;
    if (shouldLog) {
      const sampleFrames = [0, Math.floor(motionData.frames.length/4), Math.floor(motionData.frames.length/2)];
      console.log(`[generateBiomechanicalData] ${metric} samples:`, 
        sampleFrames.map(i => ({
          frame: i, 
          value: motionData.frames[i]?.baseballMetrics?.[metric] || 0
        }))
      );
    }
    
    return realData;
  };

  const getMetricInfo = (metric: string) => {
    switch (metric) {
      case 'pelvisTwistVelocity':
        return { label: 'Pelvis Twist Velocity', unit: '°/s', color: '#3b82f6' };
      case 'shoulderTwistVelocity':
        return { label: 'Shoulder Twist Velocity', unit: '°/s', color: '#10b981' };
      case 'shoulderExternalRotation':
        return { label: 'Shoulder External Rotation', unit: '°', color: '#f59e0b' };
      case 'trunkSeparation':
        return { label: 'Trunk Separation', unit: '°', color: '#ef4444' };
      default:
        return { label: 'Unknown', unit: '', color: '#6b7280' };
    }
  };

  if (!motionData) {
    return <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
        <p className="text-muted-foreground">Loading motion data...</p>
      </div>
    </div>;
  }

  const currentFrameData = motionData.frames[currentFrame];
  const graphData = generateBiomechanicalData(selectedMetric);
  const metricInfo = getMetricInfo(selectedMetric);

  // Calculate max/min for proper graph scaling
  const maxValue = Math.max(...graphData.map(d => d.value));
  const minValue = Math.min(...graphData.map(d => d.value));
  let valueRange = maxValue - minValue;
  
  // Only log debugging info once to avoid spam
  if (currentFrame === 0) {
    console.log(`Metric: ${selectedMetric}`, { maxValue, minValue, valueRange, sampleValues: graphData.slice(0, 5) });
  }
  
  // Fix division by zero when all values are the same
  if (valueRange === 0 || valueRange < 0.001) {
    valueRange = Math.max(Math.abs(maxValue) * 0.1, 1); // 10% of max value or minimum 1
  }
  
  const graphHeight = 140;
  const padding = valueRange * 0.1; // Add 10% padding

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Animated background */}
      <div className="absolute inset-0 bg-gradient-to-br from-background via-background to-primary/5" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,_hsl(var(--primary)/0.1)_0%,_transparent_70%)]" />
      
      {/* Main 3D Viewer - Full Screen */}
      <div className="absolute inset-0">
        <MotionViewer3D
          motionData={motionData}
          currentFrame={currentFrame}
          cameraView={currentView}
        />
      </div>

      {/* Floating Left Panel - Metrics & Graph */}
      <Card className="absolute left-6 top-1/2 -translate-y-1/2 w-80 bg-gradient-glassmorphism backdrop-blur-xl border-card-border shadow-glow float-panel">
        <CardContent className="p-6">
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <Activity className="h-5 w-5 text-primary" />
              <h3 className="font-bold text-foreground">Performance Metrics</h3>
            </div>
            
            <Select value={selectedMetric} onValueChange={setSelectedMetric}>
              <SelectTrigger className="bg-muted/50 border-card-border">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-popover backdrop-blur-xl border-card-border">
                <SelectItem value="pelvisTwistVelocity">Pelvis Twist Velocity</SelectItem>
                <SelectItem value="shoulderTwistVelocity">Shoulder Twist Velocity</SelectItem>
                <SelectItem value="shoulderExternalRotation">Shoulder External Rotation</SelectItem>
                <SelectItem value="trunkSeparation">Trunk Separation</SelectItem>
              </SelectContent>
            </Select>

            {/* Enhanced Graph with Peak Highlighting */}
            <div className="h-48 bg-muted/20 rounded-lg p-4 border border-card-border transition-all duration-500">
              <div className="text-sm text-muted-foreground mb-2 flex justify-between items-center">
                <span>{metricInfo.label}</span>
                <span className="text-xs opacity-60">Peak: {maxValue.toFixed(1)} {metricInfo.unit}</span>
              </div>
              <svg className="w-full h-full" viewBox="0 0 280 140">
                {/* Enhanced Grid and Gradients */}
                <defs>
                  <pattern id="enhancedGrid" width="20" height="20" patternUnits="userSpaceOnUse">
                    <path d="M 20 0 L 0 0 0 20" fill="none" stroke="hsl(var(--border))" strokeWidth="0.5" opacity="0.2"/>
                  </pattern>
                  
                  {/* Gradient for area under curve */}
                  <linearGradient id={`gradient-${selectedMetric}`} x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" style={{stopColor: metricInfo.color, stopOpacity: 0.3}} />
                    <stop offset="100%" style={{stopColor: metricInfo.color, stopOpacity: 0.05}} />
                  </linearGradient>
                  
                  {/* Glow filter for peak highlighting */}
                  <filter id="neonGlow" x="-50%" y="-50%" width="200%" height="200%">
                    <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
                    <feMerge> 
                      <feMergeNode in="coloredBlur"/>
                      <feMergeNode in="SourceGraphic"/>
                    </feMerge>
                  </filter>
                  
                  {/* Pulse animation for peak */}
                  <animate id="peakPulse" attributeName="r" values="4;8;4" dur="2s" repeatCount="indefinite" />
                </defs>
                
                <rect width="100%" height="100%" fill="url(#enhancedGrid)" />
                
                {/* Y-axis tick marks */}
                {[0, 0.25, 0.5, 0.75, 1].map((ratio, i) => {
                  const y = graphHeight * (1 - ratio);
                  const value = minValue + (valueRange * ratio);
                  return (
                    <g key={i}>
                      <line 
                        x1="0" y1={y} x2="5" y2={y} 
                        stroke="hsl(var(--muted-foreground))" 
                        strokeWidth="1" 
                        opacity="0.4"
                      />
                      <text 
                        x="8" y={y + 3} 
                        fill="hsl(var(--muted-foreground))" 
                        fontSize="8"
                        opacity="0.6"
                      >
                        {value.toFixed(0)}
                      </text>
                    </g>
                  );
                })}
                
                {/* Area under curve */}
                <polygon
                  fill={`url(#gradient-${selectedMetric})`}
                  points={`
                    0,${graphHeight} 
                    ${graphData.map((d, i) => {
                      const x = (i / Math.max(graphData.length - 1, 1)) * 280;
                      const adjustedMin = minValue - padding;
                      const adjustedRange = valueRange + (2 * padding);
                      const y = graphHeight - ((d.value - adjustedMin) / adjustedRange) * graphHeight;
                      return `${Math.max(0, Math.min(280, x))},${Math.max(0, Math.min(graphHeight, y))}`;
                    }).join(' ')}
                    280,${graphHeight}
                  `}
                />
                
                {/* Main data line with enhanced styling */}
                <polyline
                  fill="none"
                  stroke={metricInfo.color}
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  filter="url(#softGlow)"
                  className="transition-all duration-300"
                  points={graphData.map((d, i) => {
                    const x = (i / Math.max(graphData.length - 1, 1)) * 280;
                    const adjustedMin = minValue - padding;
                    const adjustedRange = valueRange + (2 * padding);
                    const y = graphHeight - ((d.value - adjustedMin) / adjustedRange) * graphHeight;
                    return `${Math.max(0, Math.min(280, x))},${Math.max(0, Math.min(graphHeight, y))}`;
                  }).join(' ')}
                />
                
                {/* Peak value highlighting */}
                {(() => {
                  const peakIndex = graphData.findIndex(d => d.value === maxValue);
                  if (peakIndex >= 0) {
                    const x = (peakIndex / Math.max(graphData.length - 1, 1)) * 280;
                    const adjustedMin = minValue - padding;
                    const adjustedRange = valueRange + (2 * padding);
                    const y = graphHeight - ((maxValue - adjustedMin) / adjustedRange) * graphHeight;
                    return (
                      <g>
                        {/* Glow ring */}
                        <circle
                          cx={x}
                          cy={y}
                          r="8"
                          fill="none"
                          stroke={metricInfo.color}
                          strokeWidth="2"
                          opacity="0.6"
                          filter="url(#neonGlow)"
                          className="animate-pulse"
                        />
                        {/* Peak marker */}
                        <circle
                          cx={x}
                          cy={y}
                          r="4"
                          fill={metricInfo.color}
                          className="drop-shadow-lg"
                        />
                      </g>
                    );
                  }
                  return null;
                })()}
                
                {/* Current frame indicator with enhanced styling */}
                <line
                  x1={Math.max(0, Math.min(280, (currentFrame / Math.max(motionData.frames.length - 1, 1)) * 280))}
                  y1="0"
                  x2={Math.max(0, Math.min(280, (currentFrame / Math.max(motionData.frames.length - 1, 1)) * 280))}
                  y2={graphHeight}
                  stroke="hsl(var(--destructive))"
                  strokeWidth="2"
                  strokeDasharray="6,3"
                  className="drop-shadow-sm"
                />
                
                {/* Current frame marker */}
                <circle
                  cx={Math.max(0, Math.min(280, (currentFrame / Math.max(motionData.frames.length - 1, 1)) * 280))}
                  cy={(() => {
                    const currentValue = graphData[currentFrame]?.value || 0;
                    const adjustedMin = minValue - padding;
                    const adjustedRange = valueRange + (2 * padding);
                    return graphHeight - ((currentValue - adjustedMin) / adjustedRange) * graphHeight;
                  })()}
                  r="3"
                  fill="hsl(var(--destructive))"
                  className="drop-shadow-md"
                />
              </svg>
              <div className="text-xs text-muted-foreground mt-1 flex justify-between items-center">
                <span>Frame 0</span>
                <span className="font-medium">
                  Current: {graphData[currentFrame]?.value.toFixed(1)} {metricInfo.unit}
                </span>
                <span>Frame {motionData.frames.length - 1}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Floating Right Panel - Motion Phase & Torques */}
      <Card className="absolute right-6 top-1/2 -translate-y-1/2 w-72 bg-gradient-glassmorphism backdrop-blur-xl border-card-border shadow-glow float-panel">
        <CardContent className="p-6">
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <Target className="h-5 w-5 text-secondary" />
              <h3 className="font-bold text-foreground">Motion Analysis</h3>
            </div>
            
            {/* Motion Phase */}
            <div className="space-y-2">
              <div className="text-sm text-muted-foreground">Current Phase</div>
              <div className="text-lg font-bold text-primary capitalize">{motionPhase.replace('-', ' ')}</div>
              <div className="w-full bg-muted/30 rounded-full h-2">
                <div 
                  className="bg-gradient-to-r from-primary to-secondary h-2 rounded-full transition-all duration-300"
                  style={{ width: `${(currentFrame / motionData.frames.length) * 100}%` }}
                />
              </div>
            </div>

            {/* Key Metrics */}
            <div className="space-y-3">
              <div className="flex justify-between items-center p-3 bg-muted/20 rounded-lg border border-card-border">
                <span className="text-sm text-muted-foreground">Pelvis Velocity</span>
                <span className="font-bold text-primary">{currentFrameData?.baseballMetrics.pelvisVelocity.toFixed(1)} m/s</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-muted/20 rounded-lg border border-card-border">
                <span className="text-sm text-muted-foreground">Elbow Torque</span>
                <span className="font-bold text-secondary">{currentFrameData?.baseballMetrics.elbowTorque.toFixed(1)} Nm</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-muted/20 rounded-lg border border-card-border">
                <span className="text-sm text-muted-foreground">Shoulder Torque</span>
                <span className="font-bold text-accent">{currentFrameData?.baseballMetrics.shoulderTorque.toFixed(1)} Nm</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Top Left - Pitch Info */}
      <Card className="absolute top-6 left-6 bg-gradient-glassmorphism backdrop-blur-xl border-card-border shadow-glow float-panel">
        <CardContent className="p-4">
          <div className="flex items-center space-x-4">
            <TrendingUp className="h-5 w-5 text-primary" />
            <div className="text-sm">
              <div className="font-bold text-foreground">Motion Analysis</div>
              <div className="text-muted-foreground">{motionData.frames.length} frames • {motionData.frameRate} Hz</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Bottom Playback Controls */}
      <Card className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-gradient-glassmorphism backdrop-blur-xl border-card-border shadow-glow float-panel">
        <CardContent className="p-4">
          <div className="flex items-center space-x-4">
            <Button
              variant="ghost"
              onClick={() => navigate('/')}
              className="text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            
            <Button onClick={handleReset} variant="ghost" size="sm">
              <RotateCcw className="h-4 w-4" />
            </Button>
            
            <Button onClick={handlePlayPause} variant="default" size="sm">
              {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            </Button>
            
            <div className="flex items-center space-x-2">
              <input
                type="range"
                min="0"
                max={motionData.frames.length - 1}
                value={currentFrame}
                onChange={(e) => handleFrameChange(parseInt(e.target.value))}
                className="w-32 accent-primary"
              />
              <span className="text-sm text-muted-foreground min-w-[60px]">
                {currentFrame}/{motionData.frames.length - 1}
              </span>
            </div>
            
            <Select value={playbackSpeed.toString()} onValueChange={(value) => setPlaybackSpeed(parseFloat(value))}>
              <SelectTrigger className="w-20 h-8 bg-muted/50 border-card-border">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-popover backdrop-blur-xl border-card-border">
                <SelectItem value="0.25">0.25x</SelectItem>
                <SelectItem value="0.5">0.5x</SelectItem>
                <SelectItem value="1">1x</SelectItem>
                <SelectItem value="2">2x</SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={currentView} onValueChange={(value: 'side' | 'catcher' | 'free') => setCurrentView(value)}>
              <SelectTrigger className="w-24 h-8 bg-muted/50 border-card-border">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-popover backdrop-blur-xl border-card-border">
                <SelectItem value="side">Side</SelectItem>
                <SelectItem value="catcher">Catcher</SelectItem>
                <SelectItem value="free">Free</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Visualizer;