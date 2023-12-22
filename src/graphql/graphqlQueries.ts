import { gql } from '@apollo/client'

export const GET_USER_BALANCES = gql`
  query UserBalances($groupId: String!) {
    userBalances(where: { group: $groupId }) {
      id
      user
      group {
        id
      }
      balance
    }
  }
`
