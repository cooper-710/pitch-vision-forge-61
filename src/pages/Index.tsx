import React from 'react';
import { useNavigate } from 'react-router-dom';
import { FileUpload } from '@/components/FileUpload';
import { DataParser } from '@/utils/dataParser';
import { Card, CardContent } from '@/components/ui/card';
import { Database } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const Index = () => {
  const navigate = useNavigate();
  const { toast } = useToast();


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

      toast({
        title: "Data Loaded Successfully",
        description: `${combinedData.frames.length} frames loaded at ${combinedData.frameRate} Hz`,
      });

      // Navigate to visualizer with motion data
      navigate('/visualizer', { state: { motionData: combinedData } });
    } catch (error) {
      toast({
        title: "Error Loading Data",
        description: "Please check your file formats and try again.",
        variant: "destructive",
      });
      console.error('Error parsing motion data:', error);
    }
  };

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
};

export default Index;
