import pixelmatch from "pixelmatch";

let observer;
const observe = () => {
  observer && observer.disconnect();
  const pjaxContainer = document.querySelector("[data-pjax-container]");
  const pjaxContentContainer = document.querySelector("#repo-content-pjax-container");
  observer = new MutationObserver(start);
  pjaxContainer && observer.observe(pjaxContainer, { childList: true });
  pjaxContentContainer && observer.observe(pjaxContentContainer, { childList: true });
  document
    .querySelectorAll(".js-diff-progressive-container")
    .forEach((el) => observer.observe(el, { childList: true }));
};

const getExtensionOptions = async () => {
  const options = await window.chrome.storage.sync.get("options");
  return options.options;
};

const onCompareButtonClick = async (file, baseCommitId, endCommitId, organization, repo, threshold) => {
  const renderWrapper = file.querySelector(".render-wrapper");
  renderWrapper.innerHTML = "";
  const renderContainer = document.createElement("div");
  renderContainer.classList.add("ghpric-render-container");
  renderWrapper.appendChild(renderContainer);

  const filePath = file.dataset.tagsearchPath;
  const oldImage = await getImg(filePath, organization, repo, baseCommitId, "before");
  const newImage = await getImg(filePath, organization, repo, endCommitId, "after");
  const width = Math.max(oldImage.width, newImage.width);
  const height = Math.max(oldImage.height, newImage.height);
  const oldImgCanvas = createImgCanvas(oldImage, width, height);
  const newImgCanvas = createImgCanvas(newImage, width, height);
  renderContainer.appendChild(oldImage);
  renderContainer.appendChild(newImage);

  const oldImg = oldImgCanvas.getContext("2d").getImageData(0, 0, oldImgCanvas.width, oldImgCanvas.height);
  const newImg = newImgCanvas.getContext("2d").getImageData(0, 0, newImgCanvas.width, newImgCanvas.height);
  const diffCanvas = document.createElement("canvas");
  diffCanvas.classList.add("ghpric-canvas", "ghpric-canvas-diff");
  diffCanvas.width = width;
  diffCanvas.height = height;
  diffCanvas.style.cursor = "pointer";
  const diffContext = diffCanvas.getContext("2d");
  const diff = diffContext.createImageData(width, height);
  pixelmatch(oldImg.data, newImg.data, diff.data, width, height, { threshold });
  diffContext.putImageData(diff, 0, 0);
  const diffImg = renderContainer.appendChild(convertCanvasToImage(diffCanvas, "diff"));
  addDialogToCanvas(oldImage, newImage, diffImg, renderContainer);
};

const getImg = async (imgPath, organization, repo, commitId, typePostfix) => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.setAttribute("crossOrigin", "");
    img.onload = () => {
      resolve(img);
    };
    img.src = `https://raw.githubusercontent.com/${organization}/${repo}/${commitId}/${imgPath}`;
    img.classList.add("ghpric-canvas", `ghpric-canvas-${typePostfix}`);
  });
};
const createImgCanvas = (img, width, height) => {
  const imgCanvas = document.createElement("canvas");
  const imgContext = imgCanvas.getContext("2d");
  imgCanvas.width = width;
  imgCanvas.height = height;
  imgContext.drawImage(img, 0, 0);
  return imgCanvas;
};

const convertCanvasToImage = (canvas, typePostfix) => {
  let image = new Image();
  image.src = canvas.toDataURL();
  image.classList.add("ghpric-canvas", `ghpric-canvas-${typePostfix}`);
  return image;
};

const copyImg = (img) => {
  const newImg = new Image();
  newImg.src = img.src;
  newImg.classList.add(...img.classList.toString().split(" "));
  return newImg;
};
const addDialogToCanvas = (oldImage, newImage, diffImg, renderContainer) => {
  const onImgSelect = (img, previewImg) => (event) => {
    event.stopPropagation();
    previewImg.src = img.src;
    previewImg.classList.remove('ghpric-canvas-before');
    previewImg.classList.remove('ghpric-canvas-after');
    previewImg.classList.remove('ghpric-canvas-diff');
    previewImg.classList.add(...img.classList.toString().split(" "));
}
  /**
   * @param {HTMLImageElement} img 
   * @returns 
   */
  const onclick = (img) => () => {
    const dialog = document.createElement("dialog");
    dialog.classList.add("ghpric-dialog");

    const dialogContent = document.createElement("div");
    dialogContent.classList.add("ghpric-dialog-content");
    dialogContent.addEventListener("click", (event) => {
      event.stopPropagation();
    });
    dialog.appendChild(dialogContent);

    const imgSelector = document.createElement("div");
    imgSelector.classList.add("ghpric-img-selector");
    dialogContent.appendChild(imgSelector);

    const previewImg = copyImg(img);
    previewImg.classList.add("ghpric-dialog-canvas");
    dialogContent.appendChild(previewImg);

    const oldImgSelection = imgSelector.appendChild(copyImg(oldImage));
    oldImgSelection.onclick = onImgSelect(oldImage, previewImg);
    const newImgSelection = imgSelector.appendChild(copyImg(newImage));
    newImgSelection.onclick = onImgSelect(newImage, previewImg);
    const diffImgSelection = imgSelector.appendChild(copyImg(diffImg));
    diffImgSelection.onclick = onImgSelect(diffImg, previewImg);

    const dialogCloseButton = document.createElement("button");
    dialogCloseButton.classList.add("ghpric-dialog-close-button");
    dialogCloseButton.innerHTML = `<svg viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg"><path d="m14 0-6 6-6-6-2 2 6 6-6 6 2 2 6-6 6 6 2-2-6-6 6-6"></path></svg>`;
    dialogCloseButton.onclick = () => {
      dialog.close();
    };
    dialogContent.appendChild(dialogCloseButton);

    renderContainer.appendChild(dialog);
    dialog.showModal();

    dialog.onclick = () => {
      dialog.close();
    };
    dialog.onclose = () => {
      renderContainer.removeChild(dialog);
    };
  };
  oldImage.onclick = onclick(oldImage);
  newImage.onclick = onclick(newImage);
  diffImg.onclick = onclick(diffImg);
};

const start = async () => {
  const extensionOptions = await getExtensionOptions();
  console.log("options", extensionOptions);

  observe();

  console.log(".js-diff-progressive-container", document.querySelectorAll(".js-diff-progressive-container").length);
  const imgFiles = document.querySelectorAll(".file[data-file-type='.png'][data-file-deleted='false']");
  console.log("start", imgFiles.length);

  if (imgFiles.length === 0) {
    return;
  }

  const datasetUrl = document.querySelector(".js-socket-channel.js-updatable-content.js-pull-refresh-on-pjax").dataset
    .url;
  console.log(datasetUrl);
  const baseCommitId = new URLSearchParams(datasetUrl.split("?")[1]).get("base_commit_oid");
  const endCommitId = new URLSearchParams(datasetUrl.split("?")[1]).get("end_commit_oid");
  console.log(baseCommitId);

  const pathSplitted = document.location.pathname.split("/");
  const organization = pathSplitted[1];
  const repo = pathSplitted[2];

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

    comparerButton.addEventListener("click", () =>
      onCompareButtonClick(file, baseCommitId, endCommitId, organization, repo, extensionOptions.threshold)
    );

    buttonGroup.appendChild(comparerButton);

    if (extensionOptions.isDefaultView) {
      const activeViewButton = buttonGroup.querySelector(".selected");
      activeViewButton.classList.remove("selected");
      activeViewButton.ariaCurrent = "false";
      const imgComparerButton = buttonGroup.querySelector(".img-comparer");
      imgComparerButton.classList.add("selected");
      imgComparerButton.ariaCurrent = "true";
      onCompareButtonClick(file, baseCommitId, endCommitId, organization, repo, extensionOptions.threshold);
    }
  });
};

start();
observe();
// document.addEventListener('loadend', start);
