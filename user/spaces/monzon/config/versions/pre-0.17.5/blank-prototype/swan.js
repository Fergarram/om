// swan.ts
var tag_generator = (_, name) => (...args) => {
  let props = {};
  let children = args;
  if (args.length > 0) {
    const first_arg = args[0];
    if (typeof first_arg === "string" || typeof first_arg === "object" && "html" in first_arg) {
      children = args;
    } else if (Object.getPrototypeOf(first_arg ?? 0) === Object.prototype) {
      const [props_arg, ...rest_args] = args;
      const { is, ...rest_props } = props_arg;
      props = rest_props;
      children = rest_args;
    }
  }
  let html = `<${name}`;
  let js = "";
  const element_id = unique_id();
  for (const [k, v] of Object.entries(props)) {
    const value = typeof v === "function" ? v() : v;
    if (value === true) {
      html += ` ${k}`;
    } else if (value !== false && value != null) {
      if (k.startsWith("on")) {
        html += ` data-swan-id="${element_id}"`;
        const event_name = k.toLowerCase().slice(2);
        js += `document.querySelector('[data-swan-id="${element_id}"]').addEventListener('${event_name}',function(e){${value}});
		            `;
      } else {
        const char_map = {
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;"
        };
        const safe_value = String(value).replace(/[&<>"']/g, (c) => char_map[c]);
        html += ` ${k}="${safe_value}"`;
      }
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
    return { html: html + "/>", js };
  }
  html += ">";
  const add_children = (items) => {
    for (const child of items.flat(Infinity)) {
      if (child != null) {
        if (typeof child === "object" && "html" in child && "js" in child) {
          html += child.html;
          js += child.js;
        } else {
          html += String(child);
        }
      }
    }
  };
  add_children(children);
  return {
    html: html + `</${name}>`,
    js
  };
};
var tags = new Proxy({}, { get: tag_generator });
function dom(input) {
  const html_string = typeof input === "string" ? input : input.html;
  const parser = new DOMParser;
  const doc = parser.parseFromString(html_string, "text/html");
  if (!doc.body.firstElementChild) {
    throw new Error("Invalid HTML string provided to domify");
  }
  return doc.body.firstElementChild;
}
function unique_id() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  if (typeof crypto !== "undefined" && typeof crypto.getRandomValues === "function") {
    const uuid_template2 = "10000000-1000-4000-8000-100000000000";
    const generate_random_hex2 = (c) => {
      const random_byte = crypto.getRandomValues(new Uint8Array(1))[0];
      const c_num = parseInt(c, 10);
      const mask = 15 >> c_num / 4;
      return (c_num ^ random_byte & mask).toString(16);
    };
    return uuid_template2.replace(/[018]/g, generate_random_hex2);
  }
  const uuid_template = "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx";
  const generate_random_hex = (c) => {
    const r = Math.floor(Math.random() * 16);
    const v = c === "x" ? r : r & 3 | 8;
    return v.toString(16);
  };
  return uuid_template.replace(/[xy]/g, generate_random_hex);
}
export {
  tags,
  tag_generator,
  dom
};
