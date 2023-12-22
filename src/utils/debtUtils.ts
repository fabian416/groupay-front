import { Debt } from '../GroupDetails'

// Calculates the individual balance of every member
export const calculateIndividualBalances = (
  debts: Debt[],
): Map<string, number> => {
  const balances: Map<string, number> = new Map()

  debts.forEach((debt: Debt) => {
    //  update the balance of the debtor
    const debtorBalance = balances.get(debt.debtor) || 0
    balances.set(debt.debtor, debtorBalance - debt.amount)

    //  update the balance of the acreedor
    const creditorBalance = balances.get(debt.creditor) || 0
    balances.set(debt.creditor, creditorBalance + debt.amount)
  })

  return balances
}

// Siplify the debts between the members of the group
export const simplifyDebts = (debts: Debt[]): Debt[] => {
  const balances = calculateIndividualBalances(debts)
  const simplifiedDebts: Debt[] = []
  const creditors: Array<[string, number]> = []
  const debtors: Array<[string, number]> = []

  balances.forEach((balance, member) => {
    if (balance > 0) {
      creditors.push([member, balance])
    } else if (balance < 0) {
      debtors.push([member, Math.abs(balance)])
    }
  })

  while (creditors.length && debtors.length) {
    const [creditor, creditorBalance] = creditors[0]
    const [debtor, debtorBalance] = debtors[0]

    if (creditorBalance > debtorBalance) {
      simplifiedDebts.push({
        id: Math.random(),
        debtor: debtor,
        creditor: creditor,
        amount: debtorBalance,
        createdAt: new Date().toISOString(), // date of creation
      })

      creditors[0][1] -= debtorBalance
      debtors.shift()
    } else if (creditorBalance < debtorBalance) {
      simplifiedDebts.push({
        id: Math.random(),
        debtor: debtor,
        creditor: creditor,
        amount: creditorBalance,
        createdAt: new Date().toISOString(),
      })

      debtors[0][1] -= creditorBalance
      creditors.shift()
    } else {
      simplifiedDebts.push({
        id: Math.random(),
        debtor: debtor,
        creditor: creditor,
        amount: creditorBalance,
        createdAt: new Date().toISOString(),
      })

      creditors.shift()
      debtors.shift()
    }
  }

  return simplifiedDebts
}
