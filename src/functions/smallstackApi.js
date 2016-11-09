


module.exports = function (parameters) {

    var apiUrl = parameters.apiUrl || "https://smallstack.io/api";
    var apiKey = parameters.apiKey || process.env.SMALLSTACK_API_KEY;

    if (!apiKey) {
        console.info("ERROR: Please provide an API Key");
        console.info("\t* via SMALLSTACK_API_KEY environment variable");
        console.info("\t* via --apiKey parameter\n");
        console.info("If you don't have an api key, please generate one in your profile at https://smallstack.io/profile\n\n");
        return;
    }

    return { url: apiUrl, key: apiKey };
}
