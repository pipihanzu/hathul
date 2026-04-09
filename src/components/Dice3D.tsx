import React, { useRef, useState, useMemo, useEffect, Suspense } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Text, Environment, Float } from '@react-three/drei';
import * as THREE from 'three';

interface DiceProps {
  rolling: boolean;
  result: number | null;
  roller: 'player' | 'opponent';
  type?: 'd20' | 'd6';
  onRollComplete?: () => void;
}

const GameDice: React.FC<DiceProps> = ({ rolling, result, roller, type = 'd20', onRollComplete }) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const [targetQuaternion, setTargetQuaternion] = useState<THREE.Quaternion | null>(null);
  
  const pos = useRef(new THREE.Vector3(0, 0, 0));
  const vel = useRef(new THREE.Vector3(0, 0, 0));
  
  // Create geometry and map faces
  const { geometry, faceData } = useMemo(() => {
    if (type === 'd6') {
      const geo = new THREE.BoxGeometry(1.1, 1.1, 1.1);
      geo.computeVertexNormals();
      const faces = [
        { center: new THREE.Vector3(0.56, 0, 0), normal: new THREE.Vector3(1, 0, 0), value: 1 },
        { center: new THREE.Vector3(-0.56, 0, 0), normal: new THREE.Vector3(-1, 0, 0), value: 6 },
        { center: new THREE.Vector3(0, 0.56, 0), normal: new THREE.Vector3(0, 1, 0), value: 2 },
        { center: new THREE.Vector3(0, -0.56, 0), normal: new THREE.Vector3(0, -1, 0), value: 5 },
        { center: new THREE.Vector3(0, 0, 0.56), normal: new THREE.Vector3(0, 0, 1), value: 3 },
        { center: new THREE.Vector3(0, 0, -0.56), normal: new THREE.Vector3(0, 0, -1), value: 4 },
      ];
      return { geometry: geo, faceData: faces };
    } else {
      const geo = new THREE.IcosahedronGeometry(0.84, 0); // 30% smaller than 1.2
      geo.computeVertexNormals();
      
      const posAttribute = geo.attributes.position;
      const faces = [];
      
      // Icosahedron has 20 faces, each with 3 vertices
      for (let i = 0; i < 20; i++) {
        const vA = new THREE.Vector3().fromBufferAttribute(posAttribute, i * 3);
        const vB = new THREE.Vector3().fromBufferAttribute(posAttribute, i * 3 + 1);
        const vC = new THREE.Vector3().fromBufferAttribute(posAttribute, i * 3 + 2);
        
        const center = new THREE.Vector3().addVectors(vA, vB).add(vC).divideScalar(3);
        
        // Calculate normal
        const cb = new THREE.Vector3().subVectors(vC, vB);
        const ab = new THREE.Vector3().subVectors(vA, vB);
        const normal = cb.cross(ab).normalize();
        
        faces.push({ center, normal, value: i + 1 });
      }
      
      // Shuffle values 1-20 to make it look like a real d20 (simplified)
      const values = [1, 20, 14, 7, 9, 12, 18, 3, 15, 6, 10, 11, 19, 2, 13, 8, 17, 4, 16, 5];
      faces.forEach((face, idx) => {
        face.value = values[idx];
      });
      
      return { geometry: geo, faceData: faces };
    }
  }, [type]);

  useEffect(() => {
    if (rolling) {
      pos.current.set(0, 0, 0);
      // Toss it up with random X/Z velocity
      vel.current.set(
        (Math.random() - 0.5) * 10,
        5 + Math.random() * 5,
        (Math.random() - 0.5) * 10
      );
    }
  }, [rolling]);

  useEffect(() => {
    if (!rolling && result !== null) {
      // Find the face that matches the result
      const face = faceData.find(f => f.value === result);
      if (face) {
        // We want this face's normal to point towards the camera (0, 0, 1)
        const targetNormal = new THREE.Vector3(0, 0, 1);
        const q = new THREE.Quaternion().setFromUnitVectors(face.normal, targetNormal);
        
        // Add some random rotation around the Z axis so it doesn't always land perfectly straight
        const randomZ = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), Math.random() * Math.PI * 2);
        q.premultiply(randomZ);
        
        setTargetQuaternion(q);
        
        // Notify complete after a short delay for the snap animation
        const timer = setTimeout(() => {
          if (onRollComplete) onRollComplete();
        }, 1000);
        return () => clearTimeout(timer);
      }
    } else if (rolling) {
      setTargetQuaternion(null);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rolling, result, faceData]);

  useFrame((state, delta) => {
    if (!meshRef.current) return;

    if (rolling) {
      // Spin wildly
      meshRef.current.rotation.x += delta * 15;
      meshRef.current.rotation.y += delta * 20;
      meshRef.current.rotation.z += delta * 10;
      
      // Gravity and movement
      vel.current.y -= delta * 25; // gravity
      pos.current.addScaledVector(vel.current, delta);
      
      const boundsX = 2.5; 
      const boundsY = 2.5;
      const boundsZ = 1.5;
      
      // Floor bounce (with random deflection for erratic bouncing)
      if (pos.current.y < -boundsY) { 
        pos.current.y = -boundsY; 
        vel.current.y *= -0.85; 
        vel.current.x = (vel.current.x * 0.5) + (Math.random() - 0.5) * 12;
        vel.current.z = (vel.current.z * 0.5) + (Math.random() - 0.5) * 12;
      }
      // Ceiling bounce
      if (pos.current.y > boundsY) { pos.current.y = boundsY; vel.current.y *= -0.85; }
      
      // Wall bounces
      if (pos.current.x > boundsX) { pos.current.x = boundsX; vel.current.x *= -0.85; }
      if (pos.current.x < -boundsX) { pos.current.x = -boundsX; vel.current.x *= -0.85; }
      
      // Z bounces
      if (pos.current.z > boundsZ) { pos.current.z = boundsZ; vel.current.z *= -0.85; }
      if (pos.current.z < -boundsZ) { pos.current.z = -boundsZ; vel.current.z *= -0.85; }
      
      meshRef.current.position.copy(pos.current);
    } else if (targetQuaternion) {
      // Smoothly interpolate to target rotation
      meshRef.current.quaternion.slerp(targetQuaternion, delta * 10);
      
      // Return to center
      meshRef.current.position.lerp(new THREE.Vector3(0, 0, 0), delta * 5);
    }
  });

  const diceColor = roller === 'player' ? '#dc2626' : '#171717';

  return (
    <Float speed={rolling ? 0 : 2} rotationIntensity={rolling ? 0 : 0.5} floatIntensity={rolling ? 0 : 0.5}>
      <mesh ref={meshRef} geometry={geometry} scale={[0.5, 0.5, 0.5]} castShadow receiveShadow>
        <meshStandardMaterial 
          color={diceColor}
          roughness={0.2}
          metalness={0.8}
          flatShading
        />
        {faceData.map((face, i) => {
          const isResult = !rolling && result === face.value;
          // Position text slightly outside the face
          const textPos = face.center.clone().multiplyScalar(isResult ? 1.05 : 1.01);
          // Orient text to face outward
          const quaternion = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), face.normal);
          
          let textColor = roller === 'player' ? "#fecaca" : "#d4d4d8";
          if (isResult) textColor = "#fbbf24";
          
          return (
            <Text
              key={i}
              position={textPos}
              quaternion={quaternion}
              fontSize={isResult ? 0.6 : 0.4}
              color={textColor}
              anchorX="center"
              anchorY="middle"
              outlineWidth={isResult ? 0.02 : 0}
              outlineColor="#000000"
            >
              {face.value}
            </Text>
          );
        })}
      </mesh>
    </Float>
  );
};

export default function Dice3D({ rolling, result, roller, type = 'd20', onRollComplete }: DiceProps) {
  return (
    <div className="absolute inset-0 pointer-events-none z-50 flex items-center justify-center">
      <div className="w-full max-w-full h-full pointer-events-none">
        <Canvas camera={{ position: [0, 0, 6], fov: 45 }} style={{ pointerEvents: 'none', width: '100%', height: '100%' }}>
          <Suspense fallback={null}>
            <ambientLight intensity={0.8} />
            <directionalLight position={[10, 10, 10]} intensity={2} castShadow />
            <directionalLight position={[-10, -10, -10]} intensity={1} />
            <GameDice rolling={rolling} result={result} roller={roller} type={type} onRollComplete={onRollComplete} />
          </Suspense>
        </Canvas>
      </div>
    </div>
  );
}
