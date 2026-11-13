/**
 * Copyright 2018 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *     http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

// If the loader is already loaded, just stop.
if (!self.define) {
  let registry = {};

  // Used for `eval` and `importScripts` where we can't get script URL by other means.
  // In both cases, it's safe to use a global var because those functions are synchronous.
  let nextDefineUri;

  const singleRequire = (uri, parentUri) => {
    uri = new URL(uri + ".js", parentUri).href;
    return registry[uri] || (
      
        new Promise(resolve => {
          if ("document" in self) {
            const script = document.createElement("script");
            script.src = uri;
            script.onload = resolve;
            document.head.appendChild(script);
          } else {
            nextDefineUri = uri;
            importScripts(uri);
            resolve();
          }
        })
      
      .then(() => {
        let promise = registry[uri];
        if (!promise) {
          throw new Error(`Module ${uri} didn’t register its module`);
        }
        return promise;
      })
    );
  };

  self.define = (depsNames, factory) => {
    const uri = nextDefineUri || ("document" in self ? document.currentScript.src : "") || location.href;
    if (registry[uri]) {
      // Module is already loading or loaded.
      return;
    }
    let exports = {};
    const require = depUri => singleRequire(depUri, uri);
    const specialDeps = {
      module: { uri },
      exports,
      require
    };
    registry[uri] = Promise.all(depsNames.map(
      depName => specialDeps[depName] || require(depName)
    )).then(deps => {
      factory(...deps);
      return exports;
    });
  };
}
define(['./workbox-7e5eb42b'], (function (workbox) { 'use strict';

  self.skipWaiting();
  workbox.clientsClaim();
  /**
   * The precacheAndRoute() method efficiently caches and responds to
   * requests for URLs in the manifest.
   * See https://goo.gl/S9QRab
   */
  workbox.precacheAndRoute([{
    "url": "registerSW.js",
    "revision": "3ca0b8505b4bec776b69afdba2768812"
  }, {
    "url": "pwa-maskable-512x512.png",
    "revision": "915356b4ffbf67b4ffcf2e411fd62d1f"
  }, {
    "url": "pwa-maskable-192x192.png",
    "revision": "ac16986c016b2399f97c1c7d7b8e5a20"
  }, {
    "url": "pwa-512x512.png",
    "revision": "7564aa4c51df4f67dd3a57725f8d564b"
  }, {
    "url": "pwa-192x192.png",
    "revision": "264fe9122a879189486d1bd1179cdbf2"
  }, {
    "url": "manifest.webmanifest",
    "revision": "fe6d787835b0b66fe2e305a72c3864bf"
  }, {
    "url": "manifest.json",
    "revision": "16649c0c095db9b6bde78eb3f8340198"
  }, {
    "url": "index.html",
    "revision": "740a390989121d2840694e7dbbb4a40e"
  }, {
    "url": "icon.svg",
    "revision": "0baeb425f1fe631f7a3294db46e8f317"
  }, {
    "url": "favicon.ico",
    "revision": "1eebd61a5381e5a70f87ba04a0a97fc3"
  }, {
    "url": "apple-touch-icon.png",
    "revision": "12f4ac64a24129208ce620f5ceac7eb1"
  }, {
    "url": "fonts/noto-sans-ethiopic.woff2",
    "revision": "c2f1376dda86ffae267b140fd7cd31d3"
  }, {
    "url": "assets/workbox-window.prod.es5-Bd17z0YL.js",
    "revision": null
  }, {
    "url": "assets/index-BiOR0Ihn.js",
    "revision": null
  }, {
    "url": "assets/index-BRWKXdAI.css",
    "revision": null
  }, {
    "url": "apple-touch-icon.png",
    "revision": "12f4ac64a24129208ce620f5ceac7eb1"
  }, {
    "url": "favicon.ico",
    "revision": "1eebd61a5381e5a70f87ba04a0a97fc3"
  }, {
    "url": "icon.svg",
    "revision": "0baeb425f1fe631f7a3294db46e8f317"
  }, {
    "url": "manifest.json",
    "revision": "16649c0c095db9b6bde78eb3f8340198"
  }, {
    "url": "manifest.webmanifest",
    "revision": "16649c0c095db9b6bde78eb3f8340198"
  }, {
    "url": "pwa-192x192.png",
    "revision": "264fe9122a879189486d1bd1179cdbf2"
  }, {
    "url": "pwa-512x512.png",
    "revision": "7564aa4c51df4f67dd3a57725f8d564b"
  }, {
    "url": "pwa-maskable-192x192.png",
    "revision": "ac16986c016b2399f97c1c7d7b8e5a20"
  }, {
    "url": "pwa-maskable-512x512.png",
    "revision": "915356b4ffbf67b4ffcf2e411fd62d1f"
  }, {
    "url": "manifest.webmanifest",
    "revision": "fe6d787835b0b66fe2e305a72c3864bf"
  }], {});
  workbox.cleanupOutdatedCaches();
  workbox.registerRoute(new workbox.NavigationRoute(workbox.createHandlerBoundToURL("/index.html"), {
    allowlist: [/^(?!\/__).*/]
  }));

}));
