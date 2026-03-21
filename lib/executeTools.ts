import usersData from '@/data/users.json'

interface Experience {
  company: string
  title: string
  start: string
  end: string | null
  description: string
}

interface UserProfile {
  id: string
  name: string
  email: string
  location: string
  age: number
  role: string
  summary: string
  skills: string[]
  languages: string[]
  experience: Experience[]
  education: { institution: string; degree: string; year: number }[]
}

const db = usersData as UserProfile[]

function searchUsers(input: Record<string, unknown>): string {
  const { skills, role, location, name, company, limit } = input as {
    skills?: string[]
    role?: string
    location?: string
    name?: string
    company?: string
    limit?: number
  }

  const results = db.filter((user) => {
    if (skills && skills.length > 0) {
      const userSkillsLower = user.skills.map((s) => s.toLowerCase())
      const hasSkill = skills.some((s) =>
        userSkillsLower.some((us) => us.includes(s.toLowerCase())),
      )
      if (!hasSkill) return false
    }
    if (role && !user.role.toLowerCase().includes(role.toLowerCase())) return false
    if (location && !user.location.toLowerCase().includes(location.toLowerCase())) return false
    if (name && !user.name.toLowerCase().includes(name.toLowerCase())) return false
    if (company) {
      const hasCompany = user.experience.some((e) =>
        e.company.toLowerCase().includes(company.toLowerCase()),
      )
      if (!hasCompany) return false
    }
    return true
  })

  const cap = typeof limit === 'number' && limit > 0 ? Math.min(limit, 100) : 10
  const summary = results.slice(0, cap).map((u) => ({
    id: u.id,
    name: u.name,
    role: u.role,
    location: u.location,
    skills: u.skills,
    summary: u.summary,
    currentCompany: u.experience[0]?.company ?? null,
    totalExperiences: u.experience.length,
    education: u.education,
    languages: u.languages,
    experience: u.experience,
  }))

  return JSON.stringify({ found: results.length, results: summary })
}

function filterCandidates(input: Record<string, unknown>): string {
  const { ids } = input as { ids: string[] }
  const results = ids.map((id) => db.find((u) => u.id === id)).filter(Boolean) as UserProfile[]
  const summary = results.map((u) => ({
    id: u.id,
    name: u.name,
    role: u.role,
    location: u.location,
    skills: u.skills,
    summary: u.summary,
    currentCompany: u.experience[0]?.company ?? null,
    totalExperiences: u.experience.length,
    education: u.education,
    languages: u.languages,
    experience: u.experience,
  }))
  return JSON.stringify({ found: results.length, results: summary })
}

function getUser(input: Record<string, unknown>): string {
  const { id } = input as { id: string }
  const user = db.find((u) => u.id === id)
  if (!user) return JSON.stringify({ error: `User ${id} not found` })
  return JSON.stringify(user)
}

export function executeCustomTool(name: string, input: Record<string, unknown>): string {
  switch (name) {
    case 'search_users':
      return searchUsers(input)
    case 'filter_candidates':
      return filterCandidates(input)
    case 'get_user':
      return getUser(input)
    default:
      return JSON.stringify({ error: `Unknown tool: ${name}` })
  }
}
