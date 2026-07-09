const BASE_URL = import.meta.env.VITE_API_URL

const apiFetch = async (endpoint, options = {}) => {
  const token = localStorage.getItem('token')

  const res = await fetch(`${BASE_URL}${endpoint}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
    },
    ...options,
  })

  const data = await res.json()

  if (!res.ok) throw new Error(data.message || 'Something went wrong')

  return data
}

export default apiFetch