const options = {};
const isDefaultViewCheckbox = document.querySelector("#isDefaultView");
console.log("isDefaultViewCheckbox", isDefaultViewCheckbox);

// Initialize the form with the user's option settings
window.chrome.storage.sync.get('options', (data) => {
  console.log(data);
  Object.assign(options, data.options);
  isDefaultViewCheckbox.checked = Boolean(options.isDefaultView);
});

isDefaultViewCheckbox.addEventListener('change', (event) => {
  console.log(event.target.checked);
  options.isDefaultView = event.target.checked;
  window.chrome.storage.sync.set({options});
});