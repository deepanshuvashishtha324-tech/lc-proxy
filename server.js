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
    // Get User Stats
    const statsRes = await fetch('https://leetcode.com/graphql', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'User-Agent': 'Mozilla/5.0' },
      body: JSON.stringify({
        query: `query getUserProfile($username: String!) {
          matchedUser(username: $username) {
            username profile { realName }
            submitStatsGlobal { acSubmissionNum { difficulty count } }
          }
        }`,
        variables: { username }
      })
    })

    const statsData = await statsRes.json()
    const user = statsData.data?.matchedUser
    if (!user) return res.status(404).json({ error: 'User not found' })

    const statsArr = user.submitStatsGlobal?.acSubmissionNum || []
    const easy = statsArr.find(s => s.difficulty === 'Easy')?.count || 0
    const medium = statsArr.find(s => s.difficulty === 'Medium')?.count || 0
    const hard = statsArr.find(s => s.difficulty === 'Hard')?.count || 0
    const total = easy + medium + hard

    // Pagination + All Problems
    const allProblems = []
    let offset = 0
    const PAGE_SIZE = 100

    while (true) {
      const probRes = await fetch('https://leetcode.com/graphql', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'User-Agent': 'Mozilla/5.0' },
        body: JSON.stringify({
          query: `query problemsetQuestionList($limit: Int!, $offset: Int!) {
            problemsetQuestionList(limit: $limit, offset: $offset) {
              questions { title titleSlug difficulty }
            }
          }`,
          variables: { limit: PAGE_SIZE, offset }
        })
      })

      const data = await probRes.json()
      const questions = data.data?.problemsetQuestionList?.questions || []

      if (!questions.length) break

      questions.forEach(q => {
        allProblems.push({
          name: q.title,
          slug: q.titleSlug,
          difficulty: q.difficulty
        })
      })

      if (questions.length < PAGE_SIZE) break
      offset += PAGE_SIZE

      await new Promise(r => setTimeout(r, 300)) // Avoid rate limit
    }

    res.json({
      username: user.username,
      name: user.profile?.realName || '',
      stats: { easy, medium, hard, total },
      problems: allProblems,
     message: `Found ${allProblems.length} problems for @${username}`
    })

  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Failed to fetch data' })
  }
})
app.listen(PORT, () => {
  console.log(`✅ LeetCode Proxy running on port ${PORT}`)
})
