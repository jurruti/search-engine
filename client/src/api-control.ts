import { Repo, SortBy } from "./types";

const PORT = 7000;

const mockRepos: Repo[] = [
  {
    name: 'stable-diffusion-web-ui',
    url: 'https://github.com/apple/ml-stable-diffusion',
    trustScore: parseFloat(Math.log(((146*5) + (24900*5) + 1300000 + 1100 + 1)).toFixed(2)),
    relFreq: 0.021, 
    forksCount: 24900,
    openIssuesCount: 146,
    stargazersCount: 130000,
    watchersCount: 1100,
    contributors: ['AUTOMATIC111', 'w-e-w', 'dfaker'],
    owner: 'AUTOMATIC111'
  },
  {
    name: 'stable-diffusion',
    url: 'https://github.com/CompVis/stable-diffusion',
    trustScore: parseFloat(Math.log(((505*5) + (9800*5) + 65400 + 552 + 1)).toFixed(2)),
    relFreq: 0.033, 
    forksCount: 9800,
    openIssuesCount: 505,
    stargazersCount: 65400,
    watchersCount: 552,
    contributors: ['rromb', 'pesser', 'ablatmann'],
    owner: 'CompVis'
  },
  {
    name: 'generative-models',
    url: 'www.github.com/sample',
    trustScore: parseFloat(Math.log(((215*5) + (2400*5) + 22300 + 234 + 1)).toFixed(2)),
    relFreq: 0.031, 
    forksCount: 2400,
    openIssuesCount: 215,
    stargazersCount: 22300,
    watchersCount: 234,
    contributors: ['timudk', 'akx', 'benjaminaubin'],
    owner: 'StabilityAI'
  },
  {
    name: 'ml-stable-diffusion',
    url: 'https://github.com/apple/ml-stable-diffusion',
    trustScore: parseFloat(Math.log(((146*5) + (861*5) + 16100 + 134 + 1)).toFixed(2)),
    relFreq: 0.106, 
    forksCount: 861,
    openIssuesCount: 146,
    stargazersCount: 16100,
    watchersCount: 134,
    contributors: ['atiorh', 'pcuenca', 'vzsg'],
    owner: 'apple'
  },

]


export async function executeQuery(input: string, sortBy: SortBy, mockData = false): Promise<Repo[]> {
  if (mockData) return mockRepos;
  const API_ENDPOINT = `https://127.0.0.1:8081?q=${input}`; // change later

  const response = await fetch(API_ENDPOINT);

  console.error("reponse: ", response)
  const data: Repo[] = await response.json();

  return data;
}