// ima.ts
function useTags(namespace) {
  const is_static = typeof window === "undefined";
  if (is_static) {
    return new Proxy({}, { get: staticTagGenerator });
  } else {
    return new Proxy({}, {
      get: (target, name) => tagGenerator(target, String(name), namespace)
    });
  }
}
if (typeof window === "undefined") {
  global.document = {
    createElement: () => ({}),
    createTextNode: () => ({}),
    createComment: () => ({}),
    createElementNS: () => ({})
  };
  console.warn("Trying to use client-side tags on server.");
}
function tagGenerator(_, name, namespace) {
  return (...args) => {
    let props_obj = {};
    let el_ref;
    let children = args;
    if (args.length > 0) {
      const first_arg = args[0];
      if (typeof first_arg === "string" || typeof first_arg === "number" || first_arg instanceof HTMLElement || typeof first_arg === "function") {
        children = args;
      } else if (Object.getPrototypeOf(first_arg ?? 0) === Object.prototype) {
        const [props_arg, ...rest_args] = args;
        const { is, ref, ...rest_props } = props_arg;
        props_obj = rest_props;
        children = rest_args;
        if (ref && typeof ref === "object" && "current" in ref) {
          el_ref = ref;
        }
      }
    }
    const element = namespace ? document.createElementNS(namespace, name) : document.createElement(name);
    if (el_ref) {
      el_ref.current = element;
    }
    for (const [attr_key, value] of Object.entries(props_obj)) {
      if (attr_key.startsWith("on") && typeof value === "function") {
        const event_name = attr_key.substring(2).toLowerCase();
        element.addEventListener(event_name, value);
        continue;
      }
      if (typeof value === "function" && !attr_key.startsWith("on")) {
        setupReactiveAttr(element, attr_key, value);
        continue;
      }
      if (value === true) {
        element.setAttribute(attr_key, "");
      } else if (value !== false && value != null) {
        element.setAttribute(attr_key, String(value));
      }
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
var tags = new Proxy({}, {
  get: (target, name) => tagGenerator(target, String(name))
});
var reactive_markers = [];
var reactive_callbacks = [];
var reactive_prev_values = [];
var reactive_count = 0;
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
  for (let i = 0;i < reactive_count; i++) {
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
      const new_text = String(new_value ?? "");
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
        new_node = document.createTextNode(String(new_value ?? ""));
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
  for (let read_index = 0;read_index < reactive_count; read_index++) {
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
  for (let i = write_index;i < reactive_count; i++) {
    reactive_markers[i] = null;
    reactive_callbacks[i] = null;
    reactive_prev_values[i] = null;
  }
  reactive_count = write_index;
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
function getFrameTime() {
  return frame_time;
}
function setupReactiveNode(callback) {
  const node_index = reactive_count++;
  const marker = document.createComment(`reactive-${node_index}`);
  const initial_value = callback();
  let initial_node;
  if (initial_value instanceof Node) {
    initial_node = initial_value;
  } else {
    initial_node = document.createTextNode(String(initial_value ?? ""));
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
    element.setAttribute(attr_name, "");
  } else if (initial_value !== false && initial_value != null) {
    element.setAttribute(attr_name, String(initial_value));
  }
  reactive_attr_elements[attr_index] = element;
  reactive_attr_names[attr_index] = attr_name;
  reactive_attr_callbacks[attr_index] = callback;
  reactive_attr_prev_values[attr_index] = initial_value;
}
function staticTagGenerator(_, name) {
  return (...args) => {
    let props_obj = {};
    let children = args;
    if (args.length > 0) {
      const first_arg = args[0];
      if (typeof first_arg === "string" || typeof first_arg === "number" || typeof first_arg === "function") {
        children = args;
      } else if (Object.getPrototypeOf(first_arg ?? 0) === Object.prototype) {
        const [props_arg, ...rest_args] = args;
        const { is, ...rest_props } = props_arg;
        props_obj = rest_props;
        children = rest_args;
      }
    }
    let html = `<${name}`;
    for (const [key, value] of Object.entries(props_obj)) {
      if (key.startsWith("on") || typeof value === "function") {
        continue;
      }
      const attr_key = key === "className" ? "class" : key;
      if (value === true) {
        html += ` ${attr_key}`;
      } else if (value !== false && value != null) {
        const escaped_value = String(value).replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/'/g, "&#39;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
        html += ` ${attr_key}="${escaped_value}"`;
      }
    }
    const void_elements = new Set([
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
    if (void_elements.has(name)) {
      return html + "/>";
    }
    html += ">";
    for (const child of children.flat(Infinity)) {
      if (child != null) {
        if (typeof child === "function") {
          html += String(child());
        } else {
          html += String(child);
        }
      }
    }
    return html + `</${name}>`;
  };
}
var staticTags = new Proxy({}, { get: staticTagGenerator });
export {
  useTags,
  tags,
  staticTags,
  getFrameTime
};
