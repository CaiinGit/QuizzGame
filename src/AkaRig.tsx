import { useEffect, useRef, useState, type CSSProperties } from "react";
import "./aka-rig.css";

export const AKA_PARTS = [
  "tail",
  "wingLeft",
  "wingRight",
  "body",
  "head",
  "eyes",
  "crown",
] as const;
export const akaPartUrl = (name: string) =>
  `/art/aka-rig-${["wingLeft", "wingRight"].includes(name) ? "v3" : ["head", "eyes"].includes(name) ? "v4" : "v5"}/${name}.webp`;

/** The original face turns as one layer; the cape/body is a single static sprite. */
export function AkaRig({
  step,
  reduced,
  arriving,
  look,
}: {
  step: number;
  reduced: boolean;
  arriving: boolean;
  look: { x: number; y: number };
}) {
  const root = useRef<HTMLDivElement>(null);
  const [hidden, setHidden] = useState(document.hidden);
  useEffect(() => {
    const update = () => setHidden(document.hidden);
    document.addEventListener("visibilitychange", update);
    return () => document.removeEventListener("visibilitychange", update);
  }, []);
  const paused = reduced || hidden;
  useEffect(() => {
    if (paused) return;
    let timer: ReturnType<typeof setTimeout>;
    let animation: Animation | undefined;
    let alive = true;
    const schedule = () => {
      timer = setTimeout(
        () => {
          const eyes = root.current?.querySelector(".aka-eyelids");
          animation = eyes?.animate(
            [
              { transform: "scaleY(1)" },
              { offset: 0.3, transform: "scaleY(.5)" },
              { offset: 0.5, transform: "scaleY(.06)" },
              { offset: 0.72, transform: "scaleY(.5)" },
              { transform: "scaleY(1)" },
            ],
            { duration: 220, easing: "linear" },
          );
          if (alive) schedule();
        },
        2800 + Math.random() * 3800,
      );
    };
    schedule();
    return () => {
      alive = false;
      clearTimeout(timer);
      animation?.cancel();
    };
  }, [paused]);
  const gaze = step === 0 || arriving ? { x: 0, y: 0 } : look;
  const poseStyle = {
    "--aka-yaw": `${gaze.x * 16}deg`,
    "--aka-pitch": `${-gaze.y * 13}deg`,
    "--aka-tilt": `${gaze.x * 7}deg`,
    "--aka-eye-x": `${gaze.x * 2}%`,
    "--aka-eye-y": `${gaze.y * 2}%`,
  } as CSSProperties;
  return (
    <div
      ref={root}
      className={`aka-rig ${paused ? "aka-rig-paused" : ""} ${arriving ? "aka-rig-arriving" : ""}`}
      role="img"
      aria-label="Aka, le petit esprit ailé qui te guide"
    >
      <div className="aka-part aka-tail">
        <img src={akaPartUrl("tail")} alt="" draggable={false} />
      </div>
      <div className="aka-part aka-wing-left">
        <img src={akaPartUrl("wingLeft")} alt="" draggable={false} />
      </div>
      <div className="aka-part aka-wing-right">
        <img src={akaPartUrl("wingRight")} alt="" draggable={false} />
      </div>
      <div className="aka-part aka-body">
        <img src={akaPartUrl("body")} alt="" draggable={false} />
      </div>
      <div
        className="aka-head-pose"
        style={poseStyle}
        data-look-x={gaze.x}
        data-look-y={gaze.y}
      >
        <div className="aka-part aka-head">
          <img src={akaPartUrl("head")} alt="" draggable={false} />
        </div>
        <div className="aka-part aka-eyes">
          <div className="aka-eyelids">
            <img src={akaPartUrl("eyes")} alt="" draggable={false} />
          </div>
        </div>
      </div>
      <div className="aka-part aka-crown">
        <img src={akaPartUrl("crown")} alt="" draggable={false} />
      </div>
    </div>
  );
}
