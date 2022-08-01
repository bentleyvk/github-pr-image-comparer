const sent = {};

async function extractSrc(img) {
  const src = img.src;
  if (!src || sent[src]) {
    return;
  }

  // Send image src with token until we get a response that it was delivered.
  const intervalId = setInterval(() => {
    window.top.postMessage({ type: "iframe-loaded", src }, "https://github.com");
    console.log("post", src);
  }, 100);

  sent[src] = intervalId;
}

window.onmessage = (event) => {
  if (event.origin != "https://github.com") {
    return;
  }
  if (event.data?.type !== "src-delivered") {
    return;
  }
  clearInterval(sent[event.data.src]);
};

const observer = new MutationObserver(() => {
  document.querySelectorAll("img").forEach(extractSrc);
});

observer.observe(document, {
  childList: true,
  subtree: true,
});
