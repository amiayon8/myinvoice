async function run() {
  const res = await fetch('https://tjqnvnbusuiizxjebayp.supabase.co/rest/v1/', {
    headers: {
      'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRqcW52bmJ1c3VpaXp4amViYXlwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NzMwOTEzNiwiZXhwIjoyMDYyODg1MTM2fQ.qZonccywhOGlhv7OyACIGNEZgKS2N-gTFF0Rp0INjN8'
    }
  });
  const spec = await res.json();
  console.log('RPC Paths:', Object.keys(spec.paths || {}).filter(p => p.startsWith('/rpc/')));
}
run();
