import { useEffect, useState } from 'react';

const CORD_TOKEN_LOCALSTORAGE_KEY = 'cord_token';
const CORD_SAMPLE_TOKEN_ENDPOINT = 'https://api.cord.com/sample-token';

const ONE_MINUTE_MS = 60 * 1000;
const ONE_DAY_MS = ONE_MINUTE_MS * 60 * 24;
const SEVEN_DAYS_MS = ONE_DAY_MS * 7;

export function useCordSampleToken_DEMO_ONLY_NOT_FOR_PRODUCTION() {
  const [{ value: cordAuthToken, hasExpired }, setCordAuthToken] = useState<{
    value: string | null;
    hasExpired: boolean;
  }>(() => getLocalStorageItemWithExpiry(CORD_TOKEN_LOCALSTORAGE_KEY));

  useEffect(() => {
    if (!cordAuthToken || hasExpired) {
      void fetchCordSampleToken().then((token) => {
        if (token) {
          localStorage.setItem(
            CORD_TOKEN_LOCALSTORAGE_KEY,
            withExpiry(
              token,
              // Sample token expires after 7 days
              getTimeInXMillisecondsFromNow(SEVEN_DAYS_MS),
            ),
          );
          setCordAuthToken({ value: token, hasExpired: false });
        }
      });
    }
  }, [cordAuthToken, hasExpired]);

  return cordAuthToken;
}

async function fetchCordSampleToken(): Promise<string | null> {
  try {
    const response = await fetch(CORD_SAMPLE_TOKEN_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ extended: 'true' }),
    });

    if (response.status !== 200) {
      throw new Error('Failed to fetch Cord sample token');
    }

    const { client_auth_token } = await response.json();
    return client_auth_token;
  } catch (e) {
    return null;
  }
}

function getLocalStorageItemWithExpiry(key: string) {
  const itemStr = localStorage.getItem(key);
  if (!itemStr) {
    return { value: null, hasExpired: true };
  }

  try {
    const item = JSON.parse(itemStr);
    const isValid = Boolean(item.expiry && item.value);
    if (!isValid) {
      localStorage.removeItem(key);
      return { value: null, hasExpired: true };
    }

    const hasExpired = new Date().getTime() > item.expiry;
    return { value: item.value, hasExpired };
  } catch {
    localStorage.removeItem(key);
    return { value: null, hasExpired: true };
  }
}

export function withExpiry(value: string, expiry: number) {
  const item = {
    value: value,
    expiry,
  };

  return JSON.stringify(item);
}

function getTimeInXMillisecondsFromNow(xMilliseconds: number) {
  return new Date(new Date().getTime() + xMilliseconds).getTime();
}
