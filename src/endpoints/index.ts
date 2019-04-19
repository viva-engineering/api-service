
const endpointFiles: string[] = [
	'./healthcheck',
	'./user/find/endpoint',
	'./user/get-profile/endpoint',
	'./user/edit-profile/endpoint'
];

export const loadEndpoints = () => {
	endpointFiles.forEach((file) => require(file));
};
