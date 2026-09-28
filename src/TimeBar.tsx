import { useEffect, useRef, type RefObject } from "react";

/** The display follows the server deadline every frame, without rerendering the quiz. */
export function TimeBar({
  deadline,
  duration,
  offset,
}: {
  deadline: number;
  duration: number;
  offset: RefObject<number>;
}) {
  const fill = useRef<HTMLDivElement>(null);
  const track = useRef<HTMLDivElement>(null);
  const remaining = () => Math.max(0, deadline - Date.now() - offset.current);
  useEffect(() => {
    let frame = 0;
    let lastSecond = -1;
    const draw = () => {
      const ms = Math.max(0, deadline - Date.now() - offset.current);
      if (fill.current)
        fill.current.style.transform = `scaleX(${Math.min(1, ms / Math.max(1, duration))})`;
      const second = Math.ceil(ms / 1000);
      if (second !== lastSecond) {
        track.current?.setAttribute(
          "aria-valuenow",
          String(Math.min(Math.ceil(duration / 1000), second)),
        );
        lastSecond = second;
      }
      frame = requestAnimationFrame(draw);
    };
    draw();
    return () => cancelAnimationFrame(frame);
  }, [deadline, duration, offset]);
  return (
    <div
      ref={track}
      className="time-track"
      role="progressbar"
      aria-label="Temps restant"
      aria-valuemin={0}
      aria-valuemax={Math.ceil(duration / 1000)}
      aria-valuenow={Math.min(
        Math.ceil(duration / 1000),
        Math.ceil(remaining() / 1000),
      )}
    >
      <div
        ref={fill}
        style={{
          transform: `scaleX(${Math.min(1, remaining() / Math.max(1, duration))})`,
        }}
      />
    </div>
  );
}
