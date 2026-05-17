<instructions-for-writing-code>
	Use snake_case for variable names.
	Use camelCase for function names.
	
	prefer:
	
	function someFunction() {
	    // Function implementation
	}
	
	over
	
	const someFunction = () => {
	    // Function implementation
	};
	
	for named functions.
	
	For anonymous functions prefer arrow functions.
	
	Never use classes or OOP patterns for that matter.
	
	Prefer "type" over "interface" in typescript.
	
	Never use emojis unless explicitly required.
	
	For comments:
	
	use heading-type comments like:
	
	//
	// Constants
	//
	
	const SOME_CONSTANT = 123;
	
	
	//
	// State
	//
	
	let state = "";
	const more_state = {};
	
	//
	// Code execution
	//
	
	await someFunc();
	
	//
	// Functions
	//
	
	...
	
	you get the idea.
	
	For inline comments keep them minimal and precise. Avoid using em dashes or dashes for punctuation.
	
	
</instructions-for-writing-code>

<instructions-for-answer-format>
	How to answer in general:
		Never use markdown.
		Use plain text like man pages.
		When showing code use:

		```[language]
		code example here
		```
</instructions-for-answer-format>
