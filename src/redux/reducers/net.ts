/* eslint-disable no-param-reassign */
import { Contract } from 'web3-eth-contract';
import Web3 from 'web3';
import { ApiPromise } from '@polkadot/api';
import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { RootState } from '../store';
import { PERMITTED_ETH_NETWORK } from '../../config';

export interface NetState {
  polkadotJSMissing: boolean,
  metamaskNetwork: string,
  web3?: Web3,
  ethContract?: Contract,
  erc20Contract?: Contract,
  erc721AppContract?: Contract,
  incentivizedInboundChannelContract?: Contract,
  incentivizedOutboundChannelContract?: Contract,
  basicChannelContract?: Contract,
  appDotContract?: Contract,
  polkadotApi?: ApiPromise,
  polkadotAddress?: string,
  polkadotRelayApi?: ApiPromise,
  ethAddress?: string,
  isNetworkConnected: boolean,
}

const initialState: NetState = {
  polkadotJSMissing: false,
  metamaskNetwork: '',
  web3: undefined,
  ethContract: undefined,
  erc20Contract: undefined,
  incentivizedInboundChannelContract: undefined,
  incentivizedOutboundChannelContract: undefined,
  appDotContract: undefined,
  polkadotApi: undefined,
  polkadotAddress: undefined,
  ethAddress: undefined,
  isNetworkConnected: false,
  basicChannelContract: undefined,
  erc721AppContract: undefined,
};

export const netSlice = createSlice({
  name: 'net',
  initialState,
  reducers: {
    setPolkadotjsMissing: (state) => { state.polkadotJSMissing = true; },
    setMetamaskNetwork: (state, action: PayloadAction<string>) => {
      state.metamaskNetwork = action.payload;
    },
    setWeb3: (state, action: PayloadAction<Web3>) => {
      state.web3 = action.payload;
    },
    setEthContract: (state, action: PayloadAction<Contract>) => {
      state.ethContract = action.payload;
    },
    setERC20Contract: (state, action: PayloadAction<Contract>) => {
      state.erc20Contract = action.payload;
    },
    setIncentivizedInboundChannelContract: (state, action: PayloadAction<Contract>) => {
      state.incentivizedInboundChannelContract = action.payload;
    },
    setIncentivizedOutboundChannelContract: (state, action: PayloadAction<Contract>) => {
      state.incentivizedOutboundChannelContract = action.payload;
    },
    setBasicChannelContract: (state, action: PayloadAction<Contract>) => {
      state.basicChannelContract = action.payload;
    },
    setAppDotContract: (state, action: PayloadAction<Contract>) => {
      state.appDotContract = action.payload;
    },
    setErc721AppContract: (state, action: PayloadAction<Contract>) => {
      state.erc721AppContract = action.payload;
    },
    setEthAddress: (state, action: PayloadAction<string | undefined>) => {
      state.ethAddress = action.payload;
    },
    setPolkadotAddress: (state, action: PayloadAction<string>) => {
      state.polkadotAddress = action.payload;
    },
    setPolkadotApi: (state, action: PayloadAction<ApiPromise>) => {
      state.polkadotApi = action.payload;
    },
    setPolkadotRelayApi: (state, action: PayloadAction<ApiPromise>) => {
      state.polkadotRelayApi = action.payload;
    },
    setNetworkConnected: (state, action: PayloadAction<boolean>) => {
      state.isNetworkConnected = action.payload;
    },
  },
});

export default netSlice.reducer;

// selectors
export const isNetworkPermittedSelector = (state: RootState):
  boolean => state.net.metamaskNetwork.toLowerCase() === PERMITTED_ETH_NETWORK;

export const ethereumProviderSelector = (state: RootState):
  any => (state.net.web3?.currentProvider as any);
