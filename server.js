import express from 'express'
import cors from 'cors'
import fetch from 'node-fetch'

const app = express()
const PORT = process.env.PORT || 3001

app.use(cors())
app.use(express.json())

// ── Health check
app.get('/', (req, res) => {
  res.json({ status: 'ok', message: 'LeetCode Proxy Server running!' })
})

// ── Fetch user stats + all solved problems
app.get('/leetcode/:username', async (req, res) => {
  const { username } = req.params
  const limit = parseInt(req.query.limit) || 100

  try {
    // Step 1: Get user stats
    const statsRes = await fetch('https://leetcode.com/graphql', {
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

    const statsData = await statsRes.json()
    if (!statsData.data?.matchedUser) {
      return res.status(404).json({ error: 'User not found on LeetCode' })
    }

    const user = statsData.data.matchedUser
    const statsArr = user.submitStatsGlobal?.acSubmissionNum || []
    const easy   = statsArr.find(s => s.difficulty === 'Easy')?.count   || 0
    const medium = statsArr.find(s => s.difficulty === 'Medium')?.count || 0
    const hard   = statsArr.find(s => s.difficulty === 'Hard')?.count   || 0
    const total  = easy + medium + hard

    // Step 2: Fetch all solved problems via pagination
    const allProblems = []
    const seen = new Set()
    let offset = 0
    const PAGE_SIZE = 20

    while (offset <= total) {
      const probRes = await fetch('https://leetcode.com/graphql', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Mozilla/5.0',
          'Referer': 'https://leetcode.com',
        },
        body: JSON.stringify({
          query: `
            query getSubmissions($username: String!, $limit: Int!) {
              recentAcSubmissionList(username: $username, limit: $limit) {
                id title titleSlug difficulty
              }
            }
          `,
          variables: { username, limit: PAGE_SIZE }
        })
      })

      const probData = await probRes.json()
      const batch = probData.data?.recentAcSubmissionList || []
      if (!batch.length) break

      batch.forEach(p => {
        if (!seen.has(p.titleSlug)) {
          seen.add(p.titleSlug)
          allProblems.push({
            id: p.id,
            name: p.title,
            slug: p.titleSlug,
            difficulty: p.difficulty,
          })
        }
      })

      if (batch.length < PAGE_SIZE) break
      offset += batch.length

      // Small delay to avoid rate limiting
      await new Promise(r => setTimeout(r, 200))
    }

    res.json({
      username: user.username,
      name: user.profile?.realName || '',
      stats: { easy, medium, hard, total },
      problems: allProblems,
    })

  } catch (err) {
    console.error('Error:', err)
    res.status(500).json({ error: 'Failed to fetch LeetCode data', details: err.message })
  }
})

app.listen(PORT, () => {
  console.log(`✅ LeetCode Proxy running on port ${PORT}`)
})
