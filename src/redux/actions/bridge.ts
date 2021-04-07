/* eslint-disable @typescript-eslint/ban-types */
import { AnyAction } from 'redux';
import { ThunkAction, ThunkDispatch } from 'redux-thunk';
import { Token } from '../../types';
import { RootState } from '../reducers';
import * as ERC20 from '../../contracts/ERC20.json';
import * as ERC20Api from '../../utils/ERC20Api';
import EthApi from '../../net/eth';
import Polkadot from '../../net/polkadot';
import { SET_TOKEN_LIST, SET_SELECTED_ASSET } from '../actionsTypes/bridge';
import { TokenData } from '../reducers/bridge';

export interface SetTokenListPayload { type: string, list: TokenData[] }
export const setTokenList = (list: TokenData[]): SetTokenListPayload => ({
  type: SET_TOKEN_LIST,
  list,
});

export interface SetSelectedAssetPayload {type: string, asset: TokenData}
export const setSelectedAsset = (asset: TokenData)
    : SetSelectedAssetPayload => ({
  type: SET_SELECTED_ASSET,
  asset,
});

// async middleware actions

// use the token list to instantiate contract instances
// and store them in redux. We also query the balance of each token for
// ease of use later
export const initializeTokens = (tokens: Token[]):
  ThunkAction<Promise<void>, {}, {}, AnyAction> => async (
  dispatch: ThunkDispatch<{}, {}, AnyAction>, getState,
): Promise<void> => {
  const state = getState() as RootState;
  const { ethAddress, polkadotApi, polkadotAddress } = state.net;

  if (state.net.web3?.currentProvider) {
    const web3 = state!.net.web3!;
    // only include tokens from  current network
    const tokenList = tokens.filter(
      (token: Token) => token.chainId
              === Number.parseInt((web3.currentProvider as any).chainId, 16),
    );

    // create a web3 contract instance for each ERC20
    const tokenContractList = tokenList.map(
      async (token: Token) => {
        //   create token contract instance
        // All valid contract addresses have 42 characters ('0x' + address)
        // ERC20:
        if (token.address.length === 42) {
          const contractInstance = new web3.eth.Contract(
                ERC20.abi as any,
                token.address,
          );
          const balance = await ERC20Api.fetchERC20Balance(contractInstance, ethAddress!);
          // TODO: fetch polkadot balance
          return {
            token,
            instance: contractInstance,
            balance: {
              eth: balance.toString(),
              polkadot: '0',
            },
          };
        }

        // return ETH data:
        // TODO: fetch polkadot balance
        const ethAssetId = polkadotApi!.createType('AssetId', 'ETH');
        const polkadotBalance = await Polkadot.getEthBalance(
                polkadotApi!,
                polkadotAddress,
                ethAssetId,
        );
        return {
          token,
          instance: null,
          balance: {
            eth: await EthApi.getBalance(web3),
            polkadot: polkadotBalance,
          },
        };
      },
    );
    Promise.all(tokenContractList).then((tokenList) => {
      dispatch(setTokenList(tokenList));
      dispatch(setSelectedAsset(tokenList[0]));
    });
  }
};