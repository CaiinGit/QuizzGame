import { useEffect, useRef, useState } from "react";
import "./aka-rig.css";

export const AKA_PARTS = [
  "tail",
  "wingLeft",
  "wingRight",
  "torso",
  "arm",
  "capeLeft",
  "capeRight",
  "head",
  "eyes",
  "crown",
] as const;
export const akaPartUrl = (name: string) =>
  `/art/aka-rig-${["tail", "wingLeft", "wingRight", "crown"].includes(name) ? "v3" : "v4"}/${name}.webp`;

/** Arms stay behind the front cape. Only the selected panel opens for a gesture. */
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
    const cape = root.current?.querySelector(
      direction === "left"
        ? ".aka-cape-left-gesture"
        : ".aka-cape-right-gesture",
    );
    const sign = direction === "left" ? 1 : -1;
    // The selected cloth panel folds away before the oval arm emerges beneath its edge.
    const fabric = cape?.animate(
      [
        { transform: "scaleX(1) rotate(0deg)" },
        { offset: 0.16, transform: `scaleX(.62) rotate(${-sign * 10}deg)` },
        { offset: 0.75, transform: `scaleX(.62) rotate(${-sign * 10}deg)` },
        { transform: "scaleX(1) rotate(0deg)" },
      ],
      { duration: 1800, easing: "ease-in-out" },
    );
    const gesture = arm?.animate(
      [
        { transform: "translateX(0) rotate(0deg)", opacity: 0 },
        { offset: 0.16, transform: "translateX(0) rotate(0deg)", opacity: 0 },
        {
          offset: 0.25,
          transform: `translateX(0) rotate(${sign * 25}deg)`,
          opacity: 1,
        },
        {
          offset: 0.45,
          transform: `translateX(0) rotate(${sign * 70}deg)`,
          opacity: 1,
        },
        {
          offset: 0.65,
          transform: `translateX(0) rotate(${sign * 65}deg)`,
          opacity: 1,
        },
        { offset: 0.83, transform: "translateX(0) rotate(0deg)", opacity: 1 },
        { offset: 0.87, transform: "translateX(0) rotate(0deg)", opacity: 0 },
        { transform: "translateX(0) rotate(0deg)", opacity: 0 },
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
      <div className="aka-part aka-torso">
        <img src={akaPartUrl("torso")} alt="" draggable={false} />
      </div>
      <div className="aka-part aka-arm-left">
        <div className="aka-arm-left-gesture">
          <img src={akaPartUrl("arm")} alt="" draggable={false} />
        </div>
      </div>
      <div className="aka-part aka-arm-right">
        <div className="aka-arm-right-gesture">
          <img src={akaPartUrl("arm")} alt="" draggable={false} />
        </div>
      </div>
      <div className="aka-part aka-cape-left">
        <div className="aka-cape-left-gesture">
          <img src={akaPartUrl("capeLeft")} alt="" draggable={false} />
        </div>
      </div>
      <div className="aka-part aka-cape-right">
        <div className="aka-cape-right-gesture">
          <img src={akaPartUrl("capeRight")} alt="" draggable={false} />
        </div>
      </div>
      <div className="aka-part aka-head">
        <img src={akaPartUrl("head")} alt="" draggable={false} />
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
