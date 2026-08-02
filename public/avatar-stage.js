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
let inputActive = false;
let lastSpeechAt = 0;
let laughActive = false;
let laughBlend = 0;
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
let upperChestBase = null;
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
  upperChestBase = null;
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

  // Always begin with a fully closed mouth.
  ["aa", "ih", "ou", "ee", "oh"].forEach((name) => setExpression(name, 0));
  setExpression("happy", 0);
  voiceLevel = 0;
  targetVoiceLevel = 0;
  inputActive = false;
  lastSpeechAt = 0;
  laughActive = false;
  laughBlend = 0;

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

function damp(current, target, smoothTime, delta) {
  const safeTime = Math.max(0.001, smoothTime);
  const factor = 1 - Math.exp(-delta / safeTime);
  return THREE.MathUtils.lerp(current, target, factor);
}

function dampRotation(bone, base, offsets, smoothTime, delta) {
  if (!bone || !base) return;
  bone.rotation.x = damp(bone.rotation.x, base.x + (offsets.x || 0), smoothTime, delta);
  bone.rotation.y = damp(bone.rotation.y, base.y + (offsets.y || 0), smoothTime, delta);
  bone.rotation.z = damp(bone.rotation.z, base.z + (offsets.z || 0), smoothTime, delta);
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

  // A laugh gently narrows the eyes instead of snapping them shut.
  const laughSquint = laughBlend * 0.52;
  const blink = Math.max(blinkValue, laughSquint);
  setExpression("blink", blink);
  setExpression("blinkLeft", blink);
  setExpression("blinkRight", blink);
}

function updateMouth(now, delta) {
  const hasRecentSpeech = inputActive && performance.now() - lastSpeechAt <= 150;
  const gatedTarget = hasRecentSpeech && targetVoiceLevel >= 0.050
    ? targetVoiceLevel
    : 0;

  const voiceSmooth = gatedTarget > voiceLevel ? 0.050 : 0.085;
  voiceLevel = damp(voiceLevel, gatedTarget, voiceSmooth, delta);
  if (gatedTarget === 0 && voiceLevel < 0.010) voiceLevel = 0;

  const speech = voiceLevel > 0
    ? THREE.MathUtils.clamp(Math.pow(voiceLevel * 1.72, 0.70), 0, 0.94)
    : 0;

  // Continuous vowel blending avoids the robotic "jump" between mouth shapes.
  const phase = now * 0.0062;
  const phase2 = now * 0.0041 + 0.9;
  const syllablePulse = 0.88 + Math.sin(now * 0.021) * 0.12;
  const talkingMouth = speech * syllablePulse;

  // During laughter the mouth follows the actual audio while the smile stays smooth.
  const laughPulse = 0.74 + Math.sin(now * 0.016) * 0.16;
  const laughMouth = voiceLevel > 0.018 ? laughBlend * speech * laughPulse : 0;
  const mouth = Math.max(talkingMouth, laughMouth);

  const a = 0.5 + 0.5 * Math.sin(phase);
  const b = 0.5 + 0.5 * Math.sin(phase + 2.10);
  const c = 0.5 + 0.5 * Math.sin(phase2 + 4.20);

  if (mouth <= 0.001) {
    ["aa", "ih", "ou", "ee", "oh"].forEach((name) => setExpression(name, 0));
  } else {
    setExpression("aa", mouth * (0.48 + 0.20 * c));
    setExpression("ih", mouth * (0.08 + 0.20 * (1 - a)));
    setExpression("ou", mouth * (0.06 + 0.18 * a));
    setExpression("ee", mouth * (0.05 + 0.16 * b));
    setExpression("oh", mouth * (0.07 + 0.18 * (1 - b)));
  }

  // Some VRM models expose "happy"; models that do not simply ignore it.
  setExpression("happy", laughBlend * 0.90);

  return {
    voice: voiceLevel,
    speech,
    mouth,
    speaking: mouth > 0.012
  };
}

function updateBody(now, delta, state) {
  const { speech, speaking } = state;
  const laughing = laughBlend > 0.015;

  if (!speaking && !laughing) {
    // Exact requested idle behaviour: mouth closed, body still, only blinking.
    dampRotation(headBone, headBase, { x: 0, y: 0, z: 0 }, 0.085, delta);
    dampRotation(neckBone, neckBase, { x: 0, y: 0, z: 0 }, 0.095, delta);
    dampRotation(upperChestBone, upperChestBase, { x: 0, y: 0, z: 0 }, 0.11, delta);

    if (leftEyeBone && leftEyeBase) {
      leftEyeBone.rotation.x = damp(leftEyeBone.rotation.x, leftEyeBase.x, 0.07, delta);
      leftEyeBone.rotation.y = damp(leftEyeBone.rotation.y, leftEyeBase.y, 0.07, delta);
      leftEyeBone.rotation.z = damp(leftEyeBone.rotation.z, leftEyeBase.z, 0.07, delta);
    }
    if (rightEyeBone && rightEyeBase) {
      rightEyeBone.rotation.x = damp(rightEyeBone.rotation.x, rightEyeBase.x, 0.07, delta);
      rightEyeBone.rotation.y = damp(rightEyeBone.rotation.y, rightEyeBase.y, 0.07, delta);
      rightEyeBone.rotation.z = damp(rightEyeBone.rotation.z, rightEyeBase.z, 0.07, delta);
    }
    return;
  }

  const talkNod = Math.sin(now * 0.0105) * speech;
  const talkTurn = Math.sin(now * 0.0038) * speech;
  const laughBounce = Math.sin(now * 0.0145) * laughBlend;
  const laughTilt = Math.sin(now * 0.0072 + 0.8) * laughBlend;

  dampRotation(
    headBone,
    headBase,
    {
      x: -speech * 0.055 + talkNod * 0.018 - laughBounce * 0.022,
      y: talkTurn * 0.027 + laughTilt * 0.014,
      z: laughTilt * 0.022
    },
    0.070,
    delta
  );

  dampRotation(
    neckBone,
    neckBase,
    {
      x: talkNod * 0.008 - laughBounce * 0.010,
      y: talkTurn * 0.012,
      z: laughTilt * 0.008
    },
    0.085,
    delta
  );

  dampRotation(
    upperChestBone,
    upperChestBase,
    {
      x: -speech * 0.010 + laughBounce * 0.008,
      y: talkTurn * 0.008,
      z: laughTilt * 0.006
    },
    0.11,
    delta
  );

  // The eyes make a very small, smooth conversational movement only while talking.
  const gazeX = Math.sin(now * 0.0031) * 0.018 * Math.max(speech, laughBlend);
  const gazeY = Math.sin(now * 0.0023 + 0.6) * 0.010 * Math.max(speech, laughBlend);

  if (leftEyeBone && leftEyeBase) {
    leftEyeBone.rotation.x = damp(leftEyeBone.rotation.x, leftEyeBase.x + gazeY, 0.10, delta);
    leftEyeBone.rotation.y = damp(leftEyeBone.rotation.y, leftEyeBase.y + gazeX, 0.10, delta);
  }
  if (rightEyeBone && rightEyeBase) {
    rightEyeBone.rotation.x = damp(rightEyeBone.rotation.x, rightEyeBase.x + gazeY, 0.10, delta);
    rightEyeBone.rotation.y = damp(rightEyeBone.rotation.y, rightEyeBase.y + gazeX, 0.10, delta);
  }
}

function animate() {
  requestAnimationFrame(animate);
  if (!renderer || !scene || !camera) return;

  const delta = Math.min(clock.getDelta(), 0.05);
  const now = performance.now();

  const laughTarget = laughActive ? 1 : 0;
  laughBlend = damp(laughBlend, laughTarget, laughTarget > laughBlend ? 0.14 : 0.28, delta);

  updateBlink(now, delta);

  if (currentVrm) {
    const mouthState = updateMouth(now, delta);
    updateBody(now, delta, mouthState);
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
  inputActive = false;
  targetVoiceLevel = 0;
  laughActive = false;
});

window.addEventListener("rivo:character-selected", (event) => {
  const character = event.detail?.character;
  if (stageVisible && character) loadCharacter(character);
});

window.addEventListener("rivo:avatar-level", (event) => {
  const level = THREE.MathUtils.clamp(Number(event.detail?.level || 0), 0, 1);
  inputActive = Boolean(event.detail?.active);
  targetVoiceLevel = inputActive ? level : 0;
  laughActive = inputActive && Boolean(event.detail?.laugh);
  if (inputActive && level >= 0.050) lastSpeechAt = performance.now();
});

window.addEventListener("resize", resizeRenderer);
