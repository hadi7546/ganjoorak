"use client";

import React, { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  FaCheck,
  FaCopy,
  FaDownload,
  FaImage,
  FaLink,
  FaPalette,
  FaTimes,
} from "react-icons/fa";
import type { Poem } from "@/types/poem";
import { logger } from "@/utils/logger";
import {
  FONT_STACKS,
  useSettings,
  type FontFamilyOption,
} from "@/context/SettingsContext";

interface SharePoemDialogProps {
  poem: Poem;
  isOpen: boolean;
  onClose: () => void;
  poetSlug?: string;
}

const MAX_SHARE_LINES = 16;

type ShareThemeId = "night" | "paper" | "ink";

const SHARE_FONT_CHOICES: Array<{ value: FontFamilyOption; label: string }> = [
  { value: "vazirmatn", label: "وزیرمتن" },
  { value: "samim", label: "صمیم" },
  { value: "gandom", label: "گندم" },
  { value: "parastoo", label: "پرستو" },
  { value: "sahel", label: "ساحل" },
];

const SHARE_THEMES: Array<{
  id: ShareThemeId;
  label: string;
  background: string;
  accent: string;
  title: string;
  text: string;
  muted: string;
  border: string;
  brand: string;
}> = [
  {
    id: "night",
    label: "شب",
    background: "#111111",
    accent: "rgba(255,255,255,0.12)",
    title: "rgba(255,255,255,0.92)",
    text: "rgba(255,255,255,0.90)",
    muted: "rgba(255,255,255,0.62)",
    border: "rgba(255,255,255,0.16)",
    brand: "rgba(255,255,255,0.52)",
  },
  {
    id: "paper",
    label: "کاغذ",
    background: "#f4ead7",
    accent: "rgba(115,78,38,0.12)",
    title: "#3d2b1f",
    text: "#493527",
    muted: "rgba(61,43,31,0.68)",
    border: "rgba(61,43,31,0.18)",
    brand: "rgba(61,43,31,0.54)",
  },
  {
    id: "ink",
    label: "مرکب",
    background: "#f7f7f4",
    accent: "rgba(20,24,28,0.08)",
    title: "#17191d",
    text: "#202329",
    muted: "rgba(23,25,29,0.62)",
    border: "rgba(23,25,29,0.16)",
    brand: "rgba(23,25,29,0.50)",
  },
];

const buildPoemUrl = (poem: Poem, poetSlug?: string) => {
  const baseUrl =
    typeof window !== "undefined"
      ? window.location.origin
      : "https://ganjoorak.ir";

  if (poem.isCustom) {
    return `${baseUrl}/${poetSlug || poem.poetSlug}/${poem.id}`;
  }

  return `${baseUrl}/poem/${poem.id}`;
};

const toBlob = async (dataUrl: string) => {
  const response = await fetch(dataUrl);
  return response.blob();
};

const wrapCanvasText = (
  context: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
) => {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let currentLine = "";

  words.forEach((word) => {
    const testLine = currentLine ? `${currentLine} ${word}` : word;

    if (context.measureText(testLine).width > maxWidth && currentLine) {
      lines.push(currentLine);
      currentLine = word;
    } else {
      currentLine = testLine;
    }
  });

  if (currentLine) {
    lines.push(currentLine);
  }

  return lines;
};

const getCanvasFont = (weight: number, size: number, fontStack: string) =>
  `${weight} ${size}px ${fontStack}`;

const fitPoemLines = ({
  context,
  lines,
  fontStack,
  maxWidth,
  maxHeight,
}: {
  context: CanvasRenderingContext2D;
  lines: string[];
  fontStack: string;
  maxWidth: number;
  maxHeight: number;
}) => {
  const minFontSize = 24;
  const maxFontSize = 42;

  for (let fontSize = maxFontSize; fontSize >= minFontSize; fontSize -= 2) {
    context.font = getCanvasFont(500, fontSize, fontStack);

    const renderedLines = lines.flatMap((line) =>
      wrapCanvasText(context, line, maxWidth),
    );

    const lineHeight = Math.round(fontSize * 1.75);

    if (renderedLines.length * lineHeight <= maxHeight) {
      return { renderedLines, fontSize, lineHeight };
    }
  }

  context.font = getCanvasFont(500, minFontSize, fontStack);

  const lineHeight = Math.round(minFontSize * 1.75);
  const maxLineCount = Math.max(1, Math.floor(maxHeight / lineHeight));

  const renderedLines = lines
    .flatMap((line) => wrapCanvasText(context, line, maxWidth))
    .slice(0, maxLineCount);

  if (renderedLines.length > 0) {
    renderedLines[renderedLines.length - 1] =
      renderedLines[renderedLines.length - 1].replace(/\s+$/, "") + "…";
  }

  return { renderedLines, fontSize: minFontSize, lineHeight };
};

const createShareImage = async ({
  poem,
  lines,
  theme,
  fontStack,
}: {
  poem: Poem;
  lines: string[];
  theme: (typeof SHARE_THEMES)[number];
  fontStack: string;
}) => {
  if (typeof document === "undefined") {
    return "";
  }

  await document.fonts?.ready;

  const canvas = document.createElement("canvas");
  const scale = 2;
  const width = 1080;
  const height = 1350;

  canvas.width = width * scale;
  canvas.height = height * scale;

  const context = canvas.getContext("2d");

  if (!context) {
    return "";
  }

  context.scale(scale, scale);

  context.fillStyle = theme.background;
  context.fillRect(0, 0, width, height);

  const gradient = context.createLinearGradient(0, 0, width, height);
  gradient.addColorStop(0, theme.accent);
  gradient.addColorStop(0.45, "rgba(255,255,255,0.02)");
  gradient.addColorStop(1, theme.accent);

  context.fillStyle = gradient;
  context.fillRect(0, 0, width, height);

  context.strokeStyle = theme.border;
  context.lineWidth = 2;
  context.strokeRect(56, 56, width - 112, height - 112);

  context.direction = "rtl";
  context.textAlign = "center";

  context.fillStyle = theme.title;
  context.font = getCanvasFont(700, 50, fontStack);

  const titleLines = wrapCanvasText(context, poem.title, width - 210).slice(
    0,
    2,
  );

  titleLines.forEach((line, index) => {
    context.fillText(line, width / 2, 160 + index * 62);
  });

  context.fillStyle = theme.muted;
  context.font = getCanvasFont(400, 31, fontStack);
  context.fillText(poem.poet, width / 2, 215 + (titleLines.length - 1) * 62);

  context.fillStyle = theme.text;

  const textTop = 340;
  const textBottom = height - 185;

  const { renderedLines, fontSize, lineHeight } = fitPoemLines({
    context,
    lines,
    fontStack,
    maxWidth: width - 210,
    maxHeight: textBottom - textTop,
  });

  context.font = getCanvasFont(500, fontSize, fontStack);

  const totalTextHeight = renderedLines.length * lineHeight;
  let y = Math.max(textTop, height / 2 - totalTextHeight / 2);

  renderedLines.forEach((line) => {
    context.fillText(line, width / 2, y);
    y += lineHeight;
  });

  context.fillStyle = theme.brand;
  context.font = getCanvasFont(400, 26, fontStack);
  context.fillText("ganjoorak.ir", width / 2, height - 120);

  return canvas.toDataURL("image/png");
};

const SharePoemDialog: React.FC<SharePoemDialogProps> = ({
  poem,
  isOpen,
  onClose,
  poetSlug,
}) => {
  const { settings } = useSettings();

  const [selectedLines, setSelectedLines] = useState<number[]>([]);
  const [selectedThemeId, setSelectedThemeId] = useState<ShareThemeId>("night");
  const [selectedFontFamily, setSelectedFontFamily] =
    useState<FontFamilyOption>(settings.fontFamily);
  const [imageUrl, setImageUrl] = useState("");
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [mobileStep, setMobileStep] = useState<"select" | "preview">("select");

  const poemUrl = useMemo(() => buildPoemUrl(poem, poetSlug), [poem, poetSlug]);

  const lines = useMemo(
    () =>
      poem.plainText
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean),
    [poem.plainText],
  );

  const shareableLines = useMemo(() => lines.slice(0, 24), [lines]);

  const selectedTextLines = useMemo(
    () =>
      selectedLines
        .map((index) => shareableLines[index])
        .filter(Boolean)
        .slice(0, MAX_SHARE_LINES),
    [selectedLines, shareableLines],
  );

  const selectedTheme = useMemo(
    () =>
      SHARE_THEMES.find((theme) => theme.id === selectedThemeId) ??
      SHARE_THEMES[0],
    [selectedThemeId],
  );

  const shareText = useMemo(
    () =>
      [
        selectedTextLines.join("\n"),
        "",
        `${poem.title} - ${poem.poet}`,
        poemUrl,
      ]
        .filter(Boolean)
        .join("\n"),
    [poem.poet, poem.title, poemUrl, selectedTextLines],
  );

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    setStatus(null);
    setMobileStep("select");
    setSelectedFontFamily(settings.fontFamily);
    setSelectedLines(shareableLines.slice(0, 4).map((_, index) => index));
  }, [isOpen, poem.id, settings.fontFamily, shareableLines]);

  useEffect(() => {
    if (!isOpen || selectedTextLines.length === 0) {
      setImageUrl("");
      return;
    }

    let cancelled = false;

    const generate = async () => {
      setIsGeneratingImage(true);

      try {
        const nextImageUrl = await createShareImage({
          poem,
          lines: selectedTextLines,
          theme: selectedTheme,
          fontStack: FONT_STACKS[selectedFontFamily],
        });

        if (!cancelled) {
          setImageUrl(nextImageUrl);
        }
      } catch (error) {
        logger.error("Error creating share image:", error);
      } finally {
        if (!cancelled) {
          setIsGeneratingImage(false);
        }
      }
    };

    generate();

    return () => {
      cancelled = true;
    };
  }, [isOpen, poem, selectedFontFamily, selectedTextLines, selectedTheme]);

  const toggleLine = (index: number) => {
    setStatus(null);

    setSelectedLines((prev) => {
      if (prev.includes(index)) {
        return prev.filter((item) => item !== index);
      }

      if (prev.length >= MAX_SHARE_LINES) {
        return prev;
      }

      return [...prev, index].sort((a, b) => a - b);
    });
  };

  const copyText = async () => {
    try {
      await navigator.clipboard.writeText(shareText);
      setStatus("شعر کپی شد");
    } catch (error) {
      logger.error("Failed to copy share text:", error);
      setStatus("کپی متن انجام نشد");
    }
  };

  const shareLink = async () => {
    try {
      if (navigator.share) {
        await navigator.share({
          title: `${poem.title} | گنجورک`,
          text: selectedTextLines.join("\n"),
          url: poemUrl,
        });
      } else {
        await navigator.clipboard.writeText(poemUrl);
        setStatus("لینک کپی شد");
      }
    } catch (error) {
      logger.error("Failed to share link:", error);
    }
  };

  const downloadImage = () => {
    if (!imageUrl) {
      return;
    }

    const link = document.createElement("a");
    link.href = imageUrl;
    link.download = `ganjoorak-${poem.id}.png`;
    link.click();
  };

  const shareImage = async () => {
    if (!imageUrl) {
      return;
    }

    try {
      const blob = await toBlob(imageUrl);

      const file = new File([blob], `ganjoorak-${poem.id}.png`, {
        type: "image/png",
      });

      if (navigator.canShare?.({ files: [file] }) && navigator.share) {
        await navigator.share({
          title: `${poem.title} | گنجورک`,
          text: `${poem.title} - ${poem.poet}`,
          files: [file],
        });
      } else {
        downloadImage();
      }
    } catch (error) {
      logger.error("Failed to share image:", error);
      downloadImage();
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            className="settings-backdrop global-modal-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          <motion.div
            className="lyrics-share-dialog"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className={`lyrics-share-panel lyrics-share-panel--${mobileStep}`}
              role="dialog"
              aria-modal="true"
              aria-labelledby="lyrics-share-title"
              initial={{ scale: 0.96, opacity: 0, y: 18 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.96, opacity: 0, y: 18 }}
              transition={{ type: "spring", duration: 0.35, bounce: 0.18 }}
            >
              <header className="lyrics-share-header">
                <div>
                  <h2 id="lyrics-share-title">اشتراک شعر</h2>
                  <p>{poem.title}</p>
                </div>

                <button type="button" onClick={onClose} aria-label="بستن">
                  <FaTimes />
                </button>
              </header>

              <div className="lyrics-share-body">
                <section className="lyrics-share-controls">
                  <div
                    className="lyrics-share-lines"
                    aria-label="انتخاب مصرع‌ها"
                  >
                    {shareableLines.map((line, index) => {
                      const isSelected = selectedLines.includes(index);

                      return (
                        <button
                          key={`${line}-${index}`}
                          type="button"
                          className={isSelected ? "selected" : ""}
                          onClick={() => toggleLine(index)}
                        >
                          <span>{line}</span>
                          {isSelected && <FaCheck aria-hidden="true" />}
                        </button>
                      );
                    })}
                  </div>

                  <button
                    type="button"
                    className="lyrics-share-mobile-next"
                    onClick={() => setMobileStep("preview")}
                    disabled={selectedTextLines.length === 0}
                  >
                    پیشنمایش
                  </button>
                </section>

                <section
                  className="lyrics-share-preview"
                  aria-label="پیش‌نمایش تصویر"
                >
                  <div className="lyrics-share-preview-frame">
                    {isGeneratingImage && <p>در حال ساخت تصویر...</p>}

                    {!isGeneratingImage && imageUrl && (
                      <img src={imageUrl} alt="پیش‌نمایش تصویر اشتراک شعر" />
                    )}
                  </div>

                  <div className="lyrics-share-options">
                    <div
                      className="lyrics-share-theme-bar"
                      aria-label="انتخاب قالب تصویر"
                    >
                      <span>
                        <FaPalette aria-hidden="true" />
                        قالب
                      </span>

                      <div>
                        {SHARE_THEMES.map((theme) => (
                          <button
                            key={theme.id}
                            type="button"
                            className={
                              theme.id === selectedThemeId ? "active" : ""
                            }
                            onClick={() => setSelectedThemeId(theme.id)}
                          >
                            <span>{theme.label}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    <div
                      className="lyrics-share-theme-bar lyrics-share-font-bar"
                      aria-label="انتخاب قلم تصویر"
                    >
                      <span>قلم</span>

                      <div>
                        {SHARE_FONT_CHOICES.map((font) => (
                          <button
                            key={font.value}
                            type="button"
                            className={
                              font.value === selectedFontFamily ? "active" : ""
                            }
                            style={{ fontFamily: FONT_STACKS[font.value] }}
                            onClick={() => setSelectedFontFamily(font.value)}
                          >
                            <span className="lyrics-share-font-label">
                              {font.label}
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    className="lyrics-share-mobile-back"
                    onClick={() => setMobileStep("select")}
                  >
                    تغییر انتخاب
                  </button>
                </section>
              </div>

              <div className="lyrics-share-mobile-link-action">
                <button type="button" onClick={shareLink}>
                  <FaLink />
                  <span>اشتراک لینک</span>
                </button>
              </div>

              <footer className="lyrics-share-actions">
                <button type="button" onClick={shareLink}>
                  <FaLink />
                  <span>اشتراک لینک</span>
                </button>

                <button type="button" onClick={copyText}>
                  <FaCopy />
                  <span>کپی متن</span>
                </button>

                <button type="button" onClick={shareImage} disabled={!imageUrl}>
                  <FaImage />
                  <span>اشتراک تصویر</span>
                </button>

                <button
                  type="button"
                  onClick={downloadImage}
                  disabled={!imageUrl}
                >
                  <FaDownload />
                  <span>دانلود</span>
                </button>
              </footer>

              {status && <div className="lyrics-share-status">{status}</div>}
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default SharePoemDialog;
