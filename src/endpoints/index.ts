
const endpointFiles: string[] = [
	'healthcheck',
	'user/find-by-email'
];

export const loadEndpoints = () => {
	endpointFiles.forEach((file) => require(`./${file}`));
};
