/** Prevent the standard production command from promoting an isolated security pilot. */
console.error('Deployment paused: the team-scope / attention pilot has not been approved for production.');
console.error('Keep the published private Site and its 24-hour policy unchanged.');
console.error('Requires reviewed SQL, real role/RLS/concurrency acceptance, explicit account mapping, and an authorized rollout.');
process.exitCode = 1;
