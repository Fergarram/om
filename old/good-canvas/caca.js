// user/lib/ima.ts
function useStaticTags() {
  return new Proxy({}, { get: staticTagGenerator });
}
function useTags(options) {
  const is_static = typeof window === "undefined";
  const resolved_options = typeof options === "string" ? { namespace: options } : options || {};
  if (is_static) {
    return useStaticTags();
  } else {
    return new Proxy({}, {
      get: (target, tag) => tagGenerator(target, String(tag), resolved_options)
    });
  }
}
if (typeof window === "undefined") {
  globalThis.document = {
    createElement: () => ({}),
    createTextNode: () => ({}),
    createComment: () => ({}),
    createElementNS: () => ({})
  };
  console.warn("Trying to use client-side tags on server.");
}
function parseTagArgs(args) {
  let props = {};
  let children = args;
  let ref;
  let innerHTML;
  if (args.length > 0) {
    const first_arg = args[0];
    if (typeof first_arg === "string" || typeof first_arg === "number" || typeof window !== "undefined" && first_arg instanceof HTMLElement || typeof first_arg === "function") {
      children = args;
    } else if (Object.getPrototypeOf(first_arg || 0) === Object.prototype) {
      const [props_arg, ...rest_args] = args;
      const { is, ref: prop_ref, innerHTML: prop_innerHTML, ...rest_props } = props_arg;
      props = rest_props;
      children = rest_args;
      ref = prop_ref;
      innerHTML = prop_innerHTML;
    }
  }
  return { props, children, ref, innerHTML };
}
function tagGenerator(_, tag, options) {
  return (...args) => {
    const { props, children, ref, innerHTML } = parseTagArgs(args);
    const element = options?.namespace ? document.createElementNS(options.namespace, tag) : document.createElement(tag);
    if (ref) {
      ref.current = element;
    }
    for (const [attr_key, value] of Object.entries(props)) {
      let processed_name = attr_key;
      let processed_value = value;
      if (options?.attr) {
        const result = options.attr(attr_key, value);
        processed_name = result.name;
        processed_value = result.value;
      }
      if (processed_name.startsWith("on") && typeof processed_value === "function") {
        const event_name = processed_name.substring(2).toLowerCase();
        element.addEventListener(event_name, processed_value);
        continue;
      }
      if (typeof processed_value === "function" && !processed_name.startsWith("on")) {
        setupReactiveAttr(element, processed_name, processed_value);
        continue;
      }
      if (processed_value === true) {
        element.setAttribute(processed_name, "true");
      } else if (processed_value === false) {
        element.setAttribute(processed_name, "false");
      } else if (processed_value !== null && processed_value !== undefined) {
        element.setAttribute(processed_name, String(processed_value));
      }
    }
    if (innerHTML !== undefined) {
      element.innerHTML = String(innerHTML);
      return element;
    }
    for (const child of children.flat(Infinity)) {
      if (child != null) {
        if (child instanceof Node) {
          element.appendChild(child);
        } else if (typeof child === "function") {
          const reactive_node = setupReactiveNode(child);
          element.appendChild(reactive_node);
        } else {
          element.appendChild(document.createTextNode(String(child)));
        }
      }
    }
    return element;
  };
}
var reactive_markers = [];
var reactive_callbacks = [];
var reactive_prev_values = [];
var reactive_node_count = 0;
var reactive_attr_elements = [];
var reactive_attr_names = [];
var reactive_attr_callbacks = [];
var reactive_attr_prev_values = [];
var reactive_attr_count = 0;
var frame_time = 0;
var cleanup_counter = 0;
if (typeof window !== "undefined") {
  requestAnimationFrame(updateReactiveComponents);
}
function updateReactiveComponents() {
  const start_time = performance.now();
  let found_disconnected_attrs = false;
  let found_disconnected_nodes = false;
  for (let i = 0;i < reactive_attr_count; i++) {
    const element = reactive_attr_elements[i];
    if (!element || !element.isConnected) {
      found_disconnected_attrs = true;
      continue;
    }
    const attr_name = reactive_attr_names[i];
    const callback = reactive_attr_callbacks[i];
    if (!attr_name || !callback)
      continue;
    const new_value = callback();
    if (new_value !== reactive_attr_prev_values[i]) {
      if (new_value === true) {
        element.setAttribute(attr_name, "true");
      } else if (new_value === false) {
        element.setAttribute(attr_name, "false");
      } else if (new_value === null || new_value === undefined) {
        element.removeAttribute(attr_name);
      } else {
        element.setAttribute(attr_name, String(new_value));
      }
      reactive_attr_prev_values[i] = new_value;
    }
  }
  for (let i = 0;i < reactive_node_count; i++) {
    const marker = reactive_markers[i];
    if (!marker || !marker.isConnected) {
      found_disconnected_nodes = true;
      continue;
    }
    const callback = reactive_callbacks[i];
    if (!callback)
      continue;
    const new_value = callback();
    const current_node = marker.previousSibling;
    if (!current_node)
      continue;
    let needs_update = false;
    if (new_value instanceof Node) {
      if (current_node instanceof HTMLElement && new_value instanceof HTMLElement) {
        if (current_node.outerHTML !== new_value.outerHTML) {
          needs_update = true;
        }
      } else {
        needs_update = true;
      }
    } else {
      const new_text = String(new_value || "");
      if (current_node.nodeType === Node.TEXT_NODE) {
        needs_update = current_node.textContent !== new_text;
      } else {
        needs_update = true;
      }
    }
    if (needs_update) {
      let new_node;
      if (new_value instanceof Node) {
        new_node = new_value;
      } else {
        new_node = document.createTextNode(String(new_value || ""));
      }
      current_node.replaceWith(new_node);
    }
  }
  if (found_disconnected_attrs || found_disconnected_nodes) {
    cleanup_counter++;
    if (cleanup_counter >= 60) {
      cleanup_counter = 0;
      cleanupDisconnectedReactives();
    }
  }
  frame_time = performance.now() - start_time;
  requestAnimationFrame(updateReactiveComponents);
}
function cleanupDisconnectedReactives() {
  let write_index = 0;
  for (let read_index = 0;read_index < reactive_node_count; read_index++) {
    const marker = reactive_markers[read_index];
    const callback = reactive_callbacks[read_index];
    const prev_value = reactive_prev_values[read_index];
    if (marker && marker.isConnected) {
      if (write_index !== read_index) {
        reactive_markers[write_index] = marker;
        reactive_callbacks[write_index] = callback;
        reactive_prev_values[write_index] = prev_value;
      }
      write_index++;
    }
  }
  for (let i = write_index;i < reactive_node_count; i++) {
    reactive_markers[i] = null;
    reactive_callbacks[i] = null;
    reactive_prev_values[i] = null;
  }
  reactive_node_count = write_index;
  write_index = 0;
  for (let read_index = 0;read_index < reactive_attr_count; read_index++) {
    const element = reactive_attr_elements[read_index];
    const attr_name = reactive_attr_names[read_index];
    const callback = reactive_attr_callbacks[read_index];
    const prev_value = reactive_attr_prev_values[read_index];
    if (element && element.isConnected) {
      if (write_index !== read_index) {
        reactive_attr_elements[write_index] = element;
        reactive_attr_names[write_index] = attr_name;
        reactive_attr_callbacks[write_index] = callback;
        reactive_attr_prev_values[write_index] = prev_value;
      }
      write_index++;
    }
  }
  for (let i = write_index;i < reactive_attr_count; i++) {
    reactive_attr_elements[i] = null;
    reactive_attr_names[i] = null;
    reactive_attr_callbacks[i] = null;
    reactive_attr_prev_values[i] = undefined;
  }
  reactive_attr_count = write_index;
}
function setupReactiveNode(callback) {
  const node_index = reactive_node_count++;
  const marker = document.createComment(`reactive-${node_index}`);
  const initial_value = callback();
  let initial_node;
  if (initial_value instanceof Node) {
    initial_node = initial_value;
  } else {
    initial_node = document.createTextNode(String(initial_value || ""));
  }
  const fragment = document.createDocumentFragment();
  fragment.appendChild(initial_node);
  fragment.appendChild(marker);
  reactive_markers[node_index] = marker;
  reactive_callbacks[node_index] = callback;
  reactive_prev_values[node_index] = initial_node;
  return fragment;
}
function setupReactiveAttr(element, attr_name, callback) {
  const attr_index = reactive_attr_count++;
  const initial_value = callback();
  if (initial_value === true) {
    element.setAttribute(attr_name, "true");
  } else if (initial_value === false) {
    element.setAttribute(attr_name, "false");
  } else if (initial_value !== null && initial_value !== undefined) {
    element.setAttribute(attr_name, String(initial_value));
  }
  reactive_attr_elements[attr_index] = element;
  reactive_attr_names[attr_index] = attr_name;
  reactive_attr_callbacks[attr_index] = callback;
  reactive_attr_prev_values[attr_index] = initial_value;
}
var VOID_ELEMENTS = new Set([
  "area",
  "base",
  "br",
  "col",
  "embed",
  "hr",
  "img",
  "input",
  "link",
  "meta",
  "param",
  "source",
  "track",
  "wbr"
]);
function escapeHtml(value) {
  return value.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/'/g, "&#39;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
function buildAttributesHtml(props) {
  let html = "";
  for (const [key, value] of Object.entries(props)) {
    if (key.startsWith("on") || typeof value === "function") {
      continue;
    }
    if (value === true) {
      html += ` ${key}`;
    } else if (value !== false && value != null) {
      html += ` ${key}="${escapeHtml(String(value))}"`;
    }
  }
  return html;
}
function staticTagGenerator(_, tag) {
  return (...args) => {
    const { props, children, innerHTML } = parseTagArgs(args);
    let html = `<${tag}${buildAttributesHtml(props)}`;
    if (VOID_ELEMENTS.has(tag)) {
      return html + "/>";
    }
    html += ">";
    if (innerHTML !== undefined) {
      const inner_html_content = typeof innerHTML === "function" ? innerHTML() : innerHTML;
      html += String(inner_html_content);
      return html + `</${tag}>`;
    }
    for (const child of children.flat(Infinity)) {
      if (child != null) {
        if (typeof child === "function") {
          html += String(child());
        } else {
          html += String(child);
        }
      }
    }
    return html + `</${tag}>`;
  };
}

// user/lib/utils.js
function fade(color, opacity) {
  return `color-mix(in oklch, var(${color}), transparent ${100 - opacity}%)`;
}
function debounce(fn, delay) {
  let timeout_id = null;
  let resolve_callback = null;
  const debounced = (...args) => {
    if (timeout_id) {
      clearTimeout(timeout_id);
    }
    debounced.callback = new Promise((resolve) => {
      resolve_callback = resolve;
    });
    timeout_id = setTimeout(() => {
      const result = fn.apply(null, args);
      if (resolve_callback) {
        resolve_callback(result);
      }
      timeout_id = null;
    }, delay);
    return debounced.callback;
  };
  debounced.callback = Promise.resolve();
  debounced.cancel = () => {
    if (timeout_id) {
      clearTimeout(timeout_id);
      timeout_id = null;
    }
  };
  return debounced;
}
async function tryCatch(func) {
  try {
    const result = func();
    if (result instanceof Promise) {
      return [await result, null];
    }
    return [result, null];
  } catch (error) {
    return [null, error];
  }
}
function isScrollable(element) {
  if (!element)
    return false;
  const style = window.getComputedStyle(element);
  const overflow_y = style.getPropertyValue("overflow-y");
  const overflow_x = style.getPropertyValue("overflow-x");
  return (overflow_y === "scroll" || overflow_y === "auto" || overflow_x === "scroll" || overflow_x === "auto") && (element.scrollHeight > element.clientHeight || element.scrollWidth > element.clientWidth);
}
function GlobalStyleSheet(styles) {
  const sheet = createStylesheet("global_styles");
  const cleaned_css = styles.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\s+/g, " ").trim();
  let rules = [];
  let current_rule = "";
  let brace_count = 0;
  for (let i = 0;i < cleaned_css.length; i++) {
    const char = cleaned_css[i];
    current_rule += char;
    if (char === "{") {
      brace_count++;
    } else if (char === "}") {
      brace_count--;
      if (brace_count === 0) {
        rules.push(current_rule.trim());
        current_rule = "";
      }
    }
  }
  for (const rule of rules) {
    try {
      sheet.insertRule(rule, sheet.cssRules.length);
    } catch (error) {
      console.error(`Failed to insert CSS rule: ${rule}`, error);
    }
  }
}
function createStylesheet(id) {
  let sheet = document.adoptedStyleSheets.find((sheet2) => sheet2.id === id);
  if (!sheet) {
    sheet = new CSSStyleSheet;
    sheet.id = id;
    document.adoptedStyleSheets = [...document.adoptedStyleSheets, sheet];
  }
  return sheet;
}
function finish(time = 0) {
  return new Promise((resolve) => setTimeout(resolve, time));
}
function css(strings, ...values) {
  return strings.reduce((result, str, i) => result + str + (i < values.length ? values[i] : ""), "");
}

// user/lib/bridge.ts
var __sys = window.__sys;
var shell = {
  async exec(command) {
    return await __sys.invoke("shell.exec", command);
  }
};
var process = {
  async env() {
    return await __sys.invoke("process.env");
  },
  async platform() {
    return await __sys.invoke("process.platform");
  },
  async isWin32() {
    return await __sys.invoke("process.platform") === "win32";
  },
  async cwd() {
    return await __sys.invoke("process.cwd");
  }
};
var file = {
  async dirname(filepath) {
    return await __sys.invoke("file.dirname", filepath);
  },
  async resolve(filepath) {
    return await __sys.invoke("file.resolve", filepath);
  },
  async exists(filepath) {
    return await __sys.invoke("file.exists", filepath);
  },
  async isDir(filepath, create_if_not_exists = false) {
    return await __sys.invoke("file.is_dir", filepath, create_if_not_exists);
  },
  async relative(basepath, filepath) {
    return await __sys.invoke("file.relative", basepath, filepath);
  },
  async parsePath(filepath) {
    return await __sys.invoke("file.parse_path", filepath);
  },
  async rename(old_path, new_name) {
    return await __sys.invoke("file.rename", old_path, new_name);
  },
  async read(filepath, opt = "utf8") {
    return await __sys.invoke("file.read", filepath, opt);
  },
  async write(filepath, content, opt = "utf8") {
    return await __sys.invoke("file.write", filepath, content, opt);
  },
  async getInfo(filepath, basepath) {
    return await __sys.invoke("file.get_info", filepath, basepath);
  },
  async directoryTree(dirpath) {
    return await __sys.invoke("file.directory_tree", dirpath);
  },
  async getContentType(filepath) {
    return await __sys.invoke("file.get_content_type", filepath);
  }
};
var dialog = {
  async showOpen(opts) {
    return await __sys.invoke("dialog.show_open", opts);
  }
};
var menu = {
  async show(id, items, x, y) {
    return await __sys.invoke("menu.show", id, items, x, y);
  },
  async onClick(callback) {
    return await __sys.on("menu.on_click", callback);
  }
};
var win = {
  async close() {
    return await __sys.invoke("win.close");
  },
  async minimize() {
    return await __sys.invoke("win.minimize");
  },
  async maximize() {
    return await __sys.invoke("win.maximize");
  },
  async unmaximize() {
    return await __sys.invoke("win.unmaximize");
  },
  async isMaximized() {
    return await __sys.invoke("win.is_maximized");
  },
  async onMaximize(callback) {
    return await __sys.on("win.on_maximize", callback);
  },
  async onUnmaximize(callback) {
    return await __sys.on("win.on_unmaximize", callback);
  },
  async onMinimize(callback) {
    return await __sys.on("win.on_minimize", callback);
  },
  async openInBrowser(url) {
    return await __sys.invoke("win.open_in_browser", url);
  },
  async devtoolsOpened(callback) {
    return await __sys.on("win.devtools_opened", callback);
  },
  async devtoolsClosed(callback) {
    return await __sys.on("win.devtools_closed", callback);
  },
  async isDevtoolsOpen() {
    return await __sys.invoke("win.is_devtools_open");
  },
  async getBounds() {
    return await __sys.invoke("win.get_bounds");
  },
  async focus() {
    return await __sys.invoke("win.focus");
  },
  async openSpace(space) {
    return await __sys.invoke("win.open_space", space);
  }
};
var appstream = {
  async select(opts) {
    return await __sys.invoke("appstream.select", opts);
  },
  async getCapturedWindows() {
    return await __sys.invoke("appstream.get_captured_windows");
  },
  async getWindowCapture(id) {
    return await __sys.invoke("appstream.get_window_capture", id);
  },
  async windowCaptureUpdated(callback) {
    __sys.on("appstream.window_capture_updated", (e, id) => {
      callback(id);
    });
  },
  async focusWindow(window_id) {
    return await __sys.invoke("appstream.focus_window", window_id);
  },
  async closeWindow(window_id) {
    return await __sys.invoke("appstream.close_window", window_id);
  },
  async onWindowClosed(callback) {
    return await __sys.on("appstream.window_closed", (e, id) => {
      callback(id);
    });
  },
  async resizeWindow(window_id, dimensions) {
    return await __sys.invoke("appstream.resize_window", window_id, dimensions);
  },
  async setWindowPosition(window_id, x, y) {
    return await __sys.invoke("appstream.set_window_position", window_id, x, y);
  }
};
var browser = {
  async newWindow(url) {
    return await __sys.invoke("browser.new_window", url);
  },
  async capturePage(webcontents_id) {
    return await __sys.invoke("browser.capture_page", webcontents_id);
  },
  async openWebviewDevtools(target_webview_wcid, devtools_webview_wcid) {
    return await __sys.invoke("browser.open_webview_devtools", target_webview_wcid, devtools_webview_wcid);
  }
};
var overlay = {
  async focus() {
    return await __sys.invoke("overlay.focus");
  },
  async setHeight(height) {
    return await __sys.invoke("overlay.set_height", height);
  },
  async openDevTools() {
    return await __sys.invoke("overlay.open_devtools");
  }
};
var shortcuts = {
  async register(options) {
    const { accelerator, name, description, callback } = options;
    __sys.on("shortcuts.triggered", (event, triggered_name) => {
      if (triggered_name === name && typeof callback === "function") {
        callback();
      }
    });
    return await __sys.invoke("shortcuts.register", {
      accelerator,
      name,
      description
    });
  },
  async unregister(name) {
    return await __sys.invoke("shortcuts.unregister", name);
  },
  async getAll() {
    return await __sys.invoke("shortcuts.get_all");
  },
  async onTrigger(callback) {
    return await __sys.on("shortcuts.triggered", (event, name) => {
      callback(name);
    });
  }
};
var sys = {
  shell,
  process,
  file,
  dialog,
  menu,
  win,
  appstream,
  browser,
  shortcuts,
  overlay
};
var bridge_default = sys;

// user/modules/om/background.js
var IMAGE_SRC = "https://d2w9rnfcy7mm78.cloudfront.net/37434530/original_f0c16b4c4af17175edd2c76aa8005728.jpg?1749927953?bc=0";
async function initializeBackgroundCanvas(desktop, canvas) {
  canvas.width = desktop.offsetWidth;
  canvas.height = desktop.offsetHeight;
  const gl = canvas.getContext("webgl", { antialias: true });
  if (!gl) {
    console.error("WebGL not supported");
    return null;
  }
  const vertex_shader_source = `
        attribute vec2 a_position;
        attribute vec2 a_texcoord;

        varying vec2 v_texcoord;

        void main() {
            // Convert position directly to clip space (-1 to +1)
            gl_Position = vec4(a_position, 0, 1);
            v_texcoord = a_texcoord;
        }
    `;
  const fragment_shader_source = `
        precision mediump float;

        uniform sampler2D u_image;
        varying vec2 v_texcoord;

        void main() {
            gl_FragColor = texture2D(u_image, v_texcoord);
        }
    `;
  function create_shader(gl2, type, source) {
    const shader = gl2.createShader(type);
    gl2.shaderSource(shader, source);
    gl2.compileShader(shader);
    if (!gl2.getShaderParameter(shader, gl2.COMPILE_STATUS)) {
      console.error("Shader compile error:", gl2.getShaderInfoLog(shader));
      gl2.deleteShader(shader);
      return null;
    }
    return shader;
  }
  const vertex_shader = create_shader(gl, gl.VERTEX_SHADER, vertex_shader_source);
  const fragment_shader = create_shader(gl, gl.FRAGMENT_SHADER, fragment_shader_source);
  const program = gl.createProgram();
  gl.attachShader(program, vertex_shader);
  gl.attachShader(program, fragment_shader);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    console.error("Program linking error:", gl.getProgramInfoLog(program));
    return null;
  }
  const position_location = gl.getAttribLocation(program, "a_position");
  const texcoord_location = gl.getAttribLocation(program, "a_texcoord");
  const position_buffer = gl.createBuffer();
  const texcoord_buffer = gl.createBuffer();
  const texture = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  const wallpaper = new Image;
  wallpaper.src = IMAGE_SRC;
  wallpaper.crossOrigin = "anonymous";
  await new Promise((resolve) => {
    if (wallpaper.complete) {
      resolve();
    } else {
      wallpaper.onload = resolve;
    }
  });
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, wallpaper);
  function drawWallpaper(camera_x, camera_y, current_scale) {
    if (!gl || !wallpaper.complete)
      return;
    if (canvas.width !== desktop.offsetWidth || canvas.height !== desktop.offsetHeight) {
      canvas.width = desktop.offsetWidth;
      canvas.height = desktop.offsetHeight;
      gl.viewport(0, 0, canvas.width, canvas.height);
    }
    const tile_width = wallpaper.width * current_scale;
    const tile_height = wallpaper.height * current_scale;
    let offset_x = -(camera_x % tile_width);
    let offset_y = -(camera_y % tile_height);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.useProgram(program);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.bindBuffer(gl.ARRAY_BUFFER, texcoord_buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([0, 0, 1, 0, 0, 1, 0, 1, 1, 0, 1, 1]), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(texcoord_location);
    gl.vertexAttribPointer(texcoord_location, 2, gl.FLOAT, false, 0, 0);
    for (let x = offset_x;x < canvas.width; x += tile_width) {
      for (let y = offset_y;y < canvas.height; y += tile_height) {
        const left = x / canvas.width * 2 - 1;
        const right = (x + tile_width) / canvas.width * 2 - 1;
        const top = 1 - y / canvas.height * 2;
        const bottom = 1 - (y + tile_height) / canvas.height * 2;
        gl.bindBuffer(gl.ARRAY_BUFFER, position_buffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
          left,
          top,
          right,
          top,
          left,
          bottom,
          left,
          bottom,
          right,
          top,
          right,
          bottom
        ]), gl.STATIC_DRAW);
        gl.enableVertexAttribArray(position_location);
        gl.vertexAttribPointer(position_location, 2, gl.FLOAT, false, 0, 0);
        gl.drawArrays(gl.TRIANGLES, 0, 6);
      }
    }
  }
  function resizeCanvas() {
    canvas.width = desktop.offsetWidth;
    canvas.height = desktop.offsetHeight;
    if (gl) {
      gl.viewport(0, 0, canvas.width, canvas.height);
    }
  }
  return {
    resizeCanvas,
    drawWallpaper
  };
}

// user/modules/om/desktop.js
var { div, canvas } = useTags();
var desktop_el = null;
var surface_el = null;
var surface_initial_width = 1e5;
var surface_initial_height = surface_initial_width * (window.innerHeight / window.innerWidth);
var applet_shadow_map = div({
  id: "applet-shadow-map",
  style: css`
		pointer-events: none;
		opacity: 0;
	`
});
document.body.appendChild(applet_shadow_map);
await finish();
var shadow_root = applet_shadow_map.attachShadow({ mode: "open" });
var HANDLE_CONFIG = {
  EDGE_SIZE: 12,
  CORNER_SIZE: 12,
  OFFSET: -6
};
var MIN_ZOOM = 0.1;
var MAX_ZOOM = 1;
var place_callbacks = [];
var remove_callbacks = [];
var order_change_callbacks = [];
var camera_x = 0;
var camera_y = 0;
var scrolling_timeout = null;
var zoom_timeout = null;
var is_panning = false;
var is_scrolling = false;
var last_middle_click_x = 0;
var last_middle_click_y = 0;
var current_scale = 1;
var pending_mouse_dx = 0;
var pending_mouse_dy = 0;
var has_pending_mouse_movement = false;
var zoom_level = 1;
var is_zooming = false;
var scroll_thumb_x = 0;
var scroll_thumb_y = 0;
var last_mouse_x = 0;
var last_mouse_y = 0;
var delta_x = 0;
var delta_y = 0;
var dragged_applet = null;
var dragging_x = 0;
var dragging_y = 0;
var last_width = 0;
var last_height = 0;
var last_left = 0;
var last_top = 0;
var current_mouse_button = null;
var min_width = 10;
var min_height = 10;
var is_resizing = false;
var resize_edge = null;
var is_right_resize = false;
var resize_start_width = 0;
var resize_start_height = 0;
var resize_start_x = 0;
var resize_start_y = 0;
var resize_quadrant = null;
var resize_start_left = 0;
var resize_start_top = 0;
var observer = new MutationObserver((mutations) => {
  for (let mutation of mutations) {
    if (mutation.type === "childList") {
      if (mutation.addedNodes.length > 0) {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === 1 && node.getAttribute("om-motion") !== "elevated" && node.hasAttribute("om-applet")) {
            placeApplet(node);
          }
        });
      }
      if (mutation.removedNodes.length > 0) {
        mutation.removedNodes.forEach((node) => {
          if (node.nodeType === 1 && node.getAttribute("om-motion") !== "elevated" && node.hasAttribute("om-applet")) {
            removeApplet(node);
          }
        });
      }
    }
  }
});
GlobalStyleSheet(css`
	#om-desktop {
		position: relative;
		width: 100%;
		height: auto;
		flex-grow: 1;
		overflow: hidden;
	}

	#om-desktop-canvas {
		position: absolute;
		width: 100%;
		height: auto;
		bottom: 0;
		flex-grow: 1;
		overflow: hidden;
	}

	#om-desktop-surface {
		position: absolute;
		transform-origin: 0 0;
		transform: scale(1);
		width: ${surface_initial_width}px;
		height: ${surface_initial_height}px;
	}
`);
async function initializeDesktop(om_space) {
  const desktop = div({
    id: "om-desktop"
  }, div({
    id: "om-desktop-surface"
  }));
  const canvas_el = canvas({
    id: "om-desktop-canvas"
  });
  om_space.appendChild(canvas_el);
  om_space.appendChild(desktop);
  await finish();
  const { drawWallpaper, resizeCanvas } = await initializeBackgroundCanvas(desktop, canvas_el);
  observer.observe(surface(), { childList: true });
  onAppletPlace(handleAppleyPlacement);
  handleResize();
  window.addEventListener("resize", handleResize);
  window.addEventListener("keydown", handleGlobalKeydown);
  desktop.addEventListener("wheel", desktopWheel, { passive: false });
  desktop.addEventListener("scroll", desktopScroll);
  surface().addEventListener("mousedown", surfaceMouseDown);
  window.addEventListener("mouseleave", windowMouseOut);
  window.addEventListener("mouseout", windowMouseOut);
  window.addEventListener("dblclick", windowDblClick);
  window.addEventListener("mousedown", windowMouseDown);
  window.addEventListener("mouseup", windowMouseUp);
  window.addEventListener("mousemove", windowMouseMove);
  requestAnimationFrame(step);
  scrollToCenter();
  function scrollToCenter() {
    const rect = surface().getBoundingClientRect();
    desktop.scroll({
      left: rect.width / 2 - desktop.offsetWidth / 2,
      top: rect.height / 2 - desktop.offsetHeight / 2
    });
  }
  function updateSurfaceScale() {
    surface().style.transform = `scale(${current_scale})`;
    zoom_level = current_scale;
  }
  function handleResize() {
    resizeCanvas();
    drawWallpaper(camera_x, camera_y, current_scale);
  }
  async function handleGlobalKeydown(e) {
    if ((e.ctrlKey || e.metaKey) && e.key === "=") {
      e.preventDefault();
    } else if ((e.ctrlKey || e.metaKey) && e.key === "-") {
      e.preventDefault();
    } else if ((e.ctrlKey || e.metaKey) && e.key === "0") {
      e.preventDefault();
    }
    if (e.altKey) {
      const prev_scroll_x = desktop.scrollLeft;
      const prev_scroll_y = desktop.scrollTop;
      const viewport_width = desktop.offsetWidth;
      const viewport_height = desktop.offsetHeight;
      const center_x = (prev_scroll_x + viewport_width / 2) / current_scale;
      const center_y = (prev_scroll_y + viewport_height / 2) / current_scale;
      if (e.key === "≠") {
        e.preventDefault();
        is_zooming = true;
        current_scale = Math.min(current_scale + 0.1, 1);
      } else if (e.key === "–") {
        e.preventDefault();
        is_zooming = true;
        current_scale = Math.max(current_scale - 0.1, 0.1);
      } else if (e.key === "º") {
        e.preventDefault();
        is_zooming = true;
        current_scale = 1;
      } else {
        return;
      }
      updateSurfaceScale();
      await finish();
      const new_scroll_x = center_x * current_scale - viewport_width / 2;
      const new_scroll_y = center_y * current_scale - viewport_height / 2;
      desktop.scrollTo({
        left: new_scroll_x,
        top: new_scroll_y
      });
      clearTimeout(zoom_timeout);
      zoom_timeout = setTimeout(() => {
        is_zooming = false;
      }, 150);
    }
  }
  async function desktopWheel(e) {
    let target = e.target;
    while (target && target !== surface()) {
      if (isScrollable(target) && !is_scrolling) {
        return;
      }
      target = target.parentElement;
    }
    if (window.is_trackpad && window.superkeydown && e.shiftKey && !e.ctrlKey) {
      e.preventDefault();
      desktop.scrollTo({
        left: camera_x + e.deltaX,
        top: camera_y + e.deltaY
      });
    } else if (window.superkeydown && !is_panning || window.is_trackpad && window.superkeydown && e.shiftKey && e.ctrlKey) {
      e.preventDefault();
      const prev_scroll_x = desktop.scrollLeft;
      const prev_scroll_y = desktop.scrollTop;
      const rect = desktop.getBoundingClientRect();
      const cursor_x = e.clientX - rect.left;
      const cursor_y = e.clientY - rect.top;
      const point_x = (prev_scroll_x + cursor_x) / current_scale;
      const point_y = (prev_scroll_y + cursor_y) / current_scale;
      const scale_factor = Math.max(0.005, current_scale * 0.05);
      const delta = e.deltaY > 0 ? -scale_factor : scale_factor;
      let new_scale = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, current_scale + delta));
      if (new_scale !== current_scale) {
        is_zooming = true;
        current_scale = new_scale;
        updateSurfaceScale();
        const new_scroll_x = point_x * current_scale - cursor_x;
        const new_scroll_y = point_y * current_scale - cursor_y;
        desktop.scrollTo({
          left: new_scroll_x,
          top: new_scroll_y
        });
        clearTimeout(zoom_timeout);
        zoom_timeout = setTimeout(() => {
          is_zooming = false;
        }, 150);
      }
    }
  }
  function desktopScroll(e) {
    is_scrolling = true;
    clearTimeout(scrolling_timeout);
    scrolling_timeout = setTimeout(() => {
      is_scrolling = false;
    }, 150);
    const rect = surface().getBoundingClientRect();
    const max_x = rect.width - desktop.offsetWidth;
    const max_y = rect.height - desktop.offsetHeight;
    let new_x = desktop.scrollLeft;
    let new_y = desktop.scrollTop;
    if (new_x >= max_x) {
      new_x = max_x;
    }
    if (new_y >= max_y) {
      new_y = max_y;
    }
    camera_x = desktop.scrollLeft;
    camera_y = desktop.scrollTop;
    scroll_thumb_x = desktop.scrollLeft / rect.width * 100;
    scroll_thumb_y = desktop.scrollTop / rect.height * 100;
  }
  function surfaceMouseDown(e) {
    if (window.superkeydown && e.button === 1 || window.superkeydown && e.button === 0 && e.target === surface()) {
      e.preventDefault();
      is_panning = true;
      document.body.classList.add("is-panning");
      last_middle_click_x = e.clientX;
      last_middle_click_y = e.clientY;
    }
  }
  function windowMouseOut(e) {
    if (e.target.tagName !== "HTML")
      return;
    is_panning = false;
    document.body.classList.remove("is-panning");
  }
  function windowDblClick(e) {}
  function windowMouseDown(e) {}
  function windowMouseUp(e) {
    if (e.button === 1 || e.button === 0) {
      is_panning = false;
      document.body.classList.remove("is-panning");
    }
  }
  function windowMouseMove(e) {
    if (is_panning) {
      pending_mouse_dx += e.clientX - last_middle_click_x;
      pending_mouse_dy += e.clientY - last_middle_click_y;
      has_pending_mouse_movement = true;
      last_middle_click_x = e.clientX;
      last_middle_click_y = e.clientY;
    }
  }
  function step() {
    if (has_pending_mouse_movement && is_panning) {
      camera_x -= pending_mouse_dx;
      camera_y -= pending_mouse_dy;
      pending_mouse_dx = 0;
      pending_mouse_dy = 0;
      has_pending_mouse_movement = false;
    }
    if (camera_x <= 0) {
      camera_x = 0;
    }
    if (camera_y <= 0) {
      camera_y = 0;
    }
    const rect = surface().getBoundingClientRect();
    const max_x = rect.width - desktop.offsetWidth;
    const max_y = rect.height - desktop.offsetHeight;
    if (camera_x >= max_x) {
      camera_x = max_x;
    }
    if (camera_y >= max_y) {
      camera_y = max_y;
    }
    if (is_panning) {
      desktop.scroll({
        left: camera_x,
        top: camera_y,
        behavior: "instant"
      });
    }
    updateSurfaceScale();
    drawWallpaper(camera_x, camera_y, current_scale);
    requestAnimationFrame(step);
  }
}
function getCameraCenter() {
  return {
    x: (camera_x + desktop().offsetWidth / 2) / current_scale,
    y: (camera_y + desktop().offsetHeight / 2) / current_scale
  };
}
function desktop() {
  if (!desktop_el) {
    desktop_el = document.getElementById("om-desktop");
  }
  return desktop_el;
}
function surface(child) {
  if (!surface_el) {
    surface_el = document.getElementById("om-desktop-surface");
  }
  return surface_el;
}
function onAppletPlace(callback) {
  place_callbacks.push(callback);
}
function onAppletRemove(callback) {
  remove_callbacks.push(callback);
}
async function placeApplet(applet, first_mount = false) {
  place_callbacks.forEach((c) => c(applet, first_mount));
  if (!applet.hasAttribute("om-tsid")) {
    const uuid = ([1e7] + -1000 + -4000 + -8000 + -100000000000).replace(/[018]/g, (c) => (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16));
    applet.setAttribute("om-tsid", uuid);
    if (!first_mount) {
      addShadowClone(applet, uuid);
    }
  }
  if (!first_mount)
    save();
}
async function removeApplet(applet) {
  removeShadowClone(applet);
  remove_callbacks.forEach((c) => c(applet));
}
function lift(tsid) {
  const shadow_clone = shadow_root.querySelector(`[om-tsid="${tsid}"]`);
  shadow_clone.parentNode.insertBefore(shadow_clone, null);
  const applets = Array.from(surface().querySelectorAll("[om-applet]"));
  applets.forEach((win2) => {
    const id = win2.getAttribute("om-tsid");
    const m = shadow_root.querySelector(`[om-tsid="${id}"]`);
    const new_z_index = Array.from(m.parentNode.children).indexOf(m);
    win2.style.zIndex = new_z_index;
    order_change_callbacks.forEach((c) => c(win2, new_z_index));
  });
}
function save() {}
function addShadowClone(win2, id) {
  const shadow_clone = document.createElement("div");
  shadow_clone.style.position = "absolute";
  shadow_clone.setAttribute("om-tsid", id);
  shadow_root.appendChild(shadow_clone);
  const new_z_index = shadow_root.children.length;
  win2.style.zIndex = new_z_index;
  order_change_callbacks.forEach((c) => c(win2, new_z_index));
}
function removeShadowClone(win2) {
  const removed_id = win2.getAttribute("om-tsid");
  const shadow_clone = shadow_root.querySelector(`[om-tsid="${removed_id}"]`);
  if (shadow_clone) {
    const mirrors = Array.from(shadow_root.children);
    mirrors.filter((m) => m.getAttribute("om-tsid") !== removed_id).forEach((m, i) => {
      const t = surface().querySelector(`[om-tsid="${m.getAttribute("om-tsid")}"]`);
      if (t) {
        const new_z_index = i + 1;
        t.style.zIndex = new_z_index;
        order_change_callbacks.forEach((c) => c(t, new_z_index));
      }
    });
    shadow_clone.remove();
  }
}
async function handleAppleyPlacement(applet, first_mount = false) {
  if (!first_mount) {
    await finish();
    applet.setAttribute("om-motion", "idle");
    applet.style.removeProperty("will-change");
  }
  applet.addEventListener("contextmenu", preventContextMenu);
  applet.addEventListener("mousedown", handle_mousedown);
  async function handle_mousedown(e) {
    if (!e.target || dragged_applet !== null || is_panning)
      return;
    current_mouse_button = e.button;
    const target = e.target;
    const is_contenteditable = target.isContentEditable || target.closest('[contenteditable="true"]');
    const is_drag_handle = target.hasAttribute("drag-handle");
    if (applet.getAttribute("om-motion") !== "idle" || target.tagName === "A" || target.tagName === "BUTTON" || target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.tagName === "SELECT" || is_contenteditable || target.tagName === "IMG" && target.getAttribute("draggable") !== "false") {
      if (window.superkeydown)
        e.preventDefault();
    }
    if (window.superkeydown && current_mouse_button === 2) {
      e.preventDefault();
      is_right_resize = true;
      dragged_applet = applet;
      resize_start_width = applet.offsetWidth;
      resize_start_height = applet.offsetHeight;
      resize_start_x = e.clientX;
      resize_start_y = e.clientY;
      resize_start_left = parseInt(applet.style.left) || 0;
      resize_start_top = parseInt(applet.style.top) || 0;
      const applet_rect = applet.getBoundingClientRect();
      const click_x = e.clientX;
      const click_y = e.clientY;
      const relative_x = (click_x - applet_rect.left) / applet_rect.width;
      const relative_y = (click_y - applet_rect.top) / applet_rect.height;
      if (relative_x < 0.5) {
        if (relative_y < 0.5) {
          resize_quadrant = "tl";
        } else {
          resize_quadrant = "bl";
        }
      } else {
        if (relative_y < 0.5) {
          resize_quadrant = "tr";
        } else {
          resize_quadrant = "br";
        }
      }
      applet.style.willChange = "width, height, left, top";
      const tsid = applet.getAttribute("om-tsid");
      lift(tsid);
    } else if ((window.superkeydown || is_drag_handle) && current_mouse_button === 0) {
      document.body.classList.add("is-dragging");
      let x = Number(applet.style.left.replace("px", ""));
      let y = Number(applet.style.top.replace("px", ""));
      dragging_x = x;
      dragging_y = y;
      last_mouse_x = e.clientX;
      last_mouse_y = e.clientY;
      applet.style.willChange = "filter, transform, left, top";
      const tsid = applet.getAttribute("om-tsid");
      lift(tsid);
      await finish();
      applet.style.left = "0";
      applet.style.top = "0";
      applet.setAttribute("om-motion", "elevated");
      applet.style.transform = `translate(${x}px, ${y}px) translateZ(0) scale(1.01)`;
      dragged_applet = applet;
    }
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
  }
  add_resize_handles(applet);
  function add_resize_handles(applet2) {
    const edges = [
      "n",
      "e",
      "s",
      "w",
      "ne",
      "se",
      "sw",
      "nw"
    ];
    edges.forEach((edge) => {
      const handle = document.createElement("div");
      handle.className = `resize-handle resize-${edge}`;
      handle.style.position = "absolute";
      switch (edge) {
        case "n":
          handle.style.top = `${HANDLE_CONFIG.OFFSET}px`;
          handle.style.left = "0";
          handle.style.right = "0";
          handle.style.height = `${HANDLE_CONFIG.EDGE_SIZE}px`;
          handle.style.cursor = "n-resize";
          break;
        case "s":
          handle.style.bottom = `${HANDLE_CONFIG.OFFSET}px`;
          handle.style.left = "0";
          handle.style.right = "0";
          handle.style.height = `${HANDLE_CONFIG.EDGE_SIZE}px`;
          handle.style.cursor = "s-resize";
          break;
        case "e":
          handle.style.right = `${HANDLE_CONFIG.OFFSET}px`;
          handle.style.top = "0";
          handle.style.bottom = "0";
          handle.style.width = `${HANDLE_CONFIG.EDGE_SIZE}px`;
          handle.style.cursor = "e-resize";
          break;
        case "w":
          handle.style.left = `${HANDLE_CONFIG.OFFSET}px`;
          handle.style.top = "0";
          handle.style.bottom = "0";
          handle.style.width = `${HANDLE_CONFIG.EDGE_SIZE}px`;
          handle.style.cursor = "w-resize";
          break;
        case "ne":
          handle.style.top = `${HANDLE_CONFIG.OFFSET}px`;
          handle.style.right = `${HANDLE_CONFIG.OFFSET}px`;
          handle.style.width = `${HANDLE_CONFIG.CORNER_SIZE}px`;
          handle.style.height = `${HANDLE_CONFIG.CORNER_SIZE}px`;
          handle.style.cursor = "ne-resize";
          break;
        case "se":
          handle.style.bottom = `${HANDLE_CONFIG.OFFSET}px`;
          handle.style.right = `${HANDLE_CONFIG.OFFSET}px`;
          handle.style.width = `${HANDLE_CONFIG.CORNER_SIZE}px`;
          handle.style.height = `${HANDLE_CONFIG.CORNER_SIZE}px`;
          handle.style.cursor = "se-resize";
          break;
        case "sw":
          handle.style.bottom = `${HANDLE_CONFIG.OFFSET}px`;
          handle.style.left = `${HANDLE_CONFIG.OFFSET}px`;
          handle.style.width = `${HANDLE_CONFIG.CORNER_SIZE}px`;
          handle.style.height = `${HANDLE_CONFIG.CORNER_SIZE}px`;
          handle.style.cursor = "sw-resize";
          break;
        case "nw":
          handle.style.top = `${HANDLE_CONFIG.OFFSET}px`;
          handle.style.left = `${HANDLE_CONFIG.OFFSET}px`;
          handle.style.width = `${HANDLE_CONFIG.CORNER_SIZE}px`;
          handle.style.height = `${HANDLE_CONFIG.CORNER_SIZE}px`;
          handle.style.cursor = "nw-resize";
          break;
      }
      handle.addEventListener("mousedown", (e) => {
        if (e.button !== 0)
          return;
        e.preventDefault();
        e.stopPropagation();
        is_resizing = true;
        const ev = new CustomEvent("applet-resize-start", { detail: { applet: applet2 } });
        window.dispatchEvent(ev);
        applet2.setAttribute("om-motion", "resizing");
        document.body.classList.add("is-resizing");
        resize_edge = edge;
        dragged_applet = applet2;
        last_mouse_x = e.clientX;
        last_mouse_y = e.clientY;
        last_width = applet2.offsetWidth;
        last_height = applet2.offsetHeight;
        last_left = parseInt(applet2.style.left) || 0;
        last_top = parseInt(applet2.style.top) || 0;
        window.addEventListener("mousemove", handleResize);
        window.addEventListener("mouseup", stopResize);
      });
      applet2.appendChild(handle);
    });
  }
}
function handleResize(e) {
  if (!is_resizing || !dragged_applet)
    return;
  const dx = (e.clientX - last_mouse_x) / current_scale;
  const dy = (e.clientY - last_mouse_y) / current_scale;
  const computed_style = window.getComputedStyle(dragged_applet);
  const css_min_width = parseFloat(computed_style.minWidth) || min_width;
  const css_min_height = parseFloat(computed_style.minHeight) || min_height;
  let new_width = last_width;
  let new_height = last_height;
  let new_left = last_left;
  let new_top = last_top;
  if (resize_edge.includes("e")) {
    new_width = Math.max(css_min_width, last_width + dx);
  }
  if (resize_edge.includes("w")) {
    const max_delta = last_width - css_min_width;
    const width_delta = Math.min(dx, max_delta);
    new_width = last_width - width_delta;
    new_left = last_left + width_delta;
  }
  if (resize_edge.includes("s")) {
    new_height = Math.max(css_min_height, last_height + dy);
  }
  if (resize_edge.includes("n")) {
    const max_delta = last_height - css_min_height;
    const height_delta = Math.min(dy, max_delta);
    new_height = last_height - height_delta;
    new_top = last_top + height_delta;
  }
  dragged_applet.style.width = `${new_width}px`;
  dragged_applet.style.height = `${new_height}px`;
  dragged_applet.style.left = `${new_left}px`;
  dragged_applet.style.top = `${new_top}px`;
}
function stopResize() {
  if (is_resizing) {
    is_resizing = false;
    const ev = new CustomEvent("applet-resize-stop", { detail: { applet: dragged_applet } });
    window.dispatchEvent(ev);
    dragged_applet.setAttribute("om-motion", "idle");
    document.body.classList.remove("is-resizing");
    resize_edge = null;
    dragged_applet = null;
    window.removeEventListener("mousemove", handleResize);
    window.removeEventListener("mouseup", stopResize);
    save();
  }
}
async function handleMouseMove(e) {
  if (current_mouse_button === 0) {
    delta_x = (last_mouse_x - e.clientX) / current_scale;
    delta_y = (last_mouse_y - e.clientY) / current_scale;
    last_mouse_x = e.clientX;
    last_mouse_y = e.clientY;
    dragging_x = dragging_x - delta_x;
    dragging_y = dragging_y - delta_y;
    if (dragged_applet && !e.shiftKey) {
      dragged_applet.style.transform = `translate(${dragging_x}px, ${dragging_y}px) translateZ(0) scale(1.01)`;
    } else if (dragged_applet && e.shiftKey) {
      dragged_applet.style.left = `${dragging_x}px`;
      dragged_applet.style.top = `${dragging_y}px`;
    }
  } else if (current_mouse_button === 2 && is_right_resize && dragged_applet) {
    const dx = (e.clientX - resize_start_x) / current_scale;
    const dy = (e.clientY - resize_start_y) / current_scale;
    const computed_style = window.getComputedStyle(dragged_applet);
    const css_min_width = parseFloat(computed_style.minWidth) || min_width;
    const css_min_height = parseFloat(computed_style.minHeight) || min_height;
    let new_width = resize_start_width;
    let new_height = resize_start_height;
    let new_left = resize_start_left;
    let new_top = resize_start_top;
    switch (resize_quadrant) {
      case "br":
        new_width = Math.max(css_min_width, resize_start_width + dx);
        new_height = Math.max(css_min_height, resize_start_height + dy);
        break;
      case "bl":
        const width_change_bl = Math.min(dx, resize_start_width - css_min_width);
        new_width = Math.max(css_min_width, resize_start_width - dx);
        new_height = Math.max(css_min_height, resize_start_height + dy);
        new_left = resize_start_left + (resize_start_width - new_width);
        break;
      case "tr":
        new_width = Math.max(css_min_width, resize_start_width + dx);
        new_height = Math.max(css_min_height, resize_start_height - dy);
        new_top = resize_start_top + (resize_start_height - new_height);
        break;
      case "tl":
        new_width = Math.max(css_min_width, resize_start_width - dx);
        new_height = Math.max(css_min_height, resize_start_height - dy);
        new_left = resize_start_left + (resize_start_width - new_width);
        new_top = resize_start_top + (resize_start_height - new_height);
        break;
    }
    dragged_applet.style.width = `${new_width}px`;
    dragged_applet.style.height = `${new_height}px`;
    dragged_applet.style.left = `${new_left}px`;
    dragged_applet.style.top = `${new_top}px`;
    if (!is_resizing) {
      is_resizing = true;
      const ev = new CustomEvent("applet-resize-start", { detail: { applet: dragged_applet } });
      window.dispatchEvent(ev);
      document.body.classList.add("is-resizing");
      dragged_applet.setAttribute("om-motion", "resizing");
    }
  }
}
async function handleMouseUp(e) {
  window.removeEventListener("mousemove", handleMouseMove);
  window.removeEventListener("mouseup", handleMouseUp);
  if (!dragged_applet)
    return;
  if (current_mouse_button === 0) {
    document.body.classList.remove("is-dragging");
    if (!e.shiftKey) {
      dragged_applet.style.left = `${dragging_x}px`;
      dragged_applet.style.top = `${dragging_y}px`;
      dragged_applet.style.removeProperty("transform");
      dragged_applet.style.removeProperty("will-change");
      await finish();
      dragged_applet.style.removeProperty("transition");
      await finish();
      dragged_applet.setAttribute("om-motion", "idle");
    } else {
      dragged_applet.style.removeProperty("will-change");
    }
  } else if (current_mouse_button === 2 && is_right_resize) {
    is_resizing = false;
    is_right_resize = false;
    const ev = new CustomEvent("applet-resize-stop", { detail: { applet: dragged_applet } });
    window.dispatchEvent(ev);
    resize_quadrant = null;
    dragged_applet.style.removeProperty("will-change");
    dragged_applet.setAttribute("om-motion", "idle");
    document.body.classList.remove("is-resizing");
  }
  if (current_mouse_button === 0 || current_mouse_button === 2) {
    save();
  }
  dragged_applet = null;
}
function preventContextMenu(e) {
  if ((e.metaKey || e.ctrlKey) && e.button === 2) {
    e.preventDefault();
    return false;
  }
  return true;
}

// user/modules/om/superkey.js
function set_superkey_state(state) {
  if (state) {
    window.superkeydown = true;
    const ev = new CustomEvent("superkeydown");
    window.dispatchEvent(ev);
    document.body.classList.add("super-key-down");
  } else {
    window.superkeydown = false;
    const ev = new CustomEvent("superkeyup");
    window.dispatchEvent(ev);
    document.body.classList.remove("super-key-down");
  }
}
function handle_superkey_down(e) {
  if (e.key === "Alt" || e.detail.key === "Alt") {
    set_superkey_state(true);
  }
}
function handle_superkey_up(e) {
  if (!e.key || e.key === "Alt") {
    set_superkey_state(false);
  }
}
function handle_window_blur() {
  set_superkey_state(false);
}
function handle_visibility_change() {
  if (document.hidden) {
    set_superkey_state(false);
  }
}
function handle_webview_visibility_change(e) {
  if (e.detail.hidden && document.hidden) {
    set_superkey_state(false);
  }
}
function handle_webview_blur() {
  if (!document.hasFocus()) {
    set_superkey_state(false);
  }
}
window.addEventListener("keydown", handle_superkey_down);
window.addEventListener("keyup", handle_superkey_up);
window.addEventListener("webview-keydown", handle_superkey_down);
window.addEventListener("webview-keyup", handle_superkey_up);
window.addEventListener("blur", handle_window_blur);
document.addEventListener("visibilitychange", handle_visibility_change);
window.addEventListener("webview-blur", handle_webview_blur);
window.addEventListener("webview-visibilitychange", handle_webview_visibility_change);

// user/modules/om/applets/test.js
var { div: div2, webview, video, source } = useTags();
window.addEventListener("keydown", (e) => {
  if (e.metaKey && e.key.toLowerCase() === "8") {
    addApplet("webview");
  } else if (e.metaKey && e.key.toLowerCase() === "9") {
    addApplet("video");
  }
});
GlobalStyleSheet(css`
	[om-applet="test"] {
		position: absolute;
		min-width: 100px;
		min-height: 100px;
		color: var(--color-white);
		background-color: var(--color-black);

		webview,
		video {
			position: absolute;
			top: 0;
			left: 0;
			width: 100%;
			height: 100%;
		}

		webview {
			pointer-events: none;
		}
	}
`);
async function addApplet(mode = "webview") {
  let { x, y } = getCameraCenter();
  const min_size = window.innerWidth * 0.2;
  const max_size = window.innerWidth * 0.8;
  const width = min_size + Math.floor(Math.random() * (max_size - min_size));
  const height = min_size + Math.floor(Math.random() * (max_size - min_size));
  const max_offset = window.innerWidth * 0.4;
  const x_offset = Math.floor(Math.random() * max_offset * 2) - max_offset;
  const y_offset = Math.floor(Math.random() * max_offset * 2) - max_offset;
  x = x - width / 2 + x_offset;
  y = y - height / 2 + y_offset;
  const video_data = videos[Math.floor(Math.random() * videos.length)];
  const { stdout, stderr } = await bridge_default.shell.exec("ls");
  console.log(stdout, stderr);
  let media_element;
  if (mode === "webview") {
    media_element = webview({
      src: video_data.videoUrl,
      useragent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36"
    });
  } else {
    media_element = video({
      controls: true,
      autoplay: true,
      loop: true
    }, source({
      src: video_data.videoUrl,
      type: "video/mp4"
    }));
  }
  const test = div2({
    "om-applet": "test",
    "om-motion": "idle",
    "data-mode": mode,
    style: css`
				top: ${y}px;
				left: ${x}px;
				width: ${width}px;
				height: ${height}px;
			`
  }, media_element);
  surface().appendChild(test);
  await finish();
  if (mode === "webview") {
    const webview_el = test.querySelector("webview");
    webview_el.setAttribute("webpreferences", "contextIsolation=yes, sandbox=yes");
  }
}
var videos = [
  {
    id: "1",
    title: "Big Buck Bunny",
    thumbnailUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a7/Big_Buck_Bunny_thumbnail_vlc.png/1200px-Big_Buck_Bunny_thumbnail_vlc.png",
    duration: "8:18",
    uploadTime: "May 9, 2011",
    views: "24,969,123",
    author: "Vlc Media Player",
    videoUrl: "http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
    description: `Big Buck Bunny tells the story of a giant rabbit with a heart bigger than himself. When one sunny day three rodents rudely harass him, something snaps... and the rabbit ain't no bunny anymore! In the typical cartoon tradition he prepares the nasty rodents a comical revenge.

Licensed under the Creative Commons Attribution license
http://www.bigbuckbunny.org`,
    subscriber: "25254545 Subscribers",
    isLive: true
  },
  {
    id: "2",
    title: "The first Blender Open Movie from 2006",
    thumbnailUrl: "https://i.ytimg.com/vi_webp/gWw23EYM9VM/maxresdefault.webp",
    duration: "12:18",
    uploadTime: "May 9, 2011",
    views: "24,969,123",
    author: "Blender Inc.",
    videoUrl: "http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4",
    description: `Song : Raja Raja Kareja Mein Samaja
Album : Raja Kareja Mein Samaja
Artist : Radhe Shyam Rasia
Singer : Radhe Shyam Rasia
Music Director : Sohan Lal, Dinesh Kumar
Lyricist : Vinay Bihari, Shailesh Sagar, Parmeshwar Premi
Music Label : T-Series`,
    subscriber: "25254545 Subscribers",
    isLive: true
  },
  {
    id: "3",
    title: "For Bigger Blazes",
    thumbnailUrl: "https://i.ytimg.com/vi/Dr9C2oswZfA/maxresdefault.jpg",
    duration: "8:18",
    uploadTime: "May 9, 2011",
    views: "24,969,123",
    author: "T-Series Regional",
    videoUrl: "http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
    description: `Song : Raja Raja Kareja Mein Samaja
Album : Raja Kareja Mein Samaja
Artist : Radhe Shyam Rasia
Singer : Radhe Shyam Rasia
Music Director : Sohan Lal, Dinesh Kumar
Lyricist : Vinay Bihari, Shailesh Sagar, Parmeshwar Premi
Music Label : T-Series`,
    subscriber: "25254545 Subscribers",
    isLive: true
  },
  {
    id: "4",
    title: "For Bigger Escape",
    thumbnailUrl: "https://img.jakpost.net/c/2019/09/03/2019_09_03_78912_1567484272._large.jpg",
    duration: "8:18",
    uploadTime: "May 9, 2011",
    views: "24,969,123",
    author: "T-Series Regional",
    videoUrl: "http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4",
    description: " Introducing Chromecast. The easiest way to enjoy online video and music on your TV—for when Batman's escapes aren't quite big enough. For $35. Learn how to use Chromecast with Google Play Movies and more at google.com/chromecast.",
    subscriber: "25254545 Subscribers",
    isLive: false
  },
  {
    id: "5",
    title: "Big Buck Bunny",
    thumbnailUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a7/Big_Buck_Bunny_thumbnail_vlc.png/1200px-Big_Buck_Bunny_thumbnail_vlc.png",
    duration: "8:18",
    uploadTime: "May 9, 2011",
    views: "24,969,123",
    author: "Vlc Media Player",
    videoUrl: "http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
    description: `Big Buck Bunny tells the story of a giant rabbit with a heart bigger than himself. When one sunny day three rodents rudely harass him, something snaps... and the rabbit ain't no bunny anymore! In the typical cartoon tradition he prepares the nasty rodents a comical revenge.

Licensed under the Creative Commons Attribution license
http://www.bigbuckbunny.org`,
    subscriber: "25254545 Subscribers",
    isLive: true
  },
  {
    id: "6",
    title: "For Bigger Blazes",
    thumbnailUrl: "https://i.ytimg.com/vi/Dr9C2oswZfA/maxresdefault.jpg",
    duration: "8:18",
    uploadTime: "May 9, 2011",
    views: "24,969,123",
    author: "T-Series Regional",
    videoUrl: "http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
    description: `Song : Raja Raja Kareja Mein Samaja
Album : Raja Kareja Mein Samaja
Artist : Radhe Shyam Rasia
Singer : Radhe Shyam Rasia
Music Director : Sohan Lal, Dinesh Kumar
Lyricist : Vinay Bihari, Shailesh Sagar, Parmeshwar Premi
Music Label : T-Series`,
    subscriber: "25254545 Subscribers",
    isLive: false
  },
  {
    id: "7",
    title: "For Bigger Escape",
    thumbnailUrl: "https://img.jakpost.net/c/2019/09/03/2019_09_03_78912_1567484272._large.jpg",
    duration: "8:18",
    uploadTime: "May 9, 2011",
    views: "24,969,123",
    author: "T-Series Regional",
    videoUrl: "http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4",
    description: " Introducing Chromecast. The easiest way to enjoy online video and music on your TV—for when Batman's escapes aren't quite big enough. For $35. Learn how to use Chromecast with Google Play Movies and more at google.com/chromecast.",
    subscriber: "25254545 Subscribers",
    isLive: true
  },
  {
    id: "8",
    title: "The first Blender Open Movie from 2006",
    thumbnailUrl: "https://i.ytimg.com/vi_webp/gWw23EYM9VM/maxresdefault.webp",
    duration: "12:18",
    uploadTime: "May 9, 2011",
    views: "24,969,123",
    author: "Blender Inc.",
    videoUrl: "http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4",
    description: `Song : Raja Raja Kareja Mein Samaja
Album : Raja Kareja Mein Samaja
Artist : Radhe Shyam Rasia
Singer : Radhe Shyam Rasia
Music Director : Sohan Lal, Dinesh Kumar
Lyricist : Vinay Bihari, Shailesh Sagar, Parmeshwar Premi
Music Label : T-Series`,
    subscriber: "25254545 Subscribers",
    isLive: false
  }
];

// user/modules/om/applets/sticky.js
var { div: div3 } = useTags();
var PASTEL_COLORS = [
  {
    bg: "var(--color-yellow-200)",
    handle: "var(--color-yellow-300)",
    text: "var(--color-yellow-900)"
  },
  {
    bg: "var(--color-blue-200)",
    handle: "var(--color-blue-300)",
    text: "var(--color-blue-900)"
  },
  {
    bg: "var(--color-green-200)",
    handle: "var(--color-green-300)",
    text: "var(--color-green-900)"
  },
  {
    bg: "var(--color-pink-200)",
    handle: "var(--color-pink-300)",
    text: "var(--color-pink-900)"
  }
];
window.addEventListener("keydown", (e) => {
  if (e.metaKey && e.key === "1") {
    const random_color_index = Math.floor(Math.random() * PASTEL_COLORS.length);
    addSticky(random_color_index);
    e.preventDefault();
  }
});
async function addSticky(colorIndex = 0) {
  let { x, y } = getCameraCenter();
  const width = 200 + Math.floor(Math.random() * 100);
  const height = 200 + Math.floor(Math.random() * 100);
  x = x - width / 2;
  y = y - height / 2;
  x += Math.floor(Math.random() * 100) - 50;
  y += Math.floor(Math.random() * 100) - 50;
  const color_scheme = PASTEL_COLORS[colorIndex];
  let is_resizing2 = false;
  const sticky = div3({
    "om-applet": "sticky",
    "om-motion": "idle",
    style: css`
				top: ${y}px;
				left: ${x}px;
				width: ${width}px;
				height: ${height}px;
				background-color: ${color_scheme.bg};
				color: ${color_scheme.text};
			`
  }, div3({
    "drag-handle": true,
    style: css`
				height: var(--size-6);
				width: 100%;
				background-color: ${color_scheme.handle};
				cursor: move;
			`
  }), div3({
    class: "content",
    spellcheck: "false",
    contenteditable: () => is_resizing2 ? "false" : "true",
    onkeydown(e) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "w") {
        sticky.remove();
      }
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === "v") {
        e.preventDefault();
        navigator.clipboard.readText().then((text) => {
          const selection = window.getSelection();
          const range = selection.getRangeAt(0);
          document.execCommand("insertText", false, text);
        }).catch((err) => {
          console.error("Failed to read clipboard contents: ", err);
        });
      }
    }
  }));
  surface().appendChild(sticky);
  await finish();
  sticky.querySelector(".content").focus();
  window.addEventListener("applet-resize-start", handleAppletResizeStart);
  window.addEventListener("applet-resize-stop", handleAppletResizeStop);
  onAppletRemove((a) => {
    if (a === sticky) {
      window.removeEventListener("applet-resize-start", handleAppletResizeStart);
      window.removeEventListener("applet-resize-stop", handleAppletResizeStop);
    }
  });
  function handleAppletResizeStart(e) {
    if (e.detail.applet === sticky) {
      is_resizing2 = true;
    }
  }
  function handleAppletResizeStop(e) {
    if (e.detail.applet === sticky) {
      is_resizing2 = false;
    }
  }
}
GlobalStyleSheet(css`
	[om-applet="sticky"] {
		position: absolute;
		min-width: 150px;
		min-height: 150px;
		font-family: var(--font-mono);
		line-height: 1.5;
		border-radius: 2px;
		box-shadow: var(--fast-thickness-1);
		display: flex;
		flex-direction: column;
		overflow: hidden;

		.content {
			flex: 1;
			padding: 10px;
			outline: none;
			overflow-y: auto;
			word-wrap: break-word;
		}
	}
`);

// user/modules/om/applets/appview.js
var { div: div4, header, span, icon, button, canvas: canvas2, video: video2, source: source2 } = useTags();
bridge_default.appstream.windowCaptureUpdated(async (id) => {
  const window_data = await bridge_default.appstream.getWindowCapture(id);
  if (window_data) {
    addAppview(id, window_data);
  } else {
    console.error(`Failed to capture window with ID ${id}`);
  }
});
bridge_default.appstream.onWindowClosed((window_id) => {
  console.log(window_id);
  const appview = document.getElementById(`appview-${window_id}`);
  if (appview) {
    appview.remove();
  }
});
onAppletRemove(async (applet) => {
  tryCatch(async () => {
    await bridge_default.appstream.closeWindow(applet.id.replace("appview-", ""));
  });
});
async function addAppview(window_id, window_data) {
  const id = `appview-${window_id}`;
  const width = window_data.width;
  const height = window_data.height;
  const existing_appview = document.getElementById(id);
  if (existing_appview) {
    const canvas_el2 = existing_appview.querySelector("canvas");
    if (canvas_el2) {
      const is_resizing2 = existing_appview.getAttribute("om-motion") === "resizing";
      if (!is_resizing2) {
        existing_appview.style.width = `${width}px`;
        existing_appview.style.height = `${height}px`;
      }
      canvas_el2.width = width;
      canvas_el2.height = height;
      const ctx2 = canvas_el2.getContext("2d");
      const image_data2 = new ImageData(new Uint8ClampedArray(window_data.pixel_data), width, height);
      ctx2.putImageData(image_data2, 0, 0);
    }
    return;
  }
  let resize_animation_frame = null;
  let last_resize_width = 0;
  let last_resize_height = 0;
  let { x, y } = getCameraCenter();
  x = x - width / 2;
  y = y - height / 2;
  x += Math.floor(Math.random() * 100) - 50;
  y += Math.floor(Math.random() * 100) - 50;
  const canvas_el = canvas2({
    width,
    height,
    onmousedown: async (e) => {
      if (e.altKey)
        return;
      e.stopPropagation();
      try {
        const rect = e.target.getBoundingClientRect();
        await bridge_default.appstream.setWindowPosition(window_id, Math.round(rect.left), Math.round(rect.top));
        await bridge_default.appstream.focusWindow(window_id);
      } catch (err) {
        console.error("Failed to forward mouse press:", err);
      }
    }
  });
  const appview = div4({
    id,
    "om-applet": "appview",
    "om-motion": "idle",
    style: css`
				top: ${y}px;
				left: ${x}px;
				width: ${width}px;
				height: ${height}px;
			`
  }, header(button({
    variant: "icon",
    async onclick() {
      appview.remove();
    }
  }, icon({
    name: "close"
  })), div4({ "drag-handle": true })), canvas_el);
  surface().appendChild(appview);
  const handle_resize_end = debounce(async (new_width, new_height) => {
    tryCatch(async () => {
      await bridge_default.appstream.resizeWindow(window_id, {
        width: Math.round(new_width),
        height: Math.round(new_height)
      });
    });
  }, 150);
  const handlePositionUpdate = debounce(async () => {
    tryCatch(async () => {
      const rect = appview.getBoundingClientRect();
      await bridge_default.appstream.setWindowPosition(window_id, Math.round(rect.left), Math.round(rect.top));
    });
  }, 50);
  const position_observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      if (mutation.type === "attributes" && mutation.attributeName === "style") {
        handlePositionUpdate();
      }
    }
  });
  position_observer.observe(appview, {
    attributes: true,
    attributeFilter: ["style"]
  });
  const resize_observer = new ResizeObserver((entries) => {
    const entry = entries[0];
    if (entry) {
      handle_resize_end(entry.contentRect.width, entry.contentRect.height);
      handlePositionUpdate();
    }
  });
  resize_observer.observe(appview);
  await finish();
  const ctx = canvas_el.getContext("2d");
  const image_data = new ImageData(new Uint8ClampedArray(window_data.pixel_data), width, height);
  ctx.putImageData(image_data, 0, 0);
  handlePositionUpdate();
}
GlobalStyleSheet(css`
	[om-applet="appview"] {
		position: absolute;
		min-width: 100px;
		min-height: 100px;
		display: flex;
		flex-direction: column;
		border-radius: var(--size-2_5);

		canvas {
			position: absolute;
			left: 0;
			top: 0;
			width: 100%;
			height: 100%;
			border-radius: var(--size-2_5);
			background: var(--color-black);
			overflow: hidden;
		}

		header {
			position: absolute;
			top: var(--size-neg-0_5);
			left: 0;
			transform: translateY(-100%);
			display: flex;
			height: fit-content;
			width: 100%;
			border-radius: var(--size-2_5);
			background: var(--color-black);
			color: var(--color-white);

			[drag-handle] {
				flex-grow: 1;
				width: 100%;
				height: var(--size-7);
				cursor: move;
			}
		}
	}
`);

// user/modules/om/applets/webview/index.js
var { div: div5, header: header2, img, input, webview: webview2 } = useTags();
var DEFAULT_WIDTH = 414;
var DEFAULT_HEIGHT = 700;
window.addEventListener("keydown", async (e) => {
  if ((e.metaKey || e.ctrlKey) && e.key.toUpperCase() === "T") {
    let { x: center_x, y: center_y } = getCameraCenter();
    const random_x_offset = Math.floor(Math.random() * 150) - 48;
    const random_y_offset = Math.floor(Math.random() * 150) - 48;
    await addWebview({
      x: center_x + random_x_offset - DEFAULT_WIDTH / 2,
      y: center_y + random_y_offset - DEFAULT_HEIGHT / 2
    });
  }
});
async function addWebview(props) {
  if (!props) {
    props = {
      x: center_x - 207,
      y: center_y - 350,
      width: 414,
      height: 700
    };
  }
  if (!props.width) {
    props.width = DEFAULT_WIDTH;
  }
  if (!props.height) {
    props.height = DEFAULT_HEIGHT;
  }
  let { x: center_x, y: center_y } = getCameraCenter();
  if (!props.x) {
    props.x = center_x - 207;
  }
  if (!props.y) {
    props.y = center_y - 350;
  }
  let is_devtools_webview = props.devtools_requester ? true : false;
  let query = props.url || "";
  let src = props.devtools_requester ? `devtools://devtools/bundled/inspector.html?ws=localhost:0/${props.devtools_requester.getWebContentsId()}` : "";
  let last_render = "";
  let loading = false;
  let load_error = "";
  let keyboard_shortcut_could_trigger = false;
  const modkeys = {
    Control: false,
    Shift: false,
    Meta: false
  };
  const preload_path = await bridge_default.file.resolve("user/modules/om/applets/webview/preload.js");
  const webview_config = {
    nodeintegration: false,
    useragent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36",
    preload: preload_path,
    webpreferences: "contextIsolation=true,sandbox=true,allowRunningInsecureContent=true"
  };
  if (props.devtools_requester) {
    delete webview_config.webpreferences;
    delete webview_config.nodeintegration;
    delete webview_config.useragent;
  }
  const webview_el = webview2({
    ...webview_config,
    src: () => src,
    allowpopups: false,
    style: css`
			width: 100%;
			height: 100%;
		`
  });
  const applet = div5({
    "om-applet": "webview",
    "om-motion": "idle",
    "is-devtools": () => is_devtools_webview,
    "keyboard-focus": () => keyboard_shortcut_could_trigger,
    "has-error": () => !!load_error,
    "is-loading": () => loading,
    style: css`
				top: ${props.y}px;
				left: ${props.x}px;
				width: ${props.width}px;
				height: ${props.height}px;
			`
  }, header2({
    "drag-handle": "",
    "new-tab": () => src === "" && !is_devtools_webview ? "true" : "false"
  }, () => input({
    variant: "minimal",
    type: "text",
    placeholder: "Search or enter URL...",
    value: query,
    onkeydown(e) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "w") {
        closeWebview();
      }
      if (e.key === "Enter") {
        query = e.target.value;
        src = processQuery(query);
        e.target.blur();
      }
    }
  }), div5({ class: "loading-indicator" })), webview_el, div5({
    class: "overlay"
  }));
  surface().appendChild(applet);
  await finish();
  if (query)
    src = processQuery(query);
  applet.addEventListener("mousedown", async (e) => {
    if (src !== "" && applet.getAttribute("om-motion") === "idle" && window.superkeydown && e.button === 2) {
      const webcontents_id = webview_el.getWebContentsId();
      const url = await bridge_default.browser.capturePage(webcontents_id);
      if (url) {
        last_render = url;
      }
    }
  });
  webview_el.addEventListener("dom-ready", async () => {
    if (props.devtools_requester) {
      await bridge_default.browser.openWebviewDevtools(props.devtools_requester.getWebContentsId(), webview_el.getWebContentsId());
      props.devtools_requester.openDevTools({ mode: "detach" });
    }
  });
  webview_el.addEventListener("did-start-loading", () => {
    loading = true;
  });
  webview_el.addEventListener("did-stop-loading", () => {
    loading = false;
  });
  webview_el.addEventListener("did-fail-load", (event) => {
    load_error = event.errorDescription;
    loading = false;
  });
  webview_el.addEventListener("did-navigate", (event) => {
    query = event.url;
  });
  webview_el.addEventListener("did-navigate-in-page", (event) => {
    query = event.url;
  });
  webview_el.addEventListener("ipc-message", async (e) => {
    switch (e.channel) {
      case "devtools": {
        const current_width = applet.offsetWidth;
        const current_height = applet.offsetHeight;
        const current_x = applet.offsetLeft;
        const current_y = applet.offsetTop;
        const random_x_offset = Math.floor(Math.random() * 150) - 48;
        const random_y_offset = Math.floor(Math.random() * 150) - 48;
        await addWebview({
          width: current_width,
          height: current_height,
          x: current_x + current_width + random_x_offset,
          y: current_y + random_y_offset,
          devtools_requester: webview_el
        });
        break;
      }
      case "new-window": {
        const url = e.args[0];
        bridge_default.browser.newWindow(url);
        break;
      }
      case "new-tab": {
        const url = e.args[0];
        const current_width = applet.offsetWidth;
        const current_height = applet.offsetHeight;
        const current_x = applet.offsetLeft;
        const current_y = applet.offsetTop;
        const random_x_offset = Math.floor(Math.random() * 150) - 48;
        const random_y_offset = Math.floor(Math.random() * 150) - 48;
        addWebview({
          width: current_width,
          height: current_height,
          x: current_x + (url === "" ? 0 : current_width) + random_x_offset,
          y: current_y + random_y_offset,
          url
        });
        break;
      }
      case "mousedown": {
        break;
      }
      case "mouseup": {
        break;
      }
      case "keydown": {
        const key = e.args[0];
        const opts = e.args[1];
        const ev = new CustomEvent("webview-keydown", {
          detail: {
            key,
            webview: webview_el
          }
        });
        window.dispatchEvent(ev);
        if (key === "Control" || key === "Shift" || key === "Meta") {
          modkeys[key] = true;
          keyboard_shortcut_could_trigger = true;
        }
        if ((opts.ctrlKey || opts.metaKey) && key.toLowerCase() === "w") {
          if (props.devtools_requester) {
            props.devtools_requester.closeDevTools();
            console.log("Closing devtools");
          }
          closeWebview();
        }
        break;
      }
      case "keyup": {
        const key = e.args[0];
        const ev = new CustomEvent("webview-keyup", {
          detail: {
            key,
            webview: webview_el
          }
        });
        window.dispatchEvent(ev);
        if (key === "Control" || key === "Shift" || key === "Meta") {
          modkeys[key] = false;
          keyboard_shortcut_could_trigger = modkeys.Control || modkeys.Shift || modkeys.Meta;
        }
        break;
      }
      case "visibilitychange": {
        const ev = new CustomEvent("webview-visibilitychange", {
          detail: {
            hidden: e.args[0],
            webview: webview_el
          }
        });
        window.dispatchEvent(ev);
        break;
      }
      case "focus": {
        const ev = new CustomEvent("webview-focus", {
          detail: {
            webview: webview_el
          }
        });
        window.dispatchEvent(ev);
        break;
      }
      case "blur": {
        const ev = new CustomEvent("webview-blur", {
          detail: {
            webview: webview_el
          }
        });
        window.dispatchEvent(ev);
        modkeys.Control = false;
        modkeys.Shift = false;
        modkeys.Meta = false;
        keyboard_shortcut_could_trigger = false;
        break;
      }
    }
  });
  function closeWebview() {
    applet.remove();
  }
  function processQuery(query2) {
    if (!query2) {
      return "";
    }
    query2 = query2.trim();
    const special_protocols = [
      "chrome://",
      "about:",
      "file://",
      "data:",
      "javascript:",
      "mailto:",
      "tel:",
      "sms:",
      "ftp://"
    ];
    for (const protocol of special_protocols) {
      if (query2.toLowerCase().startsWith(protocol)) {
        return query2;
      }
    }
    if (query2.startsWith("http://") || query2.startsWith("https://")) {
      return query2;
    }
    const localhost_pattern = /^(localhost|127\.0\.0\.1|\[::1\])(:\d+)?(\/.*)?$/;
    const ip_pattern = /^(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})(:\d+)?(\/.*)?$/;
    if (localhost_pattern.test(query2) || ip_pattern.test(query2)) {
      return `http://${query2}`;
    }
    const url_pattern = /^([a-zA-Z0-9-]+\.)*[a-zA-Z0-9-]+(\.[a-zA-Z]{2,})(:\d+)?(\/.*)?$/;
    if (url_pattern.test(query2)) {
      return `https://${query2}`;
    }
    return `https://www.google.com/search?q=${encodeURIComponent(query2)}`;
  }
  return applet;
}
GlobalStyleSheet(css`
	[om-applet="webview"] {
		position: absolute;
		min-width: 100px;
		min-height: 100px;
		color: var(--color-white);
		background-color: var(--color-neutral-800);
		border-radius: var(--size-3);
		overflow: hidden;
		transition-property: outline;
		transition-duration: 0.1s;
		transition-timing-function: var(--ease-in-out);
		display: flex;
		flex-direction: column;
		padding: var(--size-2);

		header {
			display: flex;
			position: relative;
			justify-content: space-between;
			align-items: center;
			height: fit-content;
			padding-bottom: var(--size-1_5);

			.loading-indicator {
				position: absolute;
				right: var(--size-1);
				top: 50%;
				transform: translateY(-50%);
				display: none;
				min-width: var(--size-2);
				min-height: var(--size-2);
				background-color: transparent;
				transition-property: background-color;
				transition-duration: 0.15s;
				transition-timing-function: var(--ease-in-out);
				border-radius: var(--size-64);
				margin-top: var(--size-neg-1);
			}
		}

		header[new-tab="true"] {
			height: 100%;
			input {
				text-align: center;
				height: 100% !important;
			}
		}

		img {
			display: none;
			border-radius: var(--size-2);
			box-shadow: var(--fast-thickness-1);
			width: 100%;
			height: 100%;
			background-color: var(--color-neutral-800);
			filter: blur(5px);
		}

		webview {
			overflow: hidden;
			border-radius: var(--size-2);
			width: 100%;
			height: 100%;
			background-color: var(--color-neutral-700);
			outline: 0px solid var(--color-white-70);
			transition-property: outline;
			transition-duration: 0.15s;
			transition-timing-function: var(--ease-in-out);

			error {
				color: var(--color-white);
			}
		}

		header[new-tab="true"] ~ webview {
			height: 0px !important;
		}

		.overlay {
			position: absolute;
			top: 0;
			left: 0;
			width: 100%;
			height: 100%;
			pointer-events: none;
			opacity: 0;
		}
	}

	[om-applet="webview"][is-loading="true"] .loading-indicator {
		display: block;
		animation: pulse-loading-background 1.5s infinite;
	}

	@keyframes pulse-loading-background {
		0% {
			background-color: var(--color-blue-300);
		}
		50% {
			background-color: var(--color-blue-600);
		}
		100% {
			background-color: var(--color-blue-300);
		}
	}

	[om-applet="webview"][keyboard-focus="true"] {
		outline: var(--size-2) solid ${fade("--color-slate-600", 80)};
	}

	[om-applet="webview"][is-devtools="true"] header {
		display: none;
	}

	[om-applet="webview"][om-motion="resizing"] webview {
		/* display: none; */
	}
	[om-applet="webview"][om-motion="resizing"] img[empty="false"] {
		/* display: block; */
	}

	.is-dragging webview,
	.is-panning webview,
	.is-zooming webview,
	.is-resizing webview,
	.super-key-down webview {
		pointer-events: none;
	}

	.super-key-down [om-applet="webview"] overlay {
		pointer-events: auto;
	}
`);

// user/spaces/home/src/main.ts
window.is_trackpad = false;
window.is_devtools_open = await bridge_default.win.isDevtoolsOpen();
var { main } = useTags();
var OmSpace = main({
  id: "om-space"
});
document.body.appendChild(OmSpace);
await finish();
await initializeDesktop(OmSpace);
GlobalStyleSheet(css`
	#om-space {
		display: flex;
		flex-direction: column;
		position: fixed;
		left: 0;
		top: 0;
		width: 100vw;
		height: 100vh;
		overflow: hidden;
		color: white;
		background: transparent;
	}

	#om-desktop::-webkit-scrollbar {
		width: 10px;
		height: 10px;
	}

	#om-desktop::-webkit-scrollbar-track {
		background: #e8dfd8;
	}

	#om-desktop::-webkit-scrollbar-thumb {
		background: #cd2430;
		border-radius: var(--size-2);
	}

	#om-desktop::-webkit-scrollbar-thumb:hover {
		background: #454545;
	}

	#om-desktop::-webkit-scrollbar-corner {
		background: #e8dfd8;
	}
`);

//# debugId=889A94AC1E9ED7B764756E2164756E21
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsiLi4vLi4vbGliL2ltYS50cyIsICIuLi8uLi9saWIvdXRpbHMuanMiLCAiLi4vLi4vbGliL2JyaWRnZS50cyIsICIuLi8uLi9tb2R1bGVzL29tL2JhY2tncm91bmQuanMiLCAiLi4vLi4vbW9kdWxlcy9vbS9kZXNrdG9wLmpzIiwgIi4uLy4uL21vZHVsZXMvb20vc3VwZXJrZXkuanMiLCAiLi4vLi4vbW9kdWxlcy9vbS9hcHBsZXRzL3Rlc3QuanMiLCAiLi4vLi4vbW9kdWxlcy9vbS9hcHBsZXRzL3N0aWNreS5qcyIsICIuLi8uLi9tb2R1bGVzL29tL2FwcGxldHMvYXBwdmlldy5qcyIsICIuLi8uLi9tb2R1bGVzL29tL2FwcGxldHMvd2Vidmlldy9pbmRleC5qcyIsICJzcmMvbWFpbi50cyJdLAogICJzb3VyY2VzQ29udGVudCI6IFsKICAgICIvL1xuLy8gSU1BICjku4opIDAuNi4wXG4vLyBieSBmZXJnYXJyYW1cbi8vXG5cbi8vIEEgdGlueSBpbW1lZGlhdGUtbW9kZSBpbnNwaXJlZCBVSSByZW5kZXJpbmcgZW5naW5lLlxuXG4vL1xuLy8gSW5kZXg6XG4vL1xuXG4vLyDigJQgQ29yZSBUeXBlc1xuLy8g4oCUIFRhZ3Ncbi8vIOKAlCBSZWFjdGl2ZSBTeXN0ZW1cbi8vIOKAlCBTdGF0aWMgR2VuZXJhdGlvblxuXG4vL1xuLy8gQ29yZSBUeXBlc1xuLy9cblxuZXhwb3J0IHR5cGUgQ2hpbGQgPSBIVE1MRWxlbWVudCB8IE5vZGUgfCBudWxsIHwgdW5kZWZpbmVkIHwgc3RyaW5nIHwgYm9vbGVhbiB8IG51bWJlciB8ICgoKSA9PiBhbnkpO1xuXG5leHBvcnQgdHlwZSBSZWY8VCA9IEhUTUxFbGVtZW50PiA9IHtcblx0Y3VycmVudDogVCB8IG51bGw7XG59O1xuXG5leHBvcnQgdHlwZSBQcm9wcyA9IHtcblx0aXM/OiBzdHJpbmc7XG5cdGtleT86IGFueTtcblx0cmVmPzogUmVmPEhUTUxFbGVtZW50Pjtcblx0aW5uZXJIVE1MPzogc3RyaW5nIHwgKCgpID0+IHN0cmluZyk7XG5cdFtrZXk6IHN0cmluZ106IGFueTtcbn07XG5cbmV4cG9ydCB0eXBlIFVzZVRhZ3NPcHRpb25zID0ge1xuXHRuYW1lc3BhY2U/OiBzdHJpbmc7XG5cdGF0dHI/OiAobmFtZTogc3RyaW5nLCB2YWx1ZTogYW55KSA9PiB7IG5hbWU6IHN0cmluZzsgdmFsdWU6IGFueSB9O1xufTtcblxuLy8gRGVmaW5lIFRhZ0FyZ3MgdG8gcHJvcGVybHkgaGFuZGxlIHRoZSBwYXJhbWV0ZXIgcGF0dGVybnNcbmV4cG9ydCB0eXBlIFRhZ0FyZ3MgPVxuXHR8IFtdIC8vIE5vIGFyZ3Ncblx0fCBbUHJvcHNdIC8vIEp1c3QgcHJvcHNcblx0fCBbQ2hpbGQsIC4uLkNoaWxkW11dIC8vIEZpcnN0IGNoaWxkIGZvbGxvd2VkIGJ5IG1vcmUgY2hpbGRyZW5cblx0fCBbUHJvcHMsIC4uLkNoaWxkW11dOyAvLyBQcm9wcyBmb2xsb3dlZCBieSBjaGlsZHJlblxuXG5leHBvcnQgdHlwZSBUYWdGdW5jdGlvbiA9ICguLi5hcmdzOiBUYWdBcmdzKSA9PiBIVE1MRWxlbWVudDtcblxuZXhwb3J0IHR5cGUgVGFnc1Byb3h5ID0ge1xuXHRba2V5OiBzdHJpbmddOiBUYWdGdW5jdGlvbjtcbn07XG5cbi8vXG4vLyBUYWcgR2VuZXJhdGlvblxuLy9cblxuZXhwb3J0IGZ1bmN0aW9uIHVzZVN0YXRpY1RhZ3MoKTogVGFnc1Byb3h5IHtcblx0cmV0dXJuIG5ldyBQcm94eSh7fSwgeyBnZXQ6IHN0YXRpY1RhZ0dlbmVyYXRvciB9KTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHVzZVRhZ3Mob3B0aW9ucz86IHN0cmluZyB8IFVzZVRhZ3NPcHRpb25zKTogVGFnc1Byb3h5IHtcblx0Y29uc3QgaXNfc3RhdGljID0gdHlwZW9mIHdpbmRvdyA9PT0gXCJ1bmRlZmluZWRcIjtcblxuXHQvLyBIYW5kbGUgYmFja3dhcmQgY29tcGF0aWJpbGl0eSAtIGlmIG9wdGlvbnMgaXMgYSBzdHJpbmcsIHRyZWF0IGl0IGFzIG5hbWVzcGFjZVxuXHRjb25zdCByZXNvbHZlZF9vcHRpb25zOiBVc2VUYWdzT3B0aW9ucyA9IHR5cGVvZiBvcHRpb25zID09PSBcInN0cmluZ1wiID8geyBuYW1lc3BhY2U6IG9wdGlvbnMgfSA6IG9wdGlvbnMgfHwge307XG5cblx0aWYgKGlzX3N0YXRpYykge1xuXHRcdHJldHVybiB1c2VTdGF0aWNUYWdzKCk7XG5cdH0gZWxzZSB7XG5cdFx0cmV0dXJuIG5ldyBQcm94eShcblx0XHRcdHt9LFxuXHRcdFx0e1xuXHRcdFx0XHRnZXQ6ICh0YXJnZXQsIHRhZykgPT4gdGFnR2VuZXJhdG9yKHRhcmdldCwgU3RyaW5nKHRhZyksIHJlc29sdmVkX29wdGlvbnMpLFxuXHRcdFx0fSxcblx0XHQpO1xuXHR9XG59XG5cbi8vXG4vLyBET00gRWxlbWVudCBHZW5lcmF0aW9uXG4vL1xuXG5pZiAodHlwZW9mIHdpbmRvdyA9PT0gXCJ1bmRlZmluZWRcIikge1xuXHQvLyBJbiBlbnZpcm9ubWVudHMgd2l0aG91dCBET00gKGxpa2UgQnVuL05vZGUgc2VydmVyLXNpZGUpLCBwcm92aWRlIG5vLW9wIHZlcnNpb25zXG5cdC8vIG9mIHRoZSByZWFjdGl2ZSBmdW5jdGlvbnMgdG8gcHJldmVudCBlcnJvcnNcblx0KGdsb2JhbFRoaXMgYXMgYW55KS5kb2N1bWVudCA9IHtcblx0XHRjcmVhdGVFbGVtZW50OiAoKSA9PiAoe30pLFxuXHRcdGNyZWF0ZVRleHROb2RlOiAoKSA9PiAoe30pLFxuXHRcdGNyZWF0ZUNvbW1lbnQ6ICgpID0+ICh7fSksXG5cdFx0Y3JlYXRlRWxlbWVudE5TOiAoKSA9PiAoe30pLFxuXHR9O1xuXG5cdGNvbnNvbGUud2FybihcIlRyeWluZyB0byB1c2UgY2xpZW50LXNpZGUgdGFncyBvbiBzZXJ2ZXIuXCIpO1xufVxuXG4vLyBTaGFyZWQgcGFyc2luZyBsb2dpY1xuZXhwb3J0IHR5cGUgUGFyc2VkQXJncyA9IHtcblx0cHJvcHM6IFByb3BzO1xuXHRjaGlsZHJlbjogQ2hpbGRbXTtcblx0cmVmPzogUmVmPEhUTUxFbGVtZW50Pjtcblx0aW5uZXJIVE1MPzogc3RyaW5nIHwgKCgpID0+IHN0cmluZyk7XG59O1xuXG5leHBvcnQgZnVuY3Rpb24gcGFyc2VUYWdBcmdzKGFyZ3M6IGFueVtdKTogUGFyc2VkQXJncyB7XG5cdGxldCBwcm9wczogUHJvcHMgPSB7fTtcblx0bGV0IGNoaWxkcmVuOiBDaGlsZFtdID0gYXJncztcblx0bGV0IHJlZjogUmVmPEhUTUxFbGVtZW50PiB8IHVuZGVmaW5lZDtcblx0bGV0IGlubmVySFRNTDogc3RyaW5nIHwgKCgpID0+IHN0cmluZykgfCB1bmRlZmluZWQ7XG5cblx0aWYgKGFyZ3MubGVuZ3RoID4gMCkge1xuXHRcdGNvbnN0IGZpcnN0X2FyZyA9IGFyZ3NbMF07XG5cblx0XHQvLyBJZiBmaXJzdCBhcmd1bWVudCBpcyBhIHN0cmluZywgbnVtYmVyLCBIVE1MRWxlbWVudCwgb3IgZnVuY3Rpb24sIGFsbCBhcmdzIGFyZSBjaGlsZHJlblxuXHRcdGlmIChcblx0XHRcdHR5cGVvZiBmaXJzdF9hcmcgPT09IFwic3RyaW5nXCIgfHxcblx0XHRcdHR5cGVvZiBmaXJzdF9hcmcgPT09IFwibnVtYmVyXCIgfHxcblx0XHRcdCh0eXBlb2Ygd2luZG93ICE9PSBcInVuZGVmaW5lZFwiICYmIGZpcnN0X2FyZyBpbnN0YW5jZW9mIEhUTUxFbGVtZW50KSB8fFxuXHRcdFx0dHlwZW9mIGZpcnN0X2FyZyA9PT0gXCJmdW5jdGlvblwiXG5cdFx0KSB7XG5cdFx0XHRjaGlsZHJlbiA9IGFyZ3M7XG5cdFx0fVxuXHRcdC8vIElmIGZpcnN0IGFyZ3VtZW50IGlzIGEgcGxhaW4gb2JqZWN0LCB0cmVhdCBpdCBhcyBwcm9wc1xuXHRcdGVsc2UgaWYgKE9iamVjdC5nZXRQcm90b3R5cGVPZihmaXJzdF9hcmcgfHwgMCkgPT09IE9iamVjdC5wcm90b3R5cGUpIHtcblx0XHRcdGNvbnN0IFtwcm9wc19hcmcsIC4uLnJlc3RfYXJnc10gPSBhcmdzO1xuXHRcdFx0Y29uc3QgeyBpcywgcmVmOiBwcm9wX3JlZiwgaW5uZXJIVE1MOiBwcm9wX2lubmVySFRNTCwgLi4ucmVzdF9wcm9wcyB9ID0gcHJvcHNfYXJnO1xuXHRcdFx0cHJvcHMgPSByZXN0X3Byb3BzO1xuXHRcdFx0Y2hpbGRyZW4gPSByZXN0X2FyZ3M7XG5cdFx0XHRyZWYgPSBwcm9wX3JlZjtcblx0XHRcdGlubmVySFRNTCA9IHByb3BfaW5uZXJIVE1MO1xuXHRcdH1cblx0fVxuXG5cdHJldHVybiB7IHByb3BzLCBjaGlsZHJlbiwgcmVmLCBpbm5lckhUTUwgfTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHRhZ0dlbmVyYXRvcihfOiBhbnksIHRhZzogc3RyaW5nLCBvcHRpb25zPzogVXNlVGFnc09wdGlvbnMpOiBUYWdGdW5jdGlvbiB7XG5cdHJldHVybiAoLi4uYXJnczogYW55W10pOiBIVE1MRWxlbWVudCA9PiB7XG5cdFx0Y29uc3QgeyBwcm9wcywgY2hpbGRyZW4sIHJlZiwgaW5uZXJIVE1MIH0gPSBwYXJzZVRhZ0FyZ3MoYXJncyk7XG5cblx0XHRjb25zdCBlbGVtZW50ID0gb3B0aW9ucz8ubmFtZXNwYWNlID8gZG9jdW1lbnQuY3JlYXRlRWxlbWVudE5TKG9wdGlvbnMubmFtZXNwYWNlLCB0YWcpIDogZG9jdW1lbnQuY3JlYXRlRWxlbWVudCh0YWcpO1xuXG5cdFx0aWYgKHJlZikge1xuXHRcdFx0cmVmLmN1cnJlbnQgPSBlbGVtZW50IGFzIEhUTUxFbGVtZW50O1xuXHRcdH1cblxuXHRcdC8vIEhhbmRsZSBwcm9wcy9hdHRyaWJ1dGVzXG5cdFx0Zm9yIChjb25zdCBbYXR0cl9rZXksIHZhbHVlXSBvZiBPYmplY3QuZW50cmllcyhwcm9wcykpIHtcblx0XHRcdGxldCBwcm9jZXNzZWRfbmFtZSA9IGF0dHJfa2V5O1xuXHRcdFx0bGV0IHByb2Nlc3NlZF92YWx1ZSA9IHZhbHVlO1xuXG5cdFx0XHQvLyBBcHBseSBjdXN0b20gYXR0cmlidXRlIHByb2Nlc3NpbmcgaWYgcHJvdmlkZWRcblx0XHRcdGlmIChvcHRpb25zPy5hdHRyKSB7XG5cdFx0XHRcdGNvbnN0IHJlc3VsdCA9IG9wdGlvbnMuYXR0cihhdHRyX2tleSwgdmFsdWUpO1xuXHRcdFx0XHRwcm9jZXNzZWRfbmFtZSA9IHJlc3VsdC5uYW1lO1xuXHRcdFx0XHRwcm9jZXNzZWRfdmFsdWUgPSByZXN1bHQudmFsdWU7XG5cdFx0XHR9XG5cblx0XHRcdGlmIChwcm9jZXNzZWRfbmFtZS5zdGFydHNXaXRoKFwib25cIikgJiYgdHlwZW9mIHByb2Nlc3NlZF92YWx1ZSA9PT0gXCJmdW5jdGlvblwiKSB7XG5cdFx0XHRcdGNvbnN0IGV2ZW50X25hbWUgPSBwcm9jZXNzZWRfbmFtZS5zdWJzdHJpbmcoMikudG9Mb3dlckNhc2UoKTtcblx0XHRcdFx0ZWxlbWVudC5hZGRFdmVudExpc3RlbmVyKGV2ZW50X25hbWUsIHByb2Nlc3NlZF92YWx1ZSBhcyBFdmVudExpc3RlbmVyKTtcblx0XHRcdFx0Y29udGludWU7XG5cdFx0XHR9XG5cblx0XHRcdGlmICh0eXBlb2YgcHJvY2Vzc2VkX3ZhbHVlID09PSBcImZ1bmN0aW9uXCIgJiYgIXByb2Nlc3NlZF9uYW1lLnN0YXJ0c1dpdGgoXCJvblwiKSkge1xuXHRcdFx0XHRzZXR1cFJlYWN0aXZlQXR0cihlbGVtZW50IGFzIEhUTUxFbGVtZW50LCBwcm9jZXNzZWRfbmFtZSwgcHJvY2Vzc2VkX3ZhbHVlKTtcblx0XHRcdFx0Y29udGludWU7XG5cdFx0XHR9XG5cblx0XHRcdGlmIChwcm9jZXNzZWRfdmFsdWUgPT09IHRydWUpIHtcblx0XHRcdFx0ZWxlbWVudC5zZXRBdHRyaWJ1dGUocHJvY2Vzc2VkX25hbWUsIFwidHJ1ZVwiKTtcblx0XHRcdH0gZWxzZSBpZiAocHJvY2Vzc2VkX3ZhbHVlID09PSBmYWxzZSkge1xuXHRcdFx0XHRlbGVtZW50LnNldEF0dHJpYnV0ZShwcm9jZXNzZWRfbmFtZSwgXCJmYWxzZVwiKTtcblx0XHRcdH0gZWxzZSBpZiAocHJvY2Vzc2VkX3ZhbHVlICE9PSBudWxsICYmIHByb2Nlc3NlZF92YWx1ZSAhPT0gdW5kZWZpbmVkKSB7XG5cdFx0XHRcdGVsZW1lbnQuc2V0QXR0cmlidXRlKHByb2Nlc3NlZF9uYW1lLCBTdHJpbmcocHJvY2Vzc2VkX3ZhbHVlKSk7XG5cdFx0XHR9XG5cdFx0fVxuXG5cdFx0Ly8gSGFuZGxlIGlubmVySFRNTCAtIHNldCBpdCBkaXJlY3RseSBhbmQgc2tpcCBwcm9jZXNzaW5nIGNoaWxkcmVuXG5cdFx0aWYgKGlubmVySFRNTCAhPT0gdW5kZWZpbmVkKSB7XG5cdFx0XHRlbGVtZW50LmlubmVySFRNTCA9IFN0cmluZyhpbm5lckhUTUwpO1xuXHRcdFx0cmV0dXJuIGVsZW1lbnQgYXMgSFRNTEVsZW1lbnQ7XG5cdFx0fVxuXG5cdFx0Ly8gUHJvY2VzcyBjaGlsZHJlbiBhbmQgYXBwZW5kIHRvIGVsZW1lbnRcblx0XHRmb3IgKGNvbnN0IGNoaWxkIG9mIGNoaWxkcmVuLmZsYXQoSW5maW5pdHkpKSB7XG5cdFx0XHRpZiAoY2hpbGQgIT0gbnVsbCkge1xuXHRcdFx0XHRpZiAoY2hpbGQgaW5zdGFuY2VvZiBOb2RlKSB7XG5cdFx0XHRcdFx0ZWxlbWVudC5hcHBlbmRDaGlsZChjaGlsZCk7XG5cdFx0XHRcdH0gZWxzZSBpZiAodHlwZW9mIGNoaWxkID09PSBcImZ1bmN0aW9uXCIpIHtcblx0XHRcdFx0XHRjb25zdCByZWFjdGl2ZV9ub2RlID0gc2V0dXBSZWFjdGl2ZU5vZGUoY2hpbGQpO1xuXHRcdFx0XHRcdGVsZW1lbnQuYXBwZW5kQ2hpbGQocmVhY3RpdmVfbm9kZSk7XG5cdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0ZWxlbWVudC5hcHBlbmRDaGlsZChkb2N1bWVudC5jcmVhdGVUZXh0Tm9kZShTdHJpbmcoY2hpbGQpKSk7XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHR9XG5cblx0XHRyZXR1cm4gZWxlbWVudCBhcyBIVE1MRWxlbWVudDtcblx0fTtcbn1cblxuLy9cbi8vIFJlYWN0aXZlIFN5c3RlbVxuLy9cblxuLy8gUmVhY3RpdmUgbm9kZXNcbmNvbnN0IHJlYWN0aXZlX21hcmtlcnM6IChDb21tZW50IHwgbnVsbClbXSA9IFtdO1xuY29uc3QgcmVhY3RpdmVfY2FsbGJhY2tzOiAoKCgpID0+IGFueSkgfCBudWxsKVtdID0gW107XG5jb25zdCByZWFjdGl2ZV9wcmV2X3ZhbHVlczogKE5vZGUgfCBzdHJpbmcgfCBudWxsKVtdID0gW107XG5sZXQgcmVhY3RpdmVfbm9kZV9jb3VudCA9IDA7XG5cbi8vIFJlYWN0aXZlIGF0dHJpYnV0ZXNcbmNvbnN0IHJlYWN0aXZlX2F0dHJfZWxlbWVudHM6IChIVE1MRWxlbWVudCB8IG51bGwpW10gPSBbXTtcbmNvbnN0IHJlYWN0aXZlX2F0dHJfbmFtZXM6IChzdHJpbmcgfCBudWxsKVtdID0gW107XG5jb25zdCByZWFjdGl2ZV9hdHRyX2NhbGxiYWNrczogKCgoKSA9PiBhbnkpIHwgbnVsbClbXSA9IFtdO1xuY29uc3QgcmVhY3RpdmVfYXR0cl9wcmV2X3ZhbHVlczogYW55W10gPSBbXTtcbmxldCByZWFjdGl2ZV9hdHRyX2NvdW50ID0gMDtcblxubGV0IGZyYW1lX3RpbWUgPSAwO1xubGV0IGNsZWFudXBfY291bnRlciA9IDA7XG5cbi8vIFN0YXJ0IHRoZSBmcmFtZSBsb29wIGltbWVkaWF0ZWx5XG5pZiAodHlwZW9mIHdpbmRvdyAhPT0gXCJ1bmRlZmluZWRcIikge1xuXHRyZXF1ZXN0QW5pbWF0aW9uRnJhbWUodXBkYXRlUmVhY3RpdmVDb21wb25lbnRzKTtcbn1cblxuZnVuY3Rpb24gdXBkYXRlUmVhY3RpdmVDb21wb25lbnRzKCkge1xuXHQvLyBTdGFydCB0aW1pbmcgdGhlIHVwZGF0ZVxuXHRjb25zdCBzdGFydF90aW1lID0gcGVyZm9ybWFuY2Uubm93KCk7XG5cblx0bGV0IGZvdW5kX2Rpc2Nvbm5lY3RlZF9hdHRycyA9IGZhbHNlO1xuXHRsZXQgZm91bmRfZGlzY29ubmVjdGVkX25vZGVzID0gZmFsc2U7XG5cblx0Ly8gVXBkYXRlIHJlYWN0aXZlIGF0dHJpYnV0ZXNcblx0Zm9yIChsZXQgaSA9IDA7IGkgPCByZWFjdGl2ZV9hdHRyX2NvdW50OyBpKyspIHtcblx0XHRjb25zdCBlbGVtZW50ID0gcmVhY3RpdmVfYXR0cl9lbGVtZW50c1tpXTtcblxuXHRcdC8vIFRyYWNrIGlmIHdlIGZpbmQgZGlzY29ubmVjdGVkIGVsZW1lbnRzXG5cdFx0aWYgKCFlbGVtZW50IHx8ICFlbGVtZW50LmlzQ29ubmVjdGVkKSB7XG5cdFx0XHRmb3VuZF9kaXNjb25uZWN0ZWRfYXR0cnMgPSB0cnVlO1xuXHRcdFx0Y29udGludWU7XG5cdFx0fVxuXG5cdFx0Y29uc3QgYXR0cl9uYW1lID0gcmVhY3RpdmVfYXR0cl9uYW1lc1tpXTtcblx0XHRjb25zdCBjYWxsYmFjayA9IHJlYWN0aXZlX2F0dHJfY2FsbGJhY2tzW2ldO1xuXG5cdFx0aWYgKCFhdHRyX25hbWUgfHwgIWNhbGxiYWNrKSBjb250aW51ZTtcblxuXHRcdGNvbnN0IG5ld192YWx1ZSA9IGNhbGxiYWNrKCk7XG5cblx0XHQvLyBPbmx5IHVwZGF0ZSBpZiB2YWx1ZSBjaGFuZ2VkXG5cdFx0aWYgKG5ld192YWx1ZSAhPT0gcmVhY3RpdmVfYXR0cl9wcmV2X3ZhbHVlc1tpXSkge1xuXHRcdFx0aWYgKG5ld192YWx1ZSA9PT0gdHJ1ZSkge1xuXHRcdFx0XHRlbGVtZW50LnNldEF0dHJpYnV0ZShhdHRyX25hbWUsIFwidHJ1ZVwiKTtcblx0XHRcdH0gZWxzZSBpZiAobmV3X3ZhbHVlID09PSBmYWxzZSkge1xuXHRcdFx0XHRlbGVtZW50LnNldEF0dHJpYnV0ZShhdHRyX25hbWUsIFwiZmFsc2VcIik7XG5cdFx0XHR9IGVsc2UgaWYgKG5ld192YWx1ZSA9PT0gbnVsbCB8fCBuZXdfdmFsdWUgPT09IHVuZGVmaW5lZCkge1xuXHRcdFx0XHRlbGVtZW50LnJlbW92ZUF0dHJpYnV0ZShhdHRyX25hbWUpO1xuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0ZWxlbWVudC5zZXRBdHRyaWJ1dGUoYXR0cl9uYW1lLCBTdHJpbmcobmV3X3ZhbHVlKSk7XG5cdFx0XHR9XG5cblx0XHRcdHJlYWN0aXZlX2F0dHJfcHJldl92YWx1ZXNbaV0gPSBuZXdfdmFsdWU7XG5cdFx0fVxuXHR9XG5cblx0Ly8gVXBkYXRlIHJlYWN0aXZlIG5vZGVzXG5cdGZvciAobGV0IGkgPSAwOyBpIDwgcmVhY3RpdmVfbm9kZV9jb3VudDsgaSsrKSB7XG5cdFx0Y29uc3QgbWFya2VyID0gcmVhY3RpdmVfbWFya2Vyc1tpXTtcblxuXHRcdC8vIFRyYWNrIGlmIHdlIGZpbmQgZGlzY29ubmVjdGVkIG1hcmtlcnNcblx0XHRpZiAoIW1hcmtlciB8fCAhbWFya2VyLmlzQ29ubmVjdGVkKSB7XG5cdFx0XHRmb3VuZF9kaXNjb25uZWN0ZWRfbm9kZXMgPSB0cnVlO1xuXHRcdFx0Y29udGludWU7XG5cdFx0fVxuXG5cdFx0Y29uc3QgY2FsbGJhY2sgPSByZWFjdGl2ZV9jYWxsYmFja3NbaV07XG5cdFx0aWYgKCFjYWxsYmFjaykgY29udGludWU7XG5cblx0XHRjb25zdCBuZXdfdmFsdWUgPSBjYWxsYmFjaygpO1xuXG5cdFx0Ly8gR2V0IHRoZSBjdXJyZW50IG5vZGUgKHNob3VsZCBiZSByaWdodCBiZWZvcmUgdGhlIG1hcmtlcilcblx0XHRjb25zdCBjdXJyZW50X25vZGUgPSBtYXJrZXIucHJldmlvdXNTaWJsaW5nO1xuXHRcdGlmICghY3VycmVudF9ub2RlKSBjb250aW51ZTtcblxuXHRcdC8vIERldGVybWluZSBpZiB3ZSBuZWVkIHRvIHVwZGF0ZSBiYXNlZCBvbiBjb250ZW50XG5cdFx0bGV0IG5lZWRzX3VwZGF0ZSA9IGZhbHNlO1xuXG5cdFx0aWYgKG5ld192YWx1ZSBpbnN0YW5jZW9mIE5vZGUpIHtcblx0XHRcdGlmIChjdXJyZW50X25vZGUgaW5zdGFuY2VvZiBIVE1MRWxlbWVudCAmJiBuZXdfdmFsdWUgaW5zdGFuY2VvZiBIVE1MRWxlbWVudCkge1xuXHRcdFx0XHQvLyBGb3IgSFRNTCBlbGVtZW50cywgY29tcGFyZSB0aGVpciBIVE1MIGNvbnRlbnRcblx0XHRcdFx0aWYgKGN1cnJlbnRfbm9kZS5vdXRlckhUTUwgIT09IG5ld192YWx1ZS5vdXRlckhUTUwpIHtcblx0XHRcdFx0XHRuZWVkc191cGRhdGUgPSB0cnVlO1xuXHRcdFx0XHR9XG5cdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHQvLyBGb3Igbm9uLUhUTUxFbGVtZW50cyBvciBtaXhlZCB0eXBlcywgYWx3YXlzIHVwZGF0ZVxuXHRcdFx0XHRuZWVkc191cGRhdGUgPSB0cnVlO1xuXHRcdFx0fVxuXHRcdH0gZWxzZSB7XG5cdFx0XHQvLyBGb3IgdGV4dCB2YWx1ZXMsIGNvbXBhcmUgd2l0aCBjdXJyZW50IG5vZGVcblx0XHRcdGNvbnN0IG5ld190ZXh0ID0gU3RyaW5nKG5ld192YWx1ZSB8fCBcIlwiKTtcblx0XHRcdGlmIChjdXJyZW50X25vZGUubm9kZVR5cGUgPT09IE5vZGUuVEVYVF9OT0RFKSB7XG5cdFx0XHRcdG5lZWRzX3VwZGF0ZSA9IGN1cnJlbnRfbm9kZS50ZXh0Q29udGVudCAhPT0gbmV3X3RleHQ7XG5cdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRuZWVkc191cGRhdGUgPSB0cnVlOyAvLyBEaWZmZXJlbnQgbm9kZSB0eXBlc1xuXHRcdFx0fVxuXHRcdH1cblxuXHRcdC8vIE9ubHkgdXBkYXRlIERPTSBpZiBuZWVkZWRcblx0XHRpZiAobmVlZHNfdXBkYXRlKSB7XG5cdFx0XHRsZXQgbmV3X25vZGU6IE5vZGU7XG5cblx0XHRcdGlmIChuZXdfdmFsdWUgaW5zdGFuY2VvZiBOb2RlKSB7XG5cdFx0XHRcdG5ld19ub2RlID0gbmV3X3ZhbHVlO1xuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0bmV3X25vZGUgPSBkb2N1bWVudC5jcmVhdGVUZXh0Tm9kZShTdHJpbmcobmV3X3ZhbHVlIHx8IFwiXCIpKTtcblx0XHRcdH1cblxuXHRcdFx0Y3VycmVudF9ub2RlLnJlcGxhY2VXaXRoKG5ld19ub2RlKTtcblx0XHR9XG5cdH1cblxuXHQvLyBPbmx5IHBlcmZvcm0gY2xlYW51cCBpZiB3ZSBmb3VuZCBkaXNjb25uZWN0ZWQgY29tcG9uZW50c1xuXHRpZiAoZm91bmRfZGlzY29ubmVjdGVkX2F0dHJzIHx8IGZvdW5kX2Rpc2Nvbm5lY3RlZF9ub2Rlcykge1xuXHRcdGNsZWFudXBfY291bnRlcisrO1xuXHRcdGlmIChjbGVhbnVwX2NvdW50ZXIgPj0gNjApIHtcblx0XHRcdGNsZWFudXBfY291bnRlciA9IDA7XG5cdFx0XHRjbGVhbnVwRGlzY29ubmVjdGVkUmVhY3RpdmVzKCk7XG5cdFx0fVxuXHR9XG5cblx0Ly8gQ2FsY3VsYXRlIGFuZCBzdG9yZSB0aGUgdGltZSBpdCB0b29rIHRvIHVwZGF0ZVxuXHRmcmFtZV90aW1lID0gcGVyZm9ybWFuY2Uubm93KCkgLSBzdGFydF90aW1lO1xuXG5cdC8vIEFsd2F5cyBzY2hlZHVsZSB0aGUgbmV4dCBmcmFtZVxuXHRyZXF1ZXN0QW5pbWF0aW9uRnJhbWUodXBkYXRlUmVhY3RpdmVDb21wb25lbnRzKTtcbn1cblxuZnVuY3Rpb24gY2xlYW51cERpc2Nvbm5lY3RlZFJlYWN0aXZlcygpIHtcblx0Ly8gQ2xlYW51cCByZWFjdGl2ZSBub2Rlc1xuXHRsZXQgd3JpdGVfaW5kZXggPSAwO1xuXHRmb3IgKGxldCByZWFkX2luZGV4ID0gMDsgcmVhZF9pbmRleCA8IHJlYWN0aXZlX25vZGVfY291bnQ7IHJlYWRfaW5kZXgrKykge1xuXHRcdGNvbnN0IG1hcmtlciA9IHJlYWN0aXZlX21hcmtlcnNbcmVhZF9pbmRleF07XG5cdFx0Y29uc3QgY2FsbGJhY2sgPSByZWFjdGl2ZV9jYWxsYmFja3NbcmVhZF9pbmRleF07XG5cdFx0Y29uc3QgcHJldl92YWx1ZSA9IHJlYWN0aXZlX3ByZXZfdmFsdWVzW3JlYWRfaW5kZXhdO1xuXG5cdFx0Ly8gS2VlcCBpZiBtYXJrZXIgaXMgc3RpbGwgY29ubmVjdGVkXG5cdFx0aWYgKG1hcmtlciAmJiBtYXJrZXIuaXNDb25uZWN0ZWQpIHtcblx0XHRcdGlmICh3cml0ZV9pbmRleCAhPT0gcmVhZF9pbmRleCkge1xuXHRcdFx0XHRyZWFjdGl2ZV9tYXJrZXJzW3dyaXRlX2luZGV4XSA9IG1hcmtlcjtcblx0XHRcdFx0cmVhY3RpdmVfY2FsbGJhY2tzW3dyaXRlX2luZGV4XSA9IGNhbGxiYWNrO1xuXHRcdFx0XHRyZWFjdGl2ZV9wcmV2X3ZhbHVlc1t3cml0ZV9pbmRleF0gPSBwcmV2X3ZhbHVlO1xuXHRcdFx0fVxuXHRcdFx0d3JpdGVfaW5kZXgrKztcblx0XHR9XG5cdH1cblxuXHQvLyBDbGVhciB0aGUgcmVtYWluaW5nIHNsb3RzIGFuZCB1cGRhdGUgY291bnRcblx0Zm9yIChsZXQgaSA9IHdyaXRlX2luZGV4OyBpIDwgcmVhY3RpdmVfbm9kZV9jb3VudDsgaSsrKSB7XG5cdFx0cmVhY3RpdmVfbWFya2Vyc1tpXSA9IG51bGw7XG5cdFx0cmVhY3RpdmVfY2FsbGJhY2tzW2ldID0gbnVsbDtcblx0XHRyZWFjdGl2ZV9wcmV2X3ZhbHVlc1tpXSA9IG51bGw7XG5cdH1cblx0cmVhY3RpdmVfbm9kZV9jb3VudCA9IHdyaXRlX2luZGV4O1xuXG5cdC8vIENsZWFudXAgcmVhY3RpdmUgYXR0cmlidXRlc1xuXHR3cml0ZV9pbmRleCA9IDA7XG5cdGZvciAobGV0IHJlYWRfaW5kZXggPSAwOyByZWFkX2luZGV4IDwgcmVhY3RpdmVfYXR0cl9jb3VudDsgcmVhZF9pbmRleCsrKSB7XG5cdFx0Y29uc3QgZWxlbWVudCA9IHJlYWN0aXZlX2F0dHJfZWxlbWVudHNbcmVhZF9pbmRleF07XG5cdFx0Y29uc3QgYXR0cl9uYW1lID0gcmVhY3RpdmVfYXR0cl9uYW1lc1tyZWFkX2luZGV4XTtcblx0XHRjb25zdCBjYWxsYmFjayA9IHJlYWN0aXZlX2F0dHJfY2FsbGJhY2tzW3JlYWRfaW5kZXhdO1xuXHRcdGNvbnN0IHByZXZfdmFsdWUgPSByZWFjdGl2ZV9hdHRyX3ByZXZfdmFsdWVzW3JlYWRfaW5kZXhdO1xuXG5cdFx0Ly8gS2VlcCBpZiBlbGVtZW50IGlzIHN0aWxsIGNvbm5lY3RlZFxuXHRcdGlmIChlbGVtZW50ICYmIGVsZW1lbnQuaXNDb25uZWN0ZWQpIHtcblx0XHRcdGlmICh3cml0ZV9pbmRleCAhPT0gcmVhZF9pbmRleCkge1xuXHRcdFx0XHRyZWFjdGl2ZV9hdHRyX2VsZW1lbnRzW3dyaXRlX2luZGV4XSA9IGVsZW1lbnQ7XG5cdFx0XHRcdHJlYWN0aXZlX2F0dHJfbmFtZXNbd3JpdGVfaW5kZXhdID0gYXR0cl9uYW1lO1xuXHRcdFx0XHRyZWFjdGl2ZV9hdHRyX2NhbGxiYWNrc1t3cml0ZV9pbmRleF0gPSBjYWxsYmFjaztcblx0XHRcdFx0cmVhY3RpdmVfYXR0cl9wcmV2X3ZhbHVlc1t3cml0ZV9pbmRleF0gPSBwcmV2X3ZhbHVlO1xuXHRcdFx0fVxuXHRcdFx0d3JpdGVfaW5kZXgrKztcblx0XHR9XG5cdH1cblxuXHQvLyBDbGVhciB0aGUgcmVtYWluaW5nIHNsb3RzIGFuZCB1cGRhdGUgY291bnRcblx0Zm9yIChsZXQgaSA9IHdyaXRlX2luZGV4OyBpIDwgcmVhY3RpdmVfYXR0cl9jb3VudDsgaSsrKSB7XG5cdFx0cmVhY3RpdmVfYXR0cl9lbGVtZW50c1tpXSA9IG51bGw7XG5cdFx0cmVhY3RpdmVfYXR0cl9uYW1lc1tpXSA9IG51bGw7XG5cdFx0cmVhY3RpdmVfYXR0cl9jYWxsYmFja3NbaV0gPSBudWxsO1xuXHRcdHJlYWN0aXZlX2F0dHJfcHJldl92YWx1ZXNbaV0gPSB1bmRlZmluZWQ7XG5cdH1cblx0cmVhY3RpdmVfYXR0cl9jb3VudCA9IHdyaXRlX2luZGV4O1xufVxuXG5leHBvcnQgZnVuY3Rpb24gZ2V0RnJhbWVUaW1lKCkge1xuXHRyZXR1cm4gZnJhbWVfdGltZTtcbn1cblxuZnVuY3Rpb24gc2V0dXBSZWFjdGl2ZU5vZGUoY2FsbGJhY2s6ICgpID0+IGFueSk6IE5vZGUge1xuXHRjb25zdCBub2RlX2luZGV4ID0gcmVhY3RpdmVfbm9kZV9jb3VudCsrO1xuXG5cdC8vIENyZWF0ZSBhIG1hcmtlciBjb21tZW50IG5vZGVcblx0Y29uc3QgbWFya2VyID0gZG9jdW1lbnQuY3JlYXRlQ29tbWVudChgcmVhY3RpdmUtJHtub2RlX2luZGV4fWApO1xuXG5cdC8vIEdldCBpbml0aWFsIHZhbHVlXG5cdGNvbnN0IGluaXRpYWxfdmFsdWUgPSBjYWxsYmFjaygpO1xuXG5cdC8vIENyZWF0ZSB0aGUgaW5pdGlhbCBub2RlXG5cdGxldCBpbml0aWFsX25vZGU6IE5vZGU7XG5cblx0aWYgKGluaXRpYWxfdmFsdWUgaW5zdGFuY2VvZiBOb2RlKSB7XG5cdFx0aW5pdGlhbF9ub2RlID0gaW5pdGlhbF92YWx1ZTtcblx0fSBlbHNlIHtcblx0XHRpbml0aWFsX25vZGUgPSBkb2N1bWVudC5jcmVhdGVUZXh0Tm9kZShTdHJpbmcoaW5pdGlhbF92YWx1ZSB8fCBcIlwiKSk7XG5cdH1cblxuXHQvLyBDcmVhdGUgYSBmcmFnbWVudCB0byBob2xkIGJvdGggdGhlIG1hcmtlciBhbmQgdGhlIGNvbnRlbnRcblx0Y29uc3QgZnJhZ21lbnQgPSBkb2N1bWVudC5jcmVhdGVEb2N1bWVudEZyYWdtZW50KCk7XG5cdGZyYWdtZW50LmFwcGVuZENoaWxkKGluaXRpYWxfbm9kZSk7XG5cdGZyYWdtZW50LmFwcGVuZENoaWxkKG1hcmtlcik7XG5cblx0Ly8gU3RvcmUgcmVhY3RpdmUgZGF0YVxuXHRyZWFjdGl2ZV9tYXJrZXJzW25vZGVfaW5kZXhdID0gbWFya2VyO1xuXHRyZWFjdGl2ZV9jYWxsYmFja3Nbbm9kZV9pbmRleF0gPSBjYWxsYmFjaztcblx0cmVhY3RpdmVfcHJldl92YWx1ZXNbbm9kZV9pbmRleF0gPSBpbml0aWFsX25vZGU7XG5cblx0cmV0dXJuIGZyYWdtZW50O1xufVxuXG5mdW5jdGlvbiBzZXR1cFJlYWN0aXZlQXR0cihlbGVtZW50OiBIVE1MRWxlbWVudCwgYXR0cl9uYW1lOiBzdHJpbmcsIGNhbGxiYWNrOiAoKSA9PiBhbnkpIHtcblx0Y29uc3QgYXR0cl9pbmRleCA9IHJlYWN0aXZlX2F0dHJfY291bnQrKztcblxuXHQvLyBJbml0aWFsaXplIHdpdGggY3VycmVudCB2YWx1ZVxuXHRjb25zdCBpbml0aWFsX3ZhbHVlID0gY2FsbGJhY2soKTtcblxuXHQvLyBTZXQgdGhlIGluaXRpYWwgYXR0cmlidXRlIHZhbHVlXG5cdGlmIChpbml0aWFsX3ZhbHVlID09PSB0cnVlKSB7XG5cdFx0ZWxlbWVudC5zZXRBdHRyaWJ1dGUoYXR0cl9uYW1lLCBcInRydWVcIik7XG5cdH0gZWxzZSBpZiAoaW5pdGlhbF92YWx1ZSA9PT0gZmFsc2UpIHtcblx0XHRlbGVtZW50LnNldEF0dHJpYnV0ZShhdHRyX25hbWUsIFwiZmFsc2VcIik7XG5cdH0gZWxzZSBpZiAoaW5pdGlhbF92YWx1ZSAhPT0gbnVsbCAmJiBpbml0aWFsX3ZhbHVlICE9PSB1bmRlZmluZWQpIHtcblx0XHRlbGVtZW50LnNldEF0dHJpYnV0ZShhdHRyX25hbWUsIFN0cmluZyhpbml0aWFsX3ZhbHVlKSk7XG5cdH1cblxuXHQvLyBTdG9yZSByZWZlcmVuY2VzXG5cdHJlYWN0aXZlX2F0dHJfZWxlbWVudHNbYXR0cl9pbmRleF0gPSBlbGVtZW50O1xuXHRyZWFjdGl2ZV9hdHRyX25hbWVzW2F0dHJfaW5kZXhdID0gYXR0cl9uYW1lO1xuXHRyZWFjdGl2ZV9hdHRyX2NhbGxiYWNrc1thdHRyX2luZGV4XSA9IGNhbGxiYWNrO1xuXHRyZWFjdGl2ZV9hdHRyX3ByZXZfdmFsdWVzW2F0dHJfaW5kZXhdID0gaW5pdGlhbF92YWx1ZTtcbn1cblxuLy9cbi8vIFN0YXRpYyBHZW5lcmF0aW9uXG4vL1xuXG4vLyBWb2lkIGVsZW1lbnRzIHRoYXQgYXJlIHNlbGYtY2xvc2luZ1xuY29uc3QgVk9JRF9FTEVNRU5UUyA9IG5ldyBTZXQoW1xuXHRcImFyZWFcIixcblx0XCJiYXNlXCIsXG5cdFwiYnJcIixcblx0XCJjb2xcIixcblx0XCJlbWJlZFwiLFxuXHRcImhyXCIsXG5cdFwiaW1nXCIsXG5cdFwiaW5wdXRcIixcblx0XCJsaW5rXCIsXG5cdFwibWV0YVwiLFxuXHRcInBhcmFtXCIsXG5cdFwic291cmNlXCIsXG5cdFwidHJhY2tcIixcblx0XCJ3YnJcIixcbl0pO1xuXG5leHBvcnQgZnVuY3Rpb24gZXNjYXBlSHRtbCh2YWx1ZTogc3RyaW5nKTogc3RyaW5nIHtcblx0cmV0dXJuIHZhbHVlXG5cdFx0LnJlcGxhY2UoLyYvZywgXCImYW1wO1wiKVxuXHRcdC5yZXBsYWNlKC9cIi9nLCBcIiZxdW90O1wiKVxuXHRcdC5yZXBsYWNlKC8nL2csIFwiJiMzOTtcIilcblx0XHQucmVwbGFjZSgvPC9nLCBcIiZsdDtcIilcblx0XHQucmVwbGFjZSgvPi9nLCBcIiZndDtcIik7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBidWlsZEF0dHJpYnV0ZXNIdG1sKHByb3BzOiBQcm9wcyk6IHN0cmluZyB7XG5cdGxldCBodG1sID0gXCJcIjtcblxuXHRmb3IgKGNvbnN0IFtrZXksIHZhbHVlXSBvZiBPYmplY3QuZW50cmllcyhwcm9wcykpIHtcblx0XHQvLyBTa2lwIGV2ZW50IGhhbmRsZXJzIGFuZCBmdW5jdGlvbnNcblx0XHRpZiAoa2V5LnN0YXJ0c1dpdGgoXCJvblwiKSB8fCB0eXBlb2YgdmFsdWUgPT09IFwiZnVuY3Rpb25cIikge1xuXHRcdFx0Y29udGludWU7XG5cdFx0fVxuXHRcdC8vIFJlZ3VsYXIgYXR0cmlidXRlc1xuXHRcdGlmICh2YWx1ZSA9PT0gdHJ1ZSkge1xuXHRcdFx0aHRtbCArPSBgICR7a2V5fWA7XG5cdFx0fSBlbHNlIGlmICh2YWx1ZSAhPT0gZmFsc2UgJiYgdmFsdWUgIT0gbnVsbCkge1xuXHRcdFx0aHRtbCArPSBgICR7a2V5fT1cIiR7ZXNjYXBlSHRtbChTdHJpbmcodmFsdWUpKX1cImA7XG5cdFx0fVxuXHR9XG5cblx0cmV0dXJuIGh0bWw7XG59XG5cbmZ1bmN0aW9uIHN0YXRpY1RhZ0dlbmVyYXRvcihfOiBhbnksIHRhZzogc3RyaW5nKSB7XG5cdHJldHVybiAoLi4uYXJnczogYW55W10pOiBzdHJpbmcgPT4ge1xuXHRcdGNvbnN0IHsgcHJvcHMsIGNoaWxkcmVuLCBpbm5lckhUTUwgfSA9IHBhcnNlVGFnQXJncyhhcmdzKTtcblxuXHRcdC8vIFN0YXJ0IGJ1aWxkaW5nIHRoZSBIVE1MIHN0cmluZ1xuXHRcdGxldCBodG1sID0gYDwke3RhZ30ke2J1aWxkQXR0cmlidXRlc0h0bWwocHJvcHMpfWA7XG5cblx0XHQvLyBTZWxmLWNsb3NpbmcgdGFnc1xuXHRcdGlmIChWT0lEX0VMRU1FTlRTLmhhcyh0YWcpKSB7XG5cdFx0XHRyZXR1cm4gaHRtbCArIFwiLz5cIjtcblx0XHR9XG5cblx0XHRodG1sICs9IFwiPlwiO1xuXG5cdFx0Ly8gSGFuZGxlIGlubmVySFRNTCAtIGlmIHByZXNlbnQsIGlnbm9yZSBjaGlsZHJlbiBhbmQgdXNlIGlubmVySFRNTCBpbnN0ZWFkXG5cdFx0aWYgKGlubmVySFRNTCAhPT0gdW5kZWZpbmVkKSB7XG5cdFx0XHRjb25zdCBpbm5lcl9odG1sX2NvbnRlbnQgPSB0eXBlb2YgaW5uZXJIVE1MID09PSBcImZ1bmN0aW9uXCIgPyBpbm5lckhUTUwoKSA6IGlubmVySFRNTDtcblx0XHRcdGh0bWwgKz0gU3RyaW5nKGlubmVyX2h0bWxfY29udGVudCk7XG5cdFx0XHRyZXR1cm4gaHRtbCArIGA8LyR7dGFnfT5gO1xuXHRcdH1cblxuXHRcdC8vIFByb2Nlc3MgY2hpbGRyZW5cblx0XHRmb3IgKGNvbnN0IGNoaWxkIG9mIGNoaWxkcmVuLmZsYXQoSW5maW5pdHkpKSB7XG5cdFx0XHRpZiAoY2hpbGQgIT0gbnVsbCkge1xuXHRcdFx0XHRpZiAodHlwZW9mIGNoaWxkID09PSBcImZ1bmN0aW9uXCIpIHtcblx0XHRcdFx0XHQvLyBSZXNvbHZlIGZ1bmN0aW9uIGNoaWxkcmVuXG5cdFx0XHRcdFx0aHRtbCArPSBTdHJpbmcoKGNoaWxkIGFzIEZ1bmN0aW9uKSgpKTtcblx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHQvLyBEb24ndCBlc2NhcGUgSFRNTCBjb250ZW50IC0gdHJlYXQgaXQgYXMgcmF3IEhUTUxcblx0XHRcdFx0XHRodG1sICs9IFN0cmluZyhjaGlsZCk7XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHR9XG5cblx0XHRyZXR1cm4gaHRtbCArIGA8LyR7dGFnfT5gO1xuXHR9O1xufVxuIiwKICAgICJleHBvcnQgZnVuY3Rpb24gZmFkZShjb2xvciwgb3BhY2l0eSkge1xuXHRyZXR1cm4gYGNvbG9yLW1peChpbiBva2xjaCwgdmFyKCR7Y29sb3J9KSwgdHJhbnNwYXJlbnQgJHsxMDAgLSBvcGFjaXR5fSUpYDtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGRvY01haW4oKSB7XG5cdHJldHVybiBkb2N1bWVudC5ib2R5LnF1ZXJ5U2VsZWN0b3IoXCJtYWluXCIpO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gZGVib3VuY2UoZm4sIGRlbGF5KSB7XG5cdGxldCB0aW1lb3V0X2lkID0gbnVsbDtcblx0bGV0IHJlc29sdmVfY2FsbGJhY2sgPSBudWxsO1xuXG5cdC8vIENyZWF0ZSBhIHByb21pc2UgdGhhdCB3ZSdsbCByZXNvbHZlIHdoZW4gdGhlIGRlYm91bmNlZCBmdW5jdGlvbiBhY3R1YWxseSBleGVjdXRlc1xuXHRjb25zdCBkZWJvdW5jZWQgPSAoLi4uYXJncykgPT4ge1xuXHRcdGlmICh0aW1lb3V0X2lkKSB7XG5cdFx0XHRjbGVhclRpbWVvdXQodGltZW91dF9pZCk7XG5cdFx0fVxuXG5cdFx0Ly8gQ3JlYXRlIG5ldyBwcm9taXNlIGZvciB0aGlzIGNhbGxcblx0XHRkZWJvdW5jZWQuY2FsbGJhY2sgPSBuZXcgUHJvbWlzZSgocmVzb2x2ZSkgPT4ge1xuXHRcdFx0cmVzb2x2ZV9jYWxsYmFjayA9IHJlc29sdmU7XG5cdFx0fSk7XG5cblx0XHR0aW1lb3V0X2lkID0gc2V0VGltZW91dCgoKSA9PiB7XG5cdFx0XHRjb25zdCByZXN1bHQgPSBmbi5hcHBseShudWxsLCBhcmdzKTtcblx0XHRcdGlmIChyZXNvbHZlX2NhbGxiYWNrKSB7XG5cdFx0XHRcdHJlc29sdmVfY2FsbGJhY2socmVzdWx0KTtcblx0XHRcdH1cblx0XHRcdHRpbWVvdXRfaWQgPSBudWxsO1xuXHRcdH0sIGRlbGF5KTtcblxuXHRcdHJldHVybiBkZWJvdW5jZWQuY2FsbGJhY2s7XG5cdH07XG5cblx0Ly8gQXR0YWNoIHRoZSBwcm9taXNlIGFzIGEgcHJvcGVydHkgb2YgdGhlIGZ1bmN0aW9uXG5cdGRlYm91bmNlZC5jYWxsYmFjayA9IFByb21pc2UucmVzb2x2ZSgpO1xuXG5cdC8vIEFkZCBjYW5jZWwgbWV0aG9kXG5cdGRlYm91bmNlZC5jYW5jZWwgPSAoKSA9PiB7XG5cdFx0aWYgKHRpbWVvdXRfaWQpIHtcblx0XHRcdGNsZWFyVGltZW91dCh0aW1lb3V0X2lkKTtcblx0XHRcdHRpbWVvdXRfaWQgPSBudWxsO1xuXHRcdH1cblx0fTtcblxuXHRyZXR1cm4gZGVib3VuY2VkO1xufVxuXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gdHJ5Q2F0Y2goZnVuYykge1xuXHR0cnkge1xuXHRcdGNvbnN0IHJlc3VsdCA9IGZ1bmMoKTtcblx0XHQvLyBDaGVjayBpZiB0aGUgcmVzdWx0IGlzIGEgcHJvbWlzZVxuXHRcdGlmIChyZXN1bHQgaW5zdGFuY2VvZiBQcm9taXNlKSB7XG5cdFx0XHRyZXR1cm4gW2F3YWl0IHJlc3VsdCwgbnVsbF07XG5cdFx0fVxuXHRcdHJldHVybiBbcmVzdWx0LCBudWxsXTtcblx0fSBjYXRjaCAoZXJyb3IpIHtcblx0XHRyZXR1cm4gW251bGwsIGVycm9yXTtcblx0fVxufVxuXG5leHBvcnQgZnVuY3Rpb24gaXNTY3JvbGxhYmxlKGVsZW1lbnQpIHtcblx0aWYgKCFlbGVtZW50KSByZXR1cm4gZmFsc2U7XG5cdGNvbnN0IHN0eWxlID0gd2luZG93LmdldENvbXB1dGVkU3R5bGUoZWxlbWVudCk7XG5cdGNvbnN0IG92ZXJmbG93X3kgPSBzdHlsZS5nZXRQcm9wZXJ0eVZhbHVlKFwib3ZlcmZsb3cteVwiKTtcblx0Y29uc3Qgb3ZlcmZsb3dfeCA9IHN0eWxlLmdldFByb3BlcnR5VmFsdWUoXCJvdmVyZmxvdy14XCIpO1xuXHRyZXR1cm4gKFxuXHRcdChvdmVyZmxvd195ID09PSBcInNjcm9sbFwiIHx8IG92ZXJmbG93X3kgPT09IFwiYXV0b1wiIHx8IG92ZXJmbG93X3ggPT09IFwic2Nyb2xsXCIgfHwgb3ZlcmZsb3dfeCA9PT0gXCJhdXRvXCIpICYmXG5cdFx0KGVsZW1lbnQuc2Nyb2xsSGVpZ2h0ID4gZWxlbWVudC5jbGllbnRIZWlnaHQgfHwgZWxlbWVudC5zY3JvbGxXaWR0aCA+IGVsZW1lbnQuY2xpZW50V2lkdGgpXG5cdCk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBHbG9iYWxTdHlsZVNoZWV0KHN0eWxlcykge1xuXHRjb25zdCBzaGVldCA9IGNyZWF0ZVN0eWxlc2hlZXQoXCJnbG9iYWxfc3R5bGVzXCIpO1xuXG5cdC8vIFJlbW92ZSBjb21tZW50cyBhbmQgbm9ybWFsaXplIHdoaXRlc3BhY2Vcblx0Y29uc3QgY2xlYW5lZF9jc3MgPSBzdHlsZXNcblx0XHQucmVwbGFjZSgvXFwvXFwqW1xcc1xcU10qP1xcKlxcLy9nLCBcIlwiKSAvLyBSZW1vdmUgQ1NTIGNvbW1lbnRzXG5cdFx0LnJlcGxhY2UoL1xccysvZywgXCIgXCIpXG5cdFx0LnRyaW0oKTtcblxuXHQvLyBQYXJzZSB0aGUgQ1NTIGludG8gaW5kaXZpZHVhbCBydWxlc1xuXHRsZXQgcnVsZXMgPSBbXTtcblx0bGV0IGN1cnJlbnRfcnVsZSA9IFwiXCI7XG5cdGxldCBicmFjZV9jb3VudCA9IDA7XG5cblx0Zm9yIChsZXQgaSA9IDA7IGkgPCBjbGVhbmVkX2Nzcy5sZW5ndGg7IGkrKykge1xuXHRcdGNvbnN0IGNoYXIgPSBjbGVhbmVkX2Nzc1tpXTtcblx0XHRjdXJyZW50X3J1bGUgKz0gY2hhcjtcblxuXHRcdGlmIChjaGFyID09PSBcIntcIikge1xuXHRcdFx0YnJhY2VfY291bnQrKztcblx0XHR9IGVsc2UgaWYgKGNoYXIgPT09IFwifVwiKSB7XG5cdFx0XHRicmFjZV9jb3VudC0tO1xuXG5cdFx0XHQvLyBJZiB3ZSd2ZSBjbG9zZWQgYSB0b3AtbGV2ZWwgcnVsZVxuXHRcdFx0aWYgKGJyYWNlX2NvdW50ID09PSAwKSB7XG5cdFx0XHRcdHJ1bGVzLnB1c2goY3VycmVudF9ydWxlLnRyaW0oKSk7XG5cdFx0XHRcdGN1cnJlbnRfcnVsZSA9IFwiXCI7XG5cdFx0XHR9XG5cdFx0fVxuXHR9XG5cblx0Ly8gSW5zZXJ0IGVhY2ggcnVsZSBpbnRvIHRoZSBzdHlsZXNoZWV0XG5cdGZvciAoY29uc3QgcnVsZSBvZiBydWxlcykge1xuXHRcdHRyeSB7XG5cdFx0XHRzaGVldC5pbnNlcnRSdWxlKHJ1bGUsIHNoZWV0LmNzc1J1bGVzLmxlbmd0aCk7XG5cdFx0fSBjYXRjaCAoZXJyb3IpIHtcblx0XHRcdGNvbnNvbGUuZXJyb3IoYEZhaWxlZCB0byBpbnNlcnQgQ1NTIHJ1bGU6ICR7cnVsZX1gLCBlcnJvcik7XG5cdFx0fVxuXHR9XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBjcmVhdGVTdHlsZXNoZWV0KGlkKSB7XG5cdGxldCBzaGVldCA9IGRvY3VtZW50LmFkb3B0ZWRTdHlsZVNoZWV0cy5maW5kKChzaGVldCkgPT4gc2hlZXQuaWQgPT09IGlkKTtcblx0aWYgKCFzaGVldCkge1xuXHRcdHNoZWV0ID0gbmV3IENTU1N0eWxlU2hlZXQoKTtcblx0XHRzaGVldC5pZCA9IGlkO1xuXHRcdGRvY3VtZW50LmFkb3B0ZWRTdHlsZVNoZWV0cyA9IFsuLi5kb2N1bWVudC5hZG9wdGVkU3R5bGVTaGVldHMsIHNoZWV0XTtcblx0fVxuXHRyZXR1cm4gc2hlZXQ7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiByZXBlYXQobGVuZ3RoLCB2YWwpIHtcblx0cmV0dXJuIEFycmF5LmZyb20oeyBsZW5ndGggfSwgKCkgPT4gdmFsKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHRocm90dGxlKGZ1bmMsIHdhaXQpIHtcblx0bGV0IHdhaXRpbmcgPSBmYWxzZTtcblx0cmV0dXJuIGZ1bmN0aW9uICguLi5hcmdzKSB7XG5cdFx0aWYgKCF3YWl0aW5nKSB7XG5cdFx0XHRmdW5jKC4uLmFyZ3MpO1xuXHRcdFx0d2FpdGluZyA9IHRydWU7XG5cdFx0XHRzZXRUaW1lb3V0KCgpID0+ICh3YWl0aW5nID0gZmFsc2UpLCB3YWl0KTtcblx0XHR9XG5cdH07XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBmaW5pc2godGltZSA9IDApIHtcblx0cmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlKSA9PiBzZXRUaW1lb3V0KHJlc29sdmUsIHRpbWUpKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGNzcyhzdHJpbmdzLCAuLi52YWx1ZXMpIHtcblx0cmV0dXJuIHN0cmluZ3MucmVkdWNlKChyZXN1bHQsIHN0ciwgaSkgPT4gcmVzdWx0ICsgc3RyICsgKGkgPCB2YWx1ZXMubGVuZ3RoID8gdmFsdWVzW2ldIDogXCJcIiksIFwiXCIpO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gY29udmVydEZyb21XaW5kb3dzUGF0aChwYXRoKSB7XG5cdHJldHVybiBwYXRoLnJlcGxhY2UoL1xcXFwvZywgXCIvXCIpO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gY29udmVydFRvV2luZG93c1BhdGgocGF0aCkge1xuXHRyZXR1cm4gcGF0aC5yZXBsYWNlKC9cXC8vZywgXCJcXFxcXCIpO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gaXNJbWFnZUZpbGUoZXh0KSB7XG5cdGNvbnN0IGV4dHMgPSBbXCJqcGdcIiwgXCJqcGVnXCIsIFwicG5nXCIsIFwiZ2lmXCIsIFwid2VicFwiXTtcblx0cmV0dXJuIGV4dHMuaW5jbHVkZXMoZXh0LnRvTG93ZXJDYXNlKCkpO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gZ2V0SW1hZ2VNZWRpYVR5cGUoZmlsZXBhdGgpIHtcblx0Y29uc3QgZXh0ID0gZmlsZXBhdGgudG9Mb3dlckNhc2UoKTtcblx0aWYgKGV4dC5lbmRzV2l0aChcIi5qcGdcIikgfHwgZXh0LmVuZHNXaXRoKFwiLmpwZWdcIikpIHJldHVybiBcImltYWdlL2pwZWdcIjtcblx0aWYgKGV4dC5lbmRzV2l0aChcIi5wbmdcIikpIHJldHVybiBcImltYWdlL3BuZ1wiO1xuXHRpZiAoZXh0LmVuZHNXaXRoKFwiLmdpZlwiKSkgcmV0dXJuIFwiaW1hZ2UvZ2lmXCI7XG5cdGlmIChleHQuZW5kc1dpdGgoXCIud2VicFwiKSkgcmV0dXJuIFwiaW1hZ2Uvd2VicFwiO1xuXHRyZXR1cm4gbnVsbDtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGlzU291bmRGaWxlKGV4dCkge1xuXHRjb25zdCBleHRzID0gW1wibXAzXCIsIFwid2F2XCIsIFwib2dnXCIsIFwibTRhXCIsIFwiYWFjXCIsIFwiZmxhY1wiLCBcIndtYVwiLCBcImFpZmZcIiwgXCJtaWRcIiwgXCJtaWRpXCJdO1xuXHRyZXR1cm4gZXh0cy5pbmNsdWRlcyhleHQudG9Mb3dlckNhc2UoKSk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBnZXRGaWxlTGFuZ3VhZ2UoZmlsZW5hbWUpIHtcblx0Y29uc3QgZXh0ZW5zaW9uID0gZmlsZW5hbWUuc3BsaXQoXCIuXCIpLnBvcCgpLnRvTG93ZXJDYXNlKCk7XG5cblx0Y29uc3QgbGFuZ3VhZ2VfbWFwID0ge1xuXHRcdC8vIFByb2dyYW1taW5nIExhbmd1YWdlc1xuXHRcdGpzOiBcImphdmFzY3JpcHRcIixcblx0XHR0czogXCJ0eXBlc2NyaXB0XCIsXG5cdFx0anN4OiBcImphdmFzY3JpcHRcIixcblx0XHR0c3g6IFwidHlwZXNjcmlwdFwiLFxuXHRcdHB5OiBcInB5dGhvblwiLFxuXHRcdGNwcDogXCJjcHBcIixcblx0XHRjOiBcImNcIixcblx0XHRoOiBcImNwcFwiLFxuXHRcdGhwcDogXCJjcHBcIixcblx0XHRjczogXCJjc2hhcnBcIixcblx0XHRqYXZhOiBcImphdmFcIixcblx0XHRyYjogXCJydWJ5XCIsXG5cdFx0cGhwOiBcInBocFwiLFxuXHRcdGdvOiBcImdvXCIsXG5cdFx0cnM6IFwicnVzdFwiLFxuXHRcdHN3aWZ0OiBcInN3aWZ0XCIsXG5cblx0XHQvLyBXZWIgVGVjaG5vbG9naWVzXG5cdFx0aHRtbDogXCJodG1sXCIsXG5cdFx0aHRtOiBcImh0bWxcIixcblx0XHRjc3M6IFwiY3NzXCIsXG5cdFx0c2NzczogXCJzY3NzXCIsXG5cdFx0bGVzczogXCJsZXNzXCIsXG5cdFx0anNvbjogXCJqc29uXCIsXG5cdFx0eG1sOiBcInhtbFwiLFxuXHRcdHN2ZzogXCJ4bWxcIixcblxuXHRcdC8vIE1hcmt1cC9Db25maWdcblx0XHRtZDogXCJtYXJrZG93blwiLFxuXHRcdG1hcmtkb3duOiBcIm1hcmtkb3duXCIsXG5cdFx0eWFtbDogXCJ5YW1sXCIsXG5cdFx0eW1sOiBcInlhbWxcIixcblx0XHR0b21sOiBcInRvbWxcIixcblx0XHRpbmk6IFwiaW5pXCIsXG5cblx0XHQvLyBTaGVsbCBTY3JpcHRzXG5cdFx0c2g6IFwic2hlbGxcIixcblx0XHRiYXNoOiBcInNoZWxsXCIsXG5cdFx0enNoOiBcInNoZWxsXCIsXG5cdFx0YmF0OiBcImJhdFwiLFxuXHRcdGNtZDogXCJiYXRcIixcblxuXHRcdC8vIEdhbWUgRGV2ZWxvcG1lbnRcblx0XHRnbHNsOiBcImdsc2xcIixcblx0XHRmcmFnOiBcImdsc2xcIixcblx0XHR2ZXJ0OiBcImdsc2xcIixcblx0XHRzaGFkZXI6IFwiZ2xzbFwiLFxuXG5cdFx0Ly8gRGF0YSBmb3JtYXRzXG5cdFx0Y3N2OiBcInBsYWludGV4dFwiLFxuXHRcdHR4dDogXCJwbGFpbnRleHRcIixcblx0XHRsb2c6IFwicGxhaW50ZXh0XCIsXG5cblx0XHQvLyBDaGF0IGZpbGVzXG5cdFx0Y2hhdDogXCJtYXJrZG93blwiLFxuXHR9O1xuXG5cdHJldHVybiBsYW5ndWFnZV9tYXBbZXh0ZW5zaW9uXSB8fCBcInBsYWludGV4dFwiO1xufVxuIiwKICAgICIvLyBAdHMtZXhwZWN0LWVycm9yXG5jb25zdCBfX3N5cyA9IHdpbmRvdy5fX3N5cztcblxuY29uc3Qgc2hlbGwgPSB7XG5cdGFzeW5jIGV4ZWMoY29tbWFuZDogc3RyaW5nKSB7XG5cdFx0cmV0dXJuIGF3YWl0IF9fc3lzLmludm9rZShcInNoZWxsLmV4ZWNcIiwgY29tbWFuZCk7XG5cdH0sXG59O1xuXG5jb25zdCBwcm9jZXNzID0ge1xuXHRhc3luYyBlbnYoKSB7XG5cdFx0cmV0dXJuIGF3YWl0IF9fc3lzLmludm9rZShcInByb2Nlc3MuZW52XCIpO1xuXHR9LFxuXHRhc3luYyBwbGF0Zm9ybSgpIHtcblx0XHRyZXR1cm4gYXdhaXQgX19zeXMuaW52b2tlKFwicHJvY2Vzcy5wbGF0Zm9ybVwiKTtcblx0fSxcblx0YXN5bmMgaXNXaW4zMigpOiBQcm9taXNlPGJvb2xlYW4+IHtcblx0XHRyZXR1cm4gKGF3YWl0IF9fc3lzLmludm9rZShcInByb2Nlc3MucGxhdGZvcm1cIikpID09PSBcIndpbjMyXCI7XG5cdH0sXG5cdGFzeW5jIGN3ZCgpIHtcblx0XHRyZXR1cm4gYXdhaXQgX19zeXMuaW52b2tlKFwicHJvY2Vzcy5jd2RcIik7XG5cdH0sXG59O1xuXG5jb25zdCBmaWxlID0ge1xuXHRhc3luYyBkaXJuYW1lKGZpbGVwYXRoOiBzdHJpbmcpOiBQcm9taXNlPHN0cmluZz4ge1xuXHRcdHJldHVybiBhd2FpdCBfX3N5cy5pbnZva2UoXCJmaWxlLmRpcm5hbWVcIiwgZmlsZXBhdGgpO1xuXHR9LFxuXHRhc3luYyByZXNvbHZlKGZpbGVwYXRoOiBzdHJpbmcpOiBQcm9taXNlPHN0cmluZz4ge1xuXHRcdHJldHVybiBhd2FpdCBfX3N5cy5pbnZva2UoXCJmaWxlLnJlc29sdmVcIiwgZmlsZXBhdGgpO1xuXHR9LFxuXHRhc3luYyBleGlzdHMoZmlsZXBhdGg6IHN0cmluZyk6IFByb21pc2U8Ym9vbGVhbj4ge1xuXHRcdHJldHVybiBhd2FpdCBfX3N5cy5pbnZva2UoXCJmaWxlLmV4aXN0c1wiLCBmaWxlcGF0aCk7XG5cdH0sXG5cdGFzeW5jIGlzRGlyKGZpbGVwYXRoOiBzdHJpbmcsIGNyZWF0ZV9pZl9ub3RfZXhpc3RzID0gZmFsc2UpOiBQcm9taXNlPGJvb2xlYW4+IHtcblx0XHRyZXR1cm4gYXdhaXQgX19zeXMuaW52b2tlKFwiZmlsZS5pc19kaXJcIiwgZmlsZXBhdGgsIGNyZWF0ZV9pZl9ub3RfZXhpc3RzKTtcblx0fSxcblx0YXN5bmMgcmVsYXRpdmUoYmFzZXBhdGg6IHN0cmluZywgZmlsZXBhdGg6IHN0cmluZyk6IFByb21pc2U8c3RyaW5nPiB7XG5cdFx0cmV0dXJuIGF3YWl0IF9fc3lzLmludm9rZShcImZpbGUucmVsYXRpdmVcIiwgYmFzZXBhdGgsIGZpbGVwYXRoKTtcblx0fSxcblx0YXN5bmMgcGFyc2VQYXRoKGZpbGVwYXRoOiBzdHJpbmcpOiBQcm9taXNlPHtcblx0XHRyb290OiBzdHJpbmc7XG5cdFx0ZGlyOiBzdHJpbmc7XG5cdFx0YmFzZTogc3RyaW5nO1xuXHRcdGV4dDogc3RyaW5nO1xuXHRcdG5hbWU6IHN0cmluZztcblx0fT4ge1xuXHRcdHJldHVybiBhd2FpdCBfX3N5cy5pbnZva2UoXCJmaWxlLnBhcnNlX3BhdGhcIiwgZmlsZXBhdGgpO1xuXHR9LFxuXHRhc3luYyByZW5hbWUob2xkX3BhdGg6IHN0cmluZywgbmV3X25hbWU6IHN0cmluZyk6IFByb21pc2U8dm9pZD4ge1xuXHRcdHJldHVybiBhd2FpdCBfX3N5cy5pbnZva2UoXCJmaWxlLnJlbmFtZVwiLCBvbGRfcGF0aCwgbmV3X25hbWUpO1xuXHR9LFxuXHRhc3luYyByZWFkKGZpbGVwYXRoOiBzdHJpbmcsIG9wdCA9IFwidXRmOFwiKTogUHJvbWlzZTxzdHJpbmc+IHtcblx0XHRyZXR1cm4gYXdhaXQgX19zeXMuaW52b2tlKFwiZmlsZS5yZWFkXCIsIGZpbGVwYXRoLCBvcHQpO1xuXHR9LFxuXHRhc3luYyB3cml0ZShmaWxlcGF0aDogc3RyaW5nLCBjb250ZW50OiBhbnksIG9wdCA9IFwidXRmOFwiKTogUHJvbWlzZTx2b2lkPiB7XG5cdFx0cmV0dXJuIGF3YWl0IF9fc3lzLmludm9rZShcImZpbGUud3JpdGVcIiwgZmlsZXBhdGgsIGNvbnRlbnQsIG9wdCk7XG5cdH0sXG5cdGFzeW5jIGdldEluZm8oZmlsZXBhdGg6IHN0cmluZywgYmFzZXBhdGg/OiBzdHJpbmcpIHtcblx0XHRyZXR1cm4gYXdhaXQgX19zeXMuaW52b2tlKFwiZmlsZS5nZXRfaW5mb1wiLCBmaWxlcGF0aCwgYmFzZXBhdGgpO1xuXHR9LFxuXHRhc3luYyBkaXJlY3RvcnlUcmVlKGRpcnBhdGg6IHN0cmluZykge1xuXHRcdHJldHVybiBhd2FpdCBfX3N5cy5pbnZva2UoXCJmaWxlLmRpcmVjdG9yeV90cmVlXCIsIGRpcnBhdGgpO1xuXHR9LFxuXHRhc3luYyBnZXRDb250ZW50VHlwZShmaWxlcGF0aDogc3RyaW5nKTogUHJvbWlzZTxcInRleHRcIiB8IFwiYmluYXJ5XCIgfCBcInVua25vd25cIj4ge1xuXHRcdHJldHVybiBhd2FpdCBfX3N5cy5pbnZva2UoXCJmaWxlLmdldF9jb250ZW50X3R5cGVcIiwgZmlsZXBhdGgpO1xuXHR9LFxufTtcblxuY29uc3QgZGlhbG9nID0ge1xuXHRhc3luYyBzaG93T3BlbihvcHRzOiBhbnkpIHtcblx0XHRyZXR1cm4gYXdhaXQgX19zeXMuaW52b2tlKFwiZGlhbG9nLnNob3dfb3BlblwiLCBvcHRzKTtcblx0fSxcbn07XG5cbmNvbnN0IG1lbnUgPSB7XG5cdGFzeW5jIHNob3coaWQ6IHN0cmluZywgaXRlbXM6IGFueVtdLCB4OiBudW1iZXIsIHk6IG51bWJlcikge1xuXHRcdHJldHVybiBhd2FpdCBfX3N5cy5pbnZva2UoXCJtZW51LnNob3dcIiwgaWQsIGl0ZW1zLCB4LCB5KTtcblx0fSxcblx0YXN5bmMgb25DbGljayhjYWxsYmFjazogKGV2ZW50OiBhbnksIC4uLmFyZ3M6IGFueVtdKSA9PiB2b2lkKSB7XG5cdFx0cmV0dXJuIGF3YWl0IF9fc3lzLm9uKFwibWVudS5vbl9jbGlja1wiLCBjYWxsYmFjayk7XG5cdH0sXG59O1xuXG5jb25zdCB3aW4gPSB7XG5cdGFzeW5jIGNsb3NlKCkge1xuXHRcdHJldHVybiBhd2FpdCBfX3N5cy5pbnZva2UoXCJ3aW4uY2xvc2VcIik7XG5cdH0sXG5cdGFzeW5jIG1pbmltaXplKCkge1xuXHRcdHJldHVybiBhd2FpdCBfX3N5cy5pbnZva2UoXCJ3aW4ubWluaW1pemVcIik7XG5cdH0sXG5cdGFzeW5jIG1heGltaXplKCkge1xuXHRcdHJldHVybiBhd2FpdCBfX3N5cy5pbnZva2UoXCJ3aW4ubWF4aW1pemVcIik7XG5cdH0sXG5cdGFzeW5jIHVubWF4aW1pemUoKSB7XG5cdFx0cmV0dXJuIGF3YWl0IF9fc3lzLmludm9rZShcIndpbi51bm1heGltaXplXCIpO1xuXHR9LFxuXHRhc3luYyBpc01heGltaXplZCgpOiBQcm9taXNlPGJvb2xlYW4+IHtcblx0XHRyZXR1cm4gYXdhaXQgX19zeXMuaW52b2tlKFwid2luLmlzX21heGltaXplZFwiKTtcblx0fSxcblx0YXN5bmMgb25NYXhpbWl6ZShjYWxsYmFjazogKGV2ZW50OiBhbnksIC4uLmFyZ3M6IGFueVtdKSA9PiB2b2lkKSB7XG5cdFx0cmV0dXJuIGF3YWl0IF9fc3lzLm9uKFwid2luLm9uX21heGltaXplXCIsIGNhbGxiYWNrKTtcblx0fSxcblx0YXN5bmMgb25Vbm1heGltaXplKGNhbGxiYWNrOiAoZXZlbnQ6IGFueSwgLi4uYXJnczogYW55W10pID0+IHZvaWQpIHtcblx0XHRyZXR1cm4gYXdhaXQgX19zeXMub24oXCJ3aW4ub25fdW5tYXhpbWl6ZVwiLCBjYWxsYmFjayk7XG5cdH0sXG5cdGFzeW5jIG9uTWluaW1pemUoY2FsbGJhY2s6IChldmVudDogYW55LCAuLi5hcmdzOiBhbnlbXSkgPT4gdm9pZCkge1xuXHRcdHJldHVybiBhd2FpdCBfX3N5cy5vbihcIndpbi5vbl9taW5pbWl6ZVwiLCBjYWxsYmFjayk7XG5cdH0sXG5cdGFzeW5jIG9wZW5JbkJyb3dzZXIodXJsOiBzdHJpbmcpIHtcblx0XHRyZXR1cm4gYXdhaXQgX19zeXMuaW52b2tlKFwid2luLm9wZW5faW5fYnJvd3NlclwiLCB1cmwpO1xuXHR9LFxuXHRhc3luYyBkZXZ0b29sc09wZW5lZChjYWxsYmFjazogKGV2ZW50OiBhbnksIC4uLmFyZ3M6IGFueVtdKSA9PiB2b2lkKSB7XG5cdFx0cmV0dXJuIGF3YWl0IF9fc3lzLm9uKFwid2luLmRldnRvb2xzX29wZW5lZFwiLCBjYWxsYmFjayk7XG5cdH0sXG5cdGFzeW5jIGRldnRvb2xzQ2xvc2VkKGNhbGxiYWNrOiAoZXZlbnQ6IGFueSwgLi4uYXJnczogYW55W10pID0+IHZvaWQpIHtcblx0XHRyZXR1cm4gYXdhaXQgX19zeXMub24oXCJ3aW4uZGV2dG9vbHNfY2xvc2VkXCIsIGNhbGxiYWNrKTtcblx0fSxcblx0YXN5bmMgaXNEZXZ0b29sc09wZW4oKTogUHJvbWlzZTxib29sZWFuPiB7XG5cdFx0cmV0dXJuIGF3YWl0IF9fc3lzLmludm9rZShcIndpbi5pc19kZXZ0b29sc19vcGVuXCIpO1xuXHR9LFxuXHRhc3luYyBnZXRCb3VuZHMoKSB7XG5cdFx0cmV0dXJuIGF3YWl0IF9fc3lzLmludm9rZShcIndpbi5nZXRfYm91bmRzXCIpO1xuXHR9LFxuXHRhc3luYyBmb2N1cygpIHtcblx0XHRyZXR1cm4gYXdhaXQgX19zeXMuaW52b2tlKFwid2luLmZvY3VzXCIpO1xuXHR9LFxuXHRhc3luYyBvcGVuU3BhY2Uoc3BhY2U6IHN0cmluZykge1xuXHRcdHJldHVybiBhd2FpdCBfX3N5cy5pbnZva2UoXCJ3aW4ub3Blbl9zcGFjZVwiLCBzcGFjZSk7XG5cdH0sXG59O1xuXG5jb25zdCBhcHBzdHJlYW0gPSB7XG5cdGFzeW5jIHNlbGVjdChvcHRzOiBhbnkpIHtcblx0XHRyZXR1cm4gYXdhaXQgX19zeXMuaW52b2tlKFwiYXBwc3RyZWFtLnNlbGVjdFwiLCBvcHRzKTtcblx0fSxcblx0YXN5bmMgZ2V0Q2FwdHVyZWRXaW5kb3dzKCkge1xuXHRcdHJldHVybiBhd2FpdCBfX3N5cy5pbnZva2UoXCJhcHBzdHJlYW0uZ2V0X2NhcHR1cmVkX3dpbmRvd3NcIik7XG5cdH0sXG5cdGFzeW5jIGdldFdpbmRvd0NhcHR1cmUoaWQ6IHN0cmluZykge1xuXHRcdHJldHVybiBhd2FpdCBfX3N5cy5pbnZva2UoXCJhcHBzdHJlYW0uZ2V0X3dpbmRvd19jYXB0dXJlXCIsIGlkKTtcblx0fSxcblx0YXN5bmMgd2luZG93Q2FwdHVyZVVwZGF0ZWQoY2FsbGJhY2s6IChpZDogc3RyaW5nKSA9PiB2b2lkKSB7XG5cdFx0X19zeXMub24oXCJhcHBzdHJlYW0ud2luZG93X2NhcHR1cmVfdXBkYXRlZFwiLCAoZTogYW55LCBpZDogc3RyaW5nKSA9PiB7XG5cdFx0XHRjYWxsYmFjayhpZCk7XG5cdFx0fSk7XG5cdH0sXG5cdGFzeW5jIGZvY3VzV2luZG93KHdpbmRvd19pZDogc3RyaW5nKSB7XG5cdFx0cmV0dXJuIGF3YWl0IF9fc3lzLmludm9rZShcImFwcHN0cmVhbS5mb2N1c193aW5kb3dcIiwgd2luZG93X2lkKTtcblx0fSxcblx0YXN5bmMgY2xvc2VXaW5kb3cod2luZG93X2lkOiBzdHJpbmcpIHtcblx0XHRyZXR1cm4gYXdhaXQgX19zeXMuaW52b2tlKFwiYXBwc3RyZWFtLmNsb3NlX3dpbmRvd1wiLCB3aW5kb3dfaWQpO1xuXHR9LFxuXHRhc3luYyBvbldpbmRvd0Nsb3NlZChjYWxsYmFjazogKGlkOiBzdHJpbmcpID0+IHZvaWQpIHtcblx0XHRyZXR1cm4gYXdhaXQgX19zeXMub24oXCJhcHBzdHJlYW0ud2luZG93X2Nsb3NlZFwiLCAoZTogYW55LCBpZDogc3RyaW5nKSA9PiB7XG5cdFx0XHRjYWxsYmFjayhpZCk7XG5cdFx0fSk7XG5cdH0sXG5cdGFzeW5jIHJlc2l6ZVdpbmRvdyh3aW5kb3dfaWQ6IHN0cmluZywgZGltZW5zaW9uczogYW55KSB7XG5cdFx0cmV0dXJuIGF3YWl0IF9fc3lzLmludm9rZShcImFwcHN0cmVhbS5yZXNpemVfd2luZG93XCIsIHdpbmRvd19pZCwgZGltZW5zaW9ucyk7XG5cdH0sXG5cdGFzeW5jIHNldFdpbmRvd1Bvc2l0aW9uKHdpbmRvd19pZDogc3RyaW5nLCB4OiBudW1iZXIsIHk6IG51bWJlcikge1xuXHRcdHJldHVybiBhd2FpdCBfX3N5cy5pbnZva2UoXCJhcHBzdHJlYW0uc2V0X3dpbmRvd19wb3NpdGlvblwiLCB3aW5kb3dfaWQsIHgsIHkpO1xuXHR9LFxufTtcblxuY29uc3QgYnJvd3NlciA9IHtcblx0YXN5bmMgbmV3V2luZG93KHVybDogc3RyaW5nKSB7XG5cdFx0cmV0dXJuIGF3YWl0IF9fc3lzLmludm9rZShcImJyb3dzZXIubmV3X3dpbmRvd1wiLCB1cmwpO1xuXHR9LFxuXHRhc3luYyBjYXB0dXJlUGFnZSh3ZWJjb250ZW50c19pZDogc3RyaW5nKSB7XG5cdFx0cmV0dXJuIGF3YWl0IF9fc3lzLmludm9rZShcImJyb3dzZXIuY2FwdHVyZV9wYWdlXCIsIHdlYmNvbnRlbnRzX2lkKTtcblx0fSxcblx0YXN5bmMgb3BlbldlYnZpZXdEZXZ0b29scyh0YXJnZXRfd2Vidmlld193Y2lkOiBzdHJpbmcsIGRldnRvb2xzX3dlYnZpZXdfd2NpZDogc3RyaW5nKSB7XG5cdFx0cmV0dXJuIGF3YWl0IF9fc3lzLmludm9rZShcImJyb3dzZXIub3Blbl93ZWJ2aWV3X2RldnRvb2xzXCIsIHRhcmdldF93ZWJ2aWV3X3djaWQsIGRldnRvb2xzX3dlYnZpZXdfd2NpZCk7XG5cdH0sXG59O1xuXG5jb25zdCBvdmVybGF5ID0ge1xuXHRhc3luYyBmb2N1cygpIHtcblx0XHRyZXR1cm4gYXdhaXQgX19zeXMuaW52b2tlKFwib3ZlcmxheS5mb2N1c1wiKTtcblx0fSxcblx0YXN5bmMgc2V0SGVpZ2h0KGhlaWdodDogbnVtYmVyKSB7XG5cdFx0cmV0dXJuIGF3YWl0IF9fc3lzLmludm9rZShcIm92ZXJsYXkuc2V0X2hlaWdodFwiLCBoZWlnaHQpO1xuXHR9LFxuXHRhc3luYyBvcGVuRGV2VG9vbHMoKSB7XG5cdFx0cmV0dXJuIGF3YWl0IF9fc3lzLmludm9rZShcIm92ZXJsYXkub3Blbl9kZXZ0b29sc1wiKTtcblx0fSxcbn07XG5cbmNvbnN0IHNob3J0Y3V0cyA9IHtcblx0YXN5bmMgcmVnaXN0ZXIob3B0aW9uczogeyBhY2NlbGVyYXRvcjogc3RyaW5nOyBuYW1lOiBzdHJpbmc7IGRlc2NyaXB0aW9uOiBzdHJpbmc7IGNhbGxiYWNrOiAoKSA9PiB2b2lkIH0pIHtcblx0XHRjb25zdCB7IGFjY2VsZXJhdG9yLCBuYW1lLCBkZXNjcmlwdGlvbiwgY2FsbGJhY2sgfSA9IG9wdGlvbnM7XG5cblx0XHRfX3N5cy5vbihcInNob3J0Y3V0cy50cmlnZ2VyZWRcIiwgKGV2ZW50OiBhbnksIHRyaWdnZXJlZF9uYW1lOiBzdHJpbmcpID0+IHtcblx0XHRcdGlmICh0cmlnZ2VyZWRfbmFtZSA9PT0gbmFtZSAmJiB0eXBlb2YgY2FsbGJhY2sgPT09IFwiZnVuY3Rpb25cIikge1xuXHRcdFx0XHRjYWxsYmFjaygpO1xuXHRcdFx0fVxuXHRcdH0pO1xuXG5cdFx0cmV0dXJuIGF3YWl0IF9fc3lzLmludm9rZShcInNob3J0Y3V0cy5yZWdpc3RlclwiLCB7XG5cdFx0XHRhY2NlbGVyYXRvcixcblx0XHRcdG5hbWUsXG5cdFx0XHRkZXNjcmlwdGlvbixcblx0XHR9KTtcblx0fSxcblxuXHRhc3luYyB1bnJlZ2lzdGVyKG5hbWU6IHN0cmluZykge1xuXHRcdHJldHVybiBhd2FpdCBfX3N5cy5pbnZva2UoXCJzaG9ydGN1dHMudW5yZWdpc3RlclwiLCBuYW1lKTtcblx0fSxcblxuXHRhc3luYyBnZXRBbGwoKSB7XG5cdFx0cmV0dXJuIGF3YWl0IF9fc3lzLmludm9rZShcInNob3J0Y3V0cy5nZXRfYWxsXCIpO1xuXHR9LFxuXG5cdGFzeW5jIG9uVHJpZ2dlcihjYWxsYmFjazogKG5hbWU6IHN0cmluZykgPT4gdm9pZCkge1xuXHRcdHJldHVybiBhd2FpdCBfX3N5cy5vbihcInNob3J0Y3V0cy50cmlnZ2VyZWRcIiwgKGV2ZW50OiBhbnksIG5hbWU6IHN0cmluZykgPT4ge1xuXHRcdFx0Y2FsbGJhY2sobmFtZSk7XG5cdFx0fSk7XG5cdH0sXG59O1xuXG5jb25zdCBzeXMgPSB7XG5cdHNoZWxsLFxuXHRwcm9jZXNzLFxuXHRmaWxlLFxuXHRkaWFsb2csXG5cdG1lbnUsXG5cdHdpbixcblx0YXBwc3RyZWFtLFxuXHRicm93c2VyLFxuXHRzaG9ydGN1dHMsXG5cdG92ZXJsYXksXG59O1xuXG5leHBvcnQgZGVmYXVsdCBzeXM7XG4iLAogICAgImNvbnN0IE1BWF9USUxFID0gNTAwO1xuLy8gY29uc3QgSU1BR0VfU1JDID0gXCJodHRwczovL2QydzlybmZjeTdtbTc4LmNsb3VkZnJvbnQubmV0LzM2NzUzMzM4L29yaWdpbmFsX2I4YmQ4ZDg1Y2JiZDkyZTBlMjliMGZmNDRlYTE0YjcwLnBuZz8xNzQ3NDE0MzI5P2JjPTBcIjtcbmNvbnN0IElNQUdFX1NSQyA9XG5cdFwiaHR0cHM6Ly9kMnc5cm5mY3k3bW03OC5jbG91ZGZyb250Lm5ldC8zNzQzNDUzMC9vcmlnaW5hbF9mMGMxNmI0YzRhZjE3MTc1ZWRkMmM3NmFhODAwNTcyOC5qcGc/MTc0OTkyNzk1Mz9iYz0wXCI7XG5cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBpbml0aWFsaXplQmFja2dyb3VuZENhbnZhcyhkZXNrdG9wLCBjYW52YXMpIHtcblx0Y2FudmFzLndpZHRoID0gZGVza3RvcC5vZmZzZXRXaWR0aDtcblx0Y2FudmFzLmhlaWdodCA9IGRlc2t0b3Aub2Zmc2V0SGVpZ2h0O1xuXG5cdC8vIEluaXRpYWxpemUgV2ViR0xcblx0Y29uc3QgZ2wgPSBjYW52YXMuZ2V0Q29udGV4dChcIndlYmdsXCIsIHsgYW50aWFsaWFzOiB0cnVlIH0pO1xuXHRpZiAoIWdsKSB7XG5cdFx0Y29uc29sZS5lcnJvcihcIldlYkdMIG5vdCBzdXBwb3J0ZWRcIik7XG5cdFx0cmV0dXJuIG51bGw7XG5cdH1cblxuXHQvLyBDcmVhdGUgc2hhZGVyIHByb2dyYW1cblx0Y29uc3QgdmVydGV4X3NoYWRlcl9zb3VyY2UgPSBgXG4gICAgICAgIGF0dHJpYnV0ZSB2ZWMyIGFfcG9zaXRpb247XG4gICAgICAgIGF0dHJpYnV0ZSB2ZWMyIGFfdGV4Y29vcmQ7XG5cbiAgICAgICAgdmFyeWluZyB2ZWMyIHZfdGV4Y29vcmQ7XG5cbiAgICAgICAgdm9pZCBtYWluKCkge1xuICAgICAgICAgICAgLy8gQ29udmVydCBwb3NpdGlvbiBkaXJlY3RseSB0byBjbGlwIHNwYWNlICgtMSB0byArMSlcbiAgICAgICAgICAgIGdsX1Bvc2l0aW9uID0gdmVjNChhX3Bvc2l0aW9uLCAwLCAxKTtcbiAgICAgICAgICAgIHZfdGV4Y29vcmQgPSBhX3RleGNvb3JkO1xuICAgICAgICB9XG4gICAgYDtcblxuXHRjb25zdCBmcmFnbWVudF9zaGFkZXJfc291cmNlID0gYFxuICAgICAgICBwcmVjaXNpb24gbWVkaXVtcCBmbG9hdDtcblxuICAgICAgICB1bmlmb3JtIHNhbXBsZXIyRCB1X2ltYWdlO1xuICAgICAgICB2YXJ5aW5nIHZlYzIgdl90ZXhjb29yZDtcblxuICAgICAgICB2b2lkIG1haW4oKSB7XG4gICAgICAgICAgICBnbF9GcmFnQ29sb3IgPSB0ZXh0dXJlMkQodV9pbWFnZSwgdl90ZXhjb29yZCk7XG4gICAgICAgIH1cbiAgICBgO1xuXG5cdC8vIENyZWF0ZSBzaGFkZXJzXG5cdGZ1bmN0aW9uIGNyZWF0ZV9zaGFkZXIoZ2wsIHR5cGUsIHNvdXJjZSkge1xuXHRcdGNvbnN0IHNoYWRlciA9IGdsLmNyZWF0ZVNoYWRlcih0eXBlKTtcblx0XHRnbC5zaGFkZXJTb3VyY2Uoc2hhZGVyLCBzb3VyY2UpO1xuXHRcdGdsLmNvbXBpbGVTaGFkZXIoc2hhZGVyKTtcblxuXHRcdGlmICghZ2wuZ2V0U2hhZGVyUGFyYW1ldGVyKHNoYWRlciwgZ2wuQ09NUElMRV9TVEFUVVMpKSB7XG5cdFx0XHRjb25zb2xlLmVycm9yKFwiU2hhZGVyIGNvbXBpbGUgZXJyb3I6XCIsIGdsLmdldFNoYWRlckluZm9Mb2coc2hhZGVyKSk7XG5cdFx0XHRnbC5kZWxldGVTaGFkZXIoc2hhZGVyKTtcblx0XHRcdHJldHVybiBudWxsO1xuXHRcdH1cblxuXHRcdHJldHVybiBzaGFkZXI7XG5cdH1cblxuXHRjb25zdCB2ZXJ0ZXhfc2hhZGVyID0gY3JlYXRlX3NoYWRlcihnbCwgZ2wuVkVSVEVYX1NIQURFUiwgdmVydGV4X3NoYWRlcl9zb3VyY2UpO1xuXHRjb25zdCBmcmFnbWVudF9zaGFkZXIgPSBjcmVhdGVfc2hhZGVyKGdsLCBnbC5GUkFHTUVOVF9TSEFERVIsIGZyYWdtZW50X3NoYWRlcl9zb3VyY2UpO1xuXG5cdC8vIENyZWF0ZSBwcm9ncmFtXG5cdGNvbnN0IHByb2dyYW0gPSBnbC5jcmVhdGVQcm9ncmFtKCk7XG5cdGdsLmF0dGFjaFNoYWRlcihwcm9ncmFtLCB2ZXJ0ZXhfc2hhZGVyKTtcblx0Z2wuYXR0YWNoU2hhZGVyKHByb2dyYW0sIGZyYWdtZW50X3NoYWRlcik7XG5cdGdsLmxpbmtQcm9ncmFtKHByb2dyYW0pO1xuXG5cdGlmICghZ2wuZ2V0UHJvZ3JhbVBhcmFtZXRlcihwcm9ncmFtLCBnbC5MSU5LX1NUQVRVUykpIHtcblx0XHRjb25zb2xlLmVycm9yKFwiUHJvZ3JhbSBsaW5raW5nIGVycm9yOlwiLCBnbC5nZXRQcm9ncmFtSW5mb0xvZyhwcm9ncmFtKSk7XG5cdFx0cmV0dXJuIG51bGw7XG5cdH1cblxuXHQvLyBMb29rIHVwIGxvY2F0aW9uc1xuXHRjb25zdCBwb3NpdGlvbl9sb2NhdGlvbiA9IGdsLmdldEF0dHJpYkxvY2F0aW9uKHByb2dyYW0sIFwiYV9wb3NpdGlvblwiKTtcblx0Y29uc3QgdGV4Y29vcmRfbG9jYXRpb24gPSBnbC5nZXRBdHRyaWJMb2NhdGlvbihwcm9ncmFtLCBcImFfdGV4Y29vcmRcIik7XG5cblx0Ly8gQ3JlYXRlIGJ1ZmZlcnNcblx0Y29uc3QgcG9zaXRpb25fYnVmZmVyID0gZ2wuY3JlYXRlQnVmZmVyKCk7XG5cdGNvbnN0IHRleGNvb3JkX2J1ZmZlciA9IGdsLmNyZWF0ZUJ1ZmZlcigpO1xuXG5cdC8vIFNldCB1cCB0ZXh0dXJlXG5cdGNvbnN0IHRleHR1cmUgPSBnbC5jcmVhdGVUZXh0dXJlKCk7XG5cdGdsLmJpbmRUZXh0dXJlKGdsLlRFWFRVUkVfMkQsIHRleHR1cmUpO1xuXG5cdC8vIFNldCBwYXJhbWV0ZXJzIGZvciB0aGUgdGV4dHVyZVxuXHRnbC50ZXhQYXJhbWV0ZXJpKGdsLlRFWFRVUkVfMkQsIGdsLlRFWFRVUkVfV1JBUF9TLCBnbC5DTEFNUF9UT19FREdFKTtcblx0Z2wudGV4UGFyYW1ldGVyaShnbC5URVhUVVJFXzJELCBnbC5URVhUVVJFX1dSQVBfVCwgZ2wuQ0xBTVBfVE9fRURHRSk7XG5cdGdsLnRleFBhcmFtZXRlcmkoZ2wuVEVYVFVSRV8yRCwgZ2wuVEVYVFVSRV9NSU5fRklMVEVSLCBnbC5MSU5FQVIpO1xuXHRnbC50ZXhQYXJhbWV0ZXJpKGdsLlRFWFRVUkVfMkQsIGdsLlRFWFRVUkVfTUFHX0ZJTFRFUiwgZ2wuTElORUFSKTtcblxuXHQvLyBMb2FkIHdhbGxwYXBlciBpbWFnZVxuXHRjb25zdCB3YWxscGFwZXIgPSBuZXcgSW1hZ2UoKTtcblx0d2FsbHBhcGVyLnNyYyA9IElNQUdFX1NSQztcblx0d2FsbHBhcGVyLmNyb3NzT3JpZ2luID0gXCJhbm9ueW1vdXNcIjsgLy8gUmVxdWlyZWQgZm9yIFdlYkdMIHRleHR1cmVzIGZyb20gZXh0ZXJuYWwgc291cmNlc1xuXG5cdC8vIFdhaXQgZm9yIHRoZSBpbWFnZSB0byBsb2FkXG5cdGF3YWl0IG5ldyBQcm9taXNlKChyZXNvbHZlKSA9PiB7XG5cdFx0aWYgKHdhbGxwYXBlci5jb21wbGV0ZSkge1xuXHRcdFx0cmVzb2x2ZSgpO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHR3YWxscGFwZXIub25sb2FkID0gcmVzb2x2ZTtcblx0XHR9XG5cdH0pO1xuXG5cdC8vIFVwbG9hZCB0aGUgaW1hZ2UgaW50byB0aGUgdGV4dHVyZVxuXHRnbC5iaW5kVGV4dHVyZShnbC5URVhUVVJFXzJELCB0ZXh0dXJlKTtcblx0Z2wudGV4SW1hZ2UyRChnbC5URVhUVVJFXzJELCAwLCBnbC5SR0JBLCBnbC5SR0JBLCBnbC5VTlNJR05FRF9CWVRFLCB3YWxscGFwZXIpO1xuXG5cdGZ1bmN0aW9uIGRyYXdXYWxscGFwZXIoY2FtZXJhX3gsIGNhbWVyYV95LCBjdXJyZW50X3NjYWxlKSB7XG5cdFx0aWYgKCFnbCB8fCAhd2FsbHBhcGVyLmNvbXBsZXRlKSByZXR1cm47XG5cblx0XHQvLyBTZXQgY2FudmFzIHNpemUgdG8gbWF0Y2ggZGlzcGxheSBzaXplXG5cdFx0aWYgKGNhbnZhcy53aWR0aCAhPT0gZGVza3RvcC5vZmZzZXRXaWR0aCB8fCBjYW52YXMuaGVpZ2h0ICE9PSBkZXNrdG9wLm9mZnNldEhlaWdodCkge1xuXHRcdFx0Y2FudmFzLndpZHRoID0gZGVza3RvcC5vZmZzZXRXaWR0aDtcblx0XHRcdGNhbnZhcy5oZWlnaHQgPSBkZXNrdG9wLm9mZnNldEhlaWdodDtcblx0XHRcdGdsLnZpZXdwb3J0KDAsIDAsIGNhbnZhcy53aWR0aCwgY2FudmFzLmhlaWdodCk7XG5cdFx0fVxuXG5cdFx0Ly8gQ2FsY3VsYXRlIHRpbGUgc2l6ZSBiYXNlZCBvbiBjdXJyZW50IHNjYWxlXG5cdFx0Y29uc3QgdGlsZV93aWR0aCA9IHdhbGxwYXBlci53aWR0aCAqIGN1cnJlbnRfc2NhbGU7XG5cdFx0Y29uc3QgdGlsZV9oZWlnaHQgPSB3YWxscGFwZXIuaGVpZ2h0ICogY3VycmVudF9zY2FsZTtcblxuXHRcdC8vIENhbGN1bGF0ZSBvZmZzZXQgYmFzZWQgb24gc2Nyb2xsIHBvc2l0aW9uXG5cdFx0bGV0IG9mZnNldF94ID0gLShjYW1lcmFfeCAlIHRpbGVfd2lkdGgpO1xuXHRcdGxldCBvZmZzZXRfeSA9IC0oY2FtZXJhX3kgJSB0aWxlX2hlaWdodCk7XG5cblx0XHQvLyBDbGVhciB0aGUgY2FudmFzXG5cdFx0Z2wuY2xlYXJDb2xvcigwLCAwLCAwLCAwKTtcblx0XHRnbC5jbGVhcihnbC5DT0xPUl9CVUZGRVJfQklUKTtcblxuXHRcdC8vIFVzZSBvdXIgcHJvZ3JhbVxuXHRcdGdsLnVzZVByb2dyYW0ocHJvZ3JhbSk7XG5cblx0XHQvLyBFbmFibGUgdGV4dHVyZVxuXHRcdGdsLmJpbmRUZXh0dXJlKGdsLlRFWFRVUkVfMkQsIHRleHR1cmUpO1xuXG5cdFx0Ly8gU2V0IHVwIHRleHR1cmUgY29vcmRpbmF0ZXMgYnVmZmVyIChzYW1lIGZvciBhbGwgdGlsZXMpXG5cdFx0Z2wuYmluZEJ1ZmZlcihnbC5BUlJBWV9CVUZGRVIsIHRleGNvb3JkX2J1ZmZlcik7XG5cdFx0Z2wuYnVmZmVyRGF0YShcblx0XHRcdGdsLkFSUkFZX0JVRkZFUixcblx0XHRcdG5ldyBGbG9hdDMyQXJyYXkoWzAuMCwgMC4wLCAxLjAsIDAuMCwgMC4wLCAxLjAsIDAuMCwgMS4wLCAxLjAsIDAuMCwgMS4wLCAxLjBdKSxcblx0XHRcdGdsLlNUQVRJQ19EUkFXLFxuXHRcdCk7XG5cdFx0Z2wuZW5hYmxlVmVydGV4QXR0cmliQXJyYXkodGV4Y29vcmRfbG9jYXRpb24pO1xuXHRcdGdsLnZlcnRleEF0dHJpYlBvaW50ZXIodGV4Y29vcmRfbG9jYXRpb24sIDIsIGdsLkZMT0FULCBmYWxzZSwgMCwgMCk7XG5cblx0XHQvLyBEcmF3IHRpbGVzIHRvIGNvdmVyIHRoZSBlbnRpcmUgdmlld3BvcnRcblx0XHRmb3IgKGxldCB4ID0gb2Zmc2V0X3g7IHggPCBjYW52YXMud2lkdGg7IHggKz0gdGlsZV93aWR0aCkge1xuXHRcdFx0Zm9yIChsZXQgeSA9IG9mZnNldF95OyB5IDwgY2FudmFzLmhlaWdodDsgeSArPSB0aWxlX2hlaWdodCkge1xuXHRcdFx0XHQvLyBDb252ZXJ0IHBpeGVsIGNvb3JkaW5hdGVzIHRvIGNsaXAgc3BhY2UgKC0xIHRvIDEpXG5cdFx0XHRcdGNvbnN0IGxlZnQgPSAoeCAvIGNhbnZhcy53aWR0aCkgKiAyIC0gMTtcblx0XHRcdFx0Y29uc3QgcmlnaHQgPSAoKHggKyB0aWxlX3dpZHRoKSAvIGNhbnZhcy53aWR0aCkgKiAyIC0gMTtcblx0XHRcdFx0Y29uc3QgdG9wID0gMSAtICh5IC8gY2FudmFzLmhlaWdodCkgKiAyOyAvLyBDb3JyZWN0IFkgb3JpZW50YXRpb25cblx0XHRcdFx0Y29uc3QgYm90dG9tID0gMSAtICgoeSArIHRpbGVfaGVpZ2h0KSAvIGNhbnZhcy5oZWlnaHQpICogMjtcblxuXHRcdFx0XHQvLyBTZXQgdXAgcG9zaXRpb24gYnVmZmVyIGluIGNsaXAgc3BhY2Vcblx0XHRcdFx0Z2wuYmluZEJ1ZmZlcihnbC5BUlJBWV9CVUZGRVIsIHBvc2l0aW9uX2J1ZmZlcik7XG5cdFx0XHRcdGdsLmJ1ZmZlckRhdGEoXG5cdFx0XHRcdFx0Z2wuQVJSQVlfQlVGRkVSLFxuXHRcdFx0XHRcdG5ldyBGbG9hdDMyQXJyYXkoW1xuXHRcdFx0XHRcdFx0bGVmdCxcblx0XHRcdFx0XHRcdHRvcCwgLy8gdG9wIGxlZnRcblx0XHRcdFx0XHRcdHJpZ2h0LFxuXHRcdFx0XHRcdFx0dG9wLCAvLyB0b3AgcmlnaHRcblx0XHRcdFx0XHRcdGxlZnQsXG5cdFx0XHRcdFx0XHRib3R0b20sIC8vIGJvdHRvbSBsZWZ0XG5cdFx0XHRcdFx0XHRsZWZ0LFxuXHRcdFx0XHRcdFx0Ym90dG9tLCAvLyBib3R0b20gbGVmdFxuXHRcdFx0XHRcdFx0cmlnaHQsXG5cdFx0XHRcdFx0XHR0b3AsIC8vIHRvcCByaWdodFxuXHRcdFx0XHRcdFx0cmlnaHQsXG5cdFx0XHRcdFx0XHRib3R0b20sIC8vIGJvdHRvbSByaWdodFxuXHRcdFx0XHRcdF0pLFxuXHRcdFx0XHRcdGdsLlNUQVRJQ19EUkFXLFxuXHRcdFx0XHQpO1xuXHRcdFx0XHRnbC5lbmFibGVWZXJ0ZXhBdHRyaWJBcnJheShwb3NpdGlvbl9sb2NhdGlvbik7XG5cdFx0XHRcdGdsLnZlcnRleEF0dHJpYlBvaW50ZXIocG9zaXRpb25fbG9jYXRpb24sIDIsIGdsLkZMT0FULCBmYWxzZSwgMCwgMCk7XG5cblx0XHRcdFx0Ly8gRHJhd1xuXHRcdFx0XHRnbC5kcmF3QXJyYXlzKGdsLlRSSUFOR0xFUywgMCwgNik7XG5cdFx0XHR9XG5cdFx0fVxuXHR9XG5cblx0ZnVuY3Rpb24gcmVzaXplQ2FudmFzKCkge1xuXHRcdC8vIFJlc2l6ZSB0aGUgY2FudmFzIHRvIG1hdGNoIHRoZSBkZXNrdG9wIGRpbWVuc2lvbnNcblx0XHRjYW52YXMud2lkdGggPSBkZXNrdG9wLm9mZnNldFdpZHRoO1xuXHRcdGNhbnZhcy5oZWlnaHQgPSBkZXNrdG9wLm9mZnNldEhlaWdodDtcblxuXHRcdC8vIFVwZGF0ZSB0aGUgV2ViR0wgdmlld3BvcnRcblx0XHRpZiAoZ2wpIHtcblx0XHRcdGdsLnZpZXdwb3J0KDAsIDAsIGNhbnZhcy53aWR0aCwgY2FudmFzLmhlaWdodCk7XG5cdFx0fVxuXHR9XG5cblx0cmV0dXJuIHtcblx0XHRyZXNpemVDYW52YXMsXG5cdFx0ZHJhd1dhbGxwYXBlcixcblx0fTtcbn1cbiIsCiAgICAiaW1wb3J0IHsgY3NzLCBmaW5pc2gsIEdsb2JhbFN0eWxlU2hlZXQsIGlzU2Nyb2xsYWJsZSB9IGZyb20gXCIuLi8uLi9saWIvdXRpbHMuanNcIjtcbmltcG9ydCB7IHVzZVRhZ3MgfSBmcm9tIFwiLi4vLi4vbGliL2ltYS5qc1wiO1xuaW1wb3J0IHsgaW5pdGlhbGl6ZUJhY2tncm91bmRDYW52YXMgfSBmcm9tIFwiLi9iYWNrZ3JvdW5kLmpzXCI7XG5cbmNvbnN0IHsgZGl2LCBjYW52YXMgfSA9IHVzZVRhZ3MoKTtcblxuLy9cbi8vIERlc2t0b3AgU2V0dXBcbi8vXG5cbmxldCBkZXNrdG9wX2VsID0gbnVsbDtcbmxldCBzdXJmYWNlX2VsID0gbnVsbDtcblxuY29uc3Qgc3VyZmFjZV9pbml0aWFsX3dpZHRoID0gMTAwMDAwO1xuY29uc3Qgc3VyZmFjZV9pbml0aWFsX2hlaWdodCA9IHN1cmZhY2VfaW5pdGlhbF93aWR0aCAqICh3aW5kb3cuaW5uZXJIZWlnaHQgLyB3aW5kb3cuaW5uZXJXaWR0aCk7XG5jb25zdCBhcHBsZXRfc2hhZG93X21hcCA9IGRpdih7XG5cdGlkOiBcImFwcGxldC1zaGFkb3ctbWFwXCIsXG5cdHN0eWxlOiBjc3NgXG5cdFx0cG9pbnRlci1ldmVudHM6IG5vbmU7XG5cdFx0b3BhY2l0eTogMDtcblx0YCxcbn0pO1xuXG5kb2N1bWVudC5ib2R5LmFwcGVuZENoaWxkKGFwcGxldF9zaGFkb3dfbWFwKTtcblxuYXdhaXQgZmluaXNoKCk7XG5cbmNvbnN0IHNoYWRvd19yb290ID0gYXBwbGV0X3NoYWRvd19tYXAuYXR0YWNoU2hhZG93KHsgbW9kZTogXCJvcGVuXCIgfSk7XG5cbmNvbnN0IEhBTkRMRV9DT05GSUcgPSB7XG5cdEVER0VfU0laRTogMTIsXG5cdENPUk5FUl9TSVpFOiAxMixcblx0T0ZGU0VUOiAtNixcbn07XG5cbmNvbnN0IE1JTl9aT09NID0gMC4xO1xuY29uc3QgTUFYX1pPT00gPSAxO1xuXG5sZXQgYXBwbGV0X2luaXRpYWxpemVycyA9IHt9O1xubGV0IHBsYWNlX2NhbGxiYWNrcyA9IFtdO1xubGV0IHJlbW92ZV9jYWxsYmFja3MgPSBbXTtcbmxldCBvcmRlcl9jaGFuZ2VfY2FsbGJhY2tzID0gW107XG5cbi8vIENhbWVyYSBDb250cm9sc1xubGV0IGNhbWVyYV94ID0gMDtcbmxldCBjYW1lcmFfeSA9IDA7XG5sZXQgc2Nyb2xsaW5nX3RpbWVvdXQgPSBudWxsO1xubGV0IHpvb21fdGltZW91dCA9IG51bGw7XG5sZXQgaXNfcGFubmluZyA9IGZhbHNlO1xubGV0IGlzX3Njcm9sbGluZyA9IGZhbHNlO1xubGV0IGxhc3RfbWlkZGxlX2NsaWNrX3ggPSAwO1xubGV0IGxhc3RfbWlkZGxlX2NsaWNrX3kgPSAwO1xubGV0IGN1cnJlbnRfc2NhbGUgPSAxO1xubGV0IHBlbmRpbmdfbW91c2VfZHggPSAwO1xubGV0IHBlbmRpbmdfbW91c2VfZHkgPSAwO1xubGV0IGhhc19wZW5kaW5nX21vdXNlX21vdmVtZW50ID0gZmFsc2U7XG5sZXQgem9vbV9sZXZlbCA9IDE7XG5sZXQgaXNfem9vbWluZyA9IGZhbHNlO1xubGV0IHNjcm9sbF90aHVtYl94ID0gMDtcbmxldCBzY3JvbGxfdGh1bWJfeSA9IDA7XG5cbi8vIEFwcGxldCBJbnRlcmFjdGlvbnNcbmxldCBsYXN0X21vdXNlX3ggPSAwO1xubGV0IGxhc3RfbW91c2VfeSA9IDA7XG5sZXQgZGVsdGFfeCA9IDA7XG5sZXQgZGVsdGFfeSA9IDA7XG5sZXQgZHJhZ2dlZF9hcHBsZXQgPSBudWxsO1xubGV0IGRyYWdnaW5nX3ggPSAwO1xubGV0IGRyYWdnaW5nX3kgPSAwO1xubGV0IGxhc3Rfd2lkdGggPSAwO1xubGV0IGxhc3RfaGVpZ2h0ID0gMDtcbmxldCBsYXN0X2xlZnQgPSAwO1xubGV0IGxhc3RfdG9wID0gMDtcbmxldCBjdXJyZW50X21vdXNlX2J1dHRvbiA9IG51bGw7XG5sZXQgbWluX3dpZHRoID0gMTA7XG5sZXQgbWluX2hlaWdodCA9IDEwO1xubGV0IGlzX3Jlc2l6aW5nID0gZmFsc2U7XG5sZXQgcmVzaXplX2VkZ2UgPSBudWxsO1xubGV0IGlzX3JpZ2h0X3Jlc2l6ZSA9IGZhbHNlO1xubGV0IHJlc2l6ZV9zdGFydF93aWR0aCA9IDA7XG5sZXQgcmVzaXplX3N0YXJ0X2hlaWdodCA9IDA7XG5sZXQgcmVzaXplX3N0YXJ0X3ggPSAwO1xubGV0IHJlc2l6ZV9zdGFydF95ID0gMDtcbmxldCByZXNpemVfcXVhZHJhbnQgPSBudWxsO1xubGV0IHJlc2l6ZV9zdGFydF9sZWZ0ID0gMDtcbmxldCByZXNpemVfc3RhcnRfdG9wID0gMDtcblxuY29uc3Qgb2JzZXJ2ZXIgPSBuZXcgTXV0YXRpb25PYnNlcnZlcigobXV0YXRpb25zKSA9PiB7XG5cdGZvciAobGV0IG11dGF0aW9uIG9mIG11dGF0aW9ucykge1xuXHRcdGlmIChtdXRhdGlvbi50eXBlID09PSBcImNoaWxkTGlzdFwiKSB7XG5cdFx0XHRpZiAobXV0YXRpb24uYWRkZWROb2Rlcy5sZW5ndGggPiAwKSB7XG5cdFx0XHRcdG11dGF0aW9uLmFkZGVkTm9kZXMuZm9yRWFjaCgobm9kZSkgPT4ge1xuXHRcdFx0XHRcdGlmIChcblx0XHRcdFx0XHRcdG5vZGUubm9kZVR5cGUgPT09IDEgJiZcblx0XHRcdFx0XHRcdG5vZGUuZ2V0QXR0cmlidXRlKFwib20tbW90aW9uXCIpICE9PSBcImVsZXZhdGVkXCIgJiZcblx0XHRcdFx0XHRcdG5vZGUuaGFzQXR0cmlidXRlKFwib20tYXBwbGV0XCIpXG5cdFx0XHRcdFx0KSB7XG5cdFx0XHRcdFx0XHRwbGFjZUFwcGxldChub2RlKTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH0pO1xuXHRcdFx0fVxuXG5cdFx0XHRpZiAobXV0YXRpb24ucmVtb3ZlZE5vZGVzLmxlbmd0aCA+IDApIHtcblx0XHRcdFx0bXV0YXRpb24ucmVtb3ZlZE5vZGVzLmZvckVhY2goKG5vZGUpID0+IHtcblx0XHRcdFx0XHRpZiAoXG5cdFx0XHRcdFx0XHRub2RlLm5vZGVUeXBlID09PSAxICYmXG5cdFx0XHRcdFx0XHRub2RlLmdldEF0dHJpYnV0ZShcIm9tLW1vdGlvblwiKSAhPT0gXCJlbGV2YXRlZFwiICYmXG5cdFx0XHRcdFx0XHRub2RlLmhhc0F0dHJpYnV0ZShcIm9tLWFwcGxldFwiKVxuXHRcdFx0XHRcdCkge1xuXHRcdFx0XHRcdFx0cmVtb3ZlQXBwbGV0KG5vZGUpO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0fSk7XG5cdFx0XHR9XG5cdFx0fVxuXHR9XG59KTtcblxuLy9cbi8vIExheW91dCBhbmQgU3R5bGVzXG4vL1xuXG5HbG9iYWxTdHlsZVNoZWV0KGNzc2Bcblx0I29tLWRlc2t0b3Age1xuXHRcdHBvc2l0aW9uOiByZWxhdGl2ZTtcblx0XHR3aWR0aDogMTAwJTtcblx0XHRoZWlnaHQ6IGF1dG87XG5cdFx0ZmxleC1ncm93OiAxO1xuXHRcdG92ZXJmbG93OiBoaWRkZW47XG5cdH1cblxuXHQjb20tZGVza3RvcC1jYW52YXMge1xuXHRcdHBvc2l0aW9uOiBhYnNvbHV0ZTtcblx0XHR3aWR0aDogMTAwJTtcblx0XHRoZWlnaHQ6IGF1dG87XG5cdFx0Ym90dG9tOiAwO1xuXHRcdGZsZXgtZ3JvdzogMTtcblx0XHRvdmVyZmxvdzogaGlkZGVuO1xuXHR9XG5cblx0I29tLWRlc2t0b3Atc3VyZmFjZSB7XG5cdFx0cG9zaXRpb246IGFic29sdXRlO1xuXHRcdHRyYW5zZm9ybS1vcmlnaW46IDAgMDtcblx0XHR0cmFuc2Zvcm06IHNjYWxlKDEpO1xuXHRcdHdpZHRoOiAke3N1cmZhY2VfaW5pdGlhbF93aWR0aH1weDtcblx0XHRoZWlnaHQ6ICR7c3VyZmFjZV9pbml0aWFsX2hlaWdodH1weDtcblx0fVxuYCk7XG5cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBpbml0aWFsaXplRGVza3RvcChvbV9zcGFjZSkge1xuXHRjb25zdCBkZXNrdG9wID0gZGl2KFxuXHRcdHtcblx0XHRcdGlkOiBcIm9tLWRlc2t0b3BcIixcblx0XHR9LFxuXHRcdGRpdih7XG5cdFx0XHRpZDogXCJvbS1kZXNrdG9wLXN1cmZhY2VcIixcblx0XHR9KSxcblx0KTtcblxuXHRjb25zdCBjYW52YXNfZWwgPSBjYW52YXMoe1xuXHRcdGlkOiBcIm9tLWRlc2t0b3AtY2FudmFzXCIsXG5cdH0pO1xuXG5cdG9tX3NwYWNlLmFwcGVuZENoaWxkKGNhbnZhc19lbCk7XG5cdG9tX3NwYWNlLmFwcGVuZENoaWxkKGRlc2t0b3ApO1xuXG5cdGF3YWl0IGZpbmlzaCgpO1xuXG5cdGNvbnN0IHsgZHJhd1dhbGxwYXBlciwgcmVzaXplQ2FudmFzIH0gPSBhd2FpdCBpbml0aWFsaXplQmFja2dyb3VuZENhbnZhcyhkZXNrdG9wLCBjYW52YXNfZWwpO1xuXG5cdG9ic2VydmVyLm9ic2VydmUoc3VyZmFjZSgpLCB7IGNoaWxkTGlzdDogdHJ1ZSB9KTtcblxuXHRvbkFwcGxldFBsYWNlKGhhbmRsZUFwcGxleVBsYWNlbWVudCk7XG5cblx0aGFuZGxlUmVzaXplKCk7XG5cblx0d2luZG93LmFkZEV2ZW50TGlzdGVuZXIoXCJyZXNpemVcIiwgaGFuZGxlUmVzaXplKTtcblx0d2luZG93LmFkZEV2ZW50TGlzdGVuZXIoXCJrZXlkb3duXCIsIGhhbmRsZUdsb2JhbEtleWRvd24pO1xuXHRkZXNrdG9wLmFkZEV2ZW50TGlzdGVuZXIoXCJ3aGVlbFwiLCBkZXNrdG9wV2hlZWwsIHsgcGFzc2l2ZTogZmFsc2UgfSk7XG5cdGRlc2t0b3AuYWRkRXZlbnRMaXN0ZW5lcihcInNjcm9sbFwiLCBkZXNrdG9wU2Nyb2xsKTtcblx0c3VyZmFjZSgpLmFkZEV2ZW50TGlzdGVuZXIoXCJtb3VzZWRvd25cIiwgc3VyZmFjZU1vdXNlRG93bik7XG5cdHdpbmRvdy5hZGRFdmVudExpc3RlbmVyKFwibW91c2VsZWF2ZVwiLCB3aW5kb3dNb3VzZU91dCk7XG5cdHdpbmRvdy5hZGRFdmVudExpc3RlbmVyKFwibW91c2VvdXRcIiwgd2luZG93TW91c2VPdXQpO1xuXHR3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcihcImRibGNsaWNrXCIsIHdpbmRvd0RibENsaWNrKTtcblx0d2luZG93LmFkZEV2ZW50TGlzdGVuZXIoXCJtb3VzZWRvd25cIiwgd2luZG93TW91c2VEb3duKTtcblx0d2luZG93LmFkZEV2ZW50TGlzdGVuZXIoXCJtb3VzZXVwXCIsIHdpbmRvd01vdXNlVXApO1xuXHR3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcihcIm1vdXNlbW92ZVwiLCB3aW5kb3dNb3VzZU1vdmUpO1xuXHRyZXF1ZXN0QW5pbWF0aW9uRnJhbWUoc3RlcCk7XG5cblx0c2Nyb2xsVG9DZW50ZXIoKTtcblxuXHRmdW5jdGlvbiBzY3JvbGxUb0NlbnRlcigpIHtcblx0XHRjb25zdCByZWN0ID0gc3VyZmFjZSgpLmdldEJvdW5kaW5nQ2xpZW50UmVjdCgpO1xuXHRcdGRlc2t0b3Auc2Nyb2xsKHtcblx0XHRcdGxlZnQ6IHJlY3Qud2lkdGggLyAyIC0gZGVza3RvcC5vZmZzZXRXaWR0aCAvIDIsXG5cdFx0XHR0b3A6IHJlY3QuaGVpZ2h0IC8gMiAtIGRlc2t0b3Aub2Zmc2V0SGVpZ2h0IC8gMixcblx0XHR9KTtcblx0fVxuXG5cdGZ1bmN0aW9uIHVwZGF0ZVN1cmZhY2VTY2FsZSgpIHtcblx0XHRzdXJmYWNlKCkuc3R5bGUudHJhbnNmb3JtID0gYHNjYWxlKCR7Y3VycmVudF9zY2FsZX0pYDtcblx0XHR6b29tX2xldmVsID0gY3VycmVudF9zY2FsZTtcblx0fVxuXG5cdGZ1bmN0aW9uIGhhbmRsZVJlc2l6ZSgpIHtcblx0XHRyZXNpemVDYW52YXMoKTtcblx0XHRkcmF3V2FsbHBhcGVyKGNhbWVyYV94LCBjYW1lcmFfeSwgY3VycmVudF9zY2FsZSk7XG5cdH1cblxuXHRhc3luYyBmdW5jdGlvbiBoYW5kbGVHbG9iYWxLZXlkb3duKGUpIHtcblx0XHQvLyBQcmV2ZW50IGRlZmF1bHQgd2luZG93IHpvb21pbmdcblx0XHRpZiAoKGUuY3RybEtleSB8fCBlLm1ldGFLZXkpICYmIGUua2V5ID09PSBcIj1cIikge1xuXHRcdFx0ZS5wcmV2ZW50RGVmYXVsdCgpO1xuXHRcdH0gZWxzZSBpZiAoKGUuY3RybEtleSB8fCBlLm1ldGFLZXkpICYmIGUua2V5ID09PSBcIi1cIikge1xuXHRcdFx0ZS5wcmV2ZW50RGVmYXVsdCgpO1xuXHRcdH0gZWxzZSBpZiAoKGUuY3RybEtleSB8fCBlLm1ldGFLZXkpICYmIGUua2V5ID09PSBcIjBcIikge1xuXHRcdFx0ZS5wcmV2ZW50RGVmYXVsdCgpO1xuXHRcdH1cblxuXHRcdGlmIChlLmFsdEtleSkge1xuXHRcdFx0Ly8gU3RvcmUgY3VycmVudCBzY3JvbGwgcG9zaXRpb24gYW5kIHZpZXdwb3J0IGRpbWVuc2lvbnNcblx0XHRcdGNvbnN0IHByZXZfc2Nyb2xsX3ggPSBkZXNrdG9wLnNjcm9sbExlZnQ7XG5cdFx0XHRjb25zdCBwcmV2X3Njcm9sbF95ID0gZGVza3RvcC5zY3JvbGxUb3A7XG5cdFx0XHRjb25zdCB2aWV3cG9ydF93aWR0aCA9IGRlc2t0b3Aub2Zmc2V0V2lkdGg7XG5cdFx0XHRjb25zdCB2aWV3cG9ydF9oZWlnaHQgPSBkZXNrdG9wLm9mZnNldEhlaWdodDtcblxuXHRcdFx0Ly8gQ2FsY3VsYXRlIGNlbnRlciBwb2ludCBiZWZvcmUgc2NhbGUgY2hhbmdlXG5cdFx0XHRjb25zdCBjZW50ZXJfeCA9IChwcmV2X3Njcm9sbF94ICsgdmlld3BvcnRfd2lkdGggLyAyKSAvIGN1cnJlbnRfc2NhbGU7XG5cdFx0XHRjb25zdCBjZW50ZXJfeSA9IChwcmV2X3Njcm9sbF95ICsgdmlld3BvcnRfaGVpZ2h0IC8gMikgLyBjdXJyZW50X3NjYWxlO1xuXG5cdFx0XHRpZiAoZS5rZXkgPT09IFwi4omgXCIpIHtcblx0XHRcdFx0ZS5wcmV2ZW50RGVmYXVsdCgpO1xuXHRcdFx0XHRpc196b29taW5nID0gdHJ1ZTtcblx0XHRcdFx0Y3VycmVudF9zY2FsZSA9IE1hdGgubWluKGN1cnJlbnRfc2NhbGUgKyAwLjEsIDEuMCk7XG5cdFx0XHR9IGVsc2UgaWYgKGUua2V5ID09PSBcIuKAk1wiKSB7XG5cdFx0XHRcdGUucHJldmVudERlZmF1bHQoKTtcblx0XHRcdFx0aXNfem9vbWluZyA9IHRydWU7XG5cdFx0XHRcdGN1cnJlbnRfc2NhbGUgPSBNYXRoLm1heChjdXJyZW50X3NjYWxlIC0gMC4xLCAwLjEpO1xuXHRcdFx0fSBlbHNlIGlmIChlLmtleSA9PT0gXCLCulwiKSB7XG5cdFx0XHRcdGUucHJldmVudERlZmF1bHQoKTtcblx0XHRcdFx0aXNfem9vbWluZyA9IHRydWU7XG5cdFx0XHRcdGN1cnJlbnRfc2NhbGUgPSAxLjA7XG5cdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRyZXR1cm47XG5cdFx0XHR9XG5cblx0XHRcdC8vIFVwZGF0ZSB0aGUgc2NhbGUgaW1tZWRpYXRlbHlcblx0XHRcdHVwZGF0ZVN1cmZhY2VTY2FsZSgpO1xuXHRcdFx0YXdhaXQgZmluaXNoKCk7XG5cblx0XHRcdC8vIENhbGN1bGF0ZSBuZXcgc2Nyb2xsIHBvc2l0aW9uIHRvIG1haW50YWluIGNlbnRlciBwb2ludFxuXHRcdFx0Y29uc3QgbmV3X3Njcm9sbF94ID0gY2VudGVyX3ggKiBjdXJyZW50X3NjYWxlIC0gdmlld3BvcnRfd2lkdGggLyAyO1xuXHRcdFx0Y29uc3QgbmV3X3Njcm9sbF95ID0gY2VudGVyX3kgKiBjdXJyZW50X3NjYWxlIC0gdmlld3BvcnRfaGVpZ2h0IC8gMjtcblxuXHRcdFx0Ly8gQXBwbHkgbmV3IHNjcm9sbCBwb3NpdGlvblxuXHRcdFx0ZGVza3RvcC5zY3JvbGxUbyh7XG5cdFx0XHRcdGxlZnQ6IG5ld19zY3JvbGxfeCxcblx0XHRcdFx0dG9wOiBuZXdfc2Nyb2xsX3ksXG5cdFx0XHR9KTtcblxuXHRcdFx0Ly8gUmVzZXQgaXNfem9vbWluZyBhZnRlciBhIHNob3J0IGRlbGF5XG5cdFx0XHRjbGVhclRpbWVvdXQoem9vbV90aW1lb3V0KTtcblx0XHRcdHpvb21fdGltZW91dCA9IHNldFRpbWVvdXQoKCkgPT4ge1xuXHRcdFx0XHRpc196b29taW5nID0gZmFsc2U7XG5cdFx0XHR9LCAxNTApO1xuXHRcdH1cblx0fVxuXG5cdGFzeW5jIGZ1bmN0aW9uIGRlc2t0b3BXaGVlbChlKSB7XG5cdFx0bGV0IHRhcmdldCA9IGUudGFyZ2V0O1xuXHRcdHdoaWxlICh0YXJnZXQgJiYgdGFyZ2V0ICE9PSBzdXJmYWNlKCkpIHtcblx0XHRcdGlmIChpc1Njcm9sbGFibGUodGFyZ2V0KSAmJiAhaXNfc2Nyb2xsaW5nKSB7XG5cdFx0XHRcdHJldHVybjtcblx0XHRcdH1cblx0XHRcdHRhcmdldCA9IHRhcmdldC5wYXJlbnRFbGVtZW50O1xuXHRcdH1cblxuXHRcdGlmICh3aW5kb3cuaXNfdHJhY2twYWQgJiYgd2luZG93LnN1cGVya2V5ZG93biAmJiBlLnNoaWZ0S2V5ICYmICFlLmN0cmxLZXkpIHtcblx0XHRcdGUucHJldmVudERlZmF1bHQoKTtcblx0XHRcdGRlc2t0b3Auc2Nyb2xsVG8oe1xuXHRcdFx0XHRsZWZ0OiBjYW1lcmFfeCArIGUuZGVsdGFYLFxuXHRcdFx0XHR0b3A6IGNhbWVyYV95ICsgZS5kZWx0YVksXG5cdFx0XHR9KTtcblx0XHR9IGVsc2UgaWYgKFxuXHRcdFx0KHdpbmRvdy5zdXBlcmtleWRvd24gJiYgIWlzX3Bhbm5pbmcpIHx8XG5cdFx0XHQod2luZG93LmlzX3RyYWNrcGFkICYmIHdpbmRvdy5zdXBlcmtleWRvd24gJiYgZS5zaGlmdEtleSAmJiBlLmN0cmxLZXkpXG5cdFx0KSB7XG5cdFx0XHRlLnByZXZlbnREZWZhdWx0KCk7XG5cblx0XHRcdC8vIFN0b3JlIGN1cnJlbnQgc2Nyb2xsIHBvc2l0aW9uIGFuZCB2aWV3cG9ydCBkaW1lbnNpb25zXG5cdFx0XHRjb25zdCBwcmV2X3Njcm9sbF94ID0gZGVza3RvcC5zY3JvbGxMZWZ0O1xuXHRcdFx0Y29uc3QgcHJldl9zY3JvbGxfeSA9IGRlc2t0b3Auc2Nyb2xsVG9wO1xuXG5cdFx0XHQvLyBHZXQgY3Vyc29yIHBvc2l0aW9uIHJlbGF0aXZlIHRvIHRoZSB2aWV3cG9ydFxuXHRcdFx0Y29uc3QgcmVjdCA9IGRlc2t0b3AuZ2V0Qm91bmRpbmdDbGllbnRSZWN0KCk7XG5cdFx0XHRjb25zdCBjdXJzb3JfeCA9IGUuY2xpZW50WCAtIHJlY3QubGVmdDtcblx0XHRcdGNvbnN0IGN1cnNvcl95ID0gZS5jbGllbnRZIC0gcmVjdC50b3A7XG5cblx0XHRcdC8vIENhbGN1bGF0ZSBvcmlnaW4gcG9pbnQgYmVmb3JlIHNjYWxlIGNoYW5nZVxuXHRcdFx0Y29uc3QgcG9pbnRfeCA9IChwcmV2X3Njcm9sbF94ICsgY3Vyc29yX3gpIC8gY3VycmVudF9zY2FsZTtcblx0XHRcdGNvbnN0IHBvaW50X3kgPSAocHJldl9zY3JvbGxfeSArIGN1cnNvcl95KSAvIGN1cnJlbnRfc2NhbGU7XG5cblx0XHRcdC8vIENhbGN1bGF0ZSBhIHNjYWxlIGZhY3RvciB0aGF0J3Mgc21hbGxlciBhdCBsb3cgem9vbSBsZXZlbHNcblx0XHRcdC8vIFRoZSAwLjA1IGF0IHNjYWxlIDEuMCB3aWxsIHJlZHVjZSB0byAwLjAwNSBhdCBzY2FsZSAwLjFcblx0XHRcdGNvbnN0IHNjYWxlX2ZhY3RvciA9IE1hdGgubWF4KDAuMDA1LCBjdXJyZW50X3NjYWxlICogMC4wNSk7XG5cblx0XHRcdC8vIENhbGN1bGF0ZSBuZXcgc2NhbGUgd2l0aCB2YXJpYWJsZSBpbmNyZW1lbnQgYmFzZWQgb24gY3VycmVudCBzY2FsZVxuXHRcdFx0Y29uc3QgZGVsdGEgPSBlLmRlbHRhWSA+IDAgPyAtc2NhbGVfZmFjdG9yIDogc2NhbGVfZmFjdG9yO1xuXHRcdFx0bGV0IG5ld19zY2FsZSA9IE1hdGgubWF4KE1JTl9aT09NLCBNYXRoLm1pbihNQVhfWk9PTSwgY3VycmVudF9zY2FsZSArIGRlbHRhKSk7XG5cblx0XHRcdC8vIE9ubHkgcHJvY2VlZCBpZiB0aGUgc2NhbGUgYWN0dWFsbHkgY2hhbmdlZFxuXHRcdFx0aWYgKG5ld19zY2FsZSAhPT0gY3VycmVudF9zY2FsZSkge1xuXHRcdFx0XHRpc196b29taW5nID0gdHJ1ZTtcblx0XHRcdFx0Y3VycmVudF9zY2FsZSA9IG5ld19zY2FsZTtcblxuXHRcdFx0XHQvLyBVcGRhdGUgdGhlIHNjYWxlIGltbWVkaWF0ZWx5XG5cdFx0XHRcdHVwZGF0ZVN1cmZhY2VTY2FsZSgpO1xuXG5cdFx0XHRcdC8vIENhbGN1bGF0ZSBuZXcgc2Nyb2xsIHBvc2l0aW9uIHRvIG1haW50YWluIGN1cnNvciBwb2ludFxuXHRcdFx0XHRjb25zdCBuZXdfc2Nyb2xsX3ggPSBwb2ludF94ICogY3VycmVudF9zY2FsZSAtIGN1cnNvcl94O1xuXHRcdFx0XHRjb25zdCBuZXdfc2Nyb2xsX3kgPSBwb2ludF95ICogY3VycmVudF9zY2FsZSAtIGN1cnNvcl95O1xuXG5cdFx0XHRcdC8vIEFwcGx5IG5ldyBzY3JvbGwgcG9zaXRpb25cblx0XHRcdFx0ZGVza3RvcC5zY3JvbGxUbyh7XG5cdFx0XHRcdFx0bGVmdDogbmV3X3Njcm9sbF94LFxuXHRcdFx0XHRcdHRvcDogbmV3X3Njcm9sbF95LFxuXHRcdFx0XHR9KTtcblxuXHRcdFx0XHQvLyBSZXNldCBpc196b29taW5nIGFmdGVyIGEgc2hvcnQgZGVsYXlcblx0XHRcdFx0Y2xlYXJUaW1lb3V0KHpvb21fdGltZW91dCk7XG5cdFx0XHRcdHpvb21fdGltZW91dCA9IHNldFRpbWVvdXQoKCkgPT4ge1xuXHRcdFx0XHRcdGlzX3pvb21pbmcgPSBmYWxzZTtcblx0XHRcdFx0fSwgMTUwKTtcblx0XHRcdH1cblx0XHR9XG5cdH1cblxuXHRmdW5jdGlvbiBkZXNrdG9wU2Nyb2xsKGUpIHtcblx0XHRpc19zY3JvbGxpbmcgPSB0cnVlO1xuXG5cdFx0Y2xlYXJUaW1lb3V0KHNjcm9sbGluZ190aW1lb3V0KTtcblx0XHRzY3JvbGxpbmdfdGltZW91dCA9IHNldFRpbWVvdXQoKCkgPT4ge1xuXHRcdFx0aXNfc2Nyb2xsaW5nID0gZmFsc2U7XG5cdFx0fSwgMTUwKTtcblxuXHRcdGNvbnN0IHJlY3QgPSBzdXJmYWNlKCkuZ2V0Qm91bmRpbmdDbGllbnRSZWN0KCk7XG5cdFx0Y29uc3QgbWF4X3ggPSByZWN0LndpZHRoIC0gZGVza3RvcC5vZmZzZXRXaWR0aDtcblx0XHRjb25zdCBtYXhfeSA9IHJlY3QuaGVpZ2h0IC0gZGVza3RvcC5vZmZzZXRIZWlnaHQ7XG5cblx0XHRsZXQgbmV3X3ggPSBkZXNrdG9wLnNjcm9sbExlZnQ7XG5cdFx0bGV0IG5ld195ID0gZGVza3RvcC5zY3JvbGxUb3A7XG5cblx0XHRpZiAobmV3X3ggPj0gbWF4X3gpIHtcblx0XHRcdG5ld194ID0gbWF4X3g7XG5cdFx0fVxuXG5cdFx0aWYgKG5ld195ID49IG1heF95KSB7XG5cdFx0XHRuZXdfeSA9IG1heF95O1xuXHRcdH1cblxuXHRcdGNhbWVyYV94ID0gZGVza3RvcC5zY3JvbGxMZWZ0O1xuXHRcdGNhbWVyYV95ID0gZGVza3RvcC5zY3JvbGxUb3A7XG5cblx0XHRzY3JvbGxfdGh1bWJfeCA9IChkZXNrdG9wLnNjcm9sbExlZnQgLyByZWN0LndpZHRoKSAqIDEwMDtcblx0XHRzY3JvbGxfdGh1bWJfeSA9IChkZXNrdG9wLnNjcm9sbFRvcCAvIHJlY3QuaGVpZ2h0KSAqIDEwMDtcblx0fVxuXG5cdGZ1bmN0aW9uIHN1cmZhY2VNb3VzZURvd24oZSkge1xuXHRcdGlmICgod2luZG93LnN1cGVya2V5ZG93biAmJiBlLmJ1dHRvbiA9PT0gMSkgfHwgKHdpbmRvdy5zdXBlcmtleWRvd24gJiYgZS5idXR0b24gPT09IDAgJiYgZS50YXJnZXQgPT09IHN1cmZhY2UoKSkpIHtcblx0XHRcdGUucHJldmVudERlZmF1bHQoKTtcblx0XHRcdGlzX3Bhbm5pbmcgPSB0cnVlO1xuXHRcdFx0ZG9jdW1lbnQuYm9keS5jbGFzc0xpc3QuYWRkKFwiaXMtcGFubmluZ1wiKTtcblx0XHRcdGxhc3RfbWlkZGxlX2NsaWNrX3ggPSBlLmNsaWVudFg7XG5cdFx0XHRsYXN0X21pZGRsZV9jbGlja195ID0gZS5jbGllbnRZO1xuXHRcdH1cblx0fVxuXG5cdGZ1bmN0aW9uIHdpbmRvd01vdXNlT3V0KGUpIHtcblx0XHRpZiAoZS50YXJnZXQudGFnTmFtZSAhPT0gXCJIVE1MXCIpIHJldHVybjtcblx0XHRpc19wYW5uaW5nID0gZmFsc2U7XG5cdFx0ZG9jdW1lbnQuYm9keS5jbGFzc0xpc3QucmVtb3ZlKFwiaXMtcGFubmluZ1wiKTtcblx0fVxuXG5cdGZ1bmN0aW9uIHdpbmRvd0RibENsaWNrKGUpIHtcblx0XHQvLyBpZiAoZS4pXG5cdH1cblxuXHRmdW5jdGlvbiB3aW5kb3dNb3VzZURvd24oZSkge31cblxuXHRmdW5jdGlvbiB3aW5kb3dNb3VzZVVwKGUpIHtcblx0XHRpZiAoZS5idXR0b24gPT09IDEgfHwgZS5idXR0b24gPT09IDApIHtcblx0XHRcdGlzX3Bhbm5pbmcgPSBmYWxzZTtcblx0XHRcdGRvY3VtZW50LmJvZHkuY2xhc3NMaXN0LnJlbW92ZShcImlzLXBhbm5pbmdcIik7XG5cdFx0fVxuXHR9XG5cblx0ZnVuY3Rpb24gd2luZG93TW91c2VNb3ZlKGUpIHtcblx0XHRpZiAoaXNfcGFubmluZykge1xuXHRcdFx0Ly8gQ2FsY3VsYXRlIHRoZSBkZWx0YSBhbmQgc3RvcmUgaXQgZm9yIHRoZSBuZXh0IGFuaW1hdGlvbiBmcmFtZVxuXHRcdFx0cGVuZGluZ19tb3VzZV9keCArPSBlLmNsaWVudFggLSBsYXN0X21pZGRsZV9jbGlja194O1xuXHRcdFx0cGVuZGluZ19tb3VzZV9keSArPSBlLmNsaWVudFkgLSBsYXN0X21pZGRsZV9jbGlja195O1xuXHRcdFx0aGFzX3BlbmRpbmdfbW91c2VfbW92ZW1lbnQgPSB0cnVlO1xuXG5cdFx0XHQvLyBVcGRhdGUgdGhlIGxhc3QgbW91c2UgcG9zaXRpb25cblx0XHRcdGxhc3RfbWlkZGxlX2NsaWNrX3ggPSBlLmNsaWVudFg7XG5cdFx0XHRsYXN0X21pZGRsZV9jbGlja195ID0gZS5jbGllbnRZO1xuXHRcdH1cblx0fVxuXG5cdGZ1bmN0aW9uIHN0ZXAoKSB7XG5cdFx0Ly8gUHJvY2VzcyBhbnkgcGVuZGluZyBtb3VzZSBtb3ZlbWVudHMgaW4gdGhlIGFuaW1hdGlvbiBmcmFtZVxuXHRcdGlmIChoYXNfcGVuZGluZ19tb3VzZV9tb3ZlbWVudCAmJiBpc19wYW5uaW5nKSB7XG5cdFx0XHQvLyBBcHBseSB0aGUgZGVsdGEsIGFkanVzdGVkIGZvciBzY2FsZVxuXHRcdFx0Y2FtZXJhX3ggLT0gcGVuZGluZ19tb3VzZV9keDtcblx0XHRcdGNhbWVyYV95IC09IHBlbmRpbmdfbW91c2VfZHk7XG5cdFx0XHRwZW5kaW5nX21vdXNlX2R4ID0gMDtcblx0XHRcdHBlbmRpbmdfbW91c2VfZHkgPSAwO1xuXHRcdFx0aGFzX3BlbmRpbmdfbW91c2VfbW92ZW1lbnQgPSBmYWxzZTtcblx0XHR9XG5cblx0XHRpZiAoY2FtZXJhX3ggPD0gMCkge1xuXHRcdFx0Y2FtZXJhX3ggPSAwO1xuXHRcdH1cblxuXHRcdGlmIChjYW1lcmFfeSA8PSAwKSB7XG5cdFx0XHRjYW1lcmFfeSA9IDA7XG5cdFx0fVxuXG5cdFx0Y29uc3QgcmVjdCA9IHN1cmZhY2UoKS5nZXRCb3VuZGluZ0NsaWVudFJlY3QoKTtcblx0XHRjb25zdCBtYXhfeCA9IHJlY3Qud2lkdGggLSBkZXNrdG9wLm9mZnNldFdpZHRoO1xuXHRcdGNvbnN0IG1heF95ID0gcmVjdC5oZWlnaHQgLSBkZXNrdG9wLm9mZnNldEhlaWdodDtcblxuXHRcdGlmIChjYW1lcmFfeCA+PSBtYXhfeCkge1xuXHRcdFx0Y2FtZXJhX3ggPSBtYXhfeDtcblx0XHR9XG5cblx0XHRpZiAoY2FtZXJhX3kgPj0gbWF4X3kpIHtcblx0XHRcdGNhbWVyYV95ID0gbWF4X3k7XG5cdFx0fVxuXG5cdFx0aWYgKGlzX3Bhbm5pbmcpIHtcblx0XHRcdGRlc2t0b3Auc2Nyb2xsKHtcblx0XHRcdFx0bGVmdDogY2FtZXJhX3gsXG5cdFx0XHRcdHRvcDogY2FtZXJhX3ksXG5cdFx0XHRcdGJlaGF2aW9yOiBcImluc3RhbnRcIixcblx0XHRcdH0pO1xuXHRcdH1cblxuXHRcdC8vIFVwZGF0ZSB0aGUgc2NhbGUgY29uc2lzdGVudGx5IGluIHRoZSBhbmltYXRpb24gbG9vcFxuXHRcdHVwZGF0ZVN1cmZhY2VTY2FsZSgpO1xuXG5cdFx0Ly8gRHJhdyB0aGUgd2FsbHBhcGVyIHdpdGggdGhlIGN1cnJlbnQgc2Nyb2xsIGFuZCB6b29tXG5cdFx0ZHJhd1dhbGxwYXBlcihjYW1lcmFfeCwgY2FtZXJhX3ksIGN1cnJlbnRfc2NhbGUpO1xuXG5cdFx0cmVxdWVzdEFuaW1hdGlvbkZyYW1lKHN0ZXApO1xuXHR9XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBnZXRDYW1lcmFQb3NpdGlvbigpIHtcblx0cmV0dXJuIHsgeDogY2FtZXJhX3gsIHk6IGNhbWVyYV95IH07XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBnZXRDYW1lcmFDZW50ZXIoKSB7XG5cdHJldHVybiB7XG5cdFx0eDogKGNhbWVyYV94ICsgZGVza3RvcCgpLm9mZnNldFdpZHRoIC8gMikgLyBjdXJyZW50X3NjYWxlLFxuXHRcdHk6IChjYW1lcmFfeSArIGRlc2t0b3AoKS5vZmZzZXRIZWlnaHQgLyAyKSAvIGN1cnJlbnRfc2NhbGUsXG5cdH07XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBkZXNrdG9wKCkge1xuXHRpZiAoIWRlc2t0b3BfZWwpIHtcblx0XHRkZXNrdG9wX2VsID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJvbS1kZXNrdG9wXCIpO1xuXHR9XG5cdHJldHVybiBkZXNrdG9wX2VsO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gc3VyZmFjZShjaGlsZCkge1xuXHRpZiAoIXN1cmZhY2VfZWwpIHtcblx0XHRzdXJmYWNlX2VsID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJvbS1kZXNrdG9wLXN1cmZhY2VcIik7XG5cdH1cblxuXHRyZXR1cm4gc3VyZmFjZV9lbDtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHJlZ2lzdGVyQXBwbGV0SW5pdGlhbGl6ZXIod2luZG93X25hbWUsIGluaXRpYWxpemVyKSB7XG5cdGFwcGxldF9pbml0aWFsaXplcnNbd2luZG93X25hbWVdID0gaW5pdGlhbGl6ZXI7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBvbkFwcGxldFBsYWNlKGNhbGxiYWNrKSB7XG5cdHBsYWNlX2NhbGxiYWNrcy5wdXNoKGNhbGxiYWNrKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIG9uQXBwbGV0UmVtb3ZlKGNhbGxiYWNrKSB7XG5cdHJlbW92ZV9jYWxsYmFja3MucHVzaChjYWxsYmFjayk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBvbk9yZGVyQ2hhbmdlKGNhbGxiYWNrKSB7XG5cdG9yZGVyX2NoYW5nZV9jYWxsYmFja3MucHVzaChjYWxsYmFjayk7XG59XG5cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBwbGFjZUFwcGxldChhcHBsZXQsIGZpcnN0X21vdW50ID0gZmFsc2UpIHtcblx0cGxhY2VfY2FsbGJhY2tzLmZvckVhY2goKGMpID0+IGMoYXBwbGV0LCBmaXJzdF9tb3VudCkpO1xuXG5cdGlmICghYXBwbGV0Lmhhc0F0dHJpYnV0ZShcIm9tLXRzaWRcIikpIHtcblx0XHRjb25zdCB1dWlkID0gKFsxZTddICsgLTFlMyArIC00ZTMgKyAtOGUzICsgLTFlMTEpLnJlcGxhY2UoL1swMThdL2csIChjKSA9PlxuXHRcdFx0KGMgXiAoY3J5cHRvLmdldFJhbmRvbVZhbHVlcyhuZXcgVWludDhBcnJheSgxKSlbMF0gJiAoMTUgPj4gKGMgLyA0KSkpKS50b1N0cmluZygxNiksXG5cdFx0KTtcblx0XHRhcHBsZXQuc2V0QXR0cmlidXRlKFwib20tdHNpZFwiLCB1dWlkKTtcblxuXHRcdGlmICghZmlyc3RfbW91bnQpIHtcblx0XHRcdGFkZFNoYWRvd0Nsb25lKGFwcGxldCwgdXVpZCk7XG5cdFx0fVxuXHR9XG5cblx0aWYgKCFmaXJzdF9tb3VudCkgc2F2ZSgpO1xufVxuXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gcmVtb3ZlQXBwbGV0KGFwcGxldCkge1xuXHRyZW1vdmVTaGFkb3dDbG9uZShhcHBsZXQpO1xuXHRyZW1vdmVfY2FsbGJhY2tzLmZvckVhY2goKGMpID0+IGMoYXBwbGV0KSk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBsaWZ0KHRzaWQpIHtcblx0Y29uc3Qgc2hhZG93X2Nsb25lID0gc2hhZG93X3Jvb3QucXVlcnlTZWxlY3RvcihgW29tLXRzaWQ9XCIke3RzaWR9XCJdYCk7XG5cdHNoYWRvd19jbG9uZS5wYXJlbnROb2RlLmluc2VydEJlZm9yZShzaGFkb3dfY2xvbmUsIG51bGwpO1xuXHRjb25zdCBhcHBsZXRzID0gQXJyYXkuZnJvbShzdXJmYWNlKCkucXVlcnlTZWxlY3RvckFsbChcIltvbS1hcHBsZXRdXCIpKTtcblx0YXBwbGV0cy5mb3JFYWNoKCh3aW4pID0+IHtcblx0XHRjb25zdCBpZCA9IHdpbi5nZXRBdHRyaWJ1dGUoXCJvbS10c2lkXCIpO1xuXHRcdGNvbnN0IG0gPSBzaGFkb3dfcm9vdC5xdWVyeVNlbGVjdG9yKGBbb20tdHNpZD1cIiR7aWR9XCJdYCk7XG5cdFx0Y29uc3QgbmV3X3pfaW5kZXggPSBBcnJheS5mcm9tKG0ucGFyZW50Tm9kZS5jaGlsZHJlbikuaW5kZXhPZihtKTtcblx0XHR3aW4uc3R5bGUuekluZGV4ID0gbmV3X3pfaW5kZXg7XG5cdFx0b3JkZXJfY2hhbmdlX2NhbGxiYWNrcy5mb3JFYWNoKChjKSA9PiBjKHdpbiwgbmV3X3pfaW5kZXgpKTtcblx0fSk7XG59XG5cbmZ1bmN0aW9uIHNhdmUoKSB7XG5cdC8vIGNvbnNvbGUubG9nKFwiSWYgd2Ugd2FudCB0byBzYXZlIHRoZSBjdXJyZW50IGFwcGxldCBsYXlvdXRcIik7XG59XG5cbmZ1bmN0aW9uIGFkZFNoYWRvd0Nsb25lKHdpbiwgaWQpIHtcblx0Y29uc3Qgc2hhZG93X2Nsb25lID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcImRpdlwiKTtcblx0c2hhZG93X2Nsb25lLnN0eWxlLnBvc2l0aW9uID0gXCJhYnNvbHV0ZVwiO1xuXHRzaGFkb3dfY2xvbmUuc2V0QXR0cmlidXRlKFwib20tdHNpZFwiLCBpZCk7XG5cdHNoYWRvd19yb290LmFwcGVuZENoaWxkKHNoYWRvd19jbG9uZSk7XG5cdGNvbnN0IG5ld196X2luZGV4ID0gc2hhZG93X3Jvb3QuY2hpbGRyZW4ubGVuZ3RoO1xuXHR3aW4uc3R5bGUuekluZGV4ID0gbmV3X3pfaW5kZXg7XG5cdC8vIFRyaWdnZXIgei1pbmRleCBjaGFuZ2UgY2FsbGJhY2tzXG5cdG9yZGVyX2NoYW5nZV9jYWxsYmFja3MuZm9yRWFjaCgoYykgPT4gYyh3aW4sIG5ld196X2luZGV4KSk7XG59XG5cbmZ1bmN0aW9uIHJlbW92ZVNoYWRvd0Nsb25lKHdpbikge1xuXHRjb25zdCByZW1vdmVkX2lkID0gd2luLmdldEF0dHJpYnV0ZShcIm9tLXRzaWRcIik7XG5cdGNvbnN0IHNoYWRvd19jbG9uZSA9IHNoYWRvd19yb290LnF1ZXJ5U2VsZWN0b3IoYFtvbS10c2lkPVwiJHtyZW1vdmVkX2lkfVwiXWApO1xuXHRpZiAoc2hhZG93X2Nsb25lKSB7XG5cdFx0Ly8gVXBkYXRlIHotaW5kZXggb2Ygb3RoZXIgbWlycm9yc1xuXHRcdGNvbnN0IG1pcnJvcnMgPSBBcnJheS5mcm9tKHNoYWRvd19yb290LmNoaWxkcmVuKTtcblx0XHRtaXJyb3JzXG5cdFx0XHQuZmlsdGVyKChtKSA9PiBtLmdldEF0dHJpYnV0ZShcIm9tLXRzaWRcIikgIT09IHJlbW92ZWRfaWQpXG5cdFx0XHQuZm9yRWFjaCgobSwgaSkgPT4ge1xuXHRcdFx0XHRjb25zdCB0ID0gc3VyZmFjZSgpLnF1ZXJ5U2VsZWN0b3IoYFtvbS10c2lkPVwiJHttLmdldEF0dHJpYnV0ZShcIm9tLXRzaWRcIil9XCJdYCk7XG5cdFx0XHRcdGlmICh0KSB7XG5cdFx0XHRcdFx0Y29uc3QgbmV3X3pfaW5kZXggPSBpICsgMTtcblx0XHRcdFx0XHR0LnN0eWxlLnpJbmRleCA9IG5ld196X2luZGV4O1xuXHRcdFx0XHRcdC8vIFRyaWdnZXIgei1pbmRleCBjaGFuZ2UgY2FsbGJhY2tzXG5cdFx0XHRcdFx0b3JkZXJfY2hhbmdlX2NhbGxiYWNrcy5mb3JFYWNoKChjKSA9PiBjKHQsIG5ld196X2luZGV4KSk7XG5cdFx0XHRcdH1cblx0XHRcdH0pO1xuXHRcdHNoYWRvd19jbG9uZS5yZW1vdmUoKTtcblx0fVxufVxuXG5hc3luYyBmdW5jdGlvbiBoYW5kbGVBcHBsZXlQbGFjZW1lbnQoYXBwbGV0LCBmaXJzdF9tb3VudCA9IGZhbHNlKSB7XG5cdGlmICghZmlyc3RfbW91bnQpIHtcblx0XHRhd2FpdCBmaW5pc2goKTtcblx0XHRhcHBsZXQuc2V0QXR0cmlidXRlKFwib20tbW90aW9uXCIsIFwiaWRsZVwiKTtcblx0XHRhcHBsZXQuc3R5bGUucmVtb3ZlUHJvcGVydHkoXCJ3aWxsLWNoYW5nZVwiKTtcblx0fVxuXG5cdGFwcGxldC5hZGRFdmVudExpc3RlbmVyKFwiY29udGV4dG1lbnVcIiwgcHJldmVudENvbnRleHRNZW51KTtcblx0YXBwbGV0LmFkZEV2ZW50TGlzdGVuZXIoXCJtb3VzZWRvd25cIiwgaGFuZGxlX21vdXNlZG93bik7XG5cblx0YXN5bmMgZnVuY3Rpb24gaGFuZGxlX21vdXNlZG93bihlKSB7XG5cdFx0aWYgKCFlLnRhcmdldCB8fCBkcmFnZ2VkX2FwcGxldCAhPT0gbnVsbCB8fCBpc19wYW5uaW5nKSByZXR1cm47XG5cblx0XHRjdXJyZW50X21vdXNlX2J1dHRvbiA9IGUuYnV0dG9uO1xuXG5cdFx0Y29uc3QgdGFyZ2V0ID0gZS50YXJnZXQ7XG5cdFx0Y29uc3QgaXNfY29udGVudGVkaXRhYmxlID0gdGFyZ2V0LmlzQ29udGVudEVkaXRhYmxlIHx8IHRhcmdldC5jbG9zZXN0KCdbY29udGVudGVkaXRhYmxlPVwidHJ1ZVwiXScpO1xuXHRcdGNvbnN0IGlzX2RyYWdfaGFuZGxlID0gdGFyZ2V0Lmhhc0F0dHJpYnV0ZShcImRyYWctaGFuZGxlXCIpO1xuXG5cdFx0aWYgKFxuXHRcdFx0YXBwbGV0LmdldEF0dHJpYnV0ZShcIm9tLW1vdGlvblwiKSAhPT0gXCJpZGxlXCIgfHxcblx0XHRcdHRhcmdldC50YWdOYW1lID09PSBcIkFcIiB8fFxuXHRcdFx0dGFyZ2V0LnRhZ05hbWUgPT09IFwiQlVUVE9OXCIgfHxcblx0XHRcdHRhcmdldC50YWdOYW1lID09PSBcIklOUFVUXCIgfHxcblx0XHRcdHRhcmdldC50YWdOYW1lID09PSBcIlRFWFRBUkVBXCIgfHxcblx0XHRcdHRhcmdldC50YWdOYW1lID09PSBcIlNFTEVDVFwiIHx8XG5cdFx0XHRpc19jb250ZW50ZWRpdGFibGUgfHxcblx0XHRcdCh0YXJnZXQudGFnTmFtZSA9PT0gXCJJTUdcIiAmJiB0YXJnZXQuZ2V0QXR0cmlidXRlKFwiZHJhZ2dhYmxlXCIpICE9PSBcImZhbHNlXCIpXG5cdFx0KSB7XG5cdFx0XHRpZiAod2luZG93LnN1cGVya2V5ZG93bikgZS5wcmV2ZW50RGVmYXVsdCgpO1xuXHRcdH1cblxuXHRcdGlmICh3aW5kb3cuc3VwZXJrZXlkb3duICYmIGN1cnJlbnRfbW91c2VfYnV0dG9uID09PSAyKSB7XG5cdFx0XHRlLnByZXZlbnREZWZhdWx0KCk7XG5cblx0XHRcdC8vIFN0YXJ0IHJlc2l6aW5nIHdpdGggcmlnaHQgY2xpY2tcblx0XHRcdGlzX3JpZ2h0X3Jlc2l6ZSA9IHRydWU7XG5cdFx0XHRkcmFnZ2VkX2FwcGxldCA9IGFwcGxldDtcblxuXHRcdFx0Ly8gU3RvcmUgaW5pdGlhbCBkaW1lbnNpb25zIGFuZCBtb3VzZSBwb3NpdGlvblxuXHRcdFx0cmVzaXplX3N0YXJ0X3dpZHRoID0gYXBwbGV0Lm9mZnNldFdpZHRoO1xuXHRcdFx0cmVzaXplX3N0YXJ0X2hlaWdodCA9IGFwcGxldC5vZmZzZXRIZWlnaHQ7XG5cdFx0XHRyZXNpemVfc3RhcnRfeCA9IGUuY2xpZW50WDtcblx0XHRcdHJlc2l6ZV9zdGFydF95ID0gZS5jbGllbnRZO1xuXHRcdFx0cmVzaXplX3N0YXJ0X2xlZnQgPSBwYXJzZUludChhcHBsZXQuc3R5bGUubGVmdCkgfHwgMDtcblx0XHRcdHJlc2l6ZV9zdGFydF90b3AgPSBwYXJzZUludChhcHBsZXQuc3R5bGUudG9wKSB8fCAwO1xuXG5cdFx0XHQvLyBEZXRlcm1pbmUgd2hpY2ggcXVhZHJhbnQgdGhlIGNsaWNrIGhhcHBlbmVkIGluXG5cdFx0XHRjb25zdCBhcHBsZXRfcmVjdCA9IGFwcGxldC5nZXRCb3VuZGluZ0NsaWVudFJlY3QoKTtcblx0XHRcdGNvbnN0IGNsaWNrX3ggPSBlLmNsaWVudFg7XG5cdFx0XHRjb25zdCBjbGlja195ID0gZS5jbGllbnRZO1xuXG5cdFx0XHQvLyBDYWxjdWxhdGUgcmVsYXRpdmUgcG9zaXRpb24gd2l0aGluIHRoZSBhcHBsZXRcblx0XHRcdGNvbnN0IHJlbGF0aXZlX3ggPSAoY2xpY2tfeCAtIGFwcGxldF9yZWN0LmxlZnQpIC8gYXBwbGV0X3JlY3Qud2lkdGg7XG5cdFx0XHRjb25zdCByZWxhdGl2ZV95ID0gKGNsaWNrX3kgLSBhcHBsZXRfcmVjdC50b3ApIC8gYXBwbGV0X3JlY3QuaGVpZ2h0O1xuXG5cdFx0XHQvLyBEZXRlcm1pbmUgcXVhZHJhbnQgKHRsLCB0ciwgYmwsIGJyKVxuXHRcdFx0aWYgKHJlbGF0aXZlX3ggPCAwLjUpIHtcblx0XHRcdFx0aWYgKHJlbGF0aXZlX3kgPCAwLjUpIHtcblx0XHRcdFx0XHRyZXNpemVfcXVhZHJhbnQgPSBcInRsXCI7IC8vIHRvcC1sZWZ0XG5cdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0cmVzaXplX3F1YWRyYW50ID0gXCJibFwiOyAvLyBib3R0b20tbGVmdFxuXHRcdFx0XHR9XG5cdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRpZiAocmVsYXRpdmVfeSA8IDAuNSkge1xuXHRcdFx0XHRcdHJlc2l6ZV9xdWFkcmFudCA9IFwidHJcIjsgLy8gdG9wLXJpZ2h0XG5cdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0cmVzaXplX3F1YWRyYW50ID0gXCJiclwiOyAvLyBib3R0b20tcmlnaHRcblx0XHRcdFx0fVxuXHRcdFx0fVxuXG5cdFx0XHQvLyBTZXQgc3R5bGluZyBmb3IgcmVzaXplIG9wZXJhdGlvblxuXHRcdFx0YXBwbGV0LnN0eWxlLndpbGxDaGFuZ2UgPSBcIndpZHRoLCBoZWlnaHQsIGxlZnQsIHRvcFwiO1xuXG5cdFx0XHQvLyBMaWZ0IHRoZSBhcHBsZXQgdG8gdGhlIHRvcFxuXHRcdFx0Y29uc3QgdHNpZCA9IGFwcGxldC5nZXRBdHRyaWJ1dGUoXCJvbS10c2lkXCIpO1xuXHRcdFx0bGlmdCh0c2lkKTtcblx0XHR9IGVsc2UgaWYgKCh3aW5kb3cuc3VwZXJrZXlkb3duIHx8IGlzX2RyYWdfaGFuZGxlKSAmJiBjdXJyZW50X21vdXNlX2J1dHRvbiA9PT0gMCkge1xuXHRcdFx0ZG9jdW1lbnQuYm9keS5jbGFzc0xpc3QuYWRkKFwiaXMtZHJhZ2dpbmdcIik7XG5cdFx0XHRsZXQgeCA9IE51bWJlcihhcHBsZXQuc3R5bGUubGVmdC5yZXBsYWNlKFwicHhcIiwgXCJcIikpO1xuXHRcdFx0bGV0IHkgPSBOdW1iZXIoYXBwbGV0LnN0eWxlLnRvcC5yZXBsYWNlKFwicHhcIiwgXCJcIikpO1xuXG5cdFx0XHRkcmFnZ2luZ194ID0geDtcblx0XHRcdGRyYWdnaW5nX3kgPSB5O1xuXHRcdFx0bGFzdF9tb3VzZV94ID0gZS5jbGllbnRYO1xuXHRcdFx0bGFzdF9tb3VzZV95ID0gZS5jbGllbnRZO1xuXG5cdFx0XHRhcHBsZXQuc3R5bGUud2lsbENoYW5nZSA9IFwiZmlsdGVyLCB0cmFuc2Zvcm0sIGxlZnQsIHRvcFwiO1xuXG5cdFx0XHRjb25zdCB0c2lkID0gYXBwbGV0LmdldEF0dHJpYnV0ZShcIm9tLXRzaWRcIik7XG5cdFx0XHRsaWZ0KHRzaWQpO1xuXHRcdFx0YXdhaXQgZmluaXNoKCk7XG5cdFx0XHRhcHBsZXQuc3R5bGUubGVmdCA9IFwiMFwiO1xuXHRcdFx0YXBwbGV0LnN0eWxlLnRvcCA9IFwiMFwiO1xuXHRcdFx0YXBwbGV0LnNldEF0dHJpYnV0ZShcIm9tLW1vdGlvblwiLCBcImVsZXZhdGVkXCIpO1xuXHRcdFx0YXBwbGV0LnN0eWxlLnRyYW5zZm9ybSA9IGB0cmFuc2xhdGUoJHt4fXB4LCAke3l9cHgpIHRyYW5zbGF0ZVooMCkgc2NhbGUoMS4wMSlgO1xuXG5cdFx0XHRkcmFnZ2VkX2FwcGxldCA9IGFwcGxldDtcblx0XHR9XG5cblx0XHR3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcihcIm1vdXNlbW92ZVwiLCBoYW5kbGVNb3VzZU1vdmUpO1xuXHRcdHdpbmRvdy5hZGRFdmVudExpc3RlbmVyKFwibW91c2V1cFwiLCBoYW5kbGVNb3VzZVVwKTtcblx0fVxuXG5cdGFkZF9yZXNpemVfaGFuZGxlcyhhcHBsZXQpO1xuXG5cdGZ1bmN0aW9uIGFkZF9yZXNpemVfaGFuZGxlcyhhcHBsZXQpIHtcblx0XHRjb25zdCBlZGdlcyA9IFtcblx0XHRcdFwiblwiLFxuXHRcdFx0XCJlXCIsXG5cdFx0XHRcInNcIixcblx0XHRcdFwid1wiLCAvLyBzaWRlc1xuXHRcdFx0XCJuZVwiLFxuXHRcdFx0XCJzZVwiLFxuXHRcdFx0XCJzd1wiLFxuXHRcdFx0XCJud1wiLCAvLyBjb3JuZXJzXG5cdFx0XTtcblxuXHRcdGVkZ2VzLmZvckVhY2goKGVkZ2UpID0+IHtcblx0XHRcdGNvbnN0IGhhbmRsZSA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJkaXZcIik7XG5cdFx0XHRoYW5kbGUuY2xhc3NOYW1lID0gYHJlc2l6ZS1oYW5kbGUgcmVzaXplLSR7ZWRnZX1gO1xuXHRcdFx0aGFuZGxlLnN0eWxlLnBvc2l0aW9uID0gXCJhYnNvbHV0ZVwiO1xuXG5cdFx0XHQvLyBTZXQgcG9zaXRpb25pbmcgYW5kIGRpbWVuc2lvbnMgZm9yIGVhY2ggaGFuZGxlXG5cdFx0XHRzd2l0Y2ggKGVkZ2UpIHtcblx0XHRcdFx0Y2FzZSBcIm5cIjpcblx0XHRcdFx0XHRoYW5kbGUuc3R5bGUudG9wID0gYCR7SEFORExFX0NPTkZJRy5PRkZTRVR9cHhgO1xuXHRcdFx0XHRcdGhhbmRsZS5zdHlsZS5sZWZ0ID0gXCIwXCI7XG5cdFx0XHRcdFx0aGFuZGxlLnN0eWxlLnJpZ2h0ID0gXCIwXCI7XG5cdFx0XHRcdFx0aGFuZGxlLnN0eWxlLmhlaWdodCA9IGAke0hBTkRMRV9DT05GSUcuRURHRV9TSVpFfXB4YDtcblx0XHRcdFx0XHRoYW5kbGUuc3R5bGUuY3Vyc29yID0gXCJuLXJlc2l6ZVwiO1xuXHRcdFx0XHRcdGJyZWFrO1xuXHRcdFx0XHRjYXNlIFwic1wiOlxuXHRcdFx0XHRcdGhhbmRsZS5zdHlsZS5ib3R0b20gPSBgJHtIQU5ETEVfQ09ORklHLk9GRlNFVH1weGA7XG5cdFx0XHRcdFx0aGFuZGxlLnN0eWxlLmxlZnQgPSBcIjBcIjtcblx0XHRcdFx0XHRoYW5kbGUuc3R5bGUucmlnaHQgPSBcIjBcIjtcblx0XHRcdFx0XHRoYW5kbGUuc3R5bGUuaGVpZ2h0ID0gYCR7SEFORExFX0NPTkZJRy5FREdFX1NJWkV9cHhgO1xuXHRcdFx0XHRcdGhhbmRsZS5zdHlsZS5jdXJzb3IgPSBcInMtcmVzaXplXCI7XG5cdFx0XHRcdFx0YnJlYWs7XG5cdFx0XHRcdGNhc2UgXCJlXCI6XG5cdFx0XHRcdFx0aGFuZGxlLnN0eWxlLnJpZ2h0ID0gYCR7SEFORExFX0NPTkZJRy5PRkZTRVR9cHhgO1xuXHRcdFx0XHRcdGhhbmRsZS5zdHlsZS50b3AgPSBcIjBcIjtcblx0XHRcdFx0XHRoYW5kbGUuc3R5bGUuYm90dG9tID0gXCIwXCI7XG5cdFx0XHRcdFx0aGFuZGxlLnN0eWxlLndpZHRoID0gYCR7SEFORExFX0NPTkZJRy5FREdFX1NJWkV9cHhgO1xuXHRcdFx0XHRcdGhhbmRsZS5zdHlsZS5jdXJzb3IgPSBcImUtcmVzaXplXCI7XG5cdFx0XHRcdFx0YnJlYWs7XG5cdFx0XHRcdGNhc2UgXCJ3XCI6XG5cdFx0XHRcdFx0aGFuZGxlLnN0eWxlLmxlZnQgPSBgJHtIQU5ETEVfQ09ORklHLk9GRlNFVH1weGA7XG5cdFx0XHRcdFx0aGFuZGxlLnN0eWxlLnRvcCA9IFwiMFwiO1xuXHRcdFx0XHRcdGhhbmRsZS5zdHlsZS5ib3R0b20gPSBcIjBcIjtcblx0XHRcdFx0XHRoYW5kbGUuc3R5bGUud2lkdGggPSBgJHtIQU5ETEVfQ09ORklHLkVER0VfU0laRX1weGA7XG5cdFx0XHRcdFx0aGFuZGxlLnN0eWxlLmN1cnNvciA9IFwidy1yZXNpemVcIjtcblx0XHRcdFx0XHRicmVhaztcblx0XHRcdFx0Y2FzZSBcIm5lXCI6XG5cdFx0XHRcdFx0aGFuZGxlLnN0eWxlLnRvcCA9IGAke0hBTkRMRV9DT05GSUcuT0ZGU0VUfXB4YDtcblx0XHRcdFx0XHRoYW5kbGUuc3R5bGUucmlnaHQgPSBgJHtIQU5ETEVfQ09ORklHLk9GRlNFVH1weGA7XG5cdFx0XHRcdFx0aGFuZGxlLnN0eWxlLndpZHRoID0gYCR7SEFORExFX0NPTkZJRy5DT1JORVJfU0laRX1weGA7XG5cdFx0XHRcdFx0aGFuZGxlLnN0eWxlLmhlaWdodCA9IGAke0hBTkRMRV9DT05GSUcuQ09STkVSX1NJWkV9cHhgO1xuXHRcdFx0XHRcdGhhbmRsZS5zdHlsZS5jdXJzb3IgPSBcIm5lLXJlc2l6ZVwiO1xuXHRcdFx0XHRcdGJyZWFrO1xuXHRcdFx0XHRjYXNlIFwic2VcIjpcblx0XHRcdFx0XHRoYW5kbGUuc3R5bGUuYm90dG9tID0gYCR7SEFORExFX0NPTkZJRy5PRkZTRVR9cHhgO1xuXHRcdFx0XHRcdGhhbmRsZS5zdHlsZS5yaWdodCA9IGAke0hBTkRMRV9DT05GSUcuT0ZGU0VUfXB4YDtcblx0XHRcdFx0XHRoYW5kbGUuc3R5bGUud2lkdGggPSBgJHtIQU5ETEVfQ09ORklHLkNPUk5FUl9TSVpFfXB4YDtcblx0XHRcdFx0XHRoYW5kbGUuc3R5bGUuaGVpZ2h0ID0gYCR7SEFORExFX0NPTkZJRy5DT1JORVJfU0laRX1weGA7XG5cdFx0XHRcdFx0aGFuZGxlLnN0eWxlLmN1cnNvciA9IFwic2UtcmVzaXplXCI7XG5cdFx0XHRcdFx0YnJlYWs7XG5cdFx0XHRcdGNhc2UgXCJzd1wiOlxuXHRcdFx0XHRcdGhhbmRsZS5zdHlsZS5ib3R0b20gPSBgJHtIQU5ETEVfQ09ORklHLk9GRlNFVH1weGA7XG5cdFx0XHRcdFx0aGFuZGxlLnN0eWxlLmxlZnQgPSBgJHtIQU5ETEVfQ09ORklHLk9GRlNFVH1weGA7XG5cdFx0XHRcdFx0aGFuZGxlLnN0eWxlLndpZHRoID0gYCR7SEFORExFX0NPTkZJRy5DT1JORVJfU0laRX1weGA7XG5cdFx0XHRcdFx0aGFuZGxlLnN0eWxlLmhlaWdodCA9IGAke0hBTkRMRV9DT05GSUcuQ09STkVSX1NJWkV9cHhgO1xuXHRcdFx0XHRcdGhhbmRsZS5zdHlsZS5jdXJzb3IgPSBcInN3LXJlc2l6ZVwiO1xuXHRcdFx0XHRcdGJyZWFrO1xuXHRcdFx0XHRjYXNlIFwibndcIjpcblx0XHRcdFx0XHRoYW5kbGUuc3R5bGUudG9wID0gYCR7SEFORExFX0NPTkZJRy5PRkZTRVR9cHhgO1xuXHRcdFx0XHRcdGhhbmRsZS5zdHlsZS5sZWZ0ID0gYCR7SEFORExFX0NPTkZJRy5PRkZTRVR9cHhgO1xuXHRcdFx0XHRcdGhhbmRsZS5zdHlsZS53aWR0aCA9IGAke0hBTkRMRV9DT05GSUcuQ09STkVSX1NJWkV9cHhgO1xuXHRcdFx0XHRcdGhhbmRsZS5zdHlsZS5oZWlnaHQgPSBgJHtIQU5ETEVfQ09ORklHLkNPUk5FUl9TSVpFfXB4YDtcblx0XHRcdFx0XHRoYW5kbGUuc3R5bGUuY3Vyc29yID0gXCJudy1yZXNpemVcIjtcblx0XHRcdFx0XHRicmVhaztcblx0XHRcdH1cblxuXHRcdFx0aGFuZGxlLmFkZEV2ZW50TGlzdGVuZXIoXCJtb3VzZWRvd25cIiwgKGUpID0+IHtcblx0XHRcdFx0aWYgKGUuYnV0dG9uICE9PSAwKSByZXR1cm47XG5cblx0XHRcdFx0ZS5wcmV2ZW50RGVmYXVsdCgpO1xuXHRcdFx0XHRlLnN0b3BQcm9wYWdhdGlvbigpO1xuXG5cdFx0XHRcdGlzX3Jlc2l6aW5nID0gdHJ1ZTtcblx0XHRcdFx0Y29uc3QgZXYgPSBuZXcgQ3VzdG9tRXZlbnQoXCJhcHBsZXQtcmVzaXplLXN0YXJ0XCIsIHsgZGV0YWlsOiB7IGFwcGxldCB9IH0pO1xuXHRcdFx0XHR3aW5kb3cuZGlzcGF0Y2hFdmVudChldik7XG5cdFx0XHRcdGFwcGxldC5zZXRBdHRyaWJ1dGUoXCJvbS1tb3Rpb25cIiwgXCJyZXNpemluZ1wiKTtcblx0XHRcdFx0ZG9jdW1lbnQuYm9keS5jbGFzc0xpc3QuYWRkKFwiaXMtcmVzaXppbmdcIik7XG5cdFx0XHRcdHJlc2l6ZV9lZGdlID0gZWRnZTtcblx0XHRcdFx0ZHJhZ2dlZF9hcHBsZXQgPSBhcHBsZXQ7XG5cblx0XHRcdFx0Ly8gU3RvcmUgaW5pdGlhbCBwb3NpdGlvbnMgY29uc2lkZXJpbmcgc2NhbGVcblx0XHRcdFx0bGFzdF9tb3VzZV94ID0gZS5jbGllbnRYO1xuXHRcdFx0XHRsYXN0X21vdXNlX3kgPSBlLmNsaWVudFk7XG5cdFx0XHRcdGxhc3Rfd2lkdGggPSBhcHBsZXQub2Zmc2V0V2lkdGg7XG5cdFx0XHRcdGxhc3RfaGVpZ2h0ID0gYXBwbGV0Lm9mZnNldEhlaWdodDtcblx0XHRcdFx0bGFzdF9sZWZ0ID0gcGFyc2VJbnQoYXBwbGV0LnN0eWxlLmxlZnQpIHx8IDA7XG5cdFx0XHRcdGxhc3RfdG9wID0gcGFyc2VJbnQoYXBwbGV0LnN0eWxlLnRvcCkgfHwgMDtcblxuXHRcdFx0XHR3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcihcIm1vdXNlbW92ZVwiLCBoYW5kbGVSZXNpemUpO1xuXHRcdFx0XHR3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcihcIm1vdXNldXBcIiwgc3RvcFJlc2l6ZSk7XG5cdFx0XHR9KTtcblxuXHRcdFx0YXBwbGV0LmFwcGVuZENoaWxkKGhhbmRsZSk7XG5cdFx0fSk7XG5cdH1cbn1cblxuZnVuY3Rpb24gaGFuZGxlUmVzaXplKGUpIHtcblx0aWYgKCFpc19yZXNpemluZyB8fCAhZHJhZ2dlZF9hcHBsZXQpIHJldHVybjtcblxuXHRjb25zdCBkeCA9IChlLmNsaWVudFggLSBsYXN0X21vdXNlX3gpIC8gY3VycmVudF9zY2FsZTtcblx0Y29uc3QgZHkgPSAoZS5jbGllbnRZIC0gbGFzdF9tb3VzZV95KSAvIGN1cnJlbnRfc2NhbGU7XG5cblx0Ly8gR2V0IGNvbXB1dGVkIHN0eWxlIHRvIHJlc3BlY3QgbWluLXdpZHRoIGFuZCBtaW4taGVpZ2h0IENTUyBwcm9wZXJ0aWVzXG5cdGNvbnN0IGNvbXB1dGVkX3N0eWxlID0gd2luZG93LmdldENvbXB1dGVkU3R5bGUoZHJhZ2dlZF9hcHBsZXQpO1xuXHRjb25zdCBjc3NfbWluX3dpZHRoID0gcGFyc2VGbG9hdChjb21wdXRlZF9zdHlsZS5taW5XaWR0aCkgfHwgbWluX3dpZHRoO1xuXHRjb25zdCBjc3NfbWluX2hlaWdodCA9IHBhcnNlRmxvYXQoY29tcHV0ZWRfc3R5bGUubWluSGVpZ2h0KSB8fCBtaW5faGVpZ2h0O1xuXG5cdGxldCBuZXdfd2lkdGggPSBsYXN0X3dpZHRoO1xuXHRsZXQgbmV3X2hlaWdodCA9IGxhc3RfaGVpZ2h0O1xuXHRsZXQgbmV3X2xlZnQgPSBsYXN0X2xlZnQ7XG5cdGxldCBuZXdfdG9wID0gbGFzdF90b3A7XG5cblx0aWYgKHJlc2l6ZV9lZGdlLmluY2x1ZGVzKFwiZVwiKSkge1xuXHRcdG5ld193aWR0aCA9IE1hdGgubWF4KGNzc19taW5fd2lkdGgsIGxhc3Rfd2lkdGggKyBkeCk7XG5cdH1cblx0aWYgKHJlc2l6ZV9lZGdlLmluY2x1ZGVzKFwid1wiKSkge1xuXHRcdGNvbnN0IG1heF9kZWx0YSA9IGxhc3Rfd2lkdGggLSBjc3NfbWluX3dpZHRoO1xuXHRcdGNvbnN0IHdpZHRoX2RlbHRhID0gTWF0aC5taW4oZHgsIG1heF9kZWx0YSk7XG5cdFx0bmV3X3dpZHRoID0gbGFzdF93aWR0aCAtIHdpZHRoX2RlbHRhO1xuXHRcdG5ld19sZWZ0ID0gbGFzdF9sZWZ0ICsgd2lkdGhfZGVsdGE7XG5cdH1cblx0aWYgKHJlc2l6ZV9lZGdlLmluY2x1ZGVzKFwic1wiKSkge1xuXHRcdG5ld19oZWlnaHQgPSBNYXRoLm1heChjc3NfbWluX2hlaWdodCwgbGFzdF9oZWlnaHQgKyBkeSk7XG5cdH1cblx0aWYgKHJlc2l6ZV9lZGdlLmluY2x1ZGVzKFwiblwiKSkge1xuXHRcdGNvbnN0IG1heF9kZWx0YSA9IGxhc3RfaGVpZ2h0IC0gY3NzX21pbl9oZWlnaHQ7XG5cdFx0Y29uc3QgaGVpZ2h0X2RlbHRhID0gTWF0aC5taW4oZHksIG1heF9kZWx0YSk7XG5cdFx0bmV3X2hlaWdodCA9IGxhc3RfaGVpZ2h0IC0gaGVpZ2h0X2RlbHRhO1xuXHRcdG5ld190b3AgPSBsYXN0X3RvcCArIGhlaWdodF9kZWx0YTtcblx0fVxuXG5cdGRyYWdnZWRfYXBwbGV0LnN0eWxlLndpZHRoID0gYCR7bmV3X3dpZHRofXB4YDtcblx0ZHJhZ2dlZF9hcHBsZXQuc3R5bGUuaGVpZ2h0ID0gYCR7bmV3X2hlaWdodH1weGA7XG5cdGRyYWdnZWRfYXBwbGV0LnN0eWxlLmxlZnQgPSBgJHtuZXdfbGVmdH1weGA7XG5cdGRyYWdnZWRfYXBwbGV0LnN0eWxlLnRvcCA9IGAke25ld190b3B9cHhgO1xufVxuXG5mdW5jdGlvbiBzdG9wUmVzaXplKCkge1xuXHRpZiAoaXNfcmVzaXppbmcpIHtcblx0XHRpc19yZXNpemluZyA9IGZhbHNlO1xuXHRcdGNvbnN0IGV2ID0gbmV3IEN1c3RvbUV2ZW50KFwiYXBwbGV0LXJlc2l6ZS1zdG9wXCIsIHsgZGV0YWlsOiB7IGFwcGxldDogZHJhZ2dlZF9hcHBsZXQgfSB9KTtcblx0XHR3aW5kb3cuZGlzcGF0Y2hFdmVudChldik7XG5cdFx0ZHJhZ2dlZF9hcHBsZXQuc2V0QXR0cmlidXRlKFwib20tbW90aW9uXCIsIFwiaWRsZVwiKTtcblx0XHRkb2N1bWVudC5ib2R5LmNsYXNzTGlzdC5yZW1vdmUoXCJpcy1yZXNpemluZ1wiKTtcblx0XHRyZXNpemVfZWRnZSA9IG51bGw7XG5cdFx0ZHJhZ2dlZF9hcHBsZXQgPSBudWxsO1xuXHRcdHdpbmRvdy5yZW1vdmVFdmVudExpc3RlbmVyKFwibW91c2Vtb3ZlXCIsIGhhbmRsZVJlc2l6ZSk7XG5cdFx0d2luZG93LnJlbW92ZUV2ZW50TGlzdGVuZXIoXCJtb3VzZXVwXCIsIHN0b3BSZXNpemUpO1xuXHRcdHNhdmUoKTtcblx0fVxufVxuXG5hc3luYyBmdW5jdGlvbiBoYW5kbGVNb3VzZU1vdmUoZSkge1xuXHQvLyBIYW5kbGUgcmVndWxhciBkcmFnIG9wZXJhdGlvblxuXHRpZiAoY3VycmVudF9tb3VzZV9idXR0b24gPT09IDApIHtcblx0XHQvLyBFeGlzdGluZyBkcmFnIGNvZGVcblx0XHRkZWx0YV94ID0gKGxhc3RfbW91c2VfeCAtIGUuY2xpZW50WCkgLyBjdXJyZW50X3NjYWxlO1xuXHRcdGRlbHRhX3kgPSAobGFzdF9tb3VzZV95IC0gZS5jbGllbnRZKSAvIGN1cnJlbnRfc2NhbGU7XG5cdFx0bGFzdF9tb3VzZV94ID0gZS5jbGllbnRYO1xuXHRcdGxhc3RfbW91c2VfeSA9IGUuY2xpZW50WTtcblxuXHRcdGRyYWdnaW5nX3ggPSBkcmFnZ2luZ194IC0gZGVsdGFfeDtcblx0XHRkcmFnZ2luZ195ID0gZHJhZ2dpbmdfeSAtIGRlbHRhX3k7XG5cblx0XHRpZiAoZHJhZ2dlZF9hcHBsZXQgJiYgIWUuc2hpZnRLZXkpIHtcblx0XHRcdGRyYWdnZWRfYXBwbGV0LnN0eWxlLnRyYW5zZm9ybSA9IGB0cmFuc2xhdGUoJHtkcmFnZ2luZ194fXB4LCAke2RyYWdnaW5nX3l9cHgpIHRyYW5zbGF0ZVooMCkgc2NhbGUoMS4wMSlgO1xuXHRcdH0gZWxzZSBpZiAoZHJhZ2dlZF9hcHBsZXQgJiYgZS5zaGlmdEtleSkge1xuXHRcdFx0ZHJhZ2dlZF9hcHBsZXQuc3R5bGUubGVmdCA9IGAke2RyYWdnaW5nX3h9cHhgO1xuXHRcdFx0ZHJhZ2dlZF9hcHBsZXQuc3R5bGUudG9wID0gYCR7ZHJhZ2dpbmdfeX1weGA7XG5cdFx0fVxuXHR9XG5cdC8vIEhhbmRsZSByaWdodC1jbGljayByZXNpemUgb3BlcmF0aW9uIHdpdGggcXVhZHJhbnRzXG5cdGVsc2UgaWYgKGN1cnJlbnRfbW91c2VfYnV0dG9uID09PSAyICYmIGlzX3JpZ2h0X3Jlc2l6ZSAmJiBkcmFnZ2VkX2FwcGxldCkge1xuXHRcdC8vIENhbGN1bGF0ZSBob3cgbXVjaCB0aGUgbW91c2UgaGFzIG1vdmVkIHNpbmNlIHN0YXJ0aW5nIHRoZSByZXNpemVcblx0XHRjb25zdCBkeCA9IChlLmNsaWVudFggLSByZXNpemVfc3RhcnRfeCkgLyBjdXJyZW50X3NjYWxlO1xuXHRcdGNvbnN0IGR5ID0gKGUuY2xpZW50WSAtIHJlc2l6ZV9zdGFydF95KSAvIGN1cnJlbnRfc2NhbGU7XG5cblx0XHQvLyBHZXQgY29tcHV0ZWQgc3R5bGUgdG8gcmVzcGVjdCBtaW4td2lkdGggYW5kIG1pbi1oZWlnaHQgQ1NTIHByb3BlcnRpZXNcblx0XHRjb25zdCBjb21wdXRlZF9zdHlsZSA9IHdpbmRvdy5nZXRDb21wdXRlZFN0eWxlKGRyYWdnZWRfYXBwbGV0KTtcblx0XHRjb25zdCBjc3NfbWluX3dpZHRoID0gcGFyc2VGbG9hdChjb21wdXRlZF9zdHlsZS5taW5XaWR0aCkgfHwgbWluX3dpZHRoO1xuXHRcdGNvbnN0IGNzc19taW5faGVpZ2h0ID0gcGFyc2VGbG9hdChjb21wdXRlZF9zdHlsZS5taW5IZWlnaHQpIHx8IG1pbl9oZWlnaHQ7XG5cblx0XHQvLyBJbml0aWFsaXplIG5ldyBkaW1lbnNpb25zIGFuZCBwb3NpdGlvblxuXHRcdGxldCBuZXdfd2lkdGggPSByZXNpemVfc3RhcnRfd2lkdGg7XG5cdFx0bGV0IG5ld19oZWlnaHQgPSByZXNpemVfc3RhcnRfaGVpZ2h0O1xuXHRcdGxldCBuZXdfbGVmdCA9IHJlc2l6ZV9zdGFydF9sZWZ0O1xuXHRcdGxldCBuZXdfdG9wID0gcmVzaXplX3N0YXJ0X3RvcDtcblxuXHRcdC8vIEFwcGx5IGNoYW5nZXMgYmFzZWQgb24gd2hpY2ggcXVhZHJhbnQgdGhlIHJlc2l6ZSBzdGFydGVkIGluXG5cdFx0c3dpdGNoIChyZXNpemVfcXVhZHJhbnQpIHtcblx0XHRcdGNhc2UgXCJiclwiOiAvLyBib3R0b20tcmlnaHRcblx0XHRcdFx0Ly8gSnVzdCBhZGp1c3Qgd2lkdGggYW5kIGhlaWdodFxuXHRcdFx0XHRuZXdfd2lkdGggPSBNYXRoLm1heChjc3NfbWluX3dpZHRoLCByZXNpemVfc3RhcnRfd2lkdGggKyBkeCk7XG5cdFx0XHRcdG5ld19oZWlnaHQgPSBNYXRoLm1heChjc3NfbWluX2hlaWdodCwgcmVzaXplX3N0YXJ0X2hlaWdodCArIGR5KTtcblx0XHRcdFx0YnJlYWs7XG5cblx0XHRcdGNhc2UgXCJibFwiOiAvLyBib3R0b20tbGVmdFxuXHRcdFx0XHQvLyBBZGp1c3Qgd2lkdGggKGludmVyc2VseSkgYW5kIGhlaWdodCwgYW5kIHJlcG9zaXRpb24gbGVmdFxuXHRcdFx0XHRjb25zdCB3aWR0aF9jaGFuZ2VfYmwgPSBNYXRoLm1pbihkeCwgcmVzaXplX3N0YXJ0X3dpZHRoIC0gY3NzX21pbl93aWR0aCk7XG5cdFx0XHRcdG5ld193aWR0aCA9IE1hdGgubWF4KGNzc19taW5fd2lkdGgsIHJlc2l6ZV9zdGFydF93aWR0aCAtIGR4KTtcblx0XHRcdFx0bmV3X2hlaWdodCA9IE1hdGgubWF4KGNzc19taW5faGVpZ2h0LCByZXNpemVfc3RhcnRfaGVpZ2h0ICsgZHkpO1xuXHRcdFx0XHRuZXdfbGVmdCA9IHJlc2l6ZV9zdGFydF9sZWZ0ICsgKHJlc2l6ZV9zdGFydF93aWR0aCAtIG5ld193aWR0aCk7XG5cdFx0XHRcdGJyZWFrO1xuXG5cdFx0XHRjYXNlIFwidHJcIjogLy8gdG9wLXJpZ2h0XG5cdFx0XHRcdC8vIEFkanVzdCB3aWR0aCBhbmQgaGVpZ2h0IChpbnZlcnNlbHkpLCBhbmQgcmVwb3NpdGlvbiB0b3Bcblx0XHRcdFx0bmV3X3dpZHRoID0gTWF0aC5tYXgoY3NzX21pbl93aWR0aCwgcmVzaXplX3N0YXJ0X3dpZHRoICsgZHgpO1xuXHRcdFx0XHRuZXdfaGVpZ2h0ID0gTWF0aC5tYXgoY3NzX21pbl9oZWlnaHQsIHJlc2l6ZV9zdGFydF9oZWlnaHQgLSBkeSk7XG5cdFx0XHRcdG5ld190b3AgPSByZXNpemVfc3RhcnRfdG9wICsgKHJlc2l6ZV9zdGFydF9oZWlnaHQgLSBuZXdfaGVpZ2h0KTtcblx0XHRcdFx0YnJlYWs7XG5cblx0XHRcdGNhc2UgXCJ0bFwiOiAvLyB0b3AtbGVmdFxuXHRcdFx0XHQvLyBBZGp1c3Qgd2lkdGggYW5kIGhlaWdodCAoYm90aCBpbnZlcnNlbHkpLCBhbmQgcmVwb3NpdGlvbiBib3RoXG5cdFx0XHRcdG5ld193aWR0aCA9IE1hdGgubWF4KGNzc19taW5fd2lkdGgsIHJlc2l6ZV9zdGFydF93aWR0aCAtIGR4KTtcblx0XHRcdFx0bmV3X2hlaWdodCA9IE1hdGgubWF4KGNzc19taW5faGVpZ2h0LCByZXNpemVfc3RhcnRfaGVpZ2h0IC0gZHkpO1xuXHRcdFx0XHRuZXdfbGVmdCA9IHJlc2l6ZV9zdGFydF9sZWZ0ICsgKHJlc2l6ZV9zdGFydF93aWR0aCAtIG5ld193aWR0aCk7XG5cdFx0XHRcdG5ld190b3AgPSByZXNpemVfc3RhcnRfdG9wICsgKHJlc2l6ZV9zdGFydF9oZWlnaHQgLSBuZXdfaGVpZ2h0KTtcblx0XHRcdFx0YnJlYWs7XG5cdFx0fVxuXG5cdFx0Ly8gQXBwbHkgdGhlIG5ldyBkaW1lbnNpb25zIGFuZCBwb3NpdGlvblxuXHRcdGRyYWdnZWRfYXBwbGV0LnN0eWxlLndpZHRoID0gYCR7bmV3X3dpZHRofXB4YDtcblx0XHRkcmFnZ2VkX2FwcGxldC5zdHlsZS5oZWlnaHQgPSBgJHtuZXdfaGVpZ2h0fXB4YDtcblx0XHRkcmFnZ2VkX2FwcGxldC5zdHlsZS5sZWZ0ID0gYCR7bmV3X2xlZnR9cHhgO1xuXHRcdGRyYWdnZWRfYXBwbGV0LnN0eWxlLnRvcCA9IGAke25ld190b3B9cHhgO1xuXG5cdFx0Ly8gU2V0IHN0YXRlXG5cdFx0aWYgKCFpc19yZXNpemluZykge1xuXHRcdFx0aXNfcmVzaXppbmcgPSB0cnVlO1xuXHRcdFx0Y29uc3QgZXYgPSBuZXcgQ3VzdG9tRXZlbnQoXCJhcHBsZXQtcmVzaXplLXN0YXJ0XCIsIHsgZGV0YWlsOiB7IGFwcGxldDogZHJhZ2dlZF9hcHBsZXQgfSB9KTtcblx0XHRcdHdpbmRvdy5kaXNwYXRjaEV2ZW50KGV2KTtcblx0XHRcdGRvY3VtZW50LmJvZHkuY2xhc3NMaXN0LmFkZChcImlzLXJlc2l6aW5nXCIpO1xuXHRcdFx0ZHJhZ2dlZF9hcHBsZXQuc2V0QXR0cmlidXRlKFwib20tbW90aW9uXCIsIFwicmVzaXppbmdcIik7XG5cdFx0fVxuXHR9XG59XG5cbmFzeW5jIGZ1bmN0aW9uIGhhbmRsZU1vdXNlVXAoZSkge1xuXHR3aW5kb3cucmVtb3ZlRXZlbnRMaXN0ZW5lcihcIm1vdXNlbW92ZVwiLCBoYW5kbGVNb3VzZU1vdmUpO1xuXHR3aW5kb3cucmVtb3ZlRXZlbnRMaXN0ZW5lcihcIm1vdXNldXBcIiwgaGFuZGxlTW91c2VVcCk7XG5cblx0aWYgKCFkcmFnZ2VkX2FwcGxldCkgcmV0dXJuO1xuXG5cdGlmIChjdXJyZW50X21vdXNlX2J1dHRvbiA9PT0gMCkge1xuXHRcdGRvY3VtZW50LmJvZHkuY2xhc3NMaXN0LnJlbW92ZShcImlzLWRyYWdnaW5nXCIpO1xuXG5cdFx0aWYgKCFlLnNoaWZ0S2V5KSB7XG5cdFx0XHRkcmFnZ2VkX2FwcGxldC5zdHlsZS5sZWZ0ID0gYCR7ZHJhZ2dpbmdfeH1weGA7XG5cdFx0XHRkcmFnZ2VkX2FwcGxldC5zdHlsZS50b3AgPSBgJHtkcmFnZ2luZ195fXB4YDtcblx0XHRcdGRyYWdnZWRfYXBwbGV0LnN0eWxlLnJlbW92ZVByb3BlcnR5KFwidHJhbnNmb3JtXCIpO1xuXHRcdFx0ZHJhZ2dlZF9hcHBsZXQuc3R5bGUucmVtb3ZlUHJvcGVydHkoXCJ3aWxsLWNoYW5nZVwiKTtcblx0XHRcdGF3YWl0IGZpbmlzaCgpO1xuXHRcdFx0ZHJhZ2dlZF9hcHBsZXQuc3R5bGUucmVtb3ZlUHJvcGVydHkoXCJ0cmFuc2l0aW9uXCIpO1xuXHRcdFx0YXdhaXQgZmluaXNoKCk7XG5cdFx0XHRkcmFnZ2VkX2FwcGxldC5zZXRBdHRyaWJ1dGUoXCJvbS1tb3Rpb25cIiwgXCJpZGxlXCIpO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHRkcmFnZ2VkX2FwcGxldC5zdHlsZS5yZW1vdmVQcm9wZXJ0eShcIndpbGwtY2hhbmdlXCIpO1xuXHRcdH1cblx0fVxuXHQvLyBIYW5kbGUgY29tcGxldGlvbiBvZiByaWdodC1jbGljayByZXNpemVcblx0ZWxzZSBpZiAoY3VycmVudF9tb3VzZV9idXR0b24gPT09IDIgJiYgaXNfcmlnaHRfcmVzaXplKSB7XG5cdFx0Ly8gQ2xlYW4gdXBcblx0XHRpc19yZXNpemluZyA9IGZhbHNlO1xuXHRcdGlzX3JpZ2h0X3Jlc2l6ZSA9IGZhbHNlO1xuXHRcdGNvbnN0IGV2ID0gbmV3IEN1c3RvbUV2ZW50KFwiYXBwbGV0LXJlc2l6ZS1zdG9wXCIsIHsgZGV0YWlsOiB7IGFwcGxldDogZHJhZ2dlZF9hcHBsZXQgfSB9KTtcblx0XHR3aW5kb3cuZGlzcGF0Y2hFdmVudChldik7XG5cdFx0cmVzaXplX3F1YWRyYW50ID0gbnVsbDtcblx0XHRkcmFnZ2VkX2FwcGxldC5zdHlsZS5yZW1vdmVQcm9wZXJ0eShcIndpbGwtY2hhbmdlXCIpO1xuXHRcdGRyYWdnZWRfYXBwbGV0LnNldEF0dHJpYnV0ZShcIm9tLW1vdGlvblwiLCBcImlkbGVcIik7XG5cdFx0ZG9jdW1lbnQuYm9keS5jbGFzc0xpc3QucmVtb3ZlKFwiaXMtcmVzaXppbmdcIik7XG5cdH1cblxuXHRpZiAoY3VycmVudF9tb3VzZV9idXR0b24gPT09IDAgfHwgY3VycmVudF9tb3VzZV9idXR0b24gPT09IDIpIHtcblx0XHRzYXZlKCk7XG5cdH1cblxuXHRkcmFnZ2VkX2FwcGxldCA9IG51bGw7XG59XG5cbmZ1bmN0aW9uIHByZXZlbnRDb250ZXh0TWVudShlKSB7XG5cdGlmICgoZS5tZXRhS2V5IHx8IGUuY3RybEtleSkgJiYgZS5idXR0b24gPT09IDIpIHtcblx0XHRlLnByZXZlbnREZWZhdWx0KCk7XG5cdFx0cmV0dXJuIGZhbHNlO1xuXHR9XG5cdHJldHVybiB0cnVlO1xufVxuIiwKICAgICJmdW5jdGlvbiBzZXRfc3VwZXJrZXlfc3RhdGUoc3RhdGUpIHtcblx0aWYgKHN0YXRlKSB7XG5cdFx0d2luZG93LnN1cGVya2V5ZG93biA9IHRydWU7XG5cdFx0Y29uc3QgZXYgPSBuZXcgQ3VzdG9tRXZlbnQoXCJzdXBlcmtleWRvd25cIik7XG5cdFx0d2luZG93LmRpc3BhdGNoRXZlbnQoZXYpO1xuXHRcdGRvY3VtZW50LmJvZHkuY2xhc3NMaXN0LmFkZChcInN1cGVyLWtleS1kb3duXCIpO1xuXHR9IGVsc2Uge1xuXHRcdHdpbmRvdy5zdXBlcmtleWRvd24gPSBmYWxzZTtcblx0XHRjb25zdCBldiA9IG5ldyBDdXN0b21FdmVudChcInN1cGVya2V5dXBcIik7XG5cdFx0d2luZG93LmRpc3BhdGNoRXZlbnQoZXYpO1xuXHRcdGRvY3VtZW50LmJvZHkuY2xhc3NMaXN0LnJlbW92ZShcInN1cGVyLWtleS1kb3duXCIpO1xuXHR9XG59XG5cbmZ1bmN0aW9uIGhhbmRsZV9zdXBlcmtleV9kb3duKGUpIHtcblx0aWYgKGUua2V5ID09PSBcIkFsdFwiIHx8IGUuZGV0YWlsLmtleSA9PT0gXCJBbHRcIikge1xuXHRcdHNldF9zdXBlcmtleV9zdGF0ZSh0cnVlKTtcblx0fVxufVxuXG5mdW5jdGlvbiBoYW5kbGVfc3VwZXJrZXlfdXAoZSkge1xuXHRpZiAoIWUua2V5IHx8IGUua2V5ID09PSBcIkFsdFwiKSB7XG5cdFx0c2V0X3N1cGVya2V5X3N0YXRlKGZhbHNlKTtcblx0fVxufVxuXG4vLyBIYW5kbGUgd2luZG93IGJsdXIgZXZlbnQgdG8gY2F0Y2ggY2FzZXMgd2hlcmUgd2luZG93IGxvc2VzIGZvY3VzXG5mdW5jdGlvbiBoYW5kbGVfd2luZG93X2JsdXIoKSB7XG5cdC8vIFdoZW4gd2luZG93IGxvc2VzIGZvY3VzLCBhc3N1bWUgQWx0IGtleSBpcyByZWxlYXNlZFxuXHRzZXRfc3VwZXJrZXlfc3RhdGUoZmFsc2UpO1xufVxuXG4vLyBIYW5kbGUgdmlzaWJpbGl0eSBjaGFuZ2UgZm9yIHRhYiBzd2l0Y2hpbmcgb3IgbWluaW1pemluZ1xuZnVuY3Rpb24gaGFuZGxlX3Zpc2liaWxpdHlfY2hhbmdlKCkge1xuXHRpZiAoZG9jdW1lbnQuaGlkZGVuKSB7XG5cdFx0Ly8gV2hlbiB0YWIgYmVjb21lcyBoaWRkZW4sIGFzc3VtZSBBbHQga2V5IGlzIHJlbGVhc2VkXG5cdFx0c2V0X3N1cGVya2V5X3N0YXRlKGZhbHNlKTtcblx0fVxufVxuXG5mdW5jdGlvbiBoYW5kbGVfd2Vidmlld192aXNpYmlsaXR5X2NoYW5nZShlKSB7XG5cdGlmIChlLmRldGFpbC5oaWRkZW4gJiYgZG9jdW1lbnQuaGlkZGVuKSB7XG5cdFx0Ly8gV2hlbiB0YWIgYmVjb21lcyBoaWRkZW4sIGFzc3VtZSBBbHQga2V5IGlzIHJlbGVhc2VkXG5cdFx0c2V0X3N1cGVya2V5X3N0YXRlKGZhbHNlKTtcblx0fVxufVxuXG5mdW5jdGlvbiBoYW5kbGVfd2Vidmlld19ibHVyKCkge1xuXHQvLyBjaGVjayBpZiB3aW5kb3cgaXMgZm9jdXNlZFxuXHRpZiAoIWRvY3VtZW50Lmhhc0ZvY3VzKCkpIHtcblx0XHQvLyBXaGVuIHdpbmRvdyBsb3NlcyBmb2N1cywgYXNzdW1lIEFsdCBrZXkgaXMgcmVsZWFzZWRcblx0XHRzZXRfc3VwZXJrZXlfc3RhdGUoZmFsc2UpO1xuXHR9XG59XG5cbndpbmRvdy5hZGRFdmVudExpc3RlbmVyKFwia2V5ZG93blwiLCBoYW5kbGVfc3VwZXJrZXlfZG93bik7XG53aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcihcImtleXVwXCIsIGhhbmRsZV9zdXBlcmtleV91cCk7XG53aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcihcIndlYnZpZXcta2V5ZG93blwiLCBoYW5kbGVfc3VwZXJrZXlfZG93bik7XG53aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcihcIndlYnZpZXcta2V5dXBcIiwgaGFuZGxlX3N1cGVya2V5X3VwKTtcbndpbmRvdy5hZGRFdmVudExpc3RlbmVyKFwiYmx1clwiLCBoYW5kbGVfd2luZG93X2JsdXIpO1xuZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcihcInZpc2liaWxpdHljaGFuZ2VcIiwgaGFuZGxlX3Zpc2liaWxpdHlfY2hhbmdlKTtcbndpbmRvdy5hZGRFdmVudExpc3RlbmVyKFwid2Vidmlldy1ibHVyXCIsIGhhbmRsZV93ZWJ2aWV3X2JsdXIpO1xud2luZG93LmFkZEV2ZW50TGlzdGVuZXIoXCJ3ZWJ2aWV3LXZpc2liaWxpdHljaGFuZ2VcIiwgaGFuZGxlX3dlYnZpZXdfdmlzaWJpbGl0eV9jaGFuZ2UpO1xuIiwKICAgICJpbXBvcnQgeyBjc3MsIGZpbmlzaCwgR2xvYmFsU3R5bGVTaGVldCB9IGZyb20gXCIuLi8uLi8uLi9saWIvdXRpbHMuanNcIjtcbmltcG9ydCB7IGdldENhbWVyYUNlbnRlciwgc3VyZmFjZSB9IGZyb20gXCIuLi9kZXNrdG9wLmpzXCI7XG5pbXBvcnQgeyB1c2VUYWdzIH0gZnJvbSBcIi4uLy4uLy4uL2xpYi9pbWEuanNcIjtcbmltcG9ydCBzeXMgZnJvbSBcIi4uLy4uLy4uL2xpYi9icmlkZ2UuanNcIjtcbmNvbnN0IHsgZGl2LCB3ZWJ2aWV3LCB2aWRlbywgc291cmNlIH0gPSB1c2VUYWdzKCk7XG5cbndpbmRvdy5hZGRFdmVudExpc3RlbmVyKFwia2V5ZG93blwiLCAoZSkgPT4ge1xuXHRpZiAoZS5tZXRhS2V5ICYmIGUua2V5LnRvTG93ZXJDYXNlKCkgPT09IFwiOFwiKSB7XG5cdFx0YWRkQXBwbGV0KFwid2Vidmlld1wiKTtcblx0fSBlbHNlIGlmIChlLm1ldGFLZXkgJiYgZS5rZXkudG9Mb3dlckNhc2UoKSA9PT0gXCI5XCIpIHtcblx0XHRhZGRBcHBsZXQoXCJ2aWRlb1wiKTtcblx0fVxufSk7XG5cbkdsb2JhbFN0eWxlU2hlZXQoY3NzYFxuXHRbb20tYXBwbGV0PVwidGVzdFwiXSB7XG5cdFx0cG9zaXRpb246IGFic29sdXRlO1xuXHRcdG1pbi13aWR0aDogMTAwcHg7XG5cdFx0bWluLWhlaWdodDogMTAwcHg7XG5cdFx0Y29sb3I6IHZhcigtLWNvbG9yLXdoaXRlKTtcblx0XHRiYWNrZ3JvdW5kLWNvbG9yOiB2YXIoLS1jb2xvci1ibGFjayk7XG5cblx0XHR3ZWJ2aWV3LFxuXHRcdHZpZGVvIHtcblx0XHRcdHBvc2l0aW9uOiBhYnNvbHV0ZTtcblx0XHRcdHRvcDogMDtcblx0XHRcdGxlZnQ6IDA7XG5cdFx0XHR3aWR0aDogMTAwJTtcblx0XHRcdGhlaWdodDogMTAwJTtcblx0XHR9XG5cblx0XHR3ZWJ2aWV3IHtcblx0XHRcdHBvaW50ZXItZXZlbnRzOiBub25lO1xuXHRcdH1cblx0fVxuYCk7XG5cbmFzeW5jIGZ1bmN0aW9uIGFkZEFwcGxldChtb2RlID0gXCJ3ZWJ2aWV3XCIpIHtcblx0bGV0IHsgeCwgeSB9ID0gZ2V0Q2FtZXJhQ2VudGVyKCk7XG5cblx0Ly8gUmFuZG9taXplIHdpZHRoIGFuZCBoZWlnaHRcblx0Y29uc3QgbWluX3NpemUgPSB3aW5kb3cuaW5uZXJXaWR0aCAqIDAuMjtcblx0Y29uc3QgbWF4X3NpemUgPSB3aW5kb3cuaW5uZXJXaWR0aCAqIDAuODtcblx0Y29uc3Qgd2lkdGggPSBtaW5fc2l6ZSArIE1hdGguZmxvb3IoTWF0aC5yYW5kb20oKSAqIChtYXhfc2l6ZSAtIG1pbl9zaXplKSk7XG5cdGNvbnN0IGhlaWdodCA9IG1pbl9zaXplICsgTWF0aC5mbG9vcihNYXRoLnJhbmRvbSgpICogKG1heF9zaXplIC0gbWluX3NpemUpKTtcblxuXHQvLyBSYW5kb21pemUgcG9zaXRpb24gYnV0IGtlZXAgZ2VuZXJhbGx5IGNlbnRlcmVkXG5cdGNvbnN0IG1heF9vZmZzZXQgPSB3aW5kb3cuaW5uZXJXaWR0aCAqIDAuNDtcblx0Y29uc3QgeF9vZmZzZXQgPSBNYXRoLmZsb29yKE1hdGgucmFuZG9tKCkgKiBtYXhfb2Zmc2V0ICogMikgLSBtYXhfb2Zmc2V0O1xuXHRjb25zdCB5X29mZnNldCA9IE1hdGguZmxvb3IoTWF0aC5yYW5kb20oKSAqIG1heF9vZmZzZXQgKiAyKSAtIG1heF9vZmZzZXQ7XG5cblx0eCA9IHggLSB3aWR0aCAvIDIgKyB4X29mZnNldDtcblx0eSA9IHkgLSBoZWlnaHQgLyAyICsgeV9vZmZzZXQ7XG5cblx0Y29uc3QgdmlkZW9fZGF0YSA9IHZpZGVvc1tNYXRoLmZsb29yKE1hdGgucmFuZG9tKCkgKiB2aWRlb3MubGVuZ3RoKV07XG5cblx0Y29uc3QgeyBzdGRvdXQsIHN0ZGVyciB9ID0gYXdhaXQgc3lzLnNoZWxsLmV4ZWMoXCJsc1wiKTtcblxuXHRjb25zb2xlLmxvZyhzdGRvdXQsIHN0ZGVycik7XG5cblx0bGV0IG1lZGlhX2VsZW1lbnQ7XG5cblx0aWYgKG1vZGUgPT09IFwid2Vidmlld1wiKSB7XG5cdFx0bWVkaWFfZWxlbWVudCA9IHdlYnZpZXcoe1xuXHRcdFx0c3JjOiB2aWRlb19kYXRhLnZpZGVvVXJsLFxuXHRcdFx0dXNlcmFnZW50OlxuXHRcdFx0XHRcIk1vemlsbGEvNS4wIChNYWNpbnRvc2g7IEludGVsIE1hYyBPUyBYIDEwXzE1XzcpIEFwcGxlV2ViS2l0LzUzNy4zNiAoS0hUTUwsIGxpa2UgR2Vja28pIENocm9tZS8xMzAuMC4wLjAgU2FmYXJpLzUzNy4zNlwiLFxuXHRcdH0pO1xuXHR9IGVsc2Uge1xuXHRcdG1lZGlhX2VsZW1lbnQgPSB2aWRlbyhcblx0XHRcdHtcblx0XHRcdFx0Y29udHJvbHM6IHRydWUsXG5cdFx0XHRcdGF1dG9wbGF5OiB0cnVlLFxuXHRcdFx0XHRsb29wOiB0cnVlLFxuXHRcdFx0fSxcblx0XHRcdHNvdXJjZSh7XG5cdFx0XHRcdHNyYzogdmlkZW9fZGF0YS52aWRlb1VybCxcblx0XHRcdFx0dHlwZTogXCJ2aWRlby9tcDRcIixcblx0XHRcdH0pLFxuXHRcdCk7XG5cdH1cblxuXHRjb25zdCB0ZXN0ID0gZGl2KFxuXHRcdHtcblx0XHRcdFwib20tYXBwbGV0XCI6IFwidGVzdFwiLFxuXHRcdFx0XCJvbS1tb3Rpb25cIjogXCJpZGxlXCIsXG5cdFx0XHRcImRhdGEtbW9kZVwiOiBtb2RlLFxuXHRcdFx0c3R5bGU6IGNzc2Bcblx0XHRcdFx0dG9wOiAke3l9cHg7XG5cdFx0XHRcdGxlZnQ6ICR7eH1weDtcblx0XHRcdFx0d2lkdGg6ICR7d2lkdGh9cHg7XG5cdFx0XHRcdGhlaWdodDogJHtoZWlnaHR9cHg7XG5cdFx0XHRgLFxuXHRcdH0sXG5cdFx0bWVkaWFfZWxlbWVudCxcblx0KTtcblxuXHRzdXJmYWNlKCkuYXBwZW5kQ2hpbGQodGVzdCk7XG5cblx0YXdhaXQgZmluaXNoKCk7XG5cblx0aWYgKG1vZGUgPT09IFwid2Vidmlld1wiKSB7XG5cdFx0Y29uc3Qgd2Vidmlld19lbCA9IHRlc3QucXVlcnlTZWxlY3RvcihcIndlYnZpZXdcIik7XG5cdFx0d2Vidmlld19lbC5zZXRBdHRyaWJ1dGUoXCJ3ZWJwcmVmZXJlbmNlc1wiLCBcImNvbnRleHRJc29sYXRpb249eWVzLCBzYW5kYm94PXllc1wiKTtcblx0fVxufVxuXG5jb25zdCB2aWRlb3MgPSBbXG5cdHtcblx0XHRpZDogXCIxXCIsXG5cdFx0dGl0bGU6IFwiQmlnIEJ1Y2sgQnVubnlcIixcblx0XHR0aHVtYm5haWxVcmw6XG5cdFx0XHRcImh0dHBzOi8vdXBsb2FkLndpa2ltZWRpYS5vcmcvd2lraXBlZGlhL2NvbW1vbnMvdGh1bWIvYS9hNy9CaWdfQnVja19CdW5ueV90aHVtYm5haWxfdmxjLnBuZy8xMjAwcHgtQmlnX0J1Y2tfQnVubnlfdGh1bWJuYWlsX3ZsYy5wbmdcIixcblx0XHRkdXJhdGlvbjogXCI4OjE4XCIsXG5cdFx0dXBsb2FkVGltZTogXCJNYXkgOSwgMjAxMVwiLFxuXHRcdHZpZXdzOiBcIjI0LDk2OSwxMjNcIixcblx0XHRhdXRob3I6IFwiVmxjIE1lZGlhIFBsYXllclwiLFxuXHRcdHZpZGVvVXJsOiBcImh0dHA6Ly9jb21tb25kYXRhc3RvcmFnZS5nb29nbGVhcGlzLmNvbS9ndHYtdmlkZW9zLWJ1Y2tldC9zYW1wbGUvQmlnQnVja0J1bm55Lm1wNFwiLFxuXHRcdGRlc2NyaXB0aW9uOlxuXHRcdFx0XCJCaWcgQnVjayBCdW5ueSB0ZWxscyB0aGUgc3Rvcnkgb2YgYSBnaWFudCByYWJiaXQgd2l0aCBhIGhlYXJ0IGJpZ2dlciB0aGFuIGhpbXNlbGYuIFdoZW4gb25lIHN1bm55IGRheSB0aHJlZSByb2RlbnRzIHJ1ZGVseSBoYXJhc3MgaGltLCBzb21ldGhpbmcgc25hcHMuLi4gYW5kIHRoZSByYWJiaXQgYWluJ3Qgbm8gYnVubnkgYW55bW9yZSEgSW4gdGhlIHR5cGljYWwgY2FydG9vbiB0cmFkaXRpb24gaGUgcHJlcGFyZXMgdGhlIG5hc3R5IHJvZGVudHMgYSBjb21pY2FsIHJldmVuZ2UuXFxuXFxuTGljZW5zZWQgdW5kZXIgdGhlIENyZWF0aXZlIENvbW1vbnMgQXR0cmlidXRpb24gbGljZW5zZVxcbmh0dHA6Ly93d3cuYmlnYnVja2J1bm55Lm9yZ1wiLFxuXHRcdHN1YnNjcmliZXI6IFwiMjUyNTQ1NDUgU3Vic2NyaWJlcnNcIixcblx0XHRpc0xpdmU6IHRydWUsXG5cdH0sXG5cdHtcblx0XHRpZDogXCIyXCIsXG5cdFx0dGl0bGU6IFwiVGhlIGZpcnN0IEJsZW5kZXIgT3BlbiBNb3ZpZSBmcm9tIDIwMDZcIixcblx0XHR0aHVtYm5haWxVcmw6IFwiaHR0cHM6Ly9pLnl0aW1nLmNvbS92aV93ZWJwL2dXdzIzRVlNOVZNL21heHJlc2RlZmF1bHQud2VicFwiLFxuXHRcdGR1cmF0aW9uOiBcIjEyOjE4XCIsXG5cdFx0dXBsb2FkVGltZTogXCJNYXkgOSwgMjAxMVwiLFxuXHRcdHZpZXdzOiBcIjI0LDk2OSwxMjNcIixcblx0XHRhdXRob3I6IFwiQmxlbmRlciBJbmMuXCIsXG5cdFx0dmlkZW9Vcmw6IFwiaHR0cDovL2NvbW1vbmRhdGFzdG9yYWdlLmdvb2dsZWFwaXMuY29tL2d0di12aWRlb3MtYnVja2V0L3NhbXBsZS9FbGVwaGFudHNEcmVhbS5tcDRcIixcblx0XHRkZXNjcmlwdGlvbjpcblx0XHRcdFwiU29uZyA6IFJhamEgUmFqYSBLYXJlamEgTWVpbiBTYW1hamFcXG5BbGJ1bSA6IFJhamEgS2FyZWphIE1laW4gU2FtYWphXFxuQXJ0aXN0IDogUmFkaGUgU2h5YW0gUmFzaWFcXG5TaW5nZXIgOiBSYWRoZSBTaHlhbSBSYXNpYVxcbk11c2ljIERpcmVjdG9yIDogU29oYW4gTGFsLCBEaW5lc2ggS3VtYXJcXG5MeXJpY2lzdCA6IFZpbmF5IEJpaGFyaSwgU2hhaWxlc2ggU2FnYXIsIFBhcm1lc2h3YXIgUHJlbWlcXG5NdXNpYyBMYWJlbCA6IFQtU2VyaWVzXCIsXG5cdFx0c3Vic2NyaWJlcjogXCIyNTI1NDU0NSBTdWJzY3JpYmVyc1wiLFxuXHRcdGlzTGl2ZTogdHJ1ZSxcblx0fSxcblx0e1xuXHRcdGlkOiBcIjNcIixcblx0XHR0aXRsZTogXCJGb3IgQmlnZ2VyIEJsYXplc1wiLFxuXHRcdHRodW1ibmFpbFVybDogXCJodHRwczovL2kueXRpbWcuY29tL3ZpL0RyOUMyb3N3WmZBL21heHJlc2RlZmF1bHQuanBnXCIsXG5cdFx0ZHVyYXRpb246IFwiODoxOFwiLFxuXHRcdHVwbG9hZFRpbWU6IFwiTWF5IDksIDIwMTFcIixcblx0XHR2aWV3czogXCIyNCw5NjksMTIzXCIsXG5cdFx0YXV0aG9yOiBcIlQtU2VyaWVzIFJlZ2lvbmFsXCIsXG5cdFx0dmlkZW9Vcmw6IFwiaHR0cDovL2NvbW1vbmRhdGFzdG9yYWdlLmdvb2dsZWFwaXMuY29tL2d0di12aWRlb3MtYnVja2V0L3NhbXBsZS9Gb3JCaWdnZXJCbGF6ZXMubXA0XCIsXG5cdFx0ZGVzY3JpcHRpb246XG5cdFx0XHRcIlNvbmcgOiBSYWphIFJhamEgS2FyZWphIE1laW4gU2FtYWphXFxuQWxidW0gOiBSYWphIEthcmVqYSBNZWluIFNhbWFqYVxcbkFydGlzdCA6IFJhZGhlIFNoeWFtIFJhc2lhXFxuU2luZ2VyIDogUmFkaGUgU2h5YW0gUmFzaWFcXG5NdXNpYyBEaXJlY3RvciA6IFNvaGFuIExhbCwgRGluZXNoIEt1bWFyXFxuTHlyaWNpc3QgOiBWaW5heSBCaWhhcmksIFNoYWlsZXNoIFNhZ2FyLCBQYXJtZXNod2FyIFByZW1pXFxuTXVzaWMgTGFiZWwgOiBULVNlcmllc1wiLFxuXHRcdHN1YnNjcmliZXI6IFwiMjUyNTQ1NDUgU3Vic2NyaWJlcnNcIixcblx0XHRpc0xpdmU6IHRydWUsXG5cdH0sXG5cdHtcblx0XHRpZDogXCI0XCIsXG5cdFx0dGl0bGU6IFwiRm9yIEJpZ2dlciBFc2NhcGVcIixcblx0XHR0aHVtYm5haWxVcmw6IFwiaHR0cHM6Ly9pbWcuamFrcG9zdC5uZXQvYy8yMDE5LzA5LzAzLzIwMTlfMDlfMDNfNzg5MTJfMTU2NzQ4NDI3Mi5fbGFyZ2UuanBnXCIsXG5cdFx0ZHVyYXRpb246IFwiODoxOFwiLFxuXHRcdHVwbG9hZFRpbWU6IFwiTWF5IDksIDIwMTFcIixcblx0XHR2aWV3czogXCIyNCw5NjksMTIzXCIsXG5cdFx0YXV0aG9yOiBcIlQtU2VyaWVzIFJlZ2lvbmFsXCIsXG5cdFx0dmlkZW9Vcmw6IFwiaHR0cDovL2NvbW1vbmRhdGFzdG9yYWdlLmdvb2dsZWFwaXMuY29tL2d0di12aWRlb3MtYnVja2V0L3NhbXBsZS9Gb3JCaWdnZXJFc2NhcGVzLm1wNFwiLFxuXHRcdGRlc2NyaXB0aW9uOlxuXHRcdFx0XCIgSW50cm9kdWNpbmcgQ2hyb21lY2FzdC4gVGhlIGVhc2llc3Qgd2F5IHRvIGVuam95IG9ubGluZSB2aWRlbyBhbmQgbXVzaWMgb24geW91ciBUVuKAlGZvciB3aGVuIEJhdG1hbidzIGVzY2FwZXMgYXJlbid0IHF1aXRlIGJpZyBlbm91Z2guIEZvciAkMzUuIExlYXJuIGhvdyB0byB1c2UgQ2hyb21lY2FzdCB3aXRoIEdvb2dsZSBQbGF5IE1vdmllcyBhbmQgbW9yZSBhdCBnb29nbGUuY29tL2Nocm9tZWNhc3QuXCIsXG5cdFx0c3Vic2NyaWJlcjogXCIyNTI1NDU0NSBTdWJzY3JpYmVyc1wiLFxuXHRcdGlzTGl2ZTogZmFsc2UsXG5cdH0sXG5cdHtcblx0XHRpZDogXCI1XCIsXG5cdFx0dGl0bGU6IFwiQmlnIEJ1Y2sgQnVubnlcIixcblx0XHR0aHVtYm5haWxVcmw6XG5cdFx0XHRcImh0dHBzOi8vdXBsb2FkLndpa2ltZWRpYS5vcmcvd2lraXBlZGlhL2NvbW1vbnMvdGh1bWIvYS9hNy9CaWdfQnVja19CdW5ueV90aHVtYm5haWxfdmxjLnBuZy8xMjAwcHgtQmlnX0J1Y2tfQnVubnlfdGh1bWJuYWlsX3ZsYy5wbmdcIixcblx0XHRkdXJhdGlvbjogXCI4OjE4XCIsXG5cdFx0dXBsb2FkVGltZTogXCJNYXkgOSwgMjAxMVwiLFxuXHRcdHZpZXdzOiBcIjI0LDk2OSwxMjNcIixcblx0XHRhdXRob3I6IFwiVmxjIE1lZGlhIFBsYXllclwiLFxuXHRcdHZpZGVvVXJsOiBcImh0dHA6Ly9jb21tb25kYXRhc3RvcmFnZS5nb29nbGVhcGlzLmNvbS9ndHYtdmlkZW9zLWJ1Y2tldC9zYW1wbGUvQmlnQnVja0J1bm55Lm1wNFwiLFxuXHRcdGRlc2NyaXB0aW9uOlxuXHRcdFx0XCJCaWcgQnVjayBCdW5ueSB0ZWxscyB0aGUgc3Rvcnkgb2YgYSBnaWFudCByYWJiaXQgd2l0aCBhIGhlYXJ0IGJpZ2dlciB0aGFuIGhpbXNlbGYuIFdoZW4gb25lIHN1bm55IGRheSB0aHJlZSByb2RlbnRzIHJ1ZGVseSBoYXJhc3MgaGltLCBzb21ldGhpbmcgc25hcHMuLi4gYW5kIHRoZSByYWJiaXQgYWluJ3Qgbm8gYnVubnkgYW55bW9yZSEgSW4gdGhlIHR5cGljYWwgY2FydG9vbiB0cmFkaXRpb24gaGUgcHJlcGFyZXMgdGhlIG5hc3R5IHJvZGVudHMgYSBjb21pY2FsIHJldmVuZ2UuXFxuXFxuTGljZW5zZWQgdW5kZXIgdGhlIENyZWF0aXZlIENvbW1vbnMgQXR0cmlidXRpb24gbGljZW5zZVxcbmh0dHA6Ly93d3cuYmlnYnVja2J1bm55Lm9yZ1wiLFxuXHRcdHN1YnNjcmliZXI6IFwiMjUyNTQ1NDUgU3Vic2NyaWJlcnNcIixcblx0XHRpc0xpdmU6IHRydWUsXG5cdH0sXG5cdHtcblx0XHRpZDogXCI2XCIsXG5cdFx0dGl0bGU6IFwiRm9yIEJpZ2dlciBCbGF6ZXNcIixcblx0XHR0aHVtYm5haWxVcmw6IFwiaHR0cHM6Ly9pLnl0aW1nLmNvbS92aS9EcjlDMm9zd1pmQS9tYXhyZXNkZWZhdWx0LmpwZ1wiLFxuXHRcdGR1cmF0aW9uOiBcIjg6MThcIixcblx0XHR1cGxvYWRUaW1lOiBcIk1heSA5LCAyMDExXCIsXG5cdFx0dmlld3M6IFwiMjQsOTY5LDEyM1wiLFxuXHRcdGF1dGhvcjogXCJULVNlcmllcyBSZWdpb25hbFwiLFxuXHRcdHZpZGVvVXJsOiBcImh0dHA6Ly9jb21tb25kYXRhc3RvcmFnZS5nb29nbGVhcGlzLmNvbS9ndHYtdmlkZW9zLWJ1Y2tldC9zYW1wbGUvRm9yQmlnZ2VyQmxhemVzLm1wNFwiLFxuXHRcdGRlc2NyaXB0aW9uOlxuXHRcdFx0XCJTb25nIDogUmFqYSBSYWphIEthcmVqYSBNZWluIFNhbWFqYVxcbkFsYnVtIDogUmFqYSBLYXJlamEgTWVpbiBTYW1hamFcXG5BcnRpc3QgOiBSYWRoZSBTaHlhbSBSYXNpYVxcblNpbmdlciA6IFJhZGhlIFNoeWFtIFJhc2lhXFxuTXVzaWMgRGlyZWN0b3IgOiBTb2hhbiBMYWwsIERpbmVzaCBLdW1hclxcbkx5cmljaXN0IDogVmluYXkgQmloYXJpLCBTaGFpbGVzaCBTYWdhciwgUGFybWVzaHdhciBQcmVtaVxcbk11c2ljIExhYmVsIDogVC1TZXJpZXNcIixcblx0XHRzdWJzY3JpYmVyOiBcIjI1MjU0NTQ1IFN1YnNjcmliZXJzXCIsXG5cdFx0aXNMaXZlOiBmYWxzZSxcblx0fSxcblx0e1xuXHRcdGlkOiBcIjdcIixcblx0XHR0aXRsZTogXCJGb3IgQmlnZ2VyIEVzY2FwZVwiLFxuXHRcdHRodW1ibmFpbFVybDogXCJodHRwczovL2ltZy5qYWtwb3N0Lm5ldC9jLzIwMTkvMDkvMDMvMjAxOV8wOV8wM183ODkxMl8xNTY3NDg0MjcyLl9sYXJnZS5qcGdcIixcblx0XHRkdXJhdGlvbjogXCI4OjE4XCIsXG5cdFx0dXBsb2FkVGltZTogXCJNYXkgOSwgMjAxMVwiLFxuXHRcdHZpZXdzOiBcIjI0LDk2OSwxMjNcIixcblx0XHRhdXRob3I6IFwiVC1TZXJpZXMgUmVnaW9uYWxcIixcblx0XHR2aWRlb1VybDogXCJodHRwOi8vY29tbW9uZGF0YXN0b3JhZ2UuZ29vZ2xlYXBpcy5jb20vZ3R2LXZpZGVvcy1idWNrZXQvc2FtcGxlL0ZvckJpZ2dlckVzY2FwZXMubXA0XCIsXG5cdFx0ZGVzY3JpcHRpb246XG5cdFx0XHRcIiBJbnRyb2R1Y2luZyBDaHJvbWVjYXN0LiBUaGUgZWFzaWVzdCB3YXkgdG8gZW5qb3kgb25saW5lIHZpZGVvIGFuZCBtdXNpYyBvbiB5b3VyIFRW4oCUZm9yIHdoZW4gQmF0bWFuJ3MgZXNjYXBlcyBhcmVuJ3QgcXVpdGUgYmlnIGVub3VnaC4gRm9yICQzNS4gTGVhcm4gaG93IHRvIHVzZSBDaHJvbWVjYXN0IHdpdGggR29vZ2xlIFBsYXkgTW92aWVzIGFuZCBtb3JlIGF0IGdvb2dsZS5jb20vY2hyb21lY2FzdC5cIixcblx0XHRzdWJzY3JpYmVyOiBcIjI1MjU0NTQ1IFN1YnNjcmliZXJzXCIsXG5cdFx0aXNMaXZlOiB0cnVlLFxuXHR9LFxuXHR7XG5cdFx0aWQ6IFwiOFwiLFxuXHRcdHRpdGxlOiBcIlRoZSBmaXJzdCBCbGVuZGVyIE9wZW4gTW92aWUgZnJvbSAyMDA2XCIsXG5cdFx0dGh1bWJuYWlsVXJsOiBcImh0dHBzOi8vaS55dGltZy5jb20vdmlfd2VicC9nV3cyM0VZTTlWTS9tYXhyZXNkZWZhdWx0LndlYnBcIixcblx0XHRkdXJhdGlvbjogXCIxMjoxOFwiLFxuXHRcdHVwbG9hZFRpbWU6IFwiTWF5IDksIDIwMTFcIixcblx0XHR2aWV3czogXCIyNCw5NjksMTIzXCIsXG5cdFx0YXV0aG9yOiBcIkJsZW5kZXIgSW5jLlwiLFxuXHRcdHZpZGVvVXJsOiBcImh0dHA6Ly9jb21tb25kYXRhc3RvcmFnZS5nb29nbGVhcGlzLmNvbS9ndHYtdmlkZW9zLWJ1Y2tldC9zYW1wbGUvRWxlcGhhbnRzRHJlYW0ubXA0XCIsXG5cdFx0ZGVzY3JpcHRpb246XG5cdFx0XHRcIlNvbmcgOiBSYWphIFJhamEgS2FyZWphIE1laW4gU2FtYWphXFxuQWxidW0gOiBSYWphIEthcmVqYSBNZWluIFNhbWFqYVxcbkFydGlzdCA6IFJhZGhlIFNoeWFtIFJhc2lhXFxuU2luZ2VyIDogUmFkaGUgU2h5YW0gUmFzaWFcXG5NdXNpYyBEaXJlY3RvciA6IFNvaGFuIExhbCwgRGluZXNoIEt1bWFyXFxuTHlyaWNpc3QgOiBWaW5heSBCaWhhcmksIFNoYWlsZXNoIFNhZ2FyLCBQYXJtZXNod2FyIFByZW1pXFxuTXVzaWMgTGFiZWwgOiBULVNlcmllc1wiLFxuXHRcdHN1YnNjcmliZXI6IFwiMjUyNTQ1NDUgU3Vic2NyaWJlcnNcIixcblx0XHRpc0xpdmU6IGZhbHNlLFxuXHR9LFxuXTtcbiIsCiAgICAiaW1wb3J0IHsgY3NzLCBmaW5pc2gsIEdsb2JhbFN0eWxlU2hlZXQgfSBmcm9tIFwiLi4vLi4vLi4vbGliL3V0aWxzLmpzXCI7XG5pbXBvcnQgeyBnZXRDYW1lcmFDZW50ZXIsIHN1cmZhY2UsIG9uQXBwbGV0UmVtb3ZlIH0gZnJvbSBcIi4uL2Rlc2t0b3AuanNcIjtcbmltcG9ydCB7IHVzZVRhZ3MgfSBmcm9tIFwiLi4vLi4vLi4vbGliL2ltYS5qc1wiO1xuXG5jb25zdCB7IGRpdiB9ID0gdXNlVGFncygpO1xuXG5jb25zdCBQQVNURUxfQ09MT1JTID0gW1xuXHR7XG5cdFx0Ymc6IFwidmFyKC0tY29sb3IteWVsbG93LTIwMClcIixcblx0XHRoYW5kbGU6IFwidmFyKC0tY29sb3IteWVsbG93LTMwMClcIixcblx0XHR0ZXh0OiBcInZhcigtLWNvbG9yLXllbGxvdy05MDApXCIsXG5cdH0sXG5cdHtcblx0XHRiZzogXCJ2YXIoLS1jb2xvci1ibHVlLTIwMClcIixcblx0XHRoYW5kbGU6IFwidmFyKC0tY29sb3ItYmx1ZS0zMDApXCIsXG5cdFx0dGV4dDogXCJ2YXIoLS1jb2xvci1ibHVlLTkwMClcIixcblx0fSxcblx0e1xuXHRcdGJnOiBcInZhcigtLWNvbG9yLWdyZWVuLTIwMClcIixcblx0XHRoYW5kbGU6IFwidmFyKC0tY29sb3ItZ3JlZW4tMzAwKVwiLFxuXHRcdHRleHQ6IFwidmFyKC0tY29sb3ItZ3JlZW4tOTAwKVwiLFxuXHR9LFxuXHR7XG5cdFx0Ymc6IFwidmFyKC0tY29sb3ItcGluay0yMDApXCIsXG5cdFx0aGFuZGxlOiBcInZhcigtLWNvbG9yLXBpbmstMzAwKVwiLFxuXHRcdHRleHQ6IFwidmFyKC0tY29sb3ItcGluay05MDApXCIsXG5cdH0sXG5dO1xuXG53aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcihcImtleWRvd25cIiwgKGUpID0+IHtcblx0aWYgKGUubWV0YUtleSAmJiBlLmtleSA9PT0gXCIxXCIpIHtcblx0XHRjb25zdCByYW5kb21fY29sb3JfaW5kZXggPSBNYXRoLmZsb29yKE1hdGgucmFuZG9tKCkgKiBQQVNURUxfQ09MT1JTLmxlbmd0aCk7XG5cdFx0YWRkU3RpY2t5KHJhbmRvbV9jb2xvcl9pbmRleCk7XG5cdFx0ZS5wcmV2ZW50RGVmYXVsdCgpO1xuXHR9XG59KTtcblxuYXN5bmMgZnVuY3Rpb24gYWRkU3RpY2t5KGNvbG9ySW5kZXggPSAwKSB7XG5cdGxldCB7IHgsIHkgfSA9IGdldENhbWVyYUNlbnRlcigpO1xuXG5cdC8vIFJhbmRvbWl6ZSB3aWR0aCBhbmQgaGVpZ2h0XG5cdGNvbnN0IHdpZHRoID0gMjAwICsgTWF0aC5mbG9vcihNYXRoLnJhbmRvbSgpICogMTAwKTtcblx0Y29uc3QgaGVpZ2h0ID0gMjAwICsgTWF0aC5mbG9vcihNYXRoLnJhbmRvbSgpICogMTAwKTtcblxuXHQvLyBBZGp1c3QgcG9zaXRpb24gdG8gY2VudGVyXG5cdHggPSB4IC0gd2lkdGggLyAyO1xuXHR5ID0geSAtIGhlaWdodCAvIDI7XG5cblx0Ly8gQWRkIHNvbWUgcmFuZG9tbmVzcyB0byBwb3NpdGlvblxuXHR4ICs9IE1hdGguZmxvb3IoTWF0aC5yYW5kb20oKSAqIDEwMCkgLSA1MDtcblx0eSArPSBNYXRoLmZsb29yKE1hdGgucmFuZG9tKCkgKiAxMDApIC0gNTA7XG5cblx0Ly8gVXNlIHRoZSBjb2xvciBjb3JyZXNwb25kaW5nIHRvIHRoZSBwcmVzc2VkIG51bWJlciBrZXlcblx0Y29uc3QgY29sb3Jfc2NoZW1lID0gUEFTVEVMX0NPTE9SU1tjb2xvckluZGV4XTtcblxuXHRsZXQgaXNfcmVzaXppbmcgPSBmYWxzZTtcblxuXHRjb25zdCBzdGlja3kgPSBkaXYoXG5cdFx0e1xuXHRcdFx0XCJvbS1hcHBsZXRcIjogXCJzdGlja3lcIixcblx0XHRcdFwib20tbW90aW9uXCI6IFwiaWRsZVwiLFxuXHRcdFx0c3R5bGU6IGNzc2Bcblx0XHRcdFx0dG9wOiAke3l9cHg7XG5cdFx0XHRcdGxlZnQ6ICR7eH1weDtcblx0XHRcdFx0d2lkdGg6ICR7d2lkdGh9cHg7XG5cdFx0XHRcdGhlaWdodDogJHtoZWlnaHR9cHg7XG5cdFx0XHRcdGJhY2tncm91bmQtY29sb3I6ICR7Y29sb3Jfc2NoZW1lLmJnfTtcblx0XHRcdFx0Y29sb3I6ICR7Y29sb3Jfc2NoZW1lLnRleHR9O1xuXHRcdFx0YCxcblx0XHR9LFxuXHRcdGRpdih7XG5cdFx0XHRcImRyYWctaGFuZGxlXCI6IHRydWUsXG5cdFx0XHRzdHlsZTogY3NzYFxuXHRcdFx0XHRoZWlnaHQ6IHZhcigtLXNpemUtNik7XG5cdFx0XHRcdHdpZHRoOiAxMDAlO1xuXHRcdFx0XHRiYWNrZ3JvdW5kLWNvbG9yOiAke2NvbG9yX3NjaGVtZS5oYW5kbGV9O1xuXHRcdFx0XHRjdXJzb3I6IG1vdmU7XG5cdFx0XHRgLFxuXHRcdH0pLFxuXHRcdGRpdih7XG5cdFx0XHRjbGFzczogXCJjb250ZW50XCIsXG5cdFx0XHRzcGVsbGNoZWNrOiBcImZhbHNlXCIsXG5cdFx0XHRjb250ZW50ZWRpdGFibGU6ICgpID0+IChpc19yZXNpemluZyA/IFwiZmFsc2VcIiA6IFwidHJ1ZVwiKSxcblx0XHRcdG9ua2V5ZG93bihlKSB7XG5cdFx0XHRcdC8vIENsb3NlIHRoZSBzdGlja3kgbm90ZSB3aXRoIENtZCtXIChNYWMpIG9yIEN0cmwrVyAoV2luZG93cy9MaW51eClcblx0XHRcdFx0aWYgKChlLm1ldGFLZXkgfHwgZS5jdHJsS2V5KSAmJiBlLmtleS50b0xvd2VyQ2FzZSgpID09PSBcIndcIikge1xuXHRcdFx0XHRcdHN0aWNreS5yZW1vdmUoKTtcblx0XHRcdFx0fVxuXG5cdFx0XHRcdC8vIENoZWNrIGZvciBDbWQrU2hpZnQrViAoTWFjKSBvciBDdHJsK1NoaWZ0K1YgKFdpbmRvd3MvTGludXgpXG5cdFx0XHRcdGlmICgoZS5tZXRhS2V5IHx8IGUuY3RybEtleSkgJiYgZS5zaGlmdEtleSAmJiBlLmtleS50b0xvd2VyQ2FzZSgpID09PSBcInZcIikge1xuXHRcdFx0XHRcdGUucHJldmVudERlZmF1bHQoKTtcblxuXHRcdFx0XHRcdC8vIEdldCBjbGlwYm9hcmQgY29udGVudCBhcyBwbGFpbiB0ZXh0XG5cdFx0XHRcdFx0bmF2aWdhdG9yLmNsaXBib2FyZFxuXHRcdFx0XHRcdFx0LnJlYWRUZXh0KClcblx0XHRcdFx0XHRcdC50aGVuKCh0ZXh0KSA9PiB7XG5cdFx0XHRcdFx0XHRcdC8vIFNhdmUgY3VycmVudCBzZWxlY3Rpb24gZm9yIHVuZG8gZnVuY3Rpb25hbGl0eVxuXHRcdFx0XHRcdFx0XHRjb25zdCBzZWxlY3Rpb24gPSB3aW5kb3cuZ2V0U2VsZWN0aW9uKCk7XG5cdFx0XHRcdFx0XHRcdGNvbnN0IHJhbmdlID0gc2VsZWN0aW9uLmdldFJhbmdlQXQoMCk7XG5cblx0XHRcdFx0XHRcdFx0Ly8gVXNlIGV4ZWNDb21tYW5kIHdoaWNoIHJlZ2lzdGVycyB3aXRoIHRoZSB1bmRvIHN0YWNrXG5cdFx0XHRcdFx0XHRcdGRvY3VtZW50LmV4ZWNDb21tYW5kKFwiaW5zZXJ0VGV4dFwiLCBmYWxzZSwgdGV4dCk7XG5cdFx0XHRcdFx0XHR9KVxuXHRcdFx0XHRcdFx0LmNhdGNoKChlcnIpID0+IHtcblx0XHRcdFx0XHRcdFx0Y29uc29sZS5lcnJvcihcIkZhaWxlZCB0byByZWFkIGNsaXBib2FyZCBjb250ZW50czogXCIsIGVycik7XG5cdFx0XHRcdFx0XHR9KTtcblx0XHRcdFx0fVxuXHRcdFx0fSxcblx0XHR9KSxcblx0KTtcblxuXHRzdXJmYWNlKCkuYXBwZW5kQ2hpbGQoc3RpY2t5KTtcblxuXHRhd2FpdCBmaW5pc2goKTtcblxuXHQvLyBGb2N1cyB0aGUgY29udGVudCBhcmVhIHRvIHN0YXJ0IHR5cGluZyBpbW1lZGlhdGVseVxuXHRzdGlja3kucXVlcnlTZWxlY3RvcihcIi5jb250ZW50XCIpLmZvY3VzKCk7XG5cblx0d2luZG93LmFkZEV2ZW50TGlzdGVuZXIoXCJhcHBsZXQtcmVzaXplLXN0YXJ0XCIsIGhhbmRsZUFwcGxldFJlc2l6ZVN0YXJ0KTtcblx0d2luZG93LmFkZEV2ZW50TGlzdGVuZXIoXCJhcHBsZXQtcmVzaXplLXN0b3BcIiwgaGFuZGxlQXBwbGV0UmVzaXplU3RvcCk7XG5cblx0b25BcHBsZXRSZW1vdmUoKGEpID0+IHtcblx0XHRpZiAoYSA9PT0gc3RpY2t5KSB7XG5cdFx0XHR3aW5kb3cucmVtb3ZlRXZlbnRMaXN0ZW5lcihcImFwcGxldC1yZXNpemUtc3RhcnRcIiwgaGFuZGxlQXBwbGV0UmVzaXplU3RhcnQpO1xuXHRcdFx0d2luZG93LnJlbW92ZUV2ZW50TGlzdGVuZXIoXCJhcHBsZXQtcmVzaXplLXN0b3BcIiwgaGFuZGxlQXBwbGV0UmVzaXplU3RvcCk7XG5cdFx0fVxuXHR9KTtcblxuXHRmdW5jdGlvbiBoYW5kbGVBcHBsZXRSZXNpemVTdGFydChlKSB7XG5cdFx0aWYgKGUuZGV0YWlsLmFwcGxldCA9PT0gc3RpY2t5KSB7XG5cdFx0XHRpc19yZXNpemluZyA9IHRydWU7XG5cdFx0fVxuXHR9XG5cblx0ZnVuY3Rpb24gaGFuZGxlQXBwbGV0UmVzaXplU3RvcChlKSB7XG5cdFx0aWYgKGUuZGV0YWlsLmFwcGxldCA9PT0gc3RpY2t5KSB7XG5cdFx0XHRpc19yZXNpemluZyA9IGZhbHNlO1xuXHRcdH1cblx0fVxufVxuXG4vL1xuLy8gU3R5bGVzXG4vL1xuXG5HbG9iYWxTdHlsZVNoZWV0KGNzc2Bcblx0W29tLWFwcGxldD1cInN0aWNreVwiXSB7XG5cdFx0cG9zaXRpb246IGFic29sdXRlO1xuXHRcdG1pbi13aWR0aDogMTUwcHg7XG5cdFx0bWluLWhlaWdodDogMTUwcHg7XG5cdFx0Zm9udC1mYW1pbHk6IHZhcigtLWZvbnQtbW9ubyk7XG5cdFx0bGluZS1oZWlnaHQ6IDEuNTtcblx0XHRib3JkZXItcmFkaXVzOiAycHg7XG5cdFx0Ym94LXNoYWRvdzogdmFyKC0tZmFzdC10aGlja25lc3MtMSk7XG5cdFx0ZGlzcGxheTogZmxleDtcblx0XHRmbGV4LWRpcmVjdGlvbjogY29sdW1uO1xuXHRcdG92ZXJmbG93OiBoaWRkZW47XG5cblx0XHQuY29udGVudCB7XG5cdFx0XHRmbGV4OiAxO1xuXHRcdFx0cGFkZGluZzogMTBweDtcblx0XHRcdG91dGxpbmU6IG5vbmU7XG5cdFx0XHRvdmVyZmxvdy15OiBhdXRvO1xuXHRcdFx0d29yZC13cmFwOiBicmVhay13b3JkO1xuXHRcdH1cblx0fVxuYCk7XG4iLAogICAgImltcG9ydCB7IGNzcywgZmluaXNoLCBHbG9iYWxTdHlsZVNoZWV0LCB0cnlDYXRjaCwgZGVib3VuY2UgfSBmcm9tIFwiLi4vLi4vLi4vbGliL3V0aWxzLmpzXCI7XG5pbXBvcnQgeyBnZXRDYW1lcmFDZW50ZXIsIG9uQXBwbGV0UmVtb3ZlLCBzdXJmYWNlIH0gZnJvbSBcIi4uL2Rlc2t0b3AuanNcIjtcbmltcG9ydCB7IHVzZVRhZ3MgfSBmcm9tIFwiLi4vLi4vLi4vbGliL2ltYS5qc1wiO1xuaW1wb3J0IHN5cyBmcm9tIFwiLi4vLi4vLi4vbGliL2JyaWRnZS5qc1wiO1xuXG5jb25zdCB7IGRpdiwgaGVhZGVyLCBzcGFuLCBpY29uLCBidXR0b24sIGNhbnZhcywgdmlkZW8sIHNvdXJjZSB9ID0gdXNlVGFncygpO1xuXG5zeXMuYXBwc3RyZWFtLndpbmRvd0NhcHR1cmVVcGRhdGVkKGFzeW5jIChpZCkgPT4ge1xuXHRjb25zdCB3aW5kb3dfZGF0YSA9IGF3YWl0IHN5cy5hcHBzdHJlYW0uZ2V0V2luZG93Q2FwdHVyZShpZCk7XG5cdGlmICh3aW5kb3dfZGF0YSkge1xuXHRcdGFkZEFwcHZpZXcoaWQsIHdpbmRvd19kYXRhKTtcblx0fSBlbHNlIHtcblx0XHRjb25zb2xlLmVycm9yKGBGYWlsZWQgdG8gY2FwdHVyZSB3aW5kb3cgd2l0aCBJRCAke2lkfWApO1xuXHR9XG59KTtcblxuLy8gTGlzdGVuIGZvciB3aW5kb3cgY2xvc2UgZXZlbnRzIGZyb20gdGhlIHdpbmRvdyBtYW5hZ2VyXG5zeXMuYXBwc3RyZWFtLm9uV2luZG93Q2xvc2VkKCh3aW5kb3dfaWQpID0+IHtcblx0Y29uc29sZS5sb2cod2luZG93X2lkKTtcblx0Y29uc3QgYXBwdmlldyA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKGBhcHB2aWV3LSR7d2luZG93X2lkfWApO1xuXHRpZiAoYXBwdmlldykge1xuXHRcdGFwcHZpZXcucmVtb3ZlKCk7XG5cdH1cbn0pO1xuXG4vLyBIYW5kbGUgY2xvc2Ugd2hlbiBlbGVtZW50IGlzIHJlbW92ZWRcbm9uQXBwbGV0UmVtb3ZlKGFzeW5jIChhcHBsZXQpID0+IHtcblx0dHJ5Q2F0Y2goYXN5bmMgKCkgPT4ge1xuXHRcdGF3YWl0IHN5cy5hcHBzdHJlYW0uY2xvc2VXaW5kb3coYXBwbGV0LmlkLnJlcGxhY2UoXCJhcHB2aWV3LVwiLCBcIlwiKSk7XG5cdH0pO1xufSk7XG5cbmFzeW5jIGZ1bmN0aW9uIGFkZEFwcHZpZXcod2luZG93X2lkLCB3aW5kb3dfZGF0YSkge1xuXHRjb25zdCBpZCA9IGBhcHB2aWV3LSR7d2luZG93X2lkfWA7XG5cdGNvbnN0IHdpZHRoID0gd2luZG93X2RhdGEud2lkdGg7XG5cdGNvbnN0IGhlaWdodCA9IHdpbmRvd19kYXRhLmhlaWdodDtcblxuXHQvLyBDaGVjayBpZiB0aGUgd2luZG93IGlzIGFscmVhZHkgY2FwdHVyZWRcblx0Y29uc3QgZXhpc3RpbmdfYXBwdmlldyA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKGlkKTtcblx0aWYgKGV4aXN0aW5nX2FwcHZpZXcpIHtcblx0XHRjb25zdCBjYW52YXNfZWwgPSBleGlzdGluZ19hcHB2aWV3LnF1ZXJ5U2VsZWN0b3IoXCJjYW52YXNcIik7XG5cdFx0aWYgKGNhbnZhc19lbCkge1xuXHRcdFx0Y29uc3QgaXNfcmVzaXppbmcgPSBleGlzdGluZ19hcHB2aWV3LmdldEF0dHJpYnV0ZShcIm9tLW1vdGlvblwiKSA9PT0gXCJyZXNpemluZ1wiO1xuXG5cdFx0XHRpZiAoIWlzX3Jlc2l6aW5nKSB7XG5cdFx0XHRcdGV4aXN0aW5nX2FwcHZpZXcuc3R5bGUud2lkdGggPSBgJHt3aWR0aH1weGA7XG5cdFx0XHRcdGV4aXN0aW5nX2FwcHZpZXcuc3R5bGUuaGVpZ2h0ID0gYCR7aGVpZ2h0fXB4YDtcblx0XHRcdH1cblxuXHRcdFx0Y2FudmFzX2VsLndpZHRoID0gd2lkdGg7XG5cdFx0XHRjYW52YXNfZWwuaGVpZ2h0ID0gaGVpZ2h0O1xuXG5cdFx0XHRjb25zdCBjdHggPSBjYW52YXNfZWwuZ2V0Q29udGV4dChcIjJkXCIpO1xuXG5cdFx0XHQvLyBDcmVhdGUgaW1hZ2UgZGF0YSB3aXRoIHRoZSByaWdodCBkaW1lbnNpb25zXG5cdFx0XHRjb25zdCBpbWFnZV9kYXRhID0gbmV3IEltYWdlRGF0YShuZXcgVWludDhDbGFtcGVkQXJyYXkod2luZG93X2RhdGEucGl4ZWxfZGF0YSksIHdpZHRoLCBoZWlnaHQpO1xuXG5cdFx0XHQvLyBSZW5kZXIgdGhlIGltYWdlIGRhdGFcblx0XHRcdGN0eC5wdXRJbWFnZURhdGEoaW1hZ2VfZGF0YSwgMCwgMCk7XG5cdFx0fVxuXHRcdHJldHVybjtcblx0fVxuXG5cdGxldCByZXNpemVfYW5pbWF0aW9uX2ZyYW1lID0gbnVsbDtcblx0bGV0IGxhc3RfcmVzaXplX3dpZHRoID0gMDtcblx0bGV0IGxhc3RfcmVzaXplX2hlaWdodCA9IDA7XG5cblx0bGV0IHsgeCwgeSB9ID0gZ2V0Q2FtZXJhQ2VudGVyKCk7XG5cblx0Ly8gQWRqdXN0IHBvc2l0aW9uIHRvIGNlbnRlclxuXHR4ID0geCAtIHdpZHRoIC8gMjtcblx0eSA9IHkgLSBoZWlnaHQgLyAyO1xuXG5cdC8vIEFkZCBzb21lIHJhbmRvbW5lc3MgdG8gcG9zaXRpb25cblx0eCArPSBNYXRoLmZsb29yKE1hdGgucmFuZG9tKCkgKiAxMDApIC0gNTA7XG5cdHkgKz0gTWF0aC5mbG9vcihNYXRoLnJhbmRvbSgpICogMTAwKSAtIDUwO1xuXG5cdGNvbnN0IGNhbnZhc19lbCA9IGNhbnZhcyh7XG5cdFx0d2lkdGg6IHdpZHRoLFxuXHRcdGhlaWdodDogaGVpZ2h0LFxuXHRcdG9ubW91c2Vkb3duOiBhc3luYyAoZSkgPT4ge1xuXHRcdFx0aWYgKGUuYWx0S2V5KSByZXR1cm47XG5cdFx0XHRlLnN0b3BQcm9wYWdhdGlvbigpO1xuXG5cdFx0XHR0cnkge1xuXHRcdFx0XHRjb25zdCByZWN0ID0gZS50YXJnZXQuZ2V0Qm91bmRpbmdDbGllbnRSZWN0KCk7XG5cdFx0XHRcdGF3YWl0IHN5cy5hcHBzdHJlYW0uc2V0V2luZG93UG9zaXRpb24od2luZG93X2lkLCBNYXRoLnJvdW5kKHJlY3QubGVmdCksIE1hdGgucm91bmQocmVjdC50b3ApKTtcblx0XHRcdFx0YXdhaXQgc3lzLmFwcHN0cmVhbS5mb2N1c1dpbmRvdyh3aW5kb3dfaWQpO1xuXHRcdFx0fSBjYXRjaCAoZXJyKSB7XG5cdFx0XHRcdGNvbnNvbGUuZXJyb3IoXCJGYWlsZWQgdG8gZm9yd2FyZCBtb3VzZSBwcmVzczpcIiwgZXJyKTtcblx0XHRcdH1cblx0XHR9LFxuXHR9KTtcblxuXHRjb25zdCBhcHB2aWV3ID0gZGl2KFxuXHRcdHtcblx0XHRcdGlkOiBpZCxcblx0XHRcdFwib20tYXBwbGV0XCI6IFwiYXBwdmlld1wiLFxuXHRcdFx0XCJvbS1tb3Rpb25cIjogXCJpZGxlXCIsXG5cdFx0XHRzdHlsZTogY3NzYFxuXHRcdFx0XHR0b3A6ICR7eX1weDtcblx0XHRcdFx0bGVmdDogJHt4fXB4O1xuXHRcdFx0XHR3aWR0aDogJHt3aWR0aH1weDtcblx0XHRcdFx0aGVpZ2h0OiAke2hlaWdodH1weDtcblx0XHRcdGAsXG5cdFx0fSxcblx0XHRoZWFkZXIoXG5cdFx0XHRidXR0b24oXG5cdFx0XHRcdHtcblx0XHRcdFx0XHR2YXJpYW50OiBcImljb25cIixcblx0XHRcdFx0XHRhc3luYyBvbmNsaWNrKCkge1xuXHRcdFx0XHRcdFx0YXBwdmlldy5yZW1vdmUoKTtcblx0XHRcdFx0XHR9LFxuXHRcdFx0XHR9LFxuXHRcdFx0XHRpY29uKHtcblx0XHRcdFx0XHRuYW1lOiBcImNsb3NlXCIsXG5cdFx0XHRcdH0pLFxuXHRcdFx0KSxcblx0XHRcdGRpdih7IFwiZHJhZy1oYW5kbGVcIjogdHJ1ZSB9KSxcblx0XHQpLFxuXHRcdGNhbnZhc19lbCxcblx0KTtcblxuXHRzdXJmYWNlKCkuYXBwZW5kQ2hpbGQoYXBwdmlldyk7XG5cblx0Ly8gSGFuZGxlIHJlc2l6ZVxuXHRjb25zdCBoYW5kbGVfcmVzaXplX2VuZCA9IGRlYm91bmNlKGFzeW5jIChuZXdfd2lkdGgsIG5ld19oZWlnaHQpID0+IHtcblx0XHR0cnlDYXRjaChhc3luYyAoKSA9PiB7XG5cdFx0XHRhd2FpdCBzeXMuYXBwc3RyZWFtLnJlc2l6ZVdpbmRvdyh3aW5kb3dfaWQsIHtcblx0XHRcdFx0d2lkdGg6IE1hdGgucm91bmQobmV3X3dpZHRoKSxcblx0XHRcdFx0aGVpZ2h0OiBNYXRoLnJvdW5kKG5ld19oZWlnaHQpLFxuXHRcdFx0fSk7XG5cdFx0fSk7XG5cdH0sIDE1MCk7XG5cblx0Ly8gSGFuZGxlIHBvc2l0aW9uIHVwZGF0ZXNcblx0Y29uc3QgaGFuZGxlUG9zaXRpb25VcGRhdGUgPSBkZWJvdW5jZShhc3luYyAoKSA9PiB7XG5cdFx0dHJ5Q2F0Y2goYXN5bmMgKCkgPT4ge1xuXHRcdFx0Y29uc3QgcmVjdCA9IGFwcHZpZXcuZ2V0Qm91bmRpbmdDbGllbnRSZWN0KCk7XG5cdFx0XHRhd2FpdCBzeXMuYXBwc3RyZWFtLnNldFdpbmRvd1Bvc2l0aW9uKHdpbmRvd19pZCwgTWF0aC5yb3VuZChyZWN0LmxlZnQpLCBNYXRoLnJvdW5kKHJlY3QudG9wKSk7XG5cdFx0fSk7XG5cdH0sIDUwKTtcblxuXHQvLyBXYXRjaCBmb3IgcG9zaXRpb24gY2hhbmdlc1xuXHRjb25zdCBwb3NpdGlvbl9vYnNlcnZlciA9IG5ldyBNdXRhdGlvbk9ic2VydmVyKChtdXRhdGlvbnMpID0+IHtcblx0XHRmb3IgKGNvbnN0IG11dGF0aW9uIG9mIG11dGF0aW9ucykge1xuXHRcdFx0aWYgKG11dGF0aW9uLnR5cGUgPT09IFwiYXR0cmlidXRlc1wiICYmIG11dGF0aW9uLmF0dHJpYnV0ZU5hbWUgPT09IFwic3R5bGVcIikge1xuXHRcdFx0XHRoYW5kbGVQb3NpdGlvblVwZGF0ZSgpO1xuXHRcdFx0fVxuXHRcdH1cblx0fSk7XG5cblx0cG9zaXRpb25fb2JzZXJ2ZXIub2JzZXJ2ZShhcHB2aWV3LCB7XG5cdFx0YXR0cmlidXRlczogdHJ1ZSxcblx0XHRhdHRyaWJ1dGVGaWx0ZXI6IFtcInN0eWxlXCJdLFxuXHR9KTtcblxuXHRjb25zdCByZXNpemVfb2JzZXJ2ZXIgPSBuZXcgUmVzaXplT2JzZXJ2ZXIoKGVudHJpZXMpID0+IHtcblx0XHRjb25zdCBlbnRyeSA9IGVudHJpZXNbMF07XG5cdFx0aWYgKGVudHJ5KSB7XG5cdFx0XHRoYW5kbGVfcmVzaXplX2VuZChlbnRyeS5jb250ZW50UmVjdC53aWR0aCwgZW50cnkuY29udGVudFJlY3QuaGVpZ2h0KTtcblx0XHRcdGhhbmRsZVBvc2l0aW9uVXBkYXRlKCk7IC8vIEFsc28gdXBkYXRlIHBvc2l0aW9uIG9uIHJlc2l6ZVxuXHRcdH1cblx0fSk7XG5cblx0cmVzaXplX29ic2VydmVyLm9ic2VydmUoYXBwdmlldyk7XG5cblx0YXdhaXQgZmluaXNoKCk7XG5cblx0Y29uc3QgY3R4ID0gY2FudmFzX2VsLmdldENvbnRleHQoXCIyZFwiKTtcblx0Y29uc3QgaW1hZ2VfZGF0YSA9IG5ldyBJbWFnZURhdGEobmV3IFVpbnQ4Q2xhbXBlZEFycmF5KHdpbmRvd19kYXRhLnBpeGVsX2RhdGEpLCB3aWR0aCwgaGVpZ2h0KTtcblx0Y3R4LnB1dEltYWdlRGF0YShpbWFnZV9kYXRhLCAwLCAwKTtcblxuXHQvLyBTZXQgaW5pdGlhbCBwb3NpdGlvblxuXHRoYW5kbGVQb3NpdGlvblVwZGF0ZSgpO1xufVxuXG5HbG9iYWxTdHlsZVNoZWV0KGNzc2Bcblx0W29tLWFwcGxldD1cImFwcHZpZXdcIl0ge1xuXHRcdHBvc2l0aW9uOiBhYnNvbHV0ZTtcblx0XHRtaW4td2lkdGg6IDEwMHB4O1xuXHRcdG1pbi1oZWlnaHQ6IDEwMHB4O1xuXHRcdGRpc3BsYXk6IGZsZXg7XG5cdFx0ZmxleC1kaXJlY3Rpb246IGNvbHVtbjtcblx0XHRib3JkZXItcmFkaXVzOiB2YXIoLS1zaXplLTJfNSk7XG5cblx0XHRjYW52YXMge1xuXHRcdFx0cG9zaXRpb246IGFic29sdXRlO1xuXHRcdFx0bGVmdDogMDtcblx0XHRcdHRvcDogMDtcblx0XHRcdHdpZHRoOiAxMDAlO1xuXHRcdFx0aGVpZ2h0OiAxMDAlO1xuXHRcdFx0Ym9yZGVyLXJhZGl1czogdmFyKC0tc2l6ZS0yXzUpO1xuXHRcdFx0YmFja2dyb3VuZDogdmFyKC0tY29sb3ItYmxhY2spO1xuXHRcdFx0b3ZlcmZsb3c6IGhpZGRlbjtcblx0XHR9XG5cblx0XHRoZWFkZXIge1xuXHRcdFx0cG9zaXRpb246IGFic29sdXRlO1xuXHRcdFx0dG9wOiB2YXIoLS1zaXplLW5lZy0wXzUpO1xuXHRcdFx0bGVmdDogMDtcblx0XHRcdHRyYW5zZm9ybTogdHJhbnNsYXRlWSgtMTAwJSk7XG5cdFx0XHRkaXNwbGF5OiBmbGV4O1xuXHRcdFx0aGVpZ2h0OiBmaXQtY29udGVudDtcblx0XHRcdHdpZHRoOiAxMDAlO1xuXHRcdFx0Ym9yZGVyLXJhZGl1czogdmFyKC0tc2l6ZS0yXzUpO1xuXHRcdFx0YmFja2dyb3VuZDogdmFyKC0tY29sb3ItYmxhY2spO1xuXHRcdFx0Y29sb3I6IHZhcigtLWNvbG9yLXdoaXRlKTtcblxuXHRcdFx0W2RyYWctaGFuZGxlXSB7XG5cdFx0XHRcdGZsZXgtZ3JvdzogMTtcblx0XHRcdFx0d2lkdGg6IDEwMCU7XG5cdFx0XHRcdGhlaWdodDogdmFyKC0tc2l6ZS03KTtcblx0XHRcdFx0Y3Vyc29yOiBtb3ZlO1xuXHRcdFx0fVxuXHRcdH1cblx0fVxuYCk7XG4iLAogICAgImltcG9ydCB7IGNzcywgZmFkZSwgZmluaXNoLCBHbG9iYWxTdHlsZVNoZWV0IH0gZnJvbSBcIi4uLy4uLy4uLy4uL2xpYi91dGlscy5qc1wiO1xuaW1wb3J0IHsgZ2V0Q2FtZXJhQ2VudGVyLCBzdXJmYWNlIH0gZnJvbSBcIi4uLy4uL2Rlc2t0b3AuanNcIjtcbmltcG9ydCB7IHVzZVRhZ3MgfSBmcm9tIFwiLi4vLi4vLi4vLi4vbGliL2ltYS5qc1wiO1xuaW1wb3J0IHN5cyBmcm9tIFwiLi4vLi4vLi4vLi4vbGliL2JyaWRnZS5qc1wiO1xuY29uc3QgeyBkaXYsIGhlYWRlciwgaW1nLCBpbnB1dCwgd2VidmlldyB9ID0gdXNlVGFncygpO1xuXG5jb25zdCBERUZBVUxUX1dJRFRIID0gNDE0O1xuY29uc3QgREVGQVVMVF9IRUlHSFQgPSA3MDA7XG5cbndpbmRvdy5hZGRFdmVudExpc3RlbmVyKFwia2V5ZG93blwiLCBhc3luYyAoZSkgPT4ge1xuXHRpZiAoKGUubWV0YUtleSB8fCBlLmN0cmxLZXkpICYmIGUua2V5LnRvVXBwZXJDYXNlKCkgPT09IFwiVFwiKSB7XG5cdFx0bGV0IHsgeDogY2VudGVyX3gsIHk6IGNlbnRlcl95IH0gPSBnZXRDYW1lcmFDZW50ZXIoKTtcblx0XHRjb25zdCByYW5kb21feF9vZmZzZXQgPSBNYXRoLmZsb29yKE1hdGgucmFuZG9tKCkgKiAxNTApIC0gNDg7XG5cdFx0Y29uc3QgcmFuZG9tX3lfb2Zmc2V0ID0gTWF0aC5mbG9vcihNYXRoLnJhbmRvbSgpICogMTUwKSAtIDQ4O1xuXG5cdFx0YXdhaXQgYWRkV2Vidmlldyh7XG5cdFx0XHR4OiBjZW50ZXJfeCArIHJhbmRvbV94X29mZnNldCAtIERFRkFVTFRfV0lEVEggLyAyLFxuXHRcdFx0eTogY2VudGVyX3kgKyByYW5kb21feV9vZmZzZXQgLSBERUZBVUxUX0hFSUdIVCAvIDIsXG5cdFx0fSk7XG5cdH1cbn0pO1xuXG5hc3luYyBmdW5jdGlvbiBhZGRXZWJ2aWV3KHByb3BzKSB7XG5cdC8vXG5cdC8vIFByb3BzXG5cdC8vXG5cblx0aWYgKCFwcm9wcykge1xuXHRcdHByb3BzID0ge1xuXHRcdFx0eDogY2VudGVyX3ggLSAyMDcsXG5cdFx0XHR5OiBjZW50ZXJfeSAtIDM1MCxcblx0XHRcdHdpZHRoOiA0MTQsXG5cdFx0XHRoZWlnaHQ6IDcwMCxcblx0XHR9O1xuXHR9XG5cblx0aWYgKCFwcm9wcy53aWR0aCkge1xuXHRcdHByb3BzLndpZHRoID0gREVGQVVMVF9XSURUSDtcblx0fVxuXG5cdGlmICghcHJvcHMuaGVpZ2h0KSB7XG5cdFx0cHJvcHMuaGVpZ2h0ID0gREVGQVVMVF9IRUlHSFQ7XG5cdH1cblxuXHRsZXQgeyB4OiBjZW50ZXJfeCwgeTogY2VudGVyX3kgfSA9IGdldENhbWVyYUNlbnRlcigpO1xuXG5cdGlmICghcHJvcHMueCkge1xuXHRcdHByb3BzLnggPSBjZW50ZXJfeCAtIDIwNztcblx0fVxuXG5cdGlmICghcHJvcHMueSkge1xuXHRcdHByb3BzLnkgPSBjZW50ZXJfeSAtIDM1MDtcblx0fVxuXG5cdC8vXG5cdC8vIFN0YXRlXG5cdC8vXG5cblx0bGV0IGlzX2RldnRvb2xzX3dlYnZpZXcgPSBwcm9wcy5kZXZ0b29sc19yZXF1ZXN0ZXIgPyB0cnVlIDogZmFsc2U7XG5cdGxldCBxdWVyeSA9IHByb3BzLnVybCB8fCBcIlwiO1xuXHRsZXQgc3JjID0gcHJvcHMuZGV2dG9vbHNfcmVxdWVzdGVyXG5cdFx0PyBgZGV2dG9vbHM6Ly9kZXZ0b29scy9idW5kbGVkL2luc3BlY3Rvci5odG1sP3dzPWxvY2FsaG9zdDowLyR7cHJvcHMuZGV2dG9vbHNfcmVxdWVzdGVyLmdldFdlYkNvbnRlbnRzSWQoKX1gXG5cdFx0OiBcIlwiO1xuXHRsZXQgbGFzdF9yZW5kZXIgPSBcIlwiO1xuXHRsZXQgbG9hZGluZyA9IGZhbHNlO1xuXHRsZXQgbG9hZF9lcnJvciA9IFwiXCI7XG5cdGxldCBrZXlib2FyZF9zaG9ydGN1dF9jb3VsZF90cmlnZ2VyID0gZmFsc2U7XG5cblx0Y29uc3QgbW9ka2V5cyA9IHtcblx0XHRDb250cm9sOiBmYWxzZSxcblx0XHRTaGlmdDogZmFsc2UsXG5cdFx0TWV0YTogZmFsc2UsIC8vIENvbW1hbmQvV2luZG93cyBrZXlcblx0fTtcblxuXHQvL1xuXHQvLyBMYXlvdXRcblx0Ly9cblxuXHRjb25zdCBwcmVsb2FkX3BhdGggPSBhd2FpdCBzeXMuZmlsZS5yZXNvbHZlKFwidXNlci9tb2R1bGVzL29tL2FwcGxldHMvd2Vidmlldy9wcmVsb2FkLmpzXCIpO1xuXG5cdGNvbnN0IHdlYnZpZXdfY29uZmlnID0ge1xuXHRcdG5vZGVpbnRlZ3JhdGlvbjogZmFsc2UsXG5cdFx0dXNlcmFnZW50OlxuXHRcdFx0XCJNb3ppbGxhLzUuMCAoTWFjaW50b3NoOyBJbnRlbCBNYWMgT1MgWCAxMF8xNV83KSBBcHBsZVdlYktpdC81MzcuMzYgKEtIVE1MLCBsaWtlIEdlY2tvKSBDaHJvbWUvMTM0LjAuMC4wIFNhZmFyaS81MzcuMzZcIixcblx0XHRwcmVsb2FkOiBwcmVsb2FkX3BhdGgsXG5cdFx0d2VicHJlZmVyZW5jZXM6IFwiY29udGV4dElzb2xhdGlvbj10cnVlLHNhbmRib3g9dHJ1ZSxhbGxvd1J1bm5pbmdJbnNlY3VyZUNvbnRlbnQ9dHJ1ZVwiLFxuXHR9O1xuXG5cdGlmIChwcm9wcy5kZXZ0b29sc19yZXF1ZXN0ZXIpIHtcblx0XHRkZWxldGUgd2Vidmlld19jb25maWcud2VicHJlZmVyZW5jZXM7XG5cdFx0ZGVsZXRlIHdlYnZpZXdfY29uZmlnLm5vZGVpbnRlZ3JhdGlvbjtcblx0XHRkZWxldGUgd2Vidmlld19jb25maWcudXNlcmFnZW50O1xuXHR9XG5cblx0Y29uc3Qgd2Vidmlld19lbCA9IHdlYnZpZXcoe1xuXHRcdC4uLndlYnZpZXdfY29uZmlnLFxuXHRcdHNyYzogKCkgPT4gc3JjLFxuXHRcdGFsbG93cG9wdXBzOiBmYWxzZSxcblx0XHQvLyBDU1MgSGFjayB0byBmaXggRWxlY3Ryb24gYnVnXG5cdFx0c3R5bGU6IGNzc2Bcblx0XHRcdHdpZHRoOiAxMDAlO1xuXHRcdFx0aGVpZ2h0OiAxMDAlO1xuXHRcdGAsXG5cdH0pO1xuXG5cdGNvbnN0IGFwcGxldCA9IGRpdihcblx0XHR7XG5cdFx0XHRcIm9tLWFwcGxldFwiOiBcIndlYnZpZXdcIixcblx0XHRcdFwib20tbW90aW9uXCI6IFwiaWRsZVwiLFxuXHRcdFx0XCJpcy1kZXZ0b29sc1wiOiAoKSA9PiBpc19kZXZ0b29sc193ZWJ2aWV3LFxuXHRcdFx0XCJrZXlib2FyZC1mb2N1c1wiOiAoKSA9PiBrZXlib2FyZF9zaG9ydGN1dF9jb3VsZF90cmlnZ2VyLFxuXHRcdFx0XCJoYXMtZXJyb3JcIjogKCkgPT4gISFsb2FkX2Vycm9yLFxuXHRcdFx0XCJpcy1sb2FkaW5nXCI6ICgpID0+IGxvYWRpbmcsXG5cdFx0XHRzdHlsZTogY3NzYFxuXHRcdFx0XHR0b3A6ICR7cHJvcHMueX1weDtcblx0XHRcdFx0bGVmdDogJHtwcm9wcy54fXB4O1xuXHRcdFx0XHR3aWR0aDogJHtwcm9wcy53aWR0aH1weDtcblx0XHRcdFx0aGVpZ2h0OiAke3Byb3BzLmhlaWdodH1weDtcblx0XHRcdGAsXG5cdFx0fSxcblx0XHRoZWFkZXIoXG5cdFx0XHR7XG5cdFx0XHRcdFwiZHJhZy1oYW5kbGVcIjogXCJcIixcblx0XHRcdFx0XCJuZXctdGFiXCI6ICgpID0+IHNyYyA9PT0gXCJcIiAmJiAhaXNfZGV2dG9vbHNfd2VidmlldyA/IFwidHJ1ZVwiIDogXCJmYWxzZVwiLFxuXHRcdFx0fSxcblx0XHRcdCgpID0+XG5cdFx0XHRcdGlucHV0KHtcblx0XHRcdFx0XHR2YXJpYW50OiBcIm1pbmltYWxcIixcblx0XHRcdFx0XHR0eXBlOiBcInRleHRcIixcblx0XHRcdFx0XHRwbGFjZWhvbGRlcjogXCJTZWFyY2ggb3IgZW50ZXIgVVJMLi4uXCIsXG5cdFx0XHRcdFx0dmFsdWU6IHF1ZXJ5LFxuXHRcdFx0XHRcdG9ua2V5ZG93bihlKSB7XG5cdFx0XHRcdFx0XHRpZiAoKGUuY3RybEtleSB8fCBlLm1ldGFLZXkpICYmIGUua2V5LnRvTG93ZXJDYXNlKCkgPT09IFwid1wiKSB7XG5cdFx0XHRcdFx0XHRcdGNsb3NlV2VidmlldygpO1xuXHRcdFx0XHRcdFx0fVxuXG5cdFx0XHRcdFx0XHRpZiAoZS5rZXkgPT09IFwiRW50ZXJcIikge1xuXHRcdFx0XHRcdFx0XHRxdWVyeSA9IGUudGFyZ2V0LnZhbHVlO1xuXHRcdFx0XHRcdFx0XHRzcmMgPSBwcm9jZXNzUXVlcnkocXVlcnkpO1xuXHRcdFx0XHRcdFx0XHRlLnRhcmdldC5ibHVyKCk7XG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0fSxcblx0XHRcdFx0fSksXG5cdFx0XHRkaXYoeyBjbGFzczogXCJsb2FkaW5nLWluZGljYXRvclwiIH0pLFxuXHRcdCksXG5cdFx0d2Vidmlld19lbCxcblx0XHQvLyBpbWcoe1xuXHRcdC8vIFx0ZW1wdHk6ICgpID0+IHNyYyA9PT0gXCJcIiAmJiAhaXNfZGV2dG9vbHNfd2Vidmlldyxcblx0XHQvLyBcdHNyYzogbGFzdF9yZW5kZXIsXG5cdFx0Ly8gXHRhbHQ6IFwiXCIsXG5cdFx0Ly8gfSksXG5cdFx0ZGl2KHtcblx0XHRcdGNsYXNzOiBcIm92ZXJsYXlcIixcblx0XHR9KSxcblx0KTtcblxuXHRzdXJmYWNlKCkuYXBwZW5kQ2hpbGQoYXBwbGV0KTtcblxuXHRhd2FpdCBmaW5pc2goKTtcblxuXHQvLyBHbyB0byBpbml0aWFsIHVybCBpZiBwcm92aWRlZFxuXHRpZiAocXVlcnkpIHNyYyA9IHByb2Nlc3NRdWVyeShxdWVyeSk7XG5cblx0Ly9cblx0Ly8gRXZlbnRzXG5cdC8vXG5cblx0YXBwbGV0LmFkZEV2ZW50TGlzdGVuZXIoXCJtb3VzZWRvd25cIiwgYXN5bmMgKGUpID0+IHtcblx0XHRpZiAoc3JjICE9PSBcIlwiICYmIGFwcGxldC5nZXRBdHRyaWJ1dGUoXCJvbS1tb3Rpb25cIikgPT09IFwiaWRsZVwiICYmIHdpbmRvdy5zdXBlcmtleWRvd24gJiYgZS5idXR0b24gPT09IDIpIHtcblx0XHRcdGNvbnN0IHdlYmNvbnRlbnRzX2lkID0gd2Vidmlld19lbC5nZXRXZWJDb250ZW50c0lkKCk7XG5cdFx0XHRjb25zdCB1cmwgPSBhd2FpdCBzeXMuYnJvd3Nlci5jYXB0dXJlUGFnZSh3ZWJjb250ZW50c19pZCk7XG5cblx0XHRcdGlmICh1cmwpIHtcblx0XHRcdFx0bGFzdF9yZW5kZXIgPSB1cmw7XG5cdFx0XHR9XG5cdFx0fVxuXHR9KTtcblxuXHR3ZWJ2aWV3X2VsLmFkZEV2ZW50TGlzdGVuZXIoXCJkb20tcmVhZHlcIiwgYXN5bmMgKCkgPT4ge1xuXHRcdGlmIChwcm9wcy5kZXZ0b29sc19yZXF1ZXN0ZXIpIHtcblx0XHRcdC8vIE9wZW4gZGV2dG9vbHMgYXMgYXBwbGV0XG5cdFx0XHRhd2FpdCBzeXMuYnJvd3Nlci5vcGVuV2Vidmlld0RldnRvb2xzKFxuXHRcdFx0XHQvLyBUYXJnZXQgd2Vidmlld1xuXHRcdFx0XHRwcm9wcy5kZXZ0b29sc19yZXF1ZXN0ZXIuZ2V0V2ViQ29udGVudHNJZCgpLFxuXHRcdFx0XHQvLyBEZXZ0b29scyB3ZWJ2aWV3XG5cdFx0XHRcdHdlYnZpZXdfZWwuZ2V0V2ViQ29udGVudHNJZCgpLFxuXHRcdFx0KTtcblx0XHRcdHByb3BzLmRldnRvb2xzX3JlcXVlc3Rlci5vcGVuRGV2VG9vbHMoeyBtb2RlOiBcImRldGFjaFwiIH0pO1xuXHRcdH1cblx0fSk7XG5cblx0d2Vidmlld19lbC5hZGRFdmVudExpc3RlbmVyKFwiZGlkLXN0YXJ0LWxvYWRpbmdcIiwgKCkgPT4ge1xuXHRcdGxvYWRpbmcgPSB0cnVlO1xuXHR9KTtcblxuXHR3ZWJ2aWV3X2VsLmFkZEV2ZW50TGlzdGVuZXIoXCJkaWQtc3RvcC1sb2FkaW5nXCIsICgpID0+IHtcblx0XHRsb2FkaW5nID0gZmFsc2U7XG5cdH0pO1xuXG5cdHdlYnZpZXdfZWwuYWRkRXZlbnRMaXN0ZW5lcihcImRpZC1mYWlsLWxvYWRcIiwgKGV2ZW50KSA9PiB7XG5cdFx0bG9hZF9lcnJvciA9IGV2ZW50LmVycm9yRGVzY3JpcHRpb247XG5cdFx0bG9hZGluZyA9IGZhbHNlO1xuXHR9KTtcblxuXHR3ZWJ2aWV3X2VsLmFkZEV2ZW50TGlzdGVuZXIoXCJkaWQtbmF2aWdhdGVcIiwgKGV2ZW50KSA9PiB7XG5cdFx0cXVlcnkgPSBldmVudC51cmw7XG5cdH0pO1xuXG5cdHdlYnZpZXdfZWwuYWRkRXZlbnRMaXN0ZW5lcihcImRpZC1uYXZpZ2F0ZS1pbi1wYWdlXCIsIChldmVudCkgPT4ge1xuXHRcdHF1ZXJ5ID0gZXZlbnQudXJsO1xuXHR9KTtcblxuXHR3ZWJ2aWV3X2VsLmFkZEV2ZW50TGlzdGVuZXIoXCJpcGMtbWVzc2FnZVwiLCBhc3luYyAoZSkgPT4ge1xuXHRcdHN3aXRjaCAoZS5jaGFubmVsKSB7XG5cdFx0XHRjYXNlIFwiZGV2dG9vbHNcIjoge1xuXHRcdFx0XHRjb25zdCBjdXJyZW50X3dpZHRoID0gYXBwbGV0Lm9mZnNldFdpZHRoO1xuXHRcdFx0XHRjb25zdCBjdXJyZW50X2hlaWdodCA9IGFwcGxldC5vZmZzZXRIZWlnaHQ7XG5cdFx0XHRcdGNvbnN0IGN1cnJlbnRfeCA9IGFwcGxldC5vZmZzZXRMZWZ0O1xuXHRcdFx0XHRjb25zdCBjdXJyZW50X3kgPSBhcHBsZXQub2Zmc2V0VG9wO1xuXHRcdFx0XHRjb25zdCByYW5kb21feF9vZmZzZXQgPSBNYXRoLmZsb29yKE1hdGgucmFuZG9tKCkgKiAxNTApIC0gNDg7XG5cdFx0XHRcdGNvbnN0IHJhbmRvbV95X29mZnNldCA9IE1hdGguZmxvb3IoTWF0aC5yYW5kb20oKSAqIDE1MCkgLSA0ODtcblxuXHRcdFx0XHRhd2FpdCBhZGRXZWJ2aWV3KHtcblx0XHRcdFx0XHR3aWR0aDogY3VycmVudF93aWR0aCxcblx0XHRcdFx0XHRoZWlnaHQ6IGN1cnJlbnRfaGVpZ2h0LFxuXHRcdFx0XHRcdHg6IGN1cnJlbnRfeCArIGN1cnJlbnRfd2lkdGggKyByYW5kb21feF9vZmZzZXQsXG5cdFx0XHRcdFx0eTogY3VycmVudF95ICsgcmFuZG9tX3lfb2Zmc2V0LFxuXHRcdFx0XHRcdGRldnRvb2xzX3JlcXVlc3Rlcjogd2Vidmlld19lbCxcblx0XHRcdFx0fSk7XG5cblx0XHRcdFx0YnJlYWs7XG5cdFx0XHR9XG5cdFx0XHRjYXNlIFwibmV3LXdpbmRvd1wiOiB7XG5cdFx0XHRcdGNvbnN0IHVybCA9IGUuYXJnc1swXTtcblx0XHRcdFx0c3lzLmJyb3dzZXIubmV3V2luZG93KHVybCk7XG5cdFx0XHRcdGJyZWFrO1xuXHRcdFx0fVxuXHRcdFx0Y2FzZSBcIm5ldy10YWJcIjoge1xuXHRcdFx0XHRjb25zdCB1cmwgPSBlLmFyZ3NbMF07XG5cdFx0XHRcdGNvbnN0IGN1cnJlbnRfd2lkdGggPSBhcHBsZXQub2Zmc2V0V2lkdGg7XG5cdFx0XHRcdGNvbnN0IGN1cnJlbnRfaGVpZ2h0ID0gYXBwbGV0Lm9mZnNldEhlaWdodDtcblx0XHRcdFx0Y29uc3QgY3VycmVudF94ID0gYXBwbGV0Lm9mZnNldExlZnQ7XG5cdFx0XHRcdGNvbnN0IGN1cnJlbnRfeSA9IGFwcGxldC5vZmZzZXRUb3A7XG5cdFx0XHRcdGNvbnN0IHJhbmRvbV94X29mZnNldCA9IE1hdGguZmxvb3IoTWF0aC5yYW5kb20oKSAqIDE1MCkgLSA0ODtcblx0XHRcdFx0Y29uc3QgcmFuZG9tX3lfb2Zmc2V0ID0gTWF0aC5mbG9vcihNYXRoLnJhbmRvbSgpICogMTUwKSAtIDQ4O1xuXG5cdFx0XHRcdGFkZFdlYnZpZXcoe1xuXHRcdFx0XHRcdHdpZHRoOiBjdXJyZW50X3dpZHRoLFxuXHRcdFx0XHRcdGhlaWdodDogY3VycmVudF9oZWlnaHQsXG5cdFx0XHRcdFx0eDogY3VycmVudF94ICsgKHVybCA9PT0gXCJcIiA/IDAgOiBjdXJyZW50X3dpZHRoKSArIHJhbmRvbV94X29mZnNldCxcblx0XHRcdFx0XHR5OiBjdXJyZW50X3kgKyByYW5kb21feV9vZmZzZXQsXG5cdFx0XHRcdFx0dXJsLFxuXHRcdFx0XHR9KTtcblx0XHRcdFx0YnJlYWs7XG5cdFx0XHR9XG5cdFx0XHRjYXNlIFwibW91c2Vkb3duXCI6IHtcblx0XHRcdFx0YnJlYWs7XG5cdFx0XHR9XG5cdFx0XHRjYXNlIFwibW91c2V1cFwiOiB7XG5cdFx0XHRcdGJyZWFrO1xuXHRcdFx0fVxuXHRcdFx0Y2FzZSBcImtleWRvd25cIjoge1xuXHRcdFx0XHRjb25zdCBrZXkgPSBlLmFyZ3NbMF07XG5cdFx0XHRcdGNvbnN0IG9wdHMgPSBlLmFyZ3NbMV07XG5cdFx0XHRcdGNvbnN0IGV2ID0gbmV3IEN1c3RvbUV2ZW50KFwid2Vidmlldy1rZXlkb3duXCIsIHtcblx0XHRcdFx0XHRkZXRhaWw6IHtcblx0XHRcdFx0XHRcdGtleSxcblx0XHRcdFx0XHRcdHdlYnZpZXc6IHdlYnZpZXdfZWwsXG5cdFx0XHRcdFx0fSxcblx0XHRcdFx0fSk7XG5cdFx0XHRcdHdpbmRvdy5kaXNwYXRjaEV2ZW50KGV2KTtcblxuXHRcdFx0XHQvLyBUcmFjayBpbmRpdmlkdWFsIG1vZGlmaWVyIGtleXNcblx0XHRcdFx0aWYgKGtleSA9PT0gXCJDb250cm9sXCIgfHwga2V5ID09PSBcIlNoaWZ0XCIgfHwga2V5ID09PSBcIk1ldGFcIikge1xuXHRcdFx0XHRcdG1vZGtleXNba2V5XSA9IHRydWU7XG5cdFx0XHRcdFx0a2V5Ym9hcmRfc2hvcnRjdXRfY291bGRfdHJpZ2dlciA9IHRydWU7XG5cdFx0XHRcdH1cblxuXHRcdFx0XHQvLyBDbG9zZSB3ZWJ2aWV3IG9uIEN0cmwvQ21kICsgV1xuXHRcdFx0XHRpZiAoKG9wdHMuY3RybEtleSB8fCBvcHRzLm1ldGFLZXkpICYmIGtleS50b0xvd2VyQ2FzZSgpID09PSBcIndcIikge1xuXHRcdFx0XHRcdGlmIChwcm9wcy5kZXZ0b29sc19yZXF1ZXN0ZXIpIHtcblx0XHRcdFx0XHRcdHByb3BzLmRldnRvb2xzX3JlcXVlc3Rlci5jbG9zZURldlRvb2xzKCk7XG5cdFx0XHRcdFx0XHRjb25zb2xlLmxvZyhcIkNsb3NpbmcgZGV2dG9vbHNcIik7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRcdGNsb3NlV2VidmlldygpO1xuXHRcdFx0XHR9XG5cblx0XHRcdFx0YnJlYWs7XG5cdFx0XHR9XG5cdFx0XHRjYXNlIFwia2V5dXBcIjoge1xuXHRcdFx0XHRjb25zdCBrZXkgPSBlLmFyZ3NbMF07XG5cdFx0XHRcdGNvbnN0IGV2ID0gbmV3IEN1c3RvbUV2ZW50KFwid2Vidmlldy1rZXl1cFwiLCB7XG5cdFx0XHRcdFx0ZGV0YWlsOiB7XG5cdFx0XHRcdFx0XHRrZXksXG5cdFx0XHRcdFx0XHR3ZWJ2aWV3OiB3ZWJ2aWV3X2VsLFxuXHRcdFx0XHRcdH0sXG5cdFx0XHRcdH0pO1xuXHRcdFx0XHR3aW5kb3cuZGlzcGF0Y2hFdmVudChldik7XG5cblx0XHRcdFx0Ly8gVXBkYXRlIG1vZGlmaWVyIGtleSBzdGF0ZVxuXHRcdFx0XHRpZiAoa2V5ID09PSBcIkNvbnRyb2xcIiB8fCBrZXkgPT09IFwiU2hpZnRcIiB8fCBrZXkgPT09IFwiTWV0YVwiKSB7XG5cdFx0XHRcdFx0bW9ka2V5c1trZXldID0gZmFsc2U7XG5cblx0XHRcdFx0XHQvLyBPbmx5IHNldCB0byBmYWxzZSBpZiBubyBtb2RpZmllciBrZXlzIGFyZSBwcmVzc2VkXG5cdFx0XHRcdFx0a2V5Ym9hcmRfc2hvcnRjdXRfY291bGRfdHJpZ2dlciA9IG1vZGtleXMuQ29udHJvbCB8fCBtb2RrZXlzLlNoaWZ0IHx8IG1vZGtleXMuTWV0YTtcblx0XHRcdFx0fVxuXHRcdFx0XHRicmVhaztcblx0XHRcdH1cblx0XHRcdGNhc2UgXCJ2aXNpYmlsaXR5Y2hhbmdlXCI6IHtcblx0XHRcdFx0Y29uc3QgZXYgPSBuZXcgQ3VzdG9tRXZlbnQoXCJ3ZWJ2aWV3LXZpc2liaWxpdHljaGFuZ2VcIiwge1xuXHRcdFx0XHRcdGRldGFpbDoge1xuXHRcdFx0XHRcdFx0aGlkZGVuOiBlLmFyZ3NbMF0sXG5cdFx0XHRcdFx0XHR3ZWJ2aWV3OiB3ZWJ2aWV3X2VsLFxuXHRcdFx0XHRcdH0sXG5cdFx0XHRcdH0pO1xuXHRcdFx0XHR3aW5kb3cuZGlzcGF0Y2hFdmVudChldik7XG5cdFx0XHRcdGJyZWFrO1xuXHRcdFx0fVxuXHRcdFx0Y2FzZSBcImZvY3VzXCI6IHtcblx0XHRcdFx0Y29uc3QgZXYgPSBuZXcgQ3VzdG9tRXZlbnQoXCJ3ZWJ2aWV3LWZvY3VzXCIsIHtcblx0XHRcdFx0XHRkZXRhaWw6IHtcblx0XHRcdFx0XHRcdHdlYnZpZXc6IHdlYnZpZXdfZWwsXG5cdFx0XHRcdFx0fSxcblx0XHRcdFx0fSk7XG5cdFx0XHRcdHdpbmRvdy5kaXNwYXRjaEV2ZW50KGV2KTtcblx0XHRcdFx0YnJlYWs7XG5cdFx0XHR9XG5cdFx0XHRjYXNlIFwiYmx1clwiOiB7XG5cdFx0XHRcdGNvbnN0IGV2ID0gbmV3IEN1c3RvbUV2ZW50KFwid2Vidmlldy1ibHVyXCIsIHtcblx0XHRcdFx0XHRkZXRhaWw6IHtcblx0XHRcdFx0XHRcdHdlYnZpZXc6IHdlYnZpZXdfZWwsXG5cdFx0XHRcdFx0fSxcblx0XHRcdFx0fSk7XG5cdFx0XHRcdHdpbmRvdy5kaXNwYXRjaEV2ZW50KGV2KTtcblxuXHRcdFx0XHQvLyBSZW1vdmUga2V5Ym9hcmQgZm9jdXMgc3RhdGVcblx0XHRcdFx0bW9ka2V5cy5Db250cm9sID0gZmFsc2U7XG5cdFx0XHRcdG1vZGtleXMuU2hpZnQgPSBmYWxzZTtcblx0XHRcdFx0bW9ka2V5cy5NZXRhID0gZmFsc2U7XG5cdFx0XHRcdGtleWJvYXJkX3Nob3J0Y3V0X2NvdWxkX3RyaWdnZXIgPSBmYWxzZTtcblx0XHRcdFx0YnJlYWs7XG5cdFx0XHR9XG5cdFx0fVxuXHR9KTtcblxuXHQvL1xuXHQvLyBGdW5jdGlvbnNcblx0Ly9cblxuXHRmdW5jdGlvbiBjbG9zZVdlYnZpZXcoKSB7XG5cdFx0YXBwbGV0LnJlbW92ZSgpO1xuXHR9XG5cblx0ZnVuY3Rpb24gcHJvY2Vzc1F1ZXJ5KHF1ZXJ5KSB7XG5cdFx0aWYgKCFxdWVyeSkge1xuXHRcdFx0cmV0dXJuIFwiXCI7XG5cdFx0fVxuXG5cdFx0Ly8gVHJpbSBsZWFkaW5nIGFuZCB0cmFpbGluZyB3aGl0ZXNwYWNlXG5cdFx0cXVlcnkgPSBxdWVyeS50cmltKCk7XG5cblx0XHQvLyBIYW5kbGUgc3BlY2lhbCBwcm90b2NvbHMgKGluY2x1ZGluZyBjaHJvbWU6Ly8pXG5cdFx0Y29uc3Qgc3BlY2lhbF9wcm90b2NvbHMgPSBbXG5cdFx0XHRcImNocm9tZTovL1wiLFxuXHRcdFx0XCJhYm91dDpcIixcblx0XHRcdFwiZmlsZTovL1wiLFxuXHRcdFx0XCJkYXRhOlwiLFxuXHRcdFx0XCJqYXZhc2NyaXB0OlwiLFxuXHRcdFx0XCJtYWlsdG86XCIsXG5cdFx0XHRcInRlbDpcIixcblx0XHRcdFwic21zOlwiLFxuXHRcdFx0XCJmdHA6Ly9cIixcblx0XHRdO1xuXHRcdGZvciAoY29uc3QgcHJvdG9jb2wgb2Ygc3BlY2lhbF9wcm90b2NvbHMpIHtcblx0XHRcdGlmIChxdWVyeS50b0xvd2VyQ2FzZSgpLnN0YXJ0c1dpdGgocHJvdG9jb2wpKSB7XG5cdFx0XHRcdHJldHVybiBxdWVyeTtcblx0XHRcdH1cblx0XHR9XG5cblx0XHQvLyBJZiBpdCBhbHJlYWR5IHN0YXJ0cyB3aXRoIGh0dHA6Ly8gb3IgaHR0cHM6Ly8sIGl0J3MgYSBVUkxcblx0XHRpZiAocXVlcnkuc3RhcnRzV2l0aChcImh0dHA6Ly9cIikgfHwgcXVlcnkuc3RhcnRzV2l0aChcImh0dHBzOi8vXCIpKSB7XG5cdFx0XHRyZXR1cm4gcXVlcnk7XG5cdFx0fVxuXG5cdFx0Ly8gQ2hlY2sgZm9yIGxvY2FsaG9zdCBvciBJUCBhZGRyZXNzIHBhdHRlcm5zIChpbmNsdWRpbmcgcG9ydCBudW1iZXJzKVxuXHRcdGNvbnN0IGxvY2FsaG9zdF9wYXR0ZXJuID0gL14obG9jYWxob3N0fDEyN1xcLjBcXC4wXFwuMXxcXFs6OjFcXF0pKDpcXGQrKT8oXFwvLiopPyQvO1xuXHRcdGNvbnN0IGlwX3BhdHRlcm4gPSAvXihcXGR7MSwzfVxcLlxcZHsxLDN9XFwuXFxkezEsM31cXC5cXGR7MSwzfSkoOlxcZCspPyhcXC8uKik/JC87XG5cdFx0aWYgKGxvY2FsaG9zdF9wYXR0ZXJuLnRlc3QocXVlcnkpIHx8IGlwX3BhdHRlcm4udGVzdChxdWVyeSkpIHtcblx0XHRcdHJldHVybiBgaHR0cDovLyR7cXVlcnl9YDtcblx0XHR9XG5cblx0XHQvLyBDaGVjayBmb3Igb2J2aW91cyBVUkwgcGF0dGVybnMgKG5vdyBpbmNsdWRpbmcgc3ViZG9tYWlucylcblx0XHRjb25zdCB1cmxfcGF0dGVybiA9IC9eKFthLXpBLVowLTktXStcXC4pKlthLXpBLVowLTktXSsoXFwuW2EtekEtWl17Mix9KSg6XFxkKyk/KFxcLy4qKT8kLztcblx0XHRpZiAodXJsX3BhdHRlcm4udGVzdChxdWVyeSkpIHtcblx0XHRcdHJldHVybiBgaHR0cHM6Ly8ke3F1ZXJ5fWA7XG5cdFx0fVxuXG5cdFx0Ly8gSWYgaXQncyBub3QgYW4gb2J2aW91cyBVUkwsIHRyZWF0IGl0IGFzIGEgc2VhcmNoIHF1ZXJ5XG5cdFx0cmV0dXJuIGBodHRwczovL3d3dy5nb29nbGUuY29tL3NlYXJjaD9xPSR7ZW5jb2RlVVJJQ29tcG9uZW50KHF1ZXJ5KX1gO1xuXHR9XG5cblx0cmV0dXJuIGFwcGxldDtcbn1cblxuLy9cbi8vIFN0eWxlc1xuLy9cblxuR2xvYmFsU3R5bGVTaGVldChjc3NgXG5cdFtvbS1hcHBsZXQ9XCJ3ZWJ2aWV3XCJdIHtcblx0XHRwb3NpdGlvbjogYWJzb2x1dGU7XG5cdFx0bWluLXdpZHRoOiAxMDBweDtcblx0XHRtaW4taGVpZ2h0OiAxMDBweDtcblx0XHRjb2xvcjogdmFyKC0tY29sb3Itd2hpdGUpO1xuXHRcdGJhY2tncm91bmQtY29sb3I6IHZhcigtLWNvbG9yLW5ldXRyYWwtODAwKTtcblx0XHRib3JkZXItcmFkaXVzOiB2YXIoLS1zaXplLTMpO1xuXHRcdG92ZXJmbG93OiBoaWRkZW47XG5cdFx0dHJhbnNpdGlvbi1wcm9wZXJ0eTogb3V0bGluZTtcblx0XHR0cmFuc2l0aW9uLWR1cmF0aW9uOiAwLjFzO1xuXHRcdHRyYW5zaXRpb24tdGltaW5nLWZ1bmN0aW9uOiB2YXIoLS1lYXNlLWluLW91dCk7XG5cdFx0ZGlzcGxheTogZmxleDtcblx0XHRmbGV4LWRpcmVjdGlvbjogY29sdW1uO1xuXHRcdHBhZGRpbmc6IHZhcigtLXNpemUtMik7XG5cblx0XHRoZWFkZXIge1xuXHRcdFx0ZGlzcGxheTogZmxleDtcblx0XHRcdHBvc2l0aW9uOiByZWxhdGl2ZTtcblx0XHRcdGp1c3RpZnktY29udGVudDogc3BhY2UtYmV0d2Vlbjtcblx0XHRcdGFsaWduLWl0ZW1zOiBjZW50ZXI7XG5cdFx0XHRoZWlnaHQ6IGZpdC1jb250ZW50O1xuXHRcdFx0cGFkZGluZy1ib3R0b206IHZhcigtLXNpemUtMV81KTtcblxuXHRcdFx0LmxvYWRpbmctaW5kaWNhdG9yIHtcblx0XHRcdFx0cG9zaXRpb246IGFic29sdXRlO1xuXHRcdFx0XHRyaWdodDogdmFyKC0tc2l6ZS0xKTtcblx0XHRcdFx0dG9wOiA1MCU7XG5cdFx0XHRcdHRyYW5zZm9ybTogdHJhbnNsYXRlWSgtNTAlKTtcblx0XHRcdFx0ZGlzcGxheTogbm9uZTtcblx0XHRcdFx0bWluLXdpZHRoOiB2YXIoLS1zaXplLTIpO1xuXHRcdFx0XHRtaW4taGVpZ2h0OiB2YXIoLS1zaXplLTIpO1xuXHRcdFx0XHRiYWNrZ3JvdW5kLWNvbG9yOiB0cmFuc3BhcmVudDtcblx0XHRcdFx0dHJhbnNpdGlvbi1wcm9wZXJ0eTogYmFja2dyb3VuZC1jb2xvcjtcblx0XHRcdFx0dHJhbnNpdGlvbi1kdXJhdGlvbjogMC4xNXM7XG5cdFx0XHRcdHRyYW5zaXRpb24tdGltaW5nLWZ1bmN0aW9uOiB2YXIoLS1lYXNlLWluLW91dCk7XG5cdFx0XHRcdGJvcmRlci1yYWRpdXM6IHZhcigtLXNpemUtNjQpO1xuXHRcdFx0XHRtYXJnaW4tdG9wOiB2YXIoLS1zaXplLW5lZy0xKTtcblx0XHRcdH1cblx0XHR9XG5cblx0XHRoZWFkZXJbbmV3LXRhYj1cInRydWVcIl0ge1xuXHRcdFx0aGVpZ2h0OiAxMDAlO1xuXHRcdFx0aW5wdXQge1xuXHRcdFx0XHR0ZXh0LWFsaWduOiBjZW50ZXI7XG5cdFx0XHRcdGhlaWdodDogMTAwJSAhaW1wb3J0YW50O1xuXHRcdFx0fVxuXHRcdH1cblxuXHRcdGltZyB7XG5cdFx0XHRkaXNwbGF5OiBub25lO1xuXHRcdFx0Ym9yZGVyLXJhZGl1czogdmFyKC0tc2l6ZS0yKTtcblx0XHRcdGJveC1zaGFkb3c6IHZhcigtLWZhc3QtdGhpY2tuZXNzLTEpO1xuXHRcdFx0d2lkdGg6IDEwMCU7XG5cdFx0XHRoZWlnaHQ6IDEwMCU7XG5cdFx0XHRiYWNrZ3JvdW5kLWNvbG9yOiB2YXIoLS1jb2xvci1uZXV0cmFsLTgwMCk7XG5cdFx0XHRmaWx0ZXI6IGJsdXIoNXB4KTtcblx0XHR9XG5cblx0XHR3ZWJ2aWV3IHtcblx0XHRcdG92ZXJmbG93OiBoaWRkZW47XG5cdFx0XHRib3JkZXItcmFkaXVzOiB2YXIoLS1zaXplLTIpO1xuXHRcdFx0d2lkdGg6IDEwMCU7XG5cdFx0XHRoZWlnaHQ6IDEwMCU7XG5cdFx0XHRiYWNrZ3JvdW5kLWNvbG9yOiB2YXIoLS1jb2xvci1uZXV0cmFsLTcwMCk7XG5cdFx0XHRvdXRsaW5lOiAwcHggc29saWQgdmFyKC0tY29sb3Itd2hpdGUtNzApO1xuXHRcdFx0dHJhbnNpdGlvbi1wcm9wZXJ0eTogb3V0bGluZTtcblx0XHRcdHRyYW5zaXRpb24tZHVyYXRpb246IDAuMTVzO1xuXHRcdFx0dHJhbnNpdGlvbi10aW1pbmctZnVuY3Rpb246IHZhcigtLWVhc2UtaW4tb3V0KTtcblxuXHRcdFx0ZXJyb3Ige1xuXHRcdFx0XHRjb2xvcjogdmFyKC0tY29sb3Itd2hpdGUpO1xuXHRcdFx0fVxuXHRcdH1cblxuXHRcdGhlYWRlcltuZXctdGFiPVwidHJ1ZVwiXSB+IHdlYnZpZXcge1xuXHRcdFx0aGVpZ2h0OiAwcHggIWltcG9ydGFudDtcblx0XHR9XG5cblx0XHQub3ZlcmxheSB7XG5cdFx0XHRwb3NpdGlvbjogYWJzb2x1dGU7XG5cdFx0XHR0b3A6IDA7XG5cdFx0XHRsZWZ0OiAwO1xuXHRcdFx0d2lkdGg6IDEwMCU7XG5cdFx0XHRoZWlnaHQ6IDEwMCU7XG5cdFx0XHRwb2ludGVyLWV2ZW50czogbm9uZTtcblx0XHRcdG9wYWNpdHk6IDA7XG5cdFx0fVxuXHR9XG5cblx0W29tLWFwcGxldD1cIndlYnZpZXdcIl1baXMtbG9hZGluZz1cInRydWVcIl0gLmxvYWRpbmctaW5kaWNhdG9yIHtcblx0XHRkaXNwbGF5OiBibG9jaztcblx0XHRhbmltYXRpb246IHB1bHNlLWxvYWRpbmctYmFja2dyb3VuZCAxLjVzIGluZmluaXRlO1xuXHR9XG5cblx0QGtleWZyYW1lcyBwdWxzZS1sb2FkaW5nLWJhY2tncm91bmQge1xuXHRcdDAlIHtcblx0XHRcdGJhY2tncm91bmQtY29sb3I6IHZhcigtLWNvbG9yLWJsdWUtMzAwKTtcblx0XHR9XG5cdFx0NTAlIHtcblx0XHRcdGJhY2tncm91bmQtY29sb3I6IHZhcigtLWNvbG9yLWJsdWUtNjAwKTtcblx0XHR9XG5cdFx0MTAwJSB7XG5cdFx0XHRiYWNrZ3JvdW5kLWNvbG9yOiB2YXIoLS1jb2xvci1ibHVlLTMwMCk7XG5cdFx0fVxuXHR9XG5cblx0W29tLWFwcGxldD1cIndlYnZpZXdcIl1ba2V5Ym9hcmQtZm9jdXM9XCJ0cnVlXCJdIHtcblx0XHRvdXRsaW5lOiB2YXIoLS1zaXplLTIpIHNvbGlkICR7ZmFkZShcIi0tY29sb3Itc2xhdGUtNjAwXCIsIDgwKX07XG5cdH1cblxuXHRbb20tYXBwbGV0PVwid2Vidmlld1wiXVtpcy1kZXZ0b29scz1cInRydWVcIl0gaGVhZGVyIHtcblx0XHRkaXNwbGF5OiBub25lO1xuXHR9XG5cblx0W29tLWFwcGxldD1cIndlYnZpZXdcIl1bb20tbW90aW9uPVwicmVzaXppbmdcIl0gd2VidmlldyB7XG5cdFx0LyogZGlzcGxheTogbm9uZTsgKi9cblx0fVxuXHRbb20tYXBwbGV0PVwid2Vidmlld1wiXVtvbS1tb3Rpb249XCJyZXNpemluZ1wiXSBpbWdbZW1wdHk9XCJmYWxzZVwiXSB7XG5cdFx0LyogZGlzcGxheTogYmxvY2s7ICovXG5cdH1cblxuXHQuaXMtZHJhZ2dpbmcgd2Vidmlldyxcblx0LmlzLXBhbm5pbmcgd2Vidmlldyxcblx0LmlzLXpvb21pbmcgd2Vidmlldyxcblx0LmlzLXJlc2l6aW5nIHdlYnZpZXcsXG5cdC5zdXBlci1rZXktZG93biB3ZWJ2aWV3IHtcblx0XHRwb2ludGVyLWV2ZW50czogbm9uZTtcblx0fVxuXG5cdC5zdXBlci1rZXktZG93biBbb20tYXBwbGV0PVwid2Vidmlld1wiXSBvdmVybGF5IHtcblx0XHRwb2ludGVyLWV2ZW50czogYXV0bztcblx0fVxuYCk7XG4iLAogICAgImltcG9ydCB7IHVzZVRhZ3MgfSBmcm9tIFwiQC9saWIvaW1hXCI7XG5pbXBvcnQgeyBjc3MsIGZpbmlzaCwgR2xvYmFsU3R5bGVTaGVldCB9IGZyb20gXCJAL2xpYi91dGlsc1wiO1xuaW1wb3J0IHN5cyBmcm9tIFwiQC9saWIvYnJpZGdlXCI7XG5cbi8vIEdsb2JhbCBzdGF0ZSA/Pz9cblxuLy8gQHRzLWV4cGVjdC1lcnJvclxud2luZG93LmlzX3RyYWNrcGFkID0gZmFsc2U7XG4vLyBAdHMtZXhwZWN0LWVycm9yXG53aW5kb3cuaXNfZGV2dG9vbHNfb3BlbiA9IGF3YWl0IHN5cy53aW4uaXNEZXZ0b29sc09wZW4oKTtcblxuLy8gc3lzLndpbi5kZXZ0b29sc09wZW5lZCgoKSA9PiB7XG4vLyBcdHdpbmRvdy5pc19kZXZ0b29sc19vcGVuID0gdHJ1ZTtcbi8vIH0pO1xuXG4vLyBzeXMud2luLmRldnRvb2xzQ2xvc2VkKCgpID0+IHtcbi8vIFx0d2luZG93LmlzX2RldnRvb2xzX29wZW4gPSBmYWxzZTtcbi8vIH0pO1xuXG4vLyBAVE9ETzogVGhpcyBwcmV2ZW50cyByZWxvYWRzIGFuZCBvdGhlciBhY2NpZGVudGFsIG5hdmlnYXRpb24gZXZlbnRzIGJ1dCB0aGlzIGFsc28gZGlzYWJsZXMgc3BhY2UgbmF2aWdhdGlvbi4gSSBoYXZlIHRvIGZpbmQgYSB3YXkgdG8gcHJvcGVybHkgZml4IHRoaXMuIFdlIGhhdmUgdG8gaGlqYWNrIG5hdmlnYXRpb24gZnJvbSBtYWluIHByb2Nlc3Ncbi8vIHdpbmRvdy5hZGRFdmVudExpc3RlbmVyKFwiYmVmb3JldW5sb2FkXCIsIChlKSA9PiB7XG4vLyBcdGlmICghd2luZG93LmlzX2RldnRvb2xzX29wZW4pIHtcbi8vIFx0XHRlLnByZXZlbnREZWZhdWx0KCk7XG4vLyBcdH1cbi8vIH0pO1xuXG4vLyBPbSBNb2R1bGVzXG5pbXBvcnQgeyBpbml0aWFsaXplRGVza3RvcCB9IGZyb20gXCJAL21vZHVsZXMvb20vZGVza3RvcFwiO1xuaW1wb3J0IFwiQC9tb2R1bGVzL29tL3N1cGVya2V5XCI7XG5cbi8vIEFwcGxldHNcbmltcG9ydCBcIkAvbW9kdWxlcy9vbS9hcHBsZXRzL3Rlc3RcIjtcbmltcG9ydCBcIkAvbW9kdWxlcy9vbS9hcHBsZXRzL3N0aWNreVwiO1xuaW1wb3J0IFwiQC9tb2R1bGVzL29tL2FwcGxldHMvYXBwdmlld1wiO1xuaW1wb3J0IFwiQC9tb2R1bGVzL29tL2FwcGxldHMvd2Vidmlld1wiO1xuXG4vLyBET00gU2V0dXBcbmNvbnN0IHsgbWFpbiB9ID0gdXNlVGFncygpO1xuXG5jb25zdCBPbVNwYWNlID0gbWFpbih7XG5cdGlkOiBcIm9tLXNwYWNlXCIsXG59KTtcblxuZG9jdW1lbnQuYm9keS5hcHBlbmRDaGlsZChPbVNwYWNlKTtcbmF3YWl0IGZpbmlzaCgpO1xuXG4vLyBJbml0YWxpemF0aW9uc1xuYXdhaXQgaW5pdGlhbGl6ZURlc2t0b3AoT21TcGFjZSk7XG5cbkdsb2JhbFN0eWxlU2hlZXQoY3NzYFxuXHQjb20tc3BhY2Uge1xuXHRcdGRpc3BsYXk6IGZsZXg7XG5cdFx0ZmxleC1kaXJlY3Rpb246IGNvbHVtbjtcblx0XHRwb3NpdGlvbjogZml4ZWQ7XG5cdFx0bGVmdDogMDtcblx0XHR0b3A6IDA7XG5cdFx0d2lkdGg6IDEwMHZ3O1xuXHRcdGhlaWdodDogMTAwdmg7XG5cdFx0b3ZlcmZsb3c6IGhpZGRlbjtcblx0XHRjb2xvcjogd2hpdGU7XG5cdFx0YmFja2dyb3VuZDogdHJhbnNwYXJlbnQ7XG5cdH1cblxuXHQjb20tZGVza3RvcDo6LXdlYmtpdC1zY3JvbGxiYXIge1xuXHRcdHdpZHRoOiAxMHB4O1xuXHRcdGhlaWdodDogMTBweDtcblx0fVxuXG5cdCNvbS1kZXNrdG9wOjotd2Via2l0LXNjcm9sbGJhci10cmFjayB7XG5cdFx0YmFja2dyb3VuZDogI2U4ZGZkODtcblx0fVxuXG5cdCNvbS1kZXNrdG9wOjotd2Via2l0LXNjcm9sbGJhci10aHVtYiB7XG5cdFx0YmFja2dyb3VuZDogI2NkMjQzMDtcblx0XHRib3JkZXItcmFkaXVzOiB2YXIoLS1zaXplLTIpO1xuXHR9XG5cblx0I29tLWRlc2t0b3A6Oi13ZWJraXQtc2Nyb2xsYmFyLXRodW1iOmhvdmVyIHtcblx0XHRiYWNrZ3JvdW5kOiAjNDU0NTQ1O1xuXHR9XG5cblx0I29tLWRlc2t0b3A6Oi13ZWJraXQtc2Nyb2xsYmFyLWNvcm5lciB7XG5cdFx0YmFja2dyb3VuZDogI2U4ZGZkODtcblx0fVxuYCk7XG4iCiAgXSwKICAibWFwcGluZ3MiOiAiO0FBd0RPLFNBQVMsYUFBYSxHQUFjO0FBQUEsRUFDMUMsT0FBTyxJQUFJLE1BQU0sQ0FBQyxHQUFHLEVBQUUsS0FBSyxtQkFBbUIsQ0FBQztBQUFBO0FBRzFDLFNBQVMsT0FBTyxDQUFDLFNBQThDO0FBQUEsRUFDckUsTUFBTSxZQUFZLE9BQU8s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QTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQSxpQ0E0R2dCLEtBQUsscUJBQXFCLEVBQUU7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQSxDQXlCNUQ7OztBQ3RoQkQsT0FBTyxjQUFjO0FBRXJCLE9BQU8sbUJBQW1CLE1BQU0sZUFBSSxJQUFJLGVBQWU7QUE0QnZELE1BQVEsU0FBUyxRQUFRO0FBRXpCLElBQU0sVUFBVSxLQUFLO0FBQUEsRUFDcEIsSUFBSTtBQUNMLENBQUM7QUFFRCxTQUFTLEtBQUssWUFBWSxPQUFPO0FBQ2pDLE1BQU0sT0FBTztBQUdiLE1BQU0sa0JBQWtCLE9BQU87QUFFL0IsaUJBQWlCO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQSxDQW1DaEI7IiwKICAiZGVidWdJZCI6ICI4ODlBOTRBQzFFOUVEN0I3NjQ3NTZFMjE2NDc1NkUyMSIsCiAgIm5hbWVzIjogW10KfQ==
