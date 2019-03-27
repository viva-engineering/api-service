
import { PoolConfig } from 'mysql';

export const config = require('../config') as Config;

interface Config {
	/** Configuration for the HTTP server */
	http: {
		/** The address the HTTP server should listen for connections on */
		address: string,

		/** The port the HTTP server should listen for connections on */
		port: number
	},

	/** Configuration for server output/logging  */
	logging: {
		/** The max stack trace length to get on errors */
		stackTraceLimit: number,

		/** The log level on the logger */
		logLevel: 'error' | 'warn' | 'info' | 'verbose' | 'debug' | 'silly',

		/** The output format */
		output: 'json' | 'pretty',

		/** Should the logs be colored */
		colors: boolean
	},

	/** Configuration for the worker cluster */
	cluster: {
		/**
		 * The number of worker threads to start. Set to 0 to run in single-threaded
		 * mode (no cluster). Set to 'auto' to let the server figure out how many workers
		 * to start based on the number of available CPUs
		 */
		threads: number | 'auto',

		/** The max heap size (in MB) to allocate to each worker */
		heapSize?: number,

		/**
		 * When using `threads: 'auto'`, the server will try to leave this many CPUs on the
		 * machine available for other work
		 */
		extraCpus?: number
	},

	/** Configuration for the MySQL database connection */
	mysql: {
		master: PoolConfig,
		replica: PoolConfig
	}
}
