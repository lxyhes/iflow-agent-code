// hooks/useVersionCheck.js
import { useState, useEffect } from 'react';
import { version } from '../../package.json';

const CACHE_KEY = 'iflow_agent_version_check';
const CACHE_DURATION = 60 * 60 * 1000; // 1 hour

export const useVersionCheck = (owner, repo) => {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [latestVersion, setLatestVersion] = useState(null);
  const [releaseInfo, setReleaseInfo] = useState(null);

  useEffect(() => {
    const checkVersion = async () => {
      // Check cache first
      try {
        const cached = localStorage.getItem(CACHE_KEY);
        if (cached) {
          const { timestamp, data } = JSON.parse(cached);
          const age = Date.now() - timestamp;
          
          if (age < CACHE_DURATION) {
            // Use cached data if available and valid
            if (data && data.tag_name) {
               const latest = data.tag_name.replace(/^v/, '');
               setLatestVersion(latest);
               setUpdateAvailable(version !== latest);
               
               let title = data.name || data.tag_name;
               // Rebrand: Replace "Claude Code UI" with "IFlow Agent"
               title = title.replace(/Claude Code UI/g, 'IFlow Agent');

               setReleaseInfo({
                 title: title,
                 body: data.body || '',
                 htmlUrl: data.html_url || `https://github.com/${owner}/${repo}/releases/latest`,
                 publishedAt: data.published_at
               });
            }
            return; // Exit early, use cached state or initial default
          }
        }
      } catch (e) {
        // Ignore cache errors
      }

      try {
        const response = await fetch(`https://api.github.com/repos/${owner}/${repo}/releases/latest`);
        
        if (!response.ok) {
          if (response.status === 403) {
            console.warn('GitHub API rate limit exceeded for version check. Backing off.');
            // Backoff: set cache timestamp to now to avoid retrying immediately
            localStorage.setItem(CACHE_KEY, JSON.stringify({ timestamp: Date.now(), data: null }));
          } else {
            console.warn(`Version check failed: ${response.status} ${response.statusText}`);
          }
          setUpdateAvailable(false);
          return;
        }

        const data = await response.json();

        // Save to cache
        localStorage.setItem(CACHE_KEY, JSON.stringify({ timestamp: Date.now(), data }));

        // Handle the case where there might not be any releases
        if (data.tag_name) {
          const latest = data.tag_name.replace(/^v/, '');
          setLatestVersion(latest);
          setUpdateAvailable(version !== latest);

          // Store release information
          setReleaseInfo({
            title: data.name || data.tag_name,
            body: data.body || '',
            htmlUrl: data.html_url || `https://github.com/${owner}/${repo}/releases/latest`,
            publishedAt: data.published_at
          });
        } else {
          // No releases found
          setUpdateAvailable(false);
          setLatestVersion(null);
          setReleaseInfo(null);
        }
      } catch (error) {
        console.warn('Version check failed:', error);
        setUpdateAvailable(false);
        setLatestVersion(null);
        setReleaseInfo(null);
      }
    };

    checkVersion();
    const interval = setInterval(checkVersion, CACHE_DURATION); // Check every hour
    return () => clearInterval(interval);
  }, [owner, repo]);

  return { updateAvailable, latestVersion, currentVersion: version, releaseInfo };
};