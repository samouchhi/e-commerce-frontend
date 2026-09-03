const request = async (path, options = {}) => {
  const response = await fetch(path, options)
  if (!response.ok) throw new Error(`Request failed with status ${response.status}`)
  return response.json()
}

export default { request }
