var __create = Object.create;
var __getProtoOf = Object.getPrototypeOf;
var __defProp = Object.defineProperty;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __toESM = (mod, isNodeMode, target) => {
  target = mod != null ? __create(__getProtoOf(mod)) : {};
  const to = isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target;
  for (let key of __getOwnPropNames(mod))
    if (!__hasOwnProp.call(to, key))
      __defProp(to, key, {
        get: () => mod[key],
        enumerable: true
      });
  return to;
};
var __moduleCache = /* @__PURE__ */ new WeakMap;
var __toCommonJS = (from) => {
  var entry = __moduleCache.get(from), desc;
  if (entry)
    return entry;
  entry = __defProp({}, "__esModule", { value: true });
  if (from && typeof from === "object" || typeof from === "function")
    __getOwnPropNames(from).map((key) => !__hasOwnProp.call(entry, key) && __defProp(entry, key, {
      get: () => from[key],
      enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable
    }));
  __moduleCache.set(from, entry);
  return entry;
};
var __commonJS = (cb, mod) => () => (mod || cb((mod = { exports: {} }).exports, mod), mod.exports);
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, {
      get: all[name],
      enumerable: true,
      configurable: true,
      set: (newValue) => all[name] = () => newValue
    });
};

// node_modules/robotjs/build/Release/robotjs.node
var require_robotjs = __commonJS((exports2, module2) => {
  module2.exports = require("./robotjs-werckj16.node");
});

// node_modules/robotjs/index.js
var require_robotjs2 = __commonJS((exports2, module2) => {
  var robotjs = require_robotjs();
  module2.exports = robotjs;
  module2.exports.screen = {};
  function bitmap(width, height, byteWidth, bitsPerPixel, bytesPerPixel, image) {
    this.width = width;
    this.height = height;
    this.byteWidth = byteWidth;
    this.bitsPerPixel = bitsPerPixel;
    this.bytesPerPixel = bytesPerPixel;
    this.image = image;
    this.colorAt = function(x, y) {
      return robotjs.getColor(this, x, y);
    };
  }
  module2.exports.screen.capture = function(x, y, width, height) {
    if (typeof x !== "undefined" && typeof y !== "undefined" && typeof width !== "undefined" && typeof height !== "undefined") {
      b = robotjs.captureScreen(x, y, width, height);
    } else {
      b = robotjs.captureScreen();
    }
    return new bitmap(b.width, b.height, b.byteWidth, b.bitsPerPixel, b.bytesPerPixel, b.image);
  };
});

// index.ts
var exports_robot_js = {};
__export(exports_robot_js, {
  default: () => robot_js_default
});
module.exports = __toCommonJS(exports_robot_js);
var import_robotjs = __toESM(require_robotjs2());
var robot_js_default = import_robotjs.default;
