// holoMaterial.js
//
// Matériau holographique posé en calque additif juste devant le recto d'une
// carte (Card3D). L'effet dépend de l'orientation de la carte par rapport à
// la caméra, comme une vraie carte holo qu'on incline :
//   - bandes arc-en-ciel qui défilent quand la carte tourne
//   - fines stries diagonales scintillantes
//   - reflet blanc qui balaie la carte
//   - étincelles ponctuelles qui clignotent selon l'angle
// L'effet est modulé par la luminance de l'image (plus fort sur les zones
// claires) pour ne pas noyer le texte sombre.

import { AdditiveBlending, ShaderMaterial } from "three";

const vertexShader = /* glsl */ `
  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vViewPosition;

  void main() {
    vUv = uv;
    vNormal = normalize(normalMatrix * normal);
    vec4 viewPosition = modelViewMatrix * vec4(position, 1.0);
    vViewPosition = viewPosition.xyz;
    gl_Position = projectionMatrix * viewPosition;
  }
`;

const fragmentShader = /* glsl */ `
  uniform sampler2D uMap;
  uniform float uTime;
  uniform float uStrength;

  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vViewPosition;

  vec3 hsv2rgb(vec3 c) {
    vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
    vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
    return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
  }

  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
  }

  void main() {
    // Inclinaison de la carte vue depuis la caméra (0 quand elle est de face),
    // plus une variation selon la position du point regardé.
    vec2 tilt = normalize(vNormal).xy;
    vec3 viewDir = normalize(-vViewPosition);

    float bands = vUv.x * 1.1 + vUv.y * 0.7
      + tilt.x * 2.5 - tilt.y * 1.5
      + viewDir.x * 0.8
      + uTime * 0.02;
    vec3 rainbow = hsv2rgb(vec3(fract(bands), 0.75, 1.0));

    float shimmer = 0.5 + 0.5 * sin((vUv.x - vUv.y) * 40.0 + tilt.x * 18.0);

    float glarePos = vUv.x + vUv.y * 0.35 - 0.65 - tilt.x * 2.2 + tilt.y * 0.8;
    float glare = smoothstep(0.22, 0.0, abs(glarePos));

    // Étincelles : une cellule sur ~100 porte un point lumineux rond avec une
    // petite croix de reflet, qui clignote selon l'angle et le temps.
    vec2 grid = vUv * vec2(45.0, 63.0);
    float h = hash(floor(grid));
    vec2 local = fract(grid) - 0.5;
    float glint = smoothstep(0.3, 0.0, length(local))
      + 0.6 * smoothstep(0.06, 0.0, abs(local.x)) * smoothstep(0.5, 0.0, abs(local.y))
      + 0.6 * smoothstep(0.06, 0.0, abs(local.y)) * smoothstep(0.5, 0.0, abs(local.x));
    float sparkleDensity = mix(0.99, 0.97, uStrength);
    float twinkle = pow(0.5 + 0.5 * sin(h * 60.0 + tilt.x * 25.0 + uTime * 2.0), 8.0);
    float sparkle = step(sparkleDensity, h) * twinkle * glint;

    vec3 base = texture2D(uMap, vUv).rgb;
    float luminance = dot(base, vec3(0.299, 0.587, 0.114));
    float mask = 0.3 + 0.7 * luminance;

    vec3 color = rainbow * (0.2 + 0.28 * shimmer) * mask
      + vec3(1.0) * glare * 0.3 * mask
      + vec3(1.0) * sparkle * 0.9;

    gl_FragColor = vec4(color * uStrength, 1.0);
  }
`;

export function createHoloMaterial(map, strength) {
  return new ShaderMaterial({
    uniforms: {
      uMap: { value: map },
      uTime: { value: 0 },
      uStrength: { value: strength },
    },
    vertexShader,
    fragmentShader,
    transparent: true,
    blending: AdditiveBlending,
    depthWrite: false,
    toneMapped: false,
  });
}
