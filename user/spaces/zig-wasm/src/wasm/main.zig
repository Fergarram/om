const builtin = @import("builtin");

var mouse_x: f64 = 0;
var mouse_y: f64 = 0;

export fn onFrame(ts: f64) f64 {
    return ts;
}

export fn onMouseMove(x: f64, y: f64) void {
    mouse_x = x;
    mouse_y = y;
}

export fn getMouseX() f64 {
    return mouse_x;
}

export fn getMouseY() f64 {
    return mouse_y;
}

export fn onKeyDown(code: u32) u32 {
    return code;
}

pub fn main() void {} // Not used in WASM but needed for Zig entry
