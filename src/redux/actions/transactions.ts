/* eslint-disable @typescript-eslint/ban-types */
/* eslint-disable no-console */
import { utils } from 'ethers';
import { Dispatch } from 'react';
import { AnyAction } from 'redux';
import { ThunkAction, ThunkDispatch } from 'redux-thunk';
import { Contract } from 'web3-eth-contract';
import { PromiEvent } from 'web3-core';
import Web3 from 'web3';
import { REQUIRED_ETH_CONFIRMATIONS, CONTRACT_ADDRESS } from '../../config';
import {
  Asset,
  decimals,
  isDot,
  isNonFungible,
  symbols,
} from '../../types/Asset';
import { Chain, SwapDirection, Channel } from '../../types/types';
import { AssetType } from '../../types/Asset';
import { RootState } from '../store';
import {
  MessageDispatchedEvent,
  Transaction,
  TransactionStatus,
  transactionsSlice,
} from '../reducers/transactions';
import { doEthTransfer } from './EthTransactions';
import { doPolkadotTransfer } from './PolkadotTransactions';
import { notify } from './notifications';
import { setShowConfirmTransactionModal, setShowTransactionListModal } from './bridge';
import { updateSelectedAsset } from '../../redux/actions/bridge';

export const {
  addTransaction,
  ethMessageDispatched,
  parachainMessageDispatched,
  setConfirmations,
  setNonce,
  setError,
  setPendingTransaction,
  setTransactionStatus,
  updateTransaction,
} = transactionsSlice.actions;

export const updateConfirmations = (
  hash: string, confirmations: number,
):
  ThunkAction<Promise<void>, {}, {}, AnyAction> => async (
    dispatch: ThunkDispatch<{}, {}, AnyAction>,
  ): Promise<void> => {
    if (
      confirmations >= REQUIRED_ETH_CONFIRMATIONS
    ) {
      dispatch(setTransactionStatus({ hash, status: TransactionStatus.WAITING_FOR_RELAY }));
    }
    dispatch(setConfirmations({ hash, confirmations }));
  };

export const doTransfer = ():
  ThunkAction<Promise<void>, {}, {}, AnyAction> => async (
    dispatch: ThunkDispatch<{}, {}, AnyAction>,
    getState,
  ): Promise<void> => {
    const state = getState() as RootState;
    const {
      selectedAsset,
      depositAmount,
      swapDirection,
    } = state.bridge;

    const { from } = decimals(selectedAsset!, swapDirection);
    const fromDecimals = utils.parseUnits(depositAmount, from).toString();
    const amount = fromDecimals;

    // transaction direction logic
    if (!isDot(selectedAsset!)) {
      dispatch(doEthTransfer(amount));
    } else {
      dispatch(doPolkadotTransfer(amount));
    }
  };

// Transaction factory function
export function createTransaction(
  sender: string,
  receiver: string,
  amount: string,
  chain: Chain,
  asset: Asset,
  direction: SwapDirection,
  channel: Channel,
): Transaction {
  const pendingTransaction: Transaction = {
    hash: '',
    confirmations: 0,
    sender,
    receiver,
    amount,
    status: TransactionStatus.SUBMITTING_TO_CHAIN,
    isMinted: false,
    isBurned: false,
    chain,
    asset,
    direction,
    dispatchTransactionHash: '',
    error: '',
    nonce: '',
    channel,
  };

  return pendingTransaction;
}

// This will be used in EthTransactions.unlock and PolkadotTransactions.lock
// This is shared logic that will:
//  be used as a callback for polkadot transaction events
//  update the transaction state
//  wait for the transaction to be finalized and then unsubscribe
//
//  This also subscribes to basicChannelContract events to watch
//  the transaction status on the eth side
export function handlePolkadotTransactionEvents(
  result: any, // event data from polkadot transaction subscription
  unsub: () => void, // function to unsubscribe from polkadot transaction events
  transaction: Transaction, // the transaction we are updating for each event
  dispatch: Dispatch<any>,
  incentivizedChannelContract: Contract,
  basicChannelContract: Contract,
): Transaction {
  const pendingTransaction = { ...transaction };

  if (result.status.isReady) {
    // result.status.hash - this is the call hash not the tx hash
    // this is not unique and leads to duplicate keys in our transactions list.
    // rather than waiting for the tx to be included in the block to read the tx hash
    // we just generate a random number and treat that as the tx hash instead
    // so we can track and display the 'submitting to chain' status
    const hash = (Math.random() * 100).toString();
    pendingTransaction.hash = hash;

    dispatch(
      addTransaction(
        { ...pendingTransaction, status: TransactionStatus.WAITING_FOR_CONFIRMATION },
      ),
    );
    dispatch(setShowConfirmTransactionModal(false));
    dispatch(setShowTransactionListModal(true));
    return pendingTransaction;
  }

  if (result.status.isInBlock) {
    let nonce = result.events[0].event.data[0].toString();

    if (isDot(transaction.asset) && !isNonFungible(transaction.asset)) {
      nonce = result.events[1].event.data[0].toString();
    }

    pendingTransaction.nonce = nonce;
    pendingTransaction.status = TransactionStatus.WAITING_FOR_RELAY;

    dispatch(
      updateTransaction(
        {
          hash: pendingTransaction.hash,
          update: pendingTransaction,
        },
      ),
    );

    const handleChannelMessageDispatched = (channel: Channel) => (event: MessageDispatchedEvent) => {
      if (
        event.returnValues.nonce === nonce
      ) {
        dispatch(
          ethMessageDispatched({
            nonce: event.returnValues.nonce,
            dispatchTransactionNonce: pendingTransaction.nonce!,
            channel
          }),
        );
      }
    };

    // subscribe to ETH dispatch event
    // eslint-disable-next-line no-unused-expressions
    incentivizedChannelContract
      .events
      .MessageDispatched({})
      .on('data', handleChannelMessageDispatched(Channel.INCENTIVIZED));

    // TODO: replace with incentivized channel?
    // eslint-disable-next-line no-unused-expressions
    basicChannelContract
      .events
      .MessageDispatched({})
      .on('data', handleChannelMessageDispatched(Channel.BASIC));

    return pendingTransaction;
  }

  if (result.status.isFinalized) {
    console.log({ result })
    console.log(`Transaction finalized at blockHash ${result.status.asFinalized}`);
    dispatch(
      setTransactionStatus({
        hash: pendingTransaction.hash,
        status: TransactionStatus.WAITING_FOR_RELAY,
      }),
    );
    // unsubscribe from transaction events
    if (unsub) {
      unsub();
    }
  }
  if (result.dispatchError) {
    alert("Error with dispatchable - see polkadotjs explorer for more info: " + result.dispatchError)
  }
  return pendingTransaction;
}

// This will be used in EthTransactions.lock and PolkadotTransactions.unlock
// This contains shared logic to update transaction status given a PromiEvent
export function handleEthereumTransactionEvents(
  transactionEvent: PromiEvent<Contract>,
  pendingTransaction: Transaction,
  dispatch: Dispatch<any>,
  web3: Web3,
): void {
  let transactionHash: string;

  transactionEvent
    .once('sending', async (payload: any) => {
      console.log('Sending Transaction', payload);
      // create transaction with default values to display in the modal
      dispatch(setPendingTransaction(pendingTransaction));
    })
    .once('sent', async (payload: any) => {
      console.log('Transaction sent', payload);
    })
    .on('transactionHash', async (hash: string) => {
      console.log('Transaction hash received', hash);
      dispatch(setShowConfirmTransactionModal(false));
      dispatch(setShowTransactionListModal(true));

      if (pendingTransaction.asset.type === AssetType.ERC721) {
        dispatch(updateSelectedAsset(undefined));
      }

      transactionHash = hash;

      dispatch(
        addTransaction({
          ...pendingTransaction,
          hash,
          confirmations: 0,
          status: TransactionStatus.WAITING_FOR_CONFIRMATION,
        }),
      );

      dispatch(
        notify(
          {
            text: `${symbols(pendingTransaction.asset, pendingTransaction.direction).from
              } to ${symbols(pendingTransaction.asset, pendingTransaction.direction).to
              } Transaction created`,
          },
        ),
      );
    })
    .on('receipt', async (receipt: any) => {
      console.log('Transaction receipt received', receipt);
      const basicOutChannelLogFields = [
        {
          type: 'address',
          name: 'source',
        },
        {
          type: 'uint64',
          name: 'nonce',
        },
        {
          type: 'bytes',
          name: 'payload',
        },
      ];
      const incentivizedOutChannelLogFields = [
        {
          type: 'address',
          name: 'source',
        },
        {
          type: 'uint64',
          name: 'nonce',
        },
        {
          type: 'uint256',
          name: 'fee',
        },
        {
          type: 'bytes',
          name: 'payload',
        },
      ];
      let nonce;

      Object.keys(receipt.events).forEach((eventKey: any) => {
        const event = receipt.events[eventKey];
        if (event.address === CONTRACT_ADDRESS.BasicOutboundChannel) {
          const decodedEvent = web3.eth.abi.decodeLog(
            basicOutChannelLogFields,
            event.raw.data,
            event.raw.topics,
          );
          nonce = decodedEvent.nonce;
        }
        if (event.address === CONTRACT_ADDRESS.IncentivizedOutboundChannel) {
          const decodedEvent = web3.eth.abi.decodeLog(
            incentivizedOutChannelLogFields,
            event.raw.data,
            event.raw.topics,
          );
          nonce = decodedEvent.nonce;
        }
      })

      if (!nonce) {
        return
      }

      dispatch(
        setNonce({
          hash: transactionHash,
          nonce,
        }),
      );
    })
    .on(
      'confirmation',
      (
        confirmation: number,
        receipt: any,
      ) => {
        // update transaction confirmations
        dispatch(
          updateConfirmations(receipt.transactionHash, confirmation),
        );

        if (confirmation === REQUIRED_ETH_CONFIRMATIONS) {
          dispatch(notify({
            text: `Transactions confirmed after ${confirmation} confirmations`,
            color: 'success',
          }));
          console.log('call transactionEvent.off()');
          // TODO: call this
          // transactionEvent.off('confirmation');
        }
      },
    )
    .on('error', (error: any) => {
      if (error?.code) {
        dispatch(setPendingTransaction({
          ...pendingTransaction,
          status: TransactionStatus.REJECTED,
          error: error.message,
        }));
      }
      if (error?.receipt) {
        dispatch(
          setError({
            hash: transactionHash,
            error: error.receipt
          }),
        );
      }

      dispatch(notify({
        text: 'Transaction Error',
        color: 'error',
      }));
    });
}

// shared error handling logic for EthTransactions.unlock and PolkadotTransactions.lock
export function handlePolkadotTransactionErrors(
  error: any,
  pendingTransaction: Transaction,
  dispatch: Dispatch<any>,
): void {
  console.log(':( transaction failed', error);
  if (error.toString() === 'Error: Cancelled') {
    dispatch(
      setPendingTransaction({
        ...pendingTransaction,
        status: TransactionStatus.REJECTED,
        error: 'The transaction was cancelled',
      }),
    );
  } else if (error.message.includes('1014: Priority is too low')) {
    dispatch(
      setPendingTransaction({
        ...pendingTransaction,
        status: TransactionStatus.REJECTED,
        error: 'Please wait for the current pending transaction to complete',
      }),
    );
  } else {
    dispatch(
      setPendingTransaction({
        ...pendingTransaction,
        status: TransactionStatus.REJECTED,
        error: error.message,
      })
    );
  }
}
