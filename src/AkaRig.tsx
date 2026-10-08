import { useEffect, useRef, useState } from "react";
import "./aka-rig.css";

export const AKA_PARTS = [
  "tail",
  "wingLeft",
  "wingRight",
  "cape",
  "armLeft",
  "armRight",
  "body",
  "eyes",
  "crown",
] as const;
export const akaPartUrl = (name: string) => `/art/aka-rig-v3/${name}.webp`;

/** Back-to-front order is anatomical: cape, arms, then torso hiding shoulder seams. */
export function AkaRig({
  step,
  reduced,
  arriving,
  direction,
}: {
  step: number;
  reduced: boolean;
  arriving: boolean;
  direction: "left" | "right";
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
  useEffect(() => {
    if (paused || arriving || step === 0) return;
    const arm = root.current?.querySelector(
      direction === "left" ? ".aka-arm-left-gesture" : ".aka-arm-right-gesture",
    );
    const cape = root.current?.querySelector(".aka-cape-gesture");
    const sign = direction === "left" ? 1 : -1;
    // Cape opens first; the arm then rises from the uncovered shoulder in front.
    const fabric = cape?.animate(
      [
        { transform: "scaleX(1) rotate(0deg)" },
        { offset: 0.16, transform: `scaleX(.92) rotate(${sign * 3}deg)` },
        { offset: 0.75, transform: `scaleX(.92) rotate(${sign * 3}deg)` },
        { transform: "scaleX(1) rotate(0deg)" },
      ],
      { duration: 1800, easing: "ease-in-out" },
    );
    const gesture = arm?.animate(
      [
        { transform: "rotate(0deg)" },
        { offset: 0.16, transform: "rotate(0deg)" },
        { offset: 0.42, transform: `rotate(${sign * 65}deg)` },
        { offset: 0.68, transform: `rotate(${sign * 62}deg)` },
        { transform: "rotate(0deg)" },
      ],
      { duration: 1800, easing: "ease-in-out" },
    );
    return () => {
      fabric?.cancel();
      gesture?.cancel();
    };
  }, [step, direction, paused, arriving]);
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
      <div className="aka-part aka-cape">
        <div className="aka-cape-gesture">
          <img src={akaPartUrl("cape")} alt="" draggable={false} />
        </div>
      </div>
      <div className="aka-part aka-arm-left">
        <div className="aka-arm-left-gesture">
          <img src={akaPartUrl("armLeft")} alt="" draggable={false} />
        </div>
      </div>
      <div className="aka-part aka-arm-right">
        <div className="aka-arm-right-gesture">
          <img src={akaPartUrl("armRight")} alt="" draggable={false} />
        </div>
      </div>
      <div className="aka-part aka-body">
        <img src={akaPartUrl("body")} alt="" draggable={false} />
      </div>
      <div className="aka-part aka-eyes">
        <div className="aka-eyelids">
          <img src={akaPartUrl("eyes")} alt="" draggable={false} />
        </div>
      </div>
      <div className="aka-part aka-crown">
        <img src={akaPartUrl("crown")} alt="" draggable={false} />
      </div>
    </div>
  );
}
