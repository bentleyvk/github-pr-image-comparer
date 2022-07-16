const sent = new Set();

async function extractSrc(img) {
  const src = img.src;
  if (!src || sent.has(src)) {
    return;
  }
  window.top.postMessage({ type: "iframe-loaded", src }, "*");
  sent.add(src);
}

const observer = new MutationObserver(() => {
  document.querySelectorAll("img").forEach(extractSrc);
});

observer.observe(document, {
  childList: true,
  subtree: true,
});
