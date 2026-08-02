import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { VRMLoaderPlugin, VRMUtils } from "@pixiv/three-vrm";

const canvas = document.getElementById("vrmCanvas");
const stage = document.getElementById("avatarStage");

let renderer;
let scene;
let camera;
let clock;
let currentVrm = null;
let currentCharacterId = "";
let loadingToken = 0;
let voiceLevel = 0;
let targetVoiceLevel = 0;
let laughActive = false;
let stageVisible = false;
let blinkValue = 0;
let blinkState = "waiting";
let nextBlinkAt = performance.now() + 1800;
let headBone = null;
let neckBone = null;
let leftEyeBone = null;
let rightEyeBone = null;
let leftEyeBase = null;
let rightEyeBase = null;
let upperChestBone = null;
let leftUpperArmBone = null;
let rightUpperArmBone = null;
let leftLowerArmBone = null;
let rightLowerArmBone = null;
let leftUpperArmBase = null;
let rightUpperArmBase = null;
let leftLowerArmBase = null;
let rightLowerArmBase = null;
let headBase = null;
let neckBase = null;

function dispatch(name, detail = {}) {
  window.dispatchEvent(new CustomEvent(name, { detail }));
}

function initRenderer() {
  if (renderer) return;

  renderer = new THREE.WebGLRenderer({
    canvas,
    alpha: true,
    antialias: true,
    powerPreference: "high-performance"
  });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.65));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.shadowMap.enabled = false;

  scene = new THREE.Scene();

  camera = new THREE.PerspectiveCamera(28, 1, 0.05, 40);
  camera.position.set(0, 1.35, 1.7);

  scene.add(new THREE.HemisphereLight(0xffffff, 0x30385b, 2.4));

  const key = new THREE.DirectionalLight(0xffffff, 2.15);
  key.position.set(1.7, 2.4, 2.3);
  scene.add(key);

  const fill = new THREE.DirectionalLight(0xa5b5ff, 1.35);
  fill.position.set(-2.2, 1.5, 1.3);
  scene.add(fill);

  const rim = new THREE.DirectionalLight(0xd39cff, 0.8);
  rim.position.set(0, 2.2, -2);
  scene.add(rim);

  clock = new THREE.Clock();
  resizeRenderer();
  animate();
}

function resizeRenderer() {
  if (!renderer || !stage) return;
  const width = Math.max(1, stage.clientWidth);
  const height = Math.max(1, stage.clientHeight);
  renderer.setSize(width, height, false);
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
}

function clearCurrentVrm() {
  if (!currentVrm) return;
  scene.remove(currentVrm.scene);
  currentVrm.scene.traverse((object) => {
    object.geometry?.dispose?.();
    const materials = Array.isArray(object.material) ? object.material : [object.material];
    materials.filter(Boolean).forEach((material) => material.dispose?.());
  });
  currentVrm = null;
  headBone = null;
  neckBone = null;
  leftEyeBone = null;
  rightEyeBone = null;
  leftEyeBase = null;
  rightEyeBase = null;
  upperChestBone = null;
  leftUpperArmBone = null;
  rightUpperArmBone = null;
  leftLowerArmBone = null;
  rightLowerArmBone = null;
  leftUpperArmBase = null;
  rightUpperArmBase = null;
  leftLowerArmBase = null;
  rightLowerArmBase = null;
  headBase = null;
  neckBase = null;
}

function base64ToArrayBuffer(value) {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}

function finishLoad(gltf, character, token) {
  if (token !== loadingToken) return;

  clearCurrentVrm();
  currentVrm = gltf.userData.vrm;

  if (!currentVrm) {
    dispatch("rivo:vrm-error", { reason: "invalid-vrm" });
    return;
  }

  VRMUtils.rotateVRM0(currentVrm);
  currentCharacterId = character.id;
  scene.add(currentVrm.scene);

  currentVrm.scene.traverse((object) => {
    object.frustumCulled = false;
  });

  headBone = currentVrm.humanoid?.getNormalizedBoneNode("head") || null;
  neckBone = currentVrm.humanoid?.getNormalizedBoneNode("neck") || null;
  leftEyeBone = currentVrm.humanoid?.getNormalizedBoneNode("leftEye") || null;
  rightEyeBone = currentVrm.humanoid?.getNormalizedBoneNode("rightEye") || null;
  leftEyeBase = leftEyeBone?.rotation.clone() || null;
  rightEyeBase = rightEyeBone?.rotation.clone() || null;
  upperChestBone = currentVrm.humanoid?.getNormalizedBoneNode("upperChest") ||
    currentVrm.humanoid?.getNormalizedBoneNode("chest") ||
    null;
  leftUpperArmBone = currentVrm.humanoid?.getNormalizedBoneNode("leftUpperArm") || null;
  rightUpperArmBone = currentVrm.humanoid?.getNormalizedBoneNode("rightUpperArm") || null;
  leftLowerArmBone = currentVrm.humanoid?.getNormalizedBoneNode("leftLowerArm") || null;
  rightLowerArmBone = currentVrm.humanoid?.getNormalizedBoneNode("rightLowerArm") || null;

  headBase = headBone?.rotation.clone() || null;
  neckBase = neckBone?.rotation.clone() || null;
  leftUpperArmBase = leftUpperArmBone?.rotation.clone() || null;
  rightUpperArmBase = rightUpperArmBone?.rotation.clone() || null;
  leftLowerArmBase = leftLowerArmBone?.rotation.clone() || null;
  rightLowerArmBase = rightLowerArmBone?.rotation.clone() || null;

  applyRelaxedPose();
  currentVrm.update(0);
  currentVrm.scene.updateMatrixWorld(true);
  frameUpperBody();
  dispatch("rivo:vrm-ready", { characterId: character.id });
}

async function loadCharacter(character) {
  if (!character?.model) {
    dispatch("rivo:vrm-error", { reason: "missing-model", characterId: character?.id || "" });
    return;
  }

  if (currentVrm && currentCharacterId === character.id) {
    dispatch("rivo:vrm-ready", { characterId: character.id });
    return;
  }

  initRenderer();
  const token = ++loadingToken;

  // Never leave the previously loaded character (usually Lina) visible while
  // a different selected model is loading or if that model fails on mobile.
  if (currentVrm && currentCharacterId !== character.id) {
    clearCurrentVrm();
    currentCharacterId = "";
    if (renderer && scene && camera) renderer.render(scene, camera);
  }

  dispatch("rivo:vrm-loading", { characterId: character.id });

  const loader = new GLTFLoader();
  loader.register((parser) => new VRMLoaderPlugin(parser));

  try {
    const embedded = window.RIVO_EMBEDDED_MODELS?.[character.id];

    if (location.protocol === "file:" && embedded) {
      loader.parse(
        base64ToArrayBuffer(embedded),
        "",
        (gltf) => finishLoad(gltf, character, token),
        (error) => {
          console.error("Embedded VRM parse error", error);
          dispatch("rivo:vrm-error", { reason: "parse-error", characterId: character.id });
        }
      );
      return;
    }

    loader.load(
      character.model,
      (gltf) => finishLoad(gltf, character, token),
      undefined,
      (error) => {
        console.error("VRM load error", error);
        dispatch("rivo:vrm-error", { reason: "load-error", characterId: character.id });
      }
    );
  } catch (error) {
    console.error("VRM startup error", error);
    dispatch("rivo:vrm-error", { reason: "startup-error", characterId: character.id });
  }
}

function frameUpperBody() {
  if (!currentVrm) return;

  currentVrm.scene.updateMatrixWorld(true);

  const box = new THREE.Box3().setFromObject(currentVrm.scene);
  const modelHeight = Math.max(0.1, box.max.y - box.min.y);

  const head = new THREE.Vector3(0, box.max.y - modelHeight * 0.10, 0);
  const chest = new THREE.Vector3(0, head.y - modelHeight * 0.20, 0);

  if (headBone) headBone.getWorldPosition(head);
  if (upperChestBone) upperChestBone.getWorldPosition(chest);

  // Aim between the face and upper chest so the full head and shoulders stay visible.
  const target = head.clone().lerp(chest, 0.30);
  target.y += modelHeight * 0.018;

  const distance = Math.max(1.02, modelHeight * 0.74);
  camera.fov = 25;
  camera.position.set(target.x, target.y + modelHeight * 0.015, head.z + distance);
  camera.lookAt(target.x, target.y, head.z);
  camera.updateProjectionMatrix();
}

function applyRelaxedPose() {
  // Normalized VRM arms start in a T-pose.
  // Left arm needs negative Z and right arm positive Z to move downward.
  if (leftUpperArmBone && leftUpperArmBase) {
    leftUpperArmBone.rotation.x = leftUpperArmBase.x + 0.04;
    leftUpperArmBone.rotation.y = leftUpperArmBase.y;
    leftUpperArmBone.rotation.z = -1.08;
  }

  if (rightUpperArmBone && rightUpperArmBase) {
    rightUpperArmBone.rotation.x = rightUpperArmBase.x + 0.04;
    rightUpperArmBone.rotation.y = rightUpperArmBase.y;
    rightUpperArmBone.rotation.z = 1.08;
  }

  // Slight elbow bend keeps the hands from looking rigid.
  if (leftLowerArmBone && leftLowerArmBase) {
    leftLowerArmBone.rotation.x = leftLowerArmBase.x;
    leftLowerArmBone.rotation.y = leftLowerArmBase.y - 0.10;
    leftLowerArmBone.rotation.z = leftLowerArmBase.z - 0.10;
  }

  if (rightLowerArmBone && rightLowerArmBase) {
    rightLowerArmBone.rotation.x = rightLowerArmBase.x;
    rightLowerArmBone.rotation.y = rightLowerArmBase.y + 0.10;
    rightLowerArmBone.rotation.z = rightLowerArmBase.z + 0.10;
  }
}

function setExpression(name, value) {
  const manager = currentVrm?.expressionManager;
  if (!manager) return;
  try {
    manager.setValue(name, THREE.MathUtils.clamp(value, 0, 1));
  } catch {}
}

function updateBlink(now, delta) {
  if (blinkState === "waiting" && now >= nextBlinkAt) {
    blinkState = "closing";
  }

  if (blinkState === "closing") {
    blinkValue = Math.min(1, blinkValue + delta * 12);
    if (blinkValue >= 1) blinkState = "opening";
  } else if (blinkState === "opening") {
    blinkValue = Math.max(0, blinkValue - delta * 10);
    if (blinkValue <= 0) {
      blinkState = "waiting";
      nextBlinkAt = now + 1800 + Math.random() * 3200;
    }
  }

  const blink = laughActive ? Math.max(blinkValue, 0.74) : blinkValue;
  setExpression("blink", blink);
  setExpression("blinkLeft", blink);
  setExpression("blinkRight", blink);
}

function animate() {
  requestAnimationFrame(animate);
  if (!renderer || !scene || !camera) return;

  const delta = Math.min(clock.getDelta(), 0.05);
  const now = performance.now();
  updateBlink(now, delta);

  if (currentVrm) {
    const response = targetVoiceLevel > voiceLevel ? 0.42 : 0.20;
    voiceLevel = THREE.MathUtils.lerp(voiceLevel, targetVoiceLevel, response);
    if (targetVoiceLevel < 0.008 && voiceLevel < 0.009) voiceLevel = 0;
    const mouth = THREE.MathUtils.clamp(Math.pow(voiceLevel * 3.15, 0.62), 0, 1);
    const vowels = ["aa", "ih", "ou", "ee", "oh"];
    const vowelPhase = Math.floor(now / 105) % vowels.length;

    vowels.forEach((name, index) => {
      setExpression(name, index === vowelPhase ? mouth : 0);
    });

    setExpression("happy", laughActive ? 0.96 : Math.min(0.16, mouth * 0.1));

    if (headBone && headBase) {
      headBone.rotation.x = headBase.x - mouth * 0.075 + Math.sin(now * 0.00072) * 0.018;
      headBone.rotation.y = headBase.y + Math.sin(now * 0.00043) * 0.055;
      headBone.rotation.z = headBase.z + (laughActive ? Math.sin(now * 0.019) * 0.028 : 0);
    }

    if (neckBone && neckBase) {
      neckBone.rotation.x = neckBase.x + Math.sin(now * 0.0005) * 0.020;
      neckBone.rotation.y = neckBase.y + Math.sin(now * 0.00031) * 0.030;
      neckBone.rotation.z = neckBase.z + Math.sin(now * 0.00039) * 0.01;
    }

    const gazeX = Math.sin(now * 0.00062) * 0.035;
    const gazeY = Math.sin(now * 0.00041) * 0.022 - mouth * 0.012;

    if (leftEyeBone && leftEyeBase) {
      leftEyeBone.rotation.x = leftEyeBase.x + gazeY;
      leftEyeBone.rotation.y = leftEyeBase.y + gazeX;
    }

    if (rightEyeBone && rightEyeBase) {
      rightEyeBone.rotation.x = rightEyeBase.x + gazeY;
      rightEyeBone.rotation.y = rightEyeBase.y + gazeX;
    }

    applyRelaxedPose();
    currentVrm.update(delta);
  }

  if (stageVisible) renderer.render(scene, camera);
}

window.addEventListener("rivo:stage-open", (event) => {
  stageVisible = true;
  const character = event.detail?.character || window.RIVO_ACTIVE_CHARACTER;
  loadCharacter(character);
  requestAnimationFrame(resizeRenderer);
  setTimeout(resizeRenderer, 180);
});

window.addEventListener("rivo:stage-close", () => {
  stageVisible = false;
});

window.addEventListener("rivo:character-selected", (event) => {
  const character = event.detail?.character;
  if (stageVisible && character) loadCharacter(character);
});

window.addEventListener("rivo:avatar-level", (event) => {
  targetVoiceLevel = Number(event.detail?.level || 0);
  laughActive = Boolean(event.detail?.laugh);
});

window.addEventListener("resize", resizeRenderer);
