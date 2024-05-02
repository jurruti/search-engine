import React from 'react';
import './Repository.css';
import { Repo} from './types';
import StarIcon from '@mui/icons-material/Star';
import VisibilityIcon from '@mui/icons-material/Visibility';
import ErrorIcon from '@mui/icons-material/Error';


interface RepositoryProps {
  repo: Repo;
}

export const Repository = (props: RepositoryProps) => {
  const {repo} = props;

  const formatNumberToK = (num: number) => {
    if (num < 1000) return num;
    else {
      return num % 1000 === 0 ? `${num / 1000}k` : `${(num / 1000).toFixed(1)}k`;
    }
  }

  return (
    <div className='repository-container'>
        <div id='repository-name'>{repo.name} — <span style={{fontSize: '1.1em', fontWeight: 'lighter'}}>{repo.owner}</span></div>
        {repo.contributors && repo.contributors.length > 0 && 
          <div id='repository-contributors'>
            {repo.contributors?.join(', ')}
          </div>
        }
        <div className='repo-metrics-container'>
          <div className='metric-container'>
            <StarIcon color='warning'/>
            <div>{formatNumberToK(repo.stargazersCount)}</div>
          </div>
          <div className='metric-container'>
            <img id='code-fork-icon' src='./code-fork-icon.png'/>
            <div>{formatNumberToK(repo.forksCount)}</div>
          </div>
          <div className='metric-container'>
            <VisibilityIcon color='action'/>
            <div>{formatNumberToK(repo.watchersCount)}</div>
          </div>
          <div className='metric-container'>
            <ErrorIcon style={{color: '#953232'}}/>
            <div>{formatNumberToK(repo.openIssuesCount)}</div>
          </div>
        </div>
    </div>
  )
}
