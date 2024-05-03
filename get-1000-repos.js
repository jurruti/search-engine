const axios = require('axios');

// Function to fetch GitHub repository links
async function fetchGitHubRepoLinks() {
    try {
        const totalCount = 1000; // Total number of repositories to fetch
        const perPage = 100; // Number of repositories per page (max 100)

        let repoLinks = [];
        let page = 1;
        let fetchedCount = 0;

        // Fetch repositories until the desired number of links is reached
        while (fetchedCount < totalCount) {
            const response = await axios.get(`https://api.github.com/repositories?per_page=${perPage}&page=${page}`);

            // Extract repository links from the response
            const repos = response.data.map(repo => repo.html_url);
            
            // Add fetched repository links to the result array
            repoLinks = repoLinks.concat(repos);

            fetchedCount += repos.length;
            page++;

            // Wait for a short interval to avoid hitting API rate limits
            await new Promise(resolve => setTimeout(resolve, 1000));
        }

        return repoLinks.slice(0, totalCount); // Return only the desired number of links
    } catch (error) {
        console.error('Error fetching GitHub repositories:', error);
        return []; // Return an empty array in case of an error
    }
}

// Usage example
fetchGitHubRepoLinks()
    .then(repoLinks => {
        console.log('Fetched GitHub repository links:', repoLinks);
    })
    .catch(error => {
        console.error('Error:', error);
    });