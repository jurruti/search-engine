export type Repo = {
  name: string,
  url: string,
  trustScore: number,
  relFreq: number,
  forksCount: number,
  openIssuesCount: number,
  stargazersCount: number,
  watchersCount: number,
  contributors?: string[]
  owner?: string,
}

export type SortBy = 'Rel. Freq.' | 'Trust Score' | 'Stars' | 'Forks' | 'Watchers' | 'Issues';