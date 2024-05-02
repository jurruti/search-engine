require('dotenv').config();
const fetch = require('node-fetch');

const token = process.env.GITHUB_TOKEN;

if (!token) {
  console.error('GitHub token not found. Please set the GITHUB_TOKEN environment variable.');
  process.exit(1);
}

const startDate = '2023-01-01';
const endDate = '2023-01-31';

/**
 * Fetches repositories from GitHub within a specified date range and pages through results.
 * This function utilizes the GitHub Search API to retrieve repositories created in a specified date range.
 *
 * @param {number} page - The page number for pagination. Specifies the current page of the search results.
 * @param {number} repoN - Number of repositories per page. Determines the number of results per page.
 * @returns {Promise<Object[]>} A promise that resolves to an array of repository names and owners.
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
      return {[repo.name]: repo.owner.login};
    };
    return repos.items.map(mapper);
  } catch (error) {
    console.error(error);
    return [];
  }
}

/**
 * Fetches detailed data about a specific GitHub repository.
 * This function retrieves various metrics about the repository including the URL, fork count, open issues count, and others.
 *
 * @param {string} owner - The username of the repository's owner.
 * @param {string} repo - The name of the repository.
 * @returns {Promise<Object>} A promise that resolves to an object containing repository metrics.
 */
async function fetchRepoData(owner, repo) {
  const url = `https://api.github.com/repos/${owner}/${repo}`;
  try {
    const response = await fetch(
      url, {
        method: 'GET',
        headers: {'User-Agent': 'Node.js', 'Authorization': `token ${token}`},
      });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(`GitHub API returned ${response.status} for owner: ${owner} and repo: ${repo}`);
    }
    return {
      repoUrl: data.html_url,
      forksCount: data.forks_count,
      openIssuesCount: data.open_issues_count,
      stargazersCount: data.stargazers_count,
      watchersCount: data.watchers_count,
      content: data.description,
    };
  } catch (error) {
    console.error('Failed to fetch repository metrics:', error);
    throw error;
  }
}

module.exports = {fetchRepos, fetchRepoData};

