export interface JointCenter {
  x: number;
  y: number;
  z: number;
}

export interface JointRotation {
  x: number;
  y: number;
  z: number;
  w: number; // quaternion
}

export interface BaseballMetric {
  pelvisVelocity: number;
  trunkVelocity: number;
  elbowTorque: number;
  shoulderTorque: number;
  pelvisTwistVelocity: number;    // degrees/sec
  shoulderTwistVelocity: number;  // degrees/sec
  shoulderExternalRotation: number; // degrees
  trunkSeparation: number;        // degrees
  timestamp: number;
}

export interface FrameData {
  frameNumber: number;
  jointCenters: { [jointName: string]: JointCenter };
  jointRotations: { [jointName: string]: JointRotation };
  baseballMetrics: BaseballMetric;
}

export interface MotionData {
  frames: FrameData[];
  frameRate: number;
  duration: number;
  jointNames: string[];
}

// Baseball motion capture joint names (indexed system)
export const JOINT_NAMES = [
  'Head',        // 0
  'Neck',        // 1
  'R_Shoulder',  // 2
  'R_Elbow',     // 3
  'R_Wrist',     // 4
  'L_Shoulder',  // 5
  'L_Elbow',     // 6
  'L_Wrist',     // 7
  'Pelvis',      // 8
  'R_Hip',       // 9
  'R_Knee',      // 10
  'R_Ankle',     // 11
  'R_Foot',      // 12
  'L_Hip',       // 13
  'L_Knee',      // 14
  'L_Ankle',     // 15
  'L_Foot'       // 16
];

// Joint connections for skeleton visualization
export const BONE_CONNECTIONS = [
  // Head to Neck
  ['Head', 'Neck'],
  // Neck to Pelvis (spine)
  ['Neck', 'Pelvis'],
  // Right arm: Neck → Right Shoulder → Right Elbow → Right Wrist
  ['Neck', 'R_Shoulder'],
  ['R_Shoulder', 'R_Elbow'],
  ['R_Elbow', 'R_Wrist'],
  // Left arm: Neck → Left Shoulder → Left Elbow → Left Wrist
  ['Neck', 'L_Shoulder'],
  ['L_Shoulder', 'L_Elbow'],
  ['L_Elbow', 'L_Wrist'],
  // Right leg: Pelvis → Right Hip → Right Knee → Right Ankle → Right Foot
  ['Pelvis', 'R_Hip'],
  ['R_Hip', 'R_Knee'],
  ['R_Knee', 'R_Ankle'],
  ['R_Ankle', 'R_Foot'],
  // Left leg: Pelvis → Left Hip → Left Knee → Left Ankle → Left Foot
  ['Pelvis', 'L_Hip'],
  ['L_Hip', 'L_Knee'],
  ['L_Knee', 'L_Ankle'],
  ['L_Ankle', 'L_Foot']
];

// Utility functions for biomechanics calculations
class BiomechanicsCalculator {
  static quaternionToEuler(q: JointRotation): { x: number; y: number; z: number } {
    // Convert quaternion to Euler angles (in radians)
    const { x, y, z, w } = q;
    
    // Roll (x-axis rotation)
    const sinr_cosp = 2 * (w * x + y * z);
    const cosr_cosp = 1 - 2 * (x * x + y * y);
    const roll = Math.atan2(sinr_cosp, cosr_cosp);
    
    // Pitch (y-axis rotation)
    const sinp = 2 * (w * y - z * x);
    const pitch = Math.abs(sinp) >= 1 ? Math.sign(sinp) * Math.PI / 2 : Math.asin(sinp);
    
    // Yaw (z-axis rotation)
    const siny_cosp = 2 * (w * z + x * y);
    const cosy_cosp = 1 - 2 * (y * y + z * z);
    const yaw = Math.atan2(siny_cosp, cosy_cosp);
    
    return { x: roll, y: pitch, z: yaw };
  }
  
  static calculateTwistVelocity(currentRot: JointRotation, prevRot: JointRotation | null, deltaTime: number): number {
    if (!prevRot) return 0;
    
    const currentEuler = this.quaternionToEuler(currentRot);
    const prevEuler = this.quaternionToEuler(prevRot);
    
    // Calculate Y-axis rotation velocity (twist around vertical axis)
    let deltaY = currentEuler.y - prevEuler.y;
    
    // Handle angle wrap-around
    if (deltaY > Math.PI) deltaY -= 2 * Math.PI;
    if (deltaY < -Math.PI) deltaY += 2 * Math.PI;
    
    // Convert to degrees per second
    return (deltaY / deltaTime) * (180 / Math.PI);
  }
  
  static calculateExternalRotation(shoulderRot: JointRotation, trunkRot: JointRotation): number {
    const shoulderEuler = this.quaternionToEuler(shoulderRot);
    const trunkEuler = this.quaternionToEuler(trunkRot);
    
    // External rotation is the difference in Z-axis rotation
    let externalRot = shoulderEuler.z - trunkEuler.z;
    
    // Normalize to 0-360 degrees
    externalRot = externalRot * (180 / Math.PI);
    if (externalRot < 0) externalRot += 360;
    
    return externalRot;
  }
  
  static calculateTrunkSeparation(pelvisRot: JointRotation, neckRot: JointRotation): number {
    const pelvisEuler = this.quaternionToEuler(pelvisRot);
    const neckEuler = this.quaternionToEuler(neckRot);
    
    // Trunk separation is the difference in Y-axis rotation (twist)
    let separation = Math.abs(neckEuler.y - pelvisEuler.y);
    
    // Convert to degrees
    separation = separation * (180 / Math.PI);
    
    return Math.min(separation, 180); // Cap at 180 degrees
  }
}

export class DataParser {
  // Robust CSV parsing helper method
  static parseCSV(content: string): string[][] {
    const lines = content.trim().replace(/\r\n/g, '\n').split('\n');
    return lines.map(line => {
      const cells: string[] = [];
      let current = '';
      let inQuotes = false;
      
      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        const next = line[i + 1];
        
        if (char === '"') {
          if (inQuotes && next === '"') {
            current += '"';
            i++; // skip next quote
          } else {
            inQuotes = !inQuotes;
          }
        } else if ((char === ',' || char === '\t') && !inQuotes) {
          cells.push(current.trim());
          current = '';
        } else {
          current += char;
        }
      }
      cells.push(current.trim());
      return cells;
    });
  }

  // Detect file format and separator
  static detectFormat(content: string): { format: 'csv' | 'space', separator?: string } {
    const firstLine = content.trim().split('\n')[0];
    if (firstLine.includes(',')) {
      return { format: 'csv', separator: ',' };
    } else if (firstLine.includes('\t')) {
      return { format: 'csv', separator: '\t' };
    }
    return { format: 'space' };
  }

  static parseJointCenters(fileContent: string): { [frameNumber: number]: { [jointName: string]: JointCenter } } {
    const result: { [frameNumber: number]: { [jointName: string]: JointCenter } } = {};
    const formatInfo = this.detectFormat(fileContent);
    console.log(`[DataParser] Detected format: ${formatInfo.format} for joint centers`);
    
    let dataRows: (string | number)[][];
    
    if (formatInfo.format === 'csv') {
      const csvData = this.parseCSV(fileContent);
      console.log(`[DataParser] CSV sample row:`, csvData[0]?.slice(0, 10));
      
      // Skip header row if it exists (check if first row contains non-numeric data)
      const hasHeader = csvData[0] && csvData[0].some(cell => 
        cell && isNaN(Number(cell)) && !cell.match(/^-?\d*\.?\d+([eE][+-]?\d+)?$/)
      );
      
      const dataStartIndex = hasHeader ? 1 : 0;
      console.log(`[DataParser] Header detected: ${hasHeader}, starting from row ${dataStartIndex}`);
      
      dataRows = csvData.slice(dataStartIndex).map(row => 
        row.map(cell => {
          const num = Number(cell);
          return isNaN(num) ? cell : num;
        })
      );
    } else {
      const lines = fileContent.trim().split('\n');
      const dataLines = lines.filter(line => line.trim() && !line.startsWith('Frame'));
      dataRows = dataLines.map(line => 
        line.trim().split(/\s+/).map(cell => {
          const num = Number(cell);
          return isNaN(num) ? cell : num;
        })
      );
    }
    
    console.log(`[DataParser] Processing ${dataRows.length} joint center frames`);
    
    dataRows.forEach((row, index) => {
      // Filter and convert to numbers, handling both string and number inputs
      const values = row.map(val => typeof val === 'number' ? val : Number(val))
                       .filter(v => !isNaN(v) && isFinite(v));
      
      if (values.length === 0) {
        console.warn(`[DataParser] No valid numeric data in row ${index}:`, row.slice(0, 5));
        return;
      }
      
      // Flexible parsing: handle different data layouts
      const expectedColumns = JOINT_NAMES.length * 12; // 12 values per joint
      const minColumns = JOINT_NAMES.length * 3;       // 3 values per joint (X,Y,Z only)
      
      console.log(`[DataParser] Row ${index}: ${values.length} numeric values from ${row.length} total cells`);
        
      if (values.length >= minColumns) {
        const frameNumber = index;
        result[frameNumber] = {};
        
        const columnsPerJoint = Math.floor(values.length / JOINT_NAMES.length);
        
        JOINT_NAMES.forEach((jointName, jointIndex) => {
          const startIndex = jointIndex * columnsPerJoint;
          let x = values[startIndex] || 0;
          let y = values[startIndex + 1] || 0;
          let z = values[startIndex + 2] || 0;
          
          // Validate coordinates are finite numbers
          if (!isFinite(x) || !isFinite(y) || !isFinite(z)) {
            console.warn(`[DataParser] Invalid coordinates for ${jointName} at frame ${index}:`, { x, y, z });
            x = y = z = 0;
          }
          
          // Smart scale detection and normalization
          const maxCoord = Math.max(Math.abs(x), Math.abs(y), Math.abs(z));
          let scaleFactor = 1;
          
          if (maxCoord > 1000) {
            scaleFactor = 0.001; // millimeters to meters
          } else if (maxCoord > 10) {
            scaleFactor = 0.01; // centimeters to meters  
          } else if (maxCoord < 0.001) {
            scaleFactor = 1000; // kilometers to meters (unlikely but safe)
          }
          
          x *= scaleFactor;
          y *= scaleFactor; 
          z *= scaleFactor;
          
          // Store with coordinate system conversion
          result[frameNumber][jointName] = {
            x: x,    // Keep X as horizontal (left-right)
            y: z,    // Z becomes vertical (up-down)
            z: y     // Y becomes depth (forward-back)
          };
        });
      } else {
        console.warn(`[DataParser] Insufficient data in row ${index}: ${values.length} values (expected >= ${minColumns})`);
      }
    });
    
    // Debug sample data
    if (Object.keys(result).length > 0) {
      const firstFrame = result[0];
      const sampleJoint = Object.keys(firstFrame)[0];
      console.log(`[DataParser] Sample joint centers (frame 0, ${sampleJoint}):`, firstFrame[sampleJoint]);
      console.log(`[DataParser] Total joint center frames processed: ${Object.keys(result).length}`);
    }
    
    return result;
  }

  static parseJointRotations(fileContent: string): { [frameNumber: number]: { [jointName: string]: JointRotation } } {
    const result: { [frameNumber: number]: { [jointName: string]: JointRotation } } = {};
    const formatInfo = this.detectFormat(fileContent);
    console.log(`[DataParser] Detected format: ${formatInfo.format} for joint rotations`);
    
    let dataRows: (string | number)[][];
    
    if (formatInfo.format === 'csv') {
      const csvData = this.parseCSV(fileContent);
      const hasHeader = csvData[0] && csvData[0].some(cell => isNaN(Number(cell)));
      dataRows = hasHeader ? csvData.slice(1) : csvData;
      dataRows = dataRows.map(row => 
        row.map(cell => {
          const num = Number(cell);
          return isNaN(num) ? cell : num;
        })
      );
    } else {
      const lines = fileContent.trim().split('\n');
      const dataLines = lines.filter(line => line.trim() && !line.startsWith('Frame'));
      dataRows = dataLines.map(line => 
        line.trim().split(/\s+/).map(cell => {
          const num = Number(cell);
          return isNaN(num) ? cell : num;
        })
      );
    }
    
    console.log(`[DataParser] Processing ${dataRows.length} rotation frames`);
    
    dataRows.forEach((row, index) => {
      const values = row.map(val => typeof val === 'number' ? val : Number(val))
                       .filter(v => !isNaN(v) && isFinite(v));
      
      if (values.length >= JOINT_NAMES.length * 4) {
        const frameNumber = index;
        result[frameNumber] = {};
        
        JOINT_NAMES.forEach((jointName, jointIndex) => {
          const startIndex = jointIndex * 4;
          const quat = {
            x: values[startIndex] || 0,
            y: values[startIndex + 1] || 0,
            z: values[startIndex + 2] || 0,
            w: values[startIndex + 3] || 1
          };
          
          // Validate quaternion magnitude
          const magnitude = Math.sqrt(quat.x * quat.x + quat.y * quat.y + quat.z * quat.z + quat.w * quat.w);
          if (magnitude < 0.1) {
            quat.x = 0; quat.y = 0; quat.z = 0; quat.w = 1;
          } else if (Math.abs(magnitude - 1.0) > 0.1) {
            quat.x /= magnitude; quat.y /= magnitude; quat.z /= magnitude; quat.w /= magnitude;
          }
          
          result[frameNumber][jointName] = quat;
        });
      } else {
        console.warn(`[DataParser] Insufficient rotation data in row ${index}: ${values.length} values (expected >= ${JOINT_NAMES.length * 4})`);
      }
    });
    
    // Debug sample data
    if (Object.keys(result).length > 0) {
      const firstFrame = result[0];
      console.log('[DataParser] Sample joint rotations (frame 0):', {
        Pelvis: firstFrame?.['Pelvis'],
        R_Shoulder: firstFrame?.['R_Shoulder'],
        Neck: firstFrame?.['Neck']
      });
      console.log(`[DataParser] Total rotation frames processed: ${Object.keys(result).length}`);
    }
    
    return result;
  }

  static parseBaseballMetrics(fileContent: string): { [frameNumber: number]: BaseballMetric } {
    const lines = fileContent.trim().split('\n');
    const result: { [frameNumber: number]: BaseballMetric } = {};
    
    const dataLines = lines.filter(line => line.trim() && !line.startsWith('Frame'));
    
    dataLines.forEach((line, index) => {
      const values = line.trim().split(/\s+/).map(Number);
      if (values.length >= 4) {
        result[index] = {
          pelvisVelocity: values[0] || 0,
          trunkVelocity: values[1] || 0,
          elbowTorque: values[2] || 0,
          shoulderTorque: values[3] || 0,
          pelvisTwistVelocity: 0,
          shoulderTwistVelocity: 0,
          shoulderExternalRotation: 0,
          trunkSeparation: 0,
          timestamp: index / 300 // 300 Hz
        };
      }
    });
    
    return result;
  }

  static calculateBiomechanics(
    jointRotations: { [frameNumber: number]: { [jointName: string]: JointRotation } }
  ): { [frameNumber: number]: BaseballMetric } {
    const frameNumbers = Object.keys(jointRotations).map(Number).sort((a, b) => a - b);
    const result: { [frameNumber: number]: BaseballMetric } = {};
    const deltaTime = 1 / 300; // 300 Hz sampling rate
    
    console.log(`[BiomechanicsCalculator] Processing ${frameNumbers.length} frames`);
    
    let validCalculations = 0;
    let totalCalculations = 0;
    
    frameNumbers.forEach((frameNumber, index) => {
      const currentRotations = jointRotations[frameNumber];
      const prevRotations = index > 0 ? jointRotations[frameNumbers[index - 1]] : null;
      
      if (currentRotations) {
        const pelvisRot = currentRotations['Pelvis'];
        const neckRot = currentRotations['Neck'];
        const shoulderRot = currentRotations['R_Shoulder']; // Right shoulder for throwing
        
        // Validate joint data exists
        const hasValidData = pelvisRot && neckRot && shoulderRot;
        if (!hasValidData && frameNumber === 0) {
          console.warn('[BiomechanicsCalculator] Missing joint data:', {
            pelvis: !!pelvisRot,
            neck: !!neckRot,
            shoulder: !!shoulderRot
          });
        }
        
        // Calculate biomechanics metrics
        const pelvisTwistVel = pelvisRot && prevRotations?.['Pelvis'] 
          ? BiomechanicsCalculator.calculateTwistVelocity(pelvisRot, prevRotations['Pelvis'], deltaTime)
          : 0;
          
        const shoulderTwistVel = shoulderRot && prevRotations?.['R_Shoulder']
          ? BiomechanicsCalculator.calculateTwistVelocity(shoulderRot, prevRotations['R_Shoulder'], deltaTime)
          : 0;
          
        const shoulderExtRot = shoulderRot && neckRot
          ? BiomechanicsCalculator.calculateExternalRotation(shoulderRot, neckRot)
          : 0;
          
        const trunkSep = pelvisRot && neckRot
          ? BiomechanicsCalculator.calculateTrunkSeparation(pelvisRot, neckRot)
          : 0;
        
        // Track calculation validity
        totalCalculations++;
        if (Math.abs(pelvisTwistVel) > 0.1 || Math.abs(shoulderTwistVel) > 0.1 || 
            Math.abs(shoulderExtRot) > 0.1 || Math.abs(trunkSep) > 0.1) {
          validCalculations++;
        }
        
        result[frameNumber] = {
          pelvisVelocity: Math.abs(pelvisTwistVel) * 0.5, // Scale for legacy compatibility
          trunkVelocity: Math.abs(shoulderTwistVel) * 0.3,
          elbowTorque: Math.abs(shoulderExtRot) * 0.1,
          shoulderTorque: trunkSep * 0.05,
          pelvisTwistVelocity: pelvisTwistVel,
          shoulderTwistVelocity: shoulderTwistVel,
          shoulderExternalRotation: shoulderExtRot,
          trunkSeparation: trunkSep,
          timestamp: frameNumber / 300
        };
        
        // Debug sample calculations
        if (frameNumber === Math.floor(frameNumbers.length / 2)) {
          console.log(`[BiomechanicsCalculator] Mid-sequence sample (frame ${frameNumber}):`, {
            pelvisTwistVel: pelvisTwistVel.toFixed(2),
            shoulderTwistVel: shoulderTwistVel.toFixed(2),
            shoulderExtRot: shoulderExtRot.toFixed(2),
            trunkSep: trunkSep.toFixed(2)
          });
        }
      }
    });
    
    console.log(`[BiomechanicsCalculator] Calculation summary: ${validCalculations}/${totalCalculations} frames have non-zero values`);
    
    return result;
  }

  static combineData(
    jointCenters: { [frameNumber: number]: { [jointName: string]: JointCenter } },
    jointRotations: { [frameNumber: number]: { [jointName: string]: JointRotation } },
    baseballMetrics?: { [frameNumber: number]: BaseballMetric }
  ): MotionData {
    const frameNumbers = Object.keys(jointCenters).map(Number).sort((a, b) => a - b);
    const frames: FrameData[] = [];
    
    // Calculate biomechanics from joint rotations if no metrics provided
    const calculatedMetrics = baseballMetrics || this.calculateBiomechanics(jointRotations);
    
    frameNumbers.forEach(frameNumber => {
      frames.push({
        frameNumber,
        jointCenters: jointCenters[frameNumber] || {},
        jointRotations: jointRotations[frameNumber] || {},
        baseballMetrics: calculatedMetrics[frameNumber] || {
          pelvisVelocity: 0,
          trunkVelocity: 0,
          elbowTorque: 0,
          shoulderTorque: 0,
          pelvisTwistVelocity: 0,
          shoulderTwistVelocity: 0,
          shoulderExternalRotation: 0,
          trunkSeparation: 0,
          timestamp: frameNumber / 300
        }
      });
    });
    
    return {
      frames,
      frameRate: 300,
      duration: frames.length / 300,
      jointNames: JOINT_NAMES
    };
  }
}