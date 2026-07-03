import { useEffect, useState } from 'react';

function App() {
  const [apiStatus, setStatus] = useState<number>();

  useEffect(() => {
    fetch(`${import.meta.env.VITE_API_URL}/health`).then((res) => setStatus(res.status));
  }, []);

  return <div>GET /health {apiStatus} </div>;
}

export default App;
