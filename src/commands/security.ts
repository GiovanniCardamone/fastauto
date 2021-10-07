import { Cli } from '..'
import Command from '../command'

interface Args {
	type: 'bearer' | 'basic'
	security: string
}

export default (cli: Cli): Command<Args> => ({
	command: 'security <security>',
	description: 'nome',
	builder: (argv) =>
		argv
			.example('route hello/world.ts', 'ciao')
			.example('route hello/world.ts', 'ciao')
			.example('route hello/world.ts', 'ciao')
			.option('type', {
				describe: '',
				choices: ['bearer', 'oauth'],
				handler: () => {
					console.log()
				},
			}),

	handler: (y) => {
		console.log('ciao')
	},
})
