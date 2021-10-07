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
			argv
				// examples
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

export const METHODS = [
	'get',
	'put',
	'patch',
	'post',
	'delete',
	'options',
	'head',
] as const

export type Method = typeof METHODS[number]

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

function clean(template: string) {
	return template.split('\n').filter(Boolean).join('\n')
}

// = TS =======================================================================

function generateTs(nameInfo: NameInfo) {
	const template = `
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

	const toRemoveMethods = METHODS.filter(
		(m) => nameInfo.suggest.includes(m) === false
	)

	console.log({
		nameInfo,
		methods: nameInfo.suggest,
		toRemoveMethods,
	})

	console.log('=========================================')
	console.log('initial')
	console.log('=========================================')
	console.log(template)

	////////////////////////////////////////////////////////

	console.log('=========================================')
	console.log('BASE_INTERFACE')
	console.log('=========================================')

	const templateWithBaseInterface = template.replace(
		'{{BASE_INTERFACE}}',
		tsBuildTemplateBaseInterface(nameInfo)
	)

	console.log(templateWithBaseInterface)

	////////////////////////////////////////////////////////

	console.log('=========================================')
	console.log('METHODS_INTERFACE')
	console.log('=========================================')

	const templateWithMethodsInterface = METHODS.reduce(
		(currentTemplate, method) =>
			currentTemplate.replace(
				`{{${method.toUpperCase()}_INTERFACE}}`,
				tsBuildTemplateSpecificInterface(method, nameInfo)
			),
		templateWithBaseInterface
	)

	console.log(templateWithMethodsInterface)

	////////////////////////////////////////////////////////

	console.log('=========================================')
	console.log('METHODS_IMPLEMENTATION')
	console.log('=========================================')

	const templateWithMethodsImplementation = METHODS.reduce(
		(currentTemplate, method) =>
			currentTemplate.replace(
				`{{${method.toUpperCase()}}}`,
				tsBuildTemplateSpecificImplementation(method, nameInfo)
			),
		templateWithMethodsInterface
	)

	console.log(templateWithMethodsImplementation)

	////////////////////////////////////////////////////////

	console.log('=========================================')
	console.log('FINAL')
	console.log('=========================================')

	const templateCleaned = toRemoveMethods.reduce(
		(currentTemplate, method) =>
			currentTemplate
				.replace(`{{${method.toUpperCase()}_INTERFACE}}`, '')
				.replace(`{{${method.toUpperCase()}`, ''),
		templateWithMethodsImplementation
	)

	console.log(templateCleaned)

	return templateCleaned
}

function tsBuildTemplateBaseInterface({ name, parameters }: NameInfo) {
	const template = `interface Request{{name}} extends RequestGenericInterface {
{{params}}
}
`
	return template
		.replace('{{name}}', name)
		.replace(
			'{{params}}',
			parameters.length
				? '  Params: {\n' +
						parameters?.map((p) => `    ${p}: string`).join('\n') +
						'\n  }'
				: ''
		)
}

function tsBuildTemplateSpecificInterface(method: Method, nameInfo: NameInfo) {
	const template = `interface ${interfaceName(
		method,
		nameInfo
	)} extends Request{{name}} {
{{querystring}}
{{body}}
}`

	return clean(
		template
			.replace(/{{name}}/g, nameInfo.name)
			.replace(/{{method}}/g, capitalizeFirstLetter(method.toLowerCase()))
			.replace(/{{querystring}}/g, tsBuildTemplateQueryString(method, nameInfo))
			.replace(/{{body}}/g, tsBuildTemplateBody(method, nameInfo))
	)
}

function interfaceName(method: Method, nameInfo: NameInfo) {
	return `${capitalizeFirstLetter(method.toLowerCase())}Request${nameInfo.name}`
}

function tsBuildTemplateQueryString(method: Method, nameInfo: NameInfo) {
	switch (method) {
		case 'get': {
			return nameInfo.type === 'RESOURCE'
				? '  Querystring: Pagination & (GetByIds | Search)'
				: ''
		}

		default: {
			return ''
		}
	}
}

function tsBuildTemplateBody(method: Method, nameInfo: NameInfo) {
	switch (method) {
		case 'put':
		case 'patch': {
			return nameInfo.type === 'SPECIFIC'
				? `  Body: Update${nameInfo.resource}`
				: ''
		}

		case 'post': {
			return nameInfo.type === 'RESOURCE'
				? `  Body: Create${nameInfo.resource}`
				: nameInfo.type === 'ACTION'
				? `  Body: Do${nameInfo.action}`
				: ''
		}

		default: {
			return ''
		}
	}
}

function summary(method: Method, nameInfo: NameInfo) {
	return `'${method} ${nameInfo.name}'`
}

function description(method: Method, nameInfo: NameInfo) {
	return `'long ${method} ${nameInfo.name}'`
}

function tags(method: Method, nameInfo: NameInfo) {
	return `['${nameInfo.name}']`
}

function returnType(method: Method, nameInfo: NameInfo) {
	switch (method) {
		case 'get': {
			return nameInfo.type === 'RESOURCE'
				? `Pagination<${nameInfo.name}>`
				: nameInfo.type === 'SPECIFIC'
				? nameInfo.name
				: nameInfo.type === 'FIELD'
				? `${nameInfo.name}['${nameInfo.resource?.toLocaleLowerCase()}']`
				: ''
		}
	}
}

function tsBuildTemplateSpecificImplementation(
	method: Method,
	nameInfo: NameInfo
) {
	const template = `
${method}: {
  schema: {
    summary: ${summary(method, nameInfo)},
    description: ${description(method, nameInfo)},
    tags: ${tags(method, nameInfo)},
    accepts: ['application/json'],
    produces: ['application/json'],
    response: {
      // 200: use(${nameInfo.name})
  },
  handler: async (request: FastifyRequest<${interfaceName(
		method,
		nameInfo
	)}>): ${returnType(method, nameInfo)} => {
    return void 0
  }
},
`

	switch (method) {
		case 'get': {
			return clean(template)
		}
		case 'put': {
			return clean('')
		}
		case 'patch': {
			return clean('')
		}
		case 'post': {
			return clean('')
		}
		case 'delete': {
			return clean('')
		}
		case 'options': {
			return clean('')
		}
		case 'head': {
			return clean('')
		}
	}
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
