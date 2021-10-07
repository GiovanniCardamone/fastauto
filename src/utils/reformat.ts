import prettier from 'prettier'

export function reformat(type: 'ts' | 'js', code: string) {
	return prettier.format(code, {
		arrowParens: 'always',
		bracketSpacing: true,
		semi: false,
		printWidth: 80,
		embeddedLanguageFormatting: 'auto',
		singleQuote: true,
		jsxBracketSameLine: true,
		jsxSingleQuote: false,
		parser: type === 'js' ? 'babel' : 'babel-ts',
	})
}
