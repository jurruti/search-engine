require('dotenv').config();
const https = require('https');

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
 * @param {number} startPage - The starting page number for pagination.
 * @param {number} repoN - Number of repositories per page.
 * @param {number} pageN - Number of pages to fetch.
 * @param {Function} callback - Callback function to handle the array of repository information.
 */
function fetchRepos(startPage, repoN, pageN, callback) {
  if (!callback) {
    callback = (repoInfoArray) => {
      console.log(repoInfoArray);
    };
  }
  if (pageN <= 0) {
    return;
  }

  const url = `https://api.github.com/search/repositories?q=created:${startDate}..${endDate}&sort=created&order=asc&per_page=${repoN}&page=${startPage}`;
  httpsGet(url, {'User-Agent': 'Node.js', 'Authorization': `token ${token}`})
      .then((repos) => {
        const repoInfoArray = repos.items.map((repo) => ({
          html_url: repo.html_url,
          owner_login: repo.owner.login,
          name: repo.name,
          // TODO: grab more info useful for metric/index: forks, issues, stars, watchers
        }));

        callback(repoInfoArray);

        if (repos.items.length === repoN) {
          fetchRepos(startPage + 1, repoN, pageN - 1, callback);
        }
      })
      .catch((error) => {
        console.error(error);
      });
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
    const response = await httpsGet(url, {'User-Agent': 'Node.js', 'Authorization': `token ${token}`});
    return Buffer.from(response.content, 'base64').toString('utf8');
  } catch (error) {
    console.error('Failed to fetch README:', error);
    throw error; // Optional: re-throw to allow the caller to handle the error
  }
}


let callback = (repoInfoArray) => {
  console.log(repoInfoArray);
  /** Uncomment the following code to fetch README files for each repository **/
  // repoInfoArray.forEach(async (repoInfo) => {
  //   fetchReadMeFile(repoInfo.owner_login, repoInfo.name)
  //       .then((readme) => {
  //         console.log(readme);
  //       })
  //       .catch((error) => {
  //         console.error(error);
  //       });
  // });
};

// fetchRepos(1, 1, 1, callback);

module.exports = {fetchRepos, fetchReadMeFile};

