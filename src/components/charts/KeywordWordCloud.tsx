"use client";

import * as d3 from "d3";
import Cloud from "d3-cloud";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";

type Word = {
  text: string;
  value: number;
};

type CloudWord = Word & {
  x: number;
  y: number;
  size: number;
  rotate: number;
};

type KeywordWordCloudProps = {
  words: Word[];
  maxWords?: number;
};

const FONT_FAMILY =
  "'Montserrat', 'Noto Sans Devanagari', sans-serif";

function useDimensions(targetRef: React.RefObject<HTMLDivElement | null>) {
  const getDimensions = useCallback(
    () => ({
      width: targetRef.current ? targetRef.current.offsetWidth : 0,
      height: targetRef.current ? targetRef.current.offsetHeight : 0,
    }),
    [targetRef],
  );

  const [dimensions, setDimensions] = useState(getDimensions);
  const handleResize = useCallback(
    () => setDimensions(getDimensions()),
    [getDimensions],
  );

  useEffect(() => {
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [handleResize]);

  useEffect(() => {
    const el = targetRef.current;
    if (!el) return;
    const ro = new ResizeObserver(handleResize);
    ro.observe(el);
    return () => ro.disconnect();
  }, [handleResize, targetRef]);

  useLayoutEffect(() => {
    handleResize();
  }, [handleResize]);

  return dimensions;
}

export function KeywordWordCloud({
  words,
  maxWords = 50,
}: KeywordWordCloudProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const { width, height } = useDimensions(containerRef);
  const [layoutWords, setLayoutWords] = useState<CloudWord[]>([]);

  const processedWords = useMemo(() => {
    if (!words?.length) return [];
    const sliced = [...words]
      .sort((a, b) => b.value - a.value)
      .slice(0, maxWords);
    const max = d3.max(sliced, (d) => d.value) ?? 1;
    const min = d3.min(sliced, (d) => d.value) ?? 1;
    const fontScale = d3
      .scaleSqrt()
      .domain([Math.max(1, min), Math.max(2, max)])
      .range([14, 44]);

    return sliced.map((d) => ({
      text: d.text,
      value: d.value,
      fontSize: fontScale(d.value),
    }));
  }, [words, maxWords]);

  useEffect(() => {
    if (!width || !height || !processedWords.length) {
      setLayoutWords([]);
      return;
    }

    let isCancelled = false;

    const layout = Cloud<CloudWord>()
      .size([width, height])
      .words(
        processedWords.map(
          (d) =>
            ({
              text: d.text,
              value: d.value,
              size: d.fontSize,
            }) as CloudWord,
        ),
      )
      .padding(1.5)
      .rotate(() => (Math.floor(Math.random() * 5) - 2) * 30)
      .font(FONT_FAMILY)
      .fontWeight("bold")
      .fontSize((d) => d.size)
      .spiral("archimedean")
      .on("end", (out: CloudWord[]) => {
        if (!isCancelled) {
          setLayoutWords(out);
        }
      });

    layout.start();

    return () => {
      isCancelled = true;
      layout.stop();
    };
  }, [width, height, processedWords]);

  const colorScale = useMemo(() => {
    const palette = [
      "#1f77b4",
      "#ff7f0e",
      "#2ca02c",
      "#d62728",
      "#9467bd",
      "#8c564b",
      "#e377c2",
      "#7f7f7f",
      "#bcbd22",
      "#17becf",
    ];
    return d3
      .scaleOrdinal<string, string>()
      .domain(processedWords.map((d) => d.text))
      .range(palette);
  }, [processedWords]);

  const hasLayout = layoutWords.length > 0 && width > 0 && height > 0;

  return (
    <div
      ref={containerRef}
      className="relative h-[300px] w-full rounded-md border border-slate-200 bg-slate-50/60"
    >
      {!hasLayout && (
        <div className="flex h-full items-center justify-center text-xs text-slate-400">
          Generating word cloud…
        </div>
      )}

      {hasLayout && (
        <svg
          width="100%"
          height="100%"
          viewBox={`0 0 ${width} ${height}`}
          className="text-slate-700"
        >
          <g transform={`translate(${width / 2}, ${height / 2})`}>
            {layoutWords.map((d) => (
              <text
                key={`${d.text}-${d.x}-${d.y}`}
                fontSize={d.size}
                fontFamily={FONT_FAMILY}
                fontWeight={700}
                textAnchor="middle"
                transform={`translate(${d.x}, ${d.y}) rotate(${d.rotate})`}
                fill={colorScale(d.text)}
                stroke="white"
                strokeWidth={0.75}
                className=""
              >
                {d.text}
              </text>
            ))}
          </g>
        </svg>
      )}
    </div>
  );
}
