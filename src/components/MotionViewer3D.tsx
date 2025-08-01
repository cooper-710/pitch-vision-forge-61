import React, { useRef, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Grid, Text } from '@react-three/drei';
import * as THREE from 'three';
import { MotionData, FrameData, BONE_CONNECTIONS } from '@/utils/dataParser';

interface MotionViewer3DProps {
  motionData: MotionData;
  currentFrame: number;
  cameraView?: string;
}

/* ---- Procedural Skeleton Component ---- */
function AnatomicalSkeleton({ frameData }: { frameData: FrameData }) {
  const skeletonRef = useRef<THREE.Group>(null);
  const debugLog = useRef(true);

  // Create bone geometry with better visibility
  const createBone = (start: THREE.Vector3, end: THREE.Vector3, radius: number = 0.02) => {
    const direction = new THREE.Vector3().subVectors(end, start);
    const length = direction.length();
    
    if (length < 0.001) return null; // Skip zero-length bones
    
    const geometry = new THREE.CylinderGeometry(radius, radius * 0.7, length, 8);
    const material = new THREE.MeshBasicMaterial({ 
      color: '#00ff88',
      transparent: true,
      opacity: 0.8
    });
    const bone = new THREE.Mesh(geometry, material);
    
    // Position bone at midpoint and orient toward end
    bone.position.copy(start).add(direction.multiplyScalar(0.5));
    bone.lookAt(end);
    bone.rotateX(Math.PI / 2); // Align with cylinder's natural orientation
    
    return bone;
  };

  // Create joint sphere with better visibility
  const createJoint = (position: THREE.Vector3, radius: number = 0.04, color: string = '#ff4488') => {
    const geometry = new THREE.SphereGeometry(radius, 12, 8);
    const material = new THREE.MeshBasicMaterial({ 
      color: color,
      transparent: true,
      opacity: 0.9
    });
    const joint = new THREE.Mesh(geometry, material);
    joint.position.copy(position);
    return joint;
  };

  // Update skeleton each frame
  useFrame(() => {
    if (!frameData || !skeletonRef.current) return;

    // Clear previous bones and joints
    while (skeletonRef.current.children.length > 0) {
      skeletonRef.current.remove(skeletonRef.current.children[0]);
    }

    const joints = frameData.jointCenters;
    const positions: { [key: string]: THREE.Vector3 } = {};
    let validJoints = 0;
    let totalJoints = 0;

    // Convert joint data to THREE.Vector3 positions with coordinate transformation
    Object.entries(joints).forEach(([name, joint]) => {
      totalJoints++;
      if (joint && typeof joint.x === 'number' && typeof joint.y === 'number' && typeof joint.z === 'number') {
        // Apply better scaling based on data magnitude
        const scale = 10; // Increase scale for better visibility
        positions[name] = new THREE.Vector3(
          joint.x * scale,    // Keep X as horizontal
          joint.y * scale,    // Y as vertical  
          joint.z * scale     // Z as depth
        );
        validJoints++;
      } else if (debugLog.current && frameData.frameNumber === 0) {
        console.warn(`[Skeleton] Invalid joint data for ${name}:`, joint);
      }
    });

    // Debug log once
    if (debugLog.current && frameData.frameNumber === 0) {
      console.log(`[Skeleton] Frame ${frameData.frameNumber}: ${validJoints}/${totalJoints} valid joints`);
      console.log('[Skeleton] Sample positions:', Object.fromEntries(Object.entries(positions).slice(0, 3)));
      debugLog.current = false;
    }

    // Create bones based on connections
    let validBones = 0;
    BONE_CONNECTIONS.forEach(([startJoint, endJoint]) => {
      const startPos = positions[startJoint];
      const endPos = positions[endJoint];
      
      if (startPos && endPos) {
        const bone = createBone(startPos, endPos, 0.05);
        if (bone) {
          skeletonRef.current!.add(bone);
          validBones++;
        }
      }
    });

    // Create joints at connection points with different colors for key joints
    Object.entries(positions).forEach(([name, pos]) => {
      let color = '#ff4488'; // Default pink
      let radius = 0.06;
      
      // Color coding for important joints
      if (name === 'Pelvis') { color = '#ff0000'; radius = 0.08; } // Red
      else if (name === 'Neck') { color = '#0000ff'; radius = 0.08; } // Blue
      else if (name.includes('Shoulder')) { color = '#00ff00'; radius = 0.07; } // Green
      else if (name.includes('Wrist')) { color = '#ffff00'; radius = 0.05; } // Yellow
      
      const joint = createJoint(pos, radius, color);
      skeletonRef.current!.add(joint);
    });

    // Log bone creation progress occasionally
    if (frameData.frameNumber % 30 === 0 && validBones === 0) {
      console.warn(`[Skeleton] Frame ${frameData.frameNumber}: No valid bones created from ${BONE_CONNECTIONS.length} connections`);
    }
  });

  return <group ref={skeletonRef} />;
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
