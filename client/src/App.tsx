import { useEffect, useState } from 'react';
import './App.css';
import { Header } from './Header';
import { Repo, SortBy} from './types';
import { Repository } from './Repository';
import TextField from '@mui/material/TextField';
import { executeQuery } from './api-control';
import Select, { SelectChangeEvent } from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import FormHelperText from '@mui/material/FormHelperText';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';


function App() {

  const [sortOrder, setSortOrder] = useState<string>('desc');

  const [sortBy, setSortBy] = useState<SortBy>('Trust Score');

  const [foundRepos, setFoundRepos] = useState<Repo[]>([]);
  const [query, setQuery] = useState<string>('');

  const search = async (e: React.KeyboardEvent<HTMLDivElement>) => {
    const key = e.key;
    if (key === 'Enter') {
      const repos: Repo[] = await executeQuery(query, sortBy, false); // TODO: Remove second parameter for non-mock data
      if (repos && repos.length > 0){
        setFoundRepos(repos);
      }
    }
  }

  const onSearchInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setQuery(e.target.value);
  }

  const handleSearchByChange = (e: SelectChangeEvent) => {
    setSortBy(e.target.value as SortBy);
  }

  const toggleSortOrder = () => {
    console.error(sortOrder);
    if (sortOrder === 'asc'){
      setSortOrder('desc')
    } else {
      setSortOrder('asc');
    }
  }


  useEffect(() => {
    const sortedRepos = foundRepos.slice(); // Create a shallow copy to avoid mutating the original state directly
  
    // General comparator for various sort types
    const getComparator = (key: keyof Repo, order = 'asc') => {
      return (a: Repo, b: Repo) => {
        const aValue = a[key];
        const bValue = b[key];
    
        if (aValue === undefined && bValue === undefined) {
          return 0; 
        } else if (aValue === undefined) {
          return order === 'asc' ? 1 : -1;
        } else if (bValue === undefined) {
          return order === 'asc' ? -1 : 1; 
        }
    
        if (aValue < bValue) {
          return order === 'asc' ? -1 : 1;
        } else if (aValue > bValue) {
          return order === 'asc' ? 1 : -1;
        } else {
          return 0;
        }
      };
    };
  
    const sortKeyMap: {[key in SortBy]: keyof Repo} = {
      'Rel. Freq.': 'relFreq',
      'Trust Score': 'trustScore',
      'Stars': 'stargazersCount',
      'Forks': 'forksCount',
      'Watchers': 'watchersCount',
      'Issues': 'openIssuesCount'
    };
  
    if (sortKeyMap[sortBy]) {
      sortedRepos.sort(getComparator(sortKeyMap[sortBy], sortOrder));
    }
  
    setFoundRepos(sortedRepos);
  }, [sortBy, sortOrder, foundRepos]);

  return (
    <div className="App">
      <div className='app-container'>
        <Header/>
        <div className='searchbar-container'>
          <TextField
            onKeyDown={(e) => search(e)}
            onChange={(e) => onSearchInputChange(e)}
            value={query}
            autoComplete='off'
            placeholder='Search for one or more terms...'
            variant='outlined'
            style={{width: '80%', marginTop: '16px'}}
            />
          <div className='dropdown-container'>
            <div>Sort By</div>
            <Select
              id="sort-by-select"
              value={sortBy}
              onChange={handleSearchByChange}
              label='sortBy'
            >
              <MenuItem value='Rel. Freq.'>Rel. Freq.</MenuItem>
              <MenuItem value='Trust Score'>Trust Score</MenuItem>
              <MenuItem value='Stars'>Stars</MenuItem>
              <MenuItem value='Forks'>Forks</MenuItem>
              <MenuItem value='Watchers'>Watchers</MenuItem>
              <MenuItem value='Issues'>Issues</MenuItem>
            </Select>
          </div>
          <div 
            className='sort-order-container' 
            onClick={() => toggleSortOrder()}>
              {sortOrder === 'asc' ? 
                <KeyboardArrowUpIcon fontSize='large'/> :
                <KeyboardArrowDownIcon fontSize='large'/>
              }
            </div>
        </div>
        {foundRepos.length > 0 && 
          <table className='repository-table'>
          <tr className='table-header-row'>
            <th>REPOSITORY INFO</th>
            <th>TRUST SCORE</th>
            <th>REL FREQ</th>
          </tr>
          {foundRepos.map((repo, idx) => (
            <tr key={idx} className='repo-row'>
              <a href={repo.url} target="_blank" style={{textDecoration: 'none', color: 'unset'}}>
                <td><Repository key={idx} repo={repo}/></td>
              </a>
              <td id='repo-score'>{repo.trustScore}</td>
              <td id='repo-score'>{repo.relFreq}</td>
            </tr>
          ))}
        </table>
        }
      </div>
      
    </div>
  );
}

export default App;
