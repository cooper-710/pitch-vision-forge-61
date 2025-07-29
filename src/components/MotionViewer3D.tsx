import React, { useRef, useState, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Grid, Text, Html } from '@react-three/drei';
import * as THREE from 'three';
import { MotionData, FrameData, BONE_CONNECTIONS, JOINT_NAMES } from '@/utils/dataParser';

interface MotionViewer3DProps {
  motionData: MotionData;
  currentFrame: number;
}

interface SkeletonProps {
  frameData: FrameData;
}

// Professional Motion Capture Joint Marker
function MocapJoint({ 
  position, 
  jointName, 
  isKeyJoint = false, 
  isThrowingArm = false,
  showLabel = false 
}: { 
  position: [number, number, number], 
  jointName: string,
  isKeyJoint?: boolean,
  isThrowingArm?: boolean,
  showLabel?: boolean
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const glowRef = useRef<THREE.Mesh>(null);
  
  useFrame((state) => {
    if (meshRef.current) {
      const time = state.clock.getElapsedTime();
      // Subtle professional pulse for key joints
      if (isKeyJoint) {
        const pulse = Math.sin(time * 2) * 0.1 + 0.9;
        meshRef.current.scale.setScalar(pulse);
      }
    }
  });

  // Professional mocap marker colors
  const getMarkerColor = () => {
    if (isThrowingArm) return '#FF4444'; // Red for throwing arm
    if (isKeyJoint) return '#00FFAA';    // Bright green for key joints
    return '#00AAFF';                    // Blue for standard joints
  };

  const markerColor = getMarkerColor();
  const markerSize = isKeyJoint ? 0.025 : 0.018; // Precise marker sizes

  return (
    <group position={position}>
      {/* Core marker - solid sphere with professional materials */}
      <mesh ref={meshRef}>
        <sphereGeometry args={[markerSize, 16, 16]} />
        <meshStandardMaterial 
          color={markerColor}
          metalness={0.1}
          roughness={0.2}
          emissive={markerColor}
          emissiveIntensity={0.3}
        />
      </mesh>
      
      {/* Inner glow - subtle professional glow */}
      <mesh ref={glowRef} scale={[1.8, 1.8, 1.8]}>
        <sphereGeometry args={[markerSize, 12, 12]} />
        <meshBasicMaterial 
          color={markerColor}
          transparent 
          opacity={0.15}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
      
      {/* Outer professional halo */}
      <mesh scale={[3, 3, 3]}>
        <sphereGeometry args={[markerSize, 8, 8]} />
        <meshBasicMaterial 
          color={markerColor}
          transparent 
          opacity={0.05}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
      
      {/* Joint label for technical view */}
      {showLabel && (
        <Html position={[0, markerSize + 0.05, 0]} center>
          <div className="text-xs font-mono text-primary-foreground bg-background/80 px-1 rounded">
            {jointName}
          </div>
        </Html>
      )}
    </group>
  );
}

// Professional Motion Capture Bone Segment
function MocapBone({ 
  start, 
  end, 
  boneType = 'standard',
  thickness = 0.008
}: { 
  start: [number, number, number], 
  end: [number, number, number],
  boneType?: 'spine' | 'throwing-arm' | 'support-arm' | 'leg' | 'standard',
  thickness?: number
}) {
  const direction = new THREE.Vector3(...end).sub(new THREE.Vector3(...start));
  const length = direction.length();
  const center = new THREE.Vector3(...start).add(direction.clone().multiplyScalar(0.5));
  
  // Calculate rotation to align cylinder with bone direction
  const quaternion = new THREE.Quaternion();
  quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize());

  // Professional bone colors and properties
  const getBoneProps = () => {
    switch (boneType) {
      case 'spine':
        return { color: '#FFAA00', thickness: thickness * 1.5, opacity: 0.9 };
      case 'throwing-arm':
        return { color: '#FF4444', thickness: thickness * 1.3, opacity: 0.9 };
      case 'support-arm':
        return { color: '#4488FF', thickness: thickness * 1.1, opacity: 0.85 };
      case 'leg':
        return { color: '#88FF44', thickness: thickness * 1.2, opacity: 0.85 };
      default:
        return { color: '#00AAFF', thickness: thickness, opacity: 0.8 };
    }
  };

  const { color, thickness: boneThickness, opacity } = getBoneProps();

  return (
    <group position={center.toArray()} quaternion={quaternion.toArray()}>
      {/* Main bone segment */}
      <mesh>
        <cylinderGeometry args={[boneThickness, boneThickness, length, 8]} />
        <meshStandardMaterial 
          color={color}
          metalness={0.2}
          roughness={0.3}
          emissive={color}
          emissiveIntensity={0.1}
          transparent
          opacity={opacity}
        />
      </mesh>
      
      {/* Subtle bone glow */}
      <mesh scale={[2, 1, 2]}>
        <cylinderGeometry args={[boneThickness, boneThickness, length, 6]} />
        <meshBasicMaterial 
          color={color}
          transparent 
          opacity={0.1}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
    </group>
  );
}

// Professional Coordinate System Reference
function CoordinateSystem() {
  const axisLength = 0.5;
  const axisThickness = 0.004;
  
  return (
    <group position={[0, 0, 0]}>
      {/* X-axis - Red */}
      <mesh position={[axisLength/2, 0, 0]} rotation={[0, 0, -Math.PI/2]}>
        <cylinderGeometry args={[axisThickness, axisThickness, axisLength, 8]} />
        <meshBasicMaterial color="#FF0000" />
      </mesh>
      <mesh position={[axisLength, 0, 0]}>
        <coneGeometry args={[axisThickness * 3, axisThickness * 8, 8]} />
        <meshBasicMaterial color="#FF0000" />
      </mesh>
      
      {/* Y-axis - Green */}
      <mesh position={[0, axisLength/2, 0]}>
        <cylinderGeometry args={[axisThickness, axisThickness, axisLength, 8]} />
        <meshBasicMaterial color="#00FF00" />
      </mesh>
      <mesh position={[0, axisLength, 0]}>
        <coneGeometry args={[axisThickness * 3, axisThickness * 8, 8]} />
        <meshBasicMaterial color="#00FF00" />
      </mesh>
      
      {/* Z-axis - Blue */}
      <mesh position={[0, 0, axisLength/2]} rotation={[Math.PI/2, 0, 0]}>
        <cylinderGeometry args={[axisThickness, axisThickness, axisLength, 8]} />
        <meshBasicMaterial color="#0000FF" />
      </mesh>
      <mesh position={[0, 0, axisLength]} rotation={[Math.PI/2, 0, 0]}>
        <coneGeometry args={[axisThickness * 3, axisThickness * 8, 8]} />
        <meshBasicMaterial color="#0000FF" />
      </mesh>
      
      {/* Axis labels */}
      <Text position={[axisLength + 0.1, 0, 0]} fontSize={0.05} color="#FF0000">X</Text>
      <Text position={[0, axisLength + 0.1, 0]} fontSize={0.05} color="#00FF00">Y</Text>
      <Text position={[0, 0, axisLength + 0.1]} fontSize={0.05} color="#0000FF">Z</Text>
    </group>
  );
}

// Professional Motion Capture Skeleton
function MocapSkeleton({ frameData }: SkeletonProps) {
  const joints = frameData.jointCenters;
  
  // Define joint categories for professional rendering
  const jointCategories = {
    key: ['Head', 'Neck', 'Pelvis', 'R_Shoulder', 'R_Elbow', 'R_Wrist'],
    throwingArm: ['R_Shoulder', 'R_Elbow', 'R_Wrist'],
    supportArm: ['L_Shoulder', 'L_Elbow', 'L_Wrist'],
    spine: ['Head', 'Neck', 'Pelvis'],
    legs: ['R_Hip', 'R_Knee', 'R_Ankle', 'R_Foot', 'L_Hip', 'L_Knee', 'L_Ankle', 'L_Foot']
  };

  // Mirror the skeleton horizontally for right-handed pitcher visualization
  const mirrorPosition = (pos: { x: number; y: number; z: number }) => ({
    x: -pos.x, // Mirror X axis for proper right-hand orientation
    y: pos.y,  // Keep Y (vertical)
    z: pos.z   // Keep Z (depth)
  });

  // Determine bone type for professional rendering
  const getBoneType = (startJoint: string, endJoint: string) => {
    if (jointCategories.spine.includes(startJoint) && jointCategories.spine.includes(endJoint)) {
      return 'spine';
    }
    if (jointCategories.throwingArm.includes(startJoint) || jointCategories.throwingArm.includes(endJoint)) {
      return 'throwing-arm';
    }
    if (jointCategories.supportArm.includes(startJoint) || jointCategories.supportArm.includes(endJoint)) {
      return 'support-arm';
    }
    if (jointCategories.legs.includes(startJoint) || jointCategories.legs.includes(endJoint)) {
      return 'leg';
    }
    return 'standard';
  };

  return (
    <group>
      {/* Render professional mocap joints */}
      {Object.entries(joints).map(([jointName, position]) => {
        const mirroredPos = mirrorPosition(position);
        return (
          <MocapJoint
            key={jointName}
            position={[mirroredPos.x, mirroredPos.y, mirroredPos.z]}
            jointName={jointName}
            isKeyJoint={jointCategories.key.includes(jointName)}
            isThrowingArm={jointCategories.throwingArm.includes(jointName)}
            showLabel={false} // Can be toggled for technical view
          />
        );
      })}
      
      {/* Render professional bone segments */}
      {BONE_CONNECTIONS.map(([startJoint, endJoint], index) => {
        const startPos = joints[startJoint];
        const endPos = joints[endJoint];
        
        if (startPos && endPos) {
          const mirroredStart = mirrorPosition(startPos);
          const mirroredEnd = mirrorPosition(endPos);
          const boneType = getBoneType(startJoint, endJoint);
          
          return (
            <MocapBone
              key={`${startJoint}-${endJoint}-${index}`}
              start={[mirroredStart.x, mirroredStart.y, mirroredStart.z]}
              end={[mirroredEnd.x, mirroredEnd.y, mirroredEnd.z]}
              boneType={boneType}
            />
          );
        }
        return null;
      })}
    </group>
  );
}

// Professional Technical Overlay
function TechnicalOverlay({ frameData, currentFrame }: { frameData: FrameData; currentFrame: number }) {
  const metrics = frameData.baseballMetrics;
  
  return (
    <group position={[2.5, 1.5, 0]}>
      {/* Technical frame info */}
      <Text
        position={[0, 0.8, 0]}
        fontSize={0.12}
        color="#00FFAA"
        anchorX="left"
        anchorY="middle"
        font="/fonts/mono"
      >
        {`FRAME: ${currentFrame.toString().padStart(4, '0')}`}
      </Text>
      
      {/* Velocity metrics */}
      <Text
        position={[0, 0.6, 0]}
        fontSize={0.11}
        color="#00AAFF"
        anchorX="left"
        anchorY="middle"
      >
        {`PELVIS VEL: ${metrics.pelvisVelocity.toFixed(2)} m/s`}
      </Text>
      
      <Text
        position={[0, 0.45, 0]}
        fontSize={0.11}
        color="#0088FF"
        anchorX="left"
        anchorY="middle"
      >
        {`TRUNK VEL: ${metrics.trunkVelocity.toFixed(2)} m/s`}
      </Text>
      
      {/* Torque metrics */}
      <Text
        position={[0, 0.25, 0]}
        fontSize={0.11}
        color="#FF4444"
        anchorX="left"
        anchorY="middle"
      >
        {`ELBOW TRQ: ${metrics.elbowTorque.toFixed(1)} Nm`}
      </Text>
      
      <Text
        position={[0, 0.1, 0]}
        fontSize={0.11}
        color="#FF6666"
        anchorX="left"
        anchorY="middle"
      >
        {`SHOULDER TRQ: ${metrics.shoulderTorque.toFixed(1)} Nm`}
      </Text>
      
      {/* Professional markers legend */}
      <group position={[0, -0.2, 0]}>
        <Text
          position={[0, 0.1, 0]}
          fontSize={0.08}
          color="#FFFFFF"
          anchorX="left"
          anchorY="middle"
        >
          MARKERS:
        </Text>
        <Text
          position={[0, -0.05, 0]}
          fontSize={0.07}
          color="#FF4444"
          anchorX="left"
          anchorY="middle"
        >
          RED: Throwing Arm
        </Text>
        <Text
          position={[0, -0.15, 0]}
          fontSize={0.07}
          color="#00FFAA"
          anchorX="left"
          anchorY="middle"
        >
          GREEN: Key Joints
        </Text>
        <Text
          position={[0, -0.25, 0]}
          fontSize={0.07}
          color="#00AAFF"
          anchorX="left"
          anchorY="middle"
        >
          BLUE: Standard
        </Text>
      </group>
    </group>
  );
}

// Professional Scene Setup
function ProfessionalScene({ motionData, currentFrame, cameraView }: MotionViewer3DProps & { cameraView: string }) {
  const frameData = motionData.frames[currentFrame] || motionData.frames[0];
  const controlsRef = useRef<any>();
  
  // Professional camera positioning
  useEffect(() => {
    if (controlsRef.current) {
      const controls = controlsRef.current;
      
      switch (cameraView) {
        case 'side':
          controls.object.position.set(4, 1.5, 0);
          controls.target.set(0, 1, 0);
          break;
        case 'catcher':
          controls.object.position.set(0, 1.5, 4);
          controls.target.set(0, 1, 0);
          break;
        case 'pitcher':
          controls.object.position.set(0, 1.5, -4);
          controls.target.set(0, 1, 0);
          break;
        case 'free':
        default:
          controls.object.position.set(3, 2, 3);
          controls.target.set(0, 1, 0);
          break;
      }
      controls.update();
    }
  }, [cameraView]);
  
  return (
    <>
      {/* Professional studio lighting */}
      <ambientLight intensity={0.3} color="#0A0A0A" />
      <directionalLight 
        position={[10, 10, 5]} 
        intensity={0.8} 
        color="#FFFFFF"
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
      />
      <pointLight position={[5, 3, 5]} intensity={0.4} color="#00AAFF" />
      <pointLight position={[-5, 3, -5]} intensity={0.3} color="#0066AA" />
      
      {/* Professional laboratory grid */}
      <Grid
        args={[20, 20]}
        cellSize={0.2}
        cellThickness={0.5}
        cellColor="#003366"
        sectionSize={1}
        sectionThickness={1.2}
        sectionColor="#0066AA"
        fadeDistance={15}
        fadeStrength={1}
        followCamera={false}
        infiniteGrid={false}
        position={[0, 0, 0]}
      />
      
      {/* Professional ground reference plane */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <planeGeometry args={[10, 10]} />
        <meshStandardMaterial 
          color="#001122" 
          transparent 
          opacity={0.1}
          roughness={0.9}
          metalness={0.1}
        />
      </mesh>
      
      {/* Coordinate system reference */}
      <CoordinateSystem />
      
      {/* Professional motion capture skeleton */}
      <MocapSkeleton frameData={frameData} />
      
      {/* Technical data overlay */}
      <TechnicalOverlay frameData={frameData} currentFrame={currentFrame} />
      
      {/* Professional camera controls */}
      <OrbitControls
        ref={controlsRef}
        enablePan={true}
        enableZoom={true}
        enableRotate={true}
        minDistance={1.5}
        maxDistance={15}
        target={[0, 1, 0]}
        enableDamping={true}
        dampingFactor={0.05}
        rotateSpeed={0.5}
        panSpeed={0.8}
        zoomSpeed={0.6}
      />
    </>
  );
}

// Main Professional Motion Viewer Component
export function MotionViewer3D({ 
  motionData, 
  currentFrame, 
  cameraView = 'free' 
}: MotionViewer3DProps & { cameraView?: string }) {
  return (
    <div className="w-full h-full bg-black rounded-lg overflow-hidden border border-primary/20 relative">
      <Canvas
        camera={{ 
          position: [3, 2, 3], 
          fov: 60,
          near: 0.1,
          far: 100
        }}
        gl={{ 
          antialias: true,
          alpha: false,
          powerPreference: "high-performance",
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 1.2
        }}
        dpr={[1, 2]}
        shadows
      >
        <ProfessionalScene 
          motionData={motionData} 
          currentFrame={currentFrame} 
          cameraView={cameraView} 
        />
      </Canvas>
      
      {/* Professional frame counter overlay */}
      <div className="absolute top-4 left-4 font-mono text-sm text-primary bg-black/80 px-2 py-1 rounded">
        MOCAP FRAME: {currentFrame.toString().padStart(4, '0')} / {motionData.frames.length.toString().padStart(4, '0')}
      </div>
      
      {/* Professional camera view indicator */}
      <div className="absolute top-4 right-4 font-mono text-xs text-primary-foreground bg-black/80 px-2 py-1 rounded uppercase">
        VIEW: {cameraView}
      </div>
    </div>
  );
}