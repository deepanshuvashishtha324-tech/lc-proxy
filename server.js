import express from 'express'
import cors from 'cors'
import fetch from 'node-fetch'

const app = express()
const PORT = process.env.PORT || 3001

app.use(cors())
app.use(express.json())

// Health check
app.get('/', (req, res) => {
  res.json({ status: 'ok', message: 'LeetCode Proxy Server running!' })
})

// Fetch user stats (Improved)
app.get('/leetcode/:username', async (req, res) => {
  const { username } = req.params;

  // Helper function to minimize repetition
  const fetchLeetCode = (query, variables) => {
    return fetch('https://leetcode.com/graphql', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0',
        'Referer': 'https://leetcode.com',
      },
      body: JSON.stringify({ query, variables }),
    }).then(r => r.json());
  };

  try {
    // Execute both requests in parallel
    const [statsData, probData] = await Promise.all([
      fetchLeetCode(`
        query getUserProfile($username: String!) {
          matchedUser(username: $username) {
            username
            profile { realName }
            submitStatsGlobal {
              acSubmissionNum { difficulty count }
            }
          }
        }`, { username }),
      fetchLeetCode(`
        query getRecentAcSubmissions($username: String!, $limit: Int!) {
          recentAcSubmissionList(username: $username, limit: $limit) {
            id title titleSlug difficulty
          }
        }`, { username, limit: 100 })
    ]);

    const user = statsData.data?.matchedUser;
    if (!user) return res.status(404).json({ error: 'User not found' });

    const statsArr = user.submitStatsGlobal?.acSubmissionNum || [];
    const easy = statsArr.find(s => s.difficulty === 'Easy')?.count || 0;
    const medium = statsArr.find(s => s.difficulty === 'Medium')?.count || 0;
    const hard = statsArr.find(s => s.difficulty === 'Hard')?.count || 0;

    const problems = probData.data?.recentAcSubmissionList || [];

    res.json({
      username: user.username,
      name: user.profile?.realName || '',
      stats: { easy, medium, hard, total: easy + medium + hard },
      problems: problems.map(p => ({
        id: p.id,
        name: p.title,
        slug: p.titleSlug,
        difficulty: p.difficulty,
      })),
      message: `Found ${problems.length} recent solved problems for @${username}`
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch LeetCode data' });
  }
});
app.listen(PORT, () => {
  console.log(`✅ LeetCode Proxy running on port ${PORT}`)
})
