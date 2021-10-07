import type { Cli } from '..'
import type Command from '../command'

import fs from 'fs'
import path from 'path'
import { reformat } from '../utils/reformat'

interface Args {
	type: 'bearer' | 'basic'
	security: string
}

export default (cli: Cli): Command<Args> => ({
	command: 'security <type> <security>',
	description: 'nome',
	builder: (argv) => {
		return (
			argv
				// examples
				.example('security bearer bearerToken.ts', 'create bearer security')
				.example('security bearer mySecurity.ts', 'create bearer security')
				.example(
					'security basic usernameAndPassword.ts',
					'create basic security'
				)
				// options
				.option('type', {
					describe: 'security type',
					choices: ['bearer', 'basic'],
					handler: () => {
						console.log()
					},
				})
				// check
				.check((argv) => {
					const securityDir = path.join(
						cli.settings.baseDir,
						cli.settings.security
					)

					const securityRegex = /^[a-zA-Z0-9]+.\.(ts|js)$/g

					if (fs.existsSync(securityDir) === false) {
						return cli.output.error(
							`directory for security "${securityDir}" does not exists`
						)
					}

					if (securityRegex.test(argv.security as string) === false) {
						return cli.output.error(
							`security "${argv.security}" is not a valid security name, must be a name of choosed security with extension js or ts (example: bearerToken.ts)`
						)
					}

					const securityPath = path.join(securityDir, argv.security as string)

					if (fs.existsSync(securityPath)) {
						return cli.output.error(`security ${securityPath} already exists!`)
					}

					return true
				})
		)
	},

	handler: (argv) => {
		const securityDir = path.join(cli.settings.baseDir, cli.settings.security)
		const securityPath = path.join(securityDir, argv.security)

		fs.writeFileSync(
			securityPath,
			reformat(
				securityPath.endsWith('.ts') ? 'ts' : 'js',
				securityPath.endsWith('.ts') ? generateTs(argv) : generateJs(argv)
			)
		)
	},
})

// = TS =======================================================================

function security(args: Args) {
	switch (args.type) {
		case 'basic': {
			return `{
				type: 'basic'
			}`
		}
		case 'bearer': {
			return `{
				type: 'apiKey',
				in: 'header',
				name: 'Authorization'
			}`
		}
	}
}

function tsHandle(args: Args, typeName: string) {
	switch (args.type) {
		case 'basic': {
			return `async (username: string, password: string): Pomise<${typeName}> | undefined | never => {
				if (password.length === 0) {
					throw new Error('missing password')
				}

				return { username: username } as ${typeName} // change with your entity for security
			}`
		}

		case 'bearer': {
			return `async (token: string): Promise<${typeName}> | undefined | never => {
				if (token.length !== 10) {
					throw new Error('our token is 10 character length')
				}

				return { username: extractUsernameFromToken(token) } as ${typeName} // change with your entity for security
			}
			`
		}
	}
}

function tsScopes(args: Args, typeName: string) {
	return `async (entity: ${typeName}, scopes: string[]): Promise<boolean> => {
		return scopes.every(scope => hasPermission(entity, scope))
	}`
}

function generateTs(args: Args) {
	const securityTypeName = `Strict${
		args.type === 'basic' ? 'BasicAuth' : 'ApiKey'
	}Security`
	const entityName = 'Entity'

	return `
import type { FastifyInstance } from 'fastify'
import type { ${securityTypeName} } from 'fastify-autosecurity'

export default (fastify: FastifyInstance): ${securityTypeName}<${entityName}> => ({
	security: ${security(args)},
	handle: ${tsHandle(args, entityName)},
	scopes: ${tsScopes(args, entityName)},
})
`
}

// = JS =======================================================================

function generateJs(args: Args) {
	return ''
}
