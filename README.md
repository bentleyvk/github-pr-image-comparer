<p align="center">
  <img src="build/icons/128x128.png" />
</p>

<div align="center">
  
  [![Google Chrome Web Store](https://img.shields.io/chrome-web-store/v/fdbkbdjkkjlceenjnkdopiiibkhlknlm?label=GitHub%20PR%20images%20comparer&style=flat-square)](https://chrome.google.com/webstore/detail/github-pr-images-comparer/fdbkbdjkkjlceenjnkdopiiibkhlknlm)

</div>

<p align="center">Enhanced GitHub PR images comparer that uses <code>pixelmatch</code>.</p>

# About

If you are like me and don't like to play "Find 5 differences" in your GitHub PR images, then this extension is just for you. Because: 
- It adds additional image comparer to the GitHub PR file preview that shows what pixels changed so you can easily spot the difference.
- You can open original, changed and diff images in a preview dialog for better comparison.
- There is also settings menu that allows you to make this comparer as a default one and change the threshold.

# Contributing

Run `npm install` and `npm run build` to build the extension. 
For better DX, use `npm run build:watch` to watch for changes and rebuild the extension.

Everything is done in the `build` directory. Go to `chrome://extensions/` and drag'n'drop the `build` folder.