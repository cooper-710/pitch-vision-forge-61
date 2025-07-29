import React, { useRef, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Grid, Text, useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { MotionData, FrameData } from '@/utils/dataParser';

interface MotionViewer3DProps {
  motionData: MotionData;
  currentFrame: number;
  cameraView?: string;
}

/* ---- GLTF Skeleton Component ---- */
function AnatomicalSkeleton({ frameData }: { frameData: FrameData }) {
  const { scene } = useGLTF('/models/scene.gltf'); // load GLTF skeleton
  const skeletonRef = useRef<THREE.Group>(null);

  // Map bone names to mocap joint names here
  // Example mapping (adjust to match your GLTF bone names and dataParser joints):
  const boneJointMap: Record<string, string> = {
    Hips: 'Pelvis',
    Spine: 'Spine',
    Neck: 'Neck',
    Head: 'Head',
    LeftArm: 'L_Shoulder',
    LeftForeArm: 'L_Elbow',
    LeftHand: 'L_Wrist',
    RightArm: 'R_Shoulder',
    RightForeArm: 'R_Elbow',
    RightHand: 'R_Wrist',
    // Add legs if needed
  };

  // Update bone positions each frame
  useFrame(() => {
    if (!frameData || !skeletonRef.current) return;

    Object.entries(boneJointMap).forEach(([boneName, jointName]) => {
      const jointPos = frameData.jointCenters[jointName];
      if (!jointPos) return;

      const bone = skeletonRef.current!.getObjectByName(boneName);
      if (bone) {
        // Mirror X if right-handed
        bone.position.set(-jointPos.x, jointPos.y, jointPos.z);
      }
    });
  });

  return (
    <primitive
      ref={skeletonRef}
      object={scene}
      scale={[0.01, 0.01, 0.01]} // Adjust scaling to match motion data
      position={[0, 0, 0]}
    />
  );
}

/* ---- Metric Overlay ---- */
function MetricOverlay({ frameData }: { frameData: FrameData }) {
  const metrics = frameData.baseballMetrics;
  return (
    <group position={[2, 1, 0]}>
      <Text position={[0, 0.5, 0]} fontSize={0.15} color="#00ffff" anchorX="left" anchorY="middle">
        {`Pelvis Velocity: ${metrics.pelvisVelocity.toFixed(1)} m/s`}
      </Text>
      <Text position={[0, 0.3, 0]} fontSize={0.15} color="#0080ff" anchorX="left" anchorY="middle">
        {`Trunk Velocity: ${metrics.trunkVelocity.toFixed(1)} m/s`}
      </Text>
      <Text position={[0, 0.1, 0]} fontSize={0.15} color="#ff6600" anchorX="left" anchorY="middle">
        {`Elbow Torque: ${metrics.elbowTorque.toFixed(1)} Nm`}
      </Text>
      <Text position={[0, -0.1, 0]} fontSize={0.15} color="#ff3300" anchorX="left" anchorY="middle">
        {`Shoulder Torque: ${metrics.shoulderTorque.toFixed(1)} Nm`}
      </Text>
    </group>
  );
}

/* ---- Scene Component ---- */
function Scene({ motionData, currentFrame, cameraView }: MotionViewer3DProps) {
  const frameData = motionData.frames[currentFrame] || motionData.frames[0];
  const controlsRef = useRef<any>();

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
        default:
          controls.object.position.set(4, 3, 4);
          controls.target.set(0, 1.2, 0);
      }
      controls.update();
    }
  }, [cameraView]);

  return (
    <>
      {/* Lighting */}
      <ambientLight intensity={0.4} color="#001133" />
      <pointLight position={[8, 8, 8]} intensity={0.6} color="#00ccff" />
      <pointLight position={[-8, -8, -8]} intensity={0.4} color="#0066cc" />
      <pointLight position={[0, 10, 0]} intensity={0.3} color="#ffffff" />

      {/* Grid + Ground */}
      <Grid args={[30, 30]} cellSize={0.25} cellThickness={0.3} cellColor="#002244"
        sectionSize={2} sectionThickness={0.8} sectionColor="#0044aa"
        fadeDistance={20} fadeStrength={1} followCamera={false} infiniteGrid={false}
        position={[0, 0, 0]} />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
        <planeGeometry args={[20, 20]} />
        <meshBasicMaterial color="#001122" transparent opacity={0.1} blending={THREE.AdditiveBlending} />
      </mesh>

      {/* GLTF Skeleton */}
      <AnatomicalSkeleton frameData={frameData} />

      {/* Metrics */}
      <MetricOverlay frameData={frameData} />

      {/* Camera Controls */}
      <OrbitControls
        ref={controlsRef}
        enablePan enableZoom enableRotate
        minDistance={2}
        maxDistance={25}
        target={[0, 1.2, 0]}
        enableDamping
        dampingFactor={0.05}
      />
    </>
  );
}

export function MotionViewer3D({ motionData, currentFrame, cameraView = 'free' }: MotionViewer3DProps) {
  return (
    <div className="w-full h-full bg-background rounded-lg overflow-hidden border border-card-border">
      <Canvas
        camera={{ position: [4, 3, 4], fov: 65, near: 0.1, far: 1000 }}
        gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
        dpr={[1, 2]}
      >
        <Scene motionData={motionData} currentFrame={currentFrame} cameraView={cameraView} />
      </Canvas>
    </div>
  );
}
