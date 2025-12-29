import { Parser } from "acorn";
import jsx from "acorn-jsx";
import * as astring from "astring";
import type { Node } from "acorn";

const jsx_parser = Parser.extend(jsx());

function transformJsxNode(node: any): any {
	if (node.type === "JSXElement") {
		return jsxElementToCallExpression(node);
	}

	if (node.type === "JSXFragment") {
		return jsxFragmentToCallExpression(node);
	}

	// Recursively transform children
	for (const key in node) {
		if (node[key] && typeof node[key] === "object") {
			if (Array.isArray(node[key])) {
				node[key] = node[key].map((child: any) =>
					child && typeof child === "object" ? transformJsxNode(child) : child,
				);
			} else {
				node[key] = transformJsxNode(node[key]);
			}
		}
	}

	return node;
}

function jsxElementToCallExpression(jsx_element: any): any {
	const tag_name = getTagName(jsx_element.openingElement.name);
	const props = getProps(jsx_element.openingElement.attributes);
	const children = getChildren(jsx_element.children);

	// React.createElement(tag, props, ...children)
	return {
		type: "CallExpression",
		callee: {
			type: "MemberExpression",
			object: { type: "Identifier", name: "React" },
			property: { type: "Identifier", name: "createElement" },
			computed: false,
		},
		arguments: [tag_name, props, ...children],
	};
}

function jsxFragmentToCallExpression(jsx_fragment: any): any {
	const children = getChildren(jsx_fragment.children);

	// React.createElement(React.Fragment, null, ...children)
	return {
		type: "CallExpression",
		callee: {
			type: "MemberExpression",
			object: { type: "Identifier", name: "React" },
			property: { type: "Identifier", name: "createElement" },
			computed: false,
		},
		arguments: [
			{
				type: "MemberExpression",
				object: { type: "Identifier", name: "React" },
				property: { type: "Identifier", name: "Fragment" },
				computed: false,
			},
			{ type: "Literal", value: null },
			...children,
		],
	};
}

function getTagName(name_node: any): any {
	if (name_node.type === "JSXIdentifier") {
		// Check if it's a component (uppercase) or DOM element (lowercase)
		const name = name_node.name;
		if (name[0] === name[0].toLowerCase()) {
			// DOM element - return as string literal
			return { type: "Literal", value: name };
		} else {
			// Component - return as identifier
			return { type: "Identifier", name: name };
		}
	}

	if (name_node.type === "JSXMemberExpression") {
		// Handle things like <Foo.Bar>
		return {
			type: "MemberExpression",
			object: getTagName(name_node.object),
			property: { type: "Identifier", name: name_node.property.name },
			computed: false,
		};
	}

	return { type: "Identifier", name: "div" };
}

function getProps(attributes: any[]): any {
	if (attributes.length === 0) {
		return { type: "Literal", value: null };
	}

	const properties = [];

	for (const attr of attributes) {
		if (attr.type === "JSXAttribute") {
			const key = attr.name.name;
			let value;

			if (!attr.value) {
				// <foo bar /> => { bar: true }
				value = { type: "Literal", value: true };
			} else if (attr.value.type === "Literal") {
				// <foo bar="baz" />
				value = attr.value;
			} else if (attr.value.type === "JSXExpressionContainer") {
				// <foo bar={expression} />
				value = transformJsxNode(attr.value.expression);
			}

			properties.push({
				type: "Property",
				key: { type: "Identifier", name: key },
				value: value,
				kind: "init",
				method: false,
				shorthand: false,
				computed: false,
			});
		} else if (attr.type === "JSXSpreadAttribute") {
			// <foo {...spread} />
			properties.push({
				type: "SpreadElement",
				argument: transformJsxNode(attr.argument),
			});
		}
	}

	return {
		type: "ObjectExpression",
		properties: properties,
	};
}

function getChildren(jsx_children: any[]): any[] {
	const children = [];

	for (const child of jsx_children) {
		if (child.type === "JSXText") {
			const text = child.value.trim();
			if (text) {
				children.push({ type: "Literal", value: text });
			}
		} else if (child.type === "JSXExpressionContainer") {
			children.push(transformJsxNode(child.expression));
		} else if (child.type === "JSXElement" || child.type === "JSXFragment") {
			children.push(transformJsxNode(child));
		}
	}

	return children;
}

// @ts-ignore
window.BlobLoader.transformers = [
	// @ts-ignore
	...window.BlobLoader.transformers,
	{
		name: "acorn-jsx",
		transformer: (code: string, filename: string): string => {
			const ast = jsx_parser.parse(code, {
				sourceType: "module",
				ecmaVersion: "latest",
			});

			const transformed_ast = transformJsxNode(ast);

			return astring.generate(transformed_ast);
		},
	},
];
