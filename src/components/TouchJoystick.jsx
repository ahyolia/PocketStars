// TouchJoystick.jsx
//
// Joystick virtuel pour se déplacer sur écran tactile (pas de clavier) :
// un socle rond en bas à gauche, dont on fait glisser le bouton avec le
// pouce. Plus le bouton est loin du centre, plus on marche vite.
//
// La direction est écrite dans `inputRef.current` ({ x, y } dans [-1, 1],
// x vers la droite, y vers l'avant), lue à chaque image par
// CameraController : pas de rendu React pendant le geste.
//
// Props attendues :
//   - inputRef : ref partagée avec CameraController

import { useRef } from "react";
import "./TouchJoystick.css";

// Course maximale du bouton depuis le centre (px).
const MAX_DISTANCE = 44;

export default function TouchJoystick({ inputRef }) {
  const knobRef = useRef(null);
  const gestureRef = useRef(null); // { pointerId, centerX, centerY }

  const update = (clientX, clientY) => {
    const gesture = gestureRef.current;
    let dx = clientX - gesture.centerX;
    let dy = clientY - gesture.centerY;
    const distance = Math.hypot(dx, dy);
    if (distance > MAX_DISTANCE) {
      dx *= MAX_DISTANCE / distance;
      dy *= MAX_DISTANCE / distance;
    }
    knobRef.current.style.transform = `translate(${dx}px, ${dy}px)`;
    inputRef.current.x = dx / MAX_DISTANCE;
    inputRef.current.y = -dy / MAX_DISTANCE;
  };

  const release = (e) => {
    if (gestureRef.current?.pointerId !== e.pointerId) return;
    gestureRef.current = null;
    knobRef.current.style.transform = "";
    inputRef.current.x = 0;
    inputRef.current.y = 0;
  };

  return (
    <div
      className="touch-joystick"
      aria-hidden="true"
      onPointerDown={(e) => {
        if (gestureRef.current) return;
        e.currentTarget.setPointerCapture(e.pointerId);
        const rect = e.currentTarget.getBoundingClientRect();
        gestureRef.current = {
          pointerId: e.pointerId,
          centerX: rect.left + rect.width / 2,
          centerY: rect.top + rect.height / 2,
        };
        update(e.clientX, e.clientY);
      }}
      onPointerMove={(e) => {
        if (gestureRef.current?.pointerId === e.pointerId) update(e.clientX, e.clientY);
      }}
      onPointerUp={release}
      onPointerCancel={release}
    >
      <div ref={knobRef} className="touch-joystick__knob" />
    </div>
  );
}
