import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { FrameData } from '@/utils/dataParser';
import { Activity, Zap, Target, Timer } from 'lucide-react';

interface MetricsDashboardProps {
  frameData: FrameData;
  motionPhase: 'windup' | 'stride' | 'acceleration' | 'release' | 'follow-through';
}

export function MetricsDashboard({ frameData, motionPhase }: MetricsDashboardProps) {
  const metrics = frameData.baseballMetrics;
  
  const getPhaseColor = (phase: string) => {
    switch (phase) {
      case 'windup': return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      case 'stride': return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'acceleration': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      case 'release': return 'bg-red-500/20 text-red-400 border-red-500/30';
      case 'follow-through': return 'bg-purple-500/20 text-purple-400 border-purple-500/30';
      default: return 'bg-muted/20 text-muted-foreground border-muted/30';
    }
  };

  const formatMetricValue = (value: number, unit: string) => {
    return `${value.toFixed(1)} ${unit}`;
  };

  const getMetricStatus = (value: number, thresholds: { low: number; high: number }) => {
    if (value < thresholds.low) return 'low';
    if (value > thresholds.high) return 'high';
    return 'normal';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'low': return 'text-blue-400';
      case 'high': return 'text-red-400';
      case 'normal': return 'text-green-400';
      default: return 'text-muted-foreground';
    }
  };

  return (
    <div className="space-y-4">
      {/* Motion Phase */}
      <Card className="bg-gradient-glassmorphism border-card-border backdrop-blur-xl">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center space-x-2">
            <Timer className="h-5 w-5 text-primary" />
            <span>Motion Phase</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Badge className={`${getPhaseColor(motionPhase)} text-lg px-4 py-2 font-bold animate-pulse-glow`}>
            {motionPhase.toUpperCase()}
          </Badge>
          <div className="mt-3 text-sm text-muted-foreground">
            Frame: {frameData.frameNumber + 1} | Time: {metrics.timestamp.toFixed(3)}s
          </div>
        </CardContent>
      </Card>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Velocity Metrics */}
        <Card className="bg-gradient-glassmorphism border-card-border backdrop-blur-xl">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center space-x-2">
              <Activity className="h-4 w-4 text-primary" />
              <span>Velocity Analysis</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Pelvis Velocity</span>
              <span className={`font-mono font-bold ${getStatusColor(getMetricStatus(metrics.pelvisVelocity, { low: 2, high: 8 }))}`}>
                {formatMetricValue(metrics.pelvisVelocity, 'm/s')}
              </span>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Trunk Velocity</span>
              <span className={`font-mono font-bold ${getStatusColor(getMetricStatus(metrics.trunkVelocity, { low: 3, high: 12 }))}`}>
                {formatMetricValue(metrics.trunkVelocity, 'm/s')}
              </span>
            </div>
            
            {/* Visual velocity indicators */}
            <div className="grid grid-cols-2 gap-2 mt-4">
              <div className="text-center">
                <div className="text-xs text-muted-foreground mb-1">Pelvis</div>
                <div 
                  className="h-2 bg-gradient-to-r from-primary/20 to-primary rounded-full"
                  style={{ width: `${Math.min(100, (metrics.pelvisVelocity / 10) * 100)}%` }}
                />
              </div>
              <div className="text-center">
                <div className="text-xs text-muted-foreground mb-1">Trunk</div>
                <div 
                  className="h-2 bg-gradient-to-r from-secondary/20 to-secondary rounded-full"
                  style={{ width: `${Math.min(100, (metrics.trunkVelocity / 15) * 100)}%` }}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Torque Metrics */}
        <Card className="bg-gradient-glassmorphism border-card-border backdrop-blur-xl">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center space-x-2">
              <Zap className="h-4 w-4 text-accent" />
              <span>Torque Analysis</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Elbow Torque</span>
              <span className={`font-mono font-bold ${getStatusColor(getMetricStatus(metrics.elbowTorque, { low: 20, high: 120 }))}`}>
                {formatMetricValue(metrics.elbowTorque, 'Nm')}
              </span>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Shoulder Torque</span>
              <span className={`font-mono font-bold ${getStatusColor(getMetricStatus(metrics.shoulderTorque, { low: 30, high: 150 }))}`}>
                {formatMetricValue(metrics.shoulderTorque, 'Nm')}
              </span>
            </div>
            
            {/* Visual torque indicators */}
            <div className="grid grid-cols-2 gap-2 mt-4">
              <div className="text-center">
                <div className="text-xs text-muted-foreground mb-1">Elbow</div>
                <div 
                  className="h-2 bg-gradient-to-r from-accent/20 to-accent rounded-full"
                  style={{ width: `${Math.min(100, (metrics.elbowTorque / 150) * 100)}%` }}
                />
              </div>
              <div className="text-center">
                <div className="text-xs text-muted-foreground mb-1">Shoulder</div>
                <div 
                  className="h-2 bg-gradient-to-r from-destructive/20 to-destructive rounded-full"
                  style={{ width: `${Math.min(100, (metrics.shoulderTorque / 200) * 100)}%` }}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Performance Summary */}
      <Card className="bg-gradient-glassmorphism border-card-border backdrop-blur-xl">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center space-x-2">
            <Target className="h-4 w-4 text-primary" />
            <span>Performance Summary</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 text-center">
            <div className="space-y-1">
              <div className="text-2xl font-bold text-primary">
                {((metrics.pelvisVelocity + metrics.trunkVelocity) / 2).toFixed(1)}
              </div>
              <div className="text-xs text-muted-foreground">Avg Velocity</div>
            </div>
            <div className="space-y-1">
              <div className="text-2xl font-bold text-accent">
                {((metrics.elbowTorque + metrics.shoulderTorque) / 2).toFixed(0)}
              </div>
              <div className="text-xs text-muted-foreground">Avg Torque</div>
            </div>
            <div className="space-y-1">
              <div className="text-2xl font-bold text-secondary">
                {(metrics.trunkVelocity / metrics.pelvisVelocity).toFixed(2)}
              </div>
              <div className="text-xs text-muted-foreground">Velocity Ratio</div>
            </div>
            <div className="space-y-1">
              <div className="text-2xl font-bold text-foreground">
                {Math.max(metrics.elbowTorque, metrics.shoulderTorque).toFixed(0)}
              </div>
              <div className="text-xs text-muted-foreground">Peak Torque</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}