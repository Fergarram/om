import * as acorn from "acorn";
import tsPlugin from "acorn-typescript";
import * as astring from "astring";

const parser = acorn.Parser.extend(tsPlugin());

function stripTypes(ast) {
	function visit_node(node, parent, key) {
		// Remove type annotations
		if (node.typeAnnotation) {
			delete node.typeAnnotation;
		}
		if (node.returnType) {
			delete node.returnType;
		}
		if (node.typeParameters) {
			delete node.typeParameters;
		}
		if (node.type) {
			// Handle TS-specific nodes by erasing them
			if (node.type.startsWith("TS")) {
				// Replace TSAsExpression with just the expression
				if (node.type === "TSAsExpression") {
					Object.assign(node, node.expression);
				}
			}
		}

		// Recursively visit child nodes
		for (let prop in node) {
			const value = node[prop];
			if (Array.isArray(value)) {
				value.forEach((child) => {
					if (child && typeof child.type === "string") {
						visit_node(child, node, prop);
					}
				});
			} else if (value && typeof value.type === "string") {
				visit_node(value, node, prop);
			}
		}
	}

	visit_node(ast, null, null);
	return ast;
}

function transpile(source_code) {
	const ast = parser.parse(source_code, {
		ecmaVersion: "latest",
		sourceType: "module",
	});

	const cleaned_ast = stripTypes(ast);
	const js_code = astring.generate(cleaned_ast);
	return js_code;
}

// @ts-ignore
if (typeof globalThis.std === "undefined") {
	// @ts-ignore
	globalThis.std = {
		typescript: {
			transpile,
		},
	};
} else {
	// @ts-ignore
	globalThis.std.typescript = {
		transpile,
	};
}
