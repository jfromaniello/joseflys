export interface CropArea {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ImageDimensions {
  width: number;
  height: number;
}

const CM_TO_INCH = 0.393701;

export const pixelsToCm = (pixels: number, dpi: number = 96): number => {
  if (!dpi) {
    return 0;
  }

  return (pixels / dpi) / CM_TO_INCH;
};

export const cmToPixels = (cm: number, dpi: number = 96): number => {
  return cm * CM_TO_INCH * dpi;
};

const ensureBrowser = () => {
  if (typeof window === "undefined" || typeof document === "undefined") {
    throw new Error("Image operations are only available in the browser");
  }
};

export const loadImage = (src: string): Promise<HTMLImageElement> => {
  ensureBrowser();

  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
};

export const cropImage = async (
  imageSrc: string,
  cropArea: CropArea,
  scale = 1
): Promise<string> => {
  ensureBrowser();
  const image = await loadImage(imageSrc);
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");

  if (!ctx) {
    throw new Error("Could not get canvas context");
  }

  const scaledWidth = cropArea.width * scale;
  const scaledHeight = cropArea.height * scale;

  canvas.width = scaledWidth;
  canvas.height = scaledHeight;

  ctx.drawImage(
    image,
    cropArea.x,
    cropArea.y,
    cropArea.width,
    cropArea.height,
    0,
    0,
    scaledWidth,
    scaledHeight
  );

  return canvas.toDataURL("image/png");
};

const performDownload = (dataUrl: string, filename: string) => {
  ensureBrowser();
  const link = document.createElement("a");
  link.href = dataUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

export const downloadImage = (
  dataUrl: string,
  filename = "image.png",
  dpi?: number
): void => {
  ensureBrowser();

  if (dpi && dataUrl.includes("image/png")) {
    import("changedpi")
      .then(({ changeDpiDataUrl }) => {
        const updatedDataUrl = changeDpiDataUrl(dataUrl, dpi);
        performDownload(updatedDataUrl, filename);
      })
      .catch(() => {
        performDownload(dataUrl, filename);
      });

    return;
  }

  performDownload(dataUrl, filename);
};
