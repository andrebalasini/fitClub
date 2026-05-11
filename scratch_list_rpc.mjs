async function check() {
    try {
        const url = 'https://fafisurbnecapdpguudb.supabase.co/rest/v1/?apikey=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZhZmlzdXJibmVjYXBkcGd1dWRiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMxNzY1ODUsImV4cCI6MjA4ODc1MjU4NX0.5oNxGkTGfOPk8FZV3bIT2wFzsu5KMiys1lGUH8gzJgk';
        const resp = await fetch(url);
        const data = await resp.json();
        
        const paths = Object.keys(data.paths || {});
        const functions = paths.filter(p => p.startsWith('/rpc/'));
        
        console.log("Available RPC functions:", functions);
    } catch (e) {
        console.error(e);
    }
}
check();
