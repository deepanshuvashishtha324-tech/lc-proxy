import express from 'express'
import cors from 'cors'
import fetch from 'node-fetch'

const app = express()
const PORT = process.env.PORT || 3001

app.use(cors())
app.use(express.json())

app.get('/', (req, res) => {
  res.json({ status: 'ok', message: 'LeetCode Proxy Server running!' })
})

const LC_HEADERS = (session, csrf) => ({
  'Content-Type': 'application/json',
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
  'Referer': 'https://leetcode.com',
  'Origin': 'https://leetcode.com',
  'Cookie': `LEETCODE_SESSION=${session}; csrftoken=${csrf}`,
  'x-csrftoken': csrf,
})

// ── Public stats (no auth)
app.get('/leetcode/stats/:username', async (req, res) => {
  const { username } = req.params
  try {
    const data = await fetch('https://leetcode.com/graphql', {
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
    }).then(r => r.json())

    if (!data.data?.matchedUser) {
      return res.status(404).json({ error: 'User not found' })
    }

    const user = data.data.matchedUser
    const statsArr = user.submitStatsGlobal?.acSubmissionNum || []
    const easy   = statsArr.find(s => s.difficulty === 'Easy')?.count   || 0
    const medium = statsArr.find(s => s.difficulty === 'Medium')?.count || 0
    const hard   = statsArr.find(s => s.difficulty === 'Hard')?.count   || 0

    res.json({
      username: user.username,
      name: user.profile?.realName || '',
      stats: { easy, medium, hard, total: easy + medium + hard }
    })
  } catch(e) {
    res.status(500).json({ error: e.message })
  }
})

// ── Cookie-based: fetch ALL solved problems
app.post('/leetcode/all-problems', async (req, res) => {
  const { session, csrf } = req.body

  if (!session || !csrf) {
    return res.status(400).json({ error: 'LEETCODE_SESSION and csrftoken required' })
  }

  try {
    const allProblems = []
    const seen = new Set()
    let skip = 0
    const limit = 100
    let total = 9999

    while (skip < total) {
      const data = await fetch('https://leetcode.com/graphql', {
        method: 'POST',
        headers: LC_HEADERS(session, csrf),
        body: JSON.stringify({
          query: `
            query problemsetQuestionList($skip: Int!, $limit: Int!) {
              problemsetQuestionList: questionList(
                categorySlug: ""
                limit: $limit
                skip: $skip
                filters: { status: AC }
              ) {
                total: totalNum
                questions: data {
                  title
                  titleSlug
                  difficulty
                }
              }
            }
          `,
          variables: { skip, limit }
        })
      }).then(r => r.json())

      const result = data.data?.problemsetQuestionList
      if (!result) {
        console.log('No result:', JSON.stringify(data).slice(0,200))
        break
      }

      total = result.total || 0
      const questions = result.questions || []
      if (!questions.length) break

      questions.forEach(q => {
        if (!seen.has(q.titleSlug)) {
          seen.add(q.titleSlug)
          allProblems.push({
            id: q.titleSlug,
            name: q.title,
            slug: q.titleSlug,
            difficulty: q.difficulty || 'Medium',
          })
        }
      })

      console.log(`Fetched ${allProblems.length}/${total}`)
      skip += limit
      if (questions.length < limit) break
      await new Promise(r => setTimeout(r, 300))
    }

    res.json({ problems: allProblems, total: allProblems.length })
  } catch(e) {
    console.error(e)
    res.status(500).json({ error: e.message })
  }
})

// ── Old endpoint (backward compat - no cookie)
app.get('/leetcode/:username', async (req, res) => {
  const { username } = req.params
  try {
    const data = await fetch('https://leetcode.com/graphql', {
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
    }).then(r => r.json())

    const user = data.data?.matchedUser
    if (!user) return res.status(404).json({ error: 'User not found' })

    const statsArr = user.submitStatsGlobal?.acSubmissionNum || []
    const easy   = statsArr.find(s => s.difficulty === 'Easy')?.count   || 0
    const medium = statsArr.find(s => s.difficulty === 'Medium')?.count || 0
    const hard   = statsArr.find(s => s.difficulty === 'Hard')?.count   || 0

    // Try to get recent problems (max 20 without auth)
    const probData = await fetch('https://leetcode.com/graphql', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0',
        'Referer': 'https://leetcode.com',
      },
      body: JSON.stringify({
        query: `
          query ($username: String!, $limit: Int!) {
            recentAcSubmissionList(username: $username, limit: $limit) {
              id title titleSlug
            }
          }
        `,
        variables: { username, limit: 20 }
      })
    }).then(r => r.json())

    const recent = probData.data?.recentAcSubmissionList || []
    const seen = new Set()
    const problems = recent
      .filter(p => { if(seen.has(p.titleSlug)){return false} seen.add(p.titleSlug); return true })
      .map(p => ({ id: p.id, name: p.title, slug: p.titleSlug, difficulty: 'Medium' }))

    res.json({
      username: user.username,
      name: user.profile?.realName || '',
      stats: { easy, medium, hard, total: easy+medium+hard },
      problems,
    })
  } catch(e) {
    res.status(500).json({ error: e.message })
  }
})

app.listen(PORT, () => {
  console.log(`LeetCode Proxy running on port ${PORT}`)
})