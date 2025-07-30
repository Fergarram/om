const std = @import("std");

const number_of_pages = 2;

pub fn build(b: *std.Build) void {
    const target = b.resolveTargetQuery(.{
        .cpu_arch = .wasm32,
        .os_tag = .freestanding
    });

    const exe = b.addExecutable(.{
        .name = "main",
        .root_source_file = b.path("src/wasm/main.zig"),
        .target = target,
        .optimize = .ReleaseSmall,
    });

    // WebAssembly configuration
    exe.entry = .disabled;
    exe.rdynamic = true;
    exe.import_memory = true;
    exe.stack_size = std.wasm.page_size;
    exe.initial_memory = std.wasm.page_size * number_of_pages;
    exe.max_memory = std.wasm.page_size * number_of_pages;

    // This might help with some linking issues
    if (@hasField(@TypeOf(exe.*), "global_base")) {
        exe.global_base = 6560;
    }

    b.installArtifact(exe);
}
