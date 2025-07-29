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
  static parseJointCenters(fileContent: string): { [frameNumber: number]: { [jointName: string]: JointCenter } } {
    const lines = fileContent.trim().split('\n');
    const result: { [frameNumber: number]: { [jointName: string]: JointCenter } } = {};
    
    // Skip header if present
    const dataLines = lines.filter(line => line.trim() && !line.startsWith('Frame'));
    
    dataLines.forEach((line, index) => {
      const values = line.trim().split(/\s+/).map(Number);
      // Expect 12 values per joint (X, Y, Z, Length, velocity components, acceleration components)
      if (values.length >= JOINT_NAMES.length * 12) {
        const frameNumber = index;
        result[frameNumber] = {};
        
        JOINT_NAMES.forEach((jointName, jointIndex) => {
          // Take only first 3 values (X, Y, Z) and ignore the rest
          const startIndex = jointIndex * 12;
          let x = values[startIndex] || 0;
          let y = values[startIndex + 1] || 0;
          let z = values[startIndex + 2] || 0;
          
          // Scale normalization: if values > 10, assume millimeters and convert to meters
          const maxCoord = Math.max(Math.abs(x), Math.abs(y), Math.abs(z));
          if (maxCoord > 10) {
            x /= 1000;
            y /= 1000;
            z /= 1000;
          }
          
          // Axis reorientation for baseball mocap:
          // File Z -> Display Y (vertical)
          // File Y -> Display Z (forward)
          // File X -> Display X (horizontal)
          result[frameNumber][jointName] = {
            x: x,           // Keep X as horizontal
            y: z,           // Z becomes vertical (up/down)
            z: y            // Y becomes forward (toward home plate)
          };
        });
      }
    });
    
    return result;
  }

  static parseJointRotations(fileContent: string): { [frameNumber: number]: { [jointName: string]: JointRotation } } {
    const lines = fileContent.trim().split('\n');
    const result: { [frameNumber: number]: { [jointName: string]: JointRotation } } = {};
    
    const dataLines = lines.filter(line => line.trim() && !line.startsWith('Frame'));
    console.log(`[DataParser] Parsing ${dataLines.length} rotation frames`);
    
    dataLines.forEach((line, index) => {
      const values = line.trim().split(/\s+/).map(Number);
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
            // Invalid quaternion, use identity
            quat.x = 0; quat.y = 0; quat.z = 0; quat.w = 1;
          } else if (Math.abs(magnitude - 1.0) > 0.1) {
            // Normalize quaternion
            quat.x /= magnitude; quat.y /= magnitude; quat.z /= magnitude; quat.w /= magnitude;
          }
          
          result[frameNumber][jointName] = quat;
        });
      }
    });
    
    // Debug first frame rotation data
    if (Object.keys(result).length > 0) {
      const firstFrame = result[0];
      console.log('[DataParser] Sample joint rotations (frame 0):', {
        Pelvis: firstFrame?.['Pelvis'],
        R_Shoulder: firstFrame?.['R_Shoulder'],
        Neck: firstFrame?.['Neck']
      });
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