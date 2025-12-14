import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';

export async function loadModel(path, scene, onProgress) {
  const loader = new GLTFLoader();
  
  const dracoLoader = new DRACOLoader();
  dracoLoader.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.6/');
  dracoLoader.setDecoderConfig({ type: 'js' });
  loader.setDRACOLoader(dracoLoader);

  return new Promise((resolve, reject) => {
    loader.load(
      path,
      (gltf) => {
        const model = gltf.scene;
        
        processModel(model);
        centerAndScaleModel(model);
        
        scene.add(model);
        
        dracoLoader.dispose();
        
        if (onProgress) onProgress(1);
        resolve(model);
      },
      (xhr) => {
        if (xhr.lengthComputable && onProgress) {
          onProgress(xhr.loaded / xhr.total);
        }
      },
      (error) => {
        dracoLoader.dispose();
        console.warn('Model loading failed:', error.message || error);
        
        const fallbackModel = createFallbackModel();
        processModel(fallbackModel);
        centerAndScaleModel(fallbackModel);
        scene.add(fallbackModel);
        
        if (onProgress) onProgress(1);
        resolve(fallbackModel);
      }
    );
  });
}

function processModel(model) {
  model.traverse((child) => {
    if (child.isMesh) {
      child.castShadow = true;
      child.receiveShadow = true;
      
      if (child.material) {
        processMaterial(child.material);
      }
      
      if (child.geometry) {
        child.geometry.computeBoundingBox();
        
        if (!child.geometry.attributes.normal) {
          child.geometry.computeVertexNormals();
        }
      }
    }
  });
}

function processMaterial(material) {
  if (Array.isArray(material)) {
    material.forEach(processSingleMaterial);
  } else {
    processSingleMaterial(material);
  }
}

function processSingleMaterial(material) {
  if (material.isMeshStandardMaterial || material.isMeshPhysicalMaterial) {
    material.envMapIntensity = 1.0;
    
    if (material.map) {
      material.map.colorSpace = THREE.SRGBColorSpace;
      ensureTextureSettings(material.map);
    }
    
    if (material.emissiveMap) {
      material.emissiveMap.colorSpace = THREE.SRGBColorSpace;
      ensureTextureSettings(material.emissiveMap);
    }
    
    if (material.normalMap) {
      material.normalMap.colorSpace = THREE.NoColorSpace;
      ensureTextureSettings(material.normalMap);
    }
    
    if (material.roughnessMap) {
      material.roughnessMap.colorSpace = THREE.NoColorSpace;
      ensureTextureSettings(material.roughnessMap);
    }
    
    if (material.metalnessMap) {
      material.metalnessMap.colorSpace = THREE.NoColorSpace;
      ensureTextureSettings(material.metalnessMap);
    }
    
    if (material.aoMap) {
      material.aoMap.colorSpace = THREE.NoColorSpace;
      ensureTextureSettings(material.aoMap);
    }
    
    material.needsUpdate = true;
  }
}

function ensureTextureSettings(texture) {
  if (!texture) return;
  
  texture.anisotropy = 16;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.generateMipmaps = true;
}

function centerAndScaleModel(model) {
  const box = new THREE.Box3().setFromObject(model);
  const center = box.getCenter(new THREE.Vector3());
  const size = box.getSize(new THREE.Vector3());
  
  const maxDimension = Math.max(size.x, size.y, size.z);
  const targetSize = 2;
  const scale = maxDimension > 0 ? targetSize / maxDimension : 1;
  
  model.position.sub(center);
  model.position.y += size.y * scale / 2;
  model.scale.multiplyScalar(scale);
  
  const newBox = new THREE.Box3().setFromObject(model);
  model.userData.boundingBox = newBox;
  model.userData.originalSize = size;
  model.userData.appliedScale = scale;
}

function createFallbackModel() {
  const group = new THREE.Group();
  
  const bodyGeometry = new THREE.CapsuleGeometry(0.3, 0.8, 8, 16);
  const bodyMaterial = new THREE.MeshStandardMaterial({
    color: 0x5a7a9a,
    roughness: 0.6,
    metalness: 0.1
  });
  const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
  body.position.y = 0.7;
  group.add(body);
  
  const headGeometry = new THREE.SphereGeometry(0.25, 16, 16);
  const headMaterial = new THREE.MeshStandardMaterial({
    color: 0xe0c8b0,
    roughness: 0.8,
    metalness: 0.0
  });
  const head = new THREE.Mesh(headGeometry, headMaterial);
  head.position.y = 1.5;
  group.add(head);
  
  const armGeometry = new THREE.CapsuleGeometry(0.08, 0.5, 4, 8);
  const armMaterial = bodyMaterial.clone();
  
  const leftArm = new THREE.Mesh(armGeometry, armMaterial);
  leftArm.position.set(-0.45, 0.85, 0);
  leftArm.rotation.z = Math.PI * 0.15;
  group.add(leftArm);
  
  const rightArm = new THREE.Mesh(armGeometry, armMaterial);
  rightArm.position.set(0.45, 0.85, 0);
  rightArm.rotation.z = -Math.PI * 0.15;
  group.add(rightArm);
  
  const legGeometry = new THREE.CapsuleGeometry(0.1, 0.5, 4, 8);
  const legMaterial = new THREE.MeshStandardMaterial({
    color: 0x3a4a5a,
    roughness: 0.7,
    metalness: 0.0
  });
  
  const leftLeg = new THREE.Mesh(legGeometry, legMaterial);
  leftLeg.position.set(-0.15, 0.05, 0);
  group.add(leftLeg);
  
  const rightLeg = new THREE.Mesh(legGeometry, legMaterial);
  rightLeg.position.set(0.15, 0.05, 0);
  group.add(rightLeg);
  
  return group;
}
