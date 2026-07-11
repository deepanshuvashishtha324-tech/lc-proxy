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
  const { username } = req.params

  try {
    const response = await fetch('https://leetcode.com/graphql', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0',
        'Referer': 'https://leetcode.com',
      },
      body: JSON.stringify({
        query: `
          query getUserProfile($username: String!) {
            matchedUser(username: $username) {
              username
              profile { realName }
              submitStatsGlobal {
                acSubmissionNum { difficulty count }
              }
            }
          }
        `,
        variables: { username }
      })
    })

    const data = await response.json()
    const user = data.data?.matchedUser

    if (!user) {
      return res.status(404).json({ error: 'User not found on LeetCode' })
    }

    const statsArr = user.submitStatsGlobal?.acSubmissionNum || []
    const easy   = statsArr.find(s => s.difficulty === 'Easy')?.count   || 0
    const medium = statsArr.find(s => s.difficulty === 'Medium')?.count || 0
    const hard   = statsArr.find(s => s.difficulty === 'Hard')?.count   || 0
    const total  = easy + medium + hard

    res.json({
      username: user.username,
      name: user.profile?.realName || '',
      stats: { easy, medium, hard, total },
      problems: [],           // Later we can add full list
      message: `Found \( {total} solved problems for @ \){username}`
    })

  } catch (err) {
    console.error('Error:', err)
    res.status(500).json({ error: 'Failed to fetch LeetCode data' })
  }
})

app.listen(PORT, () => {
  console.log(`✅ LeetCode Proxy running on port ${PORT}`)
})