// node_modules/@anthropic-ai/sdk/version.mjs
var VERSION = "0.36.3";

// node_modules/@anthropic-ai/sdk/_shims/registry.mjs
var auto = false;
var kind = undefined;
var fetch2 = undefined;
var Request2 = undefined;
var Response2 = undefined;
var Headers2 = undefined;
var FormData2 = undefined;
var Blob2 = undefined;
var File2 = undefined;
var ReadableStream2 = undefined;
var getMultipartRequestOptions = undefined;
var getDefaultAgent = undefined;
var fileFromPath = undefined;
var isFsReadStream = undefined;
function setShims(shims, options = { auto: false }) {
  if (auto) {
    throw new Error(`you must \`import '@anthropic-ai/sdk/shims/${shims.kind}'\` before importing anything else from @anthropic-ai/sdk`);
  }
  if (kind) {
    throw new Error(`can't \`import '@anthropic-ai/sdk/shims/${shims.kind}'\` after \`import '@anthropic-ai/sdk/shims/${kind}'\``);
  }
  auto = options.auto;
  kind = shims.kind;
  fetch2 = shims.fetch;
  Request2 = shims.Request;
  Response2 = shims.Response;
  Headers2 = shims.Headers;
  FormData2 = shims.FormData;
  Blob2 = shims.Blob;
  File2 = shims.File;
  ReadableStream2 = shims.ReadableStream;
  getMultipartRequestOptions = shims.getMultipartRequestOptions;
  getDefaultAgent = shims.getDefaultAgent;
  fileFromPath = shims.fileFromPath;
  isFsReadStream = shims.isFsReadStream;
}

// node_modules/@anthropic-ai/sdk/_shims/MultipartBody.mjs
class MultipartBody {
  constructor(body) {
    this.body = body;
  }
  get [Symbol.toStringTag]() {
    return "MultipartBody";
  }
}

// node_modules/@anthropic-ai/sdk/_shims/web-runtime.mjs
function getRuntime({ manuallyImported } = {}) {
  const recommendation = manuallyImported ? `You may need to use polyfills` : `Add one of these imports before your first \`import … from '@anthropic-ai/sdk'\`:
- \`import '@anthropic-ai/sdk/shims/node'\` (if you're running on Node)
- \`import '@anthropic-ai/sdk/shims/web'\` (otherwise)
`;
  let _fetch, _Request, _Response, _Headers;
  try {
    _fetch = fetch;
    _Request = Request;
    _Response = Response;
    _Headers = Headers;
  } catch (error) {
    throw new Error(`this environment is missing the following Web Fetch API type: ${error.message}. ${recommendation}`);
  }
  return {
    kind: "web",
    fetch: _fetch,
    Request: _Request,
    Response: _Response,
    Headers: _Headers,
    FormData: typeof FormData !== "undefined" ? FormData : class FormData3 {
      constructor() {
        throw new Error(`file uploads aren't supported in this environment yet as 'FormData' is undefined. ${recommendation}`);
      }
    },
    Blob: typeof Blob !== "undefined" ? Blob : class Blob3 {
      constructor() {
        throw new Error(`file uploads aren't supported in this environment yet as 'Blob' is undefined. ${recommendation}`);
      }
    },
    File: typeof File !== "undefined" ? File : class File3 {
      constructor() {
        throw new Error(`file uploads aren't supported in this environment yet as 'File' is undefined. ${recommendation}`);
      }
    },
    ReadableStream: typeof ReadableStream !== "undefined" ? ReadableStream : class ReadableStream3 {
      constructor() {
        throw new Error(`streaming isn't supported in this environment yet as 'ReadableStream' is undefined. ${recommendation}`);
      }
    },
    getMultipartRequestOptions: async (form, opts) => ({
      ...opts,
      body: new MultipartBody(form)
    }),
    getDefaultAgent: (url) => {
      return;
    },
    fileFromPath: () => {
      throw new Error("The `fileFromPath` function is only supported in Node. See the README for more details: https://www.github.com/anthropics/anthropic-sdk-typescript#file-uploads");
    },
    isFsReadStream: (value) => false
  };
}

// node_modules/@anthropic-ai/sdk/_shims/index.mjs
if (!kind)
  setShims(getRuntime(), { auto: true });

// node_modules/@anthropic-ai/sdk/error.mjs
class AnthropicError extends Error {
}

class APIError extends AnthropicError {
  constructor(status, error, message, headers) {
    super(`${APIError.makeMessage(status, error, message)}`);
    this.status = status;
    this.headers = headers;
    this.request_id = headers?.["request-id"];
    this.error = error;
  }
  static makeMessage(status, error, message) {
    const msg = error?.message ? typeof error.message === "string" ? error.message : JSON.stringify(error.message) : error ? JSON.stringify(error) : message;
    if (status && msg) {
      return `${status} ${msg}`;
    }
    if (status) {
      return `${status} status code (no body)`;
    }
    if (msg) {
      return msg;
    }
    return "(no status code or body)";
  }
  static generate(status, errorResponse, message, headers) {
    if (!status || !headers) {
      return new APIConnectionError({ message, cause: castToError(errorResponse) });
    }
    const error = errorResponse;
    if (status === 400) {
      return new BadRequestError(status, error, message, headers);
    }
    if (status === 401) {
      return new AuthenticationError(status, error, message, headers);
    }
    if (status === 403) {
      return new PermissionDeniedError(status, error, message, headers);
    }
    if (status === 404) {
      return new NotFoundError(status, error, message, headers);
    }
    if (status === 409) {
      return new ConflictError(status, error, message, headers);
    }
    if (status === 422) {
      return new UnprocessableEntityError(status, error, message, headers);
    }
    if (status === 429) {
      return new RateLimitError(status, error, message, headers);
    }
    if (status >= 500) {
      return new InternalServerError(status, error, message, headers);
    }
    return new APIError(status, error, message, headers);
  }
}

class APIUserAbortError extends APIError {
  constructor({ message } = {}) {
    super(undefined, undefined, message || "Request was aborted.", undefined);
  }
}

class APIConnectionError extends APIError {
  constructor({ message, cause }) {
    super(undefined, undefined, message || "Connection error.", undefined);
    if (cause)
      this.cause = cause;
  }
}

class APIConnectionTimeoutError extends APIConnectionError {
  constructor({ message } = {}) {
    super({ message: message ?? "Request timed out." });
  }
}

class BadRequestError extends APIError {
}

class AuthenticationError extends APIError {
}

class PermissionDeniedError extends APIError {
}

class NotFoundError extends APIError {
}

class ConflictError extends APIError {
}

class UnprocessableEntityError extends APIError {
}

class RateLimitError extends APIError {
}

class InternalServerError extends APIError {
}

// node_modules/@anthropic-ai/sdk/internal/decoders/line.mjs
class LineDecoder {
  constructor() {
    this.buffer = [];
    this.trailingCR = false;
  }
  decode(chunk) {
    let text = this.decodeText(chunk);
    if (this.trailingCR) {
      text = "\r" + text;
      this.trailingCR = false;
    }
    if (text.endsWith("\r")) {
      this.trailingCR = true;
      text = text.slice(0, -1);
    }
    if (!text) {
      return [];
    }
    const trailingNewline = LineDecoder.NEWLINE_CHARS.has(text[text.length - 1] || "");
    let lines = text.split(LineDecoder.NEWLINE_REGEXP);
    if (trailingNewline) {
      lines.pop();
    }
    if (lines.length === 1 && !trailingNewline) {
      this.buffer.push(lines[0]);
      return [];
    }
    if (this.buffer.length > 0) {
      lines = [this.buffer.join("") + lines[0], ...lines.slice(1)];
      this.buffer = [];
    }
    if (!trailingNewline) {
      this.buffer = [lines.pop() || ""];
    }
    return lines;
  }
  decodeText(bytes) {
    if (bytes == null)
      return "";
    if (typeof bytes === "string")
      return bytes;
    if (typeof Buffer !== "undefined") {
      if (bytes instanceof Buffer) {
        return bytes.toString();
      }
      if (bytes instanceof Uint8Array) {
        return Buffer.from(bytes).toString();
      }
      throw new AnthropicError(`Unexpected: received non-Uint8Array (${bytes.constructor.name}) stream chunk in an environment with a global "Buffer" defined, which this library assumes to be Node. Please report this error.`);
    }
    if (typeof TextDecoder !== "undefined") {
      if (bytes instanceof Uint8Array || bytes instanceof ArrayBuffer) {
        this.textDecoder ?? (this.textDecoder = new TextDecoder("utf8"));
        return this.textDecoder.decode(bytes);
      }
      throw new AnthropicError(`Unexpected: received non-Uint8Array/ArrayBuffer (${bytes.constructor.name}) in a web platform. Please report this error.`);
    }
    throw new AnthropicError(`Unexpected: neither Buffer nor TextDecoder are available as globals. Please report this error.`);
  }
  flush() {
    if (!this.buffer.length && !this.trailingCR) {
      return [];
    }
    const lines = [this.buffer.join("")];
    this.buffer = [];
    this.trailingCR = false;
    return lines;
  }
}
LineDecoder.NEWLINE_CHARS = new Set([`
`, "\r"]);
LineDecoder.NEWLINE_REGEXP = /\r\n|[\n\r]/g;

// node_modules/@anthropic-ai/sdk/internal/stream-utils.mjs
function ReadableStreamToAsyncIterable(stream) {
  if (stream[Symbol.asyncIterator])
    return stream;
  const reader = stream.getReader();
  return {
    async next() {
      try {
        const result = await reader.read();
        if (result?.done)
          reader.releaseLock();
        return result;
      } catch (e) {
        reader.releaseLock();
        throw e;
      }
    },
    async return() {
      const cancelPromise = reader.cancel();
      reader.releaseLock();
      await cancelPromise;
      return { done: true, value: undefined };
    },
    [Symbol.asyncIterator]() {
      return this;
    }
  };
}

// node_modules/@anthropic-ai/sdk/streaming.mjs
class Stream {
  constructor(iterator, controller) {
    this.iterator = iterator;
    this.controller = controller;
  }
  static fromSSEResponse(response, controller) {
    let consumed = false;
    async function* iterator() {
      if (consumed) {
        throw new Error("Cannot iterate over a consumed stream, use `.tee()` to split the stream.");
      }
      consumed = true;
      let done = false;
      try {
        for await (const sse of _iterSSEMessages(response, controller)) {
          if (sse.event === "completion") {
            try {
              yield JSON.parse(sse.data);
            } catch (e) {
              console.error(`Could not parse message into JSON:`, sse.data);
              console.error(`From chunk:`, sse.raw);
              throw e;
            }
          }
          if (sse.event === "message_start" || sse.event === "message_delta" || sse.event === "message_stop" || sse.event === "content_block_start" || sse.event === "content_block_delta" || sse.event === "content_block_stop") {
            try {
              yield JSON.parse(sse.data);
            } catch (e) {
              console.error(`Could not parse message into JSON:`, sse.data);
              console.error(`From chunk:`, sse.raw);
              throw e;
            }
          }
          if (sse.event === "ping") {
            continue;
          }
          if (sse.event === "error") {
            throw APIError.generate(undefined, `SSE Error: ${sse.data}`, sse.data, createResponseHeaders(response.headers));
          }
        }
        done = true;
      } catch (e) {
        if (e instanceof Error && e.name === "AbortError")
          return;
        throw e;
      } finally {
        if (!done)
          controller.abort();
      }
    }
    return new Stream(iterator, controller);
  }
  static fromReadableStream(readableStream, controller) {
    let consumed = false;
    async function* iterLines() {
      const lineDecoder = new LineDecoder;
      const iter = ReadableStreamToAsyncIterable(readableStream);
      for await (const chunk of iter) {
        for (const line of lineDecoder.decode(chunk)) {
          yield line;
        }
      }
      for (const line of lineDecoder.flush()) {
        yield line;
      }
    }
    async function* iterator() {
      if (consumed) {
        throw new Error("Cannot iterate over a consumed stream, use `.tee()` to split the stream.");
      }
      consumed = true;
      let done = false;
      try {
        for await (const line of iterLines()) {
          if (done)
            continue;
          if (line)
            yield JSON.parse(line);
        }
        done = true;
      } catch (e) {
        if (e instanceof Error && e.name === "AbortError")
          return;
        throw e;
      } finally {
        if (!done)
          controller.abort();
      }
    }
    return new Stream(iterator, controller);
  }
  [Symbol.asyncIterator]() {
    return this.iterator();
  }
  tee() {
    const left = [];
    const right = [];
    const iterator = this.iterator();
    const teeIterator = (queue) => {
      return {
        next: () => {
          if (queue.length === 0) {
            const result = iterator.next();
            left.push(result);
            right.push(result);
          }
          return queue.shift();
        }
      };
    };
    return [
      new Stream(() => teeIterator(left), this.controller),
      new Stream(() => teeIterator(right), this.controller)
    ];
  }
  toReadableStream() {
    const self = this;
    let iter;
    const encoder = new TextEncoder;
    return new ReadableStream2({
      async start() {
        iter = self[Symbol.asyncIterator]();
      },
      async pull(ctrl) {
        try {
          const { value, done } = await iter.next();
          if (done)
            return ctrl.close();
          const bytes = encoder.encode(JSON.stringify(value) + `
`);
          ctrl.enqueue(bytes);
        } catch (err) {
          ctrl.error(err);
        }
      },
      async cancel() {
        await iter.return?.();
      }
    });
  }
}
async function* _iterSSEMessages(response, controller) {
  if (!response.body) {
    controller.abort();
    throw new AnthropicError(`Attempted to iterate over a response with no body`);
  }
  const sseDecoder = new SSEDecoder;
  const lineDecoder = new LineDecoder;
  const iter = ReadableStreamToAsyncIterable(response.body);
  for await (const sseChunk of iterSSEChunks(iter)) {
    for (const line of lineDecoder.decode(sseChunk)) {
      const sse = sseDecoder.decode(line);
      if (sse)
        yield sse;
    }
  }
  for (const line of lineDecoder.flush()) {
    const sse = sseDecoder.decode(line);
    if (sse)
      yield sse;
  }
}
async function* iterSSEChunks(iterator) {
  let data = new Uint8Array;
  for await (const chunk of iterator) {
    if (chunk == null) {
      continue;
    }
    const binaryChunk = chunk instanceof ArrayBuffer ? new Uint8Array(chunk) : typeof chunk === "string" ? new TextEncoder().encode(chunk) : chunk;
    let newData = new Uint8Array(data.length + binaryChunk.length);
    newData.set(data);
    newData.set(binaryChunk, data.length);
    data = newData;
    let patternIndex;
    while ((patternIndex = findDoubleNewlineIndex(data)) !== -1) {
      yield data.slice(0, patternIndex);
      data = data.slice(patternIndex);
    }
  }
  if (data.length > 0) {
    yield data;
  }
}
function findDoubleNewlineIndex(buffer) {
  const newline = 10;
  const carriage = 13;
  for (let i = 0;i < buffer.length - 2; i++) {
    if (buffer[i] === newline && buffer[i + 1] === newline) {
      return i + 2;
    }
    if (buffer[i] === carriage && buffer[i + 1] === carriage) {
      return i + 2;
    }
    if (buffer[i] === carriage && buffer[i + 1] === newline && i + 3 < buffer.length && buffer[i + 2] === carriage && buffer[i + 3] === newline) {
      return i + 4;
    }
  }
  return -1;
}

class SSEDecoder {
  constructor() {
    this.event = null;
    this.data = [];
    this.chunks = [];
  }
  decode(line) {
    if (line.endsWith("\r")) {
      line = line.substring(0, line.length - 1);
    }
    if (!line) {
      if (!this.event && !this.data.length)
        return null;
      const sse = {
        event: this.event,
        data: this.data.join(`
`),
        raw: this.chunks
      };
      this.event = null;
      this.data = [];
      this.chunks = [];
      return sse;
    }
    this.chunks.push(line);
    if (line.startsWith(":")) {
      return null;
    }
    let [fieldname, _, value] = partition(line, ":");
    if (value.startsWith(" ")) {
      value = value.substring(1);
    }
    if (fieldname === "event") {
      this.event = value;
    } else if (fieldname === "data") {
      this.data.push(value);
    }
    return null;
  }
}
function partition(str, delimiter) {
  const index = str.indexOf(delimiter);
  if (index !== -1) {
    return [str.substring(0, index), delimiter, str.substring(index + delimiter.length)];
  }
  return [str, "", ""];
}

// node_modules/@anthropic-ai/sdk/uploads.mjs
var isResponseLike = (value) => value != null && typeof value === "object" && typeof value.url === "string" && typeof value.blob === "function";
var isFileLike = (value) => value != null && typeof value === "object" && typeof value.name === "string" && typeof value.lastModified === "number" && isBlobLike(value);
var isBlobLike = (value) => value != null && typeof value === "object" && typeof value.size === "number" && typeof value.type === "string" && typeof value.text === "function" && typeof value.slice === "function" && typeof value.arrayBuffer === "function";
async function toFile(value, name, options) {
  value = await value;
  if (isFileLike(value)) {
    return value;
  }
  if (isResponseLike(value)) {
    const blob = await value.blob();
    name || (name = new URL(value.url).pathname.split(/[\\/]/).pop() ?? "unknown_file");
    const data = isBlobLike(blob) ? [await blob.arrayBuffer()] : [blob];
    return new File2(data, name, options);
  }
  const bits = await getBytes(value);
  name || (name = getName(value) ?? "unknown_file");
  if (!options?.type) {
    const type = bits[0]?.type;
    if (typeof type === "string") {
      options = { ...options, type };
    }
  }
  return new File2(bits, name, options);
}
async function getBytes(value) {
  let parts = [];
  if (typeof value === "string" || ArrayBuffer.isView(value) || value instanceof ArrayBuffer) {
    parts.push(value);
  } else if (isBlobLike(value)) {
    parts.push(await value.arrayBuffer());
  } else if (isAsyncIterableIterator(value)) {
    for await (const chunk of value) {
      parts.push(chunk);
    }
  } else {
    throw new Error(`Unexpected data type: ${typeof value}; constructor: ${value?.constructor?.name}; props: ${propsForError(value)}`);
  }
  return parts;
}
function propsForError(value) {
  const props = Object.getOwnPropertyNames(value);
  return `[${props.map((p) => `"${p}"`).join(", ")}]`;
}
function getName(value) {
  return getStringFromMaybeBuffer(value.name) || getStringFromMaybeBuffer(value.filename) || getStringFromMaybeBuffer(value.path)?.split(/[\\/]/).pop();
}
var getStringFromMaybeBuffer = (x) => {
  if (typeof x === "string")
    return x;
  if (typeof Buffer !== "undefined" && x instanceof Buffer)
    return String(x);
  return;
};
var isAsyncIterableIterator = (value) => value != null && typeof value === "object" && typeof value[Symbol.asyncIterator] === "function";
var isMultipartBody = (body) => body && typeof body === "object" && body.body && body[Symbol.toStringTag] === "MultipartBody";

// node_modules/@anthropic-ai/sdk/core.mjs
var __classPrivateFieldSet = function(receiver, state, value, kind2, f) {
  if (kind2 === "m")
    throw new TypeError("Private method is not writable");
  if (kind2 === "a" && !f)
    throw new TypeError("Private accessor was defined without a setter");
  if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver))
    throw new TypeError("Cannot write private member to an object whose class did not declare it");
  return kind2 === "a" ? f.call(receiver, value) : f ? f.value = value : state.set(receiver, value), value;
};
var __classPrivateFieldGet = function(receiver, state, kind2, f) {
  if (kind2 === "a" && !f)
    throw new TypeError("Private accessor was defined without a getter");
  if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver))
    throw new TypeError("Cannot read private member from an object whose class did not declare it");
  return kind2 === "m" ? f : kind2 === "a" ? f.call(receiver) : f ? f.value : state.get(receiver);
};
var _AbstractPage_client;
async function defaultParseResponse(props) {
  const { response } = props;
  if (props.options.stream) {
    debug("response", response.status, response.url, response.headers, response.body);
    if (props.options.__streamClass) {
      return props.options.__streamClass.fromSSEResponse(response, props.controller);
    }
    return Stream.fromSSEResponse(response, props.controller);
  }
  if (response.status === 204) {
    return null;
  }
  if (props.options.__binaryResponse) {
    return response;
  }
  const contentType = response.headers.get("content-type");
  const isJSON = contentType?.includes("application/json") || contentType?.includes("application/vnd.api+json");
  if (isJSON) {
    const json = await response.json();
    debug("response", response.status, response.url, response.headers, json);
    return _addRequestID(json, response);
  }
  const text = await response.text();
  debug("response", response.status, response.url, response.headers, text);
  return text;
}
function _addRequestID(value, response) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return value;
  }
  return Object.defineProperty(value, "_request_id", {
    value: response.headers.get("request-id"),
    enumerable: false
  });
}

class APIPromise extends Promise {
  constructor(responsePromise, parseResponse = defaultParseResponse) {
    super((resolve) => {
      resolve(null);
    });
    this.responsePromise = responsePromise;
    this.parseResponse = parseResponse;
  }
  _thenUnwrap(transform) {
    return new APIPromise(this.responsePromise, async (props) => _addRequestID(transform(await this.parseResponse(props), props), props.response));
  }
  asResponse() {
    return this.responsePromise.then((p) => p.response);
  }
  async withResponse() {
    const [data, response] = await Promise.all([this.parse(), this.asResponse()]);
    return { data, response, request_id: response.headers.get("request-id") };
  }
  parse() {
    if (!this.parsedPromise) {
      this.parsedPromise = this.responsePromise.then(this.parseResponse);
    }
    return this.parsedPromise;
  }
  then(onfulfilled, onrejected) {
    return this.parse().then(onfulfilled, onrejected);
  }
  catch(onrejected) {
    return this.parse().catch(onrejected);
  }
  finally(onfinally) {
    return this.parse().finally(onfinally);
  }
}

class APIClient {
  constructor({
    baseURL,
    maxRetries = 2,
    timeout = 600000,
    httpAgent,
    fetch: overriddenFetch
  }) {
    this.baseURL = baseURL;
    this.maxRetries = validatePositiveInteger("maxRetries", maxRetries);
    this.timeout = validatePositiveInteger("timeout", timeout);
    this.httpAgent = httpAgent;
    this.fetch = overriddenFetch ?? fetch2;
  }
  authHeaders(opts) {
    return {};
  }
  defaultHeaders(opts) {
    return {
      Accept: "application/json",
      "Content-Type": "application/json",
      "User-Agent": this.getUserAgent(),
      ...getPlatformHeaders(),
      ...this.authHeaders(opts)
    };
  }
  validateHeaders(headers, customHeaders) {
  }
  defaultIdempotencyKey() {
    return `stainless-node-retry-${uuid4()}`;
  }
  get(path, opts) {
    return this.methodRequest("get", path, opts);
  }
  post(path, opts) {
    return this.methodRequest("post", path, opts);
  }
  patch(path, opts) {
    return this.methodRequest("patch", path, opts);
  }
  put(path, opts) {
    return this.methodRequest("put", path, opts);
  }
  delete(path, opts) {
    return this.methodRequest("delete", path, opts);
  }
  methodRequest(method, path, opts) {
    return this.request(Promise.resolve(opts).then(async (opts2) => {
      const body = opts2 && isBlobLike(opts2?.body) ? new DataView(await opts2.body.arrayBuffer()) : opts2?.body instanceof DataView ? opts2.body : opts2?.body instanceof ArrayBuffer ? new DataView(opts2.body) : opts2 && ArrayBuffer.isView(opts2?.body) ? new DataView(opts2.body.buffer) : opts2?.body;
      return { method, path, ...opts2, body };
    }));
  }
  getAPIList(path, Page, opts) {
    return this.requestAPIList(Page, { method: "get", path, ...opts });
  }
  calculateContentLength(body) {
    if (typeof body === "string") {
      if (typeof Buffer !== "undefined") {
        return Buffer.byteLength(body, "utf8").toString();
      }
      if (typeof TextEncoder !== "undefined") {
        const encoder = new TextEncoder;
        const encoded = encoder.encode(body);
        return encoded.length.toString();
      }
    } else if (ArrayBuffer.isView(body)) {
      return body.byteLength.toString();
    }
    return null;
  }
  buildRequest(options, { retryCount = 0 } = {}) {
    const { method, path, query, headers = {} } = options;
    const body = ArrayBuffer.isView(options.body) || options.__binaryRequest && typeof options.body === "string" ? options.body : isMultipartBody(options.body) ? options.body.body : options.body ? JSON.stringify(options.body, null, 2) : null;
    const contentLength = this.calculateContentLength(body);
    const url = this.buildURL(path, query);
    if ("timeout" in options)
      validatePositiveInteger("timeout", options.timeout);
    const timeout = options.timeout ?? this.timeout;
    const httpAgent = options.httpAgent ?? this.httpAgent ?? getDefaultAgent(url);
    const minAgentTimeout = timeout + 1000;
    if (typeof httpAgent?.options?.timeout === "number" && minAgentTimeout > (httpAgent.options.timeout ?? 0)) {
      httpAgent.options.timeout = minAgentTimeout;
    }
    if (this.idempotencyHeader && method !== "get") {
      if (!options.idempotencyKey)
        options.idempotencyKey = this.defaultIdempotencyKey();
      headers[this.idempotencyHeader] = options.idempotencyKey;
    }
    const reqHeaders = this.buildHeaders({ options, headers, contentLength, retryCount });
    const req = {
      method,
      ...body && { body },
      headers: reqHeaders,
      ...httpAgent && { agent: httpAgent },
      signal: options.signal ?? null
    };
    return { req, url, timeout };
  }
  buildHeaders({ options, headers, contentLength, retryCount }) {
    const reqHeaders = {};
    if (contentLength) {
      reqHeaders["content-length"] = contentLength;
    }
    const defaultHeaders = this.defaultHeaders(options);
    applyHeadersMut(reqHeaders, defaultHeaders);
    applyHeadersMut(reqHeaders, headers);
    if (isMultipartBody(options.body) && kind !== "node") {
      delete reqHeaders["content-type"];
    }
    if (getHeader(defaultHeaders, "x-stainless-retry-count") === undefined && getHeader(headers, "x-stainless-retry-count") === undefined) {
      reqHeaders["x-stainless-retry-count"] = String(retryCount);
    }
    this.validateHeaders(reqHeaders, headers);
    return reqHeaders;
  }
  async prepareOptions(options) {
  }
  async prepareRequest(request, { url, options }) {
  }
  parseHeaders(headers) {
    return !headers ? {} : (Symbol.iterator in headers) ? Object.fromEntries(Array.from(headers).map((header) => [...header])) : { ...headers };
  }
  makeStatusError(status, error, message, headers) {
    return APIError.generate(status, error, message, headers);
  }
  request(options, remainingRetries = null) {
    return new APIPromise(this.makeRequest(options, remainingRetries));
  }
  async makeRequest(optionsInput, retriesRemaining) {
    const options = await optionsInput;
    const maxRetries = options.maxRetries ?? this.maxRetries;
    if (retriesRemaining == null) {
      retriesRemaining = maxRetries;
    }
    await this.prepareOptions(options);
    const { req, url, timeout } = this.buildRequest(options, { retryCount: maxRetries - retriesRemaining });
    await this.prepareRequest(req, { url, options });
    debug("request", url, options, req.headers);
    if (options.signal?.aborted) {
      throw new APIUserAbortError;
    }
    const controller = new AbortController;
    const response = await this.fetchWithTimeout(url, req, timeout, controller).catch(castToError);
    if (response instanceof Error) {
      if (options.signal?.aborted) {
        throw new APIUserAbortError;
      }
      if (retriesRemaining) {
        return this.retryRequest(options, retriesRemaining);
      }
      if (response.name === "AbortError") {
        throw new APIConnectionTimeoutError;
      }
      throw new APIConnectionError({ cause: response });
    }
    const responseHeaders = createResponseHeaders(response.headers);
    if (!response.ok) {
      if (retriesRemaining && this.shouldRetry(response)) {
        const retryMessage2 = `retrying, ${retriesRemaining} attempts remaining`;
        debug(`response (error; ${retryMessage2})`, response.status, url, responseHeaders);
        return this.retryRequest(options, retriesRemaining, responseHeaders);
      }
      const errText = await response.text().catch((e) => castToError(e).message);
      const errJSON = safeJSON(errText);
      const errMessage = errJSON ? undefined : errText;
      const retryMessage = retriesRemaining ? `(error; no more retries left)` : `(error; not retryable)`;
      debug(`response (error; ${retryMessage})`, response.status, url, responseHeaders, errMessage);
      const err = this.makeStatusError(response.status, errJSON, errMessage, responseHeaders);
      throw err;
    }
    return { response, options, controller };
  }
  requestAPIList(Page, options) {
    const request = this.makeRequest(options, null);
    return new PagePromise(this, request, Page);
  }
  buildURL(path, query) {
    const url = isAbsoluteURL(path) ? new URL(path) : new URL(this.baseURL + (this.baseURL.endsWith("/") && path.startsWith("/") ? path.slice(1) : path));
    const defaultQuery = this.defaultQuery();
    if (!isEmptyObj(defaultQuery)) {
      query = { ...defaultQuery, ...query };
    }
    if (typeof query === "object" && query && !Array.isArray(query)) {
      url.search = this.stringifyQuery(query);
    }
    return url.toString();
  }
  stringifyQuery(query) {
    return Object.entries(query).filter(([_, value]) => typeof value !== "undefined").map(([key, value]) => {
      if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
        return `${encodeURIComponent(key)}=${encodeURIComponent(value)}`;
      }
      if (value === null) {
        return `${encodeURIComponent(key)}=`;
      }
      throw new AnthropicError(`Cannot stringify type ${typeof value}; Expected string, number, boolean, or null. If you need to pass nested query parameters, you can manually encode them, e.g. { query: { 'foo[key1]': value1, 'foo[key2]': value2 } }, and please open a GitHub issue requesting better support for your use case.`);
    }).join("&");
  }
  async fetchWithTimeout(url, init, ms, controller) {
    const { signal, ...options } = init || {};
    if (signal)
      signal.addEventListener("abort", () => controller.abort());
    const timeout = setTimeout(() => controller.abort(), ms);
    const fetchOptions = {
      signal: controller.signal,
      ...options
    };
    if (fetchOptions.method) {
      fetchOptions.method = fetchOptions.method.toUpperCase();
    }
    return this.fetch.call(undefined, url, fetchOptions).finally(() => {
      clearTimeout(timeout);
    });
  }
  shouldRetry(response) {
    const shouldRetryHeader = response.headers.get("x-should-retry");
    if (shouldRetryHeader === "true")
      return true;
    if (shouldRetryHeader === "false")
      return false;
    if (response.status === 408)
      return true;
    if (response.status === 409)
      return true;
    if (response.status === 429)
      return true;
    if (response.status >= 500)
      return true;
    return false;
  }
  async retryRequest(options, retriesRemaining, responseHeaders) {
    let timeoutMillis;
    const retryAfterMillisHeader = responseHeaders?.["retry-after-ms"];
    if (retryAfterMillisHeader) {
      const timeoutMs = parseFloat(retryAfterMillisHeader);
      if (!Number.isNaN(timeoutMs)) {
        timeoutMillis = timeoutMs;
      }
    }
    const retryAfterHeader = responseHeaders?.["retry-after"];
    if (retryAfterHeader && !timeoutMillis) {
      const timeoutSeconds = parseFloat(retryAfterHeader);
      if (!Number.isNaN(timeoutSeconds)) {
        timeoutMillis = timeoutSeconds * 1000;
      } else {
        timeoutMillis = Date.parse(retryAfterHeader) - Date.now();
      }
    }
    if (!(timeoutMillis && 0 <= timeoutMillis && timeoutMillis < 60 * 1000)) {
      const maxRetries = options.maxRetries ?? this.maxRetries;
      timeoutMillis = this.calculateDefaultRetryTimeoutMillis(retriesRemaining, maxRetries);
    }
    await sleep(timeoutMillis);
    return this.makeRequest(options, retriesRemaining - 1);
  }
  calculateDefaultRetryTimeoutMillis(retriesRemaining, maxRetries) {
    const initialRetryDelay = 0.5;
    const maxRetryDelay = 8;
    const numRetries = maxRetries - retriesRemaining;
    const sleepSeconds = Math.min(initialRetryDelay * Math.pow(2, numRetries), maxRetryDelay);
    const jitter = 1 - Math.random() * 0.25;
    return sleepSeconds * jitter * 1000;
  }
  getUserAgent() {
    return `${this.constructor.name}/JS ${VERSION}`;
  }
}

class AbstractPage {
  constructor(client, response, body, options) {
    _AbstractPage_client.set(this, undefined);
    __classPrivateFieldSet(this, _AbstractPage_client, client, "f");
    this.options = options;
    this.response = response;
    this.body = body;
  }
  hasNextPage() {
    const items = this.getPaginatedItems();
    if (!items.length)
      return false;
    return this.nextPageInfo() != null;
  }
  async getNextPage() {
    const nextInfo = this.nextPageInfo();
    if (!nextInfo) {
      throw new AnthropicError("No next page expected; please check `.hasNextPage()` before calling `.getNextPage()`.");
    }
    const nextOptions = { ...this.options };
    if ("params" in nextInfo && typeof nextOptions.query === "object") {
      nextOptions.query = { ...nextOptions.query, ...nextInfo.params };
    } else if ("url" in nextInfo) {
      const params = [...Object.entries(nextOptions.query || {}), ...nextInfo.url.searchParams.entries()];
      for (const [key, value] of params) {
        nextInfo.url.searchParams.set(key, value);
      }
      nextOptions.query = undefined;
      nextOptions.path = nextInfo.url.toString();
    }
    return await __classPrivateFieldGet(this, _AbstractPage_client, "f").requestAPIList(this.constructor, nextOptions);
  }
  async* iterPages() {
    let page = this;
    yield page;
    while (page.hasNextPage()) {
      page = await page.getNextPage();
      yield page;
    }
  }
  async* [(_AbstractPage_client = new WeakMap, Symbol.asyncIterator)]() {
    for await (const page of this.iterPages()) {
      for (const item of page.getPaginatedItems()) {
        yield item;
      }
    }
  }
}

class PagePromise extends APIPromise {
  constructor(client, request, Page) {
    super(request, async (props) => new Page(client, props.response, await defaultParseResponse(props), props.options));
  }
  async* [Symbol.asyncIterator]() {
    const page = await this;
    for await (const item of page) {
      yield item;
    }
  }
}
var createResponseHeaders = (headers) => {
  return new Proxy(Object.fromEntries(headers.entries()), {
    get(target, name) {
      const key = name.toString();
      return target[key.toLowerCase()] || target[key];
    }
  });
};
var requestOptionsKeys = {
  method: true,
  path: true,
  query: true,
  body: true,
  headers: true,
  maxRetries: true,
  stream: true,
  timeout: true,
  httpAgent: true,
  signal: true,
  idempotencyKey: true,
  __binaryRequest: true,
  __binaryResponse: true,
  __streamClass: true
};
var isRequestOptions = (obj) => {
  return typeof obj === "object" && obj !== null && !isEmptyObj(obj) && Object.keys(obj).every((k) => hasOwn(requestOptionsKeys, k));
};
var getPlatformProperties = () => {
  if (typeof Deno !== "undefined" && Deno.build != null) {
    return {
      "X-Stainless-Lang": "js",
      "X-Stainless-Package-Version": VERSION,
      "X-Stainless-OS": normalizePlatform(Deno.build.os),
      "X-Stainless-Arch": normalizeArch(Deno.build.arch),
      "X-Stainless-Runtime": "deno",
      "X-Stainless-Runtime-Version": typeof Deno.version === "string" ? Deno.version : Deno.version?.deno ?? "unknown"
    };
  }
  if (typeof EdgeRuntime !== "undefined") {
    return {
      "X-Stainless-Lang": "js",
      "X-Stainless-Package-Version": VERSION,
      "X-Stainless-OS": "Unknown",
      "X-Stainless-Arch": `other:${EdgeRuntime}`,
      "X-Stainless-Runtime": "edge",
      "X-Stainless-Runtime-Version": process.version
    };
  }
  if (Object.prototype.toString.call(typeof process !== "undefined" ? process : 0) === "[object process]") {
    return {
      "X-Stainless-Lang": "js",
      "X-Stainless-Package-Version": VERSION,
      "X-Stainless-OS": normalizePlatform(process.platform),
      "X-Stainless-Arch": normalizeArch(process.arch),
      "X-Stainless-Runtime": "node",
      "X-Stainless-Runtime-Version": process.version
    };
  }
  const browserInfo = getBrowserInfo();
  if (browserInfo) {
    return {
      "X-Stainless-Lang": "js",
      "X-Stainless-Package-Version": VERSION,
      "X-Stainless-OS": "Unknown",
      "X-Stainless-Arch": "unknown",
      "X-Stainless-Runtime": `browser:${browserInfo.browser}`,
      "X-Stainless-Runtime-Version": browserInfo.version
    };
  }
  return {
    "X-Stainless-Lang": "js",
    "X-Stainless-Package-Version": VERSION,
    "X-Stainless-OS": "Unknown",
    "X-Stainless-Arch": "unknown",
    "X-Stainless-Runtime": "unknown",
    "X-Stainless-Runtime-Version": "unknown"
  };
};
function getBrowserInfo() {
  if (typeof navigator === "undefined" || !navigator) {
    return null;
  }
  const browserPatterns = [
    { key: "edge", pattern: /Edge(?:\W+(\d+)\.(\d+)(?:\.(\d+))?)?/ },
    { key: "ie", pattern: /MSIE(?:\W+(\d+)\.(\d+)(?:\.(\d+))?)?/ },
    { key: "ie", pattern: /Trident(?:.*rv\:(\d+)\.(\d+)(?:\.(\d+))?)?/ },
    { key: "chrome", pattern: /Chrome(?:\W+(\d+)\.(\d+)(?:\.(\d+))?)?/ },
    { key: "firefox", pattern: /Firefox(?:\W+(\d+)\.(\d+)(?:\.(\d+))?)?/ },
    { key: "safari", pattern: /(?:Version\W+(\d+)\.(\d+)(?:\.(\d+))?)?(?:\W+Mobile\S*)?\W+Safari/ }
  ];
  for (const { key, pattern } of browserPatterns) {
    const match = pattern.exec(navigator.userAgent);
    if (match) {
      const major = match[1] || 0;
      const minor = match[2] || 0;
      const patch = match[3] || 0;
      return { browser: key, version: `${major}.${minor}.${patch}` };
    }
  }
  return null;
}
var normalizeArch = (arch) => {
  if (arch === "x32")
    return "x32";
  if (arch === "x86_64" || arch === "x64")
    return "x64";
  if (arch === "arm")
    return "arm";
  if (arch === "aarch64" || arch === "arm64")
    return "arm64";
  if (arch)
    return `other:${arch}`;
  return "unknown";
};
var normalizePlatform = (platform) => {
  platform = platform.toLowerCase();
  if (platform.includes("ios"))
    return "iOS";
  if (platform === "android")
    return "Android";
  if (platform === "darwin")
    return "MacOS";
  if (platform === "win32")
    return "Windows";
  if (platform === "freebsd")
    return "FreeBSD";
  if (platform === "openbsd")
    return "OpenBSD";
  if (platform === "linux")
    return "Linux";
  if (platform)
    return `Other:${platform}`;
  return "Unknown";
};
var _platformHeaders;
var getPlatformHeaders = () => {
  return _platformHeaders ?? (_platformHeaders = getPlatformProperties());
};
var safeJSON = (text) => {
  try {
    return JSON.parse(text);
  } catch (err) {
    return;
  }
};
var startsWithSchemeRegexp = /^[a-z][a-z0-9+.-]*:/i;
var isAbsoluteURL = (url) => {
  return startsWithSchemeRegexp.test(url);
};
var sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
var validatePositiveInteger = (name, n) => {
  if (typeof n !== "number" || !Number.isInteger(n)) {
    throw new AnthropicError(`${name} must be an integer`);
  }
  if (n < 0) {
    throw new AnthropicError(`${name} must be a positive integer`);
  }
  return n;
};
var castToError = (err) => {
  if (err instanceof Error)
    return err;
  if (typeof err === "object" && err !== null) {
    try {
      return new Error(JSON.stringify(err));
    } catch {
    }
  }
  return new Error(String(err));
};
var readEnv = (env) => {
  if (typeof process !== "undefined") {
    return process.env?.[env]?.trim() ?? undefined;
  }
  if (typeof Deno !== "undefined") {
    return Deno.env?.get?.(env)?.trim();
  }
  return;
};
function isEmptyObj(obj) {
  if (!obj)
    return true;
  for (const _k in obj)
    return false;
  return true;
}
function hasOwn(obj, key) {
  return Object.prototype.hasOwnProperty.call(obj, key);
}
function applyHeadersMut(targetHeaders, newHeaders) {
  for (const k in newHeaders) {
    if (!hasOwn(newHeaders, k))
      continue;
    const lowerKey = k.toLowerCase();
    if (!lowerKey)
      continue;
    const val = newHeaders[k];
    if (val === null) {
      delete targetHeaders[lowerKey];
    } else if (val !== undefined) {
      targetHeaders[lowerKey] = val;
    }
  }
}
function debug(action, ...args) {
  if (typeof process !== "undefined" && process?.env?.["DEBUG"] === "true") {
    console.log(`Anthropic:DEBUG:${action}`, ...args);
  }
}
var uuid4 = () => {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0;
    const v = c === "x" ? r : r & 3 | 8;
    return v.toString(16);
  });
};
var isRunningInBrowser = () => {
  return typeof window !== "undefined" && typeof window.document !== "undefined" && typeof navigator !== "undefined";
};
var isHeadersProtocol = (headers) => {
  return typeof headers?.get === "function";
};
var getHeader = (headers, header) => {
  const lowerCasedHeader = header.toLowerCase();
  if (isHeadersProtocol(headers)) {
    const intercapsHeader = header[0]?.toUpperCase() + header.substring(1).replace(/([^\w])(\w)/g, (_m, g1, g2) => g1 + g2.toUpperCase());
    for (const key of [header, lowerCasedHeader, header.toUpperCase(), intercapsHeader]) {
      const value = headers.get(key);
      if (value) {
        return value;
      }
    }
  }
  for (const [key, value] of Object.entries(headers)) {
    if (key.toLowerCase() === lowerCasedHeader) {
      if (Array.isArray(value)) {
        if (value.length <= 1)
          return value[0];
        console.warn(`Received ${value.length} entries for the ${header} header, using the first entry.`);
        return value[0];
      }
      return value;
    }
  }
  return;
};

// node_modules/@anthropic-ai/sdk/pagination.mjs
class Page extends AbstractPage {
  constructor(client, response, body, options) {
    super(client, response, body, options);
    this.data = body.data || [];
    this.has_more = body.has_more || false;
    this.first_id = body.first_id || null;
    this.last_id = body.last_id || null;
  }
  getPaginatedItems() {
    return this.data ?? [];
  }
  nextPageParams() {
    const info = this.nextPageInfo();
    if (!info)
      return null;
    if ("params" in info)
      return info.params;
    const params = Object.fromEntries(info.url.searchParams);
    if (!Object.keys(params).length)
      return null;
    return params;
  }
  nextPageInfo() {
    if (this.options.query?.["before_id"]) {
      const firstId = this.first_id;
      if (!firstId) {
        return null;
      }
      return {
        params: {
          before_id: firstId
        }
      };
    }
    const cursor = this.last_id;
    if (!cursor) {
      return null;
    }
    return {
      params: {
        after_id: cursor
      }
    };
  }
}
// node_modules/@anthropic-ai/sdk/resource.mjs
class APIResource {
  constructor(client) {
    this._client = client;
  }
}

// node_modules/@anthropic-ai/sdk/resources/beta/models.mjs
class Models extends APIResource {
  retrieve(modelId, options) {
    return this._client.get(`/v1/models/${modelId}?beta=true`, options);
  }
  list(query = {}, options) {
    if (isRequestOptions(query)) {
      return this.list({}, query);
    }
    return this._client.getAPIList("/v1/models?beta=true", BetaModelInfosPage, { query, ...options });
  }
}

class BetaModelInfosPage extends Page {
}
Models.BetaModelInfosPage = BetaModelInfosPage;

// node_modules/@anthropic-ai/sdk/internal/decoders/jsonl.mjs
class JSONLDecoder {
  constructor(iterator, controller) {
    this.iterator = iterator;
    this.controller = controller;
  }
  async* decoder() {
    const lineDecoder = new LineDecoder;
    for await (const chunk of this.iterator) {
      for (const line of lineDecoder.decode(chunk)) {
        yield JSON.parse(line);
      }
    }
    for (const line of lineDecoder.flush()) {
      yield JSON.parse(line);
    }
  }
  [Symbol.asyncIterator]() {
    return this.decoder();
  }
  static fromResponse(response, controller) {
    if (!response.body) {
      controller.abort();
      throw new AnthropicError(`Attempted to iterate over a response with no body`);
    }
    return new JSONLDecoder(ReadableStreamToAsyncIterable(response.body), controller);
  }
}

// node_modules/@anthropic-ai/sdk/resources/beta/messages/batches.mjs
class Batches extends APIResource {
  create(params, options) {
    const { betas, ...body } = params;
    return this._client.post("/v1/messages/batches?beta=true", {
      body,
      ...options,
      headers: {
        "anthropic-beta": [...betas ?? [], "message-batches-2024-09-24"].toString(),
        ...options?.headers
      }
    });
  }
  retrieve(messageBatchId, params = {}, options) {
    if (isRequestOptions(params)) {
      return this.retrieve(messageBatchId, {}, params);
    }
    const { betas } = params;
    return this._client.get(`/v1/messages/batches/${messageBatchId}?beta=true`, {
      ...options,
      headers: {
        "anthropic-beta": [...betas ?? [], "message-batches-2024-09-24"].toString(),
        ...options?.headers
      }
    });
  }
  list(params = {}, options) {
    if (isRequestOptions(params)) {
      return this.list({}, params);
    }
    const { betas, ...query } = params;
    return this._client.getAPIList("/v1/messages/batches?beta=true", BetaMessageBatchesPage, {
      query,
      ...options,
      headers: {
        "anthropic-beta": [...betas ?? [], "message-batches-2024-09-24"].toString(),
        ...options?.headers
      }
    });
  }
  delete(messageBatchId, params = {}, options) {
    if (isRequestOptions(params)) {
      return this.delete(messageBatchId, {}, params);
    }
    const { betas } = params;
    return this._client.delete(`/v1/messages/batches/${messageBatchId}?beta=true`, {
      ...options,
      headers: {
        "anthropic-beta": [...betas ?? [], "message-batches-2024-09-24"].toString(),
        ...options?.headers
      }
    });
  }
  cancel(messageBatchId, params = {}, options) {
    if (isRequestOptions(params)) {
      return this.cancel(messageBatchId, {}, params);
    }
    const { betas } = params;
    return this._client.post(`/v1/messages/batches/${messageBatchId}/cancel?beta=true`, {
      ...options,
      headers: {
        "anthropic-beta": [...betas ?? [], "message-batches-2024-09-24"].toString(),
        ...options?.headers
      }
    });
  }
  async results(messageBatchId, params = {}, options) {
    if (isRequestOptions(params)) {
      return this.results(messageBatchId, {}, params);
    }
    const batch = await this.retrieve(messageBatchId);
    if (!batch.results_url) {
      throw new AnthropicError(`No batch \`results_url\`; Has it finished processing? ${batch.processing_status} - ${batch.id}`);
    }
    const { betas } = params;
    return this._client.get(batch.results_url, {
      ...options,
      headers: {
        "anthropic-beta": [...betas ?? [], "message-batches-2024-09-24"].toString(),
        Accept: "application/binary",
        ...options?.headers
      },
      __binaryResponse: true
    })._thenUnwrap((_, props) => JSONLDecoder.fromResponse(props.response, props.controller));
  }
}

class BetaMessageBatchesPage extends Page {
}
Batches.BetaMessageBatchesPage = BetaMessageBatchesPage;

// node_modules/@anthropic-ai/sdk/_vendor/partial-json-parser/parser.mjs
var tokenize = (input) => {
  let current = 0;
  let tokens = [];
  while (current < input.length) {
    let char = input[current];
    if (char === "\\") {
      current++;
      continue;
    }
    if (char === "{") {
      tokens.push({
        type: "brace",
        value: "{"
      });
      current++;
      continue;
    }
    if (char === "}") {
      tokens.push({
        type: "brace",
        value: "}"
      });
      current++;
      continue;
    }
    if (char === "[") {
      tokens.push({
        type: "paren",
        value: "["
      });
      current++;
      continue;
    }
    if (char === "]") {
      tokens.push({
        type: "paren",
        value: "]"
      });
      current++;
      continue;
    }
    if (char === ":") {
      tokens.push({
        type: "separator",
        value: ":"
      });
      current++;
      continue;
    }
    if (char === ",") {
      tokens.push({
        type: "delimiter",
        value: ","
      });
      current++;
      continue;
    }
    if (char === '"') {
      let value = "";
      let danglingQuote = false;
      char = input[++current];
      while (char !== '"') {
        if (current === input.length) {
          danglingQuote = true;
          break;
        }
        if (char === "\\") {
          current++;
          if (current === input.length) {
            danglingQuote = true;
            break;
          }
          value += char + input[current];
          char = input[++current];
        } else {
          value += char;
          char = input[++current];
        }
      }
      char = input[++current];
      if (!danglingQuote) {
        tokens.push({
          type: "string",
          value
        });
      }
      continue;
    }
    let WHITESPACE = /\s/;
    if (char && WHITESPACE.test(char)) {
      current++;
      continue;
    }
    let NUMBERS = /[0-9]/;
    if (char && NUMBERS.test(char) || char === "-" || char === ".") {
      let value = "";
      if (char === "-") {
        value += char;
        char = input[++current];
      }
      while (char && NUMBERS.test(char) || char === ".") {
        value += char;
        char = input[++current];
      }
      tokens.push({
        type: "number",
        value
      });
      continue;
    }
    let LETTERS = /[a-z]/i;
    if (char && LETTERS.test(char)) {
      let value = "";
      while (char && LETTERS.test(char)) {
        if (current === input.length) {
          break;
        }
        value += char;
        char = input[++current];
      }
      if (value == "true" || value == "false" || value === "null") {
        tokens.push({
          type: "name",
          value
        });
      } else {
        current++;
        continue;
      }
      continue;
    }
    current++;
  }
  return tokens;
};
var strip = (tokens) => {
  if (tokens.length === 0) {
    return tokens;
  }
  let lastToken = tokens[tokens.length - 1];
  switch (lastToken.type) {
    case "separator":
      tokens = tokens.slice(0, tokens.length - 1);
      return strip(tokens);
      break;
    case "number":
      let lastCharacterOfLastToken = lastToken.value[lastToken.value.length - 1];
      if (lastCharacterOfLastToken === "." || lastCharacterOfLastToken === "-") {
        tokens = tokens.slice(0, tokens.length - 1);
        return strip(tokens);
      }
    case "string":
      let tokenBeforeTheLastToken = tokens[tokens.length - 2];
      if (tokenBeforeTheLastToken?.type === "delimiter") {
        tokens = tokens.slice(0, tokens.length - 1);
        return strip(tokens);
      } else if (tokenBeforeTheLastToken?.type === "brace" && tokenBeforeTheLastToken.value === "{") {
        tokens = tokens.slice(0, tokens.length - 1);
        return strip(tokens);
      }
      break;
    case "delimiter":
      tokens = tokens.slice(0, tokens.length - 1);
      return strip(tokens);
      break;
  }
  return tokens;
};
var unstrip = (tokens) => {
  let tail = [];
  tokens.map((token) => {
    if (token.type === "brace") {
      if (token.value === "{") {
        tail.push("}");
      } else {
        tail.splice(tail.lastIndexOf("}"), 1);
      }
    }
    if (token.type === "paren") {
      if (token.value === "[") {
        tail.push("]");
      } else {
        tail.splice(tail.lastIndexOf("]"), 1);
      }
    }
  });
  if (tail.length > 0) {
    tail.reverse().map((item) => {
      if (item === "}") {
        tokens.push({
          type: "brace",
          value: "}"
        });
      } else if (item === "]") {
        tokens.push({
          type: "paren",
          value: "]"
        });
      }
    });
  }
  return tokens;
};
var generate = (tokens) => {
  let output = "";
  tokens.map((token) => {
    switch (token.type) {
      case "string":
        output += '"' + token.value + '"';
        break;
      default:
        output += token.value;
        break;
    }
  });
  return output;
};
var partialParse = (input) => JSON.parse(generate(unstrip(strip(tokenize(input)))));

// node_modules/@anthropic-ai/sdk/lib/BetaMessageStream.mjs
var __classPrivateFieldSet2 = function(receiver, state, value, kind2, f) {
  if (kind2 === "m")
    throw new TypeError("Private method is not writable");
  if (kind2 === "a" && !f)
    throw new TypeError("Private accessor was defined without a setter");
  if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver))
    throw new TypeError("Cannot write private member to an object whose class did not declare it");
  return kind2 === "a" ? f.call(receiver, value) : f ? f.value = value : state.set(receiver, value), value;
};
var __classPrivateFieldGet2 = function(receiver, state, kind2, f) {
  if (kind2 === "a" && !f)
    throw new TypeError("Private accessor was defined without a getter");
  if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver))
    throw new TypeError("Cannot read private member from an object whose class did not declare it");
  return kind2 === "m" ? f : kind2 === "a" ? f.call(receiver) : f ? f.value : state.get(receiver);
};
var _BetaMessageStream_instances;
var _BetaMessageStream_currentMessageSnapshot;
var _BetaMessageStream_connectedPromise;
var _BetaMessageStream_resolveConnectedPromise;
var _BetaMessageStream_rejectConnectedPromise;
var _BetaMessageStream_endPromise;
var _BetaMessageStream_resolveEndPromise;
var _BetaMessageStream_rejectEndPromise;
var _BetaMessageStream_listeners;
var _BetaMessageStream_ended;
var _BetaMessageStream_errored;
var _BetaMessageStream_aborted;
var _BetaMessageStream_catchingPromiseCreated;
var _BetaMessageStream_response;
var _BetaMessageStream_request_id;
var _BetaMessageStream_getFinalMessage;
var _BetaMessageStream_getFinalText;
var _BetaMessageStream_handleError;
var _BetaMessageStream_beginRequest;
var _BetaMessageStream_addStreamEvent;
var _BetaMessageStream_endRequest;
var _BetaMessageStream_accumulateMessage;
var JSON_BUF_PROPERTY = "__json_buf";

class BetaMessageStream {
  constructor() {
    _BetaMessageStream_instances.add(this);
    this.messages = [];
    this.receivedMessages = [];
    _BetaMessageStream_currentMessageSnapshot.set(this, undefined);
    this.controller = new AbortController;
    _BetaMessageStream_connectedPromise.set(this, undefined);
    _BetaMessageStream_resolveConnectedPromise.set(this, () => {
    });
    _BetaMessageStream_rejectConnectedPromise.set(this, () => {
    });
    _BetaMessageStream_endPromise.set(this, undefined);
    _BetaMessageStream_resolveEndPromise.set(this, () => {
    });
    _BetaMessageStream_rejectEndPromise.set(this, () => {
    });
    _BetaMessageStream_listeners.set(this, {});
    _BetaMessageStream_ended.set(this, false);
    _BetaMessageStream_errored.set(this, false);
    _BetaMessageStream_aborted.set(this, false);
    _BetaMessageStream_catchingPromiseCreated.set(this, false);
    _BetaMessageStream_response.set(this, undefined);
    _BetaMessageStream_request_id.set(this, undefined);
    _BetaMessageStream_handleError.set(this, (error) => {
      __classPrivateFieldSet2(this, _BetaMessageStream_errored, true, "f");
      if (error instanceof Error && error.name === "AbortError") {
        error = new APIUserAbortError;
      }
      if (error instanceof APIUserAbortError) {
        __classPrivateFieldSet2(this, _BetaMessageStream_aborted, true, "f");
        return this._emit("abort", error);
      }
      if (error instanceof AnthropicError) {
        return this._emit("error", error);
      }
      if (error instanceof Error) {
        const anthropicError = new AnthropicError(error.message);
        anthropicError.cause = error;
        return this._emit("error", anthropicError);
      }
      return this._emit("error", new AnthropicError(String(error)));
    });
    __classPrivateFieldSet2(this, _BetaMessageStream_connectedPromise, new Promise((resolve, reject) => {
      __classPrivateFieldSet2(this, _BetaMessageStream_resolveConnectedPromise, resolve, "f");
      __classPrivateFieldSet2(this, _BetaMessageStream_rejectConnectedPromise, reject, "f");
    }), "f");
    __classPrivateFieldSet2(this, _BetaMessageStream_endPromise, new Promise((resolve, reject) => {
      __classPrivateFieldSet2(this, _BetaMessageStream_resolveEndPromise, resolve, "f");
      __classPrivateFieldSet2(this, _BetaMessageStream_rejectEndPromise, reject, "f");
    }), "f");
    __classPrivateFieldGet2(this, _BetaMessageStream_connectedPromise, "f").catch(() => {
    });
    __classPrivateFieldGet2(this, _BetaMessageStream_endPromise, "f").catch(() => {
    });
  }
  get response() {
    return __classPrivateFieldGet2(this, _BetaMessageStream_response, "f");
  }
  get request_id() {
    return __classPrivateFieldGet2(this, _BetaMessageStream_request_id, "f");
  }
  async withResponse() {
    const response = await __classPrivateFieldGet2(this, _BetaMessageStream_connectedPromise, "f");
    if (!response) {
      throw new Error("Could not resolve a `Response` object");
    }
    return {
      data: this,
      response,
      request_id: response.headers.get("request-id")
    };
  }
  static fromReadableStream(stream) {
    const runner = new BetaMessageStream;
    runner._run(() => runner._fromReadableStream(stream));
    return runner;
  }
  static createMessage(messages, params, options) {
    const runner = new BetaMessageStream;
    for (const message of params.messages) {
      runner._addMessageParam(message);
    }
    runner._run(() => runner._createMessage(messages, { ...params, stream: true }, { ...options, headers: { ...options?.headers, "X-Stainless-Helper-Method": "stream" } }));
    return runner;
  }
  _run(executor) {
    executor().then(() => {
      this._emitFinal();
      this._emit("end");
    }, __classPrivateFieldGet2(this, _BetaMessageStream_handleError, "f"));
  }
  _addMessageParam(message) {
    this.messages.push(message);
  }
  _addMessage(message, emit = true) {
    this.receivedMessages.push(message);
    if (emit) {
      this._emit("message", message);
    }
  }
  async _createMessage(messages, params, options) {
    const signal = options?.signal;
    if (signal) {
      if (signal.aborted)
        this.controller.abort();
      signal.addEventListener("abort", () => this.controller.abort());
    }
    __classPrivateFieldGet2(this, _BetaMessageStream_instances, "m", _BetaMessageStream_beginRequest).call(this);
    const { response, data: stream } = await messages.create({ ...params, stream: true }, { ...options, signal: this.controller.signal }).withResponse();
    this._connected(response);
    for await (const event of stream) {
      __classPrivateFieldGet2(this, _BetaMessageStream_instances, "m", _BetaMessageStream_addStreamEvent).call(this, event);
    }
    if (stream.controller.signal?.aborted) {
      throw new APIUserAbortError;
    }
    __classPrivateFieldGet2(this, _BetaMessageStream_instances, "m", _BetaMessageStream_endRequest).call(this);
  }
  _connected(response) {
    if (this.ended)
      return;
    __classPrivateFieldSet2(this, _BetaMessageStream_response, response, "f");
    __classPrivateFieldSet2(this, _BetaMessageStream_request_id, response?.headers.get("request-id"), "f");
    __classPrivateFieldGet2(this, _BetaMessageStream_resolveConnectedPromise, "f").call(this, response);
    this._emit("connect");
  }
  get ended() {
    return __classPrivateFieldGet2(this, _BetaMessageStream_ended, "f");
  }
  get errored() {
    return __classPrivateFieldGet2(this, _BetaMessageStream_errored, "f");
  }
  get aborted() {
    return __classPrivateFieldGet2(this, _BetaMessageStream_aborted, "f");
  }
  abort() {
    this.controller.abort();
  }
  on(event, listener) {
    const listeners = __classPrivateFieldGet2(this, _BetaMessageStream_listeners, "f")[event] || (__classPrivateFieldGet2(this, _BetaMessageStream_listeners, "f")[event] = []);
    listeners.push({ listener });
    return this;
  }
  off(event, listener) {
    const listeners = __classPrivateFieldGet2(this, _BetaMessageStream_listeners, "f")[event];
    if (!listeners)
      return this;
    const index = listeners.findIndex((l) => l.listener === listener);
    if (index >= 0)
      listeners.splice(index, 1);
    return this;
  }
  once(event, listener) {
    const listeners = __classPrivateFieldGet2(this, _BetaMessageStream_listeners, "f")[event] || (__classPrivateFieldGet2(this, _BetaMessageStream_listeners, "f")[event] = []);
    listeners.push({ listener, once: true });
    return this;
  }
  emitted(event) {
    return new Promise((resolve, reject) => {
      __classPrivateFieldSet2(this, _BetaMessageStream_catchingPromiseCreated, true, "f");
      if (event !== "error")
        this.once("error", reject);
      this.once(event, resolve);
    });
  }
  async done() {
    __classPrivateFieldSet2(this, _BetaMessageStream_catchingPromiseCreated, true, "f");
    await __classPrivateFieldGet2(this, _BetaMessageStream_endPromise, "f");
  }
  get currentMessage() {
    return __classPrivateFieldGet2(this, _BetaMessageStream_currentMessageSnapshot, "f");
  }
  async finalMessage() {
    await this.done();
    return __classPrivateFieldGet2(this, _BetaMessageStream_instances, "m", _BetaMessageStream_getFinalMessage).call(this);
  }
  async finalText() {
    await this.done();
    return __classPrivateFieldGet2(this, _BetaMessageStream_instances, "m", _BetaMessageStream_getFinalText).call(this);
  }
  _emit(event, ...args) {
    if (__classPrivateFieldGet2(this, _BetaMessageStream_ended, "f"))
      return;
    if (event === "end") {
      __classPrivateFieldSet2(this, _BetaMessageStream_ended, true, "f");
      __classPrivateFieldGet2(this, _BetaMessageStream_resolveEndPromise, "f").call(this);
    }
    const listeners = __classPrivateFieldGet2(this, _BetaMessageStream_listeners, "f")[event];
    if (listeners) {
      __classPrivateFieldGet2(this, _BetaMessageStream_listeners, "f")[event] = listeners.filter((l) => !l.once);
      listeners.forEach(({ listener }) => listener(...args));
    }
    if (event === "abort") {
      const error = args[0];
      if (!__classPrivateFieldGet2(this, _BetaMessageStream_catchingPromiseCreated, "f") && !listeners?.length) {
        Promise.reject(error);
      }
      __classPrivateFieldGet2(this, _BetaMessageStream_rejectConnectedPromise, "f").call(this, error);
      __classPrivateFieldGet2(this, _BetaMessageStream_rejectEndPromise, "f").call(this, error);
      this._emit("end");
      return;
    }
    if (event === "error") {
      const error = args[0];
      if (!__classPrivateFieldGet2(this, _BetaMessageStream_catchingPromiseCreated, "f") && !listeners?.length) {
        Promise.reject(error);
      }
      __classPrivateFieldGet2(this, _BetaMessageStream_rejectConnectedPromise, "f").call(this, error);
      __classPrivateFieldGet2(this, _BetaMessageStream_rejectEndPromise, "f").call(this, error);
      this._emit("end");
    }
  }
  _emitFinal() {
    const finalMessage = this.receivedMessages.at(-1);
    if (finalMessage) {
      this._emit("finalMessage", __classPrivateFieldGet2(this, _BetaMessageStream_instances, "m", _BetaMessageStream_getFinalMessage).call(this));
    }
  }
  async _fromReadableStream(readableStream, options) {
    const signal = options?.signal;
    if (signal) {
      if (signal.aborted)
        this.controller.abort();
      signal.addEventListener("abort", () => this.controller.abort());
    }
    __classPrivateFieldGet2(this, _BetaMessageStream_instances, "m", _BetaMessageStream_beginRequest).call(this);
    this._connected(null);
    const stream = Stream.fromReadableStream(readableStream, this.controller);
    for await (const event of stream) {
      __classPrivateFieldGet2(this, _BetaMessageStream_instances, "m", _BetaMessageStream_addStreamEvent).call(this, event);
    }
    if (stream.controller.signal?.aborted) {
      throw new APIUserAbortError;
    }
    __classPrivateFieldGet2(this, _BetaMessageStream_instances, "m", _BetaMessageStream_endRequest).call(this);
  }
  [(_BetaMessageStream_currentMessageSnapshot = new WeakMap, _BetaMessageStream_connectedPromise = new WeakMap, _BetaMessageStream_resolveConnectedPromise = new WeakMap, _BetaMessageStream_rejectConnectedPromise = new WeakMap, _BetaMessageStream_endPromise = new WeakMap, _BetaMessageStream_resolveEndPromise = new WeakMap, _BetaMessageStream_rejectEndPromise = new WeakMap, _BetaMessageStream_listeners = new WeakMap, _BetaMessageStream_ended = new WeakMap, _BetaMessageStream_errored = new WeakMap, _BetaMessageStream_aborted = new WeakMap, _BetaMessageStream_catchingPromiseCreated = new WeakMap, _BetaMessageStream_response = new WeakMap, _BetaMessageStream_request_id = new WeakMap, _BetaMessageStream_handleError = new WeakMap, _BetaMessageStream_instances = new WeakSet, _BetaMessageStream_getFinalMessage = function _BetaMessageStream_getFinalMessage() {
    if (this.receivedMessages.length === 0) {
      throw new AnthropicError("stream ended without producing a Message with role=assistant");
    }
    return this.receivedMessages.at(-1);
  }, _BetaMessageStream_getFinalText = function _BetaMessageStream_getFinalText() {
    if (this.receivedMessages.length === 0) {
      throw new AnthropicError("stream ended without producing a Message with role=assistant");
    }
    const textBlocks = this.receivedMessages.at(-1).content.filter((block) => block.type === "text").map((block) => block.text);
    if (textBlocks.length === 0) {
      throw new AnthropicError("stream ended without producing a content block with type=text");
    }
    return textBlocks.join(" ");
  }, _BetaMessageStream_beginRequest = function _BetaMessageStream_beginRequest() {
    if (this.ended)
      return;
    __classPrivateFieldSet2(this, _BetaMessageStream_currentMessageSnapshot, undefined, "f");
  }, _BetaMessageStream_addStreamEvent = function _BetaMessageStream_addStreamEvent(event) {
    if (this.ended)
      return;
    const messageSnapshot = __classPrivateFieldGet2(this, _BetaMessageStream_instances, "m", _BetaMessageStream_accumulateMessage).call(this, event);
    this._emit("streamEvent", event, messageSnapshot);
    switch (event.type) {
      case "content_block_delta": {
        const content = messageSnapshot.content.at(-1);
        switch (event.delta.type) {
          case "text_delta": {
            if (content.type === "text") {
              this._emit("text", event.delta.text, content.text || "");
            }
            break;
          }
          case "citations_delta": {
            if (content.type === "text") {
              this._emit("citation", event.delta.citation, content.citations ?? []);
            }
            break;
          }
          case "input_json_delta": {
            if (content.type === "tool_use" && content.input) {
              this._emit("inputJson", event.delta.partial_json, content.input);
            }
            break;
          }
          default:
            checkNever(event.delta);
        }
        break;
      }
      case "message_stop": {
        this._addMessageParam(messageSnapshot);
        this._addMessage(messageSnapshot, true);
        break;
      }
      case "content_block_stop": {
        this._emit("contentBlock", messageSnapshot.content.at(-1));
        break;
      }
      case "message_start": {
        __classPrivateFieldSet2(this, _BetaMessageStream_currentMessageSnapshot, messageSnapshot, "f");
        break;
      }
      case "content_block_start":
      case "message_delta":
        break;
    }
  }, _BetaMessageStream_endRequest = function _BetaMessageStream_endRequest() {
    if (this.ended) {
      throw new AnthropicError(`stream has ended, this shouldn't happen`);
    }
    const snapshot = __classPrivateFieldGet2(this, _BetaMessageStream_currentMessageSnapshot, "f");
    if (!snapshot) {
      throw new AnthropicError(`request ended without sending any chunks`);
    }
    __classPrivateFieldSet2(this, _BetaMessageStream_currentMessageSnapshot, undefined, "f");
    return snapshot;
  }, _BetaMessageStream_accumulateMessage = function _BetaMessageStream_accumulateMessage(event) {
    let snapshot = __classPrivateFieldGet2(this, _BetaMessageStream_currentMessageSnapshot, "f");
    if (event.type === "message_start") {
      if (snapshot) {
        throw new AnthropicError(`Unexpected event order, got ${event.type} before receiving "message_stop"`);
      }
      return event.message;
    }
    if (!snapshot) {
      throw new AnthropicError(`Unexpected event order, got ${event.type} before "message_start"`);
    }
    switch (event.type) {
      case "message_stop":
        return snapshot;
      case "message_delta":
        snapshot.stop_reason = event.delta.stop_reason;
        snapshot.stop_sequence = event.delta.stop_sequence;
        snapshot.usage.output_tokens = event.usage.output_tokens;
        return snapshot;
      case "content_block_start":
        snapshot.content.push(event.content_block);
        return snapshot;
      case "content_block_delta": {
        const snapshotContent = snapshot.content.at(event.index);
        switch (event.delta.type) {
          case "text_delta": {
            if (snapshotContent?.type === "text") {
              snapshotContent.text += event.delta.text;
            }
            break;
          }
          case "citations_delta": {
            if (snapshotContent?.type === "text") {
              snapshotContent.citations ?? (snapshotContent.citations = []);
              snapshotContent.citations.push(event.delta.citation);
            }
            break;
          }
          case "input_json_delta": {
            if (snapshotContent?.type === "tool_use") {
              let jsonBuf = snapshotContent[JSON_BUF_PROPERTY] || "";
              jsonBuf += event.delta.partial_json;
              Object.defineProperty(snapshotContent, JSON_BUF_PROPERTY, {
                value: jsonBuf,
                enumerable: false,
                writable: true
              });
              if (jsonBuf) {
                snapshotContent.input = partialParse(jsonBuf);
              }
            }
            break;
          }
          default:
            checkNever(event.delta);
        }
        return snapshot;
      }
      case "content_block_stop":
        return snapshot;
    }
  }, Symbol.asyncIterator)]() {
    const pushQueue = [];
    const readQueue = [];
    let done = false;
    this.on("streamEvent", (event) => {
      const reader = readQueue.shift();
      if (reader) {
        reader.resolve(event);
      } else {
        pushQueue.push(event);
      }
    });
    this.on("end", () => {
      done = true;
      for (const reader of readQueue) {
        reader.resolve(undefined);
      }
      readQueue.length = 0;
    });
    this.on("abort", (err) => {
      done = true;
      for (const reader of readQueue) {
        reader.reject(err);
      }
      readQueue.length = 0;
    });
    this.on("error", (err) => {
      done = true;
      for (const reader of readQueue) {
        reader.reject(err);
      }
      readQueue.length = 0;
    });
    return {
      next: async () => {
        if (!pushQueue.length) {
          if (done) {
            return { value: undefined, done: true };
          }
          return new Promise((resolve, reject) => readQueue.push({ resolve, reject })).then((chunk2) => chunk2 ? { value: chunk2, done: false } : { value: undefined, done: true });
        }
        const chunk = pushQueue.shift();
        return { value: chunk, done: false };
      },
      return: async () => {
        this.abort();
        return { value: undefined, done: true };
      }
    };
  }
  toReadableStream() {
    const stream = new Stream(this[Symbol.asyncIterator].bind(this), this.controller);
    return stream.toReadableStream();
  }
}
function checkNever(x) {
}

// node_modules/@anthropic-ai/sdk/resources/beta/messages/messages.mjs
var DEPRECATED_MODELS = {
  "claude-1.3": "November 6th, 2024",
  "claude-1.3-100k": "November 6th, 2024",
  "claude-instant-1.1": "November 6th, 2024",
  "claude-instant-1.1-100k": "November 6th, 2024",
  "claude-instant-1.2": "November 6th, 2024",
  "claude-3-sonnet-20240229": "July 21st, 2025",
  "claude-2.1": "July 21st, 2025",
  "claude-2.0": "July 21st, 2025"
};

class Messages extends APIResource {
  constructor() {
    super(...arguments);
    this.batches = new Batches(this._client);
  }
  create(params, options) {
    const { betas, ...body } = params;
    if (body.model in DEPRECATED_MODELS) {
      console.warn(`The model '${body.model}' is deprecated and will reach end-of-life on ${DEPRECATED_MODELS[body.model]}
Please migrate to a newer model. Visit https://docs.anthropic.com/en/docs/resources/model-deprecations for more information.`);
    }
    return this._client.post("/v1/messages?beta=true", {
      body,
      timeout: this._client._options.timeout ?? 600000,
      ...options,
      headers: {
        ...betas?.toString() != null ? { "anthropic-beta": betas?.toString() } : undefined,
        ...options?.headers
      },
      stream: params.stream ?? false
    });
  }
  stream(body, options) {
    return BetaMessageStream.createMessage(this, body, options);
  }
  countTokens(params, options) {
    const { betas, ...body } = params;
    return this._client.post("/v1/messages/count_tokens?beta=true", {
      body,
      ...options,
      headers: {
        "anthropic-beta": [...betas ?? [], "token-counting-2024-11-01"].toString(),
        ...options?.headers
      }
    });
  }
}
Messages.Batches = Batches;
Messages.BetaMessageBatchesPage = BetaMessageBatchesPage;

// node_modules/@anthropic-ai/sdk/resources/beta/beta.mjs
class Beta extends APIResource {
  constructor() {
    super(...arguments);
    this.models = new Models(this._client);
    this.messages = new Messages(this._client);
  }
}
Beta.Models = Models;
Beta.BetaModelInfosPage = BetaModelInfosPage;
Beta.Messages = Messages;
// node_modules/@anthropic-ai/sdk/resources/completions.mjs
class Completions extends APIResource {
  create(body, options) {
    return this._client.post("/v1/complete", {
      body,
      timeout: this._client._options.timeout ?? 600000,
      ...options,
      stream: body.stream ?? false
    });
  }
}
// node_modules/@anthropic-ai/sdk/resources/messages/batches.mjs
class Batches2 extends APIResource {
  create(body, options) {
    return this._client.post("/v1/messages/batches", { body, ...options });
  }
  retrieve(messageBatchId, options) {
    return this._client.get(`/v1/messages/batches/${messageBatchId}`, options);
  }
  list(query = {}, options) {
    if (isRequestOptions(query)) {
      return this.list({}, query);
    }
    return this._client.getAPIList("/v1/messages/batches", MessageBatchesPage, { query, ...options });
  }
  delete(messageBatchId, options) {
    return this._client.delete(`/v1/messages/batches/${messageBatchId}`, options);
  }
  cancel(messageBatchId, options) {
    return this._client.post(`/v1/messages/batches/${messageBatchId}/cancel`, options);
  }
  async results(messageBatchId, options) {
    const batch = await this.retrieve(messageBatchId);
    if (!batch.results_url) {
      throw new AnthropicError(`No batch \`results_url\`; Has it finished processing? ${batch.processing_status} - ${batch.id}`);
    }
    return this._client.get(batch.results_url, {
      ...options,
      headers: {
        Accept: "application/binary",
        ...options?.headers
      },
      __binaryResponse: true
    })._thenUnwrap((_, props) => JSONLDecoder.fromResponse(props.response, props.controller));
  }
}

class MessageBatchesPage extends Page {
}
Batches2.MessageBatchesPage = MessageBatchesPage;

// node_modules/@anthropic-ai/sdk/lib/MessageStream.mjs
var __classPrivateFieldSet3 = function(receiver, state, value, kind2, f) {
  if (kind2 === "m")
    throw new TypeError("Private method is not writable");
  if (kind2 === "a" && !f)
    throw new TypeError("Private accessor was defined without a setter");
  if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver))
    throw new TypeError("Cannot write private member to an object whose class did not declare it");
  return kind2 === "a" ? f.call(receiver, value) : f ? f.value = value : state.set(receiver, value), value;
};
var __classPrivateFieldGet3 = function(receiver, state, kind2, f) {
  if (kind2 === "a" && !f)
    throw new TypeError("Private accessor was defined without a getter");
  if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver))
    throw new TypeError("Cannot read private member from an object whose class did not declare it");
  return kind2 === "m" ? f : kind2 === "a" ? f.call(receiver) : f ? f.value : state.get(receiver);
};
var _MessageStream_instances;
var _MessageStream_currentMessageSnapshot;
var _MessageStream_connectedPromise;
var _MessageStream_resolveConnectedPromise;
var _MessageStream_rejectConnectedPromise;
var _MessageStream_endPromise;
var _MessageStream_resolveEndPromise;
var _MessageStream_rejectEndPromise;
var _MessageStream_listeners;
var _MessageStream_ended;
var _MessageStream_errored;
var _MessageStream_aborted;
var _MessageStream_catchingPromiseCreated;
var _MessageStream_response;
var _MessageStream_request_id;
var _MessageStream_getFinalMessage;
var _MessageStream_getFinalText;
var _MessageStream_handleError;
var _MessageStream_beginRequest;
var _MessageStream_addStreamEvent;
var _MessageStream_endRequest;
var _MessageStream_accumulateMessage;
var JSON_BUF_PROPERTY2 = "__json_buf";

class MessageStream {
  constructor() {
    _MessageStream_instances.add(this);
    this.messages = [];
    this.receivedMessages = [];
    _MessageStream_currentMessageSnapshot.set(this, undefined);
    this.controller = new AbortController;
    _MessageStream_connectedPromise.set(this, undefined);
    _MessageStream_resolveConnectedPromise.set(this, () => {
    });
    _MessageStream_rejectConnectedPromise.set(this, () => {
    });
    _MessageStream_endPromise.set(this, undefined);
    _MessageStream_resolveEndPromise.set(this, () => {
    });
    _MessageStream_rejectEndPromise.set(this, () => {
    });
    _MessageStream_listeners.set(this, {});
    _MessageStream_ended.set(this, false);
    _MessageStream_errored.set(this, false);
    _MessageStream_aborted.set(this, false);
    _MessageStream_catchingPromiseCreated.set(this, false);
    _MessageStream_response.set(this, undefined);
    _MessageStream_request_id.set(this, undefined);
    _MessageStream_handleError.set(this, (error) => {
      __classPrivateFieldSet3(this, _MessageStream_errored, true, "f");
      if (error instanceof Error && error.name === "AbortError") {
        error = new APIUserAbortError;
      }
      if (error instanceof APIUserAbortError) {
        __classPrivateFieldSet3(this, _MessageStream_aborted, true, "f");
        return this._emit("abort", error);
      }
      if (error instanceof AnthropicError) {
        return this._emit("error", error);
      }
      if (error instanceof Error) {
        const anthropicError = new AnthropicError(error.message);
        anthropicError.cause = error;
        return this._emit("error", anthropicError);
      }
      return this._emit("error", new AnthropicError(String(error)));
    });
    __classPrivateFieldSet3(this, _MessageStream_connectedPromise, new Promise((resolve, reject) => {
      __classPrivateFieldSet3(this, _MessageStream_resolveConnectedPromise, resolve, "f");
      __classPrivateFieldSet3(this, _MessageStream_rejectConnectedPromise, reject, "f");
    }), "f");
    __classPrivateFieldSet3(this, _MessageStream_endPromise, new Promise((resolve, reject) => {
      __classPrivateFieldSet3(this, _MessageStream_resolveEndPromise, resolve, "f");
      __classPrivateFieldSet3(this, _MessageStream_rejectEndPromise, reject, "f");
    }), "f");
    __classPrivateFieldGet3(this, _MessageStream_connectedPromise, "f").catch(() => {
    });
    __classPrivateFieldGet3(this, _MessageStream_endPromise, "f").catch(() => {
    });
  }
  get response() {
    return __classPrivateFieldGet3(this, _MessageStream_response, "f");
  }
  get request_id() {
    return __classPrivateFieldGet3(this, _MessageStream_request_id, "f");
  }
  async withResponse() {
    const response = await __classPrivateFieldGet3(this, _MessageStream_connectedPromise, "f");
    if (!response) {
      throw new Error("Could not resolve a `Response` object");
    }
    return {
      data: this,
      response,
      request_id: response.headers.get("request-id")
    };
  }
  static fromReadableStream(stream) {
    const runner = new MessageStream;
    runner._run(() => runner._fromReadableStream(stream));
    return runner;
  }
  static createMessage(messages, params, options) {
    const runner = new MessageStream;
    for (const message of params.messages) {
      runner._addMessageParam(message);
    }
    runner._run(() => runner._createMessage(messages, { ...params, stream: true }, { ...options, headers: { ...options?.headers, "X-Stainless-Helper-Method": "stream" } }));
    return runner;
  }
  _run(executor) {
    executor().then(() => {
      this._emitFinal();
      this._emit("end");
    }, __classPrivateFieldGet3(this, _MessageStream_handleError, "f"));
  }
  _addMessageParam(message) {
    this.messages.push(message);
  }
  _addMessage(message, emit = true) {
    this.receivedMessages.push(message);
    if (emit) {
      this._emit("message", message);
    }
  }
  async _createMessage(messages, params, options) {
    const signal = options?.signal;
    if (signal) {
      if (signal.aborted)
        this.controller.abort();
      signal.addEventListener("abort", () => this.controller.abort());
    }
    __classPrivateFieldGet3(this, _MessageStream_instances, "m", _MessageStream_beginRequest).call(this);
    const { response, data: stream } = await messages.create({ ...params, stream: true }, { ...options, signal: this.controller.signal }).withResponse();
    this._connected(response);
    for await (const event of stream) {
      __classPrivateFieldGet3(this, _MessageStream_instances, "m", _MessageStream_addStreamEvent).call(this, event);
    }
    if (stream.controller.signal?.aborted) {
      throw new APIUserAbortError;
    }
    __classPrivateFieldGet3(this, _MessageStream_instances, "m", _MessageStream_endRequest).call(this);
  }
  _connected(response) {
    if (this.ended)
      return;
    __classPrivateFieldSet3(this, _MessageStream_response, response, "f");
    __classPrivateFieldSet3(this, _MessageStream_request_id, response?.headers.get("request-id"), "f");
    __classPrivateFieldGet3(this, _MessageStream_resolveConnectedPromise, "f").call(this, response);
    this._emit("connect");
  }
  get ended() {
    return __classPrivateFieldGet3(this, _MessageStream_ended, "f");
  }
  get errored() {
    return __classPrivateFieldGet3(this, _MessageStream_errored, "f");
  }
  get aborted() {
    return __classPrivateFieldGet3(this, _MessageStream_aborted, "f");
  }
  abort() {
    this.controller.abort();
  }
  on(event, listener) {
    const listeners = __classPrivateFieldGet3(this, _MessageStream_listeners, "f")[event] || (__classPrivateFieldGet3(this, _MessageStream_listeners, "f")[event] = []);
    listeners.push({ listener });
    return this;
  }
  off(event, listener) {
    const listeners = __classPrivateFieldGet3(this, _MessageStream_listeners, "f")[event];
    if (!listeners)
      return this;
    const index = listeners.findIndex((l) => l.listener === listener);
    if (index >= 0)
      listeners.splice(index, 1);
    return this;
  }
  once(event, listener) {
    const listeners = __classPrivateFieldGet3(this, _MessageStream_listeners, "f")[event] || (__classPrivateFieldGet3(this, _MessageStream_listeners, "f")[event] = []);
    listeners.push({ listener, once: true });
    return this;
  }
  emitted(event) {
    return new Promise((resolve, reject) => {
      __classPrivateFieldSet3(this, _MessageStream_catchingPromiseCreated, true, "f");
      if (event !== "error")
        this.once("error", reject);
      this.once(event, resolve);
    });
  }
  async done() {
    __classPrivateFieldSet3(this, _MessageStream_catchingPromiseCreated, true, "f");
    await __classPrivateFieldGet3(this, _MessageStream_endPromise, "f");
  }
  get currentMessage() {
    return __classPrivateFieldGet3(this, _MessageStream_currentMessageSnapshot, "f");
  }
  async finalMessage() {
    await this.done();
    return __classPrivateFieldGet3(this, _MessageStream_instances, "m", _MessageStream_getFinalMessage).call(this);
  }
  async finalText() {
    await this.done();
    return __classPrivateFieldGet3(this, _MessageStream_instances, "m", _MessageStream_getFinalText).call(this);
  }
  _emit(event, ...args) {
    if (__classPrivateFieldGet3(this, _MessageStream_ended, "f"))
      return;
    if (event === "end") {
      __classPrivateFieldSet3(this, _MessageStream_ended, true, "f");
      __classPrivateFieldGet3(this, _MessageStream_resolveEndPromise, "f").call(this);
    }
    const listeners = __classPrivateFieldGet3(this, _MessageStream_listeners, "f")[event];
    if (listeners) {
      __classPrivateFieldGet3(this, _MessageStream_listeners, "f")[event] = listeners.filter((l) => !l.once);
      listeners.forEach(({ listener }) => listener(...args));
    }
    if (event === "abort") {
      const error = args[0];
      if (!__classPrivateFieldGet3(this, _MessageStream_catchingPromiseCreated, "f") && !listeners?.length) {
        Promise.reject(error);
      }
      __classPrivateFieldGet3(this, _MessageStream_rejectConnectedPromise, "f").call(this, error);
      __classPrivateFieldGet3(this, _MessageStream_rejectEndPromise, "f").call(this, error);
      this._emit("end");
      return;
    }
    if (event === "error") {
      const error = args[0];
      if (!__classPrivateFieldGet3(this, _MessageStream_catchingPromiseCreated, "f") && !listeners?.length) {
        Promise.reject(error);
      }
      __classPrivateFieldGet3(this, _MessageStream_rejectConnectedPromise, "f").call(this, error);
      __classPrivateFieldGet3(this, _MessageStream_rejectEndPromise, "f").call(this, error);
      this._emit("end");
    }
  }
  _emitFinal() {
    const finalMessage = this.receivedMessages.at(-1);
    if (finalMessage) {
      this._emit("finalMessage", __classPrivateFieldGet3(this, _MessageStream_instances, "m", _MessageStream_getFinalMessage).call(this));
    }
  }
  async _fromReadableStream(readableStream, options) {
    const signal = options?.signal;
    if (signal) {
      if (signal.aborted)
        this.controller.abort();
      signal.addEventListener("abort", () => this.controller.abort());
    }
    __classPrivateFieldGet3(this, _MessageStream_instances, "m", _MessageStream_beginRequest).call(this);
    this._connected(null);
    const stream = Stream.fromReadableStream(readableStream, this.controller);
    for await (const event of stream) {
      __classPrivateFieldGet3(this, _MessageStream_instances, "m", _MessageStream_addStreamEvent).call(this, event);
    }
    if (stream.controller.signal?.aborted) {
      throw new APIUserAbortError;
    }
    __classPrivateFieldGet3(this, _MessageStream_instances, "m", _MessageStream_endRequest).call(this);
  }
  [(_MessageStream_currentMessageSnapshot = new WeakMap, _MessageStream_connectedPromise = new WeakMap, _MessageStream_resolveConnectedPromise = new WeakMap, _MessageStream_rejectConnectedPromise = new WeakMap, _MessageStream_endPromise = new WeakMap, _MessageStream_resolveEndPromise = new WeakMap, _MessageStream_rejectEndPromise = new WeakMap, _MessageStream_listeners = new WeakMap, _MessageStream_ended = new WeakMap, _MessageStream_errored = new WeakMap, _MessageStream_aborted = new WeakMap, _MessageStream_catchingPromiseCreated = new WeakMap, _MessageStream_response = new WeakMap, _MessageStream_request_id = new WeakMap, _MessageStream_handleError = new WeakMap, _MessageStream_instances = new WeakSet, _MessageStream_getFinalMessage = function _MessageStream_getFinalMessage() {
    if (this.receivedMessages.length === 0) {
      throw new AnthropicError("stream ended without producing a Message with role=assistant");
    }
    return this.receivedMessages.at(-1);
  }, _MessageStream_getFinalText = function _MessageStream_getFinalText() {
    if (this.receivedMessages.length === 0) {
      throw new AnthropicError("stream ended without producing a Message with role=assistant");
    }
    const textBlocks = this.receivedMessages.at(-1).content.filter((block) => block.type === "text").map((block) => block.text);
    if (textBlocks.length === 0) {
      throw new AnthropicError("stream ended without producing a content block with type=text");
    }
    return textBlocks.join(" ");
  }, _MessageStream_beginRequest = function _MessageStream_beginRequest() {
    if (this.ended)
      return;
    __classPrivateFieldSet3(this, _MessageStream_currentMessageSnapshot, undefined, "f");
  }, _MessageStream_addStreamEvent = function _MessageStream_addStreamEvent(event) {
    if (this.ended)
      return;
    const messageSnapshot = __classPrivateFieldGet3(this, _MessageStream_instances, "m", _MessageStream_accumulateMessage).call(this, event);
    this._emit("streamEvent", event, messageSnapshot);
    switch (event.type) {
      case "content_block_delta": {
        const content = messageSnapshot.content.at(-1);
        switch (event.delta.type) {
          case "text_delta": {
            if (content.type === "text") {
              this._emit("text", event.delta.text, content.text || "");
            }
            break;
          }
          case "citations_delta": {
            if (content.type === "text") {
              this._emit("citation", event.delta.citation, content.citations ?? []);
            }
            break;
          }
          case "input_json_delta": {
            if (content.type === "tool_use" && content.input) {
              this._emit("inputJson", event.delta.partial_json, content.input);
            }
            break;
          }
          default:
            checkNever2(event.delta);
        }
        break;
      }
      case "message_stop": {
        this._addMessageParam(messageSnapshot);
        this._addMessage(messageSnapshot, true);
        break;
      }
      case "content_block_stop": {
        this._emit("contentBlock", messageSnapshot.content.at(-1));
        break;
      }
      case "message_start": {
        __classPrivateFieldSet3(this, _MessageStream_currentMessageSnapshot, messageSnapshot, "f");
        break;
      }
      case "content_block_start":
      case "message_delta":
        break;
    }
  }, _MessageStream_endRequest = function _MessageStream_endRequest() {
    if (this.ended) {
      throw new AnthropicError(`stream has ended, this shouldn't happen`);
    }
    const snapshot = __classPrivateFieldGet3(this, _MessageStream_currentMessageSnapshot, "f");
    if (!snapshot) {
      throw new AnthropicError(`request ended without sending any chunks`);
    }
    __classPrivateFieldSet3(this, _MessageStream_currentMessageSnapshot, undefined, "f");
    return snapshot;
  }, _MessageStream_accumulateMessage = function _MessageStream_accumulateMessage(event) {
    let snapshot = __classPrivateFieldGet3(this, _MessageStream_currentMessageSnapshot, "f");
    if (event.type === "message_start") {
      if (snapshot) {
        throw new AnthropicError(`Unexpected event order, got ${event.type} before receiving "message_stop"`);
      }
      return event.message;
    }
    if (!snapshot) {
      throw new AnthropicError(`Unexpected event order, got ${event.type} before "message_start"`);
    }
    switch (event.type) {
      case "message_stop":
        return snapshot;
      case "message_delta":
        snapshot.stop_reason = event.delta.stop_reason;
        snapshot.stop_sequence = event.delta.stop_sequence;
        snapshot.usage.output_tokens = event.usage.output_tokens;
        return snapshot;
      case "content_block_start":
        snapshot.content.push(event.content_block);
        return snapshot;
      case "content_block_delta": {
        const snapshotContent = snapshot.content.at(event.index);
        switch (event.delta.type) {
          case "text_delta": {
            if (snapshotContent?.type === "text") {
              snapshotContent.text += event.delta.text;
            }
            break;
          }
          case "citations_delta": {
            if (snapshotContent?.type === "text") {
              snapshotContent.citations ?? (snapshotContent.citations = []);
              snapshotContent.citations.push(event.delta.citation);
            }
            break;
          }
          case "input_json_delta": {
            if (snapshotContent?.type === "tool_use") {
              let jsonBuf = snapshotContent[JSON_BUF_PROPERTY2] || "";
              jsonBuf += event.delta.partial_json;
              Object.defineProperty(snapshotContent, JSON_BUF_PROPERTY2, {
                value: jsonBuf,
                enumerable: false,
                writable: true
              });
              if (jsonBuf) {
                snapshotContent.input = partialParse(jsonBuf);
              }
            }
            break;
          }
          default:
            checkNever2(event.delta);
        }
        return snapshot;
      }
      case "content_block_stop":
        return snapshot;
    }
  }, Symbol.asyncIterator)]() {
    const pushQueue = [];
    const readQueue = [];
    let done = false;
    this.on("streamEvent", (event) => {
      const reader = readQueue.shift();
      if (reader) {
        reader.resolve(event);
      } else {
        pushQueue.push(event);
      }
    });
    this.on("end", () => {
      done = true;
      for (const reader of readQueue) {
        reader.resolve(undefined);
      }
      readQueue.length = 0;
    });
    this.on("abort", (err) => {
      done = true;
      for (const reader of readQueue) {
        reader.reject(err);
      }
      readQueue.length = 0;
    });
    this.on("error", (err) => {
      done = true;
      for (const reader of readQueue) {
        reader.reject(err);
      }
      readQueue.length = 0;
    });
    return {
      next: async () => {
        if (!pushQueue.length) {
          if (done) {
            return { value: undefined, done: true };
          }
          return new Promise((resolve, reject) => readQueue.push({ resolve, reject })).then((chunk2) => chunk2 ? { value: chunk2, done: false } : { value: undefined, done: true });
        }
        const chunk = pushQueue.shift();
        return { value: chunk, done: false };
      },
      return: async () => {
        this.abort();
        return { value: undefined, done: true };
      }
    };
  }
  toReadableStream() {
    const stream = new Stream(this[Symbol.asyncIterator].bind(this), this.controller);
    return stream.toReadableStream();
  }
}
function checkNever2(x) {
}

// node_modules/@anthropic-ai/sdk/resources/messages/messages.mjs
class Messages2 extends APIResource {
  constructor() {
    super(...arguments);
    this.batches = new Batches2(this._client);
  }
  create(body, options) {
    if (body.model in DEPRECATED_MODELS2) {
      console.warn(`The model '${body.model}' is deprecated and will reach end-of-life on ${DEPRECATED_MODELS2[body.model]}
Please migrate to a newer model. Visit https://docs.anthropic.com/en/docs/resources/model-deprecations for more information.`);
    }
    return this._client.post("/v1/messages", {
      body,
      timeout: this._client._options.timeout ?? 600000,
      ...options,
      stream: body.stream ?? false
    });
  }
  stream(body, options) {
    return MessageStream.createMessage(this, body, options);
  }
  countTokens(body, options) {
    return this._client.post("/v1/messages/count_tokens", { body, ...options });
  }
}
var DEPRECATED_MODELS2 = {
  "claude-1.3": "November 6th, 2024",
  "claude-1.3-100k": "November 6th, 2024",
  "claude-instant-1.1": "November 6th, 2024",
  "claude-instant-1.1-100k": "November 6th, 2024",
  "claude-instant-1.2": "November 6th, 2024",
  "claude-3-sonnet-20240229": "July 21st, 2025",
  "claude-2.1": "July 21st, 2025",
  "claude-2.0": "July 21st, 2025"
};
Messages2.Batches = Batches2;
Messages2.MessageBatchesPage = MessageBatchesPage;
// node_modules/@anthropic-ai/sdk/resources/models.mjs
class Models2 extends APIResource {
  retrieve(modelId, options) {
    return this._client.get(`/v1/models/${modelId}`, options);
  }
  list(query = {}, options) {
    if (isRequestOptions(query)) {
      return this.list({}, query);
    }
    return this._client.getAPIList("/v1/models", ModelInfosPage, { query, ...options });
  }
}

class ModelInfosPage extends Page {
}
Models2.ModelInfosPage = ModelInfosPage;
// node_modules/@anthropic-ai/sdk/index.mjs
var _a;

class Anthropic extends APIClient {
  constructor({ baseURL = readEnv("ANTHROPIC_BASE_URL"), apiKey = readEnv("ANTHROPIC_API_KEY") ?? null, authToken = readEnv("ANTHROPIC_AUTH_TOKEN") ?? null, ...opts } = {}) {
    const options = {
      apiKey,
      authToken,
      ...opts,
      baseURL: baseURL || `https://api.anthropic.com`
    };
    if (!options.dangerouslyAllowBrowser && isRunningInBrowser()) {
      throw new AnthropicError(`It looks like you're running in a browser-like environment.

This is disabled by default, as it risks exposing your secret API credentials to attackers.
If you understand the risks and have appropriate mitigations in place,
you can set the \`dangerouslyAllowBrowser\` option to \`true\`, e.g.,

new Anthropic({ apiKey, dangerouslyAllowBrowser: true });
`);
    }
    super({
      baseURL: options.baseURL,
      timeout: options.timeout ?? 600000,
      httpAgent: options.httpAgent,
      maxRetries: options.maxRetries,
      fetch: options.fetch
    });
    this.completions = new Completions(this);
    this.messages = new Messages2(this);
    this.models = new Models2(this);
    this.beta = new Beta(this);
    this._options = options;
    this.apiKey = apiKey;
    this.authToken = authToken;
  }
  defaultQuery() {
    return this._options.defaultQuery;
  }
  defaultHeaders(opts) {
    return {
      ...super.defaultHeaders(opts),
      ...this._options.dangerouslyAllowBrowser ? { "anthropic-dangerous-direct-browser-access": "true" } : undefined,
      "anthropic-version": "2023-06-01",
      ...this._options.defaultHeaders
    };
  }
  validateHeaders(headers, customHeaders) {
    if (this.apiKey && headers["x-api-key"]) {
      return;
    }
    if (customHeaders["x-api-key"] === null) {
      return;
    }
    if (this.authToken && headers["authorization"]) {
      return;
    }
    if (customHeaders["authorization"] === null) {
      return;
    }
    throw new Error('Could not resolve authentication method. Expected either apiKey or authToken to be set. Or for one of the "X-Api-Key" or "Authorization" headers to be explicitly omitted');
  }
  authHeaders(opts) {
    const apiKeyAuth = this.apiKeyAuth(opts);
    const bearerAuth = this.bearerAuth(opts);
    if (apiKeyAuth != null && !isEmptyObj(apiKeyAuth)) {
      return apiKeyAuth;
    }
    if (bearerAuth != null && !isEmptyObj(bearerAuth)) {
      return bearerAuth;
    }
    return {};
  }
  apiKeyAuth(opts) {
    if (this.apiKey == null) {
      return {};
    }
    return { "X-Api-Key": this.apiKey };
  }
  bearerAuth(opts) {
    if (this.authToken == null) {
      return {};
    }
    return { Authorization: `Bearer ${this.authToken}` };
  }
}
_a = Anthropic;
Anthropic.Anthropic = _a;
Anthropic.HUMAN_PROMPT = `

Human:`;
Anthropic.AI_PROMPT = `

Assistant:`;
Anthropic.DEFAULT_TIMEOUT = 600000;
Anthropic.AnthropicError = AnthropicError;
Anthropic.APIError = APIError;
Anthropic.APIConnectionError = APIConnectionError;
Anthropic.APIConnectionTimeoutError = APIConnectionTimeoutError;
Anthropic.APIUserAbortError = APIUserAbortError;
Anthropic.NotFoundError = NotFoundError;
Anthropic.ConflictError = ConflictError;
Anthropic.RateLimitError = RateLimitError;
Anthropic.BadRequestError = BadRequestError;
Anthropic.AuthenticationError = AuthenticationError;
Anthropic.InternalServerError = InternalServerError;
Anthropic.PermissionDeniedError = PermissionDeniedError;
Anthropic.UnprocessableEntityError = UnprocessableEntityError;
Anthropic.toFile = toFile;
Anthropic.fileFromPath = fileFromPath;
Anthropic.Completions = Completions;
Anthropic.Messages = Messages2;
Anthropic.Models = Models2;
Anthropic.ModelInfosPage = ModelInfosPage;
Anthropic.Beta = Beta;
var sdk_default = Anthropic;

// index.ts
var anthropic_sdk_lib_default = sdk_default;
export {
  anthropic_sdk_lib_default as default
};
