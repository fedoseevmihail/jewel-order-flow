import React, { Suspense, useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Center } from '@react-three/drei';
import * as THREE from 'three';
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader.js';

interface STLModelProps {
  geometry: THREE.BufferGeometry;
}

const STLModel: React.FC<STLModelProps> = ({ geometry }) => {
  const geo = useMemo(() => {
    geometry.computeBoundingBox();
    geometry.center();
    const box = geometry.boundingBox!;
    const size = new THREE.Vector3();
    box.getSize(size);
    const maxDim = Math.max(size.x, size.y, size.z);
    const scale = 2 / maxDim;
    geometry.scale(scale, scale, scale);
    return geometry;
  }, [geometry]);

  return (
    <Center>
      <mesh geometry={geo}>
        <meshStandardMaterial color="hsl(var(--primary))" metalness={0.3} roughness={0.6} />
      </mesh>
    </Center>
  );
};

interface STLViewerProps {
  url: string;
}

const STLViewer: React.FC<STLViewerProps> = ({ url }) => {
  const [geometry, setGeometry] = React.useState<THREE.BufferGeometry | null>(null);
  const [error, setError] = React.useState(false);

  React.useEffect(() => {
    const loader = new STLLoader();
    fetch(url)
      .then(res => res.blob())
      .then(blob => blob.arrayBuffer())
      .then(buffer => {
        const geo = loader.parse(buffer);
        setGeometry(geo);
      })
      .catch(() => setError(true));
  }, [url]);

  if (error) return <div className="flex items-center justify-center h-full text-muted-foreground">Не удалось загрузить модель</div>;
  if (!geometry) return <div className="flex items-center justify-center h-full text-muted-foreground">Загрузка модели...</div>;

  return (
    <Canvas camera={{ position: [3, 3, 3], fov: 50 }} style={{ background: 'hsl(var(--background))' }}>
      <ambientLight intensity={0.5} />
      <directionalLight position={[5, 5, 5]} intensity={1} />
      <directionalLight position={[-5, -5, -5]} intensity={0.3} />
      <Suspense fallback={null}>
        <STLModel geometry={geometry} />
      </Suspense>
      <OrbitControls autoRotate autoRotateSpeed={2} />
    </Canvas>
  );
};

export default STLViewer;
