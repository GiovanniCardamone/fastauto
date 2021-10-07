#!/usr/bin/env node

import yargs from 'yargs'
import { hideBin } from 'yargs/helpers'
import glob from 'glob-promise'
import path from 'path'
import { URL } from 'url'
import { CommandModule } from './command'
import chalk from 'chalk'
import fs from 'fs'

type Awaited<T> = T extends PromiseLike<infer U> ? U : T
export type Cli = Awaited<ReturnType<typeof prepareCli>>

const baseDir = __dirname //`${new URL('.', import.meta.url).pathname}`

async function main() {
	const cli = await prepareCli()

	const y = yargs(hideBin(process.argv)).usage('Usage: $0 <command> [options]')

	for (const commandPath of await glob(
		path.join(baseDir, 'commands', '*.{ts,js}')
	)) {
		const command = ((await import(commandPath)) as CommandModule) //
			.default(cli)

		y.command(
			command.command,
			command.description,
			command.builder,
			command.handler
		)
	}

	return y.strictCommands().demandCommand(1).parse()
}

interface Settings {
	baseDir: string
	routes: string
	security: string
}

async function prepareCli() {
	const baseDir = process.cwd()
	const configFileName = 'fastauto.json'
	const configFilePath = path.join(baseDir, configFileName)

	const settings: Settings = fs.existsSync(configFilePath)
		? JSON.parse(fs.readFileSync(configFilePath).toString('utf-8'))
		: {
				baseDir: 'src',
				routes: 'routes',
				security: 'security',
		  }

	settings.baseDir = path.join(process.cwd(), settings.baseDir)

	return {
		configFileName,
		projectPath: process.cwd(),
		settings,
		output: {
			error: (message: string) => `Error:\n  ${message}`,
		},
	}
}

main()
	.then(() => void 0)
	.catch(console.error)
