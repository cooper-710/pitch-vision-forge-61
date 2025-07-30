import React, { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Upload, File, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FileUploadProps {
  onFilesLoaded: (files: {
    jointCenters: string;
    jointRotations: string;
    baseballMetrics: string;
  }) => void;
}

interface UploadedFile {
  name: string;
  content: string;
  type: 'jointCenters' | 'jointRotations' | 'baseballMetrics';
}

export function FileUpload({ onFilesLoaded }: FileUploadProps) {
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const getFileType = (filename: string): 'jointCenters' | 'jointRotations' | 'baseballMetrics' | null => {
    const lower = filename.toLowerCase();
    if (lower.includes('jointcenter')) return 'jointCenters';
    if (lower.includes('jointrotation')) return 'jointRotations';
    if (lower.includes('baseballspecific') || lower.includes('baseball')) return 'baseballMetrics';
    return null;
  };

  const handleFiles = async (files: FileList) => {
    const newFiles: UploadedFile[] = [];
    
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const fileType = getFileType(file.name);
      
      if (fileType && (file.name.endsWith('.txt') || file.name.endsWith('.csv'))) {
        const content = await file.text();
        newFiles.push({
          name: file.name,
          content,
          type: fileType
        });
        console.log(`[FileUpload] Loaded ${fileType} file: ${file.name} (${content.length} characters)`);
      }
    }
    
    setUploadedFiles(prev => {
      const updated = [...prev];
      newFiles.forEach(newFile => {
        const existingIndex = updated.findIndex(f => f.type === newFile.type);
        if (existingIndex >= 0) {
          updated[existingIndex] = newFile;
        } else {
          updated.push(newFile);
        }
      });
      return updated;
    });
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFiles(e.dataTransfer.files);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      handleFiles(e.target.files);
    }
  };

  const onButtonClick = () => {
    inputRef.current?.click();
  };

  const canProcess = uploadedFiles.length === 3 && 
    ['jointCenters', 'jointRotations', 'baseballMetrics'].every(type => 
      uploadedFiles.some(f => f.type === type)
    );

  const processFiles = () => {
    if (!canProcess) return;
    
    const fileMap = uploadedFiles.reduce((acc, file) => {
      acc[file.type] = file.content;
      return acc;
    }, {} as { [key: string]: string });

    onFilesLoaded({
      jointCenters: fileMap.jointCenters,
      jointRotations: fileMap.jointRotations,
      baseballMetrics: fileMap.baseballMetrics
    });
  };

  const getFileStatus = (type: string) => {
    return uploadedFiles.find(f => f.type === type);
  };

  return (
    <div className="w-full max-w-2xl mx-auto p-6">
      <Card className="bg-gradient-glassmorphism border-card-border backdrop-blur-xl">
        <CardContent className="p-8">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold bg-gradient-tech bg-clip-text text-transparent mb-2">
              Motion Capture Data Upload
            </h2>
            <p className="text-muted-foreground">
              Upload three files (.txt or .csv) to begin 3D analysis
            </p>
          </div>

          <div
            className={cn(
              "relative border-2 border-dashed rounded-lg p-8 text-center transition-all duration-300",
              dragActive 
                ? "border-primary bg-primary/5 shadow-glow" 
                : "border-border hover:border-primary/50",
              "cursor-pointer group"
            )}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            onClick={onButtonClick}
          >
            <input
              ref={inputRef}
              type="file"
              multiple
              accept=".txt,.csv"
              onChange={handleChange}
              className="hidden"
            />
            
            <Upload className="mx-auto h-12 w-12 text-muted-foreground group-hover:text-primary transition-colors" />
            <p className="mt-4 text-lg font-medium">
              Drop your motion capture files here
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              or click to browse files
            </p>
            <p className="text-xs text-muted-foreground mt-2">
              .txt or .csv files
            </p>
          </div>

          <div className="mt-6 space-y-3">
            {['jointCenters', 'jointRotations', 'baseballMetrics'].map((type) => {
              const file = getFileStatus(type);
              const typeNames = {
                jointCenters: 'Joint Centers Data',
                jointRotations: 'Joint Rotations Data',
                baseballMetrics: 'Baseball Metrics Data'
              };
              
              return (
                <div
                  key={type}
                  className={cn(
                    "flex items-center justify-between p-3 rounded-lg border transition-all",
                    file 
                      ? "border-primary/50 bg-primary/5" 
                      : "border-border bg-muted/20"
                  )}
                >
                  <div className="flex items-center space-x-3">
                    {file ? (
                      <Check className="h-5 w-5 text-primary" />
                    ) : (
                      <File className="h-5 w-5 text-muted-foreground" />
                    )}
                    <div>
                      <p className="font-medium">{typeNames[type as keyof typeof typeNames]}</p>
                      {file && (
                        <p className="text-sm text-muted-foreground">{file.name}</p>
                      )}
                    </div>
                  </div>
                  {file && (
                    <div className="h-2 w-2 rounded-full bg-primary animate-pulse-glow" />
                  )}
                </div>
              );
            })}
          </div>

          {canProcess && (
            <Button
              onClick={processFiles}
              className="w-full mt-6 bg-gradient-tech hover:shadow-glow transition-all duration-300"
              size="lg"
            >
              Begin 3D Analysis
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}