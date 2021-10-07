// import type { Options } from '..'

interface Options {
	[key: string]: any
}

import * as extract from './extract'
import { allMethods, Method, NameInfo } from './extract'

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

export default function (
	path: string,
	file: string,
	methods: Method[],
	options: Options
) {
	// const parameters = extract.getParameters(path)
	const nameInfo = extract.getNameInfo(file, options)

	console.log({ nameInfo })

	methods = methods.length ? methods : nameInfo.suggest
	const toRemoveMethods = allMethods.filter(
		(m) => methods.includes(m) === false
	)

	console.log({
		methods,
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
		buildBaseInterface(nameInfo)
	)

	console.log(templateWithBaseInterface)

	////////////////////////////////////////////////////////

	console.log('=========================================')
	console.log('METHODS_INTERFACE')
	console.log('=========================================')

	const templateWithMethodsInterface = methods.reduce(
		(currentTemplate, method) =>
			currentTemplate.replace(
				`{{${method.toUpperCase()}_INTERFACE}}`,
				buildSpecificMethodInterface(method, nameInfo)
			),
		templateWithBaseInterface
	)

	console.log(templateWithMethodsInterface)
	return

	////////////////////////////////////////////////////////

	console.log('=========================================')
	console.log('METHODS_IMPLEMENTATION')
	console.log('=========================================')

	const templateWithMethodsImplementation = methods.reduce(
		(currentTemplate, method) =>
			currentTemplate.replace(
				`{{${method.toUpperCase()}}}`,
				buildSpecificMethodImplementation(method, nameInfo)
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

const template_baseInterface = `interface Request{{name}} extends RequestGenericInterface {
{{params}}
}`

export function buildBaseInterface({ name, parameters }: NameInfo) {
	return template_baseInterface
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

const template_SpecificMethodsInterface = `interface {{method}}Request{{name}} extends Request{{name}} {
{{querystring}}
{{body}}
}`

export function buildSpecificMethodInterface(
	method: Method,
	nameInfo: NameInfo
) {
	return clean(
		template_SpecificMethodsInterface
			.replace(/{{name}}/g, nameInfo.name)
			.replace(
				/{{method}}/g,
				extract.capitalizeFirstLetter(method.toLowerCase())
			)
			.replace(/{{querystring}}/g, buildQuerystring(method, nameInfo))
			.replace(/{{body}}/g, buildBody(method, nameInfo))
	)
}

function buildQuerystring(method: Method, nameInfo: NameInfo) {
	switch (method) {
		case 'get': {
			return nameInfo.type === 'RESOURCE'
				? '  Querystring: Pagination & (GetByIds | Search)'
				: ''
		}

		case 'put':
		case 'patch':
		case 'post':
		case 'delete':
		case 'head':
		case 'options':
		default:
			return ''
	}
}

function buildBody(method: Method, nameInfo: NameInfo) {
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

const template_SpecificMethodImplementation = `
{{method}}: {
  schema: {
    summary: '{{summary}}',
    description: '{{description}}',
    tags: {{tags}},
    security: {{security}},
    querystring: {{querystring}},
    body: {{body}},
    response: {{response}}
  },
  handler: async (request: FastifyRequest<{{method}}Request{{name}}>): Promise<{{return}}> => void
}
`

export function buildSpecificMethodImplementation(
	method: Method,
	nameInfo: NameInfo
) {
	switch (method) {
		case 'get': {
			return clean(template_SpecificMethodImplementation)
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

const template_Querystring = `
  Querystring: Pagination & (Search | GetByIds)
`

function clean(template: string) {
	return template.split('\n').filter(Boolean).join('\n')
}
