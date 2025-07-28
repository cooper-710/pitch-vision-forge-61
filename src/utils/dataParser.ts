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

// Standard baseball motion capture joint names
export const JOINT_NAMES = [
  'Pelvis', 'L_Hip', 'R_Hip', 'Spine1', 'L_Knee', 'R_Knee', 'Spine2',
  'L_Ankle', 'R_Ankle', 'Spine3', 'L_Foot', 'R_Foot', 'Neck', 'L_Collar',
  'R_Collar', 'Head', 'L_Shoulder', 'R_Shoulder', 'L_Elbow', 'R_Elbow',
  'L_Wrist', 'R_Wrist', 'L_Hand', 'R_Hand'
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
    
    dataLines.forEach((line, index) => {
      const values = line.trim().split(/\s+/).map(Number);
      if (values.length >= JOINT_NAMES.length * 4) {
        const frameNumber = index;
        result[frameNumber] = {};
        
        JOINT_NAMES.forEach((jointName, jointIndex) => {
          const startIndex = jointIndex * 4;
          result[frameNumber][jointName] = {
            x: values[startIndex] || 0,
            y: values[startIndex + 1] || 0,
            z: values[startIndex + 2] || 0,
            w: values[startIndex + 3] || 1
          };
        });
      }
    });
    
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
          timestamp: index / 300 // 300 Hz
        };
      }
    });
    
    return result;
  }

  static combineData(
    jointCenters: { [frameNumber: number]: { [jointName: string]: JointCenter } },
    jointRotations: { [frameNumber: number]: { [jointName: string]: JointRotation } },
    baseballMetrics: { [frameNumber: number]: BaseballMetric }
  ): MotionData {
    const frameNumbers = Object.keys(jointCenters).map(Number).sort((a, b) => a - b);
    const frames: FrameData[] = [];
    
    frameNumbers.forEach(frameNumber => {
      frames.push({
        frameNumber,
        jointCenters: jointCenters[frameNumber] || {},
        jointRotations: jointRotations[frameNumber] || {},
        baseballMetrics: baseballMetrics[frameNumber] || {
          pelvisVelocity: 0,
          trunkVelocity: 0,
          elbowTorque: 0,
          shoulderTorque: 0,
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