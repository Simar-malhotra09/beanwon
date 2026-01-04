"use strict";
(() => {
  // background.ts
  chrome.runtime.onInstalled.addListener(() => {
    console.log("Annotator installed");
  });
})();
