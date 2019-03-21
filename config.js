
const http = {
	address: '0.0.0.0',
	port: 8080
};

const logging = {
	stackTraceLimit: 100
};

const cluster = {
	threads: 1,
	heapSize: 1024
};

module.exports = {
	http,
	logging,
	cluster
};
