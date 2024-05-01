import { Repo, SortBy } from "./types";

const PORT = 7000;

const mockRepos: Repo[] = [
  {
    name: 'stable-diffusion-web-ui',
    url: 'www.github.com/sample',
    trustScore: 0.981,
    relFreq: 0.021, 
    forksCount: 24900,
    openIssuesCount: 2,
    stargazersCount: 130000,
    watchersCount: 1100,
    contributors: ['AUTOMATIC111', 'w-e-w', 'dfaker'],
    owner: 'AUTOMATIC111'
  },
  {
    name: 'stable-diffusion',
    url: 'www.github.com/sample',
    trustScore: 0.951,
    relFreq: 0.033, 
    forksCount: 9800,
    openIssuesCount: 4,
    stargazersCount: 65400,
    watchersCount: 552,
    contributors: ['rromb', 'pesser', 'ablatmann'],
    owner: 'CompVis'
  },
  {
    name: 'generative-models',
    url: 'www.github.com/sample',
    trustScore: 0.922,
    relFreq: 0.031, 
    forksCount: 2400,
    openIssuesCount: 8,
    stargazersCount: 22300,
    watchersCount: 234,
    contributors: ['timudk', 'akx', 'benjaminaubin'],
    owner: 'StabilityAI'
  },
  {
    name: 'ml-stable-diffusion',
    url: 'www.github.com/sample',
    trustScore: 0.840,
    relFreq: 0.106, 
    forksCount: 860,
    openIssuesCount: 12,
    stargazersCount: 16100,
    watchersCount: 134,
    contributors: ['atiorh', 'pcuenca', 'vzsg'],
    owner: 'apple'
  },
  {
    name: 'stable-diffusion-web-ui',
    url: 'www.github.com/sample',
    trustScore: 0.981,
    relFreq: 0.021, 
    forksCount: 24900,
    openIssuesCount: 2,
    stargazersCount: 130000,
    watchersCount: 1100,
    contributors: ['AUTOMATIC111', 'w-e-w', 'dfaker'],
    owner: 'AUTOMATIC111'
  },
  {
    name: 'stable-diffusion',
    url: 'www.github.com/sample',
    trustScore: 0.951,
    relFreq: 0.033, 
    forksCount: 9800,
    openIssuesCount: 4,
    stargazersCount: 65400,
    watchersCount: 552,
    contributors: ['rromb', 'pesser', 'ablatmann'],
    owner: 'CompVis'
  },
  {
    name: 'generative-models',
    url: 'www.github.com/sample',
    trustScore: 0.922,
    relFreq: 0.031, 
    forksCount: 2400,
    openIssuesCount: 8,
    stargazersCount: 22300,
    watchersCount: 234,
    contributors: ['timudk', 'akx', 'benjaminaubin'],
    owner: 'StabilityAI'
  },
  {
    name: 'ml-stable-diffusion',
    url: 'www.github.com/sample',
    trustScore: 0.840,
    relFreq: 0.106, 
    forksCount: 860,
    openIssuesCount: 12,
    stargazersCount: 16100,
    watchersCount: 134,
    contributors: ['atiorh', 'pcuenca', 'vzsg'],
    owner: 'apple'
  },
]


export async function executeQuery(input: string, sortBy: SortBy, mockData = false): Promise<Repo[]> {
  if (mockData) return mockRepos;
  const API_ENDPOINT = `http://localhost:${PORT}/query?q=${input}&sortBy=${sortBy}`; // change later

  const response = await fetch(API_ENDPOINT);
  const data: Repo[] = await response.json();

  return data;
}