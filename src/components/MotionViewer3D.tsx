import React, { useRef, useState, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Grid, Text } from '@react-three/drei';
import * as THREE from 'three';
import { MotionData, FrameData, BONE_CONNECTIONS } from '@/utils/dataParser';
import { SkeletonModel } from './SkeletonModel';

interface MotionViewer3DProps {
  motionData: MotionData;
  currentFrame: number;
  showRealisticSkeleton?: boolean;
}

interface SkeletonProps {
  frameData: FrameData;
}

function Joint({ position, isKeyJoint = false, isThrowingArm = false }: { 
  position: [number, number, number], 
  isKeyJoint?: boolean,
  isThrowingArm?: boolean 
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  
  useFrame((state) => {
    if (meshRef.current) {
      const time = state.clock.getElapsedTime();
      const baseColor = isThrowingArm ? '#ff6600' : '#00ffff';
      meshRef.current.material = new THREE.MeshBasicMaterial({
        color: new THREE.Color(baseColor).lerp(
          new THREE.Color('#ffffff'), 
          Math.sin(time * 4) * 0.3 + 0.3
        ),
        transparent: true,
        opacity: 0.9
      });
    }
  });

  const size = isKeyJoint ? 0.045 : 0.035; // Larger joints
  const glowSize = size * 2.5; // Stronger glow
  const baseColor = isThrowingArm ? '#ff6600' : '#00ffff';

  return (
    <mesh ref={meshRef} position={position}>
      <sphereGeometry args={[size, 20, 20]} />
      <meshBasicMaterial color={baseColor} transparent opacity={0.9} />
      {/* Enhanced glow effect */}
      <mesh scale={[2.5, 2.5, 2.5]}>
        <sphereGeometry args={[size, 12, 12]} />
        <meshBasicMaterial 
          color={baseColor} 
          transparent 
          opacity={0.3} 
          blending={THREE.AdditiveBlending}
        />
      </mesh>
      {/* Outer glow ring */}
      <mesh scale={[4, 4, 4]}>
        <sphereGeometry args={[size, 8, 8]} />
        <meshBasicMaterial 
          color={baseColor} 
          transparent 
          opacity={0.1} 
          blending={THREE.AdditiveBlending}
        />
      </mesh>
    </mesh>
  );
}

function Bone({ start, end, isUpperBody = false, isThrowingArm = false }: { 
  start: [number, number, number], 
  end: [number, number, number],
  isUpperBody?: boolean,
  isThrowingArm?: boolean 
}) {
  const direction = new THREE.Vector3(...end).sub(new THREE.Vector3(...start));
  const length = direction.length();
  const center = new THREE.Vector3(...start).add(direction.clone().multiplyScalar(0.5));
  
  // Calculate rotation to align cylinder with bone direction
  const quaternion = new THREE.Quaternion();
  quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize());

  const thickness = 0.015; // Thicker bones
  const color = isThrowingArm ? '#ff6600' : isUpperBody ? '#0099ff' : '#0066cc';

  return (
    <group position={center.toArray()} quaternion={quaternion.toArray()}>
      <mesh>
        <cylinderGeometry args={[thickness, thickness, length, 12]} />
        <meshBasicMaterial color={color} transparent opacity={0.8} />
      </mesh>
      {/* Enhanced glow effect for bone */}
      <mesh scale={[2.5, 1, 2.5]}>
        <cylinderGeometry args={[thickness, thickness, length, 6]} />
        <meshBasicMaterial 
          color={color} 
          transparent 
          opacity={0.2} 
          blending={THREE.AdditiveBlending}
        />
      </mesh>
      {/* Outer glow */}
      <mesh scale={[4, 1, 4]}>
        <cylinderGeometry args={[thickness, thickness, length, 4]} />
        <meshBasicMaterial 
          color={color} 
          transparent 
          opacity={0.05} 
          blending={THREE.AdditiveBlending}
        />
      </mesh>
    </group>
  );
}

function Skeleton({ frameData, showRealisticSkeleton = false }: SkeletonProps & { showRealisticSkeleton?: boolean }) {
  const joints = frameData.jointCenters;
  const jointRotations = frameData.jointRotations;
  const keyJoints = ['R_Shoulder', 'R_Elbow', 'R_Wrist', 'Pelvis', 'Head'];
  const throwingArmJoints = ['R_Shoulder', 'R_Elbow', 'R_Wrist'];
  const upperBodyJoints = ['Spine', 'Neck', 'Head', 'L_Shoulder', 'L_Elbow', 'L_Wrist', 'R_Shoulder', 'R_Elbow', 'R_Wrist'];

  // Apply joint rotations to skeleton if available
  const applyRotation = (jointName: string) => {
    const rotation = jointRotations[jointName];
    if (rotation) {
      return new THREE.Quaternion(rotation.x, rotation.y, rotation.z, rotation.w);
    }
    return new THREE.Quaternion(0, 0, 0, 1);
  };

  // Mirror the skeleton horizontally for right-handed pitcher
  const mirrorPosition = (pos: { x: number; y: number; z: number }) => ({
    x: -pos.x, // Mirror X axis
    y: pos.y,  // Keep Y (vertical)
    z: pos.z   // Keep Z (forward/back)
  });

  // Show realistic skeleton or stick figure
  if (showRealisticSkeleton) {
    return <SkeletonModel frameData={frameData} />;
  }

  return (
    <group>
      {/* Render joints with rotations */}
      {Object.entries(joints).map(([jointName, position]) => {
        const mirroredPos = mirrorPosition(position);
        const rotation = applyRotation(jointName);
        return (
          <group 
            key={jointName}
            position={[mirroredPos.x, mirroredPos.y, mirroredPos.z]}
            quaternion={[rotation.x, rotation.y, rotation.z, rotation.w]}
          >
            <Joint
              position={[0, 0, 0]}
              isKeyJoint={keyJoints.includes(jointName)}
              isThrowingArm={throwingArmJoints.includes(jointName)}
            />
          </group>
        );
      })}
      
      {/* Render bones */}
      {BONE_CONNECTIONS.map(([startJoint, endJoint], index) => {
        const startPos = joints[startJoint];
        const endPos = joints[endJoint];
        
        if (startPos && endPos) {
          const mirroredStart = mirrorPosition(startPos);
          const mirroredEnd = mirrorPosition(endPos);
          const isUpperBody = upperBodyJoints.includes(startJoint) || upperBodyJoints.includes(endJoint);
          const isThrowingArm = throwingArmJoints.includes(startJoint) || throwingArmJoints.includes(endJoint);
          
          return (
            <Bone
              key={`${startJoint}-${endJoint}-${index}`}
              start={[mirroredStart.x, mirroredStart.y, mirroredStart.z]}
              end={[mirroredEnd.x, mirroredEnd.y, mirroredEnd.z]}
              isUpperBody={isUpperBody}
              isThrowingArm={isThrowingArm}
            />
          );
        }
        return null;
      })}
    </group>
  );
}

function MetricOverlay({ frameData }: { frameData: FrameData }) {
  const metrics = frameData.baseballMetrics;
  
  return (
    <group position={[2, 1, 0]}>
      <Text
        position={[0, 0.6, 0]}
        fontSize={0.12}
        color="#00ffff"
        anchorX="left"
        anchorY="middle"
      >
        {`Pelvis Twist: ${metrics.pelvisTwistVelocity.toFixed(1)}°/s`}
      </Text>
      <Text
        position={[0, 0.4, 0]}
        fontSize={0.12}
        color="#0080ff"
        anchorX="left"
        anchorY="middle"
      >
        {`Shoulder Twist: ${metrics.shoulderTwistVelocity.toFixed(1)}°/s`}
      </Text>
      <Text
        position={[0, 0.2, 0]}
        fontSize={0.12}
        color="#ff6600"
        anchorX="left"
        anchorY="middle"
      >
        {`Shoulder Ext Rot: ${metrics.shoulderExternalRotation.toFixed(1)}°`}
      </Text>
      <Text
        position={[0, 0.0, 0]}
        fontSize={0.12}
        color="#ff3300"
        anchorX="left"
        anchorY="middle"
      >
        {`Trunk Separation: ${metrics.trunkSeparation.toFixed(1)}°`}
      </Text>
      <Text
        position={[0, -0.2, 0]}
        fontSize={0.1}
        color="#888888"
        anchorX="left"
        anchorY="middle"
      >
        {`Frame: ${frameData.frameNumber}`}
      </Text>
    </group>
  );
}

function Scene({ motionData, currentFrame, cameraView, showRealisticSkeleton }: MotionViewer3DProps & { cameraView: string; showRealisticSkeleton?: boolean }) {
  const frameData = motionData.frames[currentFrame] || motionData.frames[0];
  const controlsRef = useRef<any>();
  
  // Camera positioning based on view
  useEffect(() => {
    if (controlsRef.current) {
      const controls = controlsRef.current;
      
      switch (cameraView) {
        case 'side':
          controls.object.position.set(6, 2, 0);
          controls.target.set(0, 1.2, 0);
          break;
        case 'catcher':
          controls.object.position.set(0, 2, 6);
          controls.target.set(0, 1.2, 0);
          break;
        case 'free':
        default:
          controls.object.position.set(4, 3, 4);
          controls.target.set(0, 1.2, 0);
          break;
      }
      controls.update();
    }
  }, [cameraView]);
  
  return (
    <>
      {/* Enhanced Lighting */}
      <ambientLight intensity={0.4} color="#001133" />
      <pointLight position={[8, 8, 8]} intensity={0.6} color="#00ccff" />
      <pointLight position={[-8, -8, -8]} intensity={0.4} color="#0066cc" />
      <pointLight position={[0, 10, 0]} intensity={0.3} color="#ffffff" />
      
      {/* Enhanced Grid with ground reference */}
      <Grid
        args={[30, 30]}
        cellSize={0.25}
        cellThickness={0.3}
        cellColor="#002244"
        sectionSize={2}
        sectionThickness={0.8}
        sectionColor="#0044aa"
        fadeDistance={20}
        fadeStrength={1}
        followCamera={false}
        infiniteGrid={false}
        position={[0, 0, 0]}
      />
      
      {/* Ground plane for better reference */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
        <planeGeometry args={[20, 20]} />
        <meshBasicMaterial 
          color="#001122" 
          transparent 
          opacity={0.1} 
          blending={THREE.AdditiveBlending}
        />
      </mesh>
      
      {/* Skeleton */}
      <Skeleton frameData={frameData} showRealisticSkeleton={showRealisticSkeleton} />
      
      {/* Metric overlay */}
      <MetricOverlay frameData={frameData} />
      
      {/* Camera controls */}
      <OrbitControls
        ref={controlsRef}
        enablePan={true}
        enableZoom={true}
        enableRotate={true}
        minDistance={2}
        maxDistance={25}
        target={[0, 1.2, 0]}
        enableDamping={true}
        dampingFactor={0.05}
      />
    </>
  );
}

export function MotionViewer3D({ motionData, currentFrame, cameraView = 'free', showRealisticSkeleton = false }: MotionViewer3DProps & { cameraView?: string; showRealisticSkeleton?: boolean }) {
  return (
    <div className="w-full h-full bg-background rounded-lg overflow-hidden border border-card-border">
      <Canvas
        camera={{ 
          position: [4, 3, 4], 
          fov: 65,
          near: 0.1,
          far: 1000
        }}
        gl={{ 
          antialias: true,
          alpha: true,
          powerPreference: "high-performance"
        }}
        dpr={[1, 2]}
      >
        <Scene motionData={motionData} currentFrame={currentFrame} cameraView={cameraView} showRealisticSkeleton={showRealisticSkeleton} />
      </Canvas>
    </div>
  );
}