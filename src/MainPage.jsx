import { useState, useEffect } from 'react';
import './MainPage.css';

const MainPage = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const response = await fetch('https://sandkittens.me');
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const result = await response.json();
        setData(result);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="main-page">
        <div className="loading">Loading...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="main-page">
        <div className="error">Error: {error}</div>
      </div>
    );
  }

  return (
    <div className="main-page">
      <h1>API Response from sandkittens.me</h1>
      <div className="data-container">
        <div className="data-item">
          <strong>ID:</strong> {data?.id}
        </div>
        <div className="data-item">
          <strong>Name:</strong> {data?.name}
        </div>
        <div className="data-item">
          <strong>Description:</strong> {data?.description}
        </div>
      </div>
      <div className="raw-data">
        <h3>Raw JSON Response:</h3>
        <pre>{JSON.stringify(data, null, 2)}</pre>
      </div>
    </div>
  );
};

export default MainPage;