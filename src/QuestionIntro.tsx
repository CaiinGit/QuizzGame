import { useLayoutEffect, useRef, type RefObject } from "react";
import { createPortal } from "react-dom";
import { questionIntro } from "../shared/question-intro";
import "./question-intro.css";

/** Both clients follow the server's reading clock, including after reconnecting. */
export function QuestionIntro({
  text,
  startedAt,
  duration,
  offset,
  target,
}: {
  text: string;
  startedAt: number;
  duration: number;
  offset: RefObject<number>;
  target: RefObject<HTMLHeadingElement | null>;
}) {
  const heading = useRef<HTMLHeadingElement>(null);
  const backdrop = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const title = heading.current,
      shade = backdrop.current,
      destination = target.current;
    if (!title || !shade || !destination) return;
    window.scrollTo({ top: 0, behavior: "instant" });
    const oldOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let animations: Animation[] = [],
      frame = 0;
    const layout = () => {
      animations.forEach((animation) => animation.cancel());
      const rect = destination.getBoundingClientRect();
      const style = getComputedStyle(destination);
      const width = Math.min(760, window.innerWidth - 48);
      Object.assign(title.style, {
        width: `${width}px`,
        left: `${(window.innerWidth - width) / 2}px`,
        fontFamily: style.fontFamily,
        fontWeight: style.fontWeight,
        letterSpacing: style.letterSpacing,
        fontSize: "44px",
        lineHeight: "1.2",
      });
      // Shrink long questions on short phones; exceptionally long text can scroll.
      let size = 44;
      while (title.scrollHeight > window.innerHeight - 96 && size > 16) {
        size -= 1;
        title.style.fontSize = `${size}px`;
      }
      title.style.top = `${Math.max(24, (window.innerHeight - title.offsetHeight) / 2)}px`;
      const centered = {
        top: title.style.top,
        left: title.style.left,
        width: title.style.width,
        fontSize: title.style.fontSize,
        lineHeight: `${size * 1.2}px`,
      };
      const settled = reducedMotion.matches
        ? centered
        : {
            top: `${rect.top}px`,
            left: `${rect.left}px`,
            width: `${rect.width}px`,
            fontSize: style.fontSize,
            lineHeight: style.lineHeight,
          };
      const hold = Math.max(
        0,
        (duration - Math.min(questionIntro.transition, duration)) / duration,
      );
      const options = { duration, fill: "both" as const };
      animations = [
        title.animate(
          [
            { ...centered, offset: 0 },
            { ...centered, offset: hold, easing: "ease-in-out" },
            { ...settled, offset: 1 },
          ],
          options,
        ),
        shade.animate(
          [
            { opacity: 1, offset: 0 },
            { opacity: 1, offset: hold },
            { opacity: 0, offset: 1 },
          ],
          options,
        ),
      ];
      animations.forEach((animation) => {
        animation.pause();
        animation.currentTime = Math.max(
          0,
          Date.now() + offset.current - startedAt,
        );
      });
    };
    const draw = () => {
      const elapsed = Math.max(0, Date.now() + offset.current - startedAt);
      animations.forEach((animation) => {
        animation.currentTime = elapsed;
      });
      frame = requestAnimationFrame(draw);
    };
    layout();
    draw();
    window.addEventListener("resize", layout);
    reducedMotion.addEventListener("change", layout);
    return () => {
      cancelAnimationFrame(frame);
      animations.forEach((animation) => animation.cancel());
      window.removeEventListener("resize", layout);
      reducedMotion.removeEventListener("change", layout);
      document.body.style.overflow = oldOverflow;
    };
  }, [text, startedAt, duration, offset, target]);
  return createPortal(
    <div
      className="question-intro"
      role="status"
      aria-live="assertive"
      aria-atomic="true"
    >
      <div ref={backdrop} className="question-intro-backdrop" />
      <h2 ref={heading} className="question-intro-title">
        {text}
      </h2>
    </div>,
    document.body,
  );
}
