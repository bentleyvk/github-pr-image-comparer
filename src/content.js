import pixelmatch from "pixelmatch";

// const imgFiles = [...document.querySelectorAll(".file[data-file-type='.png']")].map((el) => {
//   const filePath = el.dataset.tagsearchPath;
//   return {
//     old: `https://raw.githubusercontent.com/iTwin/iTwinUI/${baseCommitId}/${filePath}`,
//     new: `https://raw.githubusercontent.com/iTwin/iTwinUI/${endCommitId}/${filePath}`,
//   };
// });
// console.log(imgFiles);

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
  renderContainer.classList.add("render-wrapper");
  renderWrapper.appendChild(renderContainer);

  // const renderContainer = file.querySelector(".render-container");
  renderContainer.style.height = "auto";
  renderContainer.style.display = "flex";
  renderContainer.style.flexWrap = "wrap";
  renderContainer.style.justifyContent = "center";
  renderContainer.style.gap = "16px";
  renderContainer.style.padding = "16px";
  renderContainer.style.backgroundColor = "#f6f8fa";

  const filePath = file.dataset.tagsearchPath;
  const oldImage = await getImg(filePath, organization, repo, baseCommitId);
  const newImage = await getImg(filePath, organization, repo, endCommitId);
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
  pixelmatch(oldImg.data, newImg.data, diff.data, width, height, { threshold });
  diffContext.putImageData(diff, 0, 0);
  addDialogToCanvas(diffCanvas, width, height, "#d0d7de", renderContainer);
  renderContainer.appendChild(diffCanvas);
};

const getImg = async (imgPath, organization, repo, commitId) => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.setAttribute("crossOrigin", "");
    img.onload = () => {
      resolve(img);
    };
    img.src = `https://raw.githubusercontent.com/${organization}/${repo}/${commitId}/${imgPath}`;
  });
};

const createImgCanvas = async (imgPath, commitId) => {
  return new Promise((resolve, reject) => {
    const imgCanvas = document.createElement("canvas");
    const imgContext = imgCanvas.getContext("2d");
    const img = new Image();
    img.setAttribute("crossOrigin", "");
    img.onload = () => {
      imgCanvas.width = img.width;
      imgCanvas.height = img.height;
      console.log("img", img.width, img.height);
      imgContext.drawImage(img, 0, 0);
      resolve(imgCanvas);
    };
    img.src = `https://raw.githubusercontent.com/${organization}/${repo}/${commitId}/${imgPath}`;
    // imgCanvas.classList.add("render-viewer");
  });
};

const createImgCanvas2 = (img, width, height, color, renderContainer) => {
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

const addDialogToCanvas = (imgCanvas, width, height, color, renderContainer) => {
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
