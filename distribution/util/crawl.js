require('dotenv').config();
const fetch = require('node-fetch');

/**
 * Performs a GET request to the specified URL with the provided headers.
 *
 * @param {string} url - The URL to send the GET request to.
 * @param {Object} headers - HTTP headers to include in the request.
 * @return {Promise<Object>} - A promise that resolves with the parsed JSON response.
 */
function httpsGet(url, headers) {
  return new Promise((resolve, reject) => {
    const options = {headers};
    https.get(url, options, (resp) => {
      let data = '';
      resp.on('data', (chunk) => {
        data += chunk;
      });
      resp.on('end', () => {
        resolve(JSON.parse(data));
      });
    }).on('error', (err) => {
      reject(err);
    });
  });
}

const token = process.env.GITHUB_TOKEN;

if (!token) {
  console.error('GitHub token not found. Please set the GITHUB_TOKEN environment variable.');
  process.exit(1);
}

const startDate = '2023-01-01';
const endDate = '2023-01-31';

/**
 * Fetches repositories from GitHub within a specified date range and pages through results.
 *
 * @param {number} page - The page number for pagination.
 * @param {number} repoN - Number of repositories per page.
 */
async function fetchRepos(page, repoN) {
  const url = `https://api.github.com/search/repositories?q=created:${startDate}..${endDate}&sort=created&order=asc&per_page=${repoN}&page=${page}`;
  try {
    const response = await fetch(url, {
      headers: {'User-Agent': 'Node.js', 'Authorization': `token ${token}`},
    });
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }
    const repos = await response.json();
    let mapper = (repo) => {
      let repoInfo = {
        repoUrl: repo.html_url,
        ownerLogin: repo.owner.login,
        repoName: repo.name,
        forksCount: repo.forks_count,
        openIssuesCount: repo.open_issues_count,
        stargazersCount: repo.stargazers_count,
        watchersCount: repo.watchers_count,
      };
      return {[repo.name]: repoInfo};
    };
    return repos.items.map(mapper);
  } catch (error) {
    console.error(error);
    return [];
  }
}


/**
 * Fetches the README file for a given GitHub repository.
 *
 * @param {string} owner - GitHub username of the repository owner.
 * @param {string} repo - Repository name.
 * @return {Promise<string>} - A promise that resolves with the README file content.
 */
async function fetchReadMeFile(owner, repo) {
  const url = `https://api.github.com/repos/${owner}/${repo}/contents/README.md`;
  try {
    const response = await httpsGet(
        url, {'User-Agent': 'Node.js', 'Authorization': `token ${token}`});
    if (!response.content) {
      return '';
    }
    return Buffer.from(response.content, 'base64').toString('utf8');
  } catch (error) {
    console.error('Failed to fetch README:', error);
    throw error; // Optional: re-throw to allow the caller to handle the error
  }
}

async function fetchRepoDescription(owner, repo) {
  const url = `https://api.github.com/repos/${owner}/${repo}`;
  try {
    const response = await fetch(
      url, {
        method: 'GET',
        headers: {'User-Agent': 'Node.js', 'Authorization': `token ${token}`},
      });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(`GitHub API returned ${response.status}: ${data.message}`);
    }
    return data.description; // This contains the "About" section of the repository
  } catch (error) {
    console.error('Failed to fetch repository description:', error);
    throw error; // Optional: re-throw to allow the caller to handle the error
  }
}


module.exports = {fetchRepos, fetchReadMeFile, fetchRepoDescription};

