(() => {
  var __create = Object.create;
  var __defProp = Object.defineProperty;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __getProtoOf = Object.getPrototypeOf;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __commonJS = (cb, mod) => function __require() {
    return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
  };
  var __copyProps = (to, from, except, desc) => {
    if (from && typeof from === "object" || typeof from === "function") {
      for (let key of __getOwnPropNames(from))
        if (!__hasOwnProp.call(to, key) && key !== except)
          __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
    }
    return to;
  };
  var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target, mod));

  // node_modules/pixelmatch/index.js
  var require_pixelmatch = __commonJS({
    "node_modules/pixelmatch/index.js"(exports, module) {
      "use strict";
      module.exports = pixelmatch2;
      var defaultOptions = {
        threshold: 0.1,
        includeAA: false,
        alpha: 0.1,
        aaColor: [255, 255, 0],
        diffColor: [255, 0, 0],
        diffColorAlt: null,
        diffMask: false
      };
      function pixelmatch2(img1, img2, output, width, height, options) {
        if (!isPixelData(img1) || !isPixelData(img2) || output && !isPixelData(output))
          throw new Error("Image data: Uint8Array, Uint8ClampedArray or Buffer expected.");
        if (img1.length !== img2.length || output && output.length !== img1.length)
          throw new Error("Image sizes do not match.");
        if (img1.length !== width * height * 4)
          throw new Error("Image data size does not match width/height.");
        options = Object.assign({}, defaultOptions, options);
        const len = width * height;
        const a32 = new Uint32Array(img1.buffer, img1.byteOffset, len);
        const b32 = new Uint32Array(img2.buffer, img2.byteOffset, len);
        let identical = true;
        for (let i = 0; i < len; i++) {
          if (a32[i] !== b32[i]) {
            identical = false;
            break;
          }
        }
        if (identical) {
          if (output && !options.diffMask) {
            for (let i = 0; i < len; i++)
              drawGrayPixel(img1, 4 * i, options.alpha, output);
          }
          return 0;
        }
        const maxDelta = 35215 * options.threshold * options.threshold;
        let diff = 0;
        for (let y = 0; y < height; y++) {
          for (let x = 0; x < width; x++) {
            const pos = (y * width + x) * 4;
            const delta = colorDelta(img1, img2, pos, pos);
            if (Math.abs(delta) > maxDelta) {
              if (!options.includeAA && (antialiased(img1, x, y, width, height, img2) || antialiased(img2, x, y, width, height, img1))) {
                if (output && !options.diffMask)
                  drawPixel(output, pos, ...options.aaColor);
              } else {
                if (output) {
                  drawPixel(output, pos, ...delta < 0 && options.diffColorAlt || options.diffColor);
                }
                diff++;
              }
            } else if (output) {
              if (!options.diffMask)
                drawGrayPixel(img1, pos, options.alpha, output);
            }
          }
        }
        return diff;
      }
      function isPixelData(arr) {
        return ArrayBuffer.isView(arr) && arr.constructor.BYTES_PER_ELEMENT === 1;
      }
      function antialiased(img, x1, y1, width, height, img2) {
        const x0 = Math.max(x1 - 1, 0);
        const y0 = Math.max(y1 - 1, 0);
        const x2 = Math.min(x1 + 1, width - 1);
        const y2 = Math.min(y1 + 1, height - 1);
        const pos = (y1 * width + x1) * 4;
        let zeroes = x1 === x0 || x1 === x2 || y1 === y0 || y1 === y2 ? 1 : 0;
        let min = 0;
        let max = 0;
        let minX, minY, maxX, maxY;
        for (let x = x0; x <= x2; x++) {
          for (let y = y0; y <= y2; y++) {
            if (x === x1 && y === y1)
              continue;
            const delta = colorDelta(img, img, pos, (y * width + x) * 4, true);
            if (delta === 0) {
              zeroes++;
              if (zeroes > 2)
                return false;
            } else if (delta < min) {
              min = delta;
              minX = x;
              minY = y;
            } else if (delta > max) {
              max = delta;
              maxX = x;
              maxY = y;
            }
          }
        }
        if (min === 0 || max === 0)
          return false;
        return hasManySiblings(img, minX, minY, width, height) && hasManySiblings(img2, minX, minY, width, height) || hasManySiblings(img, maxX, maxY, width, height) && hasManySiblings(img2, maxX, maxY, width, height);
      }
      function hasManySiblings(img, x1, y1, width, height) {
        const x0 = Math.max(x1 - 1, 0);
        const y0 = Math.max(y1 - 1, 0);
        const x2 = Math.min(x1 + 1, width - 1);
        const y2 = Math.min(y1 + 1, height - 1);
        const pos = (y1 * width + x1) * 4;
        let zeroes = x1 === x0 || x1 === x2 || y1 === y0 || y1 === y2 ? 1 : 0;
        for (let x = x0; x <= x2; x++) {
          for (let y = y0; y <= y2; y++) {
            if (x === x1 && y === y1)
              continue;
            const pos2 = (y * width + x) * 4;
            if (img[pos] === img[pos2] && img[pos + 1] === img[pos2 + 1] && img[pos + 2] === img[pos2 + 2] && img[pos + 3] === img[pos2 + 3])
              zeroes++;
            if (zeroes > 2)
              return true;
          }
        }
        return false;
      }
      function colorDelta(img1, img2, k, m, yOnly) {
        let r1 = img1[k + 0];
        let g1 = img1[k + 1];
        let b1 = img1[k + 2];
        let a1 = img1[k + 3];
        let r2 = img2[m + 0];
        let g2 = img2[m + 1];
        let b2 = img2[m + 2];
        let a2 = img2[m + 3];
        if (a1 === a2 && r1 === r2 && g1 === g2 && b1 === b2)
          return 0;
        if (a1 < 255) {
          a1 /= 255;
          r1 = blend(r1, a1);
          g1 = blend(g1, a1);
          b1 = blend(b1, a1);
        }
        if (a2 < 255) {
          a2 /= 255;
          r2 = blend(r2, a2);
          g2 = blend(g2, a2);
          b2 = blend(b2, a2);
        }
        const y1 = rgb2y(r1, g1, b1);
        const y2 = rgb2y(r2, g2, b2);
        const y = y1 - y2;
        if (yOnly)
          return y;
        const i = rgb2i(r1, g1, b1) - rgb2i(r2, g2, b2);
        const q = rgb2q(r1, g1, b1) - rgb2q(r2, g2, b2);
        const delta = 0.5053 * y * y + 0.299 * i * i + 0.1957 * q * q;
        return y1 > y2 ? -delta : delta;
      }
      function rgb2y(r, g, b) {
        return r * 0.29889531 + g * 0.58662247 + b * 0.11448223;
      }
      function rgb2i(r, g, b) {
        return r * 0.59597799 - g * 0.2741761 - b * 0.32180189;
      }
      function rgb2q(r, g, b) {
        return r * 0.21147017 - g * 0.52261711 + b * 0.31114694;
      }
      function blend(c, a) {
        return 255 + (c - 255) * a;
      }
      function drawPixel(output, pos, r, g, b) {
        output[pos + 0] = r;
        output[pos + 1] = g;
        output[pos + 2] = b;
        output[pos + 3] = 255;
      }
      function drawGrayPixel(img, i, alpha, output) {
        const r = img[i + 0];
        const g = img[i + 1];
        const b = img[i + 2];
        const val = blend(rgb2y(r, g, b), alpha * img[i + 3] / 255);
        drawPixel(output, i, val, val, val);
      }
    }
  });

  // src/content.js
  var import_pixelmatch = __toESM(require_pixelmatch());
  var observer;
  var observe = () => {
    observer && observer.disconnect();
    const pjaxContainer = document.querySelector("[data-pjax-container]");
    const pjaxContentContainer = document.querySelector("#repo-content-pjax-container");
    observer = new MutationObserver(start);
    pjaxContainer && observer.observe(pjaxContainer, { childList: true });
    pjaxContentContainer && observer.observe(pjaxContentContainer, { childList: true });
    document.querySelectorAll(".js-diff-progressive-container").forEach((el) => observer.observe(el, { childList: true }));
  };
  var getExtensionOptions = async () => {
    const options = await window.chrome.storage.sync.get("options");
    return options.options;
  };
  var onCompareButtonClick = async (file, baseCommitId, endCommitId, organization2, repo2) => {
    const renderWrapper = file.querySelector(".render-wrapper");
    renderWrapper.innerHTML = "";
    const renderContainer = document.createElement("div");
    renderContainer.classList.add("render-wrapper");
    renderWrapper.appendChild(renderContainer);
    renderContainer.style.height = "auto";
    renderContainer.style.display = "flex";
    renderContainer.style.flexWrap = "wrap";
    renderContainer.style.justifyContent = "center";
    renderContainer.style.gap = "16px";
    renderContainer.style.padding = "16px";
    renderContainer.style.backgroundColor = "#f6f8fa";
    const filePath = file.dataset.tagsearchPath;
    const oldImage = await getImg(filePath, organization2, repo2, baseCommitId);
    const newImage = await getImg(filePath, organization2, repo2, endCommitId);
    const width = Math.max(oldImage.width, newImage.width);
    const height = Math.max(oldImage.height, newImage.height);
    const oldImgCanvas = createImgCanvas2(oldImage, width, height, "#cf222e", renderContainer);
    const newImgCanvas = createImgCanvas2(newImage, width, height, "#2da44e", renderContainer);
    renderContainer.appendChild(oldImgCanvas);
    renderContainer.appendChild(newImgCanvas);
    console.log(oldImgCanvas.width, oldImgCanvas.height);
    const oldImg = oldImgCanvas.getContext("2d").getImageData(0, 0, oldImgCanvas.width, oldImgCanvas.height);
    const newImg = newImgCanvas.getContext("2d").getImageData(0, 0, newImgCanvas.width, newImgCanvas.height);
    const diffCanvas = document.createElement("canvas");
    diffCanvas.style.border = "1px solid #d0d7de";
    diffCanvas.style.flexShrink = "0";
    diffCanvas.style.maxWidth = "30%";
    diffCanvas.width = width;
    diffCanvas.height = height;
    diffCanvas.style.cursor = "pointer";
    const diffContext = diffCanvas.getContext("2d");
    const diff = diffContext.createImageData(width, height);
    (0, import_pixelmatch.default)(oldImg.data, newImg.data, diff.data, width, height, { threshold: 0.1 });
    diffContext.putImageData(diff, 0, 0);
    addDialogToCanvas(diffCanvas, width, height, "#d0d7de", renderContainer);
    renderContainer.appendChild(diffCanvas);
  };
  var getImg = async (imgPath, organization2, repo2, commitId) => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.setAttribute("crossOrigin", "");
      img.onload = () => {
        resolve(img);
      };
      img.src = `https://raw.githubusercontent.com/${organization2}/${repo2}/${commitId}/${imgPath}`;
    });
  };
  var createImgCanvas2 = (img, width, height, color, renderContainer) => {
    const imgCanvas = document.createElement("canvas");
    const imgContext = imgCanvas.getContext("2d");
    imgCanvas.width = width;
    imgCanvas.height = height;
    imgCanvas.style.flexShrink = "0";
    imgCanvas.style.maxWidth = "30%";
    imgCanvas.style.border = `1px solid ${color}`;
    imgCanvas.style.cursor = "pointer";
    imgContext.drawImage(img, 0, 0);
    addDialogToCanvas(imgCanvas, width, height, color, renderContainer);
    return imgCanvas;
  };
  var addDialogToCanvas = (imgCanvas, width, height, color, renderContainer) => {
    imgCanvas.onclick = () => {
      const dialog = document.createElement("dialog");
      dialog.style.border = `1px solid ${color}`;
      const newCanvas = document.createElement("canvas");
      newCanvas.width = width;
      newCanvas.height = height;
      newCanvas.getContext("2d").drawImage(imgCanvas, 0, 0);
      newCanvas.style.maxWidth = "100%";
      dialog.appendChild(newCanvas);
      renderContainer.appendChild(dialog);
      dialog.showModal();
      dialog.onclick = () => {
        renderContainer.removeChild(dialog);
      };
      dialog.onclose = () => {
        renderContainer.removeChild(dialog);
      };
    };
  };
  var start = async () => {
    const extensionOptions = await getExtensionOptions();
    console.log("options", extensionOptions);
    observe();
    console.log(".js-diff-progressive-container", document.querySelectorAll(".js-diff-progressive-container").length);
    const imgFiles = document.querySelectorAll(".file[data-file-type='.png'][data-file-deleted='false']");
    console.log("start", imgFiles.length);
    if (imgFiles.length === 0) {
      return;
    }
    const datasetUrl = document.querySelector(".js-socket-channel.js-updatable-content.js-pull-refresh-on-pjax").dataset.url;
    console.log(datasetUrl);
    const baseCommitId = new URLSearchParams(datasetUrl.split("?")[1]).get("base_commit_oid");
    const endCommitId = new URLSearchParams(datasetUrl.split("?")[1]).get("end_commit_oid");
    console.log(baseCommitId);
    const pathSplitted = document.location.pathname.split("/");
    const organization2 = pathSplitted[1];
    const repo2 = pathSplitted[2];
    imgFiles.forEach((file) => {
      if (!file.querySelector('.diffstat[aria-label="Binary file modified"]') || file.querySelector(".img-comparer")) {
        return;
      }
      const buttonGroup = file.querySelector(".BtnGroup");
      const comparerButton = document.createElement("div");
      comparerButton.classList.add("BtnGroup-parent");
      comparerButton.classList.add("js-prose-diff-toggle-form");
      comparerButton.innerHTML = `<button class="img-comparer btn btn-sm BtnGroup-item tooltipped tooltipped-w rendered js-rendered" aria-label="Display image diff with Pixelmatch" data-disable-with="" aria-current="false">
  <svg class="octicon octicon-file" style="width: 16px; height: 16px;" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg"><path d="M426.666667 128H213.333333c-47.146667 0-85.333333 38.186667-85.333333 85.333333v597.333334c0 47.146667 38.186667 85.333333 85.333333 85.333333h213.333334v85.333333h85.333333V42.666667h-85.333333v85.333333z m0 640H213.333333l213.333334-256v256zM810.666667 128H597.333333v85.333333h213.333334v554.666667L597.333333 512v384h213.333334c47.146667 0 85.333333-38.186667 85.333333-85.333333V213.333333c0-47.146667-38.186667-85.333333-85.333333-85.333333z"  /></svg>
  </button>`;
      comparerButton.addEventListener("click", () => onCompareButtonClick(file, baseCommitId, endCommitId, organization2, repo2));
      buttonGroup.appendChild(comparerButton);
      if (extensionOptions.isDefaultView) {
        comparerButton.click();
        const activeViewButton = buttonGroup.querySelector(".selected");
        activeViewButton.classList.remove("selected");
        activeViewButton.ariaCurrent = "false";
        comparerButton.querySelector(".img-comparer").classList.add("selected");
        comparerButton.querySelector(".img-comparer").ariaCurrent = "true";
      }
    });
  };
  start();
  observe();
})();
