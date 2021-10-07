import { Arguments, BuilderCallback } from 'yargs'
import { Cli } from '.'

export type CommandModule<U = unknown> = {
	default: (cli: Cli) => Command<U>
}

export default interface Command<U> {
	command: string
	description: string
	builder: BuilderCallback<U, U>
	handler: (args: Arguments<U>) => void | Promise<void>
}
