import React, { useRef, useEffect, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { FrameData } from '@/utils/dataParser';

interface SkeletonModelProps {
  frameData: FrameData;
  visible?: boolean;
}

// Standard bone mapping for human skeleton hierarchy
const BONE_MAPPING = {
  // Core skeleton
  'Hips': 'Pelvis',
  'Spine': 'Spine',
  'Spine1': 'Chest', 
  'Spine2': 'Chest',
  'Neck': 'Neck',
  'Head': 'Head',
  
  // Left arm
  'LeftShoulder': 'L_Shoulder',
  'LeftArm': 'L_Shoulder',
  'LeftForeArm': 'L_Elbow',
  'LeftHand': 'L_Wrist',
  
  // Right arm (throwing arm)
  'RightShoulder': 'R_Shoulder', 
  'RightArm': 'R_Shoulder',
  'RightForeArm': 'R_Elbow',
  'RightHand': 'R_Wrist',
  
  // Left leg
  'LeftUpLeg': 'L_Hip',
  'LeftLeg': 'L_Knee', 
  'LeftFoot': 'L_Ankle',
  'LeftToeBase': 'L_Foot',
  
  // Right leg
  'RightUpLeg': 'R_Hip',
  'RightLeg': 'R_Knee',
  'RightFoot': 'R_Ankle', 
  'RightToeBase': 'R_Foot'
};

// Create a procedural skeleton mesh
function createProceduralSkeleton() {
  const group = new THREE.Group();
  
  // Bone material
  const boneMaterial = new THREE.MeshLambertMaterial({ 
    color: '#f8f8f8',
    transparent: true,
    opacity: 0.9
  });
  
  const jointMaterial = new THREE.MeshLambertMaterial({
    color: '#e0e0e0',
    transparent: true,
    opacity: 0.95
  });

  // Helper function to create bone geometry
  const createBone = (length: number, radius: number = 0.015) => {
    const geometry = new THREE.CapsuleGeometry(radius, length, 8, 16);
    return new THREE.Mesh(geometry, boneMaterial);
  };

  const createJoint = (radius: number = 0.025) => {
    const geometry = new THREE.SphereGeometry(radius, 12, 8);
    return new THREE.Mesh(geometry, jointMaterial);
  };

  // Create bone hierarchy
  const bones: { [key: string]: THREE.Object3D } = {};
  
  // Root - Hips/Pelvis
  bones['Hips'] = createJoint(0.035);
  bones['Hips'].name = 'Hips';
  group.add(bones['Hips']);
  
  // Spine
  bones['Spine'] = createBone(0.15, 0.02);
  bones['Spine'].name = 'Spine';
  bones['Spine'].position.set(0, 0.075, 0);
  bones['Hips'].add(bones['Spine']);
  
  bones['Spine1'] = createBone(0.12, 0.018);
  bones['Spine1'].name = 'Spine1';
  bones['Spine1'].position.set(0, 0.06, 0);
  bones['Spine'].add(bones['Spine1']);
  
  bones['Spine2'] = createBone(0.1, 0.016);
  bones['Spine2'].name = 'Spine2';
  bones['Spine2'].position.set(0, 0.05, 0);
  bones['Spine1'].add(bones['Spine2']);
  
  // Neck and Head
  bones['Neck'] = createBone(0.08, 0.012);
  bones['Neck'].name = 'Neck';
  bones['Neck'].position.set(0, 0.04, 0);
  bones['Spine2'].add(bones['Neck']);
  
  bones['Head'] = createJoint(0.045);
  bones['Head'].name = 'Head';
  bones['Head'].position.set(0, 0.08, 0);
  bones['Neck'].add(bones['Head']);
  
  // Left Arm
  bones['LeftShoulder'] = createJoint(0.03);
  bones['LeftShoulder'].name = 'LeftShoulder';
  bones['LeftShoulder'].position.set(0.15, 0, 0);
  bones['Spine2'].add(bones['LeftShoulder']);
  
  bones['LeftArm'] = createBone(0.25, 0.02);
  bones['LeftArm'].name = 'LeftArm';
  bones['LeftArm'].position.set(0.125, 0, 0);
  bones['LeftArm'].rotation.z = Math.PI / 2;
  bones['LeftShoulder'].add(bones['LeftArm']);
  
  bones['LeftForeArm'] = createBone(0.22, 0.018);
  bones['LeftForeArm'].name = 'LeftForeArm';
  bones['LeftForeArm'].position.set(0.11, 0, 0);
  bones['LeftArm'].add(bones['LeftForeArm']);
  
  bones['LeftHand'] = createJoint(0.025);
  bones['LeftHand'].name = 'LeftHand';
  bones['LeftHand'].position.set(0.11, 0, 0);
  bones['LeftForeArm'].add(bones['LeftHand']);
  
  // Right Arm (mirror of left)
  bones['RightShoulder'] = createJoint(0.03);
  bones['RightShoulder'].name = 'RightShoulder';
  bones['RightShoulder'].position.set(-0.15, 0, 0);
  bones['Spine2'].add(bones['RightShoulder']);
  
  bones['RightArm'] = createBone(0.25, 0.02);
  bones['RightArm'].name = 'RightArm';
  bones['RightArm'].position.set(-0.125, 0, 0);
  bones['RightArm'].rotation.z = -Math.PI / 2;
  bones['RightShoulder'].add(bones['RightArm']);
  
  bones['RightForeArm'] = createBone(0.22, 0.018);
  bones['RightForeArm'].name = 'RightForeArm';
  bones['RightForeArm'].position.set(-0.11, 0, 0);
  bones['RightArm'].add(bones['RightForeArm']);
  
  bones['RightHand'] = createJoint(0.025);
  bones['RightHand'].name = 'RightHand';
  bones['RightHand'].position.set(-0.11, 0, 0);
  bones['RightForeArm'].add(bones['RightHand']);
  
  // Left Leg
  bones['LeftUpLeg'] = createBone(0.35, 0.025);
  bones['LeftUpLeg'].name = 'LeftUpLeg';
  bones['LeftUpLeg'].position.set(0.08, -0.175, 0);
  bones['LeftUpLeg'].rotation.z = Math.PI;
  bones['Hips'].add(bones['LeftUpLeg']);
  
  bones['LeftLeg'] = createBone(0.32, 0.022);
  bones['LeftLeg'].name = 'LeftLeg';
  bones['LeftLeg'].position.set(0, -0.16, 0);
  bones['LeftUpLeg'].add(bones['LeftLeg']);
  
  bones['LeftFoot'] = createJoint(0.025);
  bones['LeftFoot'].name = 'LeftFoot';
  bones['LeftFoot'].position.set(0, -0.16, 0);
  bones['LeftLeg'].add(bones['LeftFoot']);
  
  // Right Leg (mirror of left)
  bones['RightUpLeg'] = createBone(0.35, 0.025);
  bones['RightUpLeg'].name = 'RightUpLeg';
  bones['RightUpLeg'].position.set(-0.08, -0.175, 0);
  bones['RightUpLeg'].rotation.z = Math.PI;
  bones['Hips'].add(bones['RightUpLeg']);
  
  bones['RightLeg'] = createBone(0.32, 0.022);
  bones['RightLeg'].name = 'RightLeg';
  bones['RightLeg'].position.set(0, -0.16, 0);
  bones['RightUpLeg'].add(bones['RightLeg']);
  
  bones['RightFoot'] = createJoint(0.025);
  bones['RightFoot'].name = 'RightFoot';
  bones['RightFoot'].position.set(0, -0.16, 0);
  bones['RightLeg'].add(bones['RightFoot']);

  return { group, bones };
}

export function SkeletonModel({ frameData, visible = true }: SkeletonModelProps) {
  const groupRef = useRef<THREE.Group>(null);
  const skeletonRef = useRef<{ group: THREE.Group; bones: { [key: string]: THREE.Object3D } } | null>(null);

  // Create skeleton on mount
  useEffect(() => {
    if (!skeletonRef.current) {
      skeletonRef.current = createProceduralSkeleton();
      if (groupRef.current) {
        groupRef.current.add(skeletonRef.current.group);
      }
    }
  }, []);

  // Apply mocap data to skeleton
  useFrame(() => {
    if (!skeletonRef.current || !frameData.jointCenters) return;

    const { bones } = skeletonRef.current;
    const joints = frameData.jointCenters;
    const rotations = frameData.jointRotations;

    // Helper function to mirror position for right-handed pitcher
    const mirrorPosition = (pos: { x: number; y: number; z: number }) => ({
      x: -pos.x, // Mirror X axis
      y: pos.y,  // Keep Y (vertical)
      z: pos.z   // Keep Z (forward/back)
    });

    // Apply positions and rotations to bones
    Object.entries(BONE_MAPPING).forEach(([boneName, jointName]) => {
      const bone = bones[boneName];
      const jointPos = joints[jointName];
      const jointRot = rotations[jointName];

      if (bone && jointPos) {
        const mirrored = mirrorPosition(jointPos);
        
        // Apply position
        bone.position.set(mirrored.x, mirrored.y, mirrored.z);
        
        // Apply rotation if available
        if (jointRot) {
          bone.quaternion.set(jointRot.x, jointRot.y, jointRot.z, jointRot.w);
        }
      }
    });

    // Ensure feet are grounded
    if (bones['LeftFoot'] && joints['L_Ankle']) {
      const leftFoot = bones['LeftFoot'];
      if (leftFoot.position.y < 0) {
        leftFoot.position.y = 0.05; // Slight offset above ground
      }
    }
    
    if (bones['RightFoot'] && joints['R_Ankle']) {
      const rightFoot = bones['RightFoot'];
      if (rightFoot.position.y < 0) {
        rightFoot.position.y = 0.05; // Slight offset above ground
      }
    }
  });

  return (
    <group ref={groupRef} visible={visible} scale={[1, 1, 1]} position={[0, 0, 0]}>
      {/* Skeleton will be added via useEffect */}
    </group>
  );
}