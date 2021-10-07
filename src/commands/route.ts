import { Cli } from '..'
import Command from '../command'
import fs from 'fs'
import path from 'path'
import pluralize from 'pluralize'

interface Args {
	route: string
	field: boolean
}

export default (cli: Cli): Command<Args> => ({
	command: 'route <route>',
	description: 'nome',
	builder: (argv) => {
		return (
			argv // examples
				.example('route users.ts', 'create users route')
				.example('route users/:userId.ts', 'create users/{userId} route')
				.example(
					'route users/:userId/photos.ts',
					'create users/{userId}/pothos route'
				)
				// options
				.option('field', {
					describe: 'if route is field route',
					default: false,
					boolean: true,
				})
				// check
				.check((argv) => {
					const routesDir = path.join(cli.settings.baseDir, cli.settings.routes)
					const routeRegex =
						/^[a-zA-Z0-9]+(\/(([a-zA-Z0-9]+)|{[a-zA-Z0-9]+}))*\.(ts|js)$/g

					if (fs.existsSync(routesDir) === false) {
						return cli.output.error(
							`directory for routes "${routesDir}" does not exists`
						)
					}

					if (routeRegex.test(argv.route as string) === false) {
						return cli.output.error(
							`route "${argv.route}" is not a valid route, must be a file path with optional liquid variables`
						)
					}

					const routePath = path.join(routesDir, argv.route as string)

					if (fs.existsSync(routePath)) {
						return cli.output.error(`route ${routePath} already exists!`)
					}

					return true
				})
		)
	},
	handler: (argv) => {
		console.log({ argv })

		const routesDir = path.join(cli.settings.baseDir, cli.settings.routes)
		const routePath = path.join(routesDir, argv.route)

		const nameInfo = getNameInfo(argv.route, { isField: argv.field })

		// fs.writeFileSync
		console.info(
			routePath,
			routePath.endsWith('.ts') ? generateTs(nameInfo) : generateJs(nameInfo)
		)
	},
})

type Method = 'get' | 'put' | 'patch' | 'post' | 'delete' | 'options' | 'head'

interface NameInfo {
	name: string
	type: 'RESOURCE' | 'SPECIFIC' | 'ACTION' | 'FIELD'
	suggest: Method[]
	parameters: string[]

	resource?: string
	action?: string
	value?: any
}

export function getNameInfo(
	path: string,
	options?: { isField: boolean }
): NameInfo {
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

export function getParameters(path: string) {
	const parameters: string[] = [
		...(path
			.match(/{{([^}]*)}}/g)
			?.map((m) => m.replace(/{{([^}]*)}}/g, '$1')) || []),
		...(path.match(/:[^/]*/g)?.map((m) => m.replace(/:/g, '')) || []),
	]

	return parameters
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

// = TS =======================================================================

const tsTemplate = `
import type { FastifyInstance, FastifyRequest, RequestGenericInterface } from 'fastify'
import type { StrictResource } from 'fastify-autoroutes'

{{BASE_INTERFACE}}
{{GET_INTERFACE}}
{{PUT_INTERFACE}}
{{PATCH_INTERFACE}}
{{POST_INTERFACE}}
{{DELETE_INTERFACE}}
{{HEAD_INTERFACE}}
{{OPTIONS_INTERFACE}}

export default (fastify: FastifyInstance): StrictResource => ({
  {{GET}}
  {{PUT}}
  {{PATCH}}
  {{POST}}
  {{DELETE}}
  {{HEAD}}
  {{OPTIONS}}
})
`

function generateTs(nameInfo: NameInfo) {
	nameInfo
	return ''
}

// = JS =======================================================================

const jsTemplate = `
export default (fastify) => ({
	{GET}}
  {{PUT}}
  {{PATCH}}
  {{POST}}
  {{DELETE}}
  {{HEAD}}
  {{OPTIONS}}
})
`

function generateJs(nameInfo: NameInfo) {
	nameInfo
	return ''
}
