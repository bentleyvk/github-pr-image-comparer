import pixelmatch from "pixelmatch";

let observer;
const observe = () => {
  observer && observer.disconnect();
  // const pjaxContainer = document.querySelector("[data-pjax-container]");
  // const pjaxContentContainer = document.querySelector("#repo-content-pjax-container");
  observer = new MutationObserver(start);
  // pjaxContainer && observer.observe(pjaxContainer, { childList: true, subtree: true });
  // pjaxContentContainer && observer.observe(pjaxContentContainer, { childList: true, subtree: true });
  document
    .querySelectorAll(".js-diff-progressive-container")
    .forEach((el) => observer.observe(el, { childList: true, subtree: true }));
  observer.observe(document.body, { childList: true, subtree: true });
};

const getExtensionOptions = async () => {
  const options = await window.chrome.storage.sync.get("options");
  return (
    options.options ?? {
      isDefaultView: false,
      threshold: 0.01,
    }
  );
};

let isPrivateRepo = false;
const imgUrls = {};

window.onmessage = (event) => {
  if (event.origin != "https://viewscreen.githubusercontent.com") {
    return;
  }
  if (event.data?.type !== "iframe-loaded") {
    return;
  }

  const src = event.data.src;
  const url = src.split("?")[0];
  imgUrls[url] = src;

  const filePath = url.split("/").slice(6)[0];
  const iframe = document.querySelector(`iframe[src*="${filePath}"]`);
  iframe?.contentWindow?.postMessage({ type: "src-delivered", src }, "https://viewscreen.githubusercontent.com");
};

const onCompareButtonClick = async (file, baseCommitId, endCommitId, organization, repo, threshold, token) => {
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

const getImgUrl = (imgPath, organization, repo, commitId) =>
  `https://raw.githubusercontent.com/${organization}/${repo}/${commitId}/${imgPath}`;

const getImg = async (imgPath, organization, repo, commitId, typePostfix) => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.setAttribute("crossOrigin", "");
    img.onload = () => {
      resolve(img);
    };
    const imgUrl = getImgUrl(imgPath, organization, repo, commitId);
    img.src = isPrivateRepo ? imgUrls[imgUrl] : imgUrl;
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
    previewImg.classList.remove("ghpric-canvas-before");
    previewImg.classList.remove("ghpric-canvas-after");
    previewImg.classList.remove("ghpric-canvas-diff");
    previewImg.classList.add(...img.classList.toString().split(" "));
  };
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

    const closeAnimation = () => {
      dialog.classList.add("ghpric-dialog-closing");
      dialog.addEventListener(
        "animationend",
        () => {
          dialog.close();
        },
        { once: true }
      );
    };

    const dialogCloseButton = document.createElement("button");
    dialogCloseButton.classList.add("ghpric-dialog-close-button");
    dialogCloseButton.innerHTML = `<svg viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg"><path d="m14 0-6 6-6-6-2 2 6 6-6 6 2 2 6-6 6 6 2-2-6-6 6-6"></path></svg>`;
    dialogCloseButton.onclick = () => {
      closeAnimation();
    };
    dialogContent.appendChild(dialogCloseButton);

    renderContainer.appendChild(dialog);
    dialog.showModal();

    dialog.onclick = () => {
      closeAnimation();
    };
    dialog.onclose = () => {
      renderContainer.removeChild(dialog);
    };
  };
  oldImage.onclick = onclick(oldImage);
  newImage.onclick = onclick(newImage);
  diffImg.onclick = onclick(diffImg);
};

const imgFilesQuery = ["png", "jpg", "jpeg", "gif", "svg", "bmp"].map(
  (ext) => `.file[data-file-type='.${ext}'][data-file-deleted='false']`
);

const waitUntilUrlIsLoaded = async (url) => {
  return new Promise(async (resolve, reject) => {
    if (!imgUrls[url]) {
      setTimeout(() => {
        waitUntilUrlIsLoaded(url).then(resolve);
      }, 500);
      return;
    }
    resolve(imgUrls[url]);
  });
};

const start = async () => {
  const extensionOptions = await getExtensionOptions();

  observe();

  const imgFiles = document.querySelectorAll(imgFilesQuery);

  if (imgFiles.length === 0) {
    return;
  }

  isPrivateRepo = !!document.querySelector("#repository-container-header .octicon-lock");

  const datasetUrl = document.querySelector("details-menu.select-menu-modal[src*=sha1]")?.getAttribute("src");
  const baseCommitId = new URLSearchParams(datasetUrl.split("?")[1]).get("sha1");
  const endCommitId = new URLSearchParams(datasetUrl.split("?")[1]).get("sha2");

  const pathSplitted = document.location.pathname.split("/");
  const organization = pathSplitted[1];
  const repo = pathSplitted[2];

  const handleFile = async (file) => {
    if (
      !file.querySelector('.diffstat[aria-label="Binary file modified"]') ||
      file.querySelector(".img-comparer")
    ) {
      return;
    }


    const buttonGroup = file.querySelector(".BtnGroup");
    const comparerButton = document.createElement("div");
    comparerButton.classList.add("BtnGroup-parent");
    comparerButton.classList.add("js-prose-diff-toggle-form");
    comparerButton.innerHTML = `<button class="img-comparer btn btn-sm BtnGroup-item tooltipped tooltipped-w rendered js-rendered" aria-label="Display image diff with Pixelmatch" data-disable-with="" aria-current="false">
  <svg class="octicon octicon-file" style="width: 16px; height: 16px;" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg"><path d="M426.666667 128H213.333333c-47.146667 0-85.333333 38.186667-85.333333 85.333333v597.333334c0 47.146667 38.186667 85.333333 85.333333 85.333333h213.333334v85.333333h85.333333V42.666667h-85.333333v85.333333z m0 640H213.333333l213.333334-256v256zM810.666667 128H597.333333v85.333333h213.333334v554.666667L597.333333 512v384h213.333334c47.146667 0 85.333333-38.186667 85.333333-85.333333V213.333333c0-47.146667-38.186667-85.333333-85.333333-85.333333z"  /></svg>
  </button>`;
    buttonGroup.appendChild(comparerButton);

    // Wait until we have images URLs with token inside iframe
    if (isPrivateRepo) {
      await waitUntilUrlIsLoaded(getImgUrl(file.dataset.tagsearchPath, organization, repo, baseCommitId));
      await waitUntilUrlIsLoaded(getImgUrl(file.dataset.tagsearchPath, organization, repo, endCommitId));
    }

    comparerButton.addEventListener("click", () =>
      onCompareButtonClick(file, baseCommitId, endCommitId, organization, repo, extensionOptions.threshold)
    );

    if (extensionOptions.isDefaultView) {
      const activeViewButton = buttonGroup.querySelector(".selected");
      // Sometimes GitHub fails to apply selected class to the button
      if (activeViewButton) {
        activeViewButton.classList.remove("selected");
        activeViewButton.ariaCurrent = "false";
      }
      const imgComparerButton = buttonGroup.querySelector(".img-comparer");
      imgComparerButton.classList.add("selected");
      imgComparerButton.ariaCurrent = "true";
      onCompareButtonClick(file, baseCommitId, endCommitId, organization, repo, extensionOptions.threshold);
    }
  };

  const intersectionObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          handleFile(entry.target);
          intersectionObserver.unobserve(entry.target);
        }
      });
    },
    { rootMargin: "300px" }
  );
  imgFiles.forEach((file) => intersectionObserver.observe(file));
};

start();
observe();
