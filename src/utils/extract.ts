import fs from 'fs'
import path from 'path'
import JSON5 from 'json5'
import pluralize from 'pluralize'
// import type { Options } from '..'

interface Options {
	[key: string]: any
}

export const allMethods = [
	'get',
	'put',
	'patch',
	'post',
	'delete',
	'options',
	'head',
] as const

export type Method = typeof allMethods[number]

export function getBase() {
	const root = process.cwd()

	// attemmpt load from auto.json
	if (fs.existsSync(path.join(root, 'auto.json'))) {
		const config = JSON.parse(
			fs.readFileSync(path.join(root, 'auto.json'), 'utf8')
		)

		if (config?.routes?.dir) {
			const dir = path.join(root, config.routes.dir)
			console.info(`using auto.json baseDir: ${dir}`)
			return dir
		}
	}

	// attempt load from tsconfig.json
	if (fs.existsSync(path.join(root, 'tsconfig.json'))) {
		const config = JSON5.parse(
			fs.readFileSync(path.join(root, 'tsconfig.json'), 'utf8')
		)

		if (config?.compilerOptions?.rootDir) {
			const dir = path.join(root, config.compilerOptions.rootDir, 'routes')
			console.info(`using tsconfig.json baseDir: ${dir}`)
			return dir
		}
	}
}

export function getParameters(path: string) {
	const parameters: string[] = [
		...(path
			.match(/{{([^}]*)}}/g)
			?.map((m) => m.replace(/{{([^}]*)}}/g, '$1')) || []),
		...(path.match(/:[^/]*/g)?.map((m) => m.replace(/:/g, '')) || []),
	]

	return parameters
}

export interface NameInfo {
	name: string
	type: 'RESOURCE' | 'SPECIFIC' | 'ACTION' | 'FIELD'
	suggest: Method[]
	parameters: string[]

	resource?: any
	value?: any
	action?: any
}

export function getNameInfo(path: string, options?: Options): NameInfo {
	const ext = '.' + path.split('.').pop()!

	const pathNoExt = path.replace(ext, '')

	const nameResolvedParts = pathNoExt
		.split('/')
		.filter(Boolean)
		.map(liquidToName)
		.map(capitalizeFirstLetter)
		.map(mergePrevious)
		.map(singularizeNext)

	let name = nameResolvedParts.join('')
	const last = nameResolvedParts[nameResolvedParts.length - 1]
	const type = options?.isField
		? 'FIELD'
		: last.startsWith('By')
		? 'SPECIFIC'
		: pluralize.isPlural(last)
		? 'RESOURCE'
		: 'ACTION'

	let action: string | undefined = undefined
	if (type === 'ACTION') {
		action = nameResolvedParts.pop()
		name = [action, ...nameResolvedParts].join('')
	}

	return {
		name,
		action,
		type,
		suggest: suggestedMethods(type),
		parameters: getParameters(pathNoExt),
		resource: findLastResource(nameResolvedParts),
	}
}

function findLastResource(parts?: string[]): string | undefined {
	if (!parts || !parts.length) {
		return
	}

	for (let i = parts.length - 1; i >= 0; i--) {
		if (parts[i].startsWith('By') === false) {
			return capitalizeFirstLetter(pluralize.singular(parts[i]))
		}
	}
}

function suggestedMethods(type: NameInfo['type']): Method[] {
	switch (type) {
		case 'RESOURCE':
			return ['get', 'post']
		case 'SPECIFIC':
			return ['get', 'put', 'delete']
		case 'ACTION':
			return ['get', 'post']
		case 'FIELD':
			return ['get', 'patch']
	}
}

function liquidToName(part: string) {
	return part.startsWith('{{')
		? part.replace('{{', '').replace('}}', '')
		: part.startsWith(':')
		? part.replace(':', '')
		: part
}

export function capitalizeFirstLetter(part: string) {
	return part.charAt(0).toUpperCase() + part.slice(1)
}

function mergePrevious(part: string, index: number, array: string[]) {
	return index === 0 || matchPrevious(array[index - 1], part) === false
		? part
		: `By${capitalizeFirstLetter(replacePrevious(array[index - 1], part))}`
}

function matchPrevious(before: string, after: string) {
	return after.startsWith(
		pluralize.isPlural(before) ? pluralize.singular(before) : before
	)
}

function replacePrevious(before: string, after: string) {
	const beforeSingular = pluralize.isPlural(before)
		? pluralize.singular(before)
		: before

	return pluralize.singular(after.replace(beforeSingular, ''))
}

function singularizeNext(part: string, index: number, array: string[]) {
	return index === array.length - 1 ||
		array[index + 1].startsWith('By') === false
		? part
		: pluralize.singular(part)
}
