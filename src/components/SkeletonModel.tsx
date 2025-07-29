import React, { useRef, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { FrameData, BONE_CONNECTIONS } from '@/utils/dataParser';

interface SkeletonModelProps {
  frameData: FrameData;
  visible?: boolean;
}

// Create a data-driven skeleton from mocap joint positions
function createDataDrivenSkeleton(frameData: FrameData) {
  const group = new THREE.Group();
  
  if (!frameData.jointCenters) {
    return { group, joints: {}, bones: {} };
  }

  // Materials - using MeshBasicMaterial for better visibility
  const boneMaterial = new THREE.MeshBasicMaterial({ 
    color: 0xf0f0f0,
    transparent: true,
    opacity: 0.8
  });
  
  const jointMaterial = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.9
  });

  const throwingArmMaterial = new THREE.MeshBasicMaterial({
    color: 0xff6b6b,
    transparent: true,
    opacity: 0.8
  });

  // Store joint and bone meshes
  const joints: { [key: string]: THREE.Mesh } = {};
  const bones: { [key: string]: THREE.Mesh } = {};

  // Create joint spheres at mocap positions
  Object.entries(frameData.jointCenters).forEach(([jointName, position]) => {
    const isThrowingArm = jointName.startsWith('R_') && (
      jointName.includes('Shoulder') || 
      jointName.includes('Elbow') || 
      jointName.includes('Wrist')
    );
    
    const radius = jointName === 'Head' ? 0.08 : 
                   jointName === 'Pelvis' ? 0.06 : 
                   isThrowingArm ? 0.04 : 0.03;

    const geometry = new THREE.SphereGeometry(radius, 12, 8);
    const material = isThrowingArm ? throwingArmMaterial : jointMaterial;
    const joint = new THREE.Mesh(geometry, material);
    
    // Apply position with coordinate transformation
    joint.position.set(-position.x, position.y, position.z);
    joints[jointName] = joint;
    group.add(joint);
  });

  // Create bones between connected joints
  BONE_CONNECTIONS.forEach(([joint1, joint2]) => {
    const pos1 = frameData.jointCenters[joint1];
    const pos2 = frameData.jointCenters[joint2];
    
    if (pos1 && pos2) {
      // Transform coordinates
      const start = new THREE.Vector3(-pos1.x, pos1.y, pos1.z);
      const end = new THREE.Vector3(-pos2.x, pos2.y, pos2.z);
      
      const length = start.distanceTo(end);
      const radius = joint1.includes('Spine') || joint2.includes('Spine') ? 0.025 :
                     joint1.startsWith('R_') || joint2.startsWith('R_') ? 0.02 : 0.018;

      if (length > 0.01) { // Only create bone if joints are far enough apart
        const geometry = new THREE.CapsuleGeometry(radius, length, 6, 12);
        
        const isThrowingArm = (joint1.startsWith('R_') || joint2.startsWith('R_')) && 
                              (joint1.includes('Shoulder') || joint1.includes('Elbow') || joint1.includes('Wrist') ||
                               joint2.includes('Shoulder') || joint2.includes('Elbow') || joint2.includes('Wrist'));
        
        const material = isThrowingArm ? throwingArmMaterial : boneMaterial;
        const bone = new THREE.Mesh(geometry, material);
        
        // Position bone at midpoint
        const midpoint = start.clone().add(end).multiplyScalar(0.5);
        bone.position.copy(midpoint);
        
        // Orient bone along the connection
        const direction = end.clone().sub(start).normalize();
        const up = new THREE.Vector3(0, 1, 0);
        bone.lookAt(bone.position.clone().add(direction));
        
        bones[`${joint1}-${joint2}`] = bone;
        group.add(bone);
      }
    }
  });

  return { group, joints, bones };
}

export function SkeletonModel({ frameData, visible = true }: SkeletonModelProps) {
  const groupRef = useRef<THREE.Group>(null);
  const skeletonRef = useRef<{ 
    group: THREE.Group; 
    joints: { [key: string]: THREE.Mesh }; 
    bones: { [key: string]: THREE.Mesh } 
  } | null>(null);

  // Update skeleton each frame with new data
  useFrame(() => {
    if (!frameData.jointCenters || !groupRef.current) return;

    // Clear previous skeleton
    if (skeletonRef.current) {
      groupRef.current.remove(skeletonRef.current.group);
    }

    // Create new skeleton from current frame data
    skeletonRef.current = createDataDrivenSkeleton(frameData);
    groupRef.current.add(skeletonRef.current.group);

    // Apply any rotations if available
    if (frameData.jointRotations && skeletonRef.current.joints) {
      Object.entries(frameData.jointRotations).forEach(([jointName, rotation]) => {
        const joint = skeletonRef.current?.joints[jointName];
        if (joint && rotation) {
          // Apply rotation - mirror for right-handed pitcher
          joint.quaternion.set(-rotation.x, rotation.y, -rotation.z, rotation.w);
        }
      });
    }

    // Ensure feet stay grounded
    const leftAnkle = skeletonRef.current.joints['L_Ankle'];
    const rightAnkle = skeletonRef.current.joints['R_Ankle'];
    
    if (leftAnkle && leftAnkle.position.y < 0.05) {
      leftAnkle.position.y = 0.05;
    }
    if (rightAnkle && rightAnkle.position.y < 0.05) {
      rightAnkle.position.y = 0.05;
    }
  });

  return (
    <group ref={groupRef} visible={visible} scale={[2, 2, 2]} position={[0, 0, 0]}>
      {/* Skeleton will be created dynamically each frame */}
    </group>
  );
}