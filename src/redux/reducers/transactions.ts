import {
  ADD_TRANSACTION,
  UPDATE_CONFIRMATIONS,
  SET_TRANSACTION_STATUS,
  POLKA_ETH_MINTED,
  POLKA_ETH_BURNED,
  SET_TRANSACTION_HASH
} from '../actionsTypes/transactions';
import {
  AddTransactionPayload,
  SetTransactionStatusPayload,
  UpdateConfirmationsPayload,
  PolkaEthMintedPayload,
  PolkaEthBurnedPayload,
  SetTransactionHashPayload
} from '../actions/transactions'
import { store } from '../../index'
import { REQUIRED_ETH_CONFIRMATIONS } from '../../config';

export enum TransactionStatus {
  SUBMITTING_TO_ETHEREUM = 0,
  WAITING_FOR_CONFIRMATION = 1,
  CONFIRMING = 2,
  CONFIRMED_ON_ETHEREUM = 3,
  WAITING_FOR_RELAY = 4,
  RELAYED = 5,
  FINALIZED = 6
}

export interface Transaction {
  hash: string;
  confirmations: number;
  sender: string;
  receiver: string;
  amount: string;
  chain: 'eth' | 'polkadot';
  status: TransactionStatus
  isMinted: boolean,
  isBurned: boolean,
  nonce: number
}

// Interface for an PolkaEth 'Minted' event, emitted by the parachain
export interface PolkaEthMintedEvent {
  accountId: string;
  amount: string;
}

// Interface for an PolkaEth 'Burned' event, emitted by the parachain
export interface PolkaEthBurnedEvent {
  accountId: string;
  amount: string;
}

export interface TransactionsState {
  transactions: Transaction[]
}

const initialState: TransactionsState = {
  transactions: []
};

function transactionsReducer(state: TransactionsState = initialState, action: any) {
  switch (action.type) {
    case ADD_TRANSACTION: {
      return ((action: AddTransactionPayload) => {
        return Object.assign({}, state, {
          transactions: [...state.transactions, action.transaction],
        });
      })(action)
    }
    case UPDATE_CONFIRMATIONS: {
      return ((action: UpdateConfirmationsPayload) => {
        const getTransactionStatus = (transaction: Transaction): TransactionStatus => {
          // check if the transaction has already been relayed to polkadot
          if (action.confirmations >= REQUIRED_ETH_CONFIRMATIONS) {
            if (transaction.isMinted) {
              return TransactionStatus.RELAYED
            } else {
              return TransactionStatus.CONFIRMED_ON_ETHEREUM
            }
          } else {
            return TransactionStatus.CONFIRMING
          }
        }
        return Object.assign({}, state, {
          transactions: state.transactions.map((t) => t.hash === action.hash
            ? {
              ...t,
              confirmations: action.confirmations,
              status: getTransactionStatus(t)
            }
            : t)
        });
      })(action)
    }
    case SET_TRANSACTION_STATUS: {
      return ((action: SetTransactionStatusPayload) => {
        return Object.assign({}, state, {
          transactions: state.transactions.map((t) => t.hash === action.hash ? { ...t, status: action.status } : t)
        });
      })(action)
    }
    // TODO: Properly map Eth submitted assets to minted assets
    // Called when an PolkaEth asset has been minted by the parachain
    case POLKA_ETH_MINTED: {
      return ((action: PolkaEthMintedPayload) => {
        return Object.assign({}, state, {
          transactions: state.transactions.map((t) =>
            (t.amount === action.event.amount
              && t.receiver === action.event.accountId)
              ? {
                ...t,
                isMinted: true,
                status: t.confirmations > REQUIRED_ETH_CONFIRMATIONS ? TransactionStatus.RELAYED : t.status
              }
              : t
          )
        });
      })(action)
    }
    // TODO: Properly map PolkaEth submitted assets to burned assets
    // Called when an PolkaEth asset has been burned by the parachain
    case POLKA_ETH_BURNED: {
      return ((action: PolkaEthBurnedPayload) => {
        return Object.assign({}, state, {
          transactions: state.transactions.map((t) =>
            (t.amount === action.event.amount
              && t.receiver === action.event.accountId)
              ? { ...t, isBurned: true }
              : t
          )
        });
      })(action)
    }
    case SET_TRANSACTION_HASH: {
      return ((action: SetTransactionHashPayload) => {
        return Object.assign({}, state, {
          transactions: state.transactions.map((t) => t.nonce === action.nonce ?
            { ...t, hash: action.hash, status: TransactionStatus.WAITING_FOR_CONFIRMATION }
            : t
          )
        })
      })(action)
    }
    default:
      return state
  }
}

// selectors
export const getTransaction = (nonce: number): Transaction => {
  const transactions: Transaction[] = store.getState().transactions.transactions;

  return transactions.filter((t) => t.nonce === nonce)[0]
}

export default transactionsReducer;
