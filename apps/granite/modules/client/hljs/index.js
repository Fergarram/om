import hljs from "./highlight.js";
import javascript from "./languages/javascript.js";
import css from "./languages/css.js";
import xml from "./languages/xml.js";
import json from "./languages/json.js";
import wgsl from "./languages/wgsl.js";

hljs.registerLanguage("xml", xml);
hljs.registerLanguage("javascript", javascript);
hljs.registerLanguage("css", css);
hljs.registerLanguage("json", json);
hljs.registerLanguage("wgsl", wgsl);

export default hljs;
