// utils/aliasMapping.js
import axios from 'axios'

export const fetchAliasMapping = async (
  walletAddresses: string[],
): Promise<Record<string, string>> => {
  try {
    const response = await axios.get(
      'http://localhost:3001/api/users/addresses-to-aliases',
      {
        params: { walletAddresses },
      },
    )
    const aliasMapping = response.data
    const lowerCaseAliasMapping = Object.keys(aliasMapping).reduce(
      (acc: Record<string, string>, key) => {
        acc[key.toLowerCase()] = aliasMapping[key]
        return acc
      },
      {} as Record<string, string>,
    )

    return lowerCaseAliasMapping
  } catch (error) {
    console.error('Error fetching alias mapping:', error)
    return {}
  }
}
