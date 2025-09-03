// core.js
import app from './src/application.js';

const start = async () => {
	try {
		const startTime = Date.now();
		app.cc.info('Initializing server...', 'SYS');

		const port = app.config.PORT || 3000;
		await app.listen({ port, host: '0.0.0.0' });

		const duration = Date.now() - startTime;
		app.cc.success('Server is running...', 'SYS');
		app.cc.debug(`Startup process took ${duration}ms`, 'SYS');
		app.cc.block(
			'Config',
			{
				environment: app.config.NODE_ENV,
				port: app.config.PORT,
				log: app.config.LOG_LEVEL,
			},
			{ level: 'info', context: 'SYS' }
		);
	} catch (err) {
		app.cc.error('Failed to start', 'SYS');
		app.cc.error(err?.message || err, 'SYS');
		process.exit(1);
	}
};

start();
