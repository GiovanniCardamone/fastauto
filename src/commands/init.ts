import { Cli } from '..'
import Command from '../command'

import fs from 'fs'
import path from 'path'

interface Args {}

const defaultConfig = {
	baseDir: 'src',
	routes: 'routes',
	security: 'security',
}

export default (cli: Cli): Command<Args> => ({
	command: 'init',
	description: 'create fastauto configuration file',
	builder: (y) =>
		y.check(() => {
			const file = path.join(cli.projectPath, cli.configFileName)

			if (fs.existsSync(file)) {
				return cli.output.error(`file "${file}" already exists`)
			}

			return true
		}),
	handler: () => {
		const file = path.join(cli.projectPath, cli.configFileName)

		fs.writeFileSync(file, JSON.stringify(defaultConfig, null, 4))
	},
})
