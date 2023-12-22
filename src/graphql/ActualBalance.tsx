import React, { useEffect, useState } from 'react'
import { useLazyQuery } from '@apollo/client'
import { GET_USER_BALANCES } from './graphqlQueries'
import { useUserContext } from '../UserContext'
import { fetchAliasMapping } from '../utils/aliasMapping'

interface UserBalance {
  id: string
  user: string
  group: {
    id: string
  }
  balance: number
}

interface ActualBalanceProps {
  triggerRefresh: boolean
}

interface AliasMapping {
  [address: string]: string | null
}

export const ActualBalance: React.FC<ActualBalanceProps> = ({
  triggerRefresh,
}) => {
  const userContext = useUserContext()
  const gnosisSafeAddress = userContext
    ? userContext.gnosisSafeAddress.toLowerCase()
    : ''
  const [aliasMapping, setAliasMapping] = useState<AliasMapping>({})

  const [getUserBalances, { data, loading, error }] = useLazyQuery(
    GET_USER_BALANCES,
    {
      variables: { groupId: gnosisSafeAddress },
      fetchPolicy: 'network-only',
    },
  )
  const formatBalanceText = (balance: number): string => {
    const numericBalance = Number(balance) / 1000000

    // Format balance with 2 decimals
    const formattedBalance = numericBalance.toFixed(2)

    if (numericBalance > 0) {
      return `Recover: $${formattedBalance}`
    } else if (numericBalance < 0) {
      return `Owes: $${Math.abs(numericBalance).toFixed(2)}`
    } else {
      return 'Balance: $0.00'
    }
  }

  useEffect(() => {
    if (gnosisSafeAddress) {
      getUserBalances()
    }
  }, [gnosisSafeAddress, getUserBalances, triggerRefresh])

  useEffect(() => {
    if (data && data.userBalances) {
      const walletAddresses = data.userBalances.map((balance: UserBalance) =>
        balance.user.toLowerCase(),
      )
      fetchAliasMapping(walletAddresses).then((mapping) => {
        setAliasMapping(mapping)
      })
    }
  }, [data, fetchAliasMapping])

  if (loading) return <p>Loading balances...</p>
  if (error) return <p>Error Loading balances: {error.message}</p>
  if (!data || data.userBalances.length === 0) {
    return <p>There are no balances available for this group.</p>
  }

  return (
    <div>
      {data.userBalances.map((balance: UserBalance) => (
        <div key={balance.id}>
          User: {aliasMapping[balance.user] || balance.user},{' '}
          {formatBalanceText(balance.balance)}
        </div>
      ))}
    </div>
  )
}

export default ActualBalance
