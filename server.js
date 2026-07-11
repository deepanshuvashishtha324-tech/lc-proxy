import express from 'express'
import cors from 'cors'
import fetch from 'node-fetch'

const app = express()
const PORT = process.env.PORT || 3001

app.use(cors())
app.use(express.json())

<<<<<<< HEAD
// Health check
=======
>>>>>>> 36b78310fe88843401a66d7d478586881016e5d8
app.get('/', (req, res) => {
  res.json({ status: 'ok', message: 'LeetCode Proxy Server running!' })
})

<<<<<<< HEAD
// Fetch user stats (Improved)
=======
>>>>>>> 36b78310fe88843401a66d7d478586881016e5d8
app.get('/leetcode/:username', async (req, res) => {
  const { username } = req.params

  try {
<<<<<<< HEAD
    const response = await fetch('https://leetcode.com/graphql', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0',
        'Referer': 'https://leetcode.com',
=======
    // Step 1: Get user stats
    const statsRes = await fetch('https://leetcode.com/graphql', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Referer': 'https://leetcode.com',
        'Origin': 'https://leetcode.com',
>>>>>>> 36b78310fe88843401a66d7d478586881016e5d8
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

<<<<<<< HEAD
    const data = await response.json()
    const user = data.data?.matchedUser

    if (!user) {
      return res.status(404).json({ error: 'User not found on LeetCode' })
    }

=======
    const statsData = await statsRes.json()

    if (!statsData.data?.matchedUser) {
      return res.status(404).json({ error: 'User not found on LeetCode' })
    }

    const user = statsData.data.matchedUser
>>>>>>> 36b78310fe88843401a66d7d478586881016e5d8
    const statsArr = user.submitStatsGlobal?.acSubmissionNum || []
    const easy   = statsArr.find(s => s.difficulty === 'Easy')?.count   || 0
    const medium = statsArr.find(s => s.difficulty === 'Medium')?.count || 0
    const hard   = statsArr.find(s => s.difficulty === 'Hard')?.count   || 0
<<<<<<< HEAD
    const total  = easy + medium + hard
=======

    // Step 2: Fetch problems — use limit 50 (max allowed by LeetCode)
    const probRes = await fetch('https://leetcode.com/graphql', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Referer': 'https://leetcode.com',
        'Origin': 'https://leetcode.com',
      },
      body: JSON.stringify({
        query: `
          query recentAcSubmissions($username: String!, $limit: Int!) {
            recentAcSubmissionList(username: $username, limit: $limit) {
              id
              title
              titleSlug
              difficulty: _difficulty
            }
          }
        `,
        variables: { username, limit: 50 }
      })
    })

    const probData = await probRes.json()
    console.log('probData:', JSON.stringify(probData).slice(0, 500))

    // Try alternate query if first fails
    let problems = probData.data?.recentAcSubmissionList || []

    if (problems.length === 0) {
      // Try without difficulty field
      const altRes = await fetch('https://leetcode.com/graphql', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Referer': 'https://leetcode.com',
          'Origin': 'https://leetcode.com',
        },
        body: JSON.stringify({
          query: `
            query recentAcSubmissions($username: String!, $limit: Int!) {
              recentAcSubmissionList(username: $username, limit: $limit) {
                id
                title
                titleSlug
              }
            }
          `,
          variables: { username, limit: 50 }
        })
      })
      const altData = await altRes.json()
      console.log('altData:', JSON.stringify(altData).slice(0, 500))
      problems = altData.data?.recentAcSubmissionList || []
    }

    // Deduplicate by titleSlug
    const seen = new Set()
    const uniqueProblems = []
    for (const p of problems) {
      if (!seen.has(p.titleSlug)) {
        seen.add(p.titleSlug)
        uniqueProblems.push({
          id: p.id,
          name: p.title,
          slug: p.titleSlug,
          difficulty: p.difficulty || p.topicTags?.[0] || 'Medium',
        })
      }
    }
>>>>>>> 36b78310fe88843401a66d7d478586881016e5d8

    res.json({
      username: user.username,
      name: user.profile?.realName || '',
<<<<<<< HEAD
      stats: { easy, medium, hard, total },
      problems: [],           // Later we can add full list
      message: `Found \( {total} solved problems for @ \){username}`
=======
      stats: { easy, medium, hard, total: easy + medium + hard },
      problems: uniqueProblems,
>>>>>>> 36b78310fe88843401a66d7d478586881016e5d8
    })

  } catch (err) {
    console.error('Error:', err)
<<<<<<< HEAD
    res.status(500).json({ error: 'Failed to fetch LeetCode data' })
=======
    res.status(500).json({ error: 'Failed to fetch', details: err.message })
>>>>>>> 36b78310fe88843401a66d7d478586881016e5d8
  }
})

app.listen(PORT, () => {
<<<<<<< HEAD
  console.log(`✅ LeetCode Proxy running on port ${PORT}`)
})
=======
  console.log(`LeetCode Proxy running on port ${PORT}`)
})
>>>>>>> 36b78310fe88843401a66d7d478586881016e5d8
