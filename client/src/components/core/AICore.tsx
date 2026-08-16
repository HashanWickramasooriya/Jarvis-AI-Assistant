import { Suspense, useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { AssistantStatus } from "../../types";

const STATUS_COLOR: Record<AssistantStatus, string> = {
  idle: "#2bb7ff",
  listening: "#7debff",
  processing: "#4da6ff",
  thinking: "#4debff",
  speaking: "#9ff2ff",
  error: "#ff5c5c",
  offline: "#4a545c",
};

function useLerpColor(hex: string) {
  return useMemo(() => new THREE.Color(hex), [hex]);
}

interface SceneProps {
  status: AssistantStatus;
  level: number;
}

function ParticleField({ status }: { status: AssistantStatus }) {
  const pointsRef = useRef<THREE.Points>(null);
  const count = 140;
  const positions = useMemo(() => {
    const arr = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const radius = 2.1 + Math.random() * 0.6;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      arr[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
      arr[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
      arr[i * 3 + 2] = radius * Math.cos(phi);
    }
    return arr;
  }, []);

  useFrame((state, delta) => {
    if (!pointsRef.current) return;
    const speed = status === "offline" ? 0 : status === "thinking" || status === "processing" ? 0.06 : 0.02;
    pointsRef.current.rotation.y += delta * speed;
    pointsRef.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.1) * 0.1;
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial
        size={0.02}
        color={STATUS_COLOR[status]}
        transparent
        opacity={status === "offline" ? 0.15 : 0.5}
        sizeAttenuation
      />
    </points>
  );
}

/** Radar-style scanning arc that sweeps continuously around the core. */
function ScanArc({ status }: { status: AssistantStatus }) {
  const arcRef = useRef<THREE.Mesh>(null);
  useFrame((_state, delta) => {
    if (!arcRef.current) return;
    const offline = status === "offline";
    const speed = offline ? 0 : status === "thinking" || status === "processing" ? 1.4 : 0.55;
    arcRef.current.rotation.z -= delta * speed;
  });

  return (
    <mesh ref={arcRef} rotation={[Math.PI / 2, 0, 0]}>
      <ringGeometry args={[1.32, 1.36, 48, 1, 0, Math.PI / 3]} />
      <meshBasicMaterial
        color={STATUS_COLOR[status]}
        transparent
        opacity={status === "offline" ? 0.06 : 0.4}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}

function CoreScene({ status, level }: SceneProps) {
  const coreRef = useRef<THREE.Mesh>(null);
  const innerRef = useRef<THREE.Mesh>(null);
  const ring1Ref = useRef<THREE.Mesh>(null);
  const ring2Ref = useRef<THREE.Mesh>(null);
  const ring3Ref = useRef<THREE.Mesh>(null);
  const gridRef = useRef<THREE.Mesh>(null);
  const color = useLerpColor(STATUS_COLOR[status]);

  useFrame((state, delta) => {
    const t = state.clock.elapsedTime;
    const offline = status === "offline";

    if (coreRef.current) {
      let scale = 1;
      if (offline) scale = 0.85;
      else if (status === "idle") scale = 1 + Math.sin(t * 1.1) * 0.035;
      else if (status === "listening") scale = 1 + level * 0.32 + Math.sin(t * 6) * 0.025;
      else if (status === "thinking") scale = 1 + Math.sin(t * 3.2) * 0.05;
      else if (status === "speaking") scale = 1 + level * 0.28;
      else if (status === "processing") scale = 1 + Math.sin(t * 8) * 0.04;
      else if (status === "error") scale = 1 + Math.sin(t * 16) * 0.07;
      coreRef.current.scale.setScalar(scale);

      const mat = coreRef.current.material as THREE.MeshStandardMaterial;
      mat.color.lerp(color, 0.08);
      mat.emissive.lerp(color, 0.08);
      mat.emissiveIntensity = offline ? 0.15 : status === "error" ? 0.9 : 0.55;
    }

    if (innerRef.current) {
      innerRef.current.rotation.y += delta * (offline ? 0.02 : 0.3);
      innerRef.current.rotation.x += delta * (offline ? 0.01 : 0.18);
      const mat = innerRef.current.material as THREE.MeshBasicMaterial;
      mat.color.lerp(color, 0.08);
    }

    const baseRingSpeed = offline ? 0.05 : status === "thinking" ? 1.6 : status === "processing" ? 2.4 : 0.4;
    if (ring1Ref.current) ring1Ref.current.rotation.z += delta * baseRingSpeed;
    if (ring2Ref.current) ring2Ref.current.rotation.z -= delta * baseRingSpeed * 0.65;
    if (ring3Ref.current) ring3Ref.current.rotation.y += delta * baseRingSpeed * 0.4;

    if (gridRef.current) {
      gridRef.current.rotation.z += delta * (offline ? 0 : 0.05);
      const mat = gridRef.current.material as THREE.MeshBasicMaterial;
      mat.opacity = offline ? 0.05 : 0.12;
    }
  });

  const opacity = status === "offline" ? 0.25 : 1;

  return (
    <group>
      <ambientLight intensity={0.35} />
      <pointLight position={[2, 2, 3]} intensity={1.1} color={STATUS_COLOR[status]} />
      <pointLight position={[-2, -1, -2]} intensity={0.3} color="#9fb4c2" />

      {/* Core wireframe icosahedron */}
      <mesh ref={coreRef}>
        <icosahedronGeometry args={[1, 2]} />
        <meshStandardMaterial
          color={STATUS_COLOR[status]}
          emissive={STATUS_COLOR[status]}
          emissiveIntensity={0.55}
          roughness={0.3}
          metalness={0.5}
          wireframe
          transparent
          opacity={opacity}
        />
      </mesh>

      {/* Inner luminous core */}
      <mesh ref={innerRef}>
        <octahedronGeometry args={[0.45, 0]} />
        <meshBasicMaterial color={STATUS_COLOR[status]} transparent opacity={0.35 * opacity} />
      </mesh>

      {/* Orbital rings */}
      <mesh ref={ring1Ref} rotation={[Math.PI / 2.3, 0, 0]}>
        <torusGeometry args={[1.55, 0.008, 8, 128]} />
        <meshBasicMaterial color={STATUS_COLOR[status]} transparent opacity={0.55 * opacity} />
      </mesh>
      <mesh ref={ring2Ref} rotation={[Math.PI / 1.9, 0.3, 0]}>
        <torusGeometry args={[1.85, 0.006, 8, 128]} />
        <meshBasicMaterial color={STATUS_COLOR[status]} transparent opacity={0.32 * opacity} />
      </mesh>
      <mesh ref={ring3Ref} rotation={[0.2, Math.PI / 2, 0.4]}>
        <torusGeometry args={[2.1, 0.004, 8, 128]} />
        <meshBasicMaterial color="#9fb4c2" transparent opacity={0.2 * opacity} />
      </mesh>

      {/* Fine technical grid ring */}
      <mesh ref={gridRef} rotation={[Math.PI / 2, 0, 0]}>
        <ringGeometry args={[1.25, 1.27, 64, 1]} />
        <meshBasicMaterial color={STATUS_COLOR[status]} transparent opacity={0.12 * opacity} side={THREE.DoubleSide} />
      </mesh>

      {/* Radial scanning arc */}
      <ScanArc status={status} />

      <ParticleField status={status} />
    </group>
  );
}

interface AICoreProps {
  status: AssistantStatus;
  level: number;
}

export function AICore({ status, level }: AICoreProps) {
  return (
    <div className="relative aspect-square w-full mx-auto" style={{ maxWidth: "clamp(160px, 55vw, 440px)" }}>
      <Canvas camera={{ position: [0, 0, 4.2], fov: 45 }} dpr={[1, 1.5]} gl={{ antialias: true, alpha: true }}>
        <Suspense fallback={null}>
          <CoreScene status={status} level={level} />
        </Suspense>
      </Canvas>
    </div>
  );
}
