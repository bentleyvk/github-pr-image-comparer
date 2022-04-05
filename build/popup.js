const options = {
  isDefaultView: false,
  threshold: 0.1,
};
const isDefaultViewCheckbox = document.querySelector("#isDefaultView");
const thresholdInput = document.querySelector("#threshold");

window.chrome.storage.sync.get('options', (data) => {
  console.log(data);
  Object.assign(options, data.options);
  isDefaultViewCheckbox.checked = Boolean(options.isDefaultView);
  thresholdInput.value = options.threshold;
});

isDefaultViewCheckbox.addEventListener('change', (event) => {
  options.isDefaultView = event.target.checked;
  window.chrome.storage.sync.set({options});
});

thresholdInput.addEventListener('blur', (event) => {
  options.threshold = event.target.valueAsNumber;
  window.chrome.storage.sync.set({options});
});